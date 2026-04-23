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
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import {
  Send as SendIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  CloudDownload as CloudDownloadIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material'
import ThemeToggle from '@/components/ThemeToggle'
import AuthActions from '@/components/AuthActions'
import PageSwitcher from '@/components/PageSwitcher'
import { groupSegmentsByInterval } from '@/lib/segment-group'
import { validateTranscriptUrl } from '@/lib/urls'

type TranscriptSegment = {
  text: string
  duration: number
  offset: number
}

type TranscriptData = {
  transcript: string
  segments: TranscriptSegment[]
  videoId?: string
  language?: string
  sourceUrl?: string
  provider?: string
}

type ToastType = {
  message: string
  type: 'success' | 'error' | 'info'
}

type SummaryData = {
  title: string
  overview: string
  sections: {
    heading: string
    content: string
    actions?: string[]
    examples?: string[]
  }[]
  keyTakeaways: string[]
  actionPlan: string[]
}

type BulkTranscriptItem = {
  sourceUrl: string
  videoId?: string
  title?: string
  language?: string
  transcript?: string
  fileName?: string
  success: boolean
  error?: string
}

type BulkTranscriptData = {
  items: BulkTranscriptItem[]
  stats: {
    requested: number
    succeeded: number
    failed: number
  }
}

export default function HomePage() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null)
  const [showTimestamps, setShowTimestamps] = useState(false)
  const [qualityMenuAnchor, setQualityMenuAnchor] = useState<null | HTMLElement>(null)
  const [toast, setToast] = useState<ToastType | null>(null)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [bulkUrlsText, setBulkUrlsText] = useState('')
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<BulkTranscriptData | null>(null)

  const urlValidation = useMemo(() => (url ? validateTranscriptUrl(url) : { valid: false }), [url])
  const isUrlValid = urlValidation.valid

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
    setSummary(null)
    setSummaryError(null)
    setLoading(true)

    try {
      const v = validateTranscriptUrl(url)
      if (!v.valid) {
        throw new Error(v.error || 'Please enter a valid video URL')
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

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBulkError(null)
    setBulkResult(null)
    setBulkLoading(true)

    try {
      const trimmedUrls = bulkUrlsText.trim()
      const trimmedPlaylist = playlistUrl.trim()

      if (!trimmedUrls && !trimmedPlaylist) {
        throw new Error('Paste YouTube links or enter one playlist URL')
      }

      if (trimmedUrls && trimmedPlaylist) {
        throw new Error('Use either pasted URLs or a playlist URL, not both')
      }

      const res = await fetch('/api/transcript/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urlsText: trimmedUrls,
          playlistUrl: trimmedPlaylist,
        }),
      })

      const body = await res.json()

      if (!res.ok) {
        throw new Error(body?.error || 'Failed to fetch bulk transcripts')
      }

      setBulkResult(body.data)
      showToast(
        `Bulk run complete: ${body.data.stats.succeeded} succeeded, ${body.data.stats.failed} failed`,
        body.data.stats.failed ? 'info' : 'success'
      )
    } catch (err: any) {
      setBulkError(err.message || 'Failed to fetch bulk transcripts')
    } finally {
      setBulkLoading(false)
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

  const downloadBulkZip = async () => {
    if (!bulkResult) return

    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    const successfulItems = bulkResult.items.filter((item) => item.success && item.transcript)
    const failedItems = bulkResult.items.filter((item) => !item.success)

    successfulItems.forEach((item, index) => {
      zip.file(
        item.fileName || `transcript-${String(index + 1).padStart(2, '0')}.txt`,
        item.transcript || ''
      )
    })

    if (failedItems.length) {
      const errorReport = failedItems
        .map((item, index) => `${index + 1}. ${item.sourceUrl}\n${item.error || 'Unknown error'}`)
        .join('\n\n')
      zip.file('_errors.txt', errorReport)
    }

    zip.file(
      'manifest.json',
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          stats: bulkResult.stats,
          items: bulkResult.items.map((item) => ({
            sourceUrl: item.sourceUrl,
            videoId: item.videoId,
            title: item.title,
            language: item.language,
            fileName: item.fileName,
            success: item.success,
            error: item.error,
          })),
        },
        null,
        2
      )
    )

    const blob = await zip.generateAsync({ type: 'blob' })
    const downloadUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = 'transcript-creep-bulk-export.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(downloadUrl)
    showToast('Bulk transcript ZIP downloaded!')
  }

  const formatSummaryText = (data: SummaryData) => {
    const lines: string[] = []
    if (data.title) lines.push(data.title, '')
    if (data.overview) lines.push(data.overview.trim(), '')
    if (data.sections?.length) {
      for (const section of data.sections) {
        if (section.heading) lines.push(section.heading)
        if (section.content) lines.push(section.content)
        if (section.actions?.length) {
          lines.push('Actions:')
          section.actions.forEach((a) => lines.push(`- ${a}`))
        }
        if (section.examples?.length) {
          lines.push('Examples:')
          section.examples.forEach((e) => lines.push(`- ${e}`))
        }
        lines.push('')
      }
    }
    if (data.keyTakeaways?.length) {
      lines.push('Key Takeaways:')
      data.keyTakeaways.forEach((k) => lines.push(`- ${k}`))
      lines.push('')
    }
    if (data.actionPlan?.length) {
      lines.push('Action Plan:')
      data.actionPlan.forEach((a) => lines.push(`- ${a}`))
    }
    return lines.join('\n').trim()
  }

  const copySummaryToClipboard = () => {
    if (!summary) return
    const text = formatSummaryText(summary)
    if (!text) return
    navigator.clipboard.writeText(text)
    showToast('Summary copied!')
  }

  const summarizeTranscript = async () => {
    if (!transcriptData?.transcript) return
    setSummaryLoading(true)
    setSummaryError(null)

    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptData.transcript,
          sourceUrl: transcriptData.sourceUrl,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to summarize transcript')
      }
      setSummary(body.data)
      showToast('Summary ready!')
    } catch (err: any) {
      setSummaryError(err.message || 'Failed to summarize transcript')
      showToast(err.message || 'Failed to summarize transcript', 'error')
    } finally {
      setSummaryLoading(false)
    }
  }

  const downloadVideo = async (quality: string) => {
    if (!transcriptData?.videoId || transcriptData.provider !== 'youtube') return

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
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={(_event, value) => {
                  if (value) setMode(value)
                }}
                color="primary"
                size="small"
              >
                <ToggleButton value="single">Single Video</ToggleButton>
                <ToggleButton value="bulk">Bulk Export</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {mode === 'single' ? (
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
                    placeholder="Enter YouTube / TikTok / Instagram URL..."
                    variant="outlined"
                    disabled={loading}
                    error={Boolean(url) && !isUrlValid}
                    helperText={Boolean(url) && !isUrlValid ? urlValidation.error : ' '}
                    sx={{ flexGrow: 1 }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading || (url.length > 0 && !isUrlValid)}
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
            ) : (
              <form onSubmit={handleBulkSubmit}>
                <Stack spacing={2.5}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={8}
                    value={bulkUrlsText}
                    onChange={(e) => setBulkUrlsText(e.target.value)}
                    placeholder={
                      'Paste one YouTube video URL per line\nhttps://www.youtube.com/watch?v=...\nhttps://youtu.be/...'
                    }
                    variant="outlined"
                    disabled={bulkLoading}
                    helperText="Paste multiple YouTube video links separated by new lines."
                  />
                  <TextField
                    fullWidth
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    placeholder="Or enter one YouTube playlist URL"
                    variant="outlined"
                    disabled={bulkLoading}
                    helperText="Use either pasted URLs or one playlist URL. Current limit: 50 videos per run."
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={bulkLoading}
                    endIcon={<CloudDownloadIcon />}
                    sx={{
                      width: { xs: '100%', md: 'auto' },
                      alignSelf: { xs: 'stretch', md: 'flex-start' },
                      py: { xs: 1.5, md: 1.2 },
                    }}
                  >
                    {bulkLoading ? 'Extracting...' : 'Extract Bulk Transcripts'}
                  </Button>
                </Stack>
              </form>
            )}
          </Stack>
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
        {mode === 'single' && error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {mode === 'bulk' && bulkError && (
          <Alert severity="error" onClose={() => setBulkError(null)} sx={{ mb: 4 }}>
            {bulkError}
          </Alert>
        )}

        {/* Results Section */}
        {mode === 'single' && transcriptData && (
          <Grid container spacing={3}>
            {/* Video / Source Details - Left Side */}
            <Grid item xs={12} lg={6}>
              <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {transcriptData.provider === 'youtube' && transcriptData.videoId ? (
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
                ) : (
                  <Box
                    sx={{
                      p: 3,
                      bgcolor: 'background.paper',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="h6" gutterBottom fontWeight={600}>
                      Transcript Source
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ wordBreak: 'break-word' }}
                    >
                      {transcriptData.sourceUrl || 'External video'}
                    </Typography>
                  </Box>
                )}

                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Details
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {transcriptData.videoId && (
                      <Chip label={`Video ID: ${transcriptData.videoId}`} size="small" />
                    )}
                    {transcriptData.provider && (
                      <Chip label={`Source: ${transcriptData.provider}`} size="small" />
                    )}
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
                    disabled={
                      loading || transcriptData.provider !== 'youtube' || !transcriptData.videoId
                    }
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
              <Stack spacing={3}>
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
                      <Stack direction="row" spacing={1} flexWrap="wrap">
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
                        <Button
                          variant="contained"
                          size="small"
                          onClick={summarizeTranscript}
                          startIcon={<AutoAwesomeIcon />}
                          disabled={summaryLoading}
                        >
                          {summaryLoading ? 'Summarizing...' : 'Summarize'}
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

                {(summaryLoading || summary || summaryError) && (
                  <Card elevation={3}>
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight={600}>
                          Summary
                        </Typography>
                        {summaryLoading && <CircularProgress size={18} />}
                        {summary && (
                          <IconButton
                            onClick={copySummaryToClipboard}
                            size="small"
                            color="primary"
                            title="Copy summary"
                          >
                            <CopyIcon />
                          </IconButton>
                        )}
                      </Stack>

                      {summaryError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {summaryError}
                        </Alert>
                      )}

                      {!summaryLoading && summary && (
                        <Stack spacing={2}>
                          {summary.title && (
                            <Typography variant="h5" fontWeight={700}>
                              {summary.title}
                            </Typography>
                          )}
                          {summary.overview && (
                            <Typography
                              variant="body2"
                              color="text.primary"
                              sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
                            >
                              {summary.overview}
                            </Typography>
                          )}
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>
                              Sections
                            </Typography>
                            <Stack spacing={0.5}>
                              {summary.sections.length ? (
                                summary.sections.map((section, idx) => (
                                  <Box key={idx} sx={{ mb: 1.5 }}>
                                    {section.heading && (
                                      <Typography variant="subtitle2" fontWeight={700}>
                                        {section.heading}
                                      </Typography>
                                    )}
                                    {section.content && (
                                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                                        {section.content}
                                      </Typography>
                                    )}
                                    {section.actions?.length ? (
                                      <Stack spacing={0.25} sx={{ mb: 0.5 }}>
                                        <Typography variant="caption" fontWeight={700}>
                                          Actions
                                        </Typography>
                                        {section.actions.map((item, aIdx) => (
                                          <Typography key={aIdx} variant="body2">
                                            - {item}
                                          </Typography>
                                        ))}
                                      </Stack>
                                    ) : null}
                                    {section.examples?.length ? (
                                      <Stack spacing={0.25}>
                                        <Typography variant="caption" fontWeight={700}>
                                          Examples
                                        </Typography>
                                        {section.examples.map((item, eIdx) => (
                                          <Typography key={eIdx} variant="body2">
                                            - {item}
                                          </Typography>
                                        ))}
                                      </Stack>
                                    ) : null}
                                  </Box>
                                ))
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  No sections found.
                                </Typography>
                              )}
                            </Stack>
                          </Box>

                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>
                              Key Takeaways
                            </Typography>
                            <Stack spacing={0.5}>
                              {summary.keyTakeaways.length ? (
                                summary.keyTakeaways.map((item, idx) => (
                                  <Typography key={idx} variant="body2">
                                    - {item}
                                  </Typography>
                                ))
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  No key takeaways found.
                                </Typography>
                              )}
                            </Stack>
                          </Box>

                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>
                              Action Plan
                            </Typography>
                            <Stack spacing={0.5}>
                              {summary.actionPlan.length ? (
                                summary.actionPlan.map((item, idx) => (
                                  <Typography key={idx} variant="body2">
                                    - {item}
                                  </Typography>
                                ))
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  No action plan found.
                                </Typography>
                              )}
                            </Stack>
                          </Box>
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </Grid>
          </Grid>
        )}

        {mode === 'bulk' && bulkResult && (
          <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
            <Card elevation={3}>
              <CardContent>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  spacing={2}
                  sx={{ mb: 3 }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Bulk transcript export
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {bulkResult.stats.succeeded} succeeded, {bulkResult.stats.failed} failed,{' '}
                      {bulkResult.stats.requested} total.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={downloadBulkZip}
                    disabled={!bulkResult.items.some((item) => item.success && item.transcript)}
                  >
                    Download ZIP
                  </Button>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
                  <Chip label={`Requested: ${bulkResult.stats.requested}`} />
                  <Chip label={`Succeeded: ${bulkResult.stats.succeeded}`} color="success" />
                  <Chip label={`Failed: ${bulkResult.stats.failed}`} color="error" />
                </Stack>

                <Stack spacing={2}>
                  {bulkResult.items.map((item, index) => (
                    <Paper
                      key={`${item.sourceUrl}-${index}`}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 3 }}
                    >
                      <Stack spacing={1}>
                        <Stack
                          direction={{ xs: 'column', md: 'row' }}
                          justifyContent="space-between"
                          alignItems={{ xs: 'flex-start', md: 'center' }}
                          spacing={1}
                        >
                          <Typography fontWeight={700}>
                            {item.title || item.videoId || `Video ${index + 1}`}
                          </Typography>
                          <Chip
                            label={item.success ? 'Success' : 'Failed'}
                            color={item.success ? 'success' : 'error'}
                            size="small"
                          />
                        </Stack>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ wordBreak: 'break-word' }}
                        >
                          {item.sourceUrl}
                        </Typography>
                        {item.fileName && item.success && (
                          <Typography variant="caption" color="text.secondary">
                            ZIP file: {item.fileName}
                          </Typography>
                        )}
                        {!item.success && item.error && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            {item.error}
                          </Alert>
                        )}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Box>
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
