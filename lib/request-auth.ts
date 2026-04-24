import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from './supabase/server'
import { getAccountSummary } from './billing'

function isMissingAuthSessionError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const maybeError = error as { name?: string; message?: string; status?: number; code?: string }
  const message = (maybeError.message || '').toLowerCase()
  const name = (maybeError.name || '').toLowerCase()
  const code = (maybeError.code || '').toLowerCase()

  return (
    message.includes('auth session missing') ||
    name.includes('authsessionmissingerror') ||
    code.includes('auth_session_missing')
  )
}

export async function getRequestUser() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    if (isMissingAuthSessionError(error)) return null
    throw error
  }

  return user
}

export async function requireRequestUser() {
  const user = await getRequestUser()
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          error: 'Sign in to continue.',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      ),
    }
  }

  return { user, response: null }
}

export async function requireAdminRequestUser() {
  const authResult = await requireRequestUser()
  if (!authResult.user) return authResult

  const summary = await getAccountSummary(authResult.user)
  if (summary.profile.role !== 'admin') {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          error: 'Admin access required.',
          code: 'ADMIN_REQUIRED',
        },
        { status: 403 }
      ),
    }
  }

  return {
    user: authResult.user,
    response: null,
    summary,
  }
}
