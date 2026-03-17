import { NextResponse } from 'next/server'
import { validateTranscriptUrl } from '@/lib/urls'
import { getTranscript, TranscriptError } from '@/lib/transcript'
import { getTranscriptViaSupadata } from '@/lib/transcript-supadata'
import {
  enforceContentLength,
  enforceRateLimit,
  enforceSameOrigin,
  logError,
  logInfo,
} from '@/lib/security'

export const runtime = 'nodejs'
export const preferredRegion = ['iad1']

type TranscriptRequest = {
  videoUrl?: string
}

const MAX_BODY_BYTES = 2048

export async function POST(request: Request) {
  const sameOrigin = enforceSameOrigin(request)
  if (sameOrigin) return sameOrigin

  const rateLimited = enforceRateLimit(request, {
    scope: 'transcript',
    limit: 10,
    windowMs: 60_000,
  })
  if (rateLimited) return rateLimited

  const contentLength = enforceContentLength(request, MAX_BODY_BYTES)
  if (contentLength) return contentLength

  try {
    const body: TranscriptRequest = await request.json()
    const url = body.videoUrl ?? ''

    const validation = validateTranscriptUrl(url)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
        },
        { status: 400 }
      )
    }

    logInfo('[Transcript] Fetch requested', { source: validation.source })
    const result =
      validation.source === 'youtube'
        ? await getTranscript(url)
        : await getTranscriptViaSupadata(url)
    result.sourceUrl = url
    result.provider = validation.source || result.provider

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: unknown) {
    if (error instanceof TranscriptError) {
      const status = error.code === 'INVALID_URL' ? 400 : error.code === 'NO_TRANSCRIPT' ? 404 : 502
      const safeMessage =
        error.code === 'INVALID_URL' || error.code === 'NO_TRANSCRIPT'
          ? error.message
          : 'Transcript provider request failed.'

      logError('[Transcript] Request failed', { code: error.code })
      return NextResponse.json(
        {
          success: false,
          error: safeMessage,
          code: error.code,
        },
        { status }
      )
    }

    logError('[Transcript] Unexpected error')
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred.',
        code: 'UNKNOWN_ERROR',
      },
      { status: 500 }
    )
  }
}
