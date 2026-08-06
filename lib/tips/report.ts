import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  buildCountedShifts,
  computeAllocation,
  findOverlappingShifts,
  type RawShift,
  type TipBasis,
} from '@/lib/tips/allocate'

/**
 * Data-fetching + orchestration for PLAN-36. `lib/tips/allocate.ts` stays
 * pure (no Supabase); this module gets the raw inputs and hands them to
 * it. Design: docs/plans/PLAN-36-tip-allocation.md.
 */

/** Order statuses whose tip is real, settled money the venue kept. */
const POOL_ELIGIBLE_STATUSES = new Set([
  'paid',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
  'completed',
])

export interface TipReportInput {
  venueId: string
  periodStart: Date
  periodEnd: Date
  basis: TipBasis
  /** No default — the caller must have gotten an explicit owner choice. */
  includeOwnerManager: boolean
  manualWeights?: Map<string, number>
}

export interface TipReportRow {
  shiftId: string
  membershipId: string
  fullName: string | null
  role: string
  startedAt: string
  endedAt: string
  countedMinutes: number
  tipCents: number
}

export interface ShiftWarning {
  shiftId: string
  membershipId: string
  fullName: string | null
  startedAt: string
}

export interface RosterMember {
  membershipId: string
  fullName: string | null
  role: string
  countedMinutes: number
}

export type TipReportResult =
  | {
      ok: true
      poolCents: number
      excludedCanceledCents: number
      excludedCanceledCount: number
      excludedRefundedCents: number
      excludedRefundedCount: number
      rows: TipReportRow[]
      openShiftWarnings: ShiftWarning[]
      overlapWarnings: ShiftWarning[]
      periodOngoing: boolean
      computedAt: string
    }
  | { ok: false; reason: 'NO_MEASURABLE_HOURS' | 'NO_MANUAL_WEIGHTS' | 'NO_SHIFTS_IN_PERIOD' }
  /** manual basis, no weights supplied yet — the UI needs the roster to render weight inputs. Not a refusal; nothing was computed. */
  | { ok: false; reason: 'ROSTER_NEEDED'; roster: RosterMember[] }

interface RawShiftRow {
  shift_id: string
  membership_id: string
  started_at: string
  ended_at: string | null
  memberships:
    | { full_name: string | null; role: string }
    | { full_name: string | null; role: string }[]
    | null
}

