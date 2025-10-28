import { NextResponse } from 'next/server'

export function getHealth() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString()
  }
}

export async function GET() {
  return NextResponse.json(getHealth())
}
