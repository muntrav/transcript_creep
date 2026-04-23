# Bulk Transcript ZIP Feature Plan

## Scope

Add a bulk transcript workflow that accepts either:

- multiple YouTube video links separated by new lines, or
- a single YouTube playlist link

and returns a downloadable `.zip` containing one `.txt` transcript file per video.

This plan is intentionally aligned to the current `transcript_creep` app architecture:

- Next.js 14 App Router
- Node.js API routes under `app/api/*`
- transcript extraction centralized in `lib/transcript.ts`
- current single-file transcript download handled in the browser

## Current State

The current app already supports:

- validating one URL in [`app/page.tsx`](D:\Projects\transcript-creep\app\page.tsx)
- extracting one transcript through [`app/api/transcript/route.ts`](D:\Projects\transcript-creep\app\api\transcript\route.ts)
- fetching YouTube transcripts through [`lib/transcript.ts`](D:\Projects\transcript-creep\lib\transcript.ts)
- downloading a single `.txt` transcript client-side as a `Blob`

The app does not currently support:

- bulk input parsing
- playlist expansion
- concurrent transcript extraction
- ZIP generation
- partial-success reporting for batch jobs

## Recommended Architecture

### 1. Add an in-page mode switcher on the existing homepage

Extend the existing [`app/page.tsx`](D:\Projects\transcript-creep\app\page.tsx) experience with a client-side mode switcher:

- `Single Video`
- `Bulk Export`

Reason:

- the user explicitly wants bulk mode on the same page with no refresh
- the app is already a client-rendered interaction surface, so mode switching is cheap
- the single-video flow can remain intact while bulk mode reuses the same visual shell

### 2. Keep transcript extraction on the server, but generate the ZIP in the browser

Recommended split:

- server:
  - validate input
  - expand playlist URLs into video URLs
  - fetch transcripts for each video
  - return structured JSON with successes and failures
- client:
  - build the `.zip` using `JSZip`
  - trigger download in the browser

Reason:

- this matches the current app pattern for transcript download
- avoids building a streaming ZIP route or temporary file storage
- avoids extra Vercel/serverless complexity
- allows the UI to show partial failures before download

## Recommended Dependencies

### ZIP creation

- `jszip`

Use it client-side to assemble:

- one `.txt` per successful transcript
- one `_errors.txt` summary when some items fail
- optionally one `manifest.json` for traceability

### Playlist expansion

- `youtubei.js`

Use it server-side to resolve playlist links into video IDs and titles.

Reason:

- `ytpl` is deprecated on npm
- `youtubei.js` is actively maintained and is built for YouTube's private API surface

## Proposed Data Flow

### Bulk input normalization

Add a new helper:

- `lib/bulk-input.ts`

Responsibilities:

- split newline-separated input
- trim empty lines
- deduplicate URLs
- detect whether input is:
  - list of video URLs
  - single playlist URL
- normalize all resolved items into a common structure

Proposed normalized item:

```ts
type BulkTranscriptInputItem = {
  sourceUrl: string
  videoId: string
  title?: string
}
```

### Playlist resolution

Add a new helper:

- `lib/youtube-playlist.ts`

Responsibilities:

- detect playlist URLs
- expand playlist items with:
  - `videoId`
  - `title`
  - canonical YouTube watch URL

If playlist expansion fails, return a clear error telling the user to paste individual links instead.

### Bulk transcript API

Add a new route:

- `app/api/transcript/bulk/route.ts`

Recommended request shape:

```ts
type BulkTranscriptRequest = {
  urlsText?: string
  playlistUrl?: string
}
```

Recommended response shape:

```ts
type BulkTranscriptResponse = {
  success: true
  data: {
    items: {
      sourceUrl: string
      videoId?: string
      title?: string
      language?: string
      transcript?: string
      fileName?: string
      success: boolean
      error?: string
    }[]
    stats: {
      requested: number
      succeeded: number
      failed: number
    }
  }
}
```

