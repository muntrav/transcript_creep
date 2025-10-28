'use client'
import React, { useState } from 'react'

export default function HomePage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setTranscript(null)
    setLoading(true)

    try {
      const res = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: url }),
      })
      const body = await res.json()
      console.log('API Response:', body)

      if (!res.ok) {
        throw new Error(`${body?.error || 'Unknown error'} ${body?.code ? `(${body.code})` : ''}`)
      }

      if (!body.data?.transcript) {
        throw new Error('No transcript data received')
      }

      setTranscript(body.data.transcript)
    } catch (err: any) {
      console.error('Transcript fetch error:', err)
      setError(err.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-4">Transcriptcreep</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm text-slate-600">YouTube video URL</span>
          <input
            type="text"
            value={url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="mt-1 block w-full rounded-md border p-2"
          />
        </label>

        <div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 text-white rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Extract Transcript'}
          </button>
        </div>
      </form>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      {transcript && (
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Transcript</h2>
            <div className="space-x-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(transcript)
                  // TODO: Add toast notification
                }}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-sm hover:bg-slate-200"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([transcript], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'transcript.txt'
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                }}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-sm hover:bg-slate-200"
              >
                Download .txt
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap bg-white p-4 rounded mt-2 border">{transcript}</pre>
        </section>
      )}
    </div>
  )
}
