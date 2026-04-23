import { NextResponse } from 'next/server'
import { rejectPaymentRequest } from '@/lib/billing'
import { requireAdminRequestUser } from '@/lib/request-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RejectRequestBody = {
  adminNote?: string
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAdminRequestUser()
    if (!authResult.user) return authResult.response

    const body: RejectRequestBody = await request.json().catch(() => ({}))
    await rejectPaymentRequest({
      requestId: params.id,
      adminUserId: authResult.user.id,
      adminNote: body.adminNote?.trim(),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Reject payment request error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to reject payment request.',
      },
      { status: 500 }
    )
  }
}
