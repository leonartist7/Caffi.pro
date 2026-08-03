/**
 * Pure tip-allocation core (PLAN-36). Zero Supabase imports, zero floats —
 * every multiply/divide/modulo on money or a weight goes through BigInt.
 * Design: docs/plans/PLAN-36-tip-allocation.md.
 */

export interface Unit {
  id: string
  weight: number
}

/**
 * Largest-remainder (Hamilton) apportionment. Splits `poolCents` across
 * `units` proportional to weight, integer-exact: a zero-weight unit
 * always gets exactly 0, and no unit ever receives more than one extra
 * cent over its exact share. The result sums to exactly `poolCents`
 * whenever at least one unit has nonzero weight; if every unit's weight
 * is 0, there is no weight basis to apportion the pool by, so every
 * unit gets exactly 0 and the result does not sum to `poolCents` — this
 * case is the caller's responsibility to guard against (as
 * `computeAllocation` does at both levels) rather than something this
 * primitive can resolve on its own.
 * Tie-break for the remainder cents: remainder desc, then weight desc,
 * then id asc (plain string compare) — a fully deterministic ordering
 * carrying no correlation to any attribute of the unit itself.
 */
export function allocate(poolCents: number, units: Unit[]): Map<string, number> {
  if (!Number.isSafeInteger(poolCents) || poolCents < 0) {
    throw new Error('allocate: poolCents must be a non-negative safe integer')
  }
  const seen = new Set<string>()
  for (const u of units) {
    if (!Number.isSafeInteger(u.weight) || u.weight < 0) {
      throw new Error(`allocate: weight for unit ${u.id} must be a non-negative safe integer`)
    }
    if (seen.has(u.id)) throw new Error(`allocate: duplicate unit id ${u.id}`)
    seen.add(u.id)
  }

  const result = new Map<string, number>()
  if (units.length === 0) return result

  const totalWeight = units.reduce((sum, u) => sum + u.weight, 0)
  if (poolCents === 0 || totalWeight === 0) {
    for (const u of units) result.set(u.id, 0)
    return result
  }

  const pool = BigInt(poolCents)
  const total = BigInt(totalWeight)
  const bases = new Map<string, number>()
  const remainders = new Map<string, bigint>()
  let baseSum = 0
  for (const u of units) {
    const product = pool * BigInt(u.weight)
    const base = Number(product / total)
    bases.set(u.id, base)
    remainders.set(u.id, product % total)
    baseSum += base
  }

  const extraCents = poolCents - baseSum

  const order = [...units].sort((a, b) => {
    const remA = remainders.get(a.id) as bigint
    const remB = remainders.get(b.id) as bigint
    if (remA !== remB) return remA > remB ? -1 : 1
    if (a.weight !== b.weight) return b.weight - a.weight
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })

  for (const u of units) result.set(u.id, bases.get(u.id) as number)
  for (let i = 0; i < extraCents; i++) {
    const id = order[i].id
    result.set(id, (result.get(id) as number) + 1)
  }

  let sum = 0
  for (const v of result.values()) sum += v
  if (sum !== poolCents) {
    throw new Error('allocate: internal invariant violated — result does not sum to poolCents')
  }

  return result
}

export interface RawShift {
  shiftId: string
  membershipId: string
  fullName: string | null
  role: string
  startedAt: string
  endedAt: string | null
}

export interface CountedShift {
  shiftId: string
  membershipId: string
  fullName: string | null
  role: string
  startedAt: string
  endedAt: string
  /** Clipped to the reporting period — never the shift's full raw duration. */
  countedMs: number
}

/**
 * Splits raw shifts overlapping [periodStart, periodEnd) into the counted
 * set (closed shifts, duration clipped to the period) and the open shifts
 * that overlap but can't be measured — the caller must surface those as a
 * blocking warning for a historical period, never silently drop them.
 */
export function buildCountedShifts(
  raw: RawShift[],
  periodStart: Date,
  periodEnd: Date
): { counted: CountedShift[]; excludedOpen: RawShift[] } {
  const counted: CountedShift[] = []
  const excludedOpen: RawShift[] = []
  const startMs = periodStart.getTime()
  const endMs = periodEnd.getTime()

  for (const s of raw) {
    if (!s.endedAt) {
      excludedOpen.push(s)
      continue
    }
    const started = new Date(s.startedAt).getTime()
    const ended = new Date(s.endedAt).getTime()
    const clippedStart = Math.max(started, startMs)
    const clippedEnd = Math.min(ended, endMs)
    const countedMs = Math.max(0, clippedEnd - clippedStart)
    counted.push({
      shiftId: s.shiftId,
      membershipId: s.membershipId,
      fullName: s.fullName,
      role: s.role,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      countedMs,
    })
  }

  return { counted, excludedOpen }
}

