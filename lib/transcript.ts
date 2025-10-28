import { extractVideoId } from './youtube'
import { YoutubeTranscript } from '@danielxceron/youtube-transcript'

export type TranscriptSegment = {
  text: string
  duration: number
  offset: number
}

export type TranscriptResult = {
  transcript: string
  segments: TranscriptSegment[]
  videoId: string
  language?: string
}

export class TranscriptError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'TranscriptError'
  }
}

/**
 * Retry helper function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on these specific errors
      if (error instanceof TranscriptError && error.code === 'INVALID_URL') {
        throw error
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)
      console.log(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`)

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

export async function getTranscript(url: string): Promise<TranscriptResult> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw new TranscriptError('Invalid YouTube URL', 'INVALID_URL')
  }

  try {
    console.log('Fetching transcript for video ID:', videoId)

    // Fetch transcript with retry logic (tries to get any available language)
    let transcriptItems
    try {
      transcriptItems = await retryWithBackoff(async () => {
        const items = await YoutubeTranscript.fetchTranscript(videoId)
        console.log('Raw transcript response:', items)
        console.log('Transcript type:', typeof items, Array.isArray(items))
        return items
      }, 3, 1000)
    } catch (fetchError: any) {
      console.error('YouTube transcript API error:', fetchError)
      throw new TranscriptError(
        fetchError.message || 'Failed to fetch transcript from YouTube',
        'FETCH_ERROR'
      )
    }

    console.log('Fetched transcript items:', transcriptItems?.length ?? 0)
    if (transcriptItems?.length > 0) {
      console.log('First item:', JSON.stringify(transcriptItems[0]))
    }

    if (!transcriptItems?.length) {
      throw new TranscriptError('No transcript available for this video', 'NO_TRANSCRIPT')
    }

    // Helper function to decode HTML entities
    const decodeHtmlEntities = (text: string): string => {
      return text
        .replace(/&amp;#39;/g, "'")
        .replace(/&amp;quot;/g, '"')
        .replace(/&amp;amp;/g, '&')
        .replace(/&amp;lt;/g, '<')
        .replace(/&amp;gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
    }

    // Convert transcript segments to our format
    const segments = transcriptItems.map((item: any) => ({
      text: decodeHtmlEntities(item.text),
      duration: Math.round((item.duration || 0) * 1000), // Already in seconds, convert to milliseconds
      offset: Math.round((item.offset || 0) * 1000), // Already in seconds, convert to milliseconds
    }))

    // Join all text segments with proper spacing
    const fullTranscript = segments
      .map((s) => s.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    return {
      transcript: fullTranscript,
      segments,
      videoId,
      language: transcriptItems[0]?.lang || 'unknown',
    }
  } catch (error: any) {
    console.error('Transcript fetch error:', error)

    if (error instanceof TranscriptError) {
      throw error
    }

    throw new TranscriptError(error.message || 'Failed to fetch transcript', 'FETCH_ERROR')
  }
}
