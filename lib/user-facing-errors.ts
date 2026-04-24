export function toFriendlyErrorMessage(message?: string | null, code?: string | null) {
  const normalizedCode = (code || '').toUpperCase()
  const normalizedMessage = (message || '').toLowerCase()

  if (normalizedCode === 'QUOTA_EXCEEDED') {
    return 'You have reached your monthly transcript limit. Upgrade or wait for your credits to reset.'
  }

  if (normalizedCode === 'NO_TRANSCRIPT' || normalizedMessage.includes('no transcript')) {
    return 'We could not find captions or a transcript for that video. Try another video or confirm captions are available.'
  }

  if (normalizedCode === 'INVALID_URL' || normalizedMessage.includes('invalid youtube url')) {
    return 'That link does not look like a valid supported video URL.'
  }

  if (
    normalizedMessage.includes('period_key') ||
    normalizedMessage.includes('ambiguous') ||
    normalizedMessage.includes('column reference')
  ) {
    return 'We hit an internal usage-tracking problem while processing your request. Please try again.'
  }

  if (
    normalizedCode === 'FETCH_ERROR' ||
    normalizedMessage.includes('failed to fetch transcript')
  ) {
    return 'We could not fetch the transcript right now. Please try again in a moment.'
  }

  if (normalizedMessage.includes('unauthorized')) {
    return 'Please sign in again to continue.'
  }

  if (!message) {
    return 'Something went wrong. Please try again.'
  }

  return message
}
