'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function SignupPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const emailRedirectTo = `${window.location.origin}/auth/callback`
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            display_name: displayName,
          },
        },
      })

      if (error) throw error

      if (data.session) {
        window.location.assign('/auth/post-login')
        return
      }

      setSuccessMessage(
        'Account created. Check your email to confirm the account, then continue from the link in that email.'
      )
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to create account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <Box>
              <Typography variant="h4" fontWeight={800} gutterBottom>
                Create account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Accounts are required for free monthly credits and paid plan activation.
              </Typography>
            </Box>

            {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

            <TextField
              label="Display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              helperText="Use at least 6 characters."
            />

            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create account'}
            </Button>

            <Typography variant="body2" color="text.secondary">
              Already have an account? <Link href="/login">Log in</Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}
