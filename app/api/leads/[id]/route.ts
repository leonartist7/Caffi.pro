import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAroAdmin } from '@/lib/authz'

/**
 * PATCH /api/leads/[id] — HQ status workflow (aro_admin only).
 * Status vocabulary comes from the schema CHECK: new | contacted |
 * qualified | won | lost.
 */
const VALID = ['new', 'contacted', 'qualified', 'won', 'lost'] as const

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAroAdmin()
  if (!gate.ok) return gate.response

  let body: { status?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.status || !VALID.includes(body.status as (typeof VALID)[number])) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID.join(', ')}` },
      { status: 400 }
    )
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('leads')
    .update({ status: body.status })
    .eq('lead_id', params.id)
    .select('lead_id, status')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }
  return NextResponse.json(data)
}
