import { NextResponse } from 'next/server'

type TranscriptRequest = {
  videoUrl?: string
}

export async function POST(request: Request) {
  try {
    const body: TranscriptRequest = await request.json()
    const url = body.videoUrl
    if (!url) {
      return NextResponse.json({ success: false, error: 'videoUrl is required' }, { status: 400 })
    }

    // Placeholder: extract videoId and call transcript service here.
    // For now, return a mock response.
    const videoId = 'mock-id'
    const transcript = 'Transcript extraction placeholder for: ' + url

    return NextResponse.json({
      success: true,
      data: {
        transcript,
        videoId,
        videoTitle: 'Placeholder Title',
        language: 'en',
        isGenerated: true
      }
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? String(err) }, { status: 500 })
  }
}
