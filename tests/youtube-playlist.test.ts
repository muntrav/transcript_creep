import { describe, expect, it } from 'vitest'
import { extractPlaylistId } from '@/lib/youtube-playlist'

describe('extractPlaylistId', () => {
  it('extracts the playlist id from a YouTube playlist URL', () => {
    expect(
      extractPlaylistId('https://www.youtube.com/playlist?list=PL590L5WQmH8fJ54F4vJm0lqh4o7R_uA61')
    ).toBe('PL590L5WQmH8fJ54F4vJm0lqh4o7R_uA61')
  })

  it('extracts the playlist id from a watch URL containing list', () => {
    expect(
      extractPlaylistId(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL590L5WQmH8fJ54F4vJm0lqh4o7R_uA61'
      )
    ).toBe('PL590L5WQmH8fJ54F4vJm0lqh4o7R_uA61')
  })

  it('accepts a raw playlist id', () => {
    expect(extractPlaylistId('PL590L5WQmH8fJ54F4vJm0lqh4o7R_uA61')).toBe(
      'PL590L5WQmH8fJ54F4vJm0lqh4o7R_uA61'
    )
  })

  it('returns null for invalid values', () => {
    expect(extractPlaylistId('not a playlist url')).toBeNull()
  })
})
