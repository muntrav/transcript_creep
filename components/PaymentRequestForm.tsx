'use client'

import React, { useState } from 'react'
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import type { PlanRecord } from '@/types/billing'

export default function PaymentRequestForm({
  plans,
  defaultPlanCode,
}: {
  plans: PlanRecord[]
  defaultPlanCode?: string | null
}) {
  const [planCode, setPlanCode] = useState(defaultPlanCode || plans[0]?.code || '')
  const [payerName, setPayerName] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planCode,
          payerName,
          paymentReference,
          note,
        }),
      })

      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to submit payment request.')
      }

      setSuccessMessage(
        'Payment request submitted. An admin can now review and activate your plan.'
      )
      setPaymentReference('')
      setNote('')
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to submit payment request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2.5}>
        <Typography variant="body2" color="text.secondary">
          Make payment through your agreed off-platform method, then submit the reference below for
          manual activation.
        </Typography>

        {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <TextField
          select
          label="Plan"
          value={planCode}
          onChange={(event) => setPlanCode(event.target.value)}
          required
        >
          {plans.map((plan) => (
            <MenuItem key={plan.code} value={plan.code}>
              {plan.name} - ${plan.price_usd.toFixed(2)} / {plan.monthly_credit_limit} credits
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Payer name"
          value={payerName}
          onChange={(event) => setPayerName(event.target.value)}
          required
        />

        <TextField
          label="Payment reference"
          value={paymentReference}
          onChange={(event) => setPaymentReference(event.target.value)}
          required
          helperText="Use the transaction reference, receipt ID, or other proof-friendly identifier."
        />

        <TextField
          label="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          multiline
          minRows={3}
          helperText="Optional context for the admin reviewing your payment."
        />

        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit payment request'}
        </Button>
      </Stack>
    </Box>
  )
}
