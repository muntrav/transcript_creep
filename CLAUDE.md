# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Transcriptcreep is a Next.js 14 App Router application for extracting YouTube video transcripts. The app provides a simple web interface where users can paste a YouTube URL and receive the video's transcript, which they can copy or download.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (port 3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Run tests (Vitest)
npm test

# Run a single test file
npx vitest tests/health.test.ts
```

## Architecture

### Core Structure

- **Next.js App Router**: Uses the `app/` directory structure (Next.js 14)
- **API Routes**: Server-side logic in `app/api/` directory
  - `app/api/health/route.ts`: Health check endpoint (GET)
  - `app/api/transcript/route.ts`: Transcript extraction endpoint with retry logic (POST)
  - `app/api/download/route.ts`: Video download link fetching endpoint (POST)
- **Shared Libraries**: Utility functions in `lib/` directory
  - `lib/youtube.ts`: YouTube URL validation and video ID extraction
  - `lib/transcript.ts`: Transcript fetching logic with automatic retry mechanism
  - `lib/health.ts`: Health check logic
- **Tests**: Located in `tests/` directory, run with Vitest

### Path Aliases

The project uses `@/` as an alias for the root directory:

```typescript
import { validateYouTubeUrl } from '@/lib/youtube'
import { getHealth } from '@/app/api/health/route'
```

This is configured in:

- `tsconfig.json`: `"@/*": ["./*"]`
- `next.config.js`: webpack alias configuration
- `vitest.config.ts`: test alias configuration

### Transcript Fetching Flow

1. User submits YouTube URL via [app/page.tsx](app/page.tsx)
2. Frontend POSTs to `/api/transcript`
3. [app/api/transcript/route.ts](app/api/transcript/route.ts) validates URL using `validateYouTubeUrl()`
   - **Important**: This route uses `export const runtime = 'nodejs'` to ensure Node.js runtime (required for network requests)
4. [lib/transcript.ts](lib/transcript.ts) calls `getTranscript()` which:
   - Extracts video ID using `extractVideoId()`
   - Calls `YoutubeTranscript.fetchTranscript()` with automatic retry logic (3 attempts with exponential backoff)
   - Retry delays: 1s, 2s, 4s between attempts
   - Decodes HTML entities in transcript text (e.g., `&amp;#39;` → `'`)
   - Converts segments to standard format with millisecond timestamps
   - Returns full transcript text and individual segments
5. Response includes:
   - `transcript`: Full concatenated text with decoded HTML entities
   - `segments`: Array of `{ text, duration, offset }` objects
   - `videoId`: Extracted video ID
   - `language`: Caption language from YouTube

### Video Download Flow

1. User clicks "Download Video" button and selects quality (360p, 720p, 1080p)
2. Frontend POSTs to `/api/download` with video URL and quality
3. [app/api/download/route.ts](app/api/download/route.ts):
   - Validates URL and extracts video ID
   - Calls YTStream API (RapidAPI) to get download link
   - Returns download URL, video title, and thumbnail
4. Frontend opens download link in new tab
5. **Setup Required**: Add `RAPIDAPI_KEY` to `.env.local` file
   - Get your free API key from [RapidAPI](https://rapidapi.com/ytjar/api/ytstream-download-youtube-videos)

### Error Handling

The app uses a custom `TranscriptError` class with error codes:

- `INVALID_URL`: YouTube URL format is invalid
- `NO_TRANSCRIPT`: Video has no available captions
- `FETCH_ERROR`: Generic fetch failure
- `UNKNOWN_ERROR`: Unexpected errors

API responses follow the pattern:

```typescript
{ success: boolean, data?: any, error?: string, code?: string }
```

## Code Style

### Formatting (Prettier)

- No semicolons
- Single quotes
- Trailing commas (ES5)
- 100 character line width
- 2 space indentation

### Linting (ESLint)

- Extends `next/core-web-vitals` and `prettier`
- `prettier/prettier` errors enforced
- `no-unused-vars` and `@typescript-eslint/no-explicit-any` produce warnings

### TypeScript

- Strict mode enabled
- Target: ES2022
- Module resolution: Bundler

## Testing

Tests use Vitest with jsdom environment:

- Test files: `tests/**/*.{test,spec}.{ts,tsx}`
- Globals enabled (no need to import `describe`, `it`, `expect`)
- React plugin enabled for component testing

## Key Implementation Notes

### YouTube URL Support

The app supports three YouTube URL formats:

- Standard: `https://www.youtube.com/watch?v=VIDEO_ID`
- Short: `https://youtu.be/VIDEO_ID`
- Embed: `https://www.youtube.com/embed/VIDEO_ID`

Video IDs are always 11 characters: alphanumeric, underscore, or hyphen.

### Client-Side State Management

[app/page.tsx](app/page.tsx) is a client component (`"use client"`) that manages:

- Form input state
- Loading state
- Error messages
- Transcript display (with/without timestamps)
- Video player embed
- Quality dropdown for video download
- Toast notifications

**Key Features**:
- **Copy to Clipboard**: Copies current transcript format (with or without timestamps)
- **Download as Text**: Downloads transcript in current format
- **Toggle Timestamps**: Real-time toggle between long text format and timestamped segments
- **Video Player**: Embedded YouTube player
- **Video Download**: Quality selector (360p, 720p, 1080p) with API-based download
- **Toast Notifications**: User feedback for actions (success, error, info)

### Important Implementation Details

**YouTube Transcript Package**: Uses `@danielxceron/youtube-transcript` instead of the original `youtube-transcript` package. The original package (v1.2.1) was returning empty arrays and is outdated. The fork by @danielxceron includes a fallback system for improved reliability.

**Node.js Runtime Requirement**: Both `/api/transcript` and `/api/download` routes MUST use Node.js runtime (`export const runtime = 'nodejs'`) instead of Edge runtime, as the packages require full Node.js network access.

**Retry Logic**: The transcript fetching includes automatic retry with exponential backoff to handle intermittent network failures. This improves reliability when YouTube's servers are slow to respond.

**Environment Variables**: The video download feature requires a RapidAPI key:
- Create a `.env.local` file in the project root
- Add: `RAPIDAPI_KEY=your_rapidapi_key_here`
- Get a free key from [RapidAPI YTStream](https://rapidapi.com/ytjar/api/ytstream-download-youtube-videos)
- The free tier includes limited requests per month
