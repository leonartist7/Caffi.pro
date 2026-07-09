import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { emitEvent } from '@/lib/events'

export const dynamic = 'force-dynamic'

/**
 * Dev-only: fire a test event at Sentry to prove the DSN works
 * (Phase 2 exit criterion: "Sentry receiving a test event").
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!process.env.SENTRY_DSN) {
    return NextResponse.json({
      status: 'STUBBED — needs SENTRY_DSN',
      hint: 'Set SENTRY_DSN (and NEXT_PUBLIC_SENTRY_DSN) in .env.local, restart, and call this route again.',
    })
  }

  const eventId = Sentry.captureMessage('aro sentry test event', 'info')
  await Sentry.flush(3000)
  void emitEvent({ type: 'sentry.test', payload: { eventId } })

  return NextResponse.json({
    status: 'Test event sent',
    eventId,
    check: 'Look for "aro sentry test event" in your Sentry project.',
  })
}
