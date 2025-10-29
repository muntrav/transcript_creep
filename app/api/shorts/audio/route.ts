import { NextResponse } from 'next/server'
import { fetchShortsInfo, buildContentDisposition } from '@/lib/shorts'

export const runtime = 'nodejs'

async function handleAudio(url: string) {
    console.log('[Shorts] /audio request for', url)
    const info = await fetchShortsInfo(url)
    console.log('[Shorts] /audio resolved videoUrl', info.videoUrl?.slice(0, 80))

    // Lazy-load ffmpeg and set binary path
    const ffmpeg = (await import('fluent-ffmpeg')).default
    const ffmpegPath = (await import('ffmpeg-static')).default as string
    if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)

    // Build ffmpeg pipeline: input remote video URL -> mp3 (node readable)
    const nodeReadable = ffmpeg(info.videoUrl)
      .format('mp3')
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .on('error', (err: any) => {
        console.error('[Shorts] ffmpeg error', err)
      })
      .pipe({ end: true })

    // Convert Node stream -> Web ReadableStream (preferred) or manual bridge
    let webStream: any
    try {
      const streamMod: any = await import('stream')
      if (streamMod.Readable && typeof streamMod.Readable.toWeb === 'function') {
        webStream = streamMod.Readable.toWeb(nodeReadable)
      }
    } catch {}

    if (!webStream) {
      webStream = new ReadableStream({
        start(controller) {
          nodeReadable.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)))
          nodeReadable.on('end', () => controller.close())
          nodeReadable.on('error', (err: any) => controller.error(err))
        },
        type: 'bytes',
      })
    }

    const headers = new Headers()
    headers.set('Content-Type', 'audio/mpeg')
    headers.set('Content-Disposition', buildContentDisposition(info.title || 'shorts', '.mp3'))
    return new Response(webStream as any, { headers })
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing url' }, { status: 400 })
    }
    return await handleAudio(url)
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Audio extraction failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const u = new URL(request.url)
    const url = u.searchParams.get('url') || ''
    if (!url) return NextResponse.json({ success: false, error: 'Missing url' }, { status: 400 })
    return await handleAudio(url)
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Audio extraction failed' }, { status: 500 })
  }
}
