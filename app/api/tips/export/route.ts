import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { emitEvent } from '@/lib/events'
import { getVenueTimezone, localDateTimeStringToUtc } from '@/lib/owner-stats'
import { runTipReport, type TipReportInput } from '@/lib/tips/report'
import type { TipBasis } from '@/lib/tips/allocate'
import { buildCsv, csvRow, centsToDecimalString, minutesToHoursDecimalString } from '@/lib/csv'

/**
 * PLAN-37 hours + tips CSV export. Owner-only, same gate as PLAN-36's
 * report route — this reuses `runTipReport()` directly rather than
 * re-querying or re-deriving anything, so its values match that report
 * exactly, row for row, by construction.
 *
 * A server route rather than client-side CSV generation: (a) owner-only
 * authorization is enforced here rather than by hiding a button, and
 * (b) `report.exported` is a real audit trail of compensation data
 * leaving the system, emitted server-side where it can't be skipped.
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
 * no timezone attached, interpreted in the venue's own configured
 * timezone — never this server's or the caller's browser's. See the same
 * fix on `/api/tips/allocation`.
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

/** ISO instant -> a filename-safe UTC date stamp, e.g. "2026-08-02". */
function dateStamp(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const venueId = params.get('venue_id')
  const authz = await requireVenueRole(venueId, ['owner'])
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

  let manualWeights: Map<string, number> | undefined
  if (basis === 'manual') {
    const raw = params.get('manual_weights')
    if (!raw) {
      return NextResponse.json(
        { error: 'manual_weights is required for the manual basis' },
        { status: 400 }
      )
    }
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

  const input: TipReportInput = {
    venueId: authz.ctx.venueId,
    periodStart: period.start,
    periodEnd: period.end,
    basis,
    includeOwnerManager,
    manualWeights,
  }

  let result
  try {
    result = await runTipReport(input)
  } catch (err) {
    console.error('[tips/export] report failed:', err)
    return NextResponse.json({ error: 'Could not compute the report' }, { status: 500 })
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 422 })
  }

  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('slug')
    .eq('venue_id', authz.ctx.venueId)
    .maybeSingle()
  const slug = (venue as { slug?: string } | null)?.slug ?? authz.ctx.venueId

  const header = [
    'staff_name',
    'role',
    'shift_id',
    'shift_start',
    'shift_end',
    'hours',
    'tip_amount',
    'basis',
    'owner_manager_shifts',
  ]
  const ownerManagerLabel = includeOwnerManager ? 'included' : 'excluded'
  const rows = result.rows.map(r => [
    r.fullName ?? r.membershipId,
    r.role,
    r.shiftId,
    r.startedAt,
    r.endedAt,
    minutesToHoursDecimalString(r.countedMinutes),
    centsToDecimalString(r.tipCents),
    basis,
    ownerManagerLabel,
  ])

  const notice =
    `This is a calculation aid, not a payroll record. Pool: ${centsToDecimalString(result.poolCents)}. ` +
    `Period: ${period.start.toISOString()} to ${period.end.toISOString()}. ` +
    `Owner/manager shifts: ${ownerManagerLabel}.`

  const csv = buildCsv(header, rows) + '\r\n' + csvRow([notice]) + '\r\n'

  void emitEvent({
    type: 'report.exported',
    actor: `user:${authz.ctx.user.id}`,
    venueId: authz.ctx.venueId,
    payload: {
      report: 'tip_allocation_csv',
      basis,
      period_start: period.start.toISOString(),
      period_end: period.end.toISOString(),
      include_owner_manager: includeOwnerManager,
      row_count: result.rows.length,
    },
  })

  const filename = `${slug}-tips-${dateStamp(period.start)}-${dateStamp(period.end)}.csv`
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
