import { NextResponse } from 'next/server'

type RateLimitOptions = {
  scope: string
  limit: number
  windowMs: number
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

const RATE_LIMITS = new Map<string, RateLimitEntry>()

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  return 'unknown'
}

function getRateLimitKey(request: Request, scope: string): string {
  return `${scope}:${getClientIp(request)}`
}

export function enforceRateLimit(request: Request, options: RateLimitOptions): NextResponse | null {
  const now = Date.now()
  const key = getRateLimitKey(request, options.scope)
  const current = RATE_LIMITS.get(key)

  if (!current || current.resetAt <= now) {
    RATE_LIMITS.set(key, { count: 1, resetAt: now + options.windowMs })
    return null
  }

  if (current.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
        },
      }
    )
  }

  current.count += 1
  RATE_LIMITS.set(key, current)
  return null
}

export function enforceContentLength(request: Request, maxBytes: number): NextResponse | null {
  const contentLength = request.headers.get('content-length')
  if (!contentLength) return null

  const parsed = Number(contentLength)
  if (!Number.isFinite(parsed) || parsed <= maxBytes) return null

  return NextResponse.json(
    {
      success: false,
      error: 'Request body too large.',
    },
    { status: 413 }
  )
}

export function enforceSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get('origin')
  if (!origin) return null

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  if (!host) return null

  const expectedOrigin = `${proto}://${host}`.toLowerCase()
  if (origin.toLowerCase() === expectedOrigin) return null

  return NextResponse.json(
    {
      success: false,
      error: 'Cross-site requests are not allowed.',
    },
    { status: 403 }
  )
}

export function logInfo(message: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(message, meta || {})
  }
}

export function logError(message: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') {
    console.error(message, meta || {})
    return
  }

  console.error(message)
}
