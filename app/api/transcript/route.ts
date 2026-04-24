import { NextResponse } from 'next/server'
import { validateTranscriptUrl } from '@/lib/urls'
import { getTranscript, TranscriptError } from '@/lib/transcript'
import { getTranscriptViaSupadata } from '@/lib/transcript-supadata'
import { consumeCredits } from '@/lib/billing'
import { requireRequestUser } from '@/lib/request-auth'
import { toFriendlyErrorMessage } from '@/lib/user-facing-errors'

// Force this route to use Node.js runtime instead of Edge
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Prefer a US region to avoid EU consent interstitials
export const preferredRegion = ['iad1']

type TranscriptRequest = {
  videoUrl?: string
}

export async function POST(request: Request) {
  try {
    const authResult = await requireRequestUser()
    if (!authResult.user) return authResult.response

    const body: TranscriptRequest = await request.json()
    const url = body.videoUrl ?? ''

    const validation = validateTranscriptUrl(url)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: toFriendlyErrorMessage(validation.error, 'INVALID_URL'),
          code: 'INVALID_URL',
        },
        { status: 400 }
      )
    }

    const creditResult = await consumeCredits({
      userId: authResult.user.id,
      units: 1,
      kind: 'single',
      metadata: { sourceUrl: url },
    })

    if (!creditResult?.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Monthly transcript limit reached. Visit pricing to request a paid plan.',
          code: 'QUOTA_EXCEEDED',
          data: creditResult,
        },
        { status: 402 }
      )
    }

    console.log('Attempting to fetch transcript for URL:', url)
    const result =
      validation.source === 'youtube'
        ? await getTranscript(url)
        : await getTranscriptViaSupadata(url)
    result.sourceUrl = url
    result.provider = validation.source || result.provider
    console.log('Successfully fetched transcript:', {
      segmentsCount: result.segments.length,
      transcriptLength: result.transcript.length,
      language: result.language,
      provider: result.provider,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: unknown) {
    // Handle known transcript errors
    if (error instanceof TranscriptError) {
      return NextResponse.json(
        {
          success: false,
          error: toFriendlyErrorMessage(error.message, error.code),
          code: error.code,
        },
        {
          status: error.code === 'INVALID_URL' ? 400 : error.code === 'NO_TRANSCRIPT' ? 404 : 500,
        }
      )
    }

    // Log and return generic error for unknown issues
    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      },
      { status: 500 }
    )
  }
}
