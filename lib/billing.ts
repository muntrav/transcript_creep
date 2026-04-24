import 'server-only'

import type { User } from '@supabase/supabase-js'
import type {
  AccountSummary,
  AdminDashboardData,
  ManualPaymentConfig,
  PaymentRequestRecord,
  PlanRecord,
  ProfileRecord,
  SubscriptionRecord,
} from '@/types/billing'
import { createSupabaseAdminClient } from './supabase/admin'
import { getAdminEmails, getManualPaymentConfig } from './supabase/env'

export const FREE_MONTHLY_CREDITS = 5

function normalizePlan(plan: any): PlanRecord {
  return {
    code: String(plan.code),
    name: String(plan.name),
    price_usd: Number(plan.price_usd),
    monthly_credit_limit: Number(plan.monthly_credit_limit),
    active: Boolean(plan.active),
  }
}

function buildDisplayName(user: User) {
  const raw = user.user_metadata?.display_name
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return user.email?.split('@')[0] || 'User'
}

function normalizeProfile(profile: any): ProfileRecord {
  return {
    id: String(profile.id),
    email: String(profile.email),
    role: profile.role === 'admin' ? 'admin' : 'user',
    display_name: profile.display_name ? String(profile.display_name) : null,
    created_at: profile.created_at ? String(profile.created_at) : undefined,
    updated_at: profile.updated_at ? String(profile.updated_at) : undefined,
  }
}

export function getPeriodKey(date = new Date()) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export async function ensureUserProfile(user: User) {
  const admin = createSupabaseAdminClient()
  await admin.from('user_profiles').upsert(
    {
      id: user.id,
      email: user.email || '',
      display_name: buildDisplayName(user),
    },
    { onConflict: 'id' }
  )
}

async function syncAdminBootstrap(user: User) {
  const admin = createSupabaseAdminClient()
  const email = user.email?.toLowerCase() || ''
  const adminEmails = getAdminEmails()

  if (adminEmails.includes(email)) {
    await admin.from('user_profiles').update({ role: 'admin' }).eq('id', user.id)
    return
  }

  const { count } = await admin
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')

  if (!count) {
    await admin.from('user_profiles').update({ role: 'admin' }).eq('id', user.id)
  }
}

export async function getActiveSubscription(userId: string) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error

  const now = Date.now()
  const active = ((data || []) as SubscriptionRecord[]).find((subscription) => {
    const startsAt = subscription.starts_at ? new Date(subscription.starts_at).getTime() : null
    const endsAt = subscription.ends_at ? new Date(subscription.ends_at).getTime() : null
    return (startsAt === null || startsAt <= now) && (endsAt === null || endsAt >= now)
  })

  return active || null
}

export async function getPlans() {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('plans')
    .select('*')
    .eq('active', true)
    .order('price_usd', { ascending: true })

  if (error) throw error
  return ((data || []) as any[]).map(normalizePlan)
}

export function getManualPaymentInstructions(): ManualPaymentConfig {
  return getManualPaymentConfig()
}

