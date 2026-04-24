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

type RapidApiTranscriptItem = {
  text?: string
  duration?: string | number
  offset?: string | number
  lang?: string
}

type RapidApiTranscriptResponse = {
  success?: boolean
  transcript?: RapidApiTranscriptItem[]
}

function parseOptionalInt(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function extractRapidApiQuota(headers: Headers) {
  return {
    provider: 'rapidapi-youtube-transcript3',
    requests_limit: parseOptionalInt(headers.get('X-RateLimit-Requests-Limit')),
    requests_remaining: parseOptionalInt(headers.get('X-RateLimit-Requests-Remaining')),
    requests_reset: headers.get('X-RateLimit-Requests-Reset'),
    hard_limit_limit: parseOptionalInt(
      headers.get('X-RateLimit-rapid-free-plans-hard-limit-Limit')
    ),
    hard_limit_remaining: parseOptionalInt(
      headers.get('X-RateLimit-rapid-free-plans-hard-limit-Remaining')
    ),
    hard_limit_reset: headers.get('X-RateLimit-rapid-free-plans-hard-limit-Reset'),
    rapidapi_region: headers.get('X-RapidAPI-Region'),
    rapidapi_version: headers.get('X-RapidAPI-Version'),
    rapidapi_request_id: headers.get('X-RapidAPI-Request-Id'),
    observed_at: new Date().toISOString(),
  }
}

function toMilliseconds(value: string | number | undefined): number {
  if (typeof value === 'number') return Math.round(value * 1000)
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return Math.round(parsed * 1000)
  }
  return 0
}

export function parseRapidApiTranscriptItems(
  items: RapidApiTranscriptItem[] | undefined
): TranscriptSegment[] {
  if (!Array.isArray(items)) return []

  return items
    .map((item) => ({
      text: decodeHtmlEntities((item.text || '').trim()),
      duration: toMilliseconds(item.duration),
      offset: toMilliseconds(item.offset),
    }))
    .filter((segment) => segment.text)
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

  const url = `https://youtube-transcript3.p.rapidapi.com/api/transcript?videoId=${encodeURIComponent(videoId)}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'youtube-transcript3.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
    })
    const providerQuota = extractRapidApiQuota(response.headers)

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

    const data = (await response.json()) as RapidApiTranscriptResponse
    console.log('[RapidAPI] Response received:', {
      success: data?.success,
      segmentCount: Array.isArray(data?.transcript) ? data.transcript.length : 0,
      languages: Array.isArray(data?.transcript)
        ? Array.from(new Set(data.transcript.map((item) => item.lang).filter(Boolean))).join(', ')
        : 'none',
    })

    if (!data?.success || !Array.isArray(data.transcript) || data.transcript.length === 0) {
      throw new TranscriptError('No transcript available for this video', 'NO_TRANSCRIPT')
    }

    const segments = parseRapidApiTranscriptItems(data.transcript)

    if (segments.length === 0) {
      throw new TranscriptError('Failed to parse transcript data', 'FETCH_ERROR')
    }

    const language =
      data.transcript.find((item) => item.lang?.toLowerCase().startsWith('en'))?.lang ||
      data.transcript.find((item) => item.lang)?.lang ||
      undefined

    const fullTranscript = segments
      .map((s) => s.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    console.log('[RapidAPI] Successfully fetched transcript:', {
      segmentCount: segments.length,
      transcriptLength: fullTranscript.length,
      language,
    })

    return {
      transcript: fullTranscript,
      segments,
      videoId,
      language,
      providerQuota,
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
