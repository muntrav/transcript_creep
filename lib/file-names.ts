function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function sanitizeFileName(value: string): string {
  return collapseWhitespace(value)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\.+$/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
}

export function makeTranscriptFileName(index: number, label: string, videoId: string): string {
  const safeLabel = sanitizeFileName(label) || `video-${videoId}`
  const order = String(index + 1).padStart(2, '0')
  return `${order}-${safeLabel}-${videoId}.txt`
}
