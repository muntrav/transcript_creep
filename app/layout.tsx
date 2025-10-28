import './globals.css'
import React from 'react'

export const metadata = {
  title: 'Transcriptcreep',
  description: 'Extract and view YouTube transcripts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <main className="min-h-screen max-w-3xl mx-auto p-6">{children}</main>
      </body>
    </html>
  )
}
