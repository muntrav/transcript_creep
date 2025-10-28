import { NextResponse } from 'next/server'
import { validateYouTubeUrl } from '@/lib/youtube'
import { getTranscript, TranscriptError } from '@/lib/transcript'

// Force this route to use Node.js runtime instead of Edge
export const runtime = 'nodejs'

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

    const result = await getTranscript(url)
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
