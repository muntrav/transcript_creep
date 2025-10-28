import './globals.css'
import React from 'react'
import { ThemeProvider } from './providers'

export const metadata = {
  title: 'Transcriptcreep',
  description: 'Extract and view YouTube transcripts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
