import { extractVideoId } from './youtube'
import { YoutubeTranscript } from '@danielxceron/youtube-transcript'
import { getTranscriptViaRapidAPI } from './transcript-rapidapi'
import { decodeHtmlEntities } from './html'

export type TranscriptSegment = {
  text: string
  duration: number
  offset: number
}

export type TranscriptResult = {
  transcript: string
  segments: TranscriptSegment[]
  videoId?: string
  language?: string
  sourceUrl?: string
  provider?: string
  providerQuota?: {
    provider: string
    requests_limit: number | null
    requests_remaining: number | null
    requests_reset: string | null
    hard_limit_limit: number | null
    hard_limit_remaining: number | null
    hard_limit_reset: string | null
    rapidapi_region: string | null
    rapidapi_version: string | null
    rapidapi_request_id: string | null
    observed_at: string
  }
}

export class TranscriptError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'TranscriptError'
  }
}

/**
 * Retry helper function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on these specific errors
      if (error instanceof TranscriptError && error.code === 'INVALID_URL') {
        throw error
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)
      console.log(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`)

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Build robust headers for YouTube requests
function buildYouTubeHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    Origin: 'https://www.youtube.com',
    Referer: 'https://www.youtube.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  }

  const cookies = process.env.YOUTUBE_COOKIES?.trim()
  if (cookies) headers['Cookie'] = cookies
  return headers
}

type TimedTextTrack = {
  langCode: string
  name?: string
  kind?: string
}

async function fetchTimedtextTrackList(videoId: string): Promise<TimedTextTrack[]> {
  const url = `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(videoId)}&hl=en`
  console.log('[Timedtext] Fetching track list for video:', videoId)
  const res = await fetch(url, { headers: buildYouTubeHeaders(), cache: 'no-store' })
  console.log('[Timedtext] Track list response status:', res.status)
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'no response body')
    console.error('[Timedtext] Track list failed:', { status: res.status, body: errorText })
    throw new TranscriptError(`Timedtext list failed: ${res.status}`, 'FETCH_ERROR')
  }
  const xml = await res.text()
  console.log('[Timedtext] Track list XML length:', xml.length)
  // Lightweight XML attribute parsing for <track ... /> elements
  const tracks: TimedTextTrack[] = []
  const trackTagRegex = /<track\b([^>]*?)\/>/g
  let match: RegExpExecArray | null
  while ((match = trackTagRegex.exec(xml))) {
    const attrs = match[1]
    const attributes: Record<string, string> = {}
    const attrRegex = /(\w+)=("([^"]*)"|'([^']*)')/g
    let a: RegExpExecArray | null
    while ((a = attrRegex.exec(attrs))) {
      const key = a[1]
      const value = a[3] ?? a[4] ?? ''
      attributes[key] = value
    }
    const langCode = attributes['lang_code'] || attributes['lang'] || ''
    const name = attributes['name'] || undefined
    const kind = attributes['kind'] || undefined
    tracks.push({ langCode, name, kind })
  }
  return tracks
}

function pickPreferredTrack(tracks: TimedTextTrack[]): TimedTextTrack | null {
  if (!tracks.length) return null
  const preferred = ['en-US', 'en-GB', 'en']
  for (const p of preferred) {
    const exact = tracks.find((t) => t.langCode === p)
    if (exact) return exact
  }
  const en = tracks.find((t) => t.langCode?.toLowerCase().startsWith('en'))
  if (en) return en
  return tracks[0]
}

type Json3Event = {
  tStartMs?: number
  dDurationMs?: number
  segs?: { utf8: string }[]
}

async function fetchTimedtextJson3(videoId: string, track: TimedTextTrack) {
  const params = new URLSearchParams({ v: videoId, lang: track.langCode, fmt: 'json3' })
  if (track.name) params.set('name', track.name)
  if (track.kind) params.set('kind', track.kind)
  const url = `https://www.youtube.com/api/timedtext?${params.toString()}`

  console.log('[Timedtext] Fetching JSON3 for lang:', track.langCode)
  const res = await fetch(url, { headers: buildYouTubeHeaders(), cache: 'no-store' })
  console.log('[Timedtext] JSON3 response status:', res.status)
  if (!res.ok) return null

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    try {
      const text = await res.text()
      return JSON.parse(text)
    } catch {
      return null
    }
  }
  return res.json().catch(() => null)
}

function parseJson3ToSegments(json3: any): TranscriptSegment[] {
  const events: Json3Event[] = Array.isArray(json3?.events) ? json3.events : []
  const segments: TranscriptSegment[] = []
  for (const ev of events) {
    const text = (ev.segs || [])
      .map((s) => (s && typeof s.utf8 === 'string' ? s.utf8 : ''))
      .join('')
      .trim()
    if (!text) continue
    const offset = Math.round(ev.tStartMs || 0)
    const duration = Math.round(ev.dDurationMs || 0)
    segments.push({ text, offset, duration })
  }
  return segments
}

function parseTimestampToMs(ts: string): number {
  const m = ts.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})/)
  if (!m) return 0
  const h = parseInt(m[1], 10)
  const mi = parseInt(m[2], 10)
  const s = parseInt(m[3], 10)
  const ms = parseInt(m[4], 10)
  return ((h * 60 + mi) * 60 + s) * 1000 + ms
}

function parseVttToSegments(vtt: string): TranscriptSegment[] {
  const lines = vtt.split(/\r?\n/)
  const segments: TranscriptSegment[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    i++
    if (!line) continue
    if (/-->/.test(line)) {
      const [start, end] = line.split(/\s+-->\s+/)
      let textLines: string[] = []
      while (i < lines.length && lines[i].trim()) {
        textLines.push(lines[i].trim())
        i++
      }
      const text = textLines.join(' ').trim()
      const offset = parseTimestampToMs(start)
      const duration = Math.max(parseTimestampToMs(end) - offset, 0)
      if (text) segments.push({ text, offset, duration })
    }
  }
  return segments
}

async function fetchTimedtextVtt(videoId: string, track: TimedTextTrack): Promise<string | null> {
  const params = new URLSearchParams({ v: videoId, lang: track.langCode, fmt: 'vtt' })
  if (track.name) params.set('name', track.name)
  if (track.kind) params.set('kind', track.kind)
  const url = `https://www.youtube.com/api/timedtext?${params.toString()}`
  const res = await fetch(url, { headers: buildYouTubeHeaders(), cache: 'no-store' })
  if (!res.ok) return null
  const text = await res.text()
  if (!text || !/^WEBVTT/m.test(text)) return null
  return text
}

async function fallbackTimedtext(
  videoId: string
): Promise<{ segments: TranscriptSegment[]; language?: string } | null> {
  try {
    const tracks = await fetchTimedtextTrackList(videoId)
    if (!tracks.length) return null
    const track = pickPreferredTrack(tracks)
    if (!track) return null

    const json3 = await fetchTimedtextJson3(videoId, track)
    if (json3) {
      const segments = parseJson3ToSegments(json3)
      if (segments.length) return { segments, language: track.langCode }
    }

    const vtt = await fetchTimedtextVtt(videoId, track)
    if (vtt) {
      const segments = parseVttToSegments(vtt)
      if (segments.length) return { segments, language: track.langCode }
    }

    return null
  } catch {
    return null
  }
}

export async function getTranscript(url: string): Promise<TranscriptResult> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw new TranscriptError('Invalid YouTube URL', 'INVALID_URL')
  }

  try {
    console.log('[Transcript] Starting fetch for video ID:', videoId)
    console.log('[Transcript] Environment:', {
      nodeEnv: process.env.NODE_ENV,
      vercel: process.env.VERCEL,
      region: process.env.VERCEL_REGION,
      hasRapidApiTranscriptKey: !!process.env.RAPIDAPI_TRANSCRIPT_KEY,
    })

    // Primary: RapidAPI (works reliably on Vercel, avoids IP blocking)
    if (process.env.RAPIDAPI_TRANSCRIPT_KEY) {
      try {
        console.log('[Transcript] Using RapidAPI as primary method...')
        return await getTranscriptViaRapidAPI(videoId)
      } catch (rapidApiError: any) {
        console.error('[Transcript] RapidAPI failed:', {
          message: rapidApiError?.message,
          code: rapidApiError?.code,
        })
        // If it's a definitive NO_TRANSCRIPT error, don't try fallbacks
        if (rapidApiError instanceof TranscriptError && rapidApiError.code === 'NO_TRANSCRIPT') {
          throw rapidApiError
        }
        console.log('[Transcript] Falling back to direct library method...')
      }
    }

    // Fallback: Direct library fetch (works locally, may fail on Vercel due to IP blocking)
    let libItems: any[] | null = null
    try {
      console.log('[Transcript] Attempting library fetch with retry...')
      libItems = await retryWithBackoff(
        async () => YoutubeTranscript.fetchTranscript(videoId),
        2, // Reduced retries to avoid timeout
        500 // Shorter delays
      )
      console.log('[Transcript] Library fetch successful, items:', libItems?.length || 0)
    } catch (fetchError: any) {
      console.error('[Transcript] Library fetch failed:', {
        message: fetchError?.message,
        name: fetchError?.name,
      })
      console.log('[Transcript] Enabling timedtext fallback...')
    }

    let segments: TranscriptSegment[] | null = null
    let language: string | undefined = undefined

    if (Array.isArray(libItems) && libItems.length) {
      segments = libItems.map((item: any) => ({
        text: decodeHtmlEntities(item.text),
        duration: Math.round((item.duration || 0) * 1000),
        offset: Math.round((item.offset || 0) * 1000),
      }))
      language = (libItems as any)[0]?.lang || 'unknown'
    } else {
      const fb = await fallbackTimedtext(videoId)
      if (fb && fb.segments.length) {
        // Decode any entities that may appear in VTT/JSON3 text
        segments = fb.segments.map((s) => ({
          ...s,
          text: decodeHtmlEntities(s.text),
        }))
        language = fb.language
      }
    }

    if (!segments || !segments.length) {
      console.error('[Transcript] No segments found for video:', videoId)
      throw new TranscriptError('No transcript available for this video', 'NO_TRANSCRIPT')
    }

    console.log('[Transcript] Successfully fetched transcript:', {
      segmentCount: segments.length,
      language,
    })

    const fullTranscript = segments
      .map((s) => s.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    return {
      transcript: fullTranscript,
      segments,
      videoId,
      language,
    }
  } catch (error: any) {
    console.error('Transcript fetch error:', error)

    if (error instanceof TranscriptError) {
      throw error
    }

    throw new TranscriptError(error.message || 'Failed to fetch transcript', 'FETCH_ERROR')
  }
}
