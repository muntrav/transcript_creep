const YOUTUBE_URL_PATTERNS = [
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/, // Standard watch URL with query params
  /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/, // Short URL
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/, // Embed URL
]

export function extractVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  return null
}

export function validateYouTubeUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'URL is required' }
  }

  try {
    new URL(url)
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }

  const videoId = extractVideoId(url)
  if (!videoId) {
    return {
      valid: false,
      error:
        'Invalid YouTube URL. Supported formats: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID',
    }
  }

  return { valid: true }
}
