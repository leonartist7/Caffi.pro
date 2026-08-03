import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { runTipReport, saveTipReport, type TipReportInput } from '@/lib/tips/report'
import type { TipBasis } from '@/lib/tips/allocate'

/**
 * PLAN-36 tip allocation report. Owner-only (v2R: manager and staff denied,
 * tested) — `requireVenueRole(venueId, ['owner'])`, `aro_admin` still
 * passes per that helper's own rule.
 *
 * GET computes a preview, never persists. POST recomputes server-side
 * (never trusts client-sent amounts) and persists via the atomic
 * save_tip_allocation RPC.
 *
 * `include_owner_manager` has no default anywhere in this route — a
 * missing value is a 400, not a silently-chosen policy. See
 * docs/plans/PLAN-36-tip-allocation.md's ESCALATE TO HUMAN section.
 */

function parseBasis(value: string | null): TipBasis | null {
  if (value === 'hours' || value === 'equal' || value === 'manual') return value
  return null
}

function parseIncludeOwnerManager(value: string | null): boolean | null {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

function parsePeriod(
  startParam: string | null,
  endParam: string | null
): { start: Date; end: Date } | null {
  if (!startParam || !endParam) return null
  const start = new Date(startParam)
  const end = new Date(endParam)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null
  return { start, end }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const authz = await requireVenueRole(params.get('venue_id'), ['owner'])
  if (!authz.ok) return authz.response

  const basis = parseBasis(params.get('basis'))
  if (!basis) {
    return NextResponse.json(
      { error: 'basis must be one of hours, equal, manual' },
      { status: 400 }
    )
  }

  const includeOwnerManager = parseIncludeOwnerManager(params.get('include_owner_manager'))
  if (includeOwnerManager === null) {
    return NextResponse.json(
      { error: 'include_owner_manager (true|false) is required — there is no default' },
      { status: 400 }
    )
  }

  const period = parsePeriod(params.get('period_start'), params.get('period_end'))
  if (!period) {
    return NextResponse.json(
      { error: 'Valid period_start and period_end are required' },
      { status: 400 }
    )
  }

  // manual_weights is optional on GET (a preview call): omitting it for the
  // manual basis triggers runTipReport's ROSTER_NEEDED response so the UI
  // can render weight inputs for exactly the members with a counted shift.
  let manualWeights: Map<string, number> | undefined
  if (basis === 'manual') {
    const raw = params.get('manual_weights')
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, number>
        manualWeights = new Map(
          Object.entries(parsed).map(([id, w]) => {
            const weight = Number(w)
            if (!Number.isSafeInteger(weight) || weight < 0) {
              throw new Error(`weight for ${id} must be a non-negative integer`)
            }
            return [id, weight]
          })
        )
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Invalid manual_weights' },
          { status: 400 }
        )
      }
    }
  }

  const input: TipReportInput = {
    venueId: authz.ctx.venueId,
    periodStart: period.start,
    periodEnd: period.end,
    basis,
    includeOwnerManager,
    manualWeights,
  }

  try {
    const result = await runTipReport(input)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[tips/allocation] report failed:', err)
    return NextResponse.json({ error: 'Could not compute the report' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: {
    venue_id?: string
    basis?: string
    include_owner_manager?: boolean
    period_start?: string
    period_end?: string
    manual_weights?: Record<string, number>
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const authz = await requireVenueRole(body.venue_id, ['owner'])
  if (!authz.ok) return authz.response

  const basis = parseBasis(body.basis ?? null)
  if (!basis) {
    return NextResponse.json(
      { error: 'basis must be one of hours, equal, manual' },
      { status: 400 }
    )
  }
  if (typeof body.include_owner_manager !== 'boolean') {
    return NextResponse.json(
      { error: 'include_owner_manager (true|false) is required — there is no default' },
      { status: 400 }
    )
  }
  const period = parsePeriod(body.period_start ?? null, body.period_end ?? null)
  if (!period) {
    return NextResponse.json(
      { error: 'Valid period_start and period_end are required' },
      { status: 400 }
    )
  }

  let manualWeights: Map<string, number> | undefined
  if (basis === 'manual') {
    if (!body.manual_weights) {
      return NextResponse.json(
        { error: 'manual_weights is required for the manual basis' },
        { status: 400 }
      )
    }
    manualWeights = new Map(Object.entries(body.manual_weights).map(([id, w]) => [id, Number(w)]))
    for (const [id, w] of manualWeights) {
      if (!Number.isSafeInteger(w) || w < 0) {
        return NextResponse.json(
          { error: `weight for ${id} must be a non-negative integer` },
          { status: 400 }
        )
      }
    }
  }

  const input: TipReportInput = {
    venueId: authz.ctx.venueId,
    periodStart: period.start,
    periodEnd: period.end,
    basis,
    includeOwnerManager: body.include_owner_manager,
    manualWeights,
  }

  let result
  try {
    result = await runTipReport(input)
  } catch (err) {
    console.error('[tips/allocation] report failed:', err)
    return NextResponse.json({ error: 'Could not compute the report' }, { status: 500 })
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 422 })
  }

  const saved = await saveTipReport(input, result)
  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: 409 })
  }

  void emitEvent({
    type: 'tip_allocation.saved',
    actor: `user:${authz.ctx.user.id}`,
    venueId: authz.ctx.venueId,
    payload: {
      basis,
      period_start: period.start.toISOString(),
      period_end: period.end.toISOString(),
      pool_cents: result.poolCents,
      row_count: result.rows.length,
      include_owner_manager: body.include_owner_manager,
    },
  })

  return NextResponse.json(result)
}
