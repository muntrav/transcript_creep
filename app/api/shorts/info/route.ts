import { NextResponse } from 'next/server'
import { fetchShortsInfo } from '@/lib/shorts'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing url' }, { status: 400 })
    }
    console.log('[Shorts] /info request for', url)
    const info = await fetchShortsInfo(url)
    console.log('[Shorts] /info resolved', { hasThumb: !!info.thumbnail, title: info.title })
    return NextResponse.json({ success: true, data: info })
  } catch (err: any) {
    console.error('[Shorts] /info error', err)
    return NextResponse.json(
      { success: false, error: String(err?.message || err) },
      { status: 500 }
    )
  }
}
