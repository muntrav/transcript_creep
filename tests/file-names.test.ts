import { describe, expect, it } from 'vitest'
import { makeTranscriptFileName, sanitizeFileName } from '@/lib/file-names'

describe('sanitizeFileName', () => {
  it('removes invalid filename characters and normalizes whitespace', () => {
    expect(sanitizeFileName('  My: Unsafe / Video  Title?  ')).toBe('my-unsafe-video-title')
  })

  it('strips trailing dots and control-adjacent characters', () => {
    expect(sanitizeFileName('Episode 01...')).toBe('episode-01')
  })
})

describe('makeTranscriptFileName', () => {
  it('builds a stable ordered transcript filename', () => {
    expect(makeTranscriptFileName(0, 'My Great Video', 'abc123')).toBe(
      '01-my-great-video-abc123.txt'
    )
  })

  it('falls back to video id when the label sanitizes away', () => {
    expect(makeTranscriptFileName(4, ':::***', 'xyz789')).toBe('05-video-xyz789-xyz789.txt')
  })
})
