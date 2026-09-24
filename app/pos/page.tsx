import { requireVenueRole } from '@/lib/authz'
import { PosQueue } from '@/components/pos/PosQueue'

export const dynamic = 'force-dynamic'
export default async function PosPage() {
  const venueId = process.env.CAFFI_SYNTHETIC_VENUE_ID
  if (!venueId) return <main className="p-6"><h1>POS connection</h1><p>No configured venue.</p></main>
  const gate = await requireVenueRole(venueId,['owner','manager'])
  if (!gate.ok) return <main className="p-6"><h1>POS connection</h1><p>Access unavailable.</p></main>
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <h1 className="font-display text-3xl">POS connection</h1>
      <p>Orders wait for an acknowledgement from the restaurant POS. Unknown outcomes require lookup before any retry.</p>
      <PosQueue venueId={gate.ctx.venueId} />
    </main>
  )
}
