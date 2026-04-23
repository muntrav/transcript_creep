'use client'

import React, { useMemo, useState } from 'react'
import {
  AppBar,
  Toolbar,
  Container,
  Box,
  Paper,
  Stack,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Alert,
  Snackbar,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Grid,
  LinearProgress,
} from '@mui/material'
import { Download as DownloadIcon, ContentCopy as CopyIcon } from '@mui/icons-material'
import Image from 'next/image'
import ThemeToggle from '@/components/ThemeToggle'
import AuthActions from '@/components/AuthActions'
import PageSwitcher from '@/components/PageSwitcher'
import Link from 'next/link'
import { validateShortsUrl } from '@/lib/urls'

function formatDuration(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

type ToastType = { message: string; type: 'success' | 'error' | 'info' }

type Info = {
  title?: string
  thumbnail?: string
  videoUrl: string
  durationSeconds?: number
}

export default function ShortsPage() {
  const [mode, setMode] = useState<'video' | 'audio'>('video')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<Info | null>(null)
  const [toast, setToast] = useState<ToastType | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const isUrlValid = useMemo(() => (url ? validateShortsUrl(url).valid : false), [url])
  const disableActions = loading || !url || !isUrlValid

  const showToast = (message: string, type: ToastType['type'] = 'success') =>
    setToast({ message, type })
  const closeToast = () => setToast(null)

  // Improved pill styles for visibility in light mode
  const pillSx = {
    borderRadius: 9999,
    background: 'linear-gradient(90deg, rgba(89,185,199,0.18) 0%, rgba(59,143,154,0.18) 100%)',
    border: '1px solid rgba(43,49,63,0.12)',
    '& .MuiToggleButtonGroup-grouped': {
      border: 0,
      px: 2,
      color: '#2B313F',
      fontWeight: 600,
      '&.Mui-selected': {
        color: '#59B9C7',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 4px rgba(43,49,63,0.15)',
      },
      '&:not(:first-of-type)': { borderRadius: '9999px' },
      '&:first-of-type': { borderRadius: '9999px' },
    },
  } as const

  async function fetchInfo(): Promise<Info | null> {
    setError(null)
    setLoading(true)
    try {
      const v = validateShortsUrl(url)
      if (!v.valid) throw new Error(v.error || 'Enter a valid Shorts URL')
      const res = await fetch('/api/shorts/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Failed to get info')
      setInfo(body.data)
      return body.data as Info
    } catch (e: any) {
      setError(e.message || 'Failed to get info')
      return null
    } finally {
      setLoading(false)
    }
  }

  async function download() {
    if (!url) return
    try {
      showToast('Preparing download...', 'info')
      const v = validateShortsUrl(url)
      if (!v.valid) throw new Error(v.error || 'Enter a valid Shorts URL')
      const meta = await fetchInfo()
      if (meta) setInfo(meta)
      setIsDownloading(true)
      const endpoint = mode === 'audio' ? '/api/shorts/audio' : '/api/shorts/download'
      // Use GET with query param to let browser handle streaming download
      const link = document.createElement('a')
      link.href = `${endpoint}?url=${encodeURIComponent(url)}`
      link.target = '_blank'
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast('Download started!')
    } catch (e: any) {
      showToast(e.message || 'Download failed', 'error')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, #2B313F 0%, #232836 50%, #1c2230 100%)'
            : 'linear-gradient(180deg, #D2DEE3 0%, #c9d9df 40%, #b9d3da 100%)',
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        color="inherit"
        sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}
      >
        <Toolbar sx={{ position: 'relative', justifyContent: 'space-between', minHeight: 88 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Link href="/" style={{ display: 'inline-flex' }}>
              <Image src="/logo.png" alt="Transcriptcreep logo" width={72} height={72} priority />
            </Link>
            <Typography variant="h6" sx={{ fontWeight: 700, userSelect: 'none' }}>
              Shorts Downloader
            </Typography>
          </Box>
          {/* Page switcher & theme toggle are on the right; keep center clean */}
          <Box
            sx={{
              position: 'absolute',
              right: 16,
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1.5, md: 2 },
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              ml: { xs: 0, sm: 4 },
              maxWidth: { xs: '72%', md: 'unset' },
            }}
          >
            <PageSwitcher />
            <ThemeToggle />
            <AuthActions />
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography
            variant="h3"
            component="h1"
            fontWeight={800}
            color="secondary.main"
            gutterBottom
          >
            Download Shorts
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 820, mx: 'auto' }}>
            Save short-form videos or extract audio as MP3 — works with YouTube Shorts, Instagram
            Reels, and TikTok.
          </Typography>
        </Box>
        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, md: 4 },
            mb: { xs: 4, md: 6 },
            borderRadius: { xs: 3, md: 5 },
            mx: 'auto',
            maxWidth: 1100,
            overflow: 'hidden',
          }}
        >
          <Stack direction="row" justifyContent="center" sx={{ mb: 2 }}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              size="small"
              onChange={(_e, v) => v && setMode(v)}
              sx={pillSx}
            >
              <ToggleButton value="video">Video</ToggleButton>
              <ToggleButton value="audio">Audio</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 2, md: 2.5 }}
            alignItems={{ xs: 'stretch', md: 'center' }}
          >
            <TextField
              fullWidth
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste Shorts URL (YouTube/Instagram/TikTok)"
              variant="outlined"
              disabled={loading}
              error={Boolean(url) && !isUrlValid}
              helperText={Boolean(url) && !isUrlValid ? validateShortsUrl(url).error : ' '}
              sx={{ flexGrow: 1 }}
            />
            <Button
              variant="contained"
              disabled={disableActions}
              onClick={download}
              endIcon={<DownloadIcon />}
              sx={{
                minWidth: { xs: '100%', md: 220 },
                width: { xs: '100%', md: 'auto' },
                alignSelf: { xs: 'stretch', md: 'center' },
                py: { xs: 1.5, md: 1.2 },
              }}
            >
              Download {mode === 'audio' ? 'Audio' : 'Video'}
            </Button>
          </Stack>
        </Paper>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {(info || isDownloading) && (
          <Paper elevation={2} sx={{ p: 2, maxWidth: 900, mx: 'auto' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              {info?.thumbnail && (
                <Box
                  sx={{
                    width: 140,
                    height: 80,
                    borderRadius: 2,
                    overflow: 'hidden',
                    flex: '0 0 auto',
                  }}
                >
                  <img
                    src={info.thumbnail}
                    alt={info?.title || 'thumbnail'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
              )}
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={700} noWrap title={info?.title}>
                  {info?.title || 'Preparing download...'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {typeof info?.durationSeconds === 'number'
                    ? `Duration: ${formatDuration(info.durationSeconds)}`
                    : isDownloading
                      ? 'Fetching metadata...'
                      : 'Duration: —'}
                </Typography>
              </Box>
            </Stack>
            {isDownloading && <LinearProgress sx={{ mt: 2 }} />}
          </Paper>
        )}

        {/* How it works */}
        <Box sx={{ maxWidth: 1000, mx: 'auto', mt: { xs: 4, md: 6 } }}>
          <Typography
            variant="h5"
            align="center"
            fontWeight={700}
            sx={{ mb: 2 }}
            color="text.primary"
          >
            How it works
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', textAlign: 'center' }}>
                <Typography fontWeight={700}>1. Paste a Shorts URL</Typography>
                <Typography variant="body2" color="text.secondary">
                  We support YouTube, Instagram Reels and TikTok.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', textAlign: 'center' }}>
                <Typography fontWeight={700}>2. Fetch Details</Typography>
                <Typography variant="body2" color="text.secondary">
                  We normalize the link and pick the best media URL.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', textAlign: 'center' }}>
                <Typography fontWeight={700}>3. Download Video or MP3</Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose Video or Audio above and start the download.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Container>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={closeToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={closeToast} severity={toast?.type} variant="filled" sx={{ width: '100%' }}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