export async function getAccountSummary(user: User): Promise<AccountSummary> {
  const admin = createSupabaseAdminClient()

  await ensureUserProfile(user)
  await syncAdminBootstrap(user)

  const periodKey = getPeriodKey()
  const plans = await getPlans()

  const [
    { data: profileData, error: profileError },
    activeSubscription,
    { data: counterData, error: counterError },
    { data: paymentRequestsData, error: paymentRequestsError },
  ] = await Promise.all([
    admin.from('user_profiles').select('*').eq('id', user.id).single(),
    getActiveSubscription(user.id),
    admin
      .from('monthly_usage_counters')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_key', periodKey)
      .maybeSingle(),
    admin
      .from('payment_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (profileError) throw profileError
  if (counterError) throw counterError
  if (paymentRequestsError) throw paymentRequestsError

  const profile = normalizeProfile(profileData)
  const paymentRequests = (paymentRequestsData || []) as PaymentRequestRecord[]
  const counter = counterData as { used_credits: number } | null
  const currentPlan = activeSubscription
    ? plans.find((plan) => plan.code === activeSubscription.plan_code) || null
    : null

  const monthlyCreditLimit = currentPlan?.monthly_credit_limit || FREE_MONTHLY_CREDITS
  const usedCredits = counter?.used_credits || 0
  const remainingCredits = Math.max(monthlyCreditLimit - usedCredits, 0)

  return {
    profile,
    plans,
    activeSubscription,
    paymentRequests,
    periodKey,
    monthlyCreditLimit,
    usedCredits,
    remainingCredits,
  }
}

export async function consumeCredits(params: {
  userId: string
  units: number
  kind: 'single' | 'bulk'
  metadata?: Record<string, unknown>
}) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.rpc('consume_credits', {
    p_user_id: params.userId,
    p_units: params.units,
    p_kind: params.kind,
    p_metadata: params.metadata || {},
  })

  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

export async function createPaymentRequest(params: {
  user: User
  planCode: string
  payerName: string
  paymentReference: string
  note?: string
  proofUrl?: string
}) {
  const admin = createSupabaseAdminClient()
  await ensureUserProfile(params.user)
  await syncAdminBootstrap(params.user)

  const { data: existingPending, error: pendingError } = await admin
    .from('payment_requests')
    .select('id')
    .eq('user_id', params.user.id)
    .eq('plan_code', params.planCode)
    .eq('status', 'pending_review')
    .limit(1)
    .maybeSingle()

  if (pendingError) throw pendingError
  if (existingPending) {
    throw new Error('You already have a pending payment request for this plan.')
  }

  const { data, error } = await admin
    .from('payment_requests')
    .insert({
      user_id: params.user.id,
      plan_code: params.planCode,
      payer_name: params.payerName,
      payment_reference: params.paymentReference,
      note: params.note || null,
      proof_url: params.proofUrl || null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as PaymentRequestRecord
}

function addOneMonth(start: Date) {
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + 1)
  return end
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const admin = createSupabaseAdminClient()

  const [
    { data: requestsData, error: requestsError },
    { data: subscriptionsData, error: subscriptionsError },
    { data: profilesData, error: profilesError },
    plans,
  ] = await Promise.all([
    admin.from('payment_requests').select('*').order('created_at', { ascending: false }).limit(50),
    admin
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50),
    admin.from('user_profiles').select('*').limit(500),
    getPlans(),
  ])

  if (requestsError) throw requestsError
  if (subscriptionsError) throw subscriptionsError
  if (profilesError) throw profilesError

  const profiles = ((profilesData || []) as any[]).map(normalizeProfile)
  const profilesById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]))
  const plansByCode = Object.fromEntries(plans.map((plan) => [plan.code, plan]))

  return {
    pendingPaymentRequests: ((requestsData || []) as PaymentRequestRecord[]).filter(
      (request) => request.status === 'pending_review'
    ),
    activeSubscriptions: (subscriptionsData || []) as SubscriptionRecord[],
    profilesById,
    plansByCode,
    profiles,
  }
}

export async function activateSubscriptionForUser(params: {
  userId: string
  planCode: string
  adminUserId: string
  adminNote?: string
}) {
  const admin = createSupabaseAdminClient()
  const startsAt = new Date()
  const endsAt = addOneMonth(startsAt)

  await admin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      ends_at: startsAt.toISOString(),
      notes: 'Superseded by manual admin activation.',
    })
    .eq('user_id', params.userId)
    .eq('status', 'active')

  const { data: subscription, error } = await admin
    .from('subscriptions')
    .insert({
      user_id: params.userId,
      plan_code: params.planCode,
      status: 'active',
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      activated_by: params.adminUserId,
      activated_at: startsAt.toISOString(),
      notes: params.adminNote || 'Activated directly by admin.',
    })
    .select('*')
    .single()

  if (error) throw error
  return subscription as SubscriptionRecord
}

export async function approvePaymentRequest(params: {
  requestId: string
  adminUserId: string
  adminNote?: string
}) {
  const admin = createSupabaseAdminClient()

  const { data: paymentRequest, error: paymentRequestError } = await admin
    .from('payment_requests')
    .select('*')
    .eq('id', params.requestId)
    .single()

  if (paymentRequestError) throw paymentRequestError
  if (!paymentRequest) throw new Error('Payment request not found.')
  if (paymentRequest.status !== 'pending_review') {
    throw new Error('Only pending payment requests can be approved.')
  }

  const startsAt = new Date()
  const subscription = await activateSubscriptionForUser({
    userId: paymentRequest.user_id,
    planCode: paymentRequest.plan_code,
    adminUserId: params.adminUserId,
    adminNote: params.adminNote || 'Approved from payment request.',
  })

  const { error: requestUpdateError } = await admin
    .from('payment_requests')
    .update({
      status: 'approved',
      reviewed_by: params.adminUserId,
      reviewed_at: startsAt.toISOString(),
      admin_note: params.adminNote || null,
    })
    .eq('id', paymentRequest.id)

  if (requestUpdateError) throw requestUpdateError

  return subscription as SubscriptionRecord
}

export async function rejectPaymentRequest(params: {
  requestId: string
  adminUserId: string
  adminNote?: string
}) {
  const admin = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const { error } = await admin
    .from('payment_requests')
    .update({
      status: 'rejected',
      reviewed_by: params.adminUserId,
      reviewed_at: now,
      admin_note: params.adminNote || null,
    })
    .eq('id', params.requestId)
    .eq('status', 'pending_review')

  if (error) throw error
}

export async function cancelSubscription(params: {
  subscriptionId: string
  adminUserId: string
  adminNote?: string
}) {
  const admin = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      ends_at: now,
      notes: params.adminNote || `Cancelled by admin ${params.adminUserId}.`,
    })
    .eq('id', params.subscriptionId)
    .eq('status', 'active')
    .select('*')
    .single()

  if (error) throw error
  return data as SubscriptionRecord
}
