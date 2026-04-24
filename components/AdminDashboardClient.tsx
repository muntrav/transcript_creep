'use client'

import React, { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { AdminDashboardData, ProfileRecord, SubscriptionRecord } from '@/types/billing'

type FlashMessage = {
  type: 'success' | 'error'
  text: string
} | null

function formatDate(value: string | null) {
  if (!value) return 'n/a'
  return new Date(value).toLocaleString()
}

function statusTone(status: string): 'default' | 'warning' | 'success' | 'error' {
  if (status === 'pending_review') return 'warning'
  if (status === 'approved' || status === 'active') return 'success'
  if (status === 'rejected' || status === 'cancelled') return 'error'
  return 'default'
}

export default function AdminDashboardClient({ initialData }: { initialData: AdminDashboardData }) {
  const [data, setData] = useState(initialData)
  const [message, setMessage] = useState<FlashMessage>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState(initialData.profiles[0]?.id || '')
  const [selectedPlanCode, setSelectedPlanCode] = useState(
    Object.values(initialData.plansByCode)[0]?.code || ''
  )

  const eligibleProfiles = useMemo(
    () => [...data.profiles].sort((a, b) => a.email.localeCompare(b.email)),
    [data.profiles]
  )

  function setFlash(next: FlashMessage) {
    setMessage(next)
  }

  function upsertActiveSubscription(subscription: SubscriptionRecord) {
    setData((current) => {
      const filtered = current.activeSubscriptions.filter(
        (item) => item.user_id !== subscription.user_id && item.id !== subscription.id
      )

      return {
        ...current,
        activeSubscriptions: [subscription, ...filtered],
      }
    })
  }

  async function handlePaymentRequestAction(id: string, action: 'approve' | 'reject') {
    const adminNote = window.prompt(
      action === 'approve' ? 'Optional approval note' : 'Optional rejection reason'
    )

    setBusyId(id)
    setFlash(null)

    try {
      const res = await fetch(`/api/admin/payment-requests/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: adminNote || undefined }),
      })
      const body = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(body?.error || `Failed to ${action} payment request.`)
      }

      setData((current) => ({
        ...current,
        pendingPaymentRequests: current.pendingPaymentRequests.filter(
          (request) => request.id !== id
        ),
      }))

      if (action === 'approve' && body?.data) {
        upsertActiveSubscription(body.data as SubscriptionRecord)
      }

      setFlash({
        type: 'success',
        text:
          action === 'approve'
            ? 'Payment request approved and subscription activated.'
            : 'Payment request rejected.',
      })
    } catch (error: any) {
      setFlash({
        type: 'error',
        text: error?.message || `Failed to ${action} payment request.`,
      })
    } finally {
      setBusyId(null)
    }
  }

  async function handleDirectActivation() {
    if (!selectedUserId || !selectedPlanCode) {
      setFlash({ type: 'error', text: 'Select both a user and a plan before activating.' })
      return
    }

    const adminNote = window.prompt('Optional note for this direct activation')
    setBusyId('direct-activation')
    setFlash(null)

    try {
      const res = await fetch('/api/admin/subscriptions/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          planCode: selectedPlanCode,
          adminNote: adminNote || undefined,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to activate subscription.')
      }

      if (body?.data) {
        upsertActiveSubscription(body.data as SubscriptionRecord)
      }

      setFlash({
        type: 'success',
        text: 'Subscription activated directly from the admin panel.',
      })
    } catch (error: any) {
      setFlash({
        type: 'error',
        text: error?.message || 'Failed to activate subscription.',
      })
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancelSubscription(subscription: SubscriptionRecord) {
    const adminNote = window.prompt('Optional cancellation note')
    setBusyId(subscription.id)
    setFlash(null)

    try {
      const res = await fetch(`/api/admin/subscriptions/${subscription.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: adminNote || undefined }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to cancel subscription.')
      }

      setData((current) => ({
        ...current,
        activeSubscriptions: current.activeSubscriptions.filter(
          (item) => item.id !== subscription.id
        ),
      }))

      setFlash({
        type: 'success',
        text: 'Active subscription cancelled.',
      })
    } catch (error: any) {
      setFlash({
        type: 'error',
        text: error?.message || 'Failed to cancel subscription.',
      })
    } finally {
      setBusyId(null)
    }
  }

  function renderProfile(profile: ProfileRecord | undefined, fallback: string) {
    if (!profile) return fallback
    return profile.display_name ? `${profile.display_name} (${profile.email})` : profile.email
  }

  return (
    <Stack spacing={3}>
      {message ? <Alert severity={message.type}>{message.text}</Alert> : null}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Pending requests
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  {data.pendingPaymentRequests.length}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Active subscriptions
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  {data.activeSubscriptions.length}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Known users
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  {data.profiles.length}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Card elevation={3}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" fontWeight={700}>
                    Pending payment requests
                  </Typography>
                  <Chip label={data.pendingPaymentRequests.length} color="warning" />
                </Stack>

                {data.pendingPaymentRequests.length ? (
                  data.pendingPaymentRequests.map((request) => {
                    const profile = data.profilesById[request.user_id]
                    const plan = data.plansByCode[request.plan_code]

                    return (
                      <Paper key={request.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                        <Stack spacing={1.5}>
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            spacing={1}
                          >
                            <Typography fontWeight={700}>
                              {renderProfile(profile, request.user_id)}
                            </Typography>
                            <Chip
                              label={request.status.replace('_', ' ')}
                              color={statusTone(request.status)}
                              size="small"
                            />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            Submitted {formatDate(request.created_at)}
                          </Typography>
                          <Typography variant="body2">
                            Plan: {plan?.name || request.plan_code} | $
                            {plan?.price_usd?.toFixed(2) || '0.00'}
                          </Typography>
                          <Typography variant="body2">
                            Payer: {request.payer_name} | Reference: {request.payment_reference}
                          </Typography>
                          {request.note ? (
                            <Typography variant="body2" color="text.secondary">
                              Note: {request.note}
                            </Typography>
                          ) : null}
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="contained"
                              onClick={() => handlePaymentRequestAction(request.id, 'approve')}
                              disabled={busyId === request.id}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={() => handlePaymentRequestAction(request.id, 'reject')}
                              disabled={busyId === request.id}
                            >
                              Reject
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    )
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No pending payment requests.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card elevation={3}>
            <CardContent>
              <Stack spacing={2.5}>
                <Typography variant="h6" fontWeight={700}>
                  Direct activation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use this when you have already confirmed payment outside the app and need to
                  activate an account without waiting for a submitted request.
                </Typography>

                <TextField
                  select
                  label="User"
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                >
                  {eligibleProfiles.map((profile) => (
                    <MenuItem key={profile.id} value={profile.id}>
                      {renderProfile(profile, profile.id)}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Plan"
                  value={selectedPlanCode}
                  onChange={(event) => setSelectedPlanCode(event.target.value)}
                >
                  {Object.values(data.plansByCode).map((plan) => (
                    <MenuItem key={plan.code} value={plan.code}>
                      {plan.name} - ${plan.price_usd.toFixed(2)} / {plan.monthly_credit_limit}{' '}
                      credits
                    </MenuItem>
                  ))}
                </TextField>

                <Button
                  variant="contained"
                  onClick={handleDirectActivation}
                  disabled={busyId === 'direct-activation'}
                >
                  Activate subscription
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={3}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Active subscriptions
          </Typography>
          <Stack spacing={2}>
            {data.activeSubscriptions.length ? (
              data.activeSubscriptions.map((subscription) => {
                const profile = data.profilesById[subscription.user_id]
                const plan = data.plansByCode[subscription.plan_code]

                return (
                  <React.Fragment key={subscription.id}>
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      justifyContent="space-between"
                      spacing={2}
                    >
                      <Stack spacing={0.5}>
                        <Typography fontWeight={700}>
                          {renderProfile(profile, subscription.user_id)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {plan?.name || subscription.plan_code} | active from{' '}
                          {formatDate(subscription.activated_at)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Ends {formatDate(subscription.ends_at)}
                        </Typography>
                      </Stack>

                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                        spacing={1}
                      >
                        <Chip label="active" color="success" size="small" />
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => handleCancelSubscription(subscription)}
                          disabled={busyId === subscription.id}
                        >
                          Cancel
                        </Button>
                      </Stack>
                    </Stack>
                    <Divider />
                  </React.Fragment>
                )
              })
            ) : (
              <Typography variant="body2" color="text.secondary">
                No active subscriptions yet.
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
