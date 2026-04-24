export type PlanRecord = {
  code: string
  name: string
  price_usd: number
  monthly_credit_limit: number
  active: boolean
}

export type ProfileRecord = {
  id: string
  email: string
  role: 'user' | 'admin'
  display_name: string | null
  created_at?: string
  updated_at?: string
}

export type SubscriptionRecord = {
  id: string
  user_id: string
  plan_code: string
  status: 'pending_payment' | 'active' | 'expired' | 'cancelled' | 'rejected'
  starts_at: string | null
  ends_at: string | null
  activated_by: string | null
  activated_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type PaymentRequestRecord = {
  id: string
  user_id: string
  plan_code: string
  status: 'pending_review' | 'approved' | 'rejected'
  payer_name: string
  payment_reference: string
  proof_url: string | null
  note: string | null
  admin_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export type MonthlyUsageCounterRecord = {
  user_id: string
  period_key: string
  used_credits: number
  created_at: string
  updated_at: string
}

export type AccountSummary = {
  profile: ProfileRecord
  plans: PlanRecord[]
  activeSubscription: SubscriptionRecord | null
  paymentRequests: PaymentRequestRecord[]
  periodKey: string
  monthlyCreditLimit: number
  usedCredits: number
  remainingCredits: number
}

export type AdminDashboardData = {
  pendingPaymentRequests: PaymentRequestRecord[]
  activeSubscriptions: SubscriptionRecord[]
  profilesById: Record<string, ProfileRecord>
  plansByCode: Record<string, PlanRecord>
  profiles: ProfileRecord[]
}

export type ManualPaymentConfig = {
  destinationLabel: string
  destinationValue: string
  contactChannel: string | null
  contactValue: string | null
  notes: string[]
}
