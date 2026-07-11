import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyCounterToken, COUNTER_COOKIE } from '@/lib/counter-session'

/**
 * GET /api/counter/search?q=... — member search for the counter screen.
 *
 * Privacy (Blueprint §8): staff never see raw phone/email. Results carry
 * a masked contact suffix only, for disambiguating two "Mayas" — never the
 * full value. This is why search runs server-side instead of a client
 * Supabase query with a column-level grant.
 *
 * Venue scope comes from the VERIFIED session cookie, never the query
 * string — a body/query-supplied venue would let one venue's staff device
 * search another venue's members by guessing IDs.
 */
export async function GET(request: NextRequest) {
  const session = verifyCounterToken(request.cookies.get(COUNTER_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const admin = getSupabaseAdmin()

  // Exact pass_serial match (QR scan / paste) — looks like a uuid.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)

  const digits = q.replace(/\D/g, '')
  const isPhoneSuffix = digits.length >= 4 && digits.length === q.replace(/[\s()-]/g, '').length

  let query = admin
    .from('members')
    .select('member_id, full_name, phone, email, pass_serial')
    .eq('tenant_id', session.venueId)
    .limit(8)

  if (isUuid) {
    query = query.eq('pass_serial', q.toLowerCase())
  } else if (isPhoneSuffix) {
    query = query.like('phone', `%${digits}`)
  } else {
    query = query.ilike('full_name', `${q}%`)
  }

  const { data: members, error } = await query
  if (error) {
    console.error('[counter/search] query failed:', error.message)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }

  const memberIds = (members ?? []).map(m => m.member_id)
  const { data: balances } = memberIds.length
    ? await admin.from('member_balances').select('member_id, balance').in('member_id', memberIds)
    : { data: [] }
  const balanceByMember = new Map((balances ?? []).map(b => [b.member_id, b.balance]))

  const results = (members ?? []).map(m => {
    const phoneSuffix = m.phone ? m.phone.slice(-4) : null
    return {
      id: m.member_id,
      first_name: m.full_name?.split(' ')[0] ?? 'Member',
      points: balanceByMember.get(m.member_id) ?? 0,
      masked_contact: phoneSuffix ? `…${phoneSuffix}` : m.email ? `…${m.email.slice(-4)}` : null,
    }
  })

  return NextResponse.json({ results })
}
