import { describe, it, expect } from 'vitest'
import { getHealth } from '@/lib/health'

describe('health helper', () => {
  it('returns status healthy and timestamp', () => {
    const h = getHealth()
    expect(h.status).toBe('healthy')
    expect(typeof h.timestamp).toBe('string')
  })
})
