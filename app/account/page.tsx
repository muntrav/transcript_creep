import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Box,
  Card,
  CardContent,
  Container,
  Divider,
  Stack,
  Typography,
  Button,
} from '@mui/material'
import PaymentRequestForm from '@/components/PaymentRequestForm'
import { getAccountSummary } from '@/lib/billing'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/account')

  const summary = await getAccountSummary(user)
  const currentPlan = summary.activeSubscription
    ? summary.plans.find((plan) => plan.code === summary.activeSubscription?.plan_code) || null
    : null

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h3" fontWeight={800} gutterBottom>
            Account
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your credits, review payment request status, and request plan activation.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          <Card elevation={3} sx={{ flex: 1 }}>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="h6" fontWeight={700}>
                  Usage
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Period: {summary.periodKey}
                </Typography>
                <Typography variant="body1">
                  {summary.usedCredits} used / {summary.monthlyCreditLimit} available
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {summary.remainingCredits} credits remaining
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={3} sx={{ flex: 1 }}>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="h6" fontWeight={700}>
                  Current plan
                </Typography>
                <Typography variant="body1">{currentPlan ? currentPlan.name : 'Free'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {summary.activeSubscription?.ends_at
                    ? `Active until ${new Date(summary.activeSubscription.ends_at).toLocaleString()}`
                    : 'No paid subscription is currently active.'}
                </Typography>
                <Button component={Link} href="/pricing" variant="outlined">
                  View pricing
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        <Card elevation={3}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Payment requests
            </Typography>
            <Stack spacing={2}>
              {summary.paymentRequests.length ? (
                summary.paymentRequests.map((request) => {
                  const plan = summary.plans.find((item) => item.code === request.plan_code)
                  return (
                    <Box key={request.id}>
                      <Stack spacing={0.5}>
                        <Typography fontWeight={700}>{plan?.name || request.plan_code}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {request.status} | reference: {request.payment_reference}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Submitted {new Date(request.created_at).toLocaleString()}
                        </Typography>
                      </Stack>
                      <Divider />
                    </Box>
                  )
                })
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No payment requests yet.
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={3}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Submit a new payment request
            </Typography>
            <PaymentRequestForm plans={summary.plans} />
          </CardContent>
        </Card>
      </Stack>
    </Container>
  )
}
