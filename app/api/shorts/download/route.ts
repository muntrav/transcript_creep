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

async function handleDownload(url: string) {
  logInfo('[Shorts] /download request', { host: new URL(url).hostname })
  const info = await fetchShortsInfo(url)
  const mediaUrl = await assertSafeOutboundMediaUrl(info.videoUrl)

  const upstream = await fetch(mediaUrl, {
    redirect: 'error',
    cache: 'no-store',
  })
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ success: false, error: 'Failed to fetch media.' }, { status: 502 })
  }

  const headers = new Headers()
  headers.set('Content-Type', upstream.headers.get('content-type') || 'video/mp4')
  headers.set('Content-Disposition', buildContentDisposition(info.title || 'shorts', '.mp4'))
  headers.set('Cache-Control', 'no-store')
  return new Response(upstream.body, { headers })
}

export async function POST(request: Request) {
  const sameOrigin = enforceSameOrigin(request)
  if (sameOrigin) return sameOrigin

  const rateLimited = enforceRateLimit(request, {
    scope: 'shorts-download',
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

    return await handleDownload(url)
  } catch (err: any) {
    logError('[Shorts] /download error')
    return NextResponse.json({ success: false, error: 'Download failed.' }, { status: 500 })
  }
}
