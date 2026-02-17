export function decodeHtmlEntities(text: string): string {
  if (!text) return ''
  return (
    text
      // Handle double-encoded entities first
      .replace(/&amp;#39;/g, "'")
      .replace(/&amp;quot;/g, '"')
      .replace(/&amp;amp;/g, '&')
      .replace(/&amp;lt;/g, '<')
      .replace(/&amp;gt;/g, '>')
      // Then handle single-encoded entities
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
  )
}
