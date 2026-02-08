import { NextRequest, NextResponse } from 'next/server'
import { extractToken, getAccessToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const stored = await getAccessToken()
    if (!stored) {
      return NextResponse.json({ success: true })
    }

    const headerToken = extractToken(request)
    let bodyToken: string | null = null
    try {
      const body = await request.json()
      if (typeof body?.token === 'string') {
        bodyToken = body.token
      }
    } catch (error) {
      // ignore body parse errors
    }

    const token = headerToken || bodyToken
    if (!token || token !== stored) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to verify token' }, { status: 500 })
  }
}
