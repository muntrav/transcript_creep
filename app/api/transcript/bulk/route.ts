import { NextResponse } from 'next/server'
import { parseBulkUrls, MAX_BULK_ITEMS } from '@/lib/bulk-input'
import { consumeCredits } from '@/lib/billing'
import { makeTranscriptFileName } from '@/lib/file-names'
import { requireRequestUser } from '@/lib/request-auth'
import { getTranscript } from '@/lib/transcript'
import { toFriendlyErrorMessage } from '@/lib/user-facing-errors'
import { resolvePlaylistItems } from '@/lib/youtube-playlist'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const preferredRegion = ['iad1']

type BulkTranscriptRequest = {
  urlsText?: string
  playlistUrl?: string
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

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let currentIndex = 0

  async function runWorker() {
    while (currentIndex < items.length) {
      const index = currentIndex++
      results[index] = await worker(items[index], index)
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker())
  await Promise.all(runners)
  return results
}

export async function POST(request: Request) {
  try {
    const authResult = await requireRequestUser()
    if (!authResult.user) return authResult.response

    const body: BulkTranscriptRequest = await request.json()
    const urlsText = body.urlsText?.trim() || ''
    const playlistUrl = body.playlistUrl?.trim() || ''

    if (!urlsText && !playlistUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provide either newline-separated YouTube URLs or one playlist URL',
        },
        { status: 400 }
      )
    }

    if (urlsText && playlistUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Use either pasted URLs or a playlist URL, not both at the same time',
        },
        { status: 400 }
      )
    }

    let inputs: { sourceUrl: string; title?: string; videoId?: string }[] = []

    if (playlistUrl) {
      inputs = await resolvePlaylistItems(playlistUrl, MAX_BULK_ITEMS)
      if (!inputs.length) {
        return NextResponse.json(
          {
            success: false,
            error: 'No playable videos were found in that playlist',
          },
          { status: 400 }
        )
      }
    } else {
      const parsed = parseBulkUrls(urlsText)
      if (parsed.errors.length) {
        return NextResponse.json(
          {
            success: false,
            error: parsed.errors.join('\n'),
          },
          { status: 400 }
        )
      }

      if (!parsed.urls.length) {
        return NextResponse.json(
          {
            success: false,
            error: 'No valid YouTube URLs were found',
          },
          { status: 400 }
        )
      }

      if (parsed.urls.length > MAX_BULK_ITEMS) {
        return NextResponse.json(
          {
            success: false,
            error: `Bulk mode currently supports up to ${MAX_BULK_ITEMS} videos per request`,
          },
          { status: 400 }
        )
      }

      inputs = parsed.urls.map((sourceUrl) => ({ sourceUrl }))
    }

    const creditResult = await consumeCredits({
      userId: authResult.user.id,
      units: inputs.length,
      kind: 'bulk',
      metadata: {
        requestType: playlistUrl ? 'playlist' : 'urls',
        requestedItems: inputs.length,
      },
    })

    if (!creditResult?.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Monthly transcript limit reached for this bulk request. Visit pricing to request a paid plan.',
          code: 'QUOTA_EXCEEDED',
          data: creditResult,
        },
        { status: 402 }
      )
    }

    const items = await mapWithConcurrency(inputs, 3, async (input, index) => {
      try {
        const result = await getTranscript(input.sourceUrl)
        const title = input.title || `video-${result.videoId || index + 1}`
        const videoId = result.videoId

        return {
          sourceUrl: input.sourceUrl,
          videoId,
          title,
          language: result.language,
          transcript: result.transcript,
          fileName: videoId
            ? makeTranscriptFileName(index, title, videoId)
            : `transcript-${String(index + 1).padStart(2, '0')}.txt`,
          success: true,
        } satisfies BulkTranscriptItem
      } catch (error: any) {
        return {
          sourceUrl: input.sourceUrl,
          videoId: input.videoId,
          title: input.title,
          success: false,
          error: toFriendlyErrorMessage(error?.message, error?.code),
        } satisfies BulkTranscriptItem
      }
    })

    const succeeded = items.filter((item) => item.success).length
    const failed = items.length - succeeded

    return NextResponse.json({
      success: true,
      data: {
        items,
        stats: {
          requested: items.length,
          succeeded,
          failed,
        },
      },
    })
  } catch (error: any) {
    console.error('Bulk transcript error:', error)
    return NextResponse.json(
      {
        success: false,
        error: toFriendlyErrorMessage(error?.message),
      },
      { status: 500 }
    )
  }
}
