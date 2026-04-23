import Innertube from 'youtubei.js'
import { MAX_BULK_ITEMS } from './bulk-input'

export type PlaylistVideoItem = {
  videoId: string
  title: string
  sourceUrl: string
}

const PLAYLIST_ID_PATTERNS = [/[?&]list=([a-zA-Z0-9_-]+)/, /^([a-zA-Z0-9_-]+)$/]

export function extractPlaylistId(value: string): string | null {
  for (const pattern of PLAYLIST_ID_PATTERNS) {
    const match = value.match(pattern)
    if (match?.[1]) return match[1]
  }

  return null
}

export async function resolvePlaylistItems(
  playlistUrl: string,
  maxItems: number = MAX_BULK_ITEMS
): Promise<PlaylistVideoItem[]> {
  const playlistId = extractPlaylistId(playlistUrl)
  if (!playlistId) {
    throw new Error('Invalid YouTube playlist URL')
  }

  const yt = await Innertube.create()
  let playlist = await yt.getPlaylist(playlistId)
  const items: PlaylistVideoItem[] = []

  const pushItems = () => {
    for (const item of playlist.items) {
      if (items.length >= maxItems) break
      if (!('id' in item) || !item.id) continue
      if (!('title' in item) || !item.title) continue
      if ('is_playable' in item && item.is_playable === false) continue

      const titleText =
        typeof item.title === 'string'
          ? item.title
          : 'toString' in item.title
            ? item.title.toString()
            : `video-${item.id}`

      items.push({
        videoId: item.id,
        title: titleText,
        sourceUrl: `https://www.youtube.com/watch?v=${item.id}`,
      })
    }
  }

  pushItems()

  while (playlist.has_continuation && items.length < maxItems) {
    playlist = await playlist.getContinuation()
    pushItems()
  }

  return items
}