/** Two closed shifts for the same membership whose counted windows overlap — a manual-entry error, never auto-merged. */
export function findOverlappingShifts(counted: CountedShift[]): CountedShift[] {
  const byMembership = new Map<string, CountedShift[]>()
  for (const s of counted) {
    const list = byMembership.get(s.membershipId) ?? []
    list.push(s)
    byMembership.set(s.membershipId, list)
  }

  const overlapping: CountedShift[] = []
  for (const shifts of byMembership.values()) {
    const sorted = [...shifts].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    )
    // Compare each shift against every later one, not just its immediate successor:
    // a long shift can fully contain two shorter, mutually non-overlapping later
    // shifts, so an adjacent-pair-only check misses the second containment.
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i]
      const aEnd = new Date(a.endedAt).getTime()
      for (let j = i + 1; j < sorted.length; j++) {
        const b = sorted[j]
        if (new Date(b.startedAt).getTime() >= aEnd) break // sorted by start: no later j can overlap a either
        if (!overlapping.includes(a)) overlapping.push(a)
        if (!overlapping.includes(b)) overlapping.push(b)
      }
    }
  }
  return overlapping
}

export type TipBasis = 'hours' | 'equal' | 'manual'

export interface AllocationRow {
  shiftId: string
  membershipId: string
  tipCents: number
}

export type AllocationResult =
  | { ok: true; rows: AllocationRow[] }
  | {
      ok: false
      reason: 'NO_MEASURABLE_HOURS' | 'NO_MANUAL_WEIGHTS' | 'NO_SHIFTS_IN_PERIOD'
    }

/**
 * Two-level allocation shared by all three bases: Level 1 splits the pool
 * across memberships by basis-specific weight; Level 2 splits each
 * membership's exact Level-1 total across their own counted shifts,
 * weighted by each shift's counted duration. Both levels use `allocate`,
 * so neither can lose or invent a cent.
 */
export function computeAllocation(
  basis: TipBasis,
  poolCents: number,
  shifts: CountedShift[],
  manualWeights?: Map<string, number>
): AllocationResult {
  if (shifts.length === 0) {
    if (poolCents === 0) return { ok: true, rows: [] }
    return { ok: false, reason: 'NO_SHIFTS_IN_PERIOD' }
  }

  const byMembership = new Map<string, CountedShift[]>()
  for (const s of shifts) {
    const list = byMembership.get(s.membershipId) ?? []
    list.push(s)
    byMembership.set(s.membershipId, list)
  }
  const membershipIds = [...byMembership.keys()]

  let level1Units: Unit[]
  if (basis === 'hours') {
    level1Units = membershipIds.map(id => ({
      id,
      weight: (byMembership.get(id) as CountedShift[]).reduce((sum, s) => sum + s.countedMs, 0),
    }))
    if (level1Units.reduce((sum, u) => sum + u.weight, 0) === 0) {
      return { ok: false, reason: 'NO_MEASURABLE_HOURS' }
    }
  } else if (basis === 'equal') {
    level1Units = membershipIds.map(id => ({ id, weight: 1 }))
  } else {
    const weights = manualWeights ?? new Map<string, number>()
    level1Units = membershipIds.map(id => ({ id, weight: weights.get(id) ?? 0 }))
    if (level1Units.reduce((sum, u) => sum + u.weight, 0) === 0) {
      return { ok: false, reason: 'NO_MANUAL_WEIGHTS' }
    }
  }

  const memberTotals = allocate(poolCents, level1Units)

  const rows: AllocationRow[] = []
  for (const membershipId of membershipIds) {
    const memberShifts = byMembership.get(membershipId) as CountedShift[]
    const memberTotal = memberTotals.get(membershipId) ?? 0
    let level2Units: Unit[] = memberShifts.map(s => ({ id: s.shiftId, weight: s.countedMs }))
    if (level2Units.reduce((sum, u) => sum + u.weight, 0) === 0) {
      level2Units = level2Units.map(u => ({ ...u, weight: 1 }))
    }
    const shiftAmounts = allocate(memberTotal, level2Units)
    for (const s of memberShifts) {
      rows.push({ shiftId: s.shiftId, membershipId, tipCents: shiftAmounts.get(s.shiftId) ?? 0 })
    }
  }

  const total = rows.reduce((sum, r) => sum + r.tipCents, 0)
  if (total !== poolCents) {
    throw new Error('computeAllocation: internal invariant violated — rows do not sum to poolCents')
  }

  return { ok: true, rows }
}
