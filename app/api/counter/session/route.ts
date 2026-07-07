import { NextRequest, NextResponse } from 'next/server'
import { verifyCounterToken, COUNTER_COOKIE } from '@/lib/counter-session'

/** Current counter session (if any). */
export async function GET(request: NextRequest) {
  const session = verifyCounterToken(request.cookies.get(COUNTER_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  return NextResponse.json({
    authenticated: true,
    venue_id: session.venueId,
    staff_name: session.staffName,
    device: session.device,
    expires_at: new Date(session.exp * 1000).toISOString(),
  })
}
