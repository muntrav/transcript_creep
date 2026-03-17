import { NextResponse } from 'next/server'
import { fetchShortsInfo, buildContentDisposition } from '@/lib/shorts'
import { validateShortsUrl } from '@/lib/urls'
import { assertSafeOutboundMediaUrl } from '@/lib/outbound'
import {
  enforceContentLength,
  enforceRateLimit,
  enforceSameOrigin,
  logError,
  logInfo,
} from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_BODY_BYTES = 2048

async function handleAudio(url: string) {
  logInfo('[Shorts] /audio request', { host: new URL(url).hostname })
  const info = await fetchShortsInfo(url)
  const mediaUrl = await assertSafeOutboundMediaUrl(info.videoUrl)

  const ffmpeg = (await import('fluent-ffmpeg')).default
  const ffmpegPath = (await import('ffmpeg-static')).default as string
  if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)

  const nodeReadable = ffmpeg(mediaUrl.toString())
    .format('mp3')
    .audioCodec('libmp3lame')
    .audioBitrate('192k')
    .on('error', () => {
      logError('[Shorts] ffmpeg error')
    })
    .pipe({ end: true })

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
  headers.set('Cache-Control', 'no-store')
  return new Response(webStream as any, { headers })
}

export async function POST(request: Request) {
  const sameOrigin = enforceSameOrigin(request)
  if (sameOrigin) return sameOrigin

  const rateLimited = enforceRateLimit(request, {
    scope: 'shorts-audio',
    limit: 4,
    windowMs: 60_000,
  })
  if (rateLimited) return rateLimited

  const contentLength = enforceContentLength(request, MAX_BODY_BYTES)
  if (contentLength) return contentLength

  try {
    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing url' }, { status: 400 })
    }

    const validation = validateShortsUrl(url)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid Shorts URL' },
        { status: 400 }
      )
    }

    return await handleAudio(url)
  } catch (err: any) {
    logError('[Shorts] /audio error')
    return NextResponse.json({ success: false, error: 'Audio extraction failed.' }, { status: 500 })
  }
}
