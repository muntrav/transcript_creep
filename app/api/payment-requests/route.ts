import { NextResponse } from 'next/server'
import { createPaymentRequest, getAccountSummary } from '@/lib/billing'
import { requireRequestUser } from '@/lib/request-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CreatePaymentRequestBody = {
  planCode?: string
  payerName?: string
  paymentReference?: string
  note?: string
  proofUrl?: string
}

export async function POST(request: Request) {
  try {
    const authResult = await requireRequestUser()
    if (!authResult.user) return authResult.response

    const body: CreatePaymentRequestBody = await request.json()
    const planCode = body.planCode?.trim()
    const payerName = body.payerName?.trim()
    const paymentReference = body.paymentReference?.trim()

    if (!planCode || !payerName || !paymentReference) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plan, payer name, and payment reference are required.',
        },
        { status: 400 }
      )
    }

    const paymentRequest = await createPaymentRequest({
      user: authResult.user,
      planCode,
      payerName,
      paymentReference,
      note: body.note?.trim(),
      proofUrl: body.proofUrl?.trim(),
    })

    return NextResponse.json({ success: true, data: paymentRequest })
  } catch (error: any) {
    console.error('Payment request creation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to create payment request.',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const authResult = await requireRequestUser()
    if (!authResult.user) return authResult.response

    const summary = await getAccountSummary(authResult.user)
    return NextResponse.json({ success: true, data: summary.paymentRequests })
  } catch (error: any) {
    console.error('Payment request list error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to load payment requests.',
      },
      { status: 500 }
    )
  }
}
