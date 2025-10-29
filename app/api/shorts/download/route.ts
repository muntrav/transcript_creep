import { NextResponse } from 'next/server'
import { fetchShortsInfo, buildContentDisposition } from '@/lib/shorts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function handleDownload(url: string) {
  console.log('[Shorts] /download request for', url)
  const info = await fetchShortsInfo(url)
  console.log('[Shorts] /download resolved videoUrl', info.videoUrl?.slice(0, 80))

  const upstream = await fetch(info.videoUrl)
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { success: false, error: `Failed to fetch media: ${upstream.status}` },
      { status: 502 }
    )
  }
  const headers = new Headers()
  headers.set('Content-Type', upstream.headers.get('content-type') || 'video/mp4')
  headers.set('Content-Disposition', buildContentDisposition(info.title || 'shorts', '.mp4'))
  return new Response(upstream.body, { headers })
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing url' }, { status: 400 })
    }
    return await handleDownload(url)
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Download failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const u = new URL(request.url)
    const url = u.searchParams.get('url') || ''
    if (!url) return NextResponse.json({ success: false, error: 'Missing url' }, { status: 400 })
    return await handleDownload(url)
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Download failed' },
      { status: 500 }
    )
  }
}
