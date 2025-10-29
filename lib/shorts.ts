export type ShortsInfo = {
  sourceUrl: string
  title?: string
  thumbnail?: string
  videoUrl: string
  durationSeconds?: number
}

const RAPID_HOST = 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com'
// According to provider docs, the universal endpoint is /get-info-rapidapi?url=...
const RAPID_BASE = `https://${RAPID_HOST}/get-info-rapidapi`

function looksLikeUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function isVideoUrl(u: string): boolean {
  return (
    /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(u) ||
    /video/.test(u) ||
    /m3u8/i.test(u) ||
    /googlevideo\./i.test(u)
  )
}

function isImageUrl(u: string): boolean {
  return /\.(jpg|jpeg|png|webp)(\?|#|$)/i.test(u) || /image/.test(u)
}

function findFirstMatchingUrl(obj: any, predicate: (u: string) => boolean): string | undefined {
  if (!obj) return undefined
  if (looksLikeUrl(obj) && predicate(obj)) return obj
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findFirstMatchingUrl(item, predicate)
      if (found) return found
    }
    return undefined
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key]
      // Heuristic: common video/url property names
      if (typeof val === 'string' && looksLikeUrl(val) && predicate(val)) return val
      if (key.toLowerCase().includes('video') || key.toLowerCase().includes('url')) {
        const foundInKey = findFirstMatchingUrl(val, predicate)
        if (foundInKey) return foundInKey
      }
      const found = findFirstMatchingUrl(val, predicate)
      if (found) return found
    }
  }
  return undefined
}

