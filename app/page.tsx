'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Snackbar,
  Chip,
  Divider,
  Stack,
  AppBar,
  Toolbar,
  Paper,
} from '@mui/material'
import {
  Send as SendIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  PlayArrow as PlayIcon,
  Schedule as ScheduleIcon,
  CloudDownload as CloudDownloadIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import ThemeToggle from '@/components/ThemeToggle'
import PageSwitcher from '@/components/PageSwitcher'
import { groupSegmentsByInterval } from '@/lib/segment-group'
import { validateYouTubeUrl } from '@/lib/youtube'

type TranscriptSegment = {
  text: string
  duration: number
  offset: number
}

type TranscriptData = {
  transcript: string
  segments: TranscriptSegment[]
  videoId: string
  language?: string
}

type ToastType = {
  message: string
  type: 'success' | 'error' | 'info'
}

export default function HomePage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null)
  const [showTimestamps, setShowTimestamps] = useState(false)
  const [qualityMenuAnchor, setQualityMenuAnchor] = useState<null | HTMLElement>(null)
  const [toast, setToast] = useState<ToastType | null>(null)

  const isYouTubeValid = useMemo(() => (url ? validateYouTubeUrl(url).valid : false), [url])

  // Show toast notification
  const showToast = (message: string, type: ToastType['type'] = 'success') => {
    setToast({ message, type })
  }

  const closeToast = () => {
    setToast(null)
  }

  // Helper to format milliseconds to timestamp
  const formatTimestamp = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Generate current transcript format based on showTimestamps state
  const currentTranscriptText = useMemo(() => {
    if (!transcriptData) return ''

    if (showTimestamps) {
      const buckets = groupSegmentsByInterval(transcriptData.segments, 10_000)
      return buckets.map((b) => `${formatTimestamp(b.startMs)} - ${b.text}`).join('\n\n')
    } else {
      return transcriptData.transcript
    }
  }, [transcriptData, showTimestamps])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setTranscriptData(null)
    setShowTimestamps(false)
    setLoading(true)

    try {
      const v = validateYouTubeUrl(url)
      if (!v.valid) {
        throw new Error(v.error || 'Please enter a valid YouTube URL')
      }
      const res = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: url }),
      })
      const body = await res.json()

      if (!res.ok) {
        throw new Error(`${body?.error || 'Unknown error'} ${body?.code ? `(${body.code})` : ''}`)
      }

      if (!body.data) {
        throw new Error('No transcript data received')
      }

      setTranscriptData(body.data)
      showToast('Transcript loaded successfully!')
    } catch (err: any) {
      console.error('Transcript fetch error:', err)
      setError(err.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (!currentTranscriptText) return
    navigator.clipboard.writeText(currentTranscriptText)
    showToast('Copied to clipboard!')
  }

  const downloadTranscript = () => {
    if (!currentTranscriptText) return

    const blob = new Blob([currentTranscriptText], { type: 'text/plain' })
    const downloadUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = showTimestamps ? 'transcript-with-timestamps.txt' : 'transcript.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(downloadUrl)
    showToast('Transcript downloaded!')
  }

  const downloadVideo = async (quality: string) => {
    if (!transcriptData) return

    setQualityMenuAnchor(null)
    setLoading(true)

    try {
      showToast('Fetching download link...', 'info')

      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: `https://www.youtube.com/watch?v=${transcriptData.videoId}`,
          quality: quality,
        }),
      })

      const body = await res.json()

      if (!res.ok) {
        throw new Error(body?.error || 'Failed to fetch download link')
      }

      if (body.data?.downloadUrl) {
        // Open download link in new tab
        const link = document.createElement('a')
        link.href = body.data.downloadUrl
        link.target = '_blank'
        link.download = body.data.title || 'video'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        showToast('Your download has started!')
      } else {
        throw new Error('No download URL received')
      }
    } catch (err: any) {
      console.error('Download error:', err)
      showToast(err.message || 'Failed to download video', 'error')
    } finally {
      setLoading(false)
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
      {/* App Bar */}
      <AppBar
        position="static"
        elevation={0}
        color="inherit"
        sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}
      >
        <Toolbar sx={{ position: 'relative', justifyContent: 'center', minHeight: 88 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton
              aria-label="Home"
              onClick={() => (typeof window !== 'undefined' ? window.location.reload() : null)}
              edge="start"
              sx={{ p: 0 }}
            >
              <Image src="/logo.png" alt="Transcriptcreep logo" width={72} height={72} priority />
            </IconButton>
            <Typography
              variant="h6"
              component="div"
              onClick={() => (typeof window !== 'undefined' ? window.location.reload() : null)}
              sx={{ fontWeight: 700, userSelect: 'none', cursor: 'pointer' }}
            >
              Transcriptcreep
            </Typography>
          </Box>
          <Box
            sx={{
              position: 'absolute',
              right: 16,
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1.5, md: 2 },
              ml: { xs: 0, sm: 4 },
              maxWidth: { xs: '60%', md: 'unset' },
            }}
          >
            <PageSwitcher />
            <ThemeToggle />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
          <Typography
            variant="h3"
            component="h1"
            fontWeight={800}
            color="text.primary"
            gutterBottom
          >
            Lets creep that script
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 820, mx: 'auto' }}>
            Generate clean transcripts from any YouTube video. Copy in one click, download as text,
            or switch to timestamps.
          </Typography>
        </Box>

        {/* URL Input Form */}
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
          <form onSubmit={handleSubmit}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 2, md: 2.5 }}
              alignItems={{ xs: 'stretch', md: 'center' }}
            >
              <TextField
                fullWidth
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter YouTube video URL..."
                variant="outlined"
                disabled={loading}
                error={Boolean(url) && !isYouTubeValid}
                helperText={Boolean(url) && !isYouTubeValid ? 'Please enter a valid URL' : ' '}
                sx={{ flexGrow: 1 }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || (url.length > 0 && !isYouTubeValid)}
                endIcon={<SendIcon />}
                sx={{
                  minWidth: { xs: '100%', md: 200 },
                  width: { xs: '100%', md: 'auto' },
                  alignSelf: { xs: 'stretch', md: 'center' },
                  py: { xs: 1.5, md: 1.2 },
                }}
              >
                {loading ? 'Loading...' : 'Get Transcript'}
              </Button>
            </Stack>
          </form>
        </Paper>

        {/* Feature Badges */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
          sx={{ mb: { xs: 4, md: 6 } }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <CopyIcon color="primary" />
            <Typography variant="body2" fontWeight={700}>
              One-click Copy
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <ScheduleIcon color="primary" />
            <Typography variant="body2" fontWeight={700}>
              Timestamps View
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <CloudDownloadIcon color="primary" />
            <Typography variant="body2" fontWeight={700}>
              Export as Text
            </Typography>
          </Stack>
        </Stack>

        {/* How it works */}
        <Box sx={{ maxWidth: 1000, mx: 'auto', mb: { xs: 6, md: 8 } }}>
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
                <Typography fontWeight={700}>1. Paste a YouTube URL</Typography>
                <Typography variant="body2" color="text.secondary">
                  We validate the link client‑side to save you time.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', textAlign: 'center' }}>
                <Typography fontWeight={700}>2. Fetch & Clean</Typography>
                <Typography variant="body2" color="text.secondary">
                  We fetch, decode entities, and normalize timestamps.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', textAlign: 'center' }}>
                <Typography fontWeight={700}>3. Copy or Download</Typography>
                <Typography variant="body2" color="text.secondary">
                  Copy in one click or export to a tidy text file.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {/* Results Section */}
        {transcriptData && (
          <Grid container spacing={3}>
            {/* Video Player - Left Side */}
            <Grid item xs={12} lg={6}>
              <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box
                  sx={{
                    position: 'relative',
                    paddingTop: '56.25%', // 16:9 aspect ratio
                    bgcolor: 'black',
                  }}
                >
                  <iframe
                    src={`https://www.youtube.com/embed/${transcriptData.videoId}`}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 0,
                    }}
                  />
                </Box>

                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Video Details
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    <Chip label={`Video ID: ${transcriptData.videoId}`} size="small" />
                    {transcriptData.language && (
                      <Chip
                        label={`Language: ${transcriptData.language}`}
                        size="small"
                        color="primary"
                      />
                    )}
                    <Chip
                      icon={<ScheduleIcon />}
                      label={`${transcriptData.segments.length} segments`}
                      size="small"
                      color="secondary"
                    />
                  </Stack>
                </CardContent>

                <Divider />

                <CardActions sx={{ p: 2 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="secondary"
                    startIcon={<CloudDownloadIcon />}
                    onClick={(e) => setQualityMenuAnchor(e.currentTarget)}
                    disabled={loading}
                  >
                    Download Video
                  </Button>
                  <Menu
                    anchorEl={qualityMenuAnchor}
                    open={Boolean(qualityMenuAnchor)}
                    onClose={() => setQualityMenuAnchor(null)}
                  >
                    <MenuItem onClick={() => downloadVideo('360')}>
                      <Typography variant="body2">360p - Standard Quality</Typography>
                    </MenuItem>
                    <MenuItem onClick={() => downloadVideo('720')}>
                      <Typography variant="body2">720p - HD Quality</Typography>
                    </MenuItem>
                    <MenuItem onClick={() => downloadVideo('1080')}>
                      <Typography variant="body2">1080p - Full HD</Typography>
                    </MenuItem>
                  </Menu>
                </CardActions>
              </Card>
            </Grid>

            {/* Transcript - Right Side */}
            <Grid item xs={12} lg={6}>
              <Card
                elevation={3}
                sx={{
                  height: { xs: 'auto', lg: '100%' },
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: { xs: '600px', lg: '100%' },
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                    gap={1}
                  >
                    <Typography variant="h6" fontWeight={600}>
                      Transcript
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        onClick={copyToClipboard}
                        size="small"
                        color="primary"
                        title="Copy to clipboard"
                      >
                        <CopyIcon />
                      </IconButton>
                      <IconButton
                        onClick={downloadTranscript}
                        size="small"
                        color="primary"
                        title="Download as text"
                      >
                        <DownloadIcon />
                      </IconButton>
                      <Button
                        variant={showTimestamps ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setShowTimestamps(!showTimestamps)}
                        startIcon={<ScheduleIcon />}
                      >
                        Timestamps
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>

                <Divider />

                <CardContent
                  sx={{
                    flexGrow: 1,
                    overflow: 'auto',
                    maxHeight: { xs: '400px', lg: 'calc(100vh - 400px)' },
                    pb: 1,
                  }}
                >
                  {showTimestamps ? (
                    // Display grouped by 10-second buckets
                    <Stack spacing={2}>
                      {groupSegmentsByInterval(transcriptData.segments, 10_000).map(
                        (bucket, index) => (
                          <Box key={index}>
                            <Typography
                              variant="caption"
                              color="primary"
                              fontWeight={600}
                              display="block"
                              gutterBottom
                            >
                              {formatTimestamp(bucket.startMs)}
                            </Typography>
                            <Typography variant="body2" color="text.primary">
                              {bucket.text}
                            </Typography>
                          </Box>
                        )
                      )}
                    </Stack>
                  ) : (
                    // Display as continuous long text
                    <Typography
                      variant="body2"
                      color="text.primary"
                      sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
                    >
                      {transcriptData.transcript}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>

      {/* Toast Notification */}
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
