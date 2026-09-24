import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { processPosWork } from '@/lib/pos/worker'

export async function POST(request: Request) {
  const secret = process.env.CAFFI_POS_WORKER_SECRET
  const supplied = request.headers.get('authorization') ?? ''
  const expected = 'Bearer ' + secret
  if (!secret || secret.length < 32 || supplied.length !== expected.length
      || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)))
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    return NextResponse.json(await processPosWork(), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'POS worker unavailable' }, { status: 503 })
  }
}
