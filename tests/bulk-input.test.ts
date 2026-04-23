import { describe, expect, it } from 'vitest'
import { parseBulkUrls } from '@/lib/bulk-input'

describe('parseBulkUrls', () => {
  it('deduplicates valid YouTube URLs while preserving order', () => {
    const result = parseBulkUrls(`
      https://www.youtube.com/watch?v=dQw4w9WgXcQ
      https://youtu.be/aqz-KE-bpKQ
      https://www.youtube.com/watch?v=dQw4w9WgXcQ
    `)

    expect(result.urls).toEqual([
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/aqz-KE-bpKQ',
    ])
    expect(result.errors).toEqual([])
  })

  it('reports non-YouTube and invalid URLs with line numbers after normalization', () => {
    const result = parseBulkUrls(`
      https://www.instagram.com/reel/abc123/
      not-a-url
      https://www.youtube.com/watch?v=dQw4w9WgXcQ
    `)

    expect(result.urls).toEqual(['https://www.youtube.com/watch?v=dQw4w9WgXcQ'])
    expect(result.errors).toEqual([
      'Line 1: Bulk mode currently supports YouTube URLs only',
      'Line 2: Supported: YouTube, Instagram, TikTok',
    ])
  })
})
