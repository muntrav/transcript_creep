import { NextResponse } from 'next/server'
import { fetchShortsInfo } from '@/lib/shorts'
import { validateShortsUrl } from '@/lib/urls'
import {
  enforceContentLength,
  enforceRateLimit,
  enforceSameOrigin,
  logError,
  logInfo,
} from '@/lib/security'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 2048

export async function POST(request: Request) {
  const sameOrigin = enforceSameOrigin(request)
  if (sameOrigin) return sameOrigin

  const rateLimited = enforceRateLimit(request, {
    scope: 'shorts-info',
    limit: 12,
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

    logInfo('[Shorts] /info request', { host: new URL(url).hostname })
    const info = await fetchShortsInfo(url)
    return NextResponse.json({ success: true, data: info })
  } catch (err: any) {
    logError('[Shorts] /info error')
    return NextResponse.json(
      { success: false, error: 'Failed to get media info.' },
      { status: 500 }
    )
  }
}
