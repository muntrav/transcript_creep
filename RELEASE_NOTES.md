# Release Notes — Transcriptcreep v2

Release Date: 2026-02-17

## Highlights
- Transcript extraction now supports Shorts, Reels, and TikTok links.
- AI summaries generate a structured learning document with sections, takeaways, and action plan.
- Summary can be copied with a single click.

## Features
- Shorts/Reels/TikTok transcript extraction via Supadata.
- Summary API via OpenRouter free router (`openrouter/free`).
- New summary UI panel with title, overview, sections, key takeaways, and action plan.
- Updated transcript validation to support YouTube, TikTok, and Instagram.

## Configuration
Add the following environment variables:
- `SUPADATA_API_KEY`
- `OPENROUTER_API_KEY`

## Notes
- OpenRouter free tier is rate-limited.
- Supadata may respond with async processing (retry if needed).

## Known Limitations
- Summary input is truncated for very long transcripts (to keep requests reliable).