import { NextResponse } from 'next/server'
import { validateYouTubeUrl } from '@/lib/youtube'
import { getTranscript, TranscriptError } from '@/lib/transcript'

// Force this route to use Node.js runtime instead of Edge
export const runtime = 'nodejs'
// Prefer a US region to avoid EU consent interstitials
export const preferredRegion = ['iad1']

type TranscriptRequest = {
  videoUrl?: string
}

export async function POST(request: Request) {
  try {
    const body: TranscriptRequest = await request.json()
    const url = body.videoUrl ?? ''

    const validation = validateYouTubeUrl(url)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
        },
        { status: 400 }
      )
    }

    console.log('Attempting to fetch transcript for URL:', url)
    const result = await getTranscript(url)
    console.log('Successfully fetched transcript:', {
      segmentsCount: result.segments.length,
      transcriptLength: result.transcript.length,
      language: result.language,
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
          error: error.message,
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
