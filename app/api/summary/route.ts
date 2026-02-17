import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type SummaryRequest = {
  transcript?: string
  sourceUrl?: string
}

const MAX_TRANSCRIPT_CHARS = 10000
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

function coerceStringArray(input: any): string[] {
  if (!Array.isArray(input)) return []
  return input.map((v) => String(v || '').trim()).filter(Boolean)
}

function coerceString(input: any): string {
  return typeof input === 'string' ? input.trim() : String(input || '').trim()
}

type SummarySection = {
  heading: string
  content: string
  actions?: string[]
  examples?: string[]
}

function coerceSections(input: any): SummarySection[] {
  if (!Array.isArray(input)) return []
  return input
    .map((item) => ({
      heading: coerceString(item?.heading || item?.title),
      content: coerceString(item?.content || item?.body || item?.summary),
      actions: coerceStringArray(item?.actions || item?.steps || item?.checklist),
      examples: coerceStringArray(item?.examples || item?.use_cases || item?.useCases),
    }))
    .filter((s) => s.heading || s.content || (s.actions && s.actions.length))
}

function parseSummaryJson(raw: string) {
  try {
    return JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

export async function POST(request: Request) {
  try {
    const body: SummaryRequest = await request.json()
    const transcript = (body.transcript || '').trim()
    if (!transcript) {
      return NextResponse.json(
        { success: false, error: 'Transcript text is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OPENROUTER_API_KEY not configured' },
        { status: 500 }
      )
    }

    const trimmed =
      transcript.length > MAX_TRANSCRIPT_CHARS
        ? transcript.slice(0, MAX_TRANSCRIPT_CHARS)
        : transcript

    const systemPrompt = [
      'You are an expert content synthesizer and educator.',
      'Your task is to transform transcripts into clear, actionable learning documents.',
      'Be faithful to the source. Do not invent facts or quotes.',
      'Return ONLY valid JSON. No markdown, no extra text.',
    ].join(' ')
    const userPrompt = [
      'Follow these instructions strictly:',
      '1) Structure the output clearly:',
      '- Start with a clear title reflecting the main idea.',
      '- Add a 1-2 paragraph overview explaining what the reader will learn and why it matters.',
      '2) Break down the content logically:',
      '- Organize information into sections with clear headings.',
      '- Each section focuses on one core idea.',
      '3) Make it actionable:',
      '- Convert advice into step-by-step actions, frameworks, or checklists.',
      '- Explain how to apply strategies/tools in real life.',
      '- Include examples or use cases when possible.',
      '4) Remove noise:',
      '- Remove filler, repetition, tangents, ads/sponsorships, and casual conversation.',
      '5) Improve clarity without changing meaning.',
      '6) Add learning enhancements:',
      '- Key Takeaways (3-7 bullets).',
      '- Action Plan (what to do next).',
      '7) Tone: practical, instructional, concise. No emojis, no hype.',
      '',
      'Output JSON with exactly these keys:',
      'title: string',
      'overview: string (1-2 paragraphs)',
      'sections: array of { heading: string, content: string, actions: string[], examples: string[] }',
      'key_takeaways: array of strings',
      'action_plan: array of strings',
      'If a field is not applicable, return an empty array for lists and an empty string for text.',
      '',
      'Transcript (may be truncated):',
      trimmed,
    ].join('\n')

    const payload = {
      model: 'openrouter/free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    }

    const originHeader =
      request.headers.get('origin') ||
      (request.headers.get('x-forwarded-proto') && request.headers.get('host')
        ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('host')}`
        : undefined) ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL ||
      'https://transcript-creep.vercel.app'

    let res: Response | null = null
    let errText = ''
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 25000)
      res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'HTTP-Referer': originHeader,
          'X-Title': 'Transcriptcreep',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (res.ok) break

      errText = await res.text().catch(() => '')
      if (!RETRYABLE_STATUS.has(res.status)) break

      const delay = 500 * Math.pow(2, attempt)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    if (!res || !res.ok) {
      const status = res?.status || 500
      const statusText = res?.statusText || 'Unknown error'
      const hint =
        status === 502
          ? 'OpenRouter free pool is busy. Please try again in a moment.'
          : undefined
      return NextResponse.json(
        {
          success: false,
          error: `OpenRouter error: ${status} ${statusText}`,
          details: errText?.slice(0, 500),
          hint,
        },
        { status }
      )
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || ''
    const parsed = parseSummaryJson(content)
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: 'Failed to parse summary JSON' },
        { status: 500 }
      )
    }

    const title = coerceString(parsed.title)
    const overview = coerceString(parsed.overview)
    const sections = coerceSections(parsed.sections)
    const keyTakeaways = coerceStringArray(parsed.key_takeaways ?? parsed.keyTakeaways)
    const actionPlan = coerceStringArray(parsed.action_plan ?? parsed.actionPlan)

    return NextResponse.json({
      success: true,
      data: {
        title,
        overview,
        sections,
        keyTakeaways,
        actionPlan,
      },
      meta: {
        truncated: transcript.length > MAX_TRANSCRIPT_CHARS,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Summary failed' },
      { status: 500 }
    )
  }
}
