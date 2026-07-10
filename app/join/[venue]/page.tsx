import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { JoinForm } from './join-form'

/**
 * Diner join page (Plan 2) — PUBLIC, mobile-first.
 * Server component: venue lookup via service client (anon has zero grants
 * for this flow; the page itself makes no browser Supabase calls).
 */

export const dynamic = 'force-dynamic'

interface VenueRow {
  venue_id: string
  business_name: string
  slug: string
  brand_kit: { primary?: string; background?: string } | null
  kill_switch: boolean
}

async function getVenue(slug: string): Promise<VenueRow | null> {
  const normalized = slug.trim().toLowerCase().replace(/\/+$/, '')
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('venues')
    .select('venue_id, business_name, slug, brand_kit, kill_switch')
    .eq('slug', normalized)
    .single()
  if (!data || data.kill_switch) return null
  return data as VenueRow
}

export async function generateMetadata({
  params,
}: {
  params: { venue: string }
}): Promise<Metadata> {
  const venue = await getVenue(params.venue)
  return {
    title: venue ? `Join ${venue.business_name}` : 'Café not found',
    description: venue
      ? `Join ${venue.business_name}'s circle — earn rewards every visit.`
      : undefined,
  }
}

export default async function JoinPage({ params }: { params: { venue: string } }) {
  const venue = await getVenue(params.venue)

  if (!venue) {
    return (
      <main className="min-h-screen bg-aro-cream flex items-center justify-center p-6">
        <div className="relative grain-soft max-w-sm w-full rounded-2xl bg-aro-cream-warm border border-aro-hairline p-8 text-center">
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-aro-muted mb-3">
            aro
          </p>
          <h1 className="font-display text-2xl font-bold text-aro-ink mb-2">Hmm — no café here</h1>
          <p className="text-aro-ink-soft text-sm leading-relaxed">
            This join link doesn&apos;t match any café. Double-check the QR you scanned, or ask at
            the counter.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-aro-cream flex items-center justify-center p-6">
      <div className="relative grain-soft max-w-sm w-full rounded-2xl bg-aro-cream-warm border border-aro-hairline p-8">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-aro-muted mb-1">
          {venue.business_name}
        </p>
        <h1 className="font-display text-3xl font-bold text-aro-ink leading-[0.95] mb-2">
          Join the club
        </h1>
        <p className="font-serif italic text-aro-ink-soft mb-6">
          your usual, remembered — rewards every visit
        </p>
        <JoinForm venueSlug={venue.slug} />
      </div>
    </main>
  )
}
