# Pull Request: Transcriptcreep v2 Updates

## Summary
- Adds transcript extraction for Shorts/Reels/TikTok via Supadata
- Adds AI summaries (OpenRouter free router) with structured learning output
- Updates transcript UI to support new sources and summary panel with copy

## Changes
- New Supadata transcript client and API routing for non-YouTube URLs
- New `/api/summary` endpoint with structured JSON output
- UI updates for transcript validation, summary rendering, and summary copy
- Updated `.env.local.example` with new required keys

## How to Test
1. Set env vars:
   - `SUPADATA_API_KEY`
   - `OPENROUTER_API_KEY`
2. Run `npm install` then `npm run dev`
3. Test YouTube transcript flow:
   - Paste a YouTube URL and fetch transcript
   - Click `Summarize` and verify formatted output
4. Test Shorts/Reels/TikTok:
   - Paste a TikTok or Instagram URL and fetch transcript
5. Verify summary copy button copies full formatted summary

## Notes
- OpenRouter free tier has rate limits
- Supadata may return async jobs; retries may be needed
