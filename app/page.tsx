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
      return transcriptData.segments
        .map((seg) => `${formatTimestamp(seg.offset)} - ${seg.text}`)
        .join('\n\n')
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
    <Box sx={{ minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
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
          <Box sx={{ position: 'absolute', right: 16 }}>
            <ThemeToggle />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="md" sx={{ py: 8 }}>
        {/* URL Input Form */}
        <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 3 }}>
          <form onSubmit={handleSubmit}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter YouTube video URL..."
                variant="outlined"
                disabled={loading}
                sx={{ flexGrow: 1 }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                endIcon={<SendIcon />}
                sx={{ minWidth: { xs: '100%', sm: 160 } }}
              >
                {loading ? 'Loading...' : 'Get Transcript'}
              </Button>
            </Stack>
          </form>
        </Paper>

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
                    // Display with timestamps (segmented view)
                    <Stack spacing={2}>
                      {transcriptData.segments.map((segment, index) => (
                        <Box key={index}>
                          <Typography
                            variant="caption"
                            color="primary"
                            fontWeight={600}
                            display="block"
                            gutterBottom
                          >
                            {formatTimestamp(segment.offset)}
                          </Typography>
                          <Typography variant="body2" color="text.primary">
                            {segment.text}
                          </Typography>
                        </Box>
                      ))}
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
