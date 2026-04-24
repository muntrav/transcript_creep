import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material'
import ManualPaymentGuide from '@/components/ManualPaymentGuide'
import PaymentRequestForm from '@/components/PaymentRequestForm'
import { getAccountSummary, getManualPaymentInstructions } from '@/lib/billing'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/account')

  const summary = await getAccountSummary(user)
  const paymentConfig = getManualPaymentInstructions()
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
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <Button component={Link} href="/" variant="contained">
              Back to transcript tools
            </Button>
            <Button component={Link} href="/pricing" variant="outlined">
              View pricing
            </Button>
          </Stack>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%' }}>
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
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight={700}>
                      Current plan
                    </Typography>
                    <Chip
                      label={currentPlan ? 'Paid' : 'Free'}
                      color={currentPlan ? 'success' : 'default'}
                      size="small"
                    />
                  </Stack>
                  <Typography variant="body1">{currentPlan ? currentPlan.name : 'Free'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summary.activeSubscription?.ends_at
                      ? `Active until ${new Date(summary.activeSubscription.ends_at).toLocaleString()}`
                      : 'No paid subscription is currently active.'}
                  </Typography>
                  <Button component={Link} href="/" variant="outlined">
                    Open transcript tools
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={7}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                  Payment requests
                </Typography>
                <Stack spacing={2}>
                  {summary.paymentRequests.length ? (
                    summary.paymentRequests.map((request) => {
                      const plan = summary.plans.find((item) => item.code === request.plan_code)
                      const tone =
                        request.status === 'approved'
                          ? 'success'
                          : request.status === 'rejected'
                            ? 'error'
                            : 'warning'

                      return (
                        <Box key={request.id}>
                          <Stack spacing={0.75}>
                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              justifyContent="space-between"
                              alignItems={{ xs: 'flex-start', sm: 'center' }}
                              spacing={1}
                            >
                              <Typography fontWeight={700}>
                                {plan?.name || request.plan_code}
                              </Typography>
                              <Chip
                                label={request.status.replace('_', ' ')}
                                color={tone}
                                size="small"
                              />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              Reference: {request.payment_reference}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Submitted {new Date(request.created_at).toLocaleString()}
                            </Typography>
                            {request.admin_note ? (
                              <Typography variant="body2" color="text.secondary">
                                Admin note: {request.admin_note}
                              </Typography>
                            ) : null}
                          </Stack>
                          <Divider sx={{ mt: 2 }} />
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
          </Grid>

          <Grid item xs={12} lg={5}>
            <ManualPaymentGuide config={paymentConfig} />
          </Grid>
        </Grid>

        <Card elevation={3}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              Submit a new payment request
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Submit one request per transfer. If you already have a pending request for a plan,
              wait for admin review before sending another.
            </Typography>
            <PaymentRequestForm
              plans={summary.plans}
              defaultPlanCode={currentPlan?.code || summary.plans[0]?.code || null}
            />
          </CardContent>
        </Card>
      </Stack>
    </Container>
  )
}
