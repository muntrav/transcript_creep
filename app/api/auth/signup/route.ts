import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getTurnstileSecretKey } from '@/lib/supabase/env'
import { toFriendlyErrorMessage } from '@/lib/user-facing-errors'

export const dynamic = 'force-dynamic'

const MAX_SIGNUPS_PER_HOUR_PER_IP = 5
const MAX_SIGNUPS_PER_DAY_PER_IP = 15

type SignupRequest = {
  email?: string
  password?: string
  displayName?: string
  turnstileToken?: string
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null
  }

  return request.headers.get('x-real-ip')?.trim() || null
}

async function recordSignupAttempt(params: {
  email: string
  ipAddress: string | null
  userAgent: string | null
  status: 'success' | 'failure' | 'blocked_rate_limit' | 'blocked_captcha'
  failureReason?: string | null
}) {
  const admin = createSupabaseAdminClient()
  await admin.from('signup_attempts').insert({
    email: params.email,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
    status: params.status,
    failure_reason: params.failureReason || null,
  })
}

async function assertSignupRateLimit(ipAddress: string | null) {
  if (!ipAddress) return

  const admin = createSupabaseAdminClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: recentHourlyCount, error: hourlyError },
    { count: recentDailyCount, error: dailyError },
  ] = await Promise.all([
    admin
      .from('signup_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gte('created_at', oneHourAgo),
    admin
      .from('signup_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gte('created_at', oneDayAgo),
  ])

  if (hourlyError) throw hourlyError
  if (dailyError) throw dailyError

  if ((recentHourlyCount || 0) >= MAX_SIGNUPS_PER_HOUR_PER_IP) {
    throw new Error('Too many account creation attempts from this network in the last hour.')
  }

  if ((recentDailyCount || 0) >= MAX_SIGNUPS_PER_DAY_PER_IP) {
    throw new Error('Too many account creation attempts from this network today.')
  }
}

async function verifyTurnstileToken(token: string | null, ipAddress: string | null) {
  const secret = getTurnstileSecretKey()
  if (!secret) return true

  if (!token) return false

  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)
  if (ipAddress) body.set('remoteip', ipAddress)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  })

  if (!response.ok) {
    return false
  }

  const result = await response.json().catch(() => null)
  return Boolean(result?.success)
}

export async function POST(request: Request) {
  const userAgent = request.headers.get('user-agent')
  const ipAddress = getClientIp(request)
  let email = ''

  try {
    const body = (await request.json()) as SignupRequest
    email = normalizeEmail(body.email || '')
    const password = body.password?.trim() || ''
    const displayName = body.displayName?.trim() || ''

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and password are required.',
        },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'Use a password with at least 6 characters.',
        },
        { status: 400 }
      )
    }

    await assertSignupRateLimit(ipAddress)

    const captchaPassed = await verifyTurnstileToken(body.turnstileToken || null, ipAddress)
    if (!captchaPassed) {
      await recordSignupAttempt({
        email,
        ipAddress,
        userAgent,
        status: 'blocked_captcha',
        failureReason: 'CAPTCHA verification failed.',
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Please complete the CAPTCHA challenge and try again.',
        },
        { status: 400 }
      )
    }

    const admin = createSupabaseAdminClient()
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName || email.split('@')[0],
      },
    })

    if (error) {
      await recordSignupAttempt({
        email,
        ipAddress,
        userAgent,
        status: error.status === 429 ? 'blocked_rate_limit' : 'failure',
        failureReason: error.message,
      })

      return NextResponse.json(
        {
          success: false,
          error: toFriendlyErrorMessage(error.message),
        },
        { status: error.status || 400 }
      )
    }

    await recordSignupAttempt({
      email,
      ipAddress,
      userAgent,
      status: 'success',
    })

    return NextResponse.json({
      success: true,
      data: {
        userId: data.user?.id || null,
      },
    })
  } catch (error: any) {
    const message = error?.message || 'Failed to create account.'

    if (message.toLowerCase().includes('too many account creation attempts')) {
      if (email) {
        await recordSignupAttempt({
          email,
          ipAddress,
          userAgent,
          status: 'blocked_rate_limit',
          failureReason: message,
        })
      }

      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status: 429 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: toFriendlyErrorMessage(message),
      },
      { status: 500 }
    )
  }
}
