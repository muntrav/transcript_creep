import { NextResponse } from 'next/server'
import { activateSubscriptionForUser, getAccountSummary } from '@/lib/billing'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ActivateSubscriptionRequest = {
  userId?: string
  planCode?: string
  adminNote?: string
}

export async function POST(request: Request) {
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

    const body = (await request.json()) as ActivateSubscriptionRequest
    if (!body.userId || !body.planCode) {
      return NextResponse.json({ error: 'userId and planCode are required.' }, { status: 400 })
    }

    const subscription = await activateSubscriptionForUser({
      userId: body.userId,
      planCode: body.planCode,
      adminUserId: user.id,
      adminNote: body.adminNote,
    })

    return NextResponse.json({ success: true, data: subscription })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to activate subscription.' },
      { status: 500 }
    )
  }
}
