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
4. [lib/transcript.ts](lib/transcript.ts) calls `getTranscript()` which uses a multi-tier fallback system:
   - **Primary Method (Production)**: RapidAPI YouTube Transcript service via [lib/transcript-rapidapi.ts](lib/transcript-rapidapi.ts)
     - Reliable on Vercel deployment (avoids IP blocking)
     - Requires `RAPIDAPI_KEY` environment variable
     - Same API key used for video downloads
   - **Fallback Method 1**: Direct library fetch via `@danielxceron/youtube-transcript`
     - Works locally but may fail on Vercel due to IP blocking
     - Automatic retry logic (2 attempts with exponential backoff)
     - Retry delays: 500ms, 1000ms between attempts
   - **Fallback Method 2**: Custom timedtext API implementation
     - Direct calls to YouTube's timedtext API
     - Supports JSON3 and VTT formats
     - May also fail on Vercel due to IP blocking
5. All methods decode HTML entities in transcript text (e.g., `&amp;#39;` → `'`)
6. Response includes:
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
5. **Setup Required**: Add two RapidAPI keys to `.env.local` file:

   ```
   RAPIDAPI_KEY=your_ytstream_api_key_here
   RAPIDAPI_TRANSCRIPT_KEY=your_transcript_api_key_here
   ```

   - Get your free API keys from [RapidAPI](https://rapidapi.com/)
   - Subscribe to both APIs (each provides its own API key):
     - [YTStream API](https://rapidapi.com/ytjar/api/ytstream-download-youtube-videos) for video downloads → use as `RAPIDAPI_KEY`
     - [YouTube Captions Transcript API](https://rapidapi.com/LucaBert89/api/youtube-captions-transcript-subtitles-video-combiner) for transcript fetching → use as `RAPIDAPI_TRANSCRIPT_KEY`

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

**Environment Variables**: Both transcript fetching and video download features require RapidAPI keys:

- Create a `.env.local` file in the project root
- Add two separate API keys:
  ```
  RAPIDAPI_KEY=your_ytstream_api_key_here
  RAPIDAPI_TRANSCRIPT_KEY=your_transcript_api_key_here
  ```
- Get free keys from [RapidAPI](https://rapidapi.com/) by subscribing to both APIs:
  - [YouTube Captions Transcript API](https://rapidapi.com/LucaBert89/api/youtube-captions-transcript-subtitles-video-combiner) → `RAPIDAPI_TRANSCRIPT_KEY` (required for production/Vercel)
  - [YTStream API](https://rapidapi.com/ytjar/api/ytstream-download-youtube-videos) → `RAPIDAPI_KEY`
- Each API subscription provides its own unique API key
- The free tier includes limited requests per month
- **Important for Vercel**: The RapidAPI transcript method is the primary method used in production to avoid IP blocking issues that occur with direct YouTube scraping from serverless functions
