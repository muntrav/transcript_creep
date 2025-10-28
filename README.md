# Transcriptcreep

Minimal Next.js App Router scaffold for extracting YouTube transcripts.

Getting started

1. Install dependencies:

```powershell
npm install
```

2. Run dev server:

```powershell
npm run dev
```

What is included
- Next.js 14 App Router (TypeScript)
- Tailwind CSS starter
- API route skeletons: `app/api/health/route.ts`, `app/api/transcript/route.ts`
- Basic tests using `vitest` for the health helper

Notes
- This is a minimal scaffold matching the PRD. The `POST /api/transcript` route is a placeholder — integrate your chosen transcript service (Python microservice or Node library) later.
