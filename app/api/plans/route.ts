import { NextResponse } from 'next/server'
import { getPlans } from '@/lib/billing'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const plans = await getPlans()
    return NextResponse.json({ success: true, data: plans })
  } catch (error: any) {
    console.error('Plans lookup error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to load plans.',
      },
      { status: 500 }
    )
  }
}
