import { validateTranscriptUrl } from './urls'

export const MAX_BULK_ITEMS = 50

export type ParsedBulkUrls = {
  urls: string[]
  errors: string[]
}

export function parseBulkUrls(urlsText: string): ParsedBulkUrls {
  const rawLines = urlsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const deduped = Array.from(new Set(rawLines))
  const urls: string[] = []
  const errors: string[] = []

  deduped.forEach((value, index) => {
    const validation = validateTranscriptUrl(value)
    if (!validation.valid) {
      errors.push(`Line ${index + 1}: ${validation.error || 'Invalid URL'}`)
      return
    }

    if (validation.source !== 'youtube') {
      errors.push(`Line ${index + 1}: Bulk mode currently supports YouTube URLs only`)
      return
    }

    urls.push(value)
  })

  return { urls, errors }
}
