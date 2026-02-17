import { TranscriptError, TranscriptResult, TranscriptSegment } from './transcript'
import { decodeHtmlEntities } from './html'

const SUPADATA_BASE = 'https://api.supadata.ai/v1'

type SupadataChunk = {
  text?: string
  offset?: number
  duration?: number
  lang?: string
}

type SupadataResponse = {
  content?: SupadataChunk[] | string
  lang?: string
  availableLangs?: string[]
}

type SupadataJobResponse = {
  jobId?: string
}

type SupadataJobStatus = {
  status?: 'queued' | 'active' | 'completed' | 'failed'
  content?: SupadataChunk[] | string
  lang?: string
  availableLangs?: string[]
  error?: string
}

function ensureApiKey() {
  const key = process.env.SUPADATA_API_KEY
  if (!key) {
    throw new TranscriptError('SUPADATA_API_KEY not configured', 'CONFIG_ERROR')
  }
  return key
}

async function fetchJson(url: string, key: string) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'x-api-key': key },
    cache: 'no-store',
  })
  const text = await res.text().catch(() => '')
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  return { res, data, text }
}

async function pollJob(jobId: string, key: string, maxAttempts = 15, intervalMs = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
    const { res, data, text } = await fetchJson(`${SUPADATA_BASE}/transcript/${jobId}`, key)
    if (!res.ok) {
      throw new TranscriptError(
        `Supadata job failed: ${res.status} ${res.statusText}; body=${text.slice(0, 200)}`,
        'FETCH_ERROR'
      )
    }
    const status = (data as SupadataJobStatus)?.status
    if (status === 'completed') {
      return data as SupadataJobStatus
    }
    if (status === 'failed') {
      throw new TranscriptError(
        (data as SupadataJobStatus)?.error || 'Supadata transcript job failed',
        'FETCH_ERROR'
      )
    }
  }
  throw new TranscriptError(
    'Transcript is still processing. Please try again in a moment.',
    'FETCH_ERROR'
  )
}

function normalizeSegments(content: SupadataChunk[] | string | undefined): TranscriptSegment[] {
  if (!content) return []
  if (typeof content === 'string') {
    const cleaned = decodeHtmlEntities(content).replace(/\s+/g, ' ').trim()
    return cleaned ? [{ text: cleaned, offset: 0, duration: 0 }] : []
  }
  if (Array.isArray(content)) {
    return content
      .map((chunk) => ({
        text: decodeHtmlEntities(String(chunk.text || '')).trim(),
        offset: Math.max(0, Math.round(chunk.offset || 0)),
        duration: Math.max(0, Math.round(chunk.duration || 0)),
      }))
      .filter((s) => s.text)
  }
  return []
}

export async function getTranscriptViaSupadata(sourceUrl: string): Promise<TranscriptResult> {
  const key = ensureApiKey()
  const params = new URLSearchParams({
    url: sourceUrl,
    text: 'false',
    mode: 'auto',
  })
  const url = `${SUPADATA_BASE}/transcript?${params.toString()}`
  const { res, data, text } = await fetchJson(url, key)

  if (res.status === 202) {
    const jobId = (data as SupadataJobResponse)?.jobId
    if (!jobId) {
      throw new TranscriptError('Supadata returned 202 without jobId', 'FETCH_ERROR')
    }
    const job = await pollJob(jobId, key)
    const segments = normalizeSegments(job.content)
    if (!segments.length) {
      throw new TranscriptError('No transcript available for this video', 'NO_TRANSCRIPT')
    }
    const transcript = segments
      .map((s) => s.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    return {
      transcript,
      segments,
      language: job.lang,
      sourceUrl,
      provider: 'supadata',
    }
  }

  if (!res.ok) {
    if (res.status === 206 || res.status === 404) {
      throw new TranscriptError('No transcript available for this video', 'NO_TRANSCRIPT')
    }
    if (res.status === 401 || res.status === 403) {
      throw new TranscriptError('Supadata authentication failed', 'AUTH_ERROR')
    }
    throw new TranscriptError(
      `Supadata request failed: ${res.status} ${res.statusText}; body=${text.slice(0, 200)}`,
      'FETCH_ERROR'
    )
  }

  const payload = (data || {}) as SupadataResponse
  const segments = normalizeSegments(payload.content)
  if (!segments.length) {
    throw new TranscriptError('No transcript available for this video', 'NO_TRANSCRIPT')
  }
  const transcript = segments
    .map((s) => s.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    transcript,
    segments,
    language: payload.lang,
    sourceUrl,
    provider: 'supadata',
  }
}
