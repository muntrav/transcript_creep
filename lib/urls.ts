export type UrlValidation = { valid: boolean; error?: string }

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
