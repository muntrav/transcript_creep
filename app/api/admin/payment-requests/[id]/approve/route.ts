import { NextResponse } from 'next/server'
import { approvePaymentRequest } from '@/lib/billing'
import { requireAdminRequestUser } from '@/lib/request-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ApproveRequestBody = {
  adminNote?: string
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAdminRequestUser()
    if (!authResult.user) return authResult.response

    const body: ApproveRequestBody = await request.json().catch(() => ({}))
    const subscription = await approvePaymentRequest({
      requestId: params.id,
      adminUserId: authResult.user.id,
      adminNote: body.adminNote?.trim(),
    })

    return NextResponse.json({ success: true, data: subscription })
  } catch (error: any) {
    console.error('Approve payment request error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to approve payment request.',
      },
      { status: 500 }
    )
  }
}
