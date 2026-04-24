import Link from 'next/link'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material'
import ManualPaymentGuide from '@/components/ManualPaymentGuide'
import PaymentRequestForm from '@/components/PaymentRequestForm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAccountSummary, getManualPaymentInstructions, getPlans } from '@/lib/billing'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const plans = await getPlans()
  const summary = user ? await getAccountSummary(user) : null
  const paymentConfig = getManualPaymentInstructions()

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h3" fontWeight={800} gutterBottom>
            Pricing
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Free accounts get 5 transcript credits per month. Paid plans are activated manually
            after you submit your payment reference.
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 2.5 }}>
            <Button component={Link} href="/" variant="outlined">
              Back to tools
            </Button>
            {!user ? (
              <>
                <Button component={Link} href="/login?next=/pricing" variant="contained">
                  Log in
                </Button>
                <Button component={Link} href="/signup?next=/pricing" variant="outlined">
                  Create account
                </Button>
              </>
            ) : (
              <Button component={Link} href="/account" variant="contained">
                Go to account
              </Button>
            )}
          </Stack>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent
                sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}
              >
                <Chip label="Default" size="small" sx={{ mb: 2 }} />
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  Free
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  $0
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  5 credits per month
                </Typography>
                <Box sx={{ mt: 'auto' }}>
                  {!user ? (
                    <Button component={Link} href="/signup?next=/" variant="contained" fullWidth>
                      Start free
                    </Button>
                  ) : (
                    <Button component={Link} href="/" variant="outlined" fullWidth>
                      Use tools
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          {plans.map((plan) => (
            <Grid item xs={12} md={4} key={plan.code}>
              <Card elevation={3} sx={{ height: '100%' }}>
                <CardContent
                  sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}
                >
                  <Chip
                    label={
                      summary?.activeSubscription?.plan_code === plan.code ? 'Current plan' : 'Paid'
                    }
                    size="small"
                    color={
                      summary?.activeSubscription?.plan_code === plan.code ? 'success' : 'primary'
                    }
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="h5" fontWeight={700} gutterBottom>
                    {plan.name}
                  </Typography>
                  <Typography variant="h4" fontWeight={800}>
                    ${plan.price_usd.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {plan.monthly_credit_limit} credits per month
                  </Typography>
                  <Box sx={{ mt: 'auto' }}>
                    {!user ? (
                      <Stack direction="row" spacing={1}>
                        <Button
                          component={Link}
                          href="/login?next=/pricing"
                          variant="outlined"
                          fullWidth
                        >
                          Log in
                        </Button>
                        <Button
                          component={Link}
                          href="/signup?next=/pricing"
                          variant="contained"
                          fullWidth
                        >
                          Choose plan
                        </Button>
                      </Stack>
                    ) : null}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={5}>
            <ManualPaymentGuide config={paymentConfig} />
          </Grid>
          <Grid item xs={12} lg={7}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={2.5}>
                  <Typography variant="h5" fontWeight={700}>
                    Submit payment request
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    1. Pay using the details shown. 2. Submit the exact reference used on the
                    transfer. 3. Wait for manual review and activation.
                  </Typography>
                  {!user ? (
                    <Stack spacing={2}>
                      <Typography variant="body2" color="text.secondary">
                        Sign in first, then submit your payment reference so an admin can activate
                        your plan.
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button component={Link} href="/login" variant="contained">
                          Log in
                        </Button>
                        <Button component={Link} href="/signup" variant="outlined">
                          Create account
                        </Button>
                      </Stack>
                    </Stack>
                  ) : (
                    <PaymentRequestForm
                      plans={plans}
                      defaultPlanCode={summary?.activeSubscription?.plan_code || null}
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  )
}
