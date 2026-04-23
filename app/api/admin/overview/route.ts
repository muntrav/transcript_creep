import { NextResponse } from 'next/server'
import { getAdminDashboardData } from '@/lib/billing'
import { requireAdminRequestUser } from '@/lib/request-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const authResult = await requireAdminRequestUser()
    if (!authResult.user) return authResult.response

    const data = await getAdminDashboardData()
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Admin overview error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to load admin dashboard.',
      },
      { status: 500 }
    )
  }
}
