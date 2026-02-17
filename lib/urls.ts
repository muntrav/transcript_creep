import { validateYouTubeUrl } from './youtube'

export type UrlValidation = { valid: boolean; error?: string }
export type TranscriptSource = 'youtube' | 'instagram' | 'tiktok' | 'unknown'

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateShortsUrl(url: string): UrlValidation {
  if (!url || !isHttpUrl(url)) return { valid: false, error: 'Enter a valid URL' }
  const host = new URL(url).hostname.toLowerCase()

  const isYouTube = /(^|\.)youtube\.com$/.test(host) || /(^|\.)youtu\.be$/.test(host)
  const isInstagram = /(^|\.)instagram\.com$/.test(host)
  const isTikTok = /(^|\.)tiktok\.com$/.test(host) || /(^|\.)vt\.tiktok\.com$/.test(host)

  if (!(isYouTube || isInstagram || isTikTok)) {
    return { valid: false, error: 'Supported: YouTube, Instagram, TikTok' }
  }

  // Light path checks
  if (isYouTube) {
    // Accept shorts, watch, youtu.be, embed, etc.
    return { valid: true }
  }
  if (isInstagram) {
    // Expect /reel/, /reels/, or /p/
    if (/\/reel\//i.test(url) || /\/reels\//i.test(url) || /\/p\//i.test(url))
      return { valid: true }
    return { valid: false, error: 'Use a Reel/Post URL' }
  }
  if (isTikTok) {
    // Expect /video/ or a vt.tiktok short link
    if (/\/video\//i.test(url) || /vt\.tiktok\.com\//i.test(url)) return { valid: true }
    return { valid: false, error: 'Use a TikTok video URL' }
  }

  return { valid: false, error: 'Unsupported URL' }
}

export function getTranscriptSource(url: string): TranscriptSource {
  if (!isHttpUrl(url)) return 'unknown'
  const host = new URL(url).hostname.toLowerCase()

  const isYouTube = /(^|\.)youtube\.com$/.test(host) || /(^|\.)youtu\.be$/.test(host)
  const isInstagram = /(^|\.)instagram\.com$/.test(host)
  const isTikTok = /(^|\.)tiktok\.com$/.test(host) || /(^|\.)vt\.tiktok\.com$/.test(host)

  if (isYouTube) return 'youtube'
  if (isInstagram) return 'instagram'
  if (isTikTok) return 'tiktok'
  return 'unknown'
}

export function validateTranscriptUrl(url: string): UrlValidation & { source?: TranscriptSource } {
  const source = getTranscriptSource(url)
  if (source === 'youtube') {
    const v = validateYouTubeUrl(url)
    return { ...v, source }
  }
  if (source === 'instagram' || source === 'tiktok') {
    const v = validateShortsUrl(url)
    return { ...v, source }
  }
  return { valid: false, error: 'Supported: YouTube, Instagram, TikTok', source: 'unknown' }
}
