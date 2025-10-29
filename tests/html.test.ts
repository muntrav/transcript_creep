import { describe, it, expect } from 'vitest'
import { decodeHtmlEntities } from '@/lib/html'

describe('decodeHtmlEntities', () => {
  it('decodes common HTML entities', () => {
    const src = 'we&#39;re "quoted" &amp; less &lt; more &gt; space&nbsp;ok'
    const out = decodeHtmlEntities(src)
    expect(out).toBe('we\'re "quoted" & less < more > space ok')
  })

  it('handles double-encoded entities', () => {
    const src = '&amp;#39; and &amp;quot; and &amp;amp;'
    const out = decodeHtmlEntities(src)
    expect(out).toBe('\' and " and &')
  })

  it('is idempotent for already-decoded text', () => {
    const src = "we're fine"
    const out = decodeHtmlEntities(src)
    expect(out).toBe(src)
  })
})
