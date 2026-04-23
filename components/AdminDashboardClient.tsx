'use client'

import React, { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import type { AdminDashboardData } from '@/types/billing'

export default function AdminDashboardClient({ initialData }: { initialData: AdminDashboardData }) {
  const [data, setData] = useState(initialData)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleAction(id: string, action: 'approve' | 'reject') {
    const adminNote = window.prompt(
      action === 'approve' ? 'Optional approval note' : 'Optional rejection reason'
    )

    setBusyId(id)
    setMessage(null)

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
      setMessage({
        type: 'success',
        text:
          action === 'approve'
            ? 'Payment request approved and subscription activated.'
            : 'Payment request rejected.',
      })
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || `Failed to ${action} payment request.`,
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Stack spacing={3}>
      {message ? <Alert severity={message.type}>{message.text}</Alert> : null}

      <Card elevation={3}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              Pending payment requests
            </Typography>
            <Chip label={data.pendingPaymentRequests.length} color="warning" />
          </Stack>

          <Stack spacing={2}>
            {data.pendingPaymentRequests.length ? (
              data.pendingPaymentRequests.map((request) => {
                const profile = data.profilesById[request.user_id]
                const plan = data.plansByCode[request.plan_code]

                return (
                  <Paper key={request.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                    <Stack spacing={1.5}>
                      <Typography fontWeight={700}>
                        {profile?.display_name || profile?.email || request.user_id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {profile?.email || 'Unknown email'}
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
                          onClick={() => handleAction(request.id, 'approve')}
                          disabled={busyId === request.id}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => handleAction(request.id, 'reject')}
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
                    <Stack spacing={0.5}>
                      <Typography fontWeight={700}>
                        {profile?.display_name || profile?.email || subscription.user_id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {profile?.email || 'Unknown email'}
                      </Typography>
                      <Typography variant="body2">
                        {plan?.name || subscription.plan_code} | ends{' '}
                        {subscription.ends_at
                          ? new Date(subscription.ends_at).toLocaleString()
                          : 'n/a'}
                      </Typography>
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
