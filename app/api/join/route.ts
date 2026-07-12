import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { emitEvent } from '@/lib/events'
import { CONSENT_TEXT } from '@/lib/consent'

/**
 * POST /api/join — the diner join flow (Plan 2).
 *
 * PUBLIC route (no session): the diner scanned a QR at the counter.
 * All DB access via the service-role client — anon has no table grants
 * for this flow; the browser never talks to Supabase directly.
 *
 * Rules (PLAN-diner-join-page):
 * - ONE contact field, classified email vs phone; phone normalized to
 *   E.164 (+1 default, Canada); <10 digits rejected.
 * - Idempotent: existing (venue, contact) member → 200 with the SAME
 *   serial, no duplicate, no error surfaced to the diner.
 * - Consent is NOT required to join (CASL gates marketing, not
 *   membership). consent=true records ts/source/text; re-join with the
 *   box unchecked NEVER nulls out previously granted consent.
 * - Rate limit: >20 join attempts per IP hash per 10 min → 429
 *   (counted via the events table — serverless memory is useless).
 */

const EMAIL_RE = /^\S+@\S+\.\S+$/

function classifyContact(raw: string): { email?: string; phone?: string } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (EMAIL_RE.test(trimmed)) return { email: trimmed.toLowerCase() }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 10) return null
  // Normalize to E.164 with +1 default (Canada)
  if (digits.length === 10) return { phone: `+1${digits}` }
  if (digits.length === 11 && digits.startsWith('1')) return { phone: `+${digits}` }
  return { phone: `+${digits}` }
}

function ipHash(req: NextRequest): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export async function POST(req: NextRequest) {
  let body: {
    venue_slug?: string
    contact?: string
    name?: string
    consent?: boolean
  }

  // Support both JSON (hydrated client) and form POST (no-JS fallback)
  const contentType = req.headers.get('content-type') ?? ''
  try {
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      const form = await req.formData()
      body = {
        venue_slug: form.get('venue_slug')?.toString(),
        contact: form.get('contact')?.toString(),
        name: form.get('name')?.toString() || undefined,
        consent: form.get('consent') === 'on' || form.get('consent') === 'true',
      }
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const isFormPost = !contentType.includes('application/json')

  const venueSlug = body.venue_slug?.trim().toLowerCase().replace(/\/+$/, '')
  if (!venueSlug) {
    return NextResponse.json({ error: 'Missing venue' }, { status: 400 })
  }

  const contact = body.contact ? classifyContact(body.contact) : null
  if (!contact) {
    if (isFormPost) {
      // No-JS path: bounce back to the join page with an error flag
      return NextResponse.redirect(new URL(`/join/${venueSlug}?error=contact`, req.url), 303)
    }
    return NextResponse.json({ error: 'Enter a valid phone number or email' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Rate limit: count join attempts from this IP hash in the last 10 min
  const hash = ipHash(req)
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('events')
    .select('event_id', { count: 'exact', head: true })
    .eq('type', 'member.joined')
    .gte('ts', tenMinAgo)
    .eq('payload->>ip_hash', hash)
  if ((count ?? 0) > 20) {
    return NextResponse.json({ error: 'Too many attempts — try again soon' }, { status: 429 })
  }

  // Venue lookup by slug
  const { data: venue } = await admin
    .from('venues')
    .select('venue_id, business_name, kill_switch')
    .eq('slug', venueSlug)
    .single()
  if (!venue || venue.kill_switch) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
  }

  // Idempotent upsert on (venue, normalized contact)
  const matchCol = contact.email ? 'email' : 'phone'
  const matchVal = contact.email ?? contact.phone!
  const { data: existing } = await admin
    .from('members')
    .select('member_id, pass_serial, consent_ts')
    .eq('tenant_id', venue.venue_id)
    .eq(matchCol, matchVal)
    .maybeSingle()

  let serial: string
  let memberId: string
  let isNew = false

  if (existing) {
    serial = existing.pass_serial
    memberId = existing.member_id
    // Upgrade-only consent: null→granted, never downgrade
    if (body.consent === true && !existing.consent_ts) {
      await admin
        .from('members')
        .update({
          consent_ts: new Date().toISOString(),
          consent_text: CONSENT_TEXT,
          consent_source: 'join_page',
        })
        .eq('member_id', memberId)
    }
  } else {
    const insert: Record<string, unknown> = {
      tenant_id: venue.venue_id,
      full_name: body.name?.trim() || null,
      [matchCol]: matchVal,
    }
    if (body.consent === true) {
      insert.consent_ts = new Date().toISOString()
      insert.consent_text = CONSENT_TEXT
      insert.consent_source = 'join_page'
    }
    const { data: created, error } = await admin
      .from('members')
      .insert(insert)
      .select('member_id, pass_serial')
      .single()
    if (error || !created) {
      // Unique-violation race (two devices, same phone, same instant):
      // re-read instead of failing the diner.
      const { data: raced } = await admin
        .from('members')
        .select('member_id, pass_serial')
        .eq('tenant_id', venue.venue_id)
        .eq(matchCol, matchVal)
        .maybeSingle()
      if (!raced) {
        console.error('[join] insert failed:', error?.message)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
      }
      serial = raced.pass_serial
      memberId = raced.member_id
      isNew = false
      void emitEvent({
        type: 'member.joined',
        actor: `member:${memberId}`,
        venueId: venue.venue_id,
        payload: { source: 'join_page', deduped: true, ip_hash: hash },
      })
      if (isFormPost) {
        return NextResponse.redirect(new URL(`/pass/${serial}`, req.url), 303)
      }
      return NextResponse.json({ serial, existing: true })
    }
    serial = created.pass_serial
    memberId = created.member_id
    isNew = true
  }

  void emitEvent({
    type: 'member.joined',
    actor: `member:${memberId}`,
    venueId: venue.venue_id,
    payload: { source: 'join_page', new_member: isNew, ip_hash: hash },
  })

  if (isFormPost) {
    return NextResponse.redirect(new URL(`/pass/${serial}`, req.url), 303)
  }
  return NextResponse.json({ serial, existing: !isNew })
}
