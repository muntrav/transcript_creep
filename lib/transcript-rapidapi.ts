import { TranscriptResult, TranscriptSegment, TranscriptError } from './transcript'
import { decodeHtmlEntities } from './html'

/**
 * Parses SRT subtitle format into TranscriptSegment array
 */
export function parseSRTToSegments(srtText: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = []
  // Normalize Windows and old Mac line endings to LF to avoid stray \r
  const normalized = srtText.replace(/\r\n?|\u000d/g, '\n')
  const blocks = normalized.split(/\n{2,}/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    // Skip the index number (line 0)
    const timeLine = lines[1]
    const textLines = lines.slice(2)

    // Parse SRT timestamp: 00:00:21,050 --> 00:00:25,910
    const timeMatch = timeLine.match(
      /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
    )
    if (!timeMatch) continue

    const startMs =
      (parseInt(timeMatch[1], 10) * 3600 +
        parseInt(timeMatch[2], 10) * 60 +
        parseInt(timeMatch[3], 10)) *
        1000 +
      parseInt(timeMatch[4], 10)
    const endMs =
      (parseInt(timeMatch[5], 10) * 3600 +
        parseInt(timeMatch[6], 10) * 60 +
        parseInt(timeMatch[7], 10)) *
        1000 +
      parseInt(timeMatch[8], 10)

    // Join, collapse whitespace, and decode HTML entities (e.g., &#39; → ', &quot; → ")
    const text = decodeHtmlEntities(
      textLines
        .map((l) => l.trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    if (text) {
      segments.push({
        text,
        offset: startMs,
        duration: endMs - startMs,
      })
    }
  }

  return segments
}

/**
 * Fetches YouTube transcript using RapidAPI service
 * This method works reliably on Vercel as it proxies through RapidAPI's infrastructure
 */
export async function getTranscriptViaRapidAPI(videoId: string): Promise<TranscriptResult> {
  const apiKey = process.env.RAPIDAPI_TRANSCRIPT_KEY

  if (!apiKey) {
    throw new TranscriptError(
      'RapidAPI Transcript key not configured. Add RAPIDAPI_TRANSCRIPT_KEY to environment variables.',
      'CONFIG_ERROR'
    )
  }

  console.log('[RapidAPI] Fetching transcript for video:', videoId)

  const url = `https://youtube-captions-transcript-subtitles-video-combiner.p.rapidapi.com/download-all/${videoId}?format_subtitle=srt&format_answer=json`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'youtube-captions-transcript-subtitles-video-combiner.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('[RapidAPI] Request failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })

      if (response.status === 404) {
        throw new TranscriptError('No transcript available for this video', 'NO_TRANSCRIPT')
      }

      if (response.status === 403 || response.status === 401) {
        throw new TranscriptError(
          'RapidAPI authentication failed. Check your API key.',
          'AUTH_ERROR'
        )
      }

      throw new TranscriptError(
        `RapidAPI request failed: ${response.status} ${response.statusText}`,
        'API_ERROR'
      )
    }

    const data = await response.json()
    console.log('[RapidAPI] Response received:', {
      captionCount: Array.isArray(data) ? data.length : 0,
      languages: Array.isArray(data) ? data.map((d: any) => d.languageCode).join(', ') : 'none',
    })

    if (!Array.isArray(data) || data.length === 0) {
      throw new TranscriptError('No transcript available for this video', 'NO_TRANSCRIPT')
    }

    // Try to find English caption first
    const preferredLanguages = ['en', 'en-US', 'en-GB']
    let selectedCaption = data.find((item: any) => preferredLanguages.includes(item.languageCode))

    // If no exact match, try languages starting with 'en'
    if (!selectedCaption) {
      selectedCaption = data.find((item: any) => item.languageCode?.toLowerCase().startsWith('en'))
    }

    // Otherwise, use the first available caption
    if (!selectedCaption) {
      selectedCaption = data[0]
    }

    console.log('[RapidAPI] Using caption language:', selectedCaption.languageCode)

    // Parse SRT subtitle format
    const segments = parseSRTToSegments(selectedCaption.subtitle)

    if (segments.length === 0) {
      throw new TranscriptError('Failed to parse transcript data', 'FETCH_ERROR')
    }

    const fullTranscript = segments
      .map((s) => s.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    console.log('[RapidAPI] Successfully fetched transcript:', {
      segmentCount: segments.length,
      transcriptLength: fullTranscript.length,
      language: selectedCaption.languageCode,
    })

    return {
      transcript: fullTranscript,
      segments,
      videoId,
      language: selectedCaption.languageCode,
    }
  } catch (error: any) {
    // If it's already a TranscriptError, rethrow it
    if (error instanceof TranscriptError) {
      throw error
    }

    // Network or parsing errors
    console.error('[RapidAPI] Unexpected error:', {
      message: error.message,
      name: error.name,
    })

    throw new TranscriptError(
      `Failed to fetch transcript via RapidAPI: ${error.message}`,
      'FETCH_ERROR'
    )
  }
}
