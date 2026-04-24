import { redirect } from 'next/navigation'
import { Box, Container, Stack, Typography } from '@mui/material'
import AdminDashboardClient from '@/components/AdminDashboardClient'
import { getAccountSummary, getAdminDashboardData } from '@/lib/billing'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/admin')

  const summary = await getAccountSummary(user)
  if (summary.profile.role !== 'admin') redirect('/account')

  const dashboardData = await getAdminDashboardData()

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h3" fontWeight={800} gutterBottom>
            Admin
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review payment requests, activate subscriptions directly, and cancel active access when
            needed.
          </Typography>
        </Box>

        <AdminDashboardClient initialData={dashboardData} />
      </Stack>
    </Container>
  )
}
