'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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

export default function LoginPage() {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/account'
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Sign-in completed but no session was established.')
      }

      window.location.assign(nextPath)
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to sign in.')
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
                Log in
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to use your monthly credits, submit payment requests, and manage your
                account.
              </Typography>
            </Box>

            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

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
            />

            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Log in'}
            </Button>

            <Typography variant="body2" color="text.secondary">
              Need an account? <Link href="/signup">Create one</Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}
