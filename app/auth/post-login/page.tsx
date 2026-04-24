import { redirect } from 'next/navigation'
import { getAccountSummary } from '@/lib/billing'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function sanitizeNextPath(value: string | null) {
  if (!value || !value.startsWith('/')) return '/account'
  if (value.startsWith('//')) return '/account'
  if (value.startsWith('/auth/')) return '/account'
  return value
}

export default async function PostLoginPage({
  searchParams,
}: {
  searchParams?: { next?: string }
}) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const summary = await getAccountSummary(user)
  if (summary.profile.role === 'admin') {
    redirect('/admin')
  }

  redirect(sanitizeNextPath(searchParams?.next || '/account'))
}
