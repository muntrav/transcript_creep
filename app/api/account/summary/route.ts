import { NextResponse } from 'next/server'
import { getAccountSummary } from '@/lib/billing'
import { requireRequestUser } from '@/lib/request-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const authResult = await requireRequestUser()
    if (!authResult.user) return authResult.response

    const summary = await getAccountSummary(authResult.user)
    return NextResponse.json({ success: true, data: summary })
  } catch (error: any) {
    console.error('Account summary error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to load account summary.',
      },
      { status: 500 }
    )
  }
}