export function sanitizeFilename(input: string, fallback = 'file'): string {
  const name = (input || '').toString().trim() || fallback
  return name
    .replace(/[\\/:*?"<>|\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseDurationToSeconds(val: any): number | undefined {
  if (val == null) return undefined
  if (typeof val === 'number' && isFinite(val)) return val
  if (typeof val === 'string') {
    // Try HH:MM:SS or MM:SS
    const m = val.trim().match(/^(?:([0-9]{1,2}):)?([0-5]?[0-9]):([0-5]?[0-9])$/)
    if (m) {
      const h = parseInt(m[1] || '0', 10)
      const mi = parseInt(m[2] || '0', 10)
      const s = parseInt(m[3] || '0', 10)
      return h * 3600 + mi * 60 + s
    }
    // Try numeric string in seconds or ms
    const n = Number(val)
    if (!Number.isNaN(n)) {
      return n > 10000 ? Math.round(n / 1000) : Math.round(n)
    }
  }
  return undefined
}

// Ensures header-safe ASCII filename and provides RFC 5987 filename* for UTF-8
export function buildContentDisposition(
  baseName: string | undefined,
  extWithDot: string,
  fallback = 'download'
) {
  const base = sanitizeFilename(baseName || fallback, fallback)
  const ext = extWithDot.startsWith('.') ? extWithDot : `.${extWithDot}`

  // ASCII fallback: strip diacritics and non-ASCII
  const ascii =
    base
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '')
      .trim() || fallback

  const filenameAscii = `${ascii}${ext}`
  const filenameUtf8 = encodeURIComponent(`${base}${ext}`)
  return `attachment; filename="${filenameAscii}"; filename*=UTF-8''${filenameUtf8}`
}

async function tryQuery(url: string, _param: string, key: string) {
  // Always use documented endpoint: /get-info-rapidapi?url=...
  const reqUrl = `${RAPID_BASE}?url=${encodeURIComponent(url)}`
  const res = await fetch(reqUrl, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': RAPID_HOST,
      'x-rapidapi-key': key,
    },
    // Avoid caching
    cache: 'no-store',
  })
  const contentType = res.headers.get('content-type') || ''
  const bodyText = await res.text().catch(() => '')
  if (!res.ok) {
    throw new Error(
      `RapidAPI request failed: ${res.status} ${res.statusText}; ct=${contentType}; body=${bodyText.slice(0, 200)}`
    )
  }
  try {
    return JSON.parse(bodyText)
  } catch {
    // Not JSON; try to extract URLs
    const urls = Array.from(bodyText.matchAll(/https?:[^\s"']+/g)).map((m) => m[0])
    return { extracted: urls }
  }
}

export async function fetchShortsInfo(sourceUrl: string): Promise<ShortsInfo> {
  // Special-case YouTube (including Shorts) via YTStream API for reliability
  try {
    const { extractVideoId } = await import('./youtube')
    const vid = extractVideoId(sourceUrl)
    if (vid) {
      const ytKey =
        process.env.RAPIDAPI_KEY ||
        process.env.RAPIDAPI_YTSTREAM_KEY ||
        process.env.RAPIDAPI_SHORTS_KEY
      if (!ytKey) throw new Error('RAPIDAPI_KEY not configured for YouTube')
      const host = 'ytstream-download-youtube-videos.p.rapidapi.com'
      const url = 'https://' + host + '/dl?id=' + encodeURIComponent(vid)
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'x-rapidapi-host': host, 'x-rapidapi-key': ytKey },
        cache: 'no-store',
      })
      const text = await res.text().catch(() => '')
      if (!res.ok) {
        throw new Error(
          'YT RapidAPI failed: ' +
            res.status +
            ' ' +
            res.statusText +
            '; body=' +
            text.slice(0, 200)
        )
      }
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        data = { raw: text }
      }
      let videoUrl = findFirstMatchingUrl(data, isVideoUrl)
      if (!videoUrl && Array.isArray(data?.link)) {
        videoUrl = (data.link as any[])
          .map((f: any) => f?.url || f?.link || f)
          .find((u: string) => typeof u === 'string' && isVideoUrl(u))
      }
      if (!videoUrl && Array.isArray(data?.formats)) {
        videoUrl = (data.formats as any[])
          .map((f: any) => f?.url || f?.link || f)
          .find((u: string) => typeof u === 'string' && isVideoUrl(u))
      }
      if (!videoUrl) throw new Error('No downloadable video URL found for YouTube')
      const title = (data?.title || (data?.result && data.result.title) || '').toString()
      const durationSeconds =
        parseDurationToSeconds(data?.lengthSeconds) ||
        parseDurationToSeconds(data?.result?.lengthSeconds) ||
        parseDurationToSeconds(data?.result?.duration) ||
        parseDurationToSeconds(data?.duration)
      const thumb = findFirstMatchingUrl(data, isImageUrl)
      return { sourceUrl, videoUrl, title: title || undefined, thumbnail: thumb, durationSeconds }
    }
  } catch (e) {
    // If YouTube flow fails, fall through to generic shorts API
    console.error('[Shorts] YouTube flow failed, falling back to generic API', e)
  }

  const key = process.env.RAPIDAPI_SHORTS_KEY || process.env.RAPIDAPI_INSTAGRAM_KEY
  if (!key) {
    throw new Error('RAPIDAPI_SHORTS_KEY not configured')
  }

  // The provider expects only: /get-info-rapidapi?url=...
  const paramsToTry = ['url']
  let data: any | null = null
  let lastError: any = null
  for (const p of paramsToTry) {
    try {
      data = await tryQuery(sourceUrl, p, key)
      if (data) break
    } catch (e) {
      console.error('[Shorts] RapidAPI error for param', p, e)
      lastError = e
    }
  }
  if (!data) {
    throw lastError || new Error('RapidAPI returned no data')
  }

  let videoUrl = findFirstMatchingUrl(data, isVideoUrl)
  if (!videoUrl && Array.isArray(data?.extracted)) {
    videoUrl = (data.extracted as string[]).find((u) => isVideoUrl(u))
  }
  if (!videoUrl) {
    // As a fallback, pick any URL if it exists
    const anyUrl = findFirstMatchingUrl(data, (u) => looksLikeUrl(u))
    if (anyUrl) {
      // hope it's a playable video
      return { sourceUrl, videoUrl: anyUrl }
    }
    throw new Error('No video URL found in RapidAPI response')
  }
  const thumbnail = findFirstMatchingUrl(data, isImageUrl)
  const title = (data.title || data.caption || data.description || data.username || '').toString()
  const durationSeconds =
    parseDurationToSeconds((data as any)?.duration) ||
    parseDurationToSeconds((data as any)?.duration_ms) ||
    parseDurationToSeconds((data as any)?.lengthSeconds)

  return {
    sourceUrl,
    videoUrl,
    thumbnail,
    title: title || undefined,
    durationSeconds,
  }
}
