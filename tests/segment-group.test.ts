import { describe, it, expect } from 'vitest'
import { groupSegmentsByInterval } from '@/lib/segment-group'

describe('groupSegmentsByInterval', () => {
  it('groups segments into 10-second buckets and merges text', () => {
    const segments = [
      { text: 'Hello', duration: 1000, offset: 1200 }, // 0-10s bucket
      { text: 'world', duration: 800, offset: 2500 }, // 0-10s bucket
      { text: 'Next', duration: 1200, offset: 10_200 }, // 10-20s bucket
      { text: 'bucket', duration: 500, offset: 19_999 }, // 10-20s bucket
      { text: 'Third', duration: 500, offset: 20_000 }, // 20-30s bucket
    ]

    const buckets = groupSegmentsByInterval(segments as any, 10_000)
    expect(buckets.map((b) => b.startMs)).toEqual([0, 10_000, 20_000])
    expect(buckets[0].text).toBe('Hello world')
    expect(buckets[1].text).toBe('Next bucket')
    expect(buckets[2].text).toBe('Third')
  })
})
