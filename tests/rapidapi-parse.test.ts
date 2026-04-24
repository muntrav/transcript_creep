import { describe, it, expect } from 'vitest'
import { parseRapidApiTranscriptItems, parseSRTToSegments } from '@/lib/transcript-rapidapi'

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

  it('parses RapidAPI transcript items and decodes entities', () => {
    const segs = parseRapidApiTranscriptItems([
      {
        text: 'that&#39;s one',
        duration: '3.24',
        offset: '0.04',
        lang: 'en',
      },
      {
        text: 'and &quot;two&quot;',
        duration: 1.5,
        offset: 3.28,
        lang: 'en',
      },
    ])

    expect(segs).toEqual([
      { text: "that's one", duration: 3240, offset: 40 },
      { text: 'and "two"', duration: 1500, offset: 3280 },
    ])
  })
})
