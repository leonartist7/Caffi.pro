import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { emitEvent } from '@/lib/events'
import { isValidCalendarDay } from '@/lib/loyalty/calendar'

/**
 * POST /api/pass/[serial]/birthday — PUBLIC by bearer serial, same trust
 * model as `/api/join` and the pass page itself: whoever holds the pass
 * link can set their own birthday. Executes v2 §N9 as written: one-shot
 * (month, day only — never a year, never asked, never stored), a second
 * write attempt 409s rather than silently overwriting, and calendar
 * validity is checked in a pure `lib/` function so a bad date can't reach
 * the database.
 */

function ipHash(req: NextRequest): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export async function POST(request: NextRequest, { params }: { params: { serial: string } }) {
  const admin = getSupabaseAdmin()

  // Rate limit, same events-table window pattern /api/join already uses —
  // serverless memory can't hold state between invocations.
  const hash = ipHash(request)
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('events')
    .select('event_id', { count: 'exact', head: true })
    .eq('type', 'member.birthday_set')
    .gte('ts', tenMinAgo)
    .eq('payload->>ip_hash', hash)
  if ((count ?? 0) > 20) {
    return NextResponse.json({ error: 'Too many attempts — try again soon' }, { status: 429 })
  }

  // Support both JSON (hydrated client) and form POST (no-JS pass page
  // fallback) — same dual mode /api/join already uses.
  const contentType = request.headers.get('content-type') ?? ''
  const isFormPost = !contentType.includes('application/json')
  let month: number
  let day: number
  try {
    if (isFormPost) {
      const form = await request.formData()
      month = Number(form.get('month'))
      day = Number(form.get('day'))
    } else {
      const body = (await request.json()) as { month?: number; day?: number }
      month = Number(body.month)
      day = Number(body.day)
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  function fail(error: string, status: number) {
    if (isFormPost) {
      return NextResponse.redirect(
        new URL(`/pass/${params.serial}?birthday_error=${encodeURIComponent(error)}`, request.url),
        303
      )
    }
    return NextResponse.json({ error }, { status })
  }

  if (!isValidCalendarDay(month, day)) {
    return fail('That date does not exist on the calendar', 400)
  }

  const { data: member } = await admin
    .from('members')
    .select('member_id, tenant_id, birthday_month, birthday_day')
    .eq('pass_serial', params.serial)
    .maybeSingle()
  if (!member) {
    return fail('Pass not found', 404)
  }

  if (member.birthday_month != null || member.birthday_day != null) {
    return fail('Birthday already set', 409)
  }

  // Guard the write itself against the already-set row, not just the read
  // above — two concurrent submits from the same link otherwise race.
  const { data: updated, error } = await admin
    .from('members')
    .update({ birthday_month: month, birthday_day: day })
    .eq('member_id', member.member_id)
    .is('birthday_month', null)
    .is('birthday_day', null)
    .select('member_id')
    .maybeSingle()

  if (error) {
    console.error('[pass/birthday] update failed:', error.message)
    return fail('Could not save your birthday', 500)
  }
  if (!updated) {
    // Lost the race — someone else's concurrent write already landed.
    return fail('Birthday already set', 409)
  }

  void emitEvent({
    type: 'member.birthday_set',
    actor: `member:${member.member_id}`,
    venueId: member.tenant_id,
    payload: { ip_hash: hash },
  })

  if (isFormPost) {
    return NextResponse.redirect(new URL(`/pass/${params.serial}?birthday_set=1`, request.url), 303)
  }
  return NextResponse.json({ ok: true })
}
