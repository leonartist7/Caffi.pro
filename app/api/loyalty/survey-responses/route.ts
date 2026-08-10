import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'

/**
 * GET /api/loyalty/survey-responses?venue_id=&program_id= — owner/manager
 * results view. Free-text answers are returned exactly as submitted —
 * never summarized, rewritten, or routed through any AI surface. Member
 * identity is intentionally not joined in here: a response is either
 * anonymous (`member_id IS NULL`) by the schema's own design, or belongs
 * to a member whose identity isn't this view's business — the point of a
 * survey result is the answer, not who gave it.
 */
export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venue_id')
  const authz = await requireVenueRole(venueId, ['owner', 'manager'])
  if (!authz.ok) return authz.response

  const programId = request.nextUrl.searchParams.get('program_id')
  if (!programId) {
    return NextResponse.json({ error: 'program_id is required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('survey_responses')
    .select('response_id, answers, created_at')
    .eq('venue_id', authz.ctx.venueId)
    .eq('program_id', programId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[loyalty/survey-responses] load failed:', error.message)
    return NextResponse.json({ error: 'Failed to load responses' }, { status: 500 })
  }

  return NextResponse.json({ responses: data ?? [] })
}
