/**
 * PLAN-17 — pure mystery-reward primitives. Zero Supabase imports, zero
 * randomness of its own: `drawPrize` takes an already-generated random
 * value as a parameter rather than calling `Math.random()` internally,
 * so the actual draw is reproducible in a test and the only place a real
 * random number is generated is the one server-side call site
 * (`lib/loyalty/mystery-issue.ts`) — never the client, never twice for
 * the same prize.
 */

export interface MysteryPrize {
  id: string
  label: string
  weight: number
  pointsValue?: number | null
  valueCents?: number | null
}

const MIN_PRIZES = 1
const MAX_PRIZES = 12

/** A program's `config.prizes` is well-formed: 1–12 prizes, each with a
 * unique id, non-empty label, a positive integer weight, and exactly one
 * reward field set (points XOR dollars — a prize is one or the other,
 * same as every other offer type in this engine, never both). */
export function isValidMysteryConfig(prizes: unknown): prizes is MysteryPrize[] {
  if (!Array.isArray(prizes) || prizes.length < MIN_PRIZES || prizes.length > MAX_PRIZES) {
    return false
  }
  const ids = new Set<string>()
  for (const p of prizes) {
    if (typeof p !== 'object' || p === null) return false
    const prize = p as Partial<MysteryPrize>
    if (typeof prize.id !== 'string' || !prize.id.trim()) return false
    if (ids.has(prize.id)) return false
    ids.add(prize.id)
    if (typeof prize.label !== 'string' || !prize.label.trim()) return false
    if (!Number.isInteger(prize.weight) || (prize.weight as number) <= 0) return false
    const hasPoints = typeof prize.pointsValue === 'number' && prize.pointsValue > 0
    const hasValue = typeof prize.valueCents === 'number' && prize.valueCents > 0
    if (hasPoints === hasValue) return false // exactly one, never both, never neither
  }
  return true
}

/** Cumulative-weight selection over `[0, 1)`. The client never draws —
 * this function's only real caller is server-side, once, at issue time;
 * the reveal animation later just displays what this already decided. */
export function drawPrize(prizes: MysteryPrize[], randomValue: number): MysteryPrize {
  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0)
  let cursor = randomValue * totalWeight
  for (const prize of prizes) {
    cursor -= prize.weight
    if (cursor < 0) return prize
  }
  // Floating-point edge (randomValue arbitrarily close to 1): the last
  // prize in the list is the only remaining valid answer.
  return prizes[prizes.length - 1]
}

/** What the owner sees on the config screen: the weighted-average payout
 * per reveal, in cents — a café owner who can't see this misprices the
 * whole mechanic. Points-only prizes contribute 0 to the dollar figure
 * (points aren't cash); a program mixing points and dollar prizes gets a
 * partial, honestly-labelled number, not a false single total. */
export function expectedCostCentsPerReveal(prizes: MysteryPrize[]): number {
  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0)
  if (totalWeight === 0) return 0
  const weightedCents = prizes.reduce(
    (sum, p) => sum + (p.valueCents ?? 0) * (p.weight / totalWeight),
    0
  )
  return Math.round(weightedCents)
}

/** Same idea for the points side, kept separate rather than mixed into a
 * fake blended currency figure. */
export function expectedPointsPerReveal(prizes: MysteryPrize[]): number {
  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0)
  if (totalWeight === 0) return 0
  const weightedPoints = prizes.reduce(
    (sum, p) => sum + (p.pointsValue ?? 0) * (p.weight / totalWeight),
    0
  )
  return Math.round(weightedPoints * 100) / 100
}
