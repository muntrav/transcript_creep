'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'
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
import { toFriendlyErrorMessage } from '@/lib/user-facing-errors'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        }
      ) => string
      reset: (widgetId?: string) => void
    }
  }
}

type SignupPageClientProps = {
  captchaRequired: boolean
  siteKey: string | null
}

export function SignupPageClient({ captchaRequired, siteKey }: SignupPageClientProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const widgetRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileReady, setTurnstileReady] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (
      !siteKey ||
      !turnstileReady ||
      !widgetRef.current ||
      !window.turnstile ||
      widgetIdRef.current
    ) {
      return
    }

    widgetIdRef.current = window.turnstile.render(widgetRef.current, {
      sitekey: siteKey,
      callback: (token: string) => setTurnstileToken(token),
      'expired-callback': () => setTurnstileToken(null),
      'error-callback': () => setTurnstileToken(null),
    })
  }, [siteKey, turnstileReady])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName,
          turnstileToken,
        }),
      })

      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to create account.')
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      window.location.assign('/auth/post-login')
    } catch (error: any) {
      setErrorMessage(toFriendlyErrorMessage(error?.message || 'Failed to create account.'))
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
      }
      setTurnstileToken(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      {captchaRequired && siteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => setTurnstileReady(true)}
        />
      ) : null}

      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <Box>
              <Typography variant="h4" fontWeight={800} gutterBottom>
                Create account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Accounts are created immediately. No confirmation email is required.
              </Typography>
            </Box>

            {!captchaRequired ? (
              <Alert severity="info">
                CAPTCHA is only enforced on production. This environment is currently protected by
                IP logging and rate limits.
              </Alert>
            ) : null}

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

            {captchaRequired ? (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Complete the CAPTCHA challenge before creating your account.
                </Typography>
                <Box ref={widgetRef} />
              </Box>
            ) : null}

            <Button
              type="submit"
              variant="contained"
              disabled={submitting || (captchaRequired && !turnstileToken)}
            >
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
