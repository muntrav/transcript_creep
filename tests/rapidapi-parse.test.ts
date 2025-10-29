import { describe, it, expect } from 'vitest'
import { parseSRTToSegments } from '@/lib/transcript-rapidapi'

describe('parseSRTToSegments', () => {
  it('parses SRT with CRLF and decodes entities', () => {
    const srt = [
      '1',
      '00:00:01,000 --> 00:00:02,000',
      'we&#39;re testing &quot;quotes&quot; &amp; more',
      '',
      '2',
      '00:00:03,000 --> 00:00:04,000',
      'next\r',
    ].join('\r\n')

    const segs = parseSRTToSegments(srt)
    expect(segs.length).toBe(2)
    expect(segs[0].text).toBe('we\'re testing "quotes" & more')
    expect(segs[1].text).toBe('next')
  })
})
