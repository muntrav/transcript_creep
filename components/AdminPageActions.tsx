'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Stack } from '@mui/material'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function AdminPageActions() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 2.5 }}>
      <Button component={Link} href="/" variant="outlined">
        Back to tools
      </Button>
      <Button component={Link} href="/account" variant="outlined">
        Account
      </Button>
      <Button onClick={handleLogout} variant="contained">
        Log out
      </Button>
    </Stack>
  )
}
