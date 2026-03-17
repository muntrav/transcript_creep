import { NextRequest, NextResponse } from 'next/server'
import { extractVideoId } from '@/lib/youtube'
import {
  enforceContentLength,
  enforceRateLimit,
  enforceSameOrigin,
  logError,
  logInfo,
} from '@/lib/security'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 2048

export async function POST(request: NextRequest) {
  const sameOrigin = enforceSameOrigin(request)
  if (sameOrigin) return sameOrigin

  const rateLimited = enforceRateLimit(request, {
    scope: 'download-link',
    limit: 8,
    windowMs: 60_000,
  })
  if (rateLimited) return rateLimited

  const contentLength = enforceContentLength(request, MAX_BODY_BYTES)
  if (contentLength) return contentLength

  try {
    const body = await request.json()
    const { videoUrl, quality } = body

    if (!videoUrl) {
      return NextResponse.json({ success: false, error: 'Video URL is required' }, { status: 400 })
    }

    const videoId = extractVideoId(videoUrl)
    if (!videoId) {
      return NextResponse.json({ success: false, error: 'Invalid YouTube URL' }, { status: 400 })
    }

    const rapidApiKey = process.env.RAPIDAPI_KEY
    if (!rapidApiKey) {
      logError('[Download] RAPIDAPI_KEY not configured')
      return NextResponse.json(
        {
          success: false,
          error: 'Download service is unavailable.',
        },
        { status: 503 }
      )
    }

    const apiUrl = 'https://ytstream-download-youtube-videos.p.rapidapi.com/dl'
    const params = new URLSearchParams({ id: videoId, geo: 'US' })
    if (quality) params.append('quality', quality)

    logInfo('[Download] Resolving link', { quality: quality || 'auto' })
    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'ytstream-download-youtube-videos.p.rapidapi.com',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      logError('[Download] Upstream request failed', { status: response.status })
      return NextResponse.json(
        {
          success: false,
          error:
            response.status === 429
              ? 'Download provider is rate limited.'
              : 'Failed to fetch download link.',
        },
        { status: response.status === 429 ? 429 : 502 }
      )
    }

    const data = await response.json()
    let selectedFormat = null

    if (quality) {
      const qualityMap: Record<string, string[]> = {
        '360': ['360p', 'medium'],
        '720': ['720p', 'hd720'],
        '1080': ['1080p', 'hd1080'],
      }

      const qualityLabels = qualityMap[quality] || []
      selectedFormat = data.formats?.find((f: any) =>
        qualityLabels.some((ql) => f.qualityLabel?.toLowerCase().includes(ql.toLowerCase()))
      )
    }

    if (!selectedFormat) {
      selectedFormat = data.formats?.[0]
    }

    if (!selectedFormat || !selectedFormat.url) {
      logError('[Download] No combined format available')
      return NextResponse.json(
        {
          success: false,
          error: 'No download link available for this video.',
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        title: data.title || 'Unknown',
        thumbnail: data.thumbnail?.[0]?.url || '',
        downloadUrl: selectedFormat.url,
        quality: selectedFormat.qualityLabel || quality || 'auto',
        format: selectedFormat.mimeType,
        fileSize: selectedFormat.contentLength,
        availableQualities: data.formats?.map((f: any) => f.qualityLabel) || [],
      },
    })
  } catch (error: any) {
    logError('[Download] Unexpected error')
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process download request.',
      },
      { status: 500 }
    )
  }
}
