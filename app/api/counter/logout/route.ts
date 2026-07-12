import { NextResponse } from 'next/server'
import { COUNTER_COOKIE } from '@/lib/counter-session'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COUNTER_COOKIE, '', { maxAge: 0, path: '/' })
  return response
}
