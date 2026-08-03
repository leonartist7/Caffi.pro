import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getVenueTimezone, localDateTimeStringToUtc } from '@/lib/owner-stats'
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

/**
 * `period_start`/`period_end` are `datetime-local` wall-clock strings with
 * no timezone attached — interpreted in the venue's own configured
 * timezone (never the caller's browser or this server process's
 * timezone), so a period boundary means the same real instant regardless
 * of who's typing it in or where they are.
 */
async function parsePeriod(
  startParam: string | null,
  endParam: string | null,
  venueId: string
): Promise<{ start: Date; end: Date } | null> {
  if (!startParam || !endParam) return null
  const timezone = await getVenueTimezone(venueId)
  const start = localDateTimeStringToUtc(startParam, timezone)
  const end = localDateTimeStringToUtc(endParam, timezone)
  if (!start || !end || end < start) return null
  return { start, end }
}

/** Shared by GET and POST so a value one path accepts can never be a value the other rejects. */
function parseManualWeights(
  entries: Record<string, unknown>
): { ok: true; weights: Map<string, number> } | { ok: false; error: string } {
  const weights = new Map<string, number>()
  for (const [id, w] of Object.entries(entries)) {
    const weight = Number(w)
    if (!Number.isSafeInteger(weight) || weight < 0) {
      return { ok: false, error: `weight for ${id} must be a non-negative integer` }
    }
    weights.set(id, weight)
  }
  return { ok: true, weights }
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

  const period = await parsePeriod(
    params.get('period_start'),
    params.get('period_end'),
    authz.ctx.venueId
  )
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
      let parsed: Record<string, number>
      try {
        parsed = JSON.parse(raw) as Record<string, number>
      } catch {
        return NextResponse.json({ error: 'Invalid manual_weights' }, { status: 400 })
      }
      const validated = parseManualWeights(parsed)
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 })
      }
      manualWeights = validated.weights
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
  const period = await parsePeriod(
    body.period_start ?? null,
    body.period_end ?? null,
    authz.ctx.venueId
  )
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
    const validated = parseManualWeights(body.manual_weights)
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }
    manualWeights = validated.weights
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

  let saved
  try {
    saved = await saveTipReport(input, result)
  } catch (err) {
    console.error('[tips/allocation] save failed:', err)
    return NextResponse.json({ error: 'Could not save the allocation' }, { status: 500 })
  }
  if (!saved.ok) {
    // saved.error is saveTipReport's own validation message (the open-shift
    // block), never a raw RPC/Postgres error — safe to show as-is.
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
