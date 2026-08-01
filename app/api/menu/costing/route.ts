import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { CostingReport, CostingRow } from '@/lib/costing/types'

/**
 * All cost/margin arithmetic happens inside get_food_costing_report (SQL,
 * exact decimal NUMERIC math) — this route only sums already-integer
 * cents fields from 'complete' rows, which is safe plain addition, never
 * division/percentage math on money.
 */
export async function GET(request: NextRequest) {
  const gate = await requireVenueRole(request.nextUrl.searchParams.get('venue_id'), [
    'owner',
    'manager',
  ])
  if (!gate.ok) return gate.response

  const { data, error } = await getSupabaseAdmin().rpc('get_food_costing_report', {
    p_venue_id: gate.ctx.venueId,
  })
  if (error) {
    console.error('[menu/costing] report failed:', error)
    return NextResponse.json({ error: 'Failed to load costing report' }, { status: 500 })
  }

  const rows = (data ?? []) as CostingRow[]
  const completeRows = rows.filter(row => row.recipe_status === 'complete')
  const report: CostingReport = {
    rows,
    total_cost_cents: completeRows.reduce((sum, row) => sum + (row.cost_cents ?? 0), 0),
    total_margin_cents: completeRows.reduce((sum, row) => sum + (row.margin_cents ?? 0), 0),
  }
  return NextResponse.json(report)
}
