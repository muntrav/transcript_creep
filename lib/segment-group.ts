import type { TranscriptSegment } from '@/lib/transcript'

export type Bucket = {
  startMs: number
  text: string
}

/**
 * Groups transcript segments into fixed-size time buckets.
 * - Buckets are created only if they contain text (no empty buckets).
 * - A segment is assigned to the bucket of its offset (no splitting across buckets).
 */
export function groupSegmentsByInterval(
  segments: TranscriptSegment[],
  intervalMs: number = 10_000
): Bucket[] {
  if (!Array.isArray(segments) || segments.length === 0) return []

  const map = new Map<number, string[]>()

  for (const seg of segments) {
    const start = Math.max(0, Math.floor((seg.offset || 0) / intervalMs) * intervalMs)
    const arr = map.get(start) || []
    // normalize whitespace in each piece before joining
    const cleaned = String(seg.text || '')
      .replace(/\s+/g, ' ')
      .trim()
    if (cleaned) arr.push(cleaned)
    if (arr.length) map.set(start, arr)
  }

  // Sort by start time and build buckets
  const starts = Array.from(map.keys()).sort((a, b) => a - b)
  return starts.map((start) => ({
    startMs: start,
    text: map.get(start)!.join(' ').replace(/\s+/g, ' ').trim(),
  }))
}
