'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Box, Button, Chip, CircularProgress, Stack } from '@mui/material'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import type { AccountSummary } from '@/types/billing'

type SessionState = {
  ready: boolean
  hasUser: boolean
  summary: AccountSummary | null
}

export default function AuthActions() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [state, setState] = useState<SessionState>({
    ready: false,
    hasUser: false,
    summary: null,
  })

  useEffect(() => {
    let active = true

    async function loadSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!active) return

      if (!user) {
        setState({ ready: true, hasUser: false, summary: null })
        return
      }

      const res = await fetch('/api/account/summary', { cache: 'no-store' })
      const body = await res.json().catch(() => null)
      if (!active) return

      setState({
        ready: true,
        hasUser: true,
        summary: res.ok ? body?.data || null : null,
      })
    }

    void loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadSession()
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (!state.ready) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 32, justifyContent: 'center' }}>
        <CircularProgress size={20} sx={{ color: 'white' }} />
      </Box>
    )
  }

  if (!state.hasUser) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button component={Link} href="/pricing" color="inherit" variant="text">
          Pricing
        </Button>
        <Button component={Link} href="/login" color="inherit" variant="outlined">
          Log in
        </Button>
        <Button component={Link} href="/signup" color="inherit" variant="contained">
          Sign up
        </Button>
      </Stack>
    )
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      {state.summary ? (
        <Chip
          label={`${state.summary.remainingCredits}/${state.summary.monthlyCreditLimit} credits`}
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'white' }}
        />
      ) : null}
      <Button component={Link} href="/pricing" color="inherit" variant="text">
        Pricing
      </Button>
      <Button component={Link} href="/account" color="inherit" variant="outlined">
        Account
      </Button>
      {state.summary?.profile.role === 'admin' ? (
        <Button component={Link} href="/admin" color="inherit" variant="outlined">
          Admin
        </Button>
      ) : null}
      <Button color="inherit" variant="contained" onClick={handleLogout}>
        Log out
      </Button>
    </Stack>
  )
}
