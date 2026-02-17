import { NextRequest, NextResponse } from 'next/server'
import { extractVideoId } from '@/lib/youtube'

// Force Node.js runtime
export const runtime = 'nodejs'

/**
 * API endpoint to get YouTube video download links
 * Uses YTStream API from RapidAPI
 */
export async function POST(request: NextRequest) {
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
      console.error('RAPIDAPI_KEY not configured')
      return NextResponse.json(
        {
          success: false,
          error: 'API key not configured. Please add RAPIDAPI_KEY to your .env.local file',
        },
        { status: 500 }
      )
    }

    // Call YTStream API
    const apiUrl = `https://ytstream-download-youtube-videos.p.rapidapi.com/dl`
    const params = new URLSearchParams({
      id: videoId,
      geo: 'US', // Can be adjusted based on user location
    })

    // Add quality parameter if specified
    if (quality) {
      params.append('quality', quality)
    }

    console.log('Fetching download link for video:', videoId, 'quality:', quality || 'auto')

    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'ytstream-download-youtube-videos.p.rapidapi.com',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('YTStream API error:', response.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch download link',
          details: response.status === 429 ? 'Rate limit exceeded' : errorText,
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    console.log('YTStream API response keys:', Object.keys(data))
    console.log('Formats count:', data.formats?.length || 0)
    console.log('Adaptive formats count:', data.adaptiveFormats?.length || 0)

    // The YTStream API returns formats in the "formats" or "adaptiveFormats" array
    // Each format has a "url" field with the direct download link

    // Find the best format based on quality preference
    let selectedFormat = null

    if (quality) {
      // Try to find format matching requested quality
      const qualityMap: Record<string, string[]> = {
        '360': ['360p', 'medium'],
        '720': ['720p', 'hd720'],
        '1080': ['1080p', 'hd1080'],
      }

      const qualityLabels = qualityMap[quality] || []

      // IMPORTANT: Use formats (combined video+audio) instead of adaptiveFormats (video-only)
      // adaptiveFormats contain video-only streams without audio
      selectedFormat = data.formats?.find((f: any) =>
        qualityLabels.some((ql) => f.qualityLabel?.toLowerCase().includes(ql.toLowerCase()))
      )
    }

    // If no quality specified or not found, use the first available combined format
    // Always prefer formats (video+audio) over adaptiveFormats (video-only or audio-only)
    if (!selectedFormat) {
      selectedFormat = data.formats?.[0]
    }

    if (!selectedFormat || !selectedFormat.url) {
      console.error('No download URL found in formats')
      return NextResponse.json(
        {
          success: false,
          error: 'No download link available for this video',
          availableFormats: data.formats?.map((f: any) => f.qualityLabel) || [],
        },
        { status: 500 }
      )
    }

    console.log('Selected format:', selectedFormat.qualityLabel, 'itag:', selectedFormat.itag)

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
    console.error('Download API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process download request',
      },
      { status: 500 }
    )
  }
}
