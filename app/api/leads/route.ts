import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAroAdmin } from '@/lib/authz'
import { emitEvent } from '@/lib/events'

/**
 * Leads webhook + HQ list (Plan 5).
 *
 * POST — server-to-server ONLY (AURA diagnostic → here). Auth is the
 * x-aro-leads-secret header compared with timingSafeEqual against
 * LEADS_WEBHOOK_SECRET (same value in both repos' envs). Idempotent on
 * idempotency_key: replays return 200 {stored:false}, one row ever.
 *
 * GET — HQ lead inbox, aro_admin only.
 */

function secretOk(req: NextRequest): boolean {
  const expected = process.env.LEADS_WEBHOOK_SECRET
  const got = req.headers.get('x-aro-leads-secret')
  if (!expected || !got) return false
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

interface LeadPayload {
  source?: string
  contact?: { email?: string; phone?: string; name?: string }
  venue_name?: string
  city?: string
  score?: unknown
  answers?: Record<string, unknown>
  idempotency_key?: string
}

export async function POST(req: NextRequest) {
  if (!secretOk(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: LeadPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const source = body.source === 'demo_booking' ? 'demo' : 'diagnostic'
  const contact = body.contact ?? {}
  if (!contact.email && !contact.phone) {
    return NextResponse.json({ error: 'contact.email or contact.phone required' }, { status: 400 })
  }
  // Score can legitimately be 0 — typeof check, never truthiness.
  const score = typeof body.score === 'number' ? Math.round(body.score) : null
  const idempotencyKey = body.idempotency_key || crypto.randomUUID()

  const admin = getSupabaseAdmin()
  const { data: inserted, error } = await admin
    .from('leads')
    .upsert(
      {
        source,
        name: contact.name ?? null,
        email: contact.email ?? null,
        phone: contact.phone ?? null,
        venue_name: body.venue_name ?? null,
        city: body.city ?? null,
        score,
        answers: body.answers ?? {},
        idempotency_key: idempotencyKey,
        payload: body as unknown as Record<string, unknown>,
      },
      { onConflict: 'idempotency_key', ignoreDuplicates: true }
    )
    .select('lead_id')

  if (error) {
    console.error('[leads] insert failed:', error.message)
    return NextResponse.json({ error: 'Storage failed' }, { status: 500 })
  }

  const stored = (inserted?.length ?? 0) > 0
  if (stored) {
    void emitEvent({
      type: 'lead.received',
      actor: 'system',
      payload: { source, score, idempotency_key: idempotencyKey },
    })
  }
  return NextResponse.json({ stored })
}

export async function GET() {
  const gate = await requireAroAdmin()
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('leads')
    .select(
      'lead_id, source, name, email, phone, venue_name, city, score, answers, status, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[leads] list failed:', error.message)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }
  return NextResponse.json({ leads: data ?? [] })
}