export async function runTipReport(input: TipReportInput): Promise<TipReportResult> {
  const admin = getSupabaseAdmin()

  // Paginated rather than a single .select(): PostgREST caps rows per
  // request (this project's max_rows = 1000), so a period with more
  // matching orders than that would otherwise silently undercount the
  // pool — a page short of PAGE_SIZE is the only reliable "no more rows"
  // signal, since the last page can coincidentally be exactly full.
  const PAGE_SIZE = 1000
  const orderRows: { tip_cents: number | null; status: string }[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page, error: orderError } = await admin
      .from('orders')
      .select('tip_cents, status')
      .eq('venue_id', input.venueId)
      .gte('placed_at', input.periodStart.toISOString())
      .lt('placed_at', input.periodEnd.toISOString())
      .order('placed_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (orderError) throw new Error(`runTipReport: orders query failed: ${orderError.message}`)
    orderRows.push(...(page ?? []))
    if (!page || page.length < PAGE_SIZE) break
  }

  let poolCents = 0
  let excludedCanceledCents = 0
  let excludedCanceledCount = 0
  let excludedRefundedCents = 0
  let excludedRefundedCount = 0
  for (const o of orderRows ?? []) {
    const tip = o.tip_cents ?? 0
    if (POOL_ELIGIBLE_STATUSES.has(o.status)) {
      poolCents += tip
    } else if (o.status === 'canceled') {
      excludedCanceledCents += tip
      excludedCanceledCount++
    } else if (o.status === 'refunded') {
      excludedRefundedCents += tip
      excludedRefundedCount++
    }
    // 'pending' is neither pooled nor tracked as excluded — it isn't real money yet.
  }

  // Same pagination reasoning as the orders query above.
  const shiftRows: RawShiftRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page, error: shiftError } = await admin
      .from('staff_shifts')
      .select('shift_id, membership_id, started_at, ended_at, memberships(full_name, role)')
      .eq('venue_id', input.venueId)
      .lt('started_at', input.periodEnd.toISOString())
      .or(`ended_at.is.null,ended_at.gt.${input.periodStart.toISOString()}`)
      .order('started_at', { ascending: true })
      .order('shift_id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (shiftError) throw new Error(`runTipReport: shifts query failed: ${shiftError.message}`)
    shiftRows.push(...((page ?? []) as unknown as RawShiftRow[]))
    if (!page || page.length < PAGE_SIZE) break
  }

  const raw: RawShift[] = shiftRows.map(r => {
    const rel = Array.isArray(r.memberships) ? r.memberships[0] : r.memberships
    return {
      shiftId: r.shift_id,
      membershipId: r.membership_id,
      fullName: rel?.full_name ?? null,
      role: rel?.role ?? 'staff',
      startedAt: r.started_at,
      endedAt: r.ended_at,
    }
  })

  const { counted: allCounted, excludedOpen: allExcludedOpen } = buildCountedShifts(
    raw,
    input.periodStart,
    input.periodEnd
  )

  const isSupervisor = (role: string) => role === 'owner' || role === 'manager'
  const counted = input.includeOwnerManager
    ? allCounted
    : allCounted.filter(s => !isSupervisor(s.role))
  const excludedOpen = input.includeOwnerManager
    ? allExcludedOpen
    : allExcludedOpen.filter(s => !isSupervisor(s.role))

  const overlaps = findOverlappingShifts(counted)

  if (input.basis === 'manual' && !input.manualWeights) {
    const byMembership = new Map<
      string,
      { fullName: string | null; role: string; countedMs: number }
    >()
    for (const s of counted) {
      const existing = byMembership.get(s.membershipId)
      if (existing) {
        existing.countedMs += s.countedMs
      } else {
        byMembership.set(s.membershipId, {
          fullName: s.fullName,
          role: s.role,
          countedMs: s.countedMs,
        })
      }
    }
    const roster: RosterMember[] = [...byMembership.entries()].map(([membershipId, m]) => ({
      membershipId,
      fullName: m.fullName,
      role: m.role,
      countedMinutes: Math.floor(m.countedMs / 60000),
    }))
    return { ok: false, reason: 'ROSTER_NEEDED', roster }
  }

  const allocationResult = computeAllocation(input.basis, poolCents, counted, input.manualWeights)
  if (!allocationResult.ok) return allocationResult

  const byShiftId = new Map(counted.map(s => [s.shiftId, s]))
  const rows: TipReportRow[] = allocationResult.rows.map(r => {
    const shift = byShiftId.get(r.shiftId)
    if (!shift) throw new Error(`runTipReport: allocation referenced unknown shift ${r.shiftId}`)
    return {
      shiftId: r.shiftId,
      membershipId: r.membershipId,
      fullName: shift.fullName,
      role: shift.role,
      startedAt: shift.startedAt,
      endedAt: shift.endedAt,
      countedMinutes: Math.floor(shift.countedMs / 60000),
      tipCents: r.tipCents,
    }
  })

  return {
    ok: true,
    poolCents,
    excludedCanceledCents,
    excludedCanceledCount,
    excludedRefundedCents,
    excludedRefundedCount,
    rows,
    openShiftWarnings: excludedOpen.map(s => ({
      shiftId: s.shiftId,
      membershipId: s.membershipId,
      fullName: s.fullName,
      startedAt: s.startedAt,
    })),
    overlapWarnings: overlaps.map(s => ({
      shiftId: s.shiftId,
      membershipId: s.membershipId,
      fullName: s.fullName,
      startedAt: s.startedAt,
    })),
    periodOngoing: input.periodEnd.getTime() > Date.now(),
    computedAt: new Date().toISOString(),
  }
}

/** Saves an already-computed report via the atomic delete+insert RPC. Refuses if any open-shift warning would block a historical period. */
export async function saveTipReport(
  input: TipReportInput,
  result: Extract<TipReportResult, { ok: true }>
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!result.periodOngoing && result.openShiftWarnings.length > 0) {
    return {
      ok: false,
      error:
        'Cannot save a historical period with unclosed open shifts — close or correct them first.',
    }
  }

  const admin = getSupabaseAdmin()
  const payload = result.rows.map(r => ({
    shift_id: r.shiftId,
    membership_id: r.membershipId,
    tip_cents: r.tipCents,
    basis: input.basis,
  }))

  const { error } = await admin.rpc('save_tip_allocation', {
    p_venue_id: input.venueId,
    p_period_start: input.periodStart.toISOString(),
    p_period_end: input.periodEnd.toISOString(),
    p_rows: payload,
  })
  if (error) {
    console.error('[tips/report] save_tip_allocation RPC failed:', error.message)
    return { ok: false, error: 'Could not save the allocation' }
  }
  return { ok: true }
}
