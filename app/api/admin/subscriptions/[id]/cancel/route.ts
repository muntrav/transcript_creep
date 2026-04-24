import { NextResponse } from 'next/server'
import { cancelSubscription, getAccountSummary } from '@/lib/billing'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type CancelSubscriptionRequest = {
  adminNote?: string
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const summary = await getAccountSummary(user)
    if (summary.profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as CancelSubscriptionRequest
    const subscription = await cancelSubscription({
      subscriptionId: params.id,
      adminUserId: user.id,
      adminNote: body.adminNote,
    })

    return NextResponse.json({ success: true, data: subscription })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to cancel subscription.' },
      { status: 500 }
    )
  }
}
