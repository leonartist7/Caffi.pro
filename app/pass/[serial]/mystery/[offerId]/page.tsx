import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { emitEvent } from '@/lib/events'
import { RevealAnimation } from './reveal-animation'

/**
 * Mystery reveal (PLAN-17) — PUBLIC by bearer serial. The prize was
 * already drawn and persisted at issue time
 * (`lib/loyalty/mystery-issue.ts`); this route's only job is marking
 * `revealed_at` on first visit and then displaying — on this visit and
 * every later reload — the exact same already-decided prize. The API
 * surface never returns prize information before this page is actually
 * requested: `/pass/[serial]`'s own listing (checked in that page's own
 * code) omits `prize_label`/values for any mystery offer with
 * `revealed_at IS NULL`.
 */

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Mystery reward' }

interface RevealData {
  prizeLabel: string
}

async function revealAndGet(serial: string, offerId: string): Promise<RevealData | null> {
  const admin = getSupabaseAdmin()
  const { data: member } = await admin
    .from('members')
    .select('member_id, tenant_id')
    .eq('pass_serial', serial)
    .maybeSingle()
  if (!member) return null

  const { data: offer } = await admin
    .from('member_offers')
    .select('offer_id, member_id, program_id, prize_label, revealed_at, loyalty_programs(type)')
    .eq('offer_id', offerId)
    .eq('venue_id', member.tenant_id)
    .eq('member_id', member.member_id)
    .maybeSingle()
  if (!offer) return null
  const program = offer.loyalty_programs as unknown as { type: string } | null
  if (program?.type !== 'mystery' || !offer.prize_label) return null

  if (!offer.revealed_at) {
    // First reveal: mark it. Guarded by `revealed_at IS NULL` in the
    // WHERE, matching the write-once trigger — a concurrent double-visit
    // to this page is harmless either way, since the prize itself was
    // fixed at issue time, not here.
    const { data: updated } = await admin
      .from('member_offers')
      .update({ revealed_at: new Date().toISOString() })
      .eq('offer_id', offerId)
      .is('revealed_at', null)
      .select('offer_id')
      .maybeSingle()
    if (updated) {
      void emitEvent({
        type: 'mystery.revealed',
        actor: `member:${member.member_id}`,
        venueId: member.tenant_id,
        payload: { offer_id: offerId, program_id: offer.program_id },
      })
    }
  }

  return { prizeLabel: offer.prize_label }
}

export default async function MysteryRevealPage({
  params,
}: {
  params: { serial: string; offerId: string }
}) {
  const reveal = await revealAndGet(params.serial, params.offerId)

  if (!reveal) {
    return (
      <main className="min-h-screen bg-aro-cream flex items-center justify-center p-6">
        <div className="relative grain-soft max-w-sm w-full rounded-2xl bg-aro-cream-warm border border-aro-hairline p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-aro-ink mb-2">Not found</h1>
          <p className="text-aro-ink-soft text-sm">This reward link isn&apos;t valid.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-aro-cream flex items-center justify-center p-6">
      <div className="relative grain-soft max-w-sm w-full rounded-2xl bg-aro-cream-warm border border-aro-hairline p-8 text-center">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-aro-muted mb-1">
          mystery reward
        </p>
        <RevealAnimation prizeLabel={reveal.prizeLabel} />
        <p className="text-sm text-aro-ink-soft">Show this at the counter to redeem.</p>
      </div>
    </main>
  )
}