### Concurrency strategy

Do not fetch all transcripts at once.

Recommended limit:

- `2` to `3` concurrent transcript fetches

Reason:

- current transcript extraction already depends on external providers and retry logic
- aggressive concurrency increases timeout and rate-limit risk
- this feature should optimize for completion rate, not raw speed

Add a helper:

- `lib/promise-pool.ts` or use a lightweight concurrency utility

### File naming

Each successful transcript file should be named predictably.

Recommended filename format:

```text
01-video-title-videoId.txt
02-another-title-videoId.txt
```

Rules:

- sanitize invalid filename characters
- collapse whitespace
- cap title length
- always append `videoId` for uniqueness

Add a helper:

- `lib/file-names.ts`

## UX Plan

### Bulk section layout

Add:

- a multiline text area for pasted YouTube URLs
- a separate playlist URL field
- helper text explaining that only one input mode should be used at a time
- a max-items note
- a submit button: `Extract Bulk Transcripts`

### Result handling

Show after completion:

- total requested
- total succeeded
- total failed
- list of failures with short reasons
- a `Download ZIP` button

### ZIP contents

Recommended contents:

- one `.txt` transcript per successful item
- `_errors.txt` if any failed
- `manifest.json` with URLs, titles, and statuses

This makes the download useful even when one or two videos fail.

## Constraints and Safeguards

### Hard limits

Add these limits in the first version:

- max `50` videos per bulk job
- max `1` playlist per request
- reject mixed playlist + URL-list input

Reason:

- protects serverless runtime duration
- keeps ZIP generation and JSON response sizes reasonable

### Source support

For the first version, bulk mode should support:

- YouTube video URLs
- YouTube playlist URLs

Do not include TikTok/Instagram in bulk mode initially.

Reason:

- current user need is explicitly YouTube transcripts
- playlist support is YouTube-specific
- mixed-source bulk extraction increases complexity and error cases

### Failure tolerance

One failed video must not fail the full batch.

The API should capture per-item failures and return partial success.

## Implementation Slices

### Slice 1. Core batch extraction from pasted URLs

Deliverables:

- on-page bulk mode in `app/page.tsx`
- `app/api/transcript/bulk/route.ts`
- newline-separated YouTube URL parsing
- per-item transcript fetch using existing `getTranscript()`
- client-side ZIP download with `jszip`
- `_errors.txt` and `manifest.json`

This is the clean MVP.

### Slice 2. Playlist expansion

Deliverables:

- `lib/youtube-playlist.ts`
- playlist URL detection
- playlist item expansion using `youtubei.js`
- same downstream bulk extraction pipeline

This should reuse Slice 1 output shape.

### Slice 3. Polish and reliability

Deliverables:

- concurrency limiting
- item caps and input validation
- better status messages
- optional progress UI
- optional "download only successful transcripts" summary

## Test Plan

Add tests for:

- newline URL parsing and deduplication
- playlist URL detection
- filename sanitization
- batch API behavior with mixed success/failure
- ZIP manifest composition logic

Mock transcript fetches in unit tests instead of calling real providers.

## Risks

### 1. Playlist expansion reliability

YouTube playlist parsing is the least stable part of the feature.

Mitigation:

- use `youtubei.js`, not deprecated `ytpl`
- keep manual URL paste as a fallback path

### 2. Serverless timeouts

Large playlists may exceed route execution limits.

Mitigation:

- cap items per batch
- use low concurrency
- fail early on oversized requests

### 3. Provider rate limiting

RapidAPI transcript fetches may be rate-limited during bursts.

Mitigation:

- concurrency cap
- partial-success responses
- clear error reporting in `_errors.txt`

## Recommended Next Step

Implement Slice 1 first:

- bulk pasted URLs
- JSON batch API
- client-side ZIP generation

Then add playlist expansion once the batch pipeline is stable.
