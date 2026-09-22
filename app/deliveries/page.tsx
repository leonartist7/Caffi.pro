import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { DeliveryQueue } from '@/components/delivery/DeliveryQueue'

export const dynamic = 'force-dynamic'

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: { venue_id?: string }
}) {
  const {
    data: { user },
  } = await createClient().auth.getUser()
  if (!user) redirect('/login')
  const venueId = typeof searchParams.venue_id === 'string' ? searchParams.venue_id : ''
  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-6 bg-aro-cream p-4 text-aro-espresso sm:p-8">
      <form action="/deliveries" method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex-1 text-sm font-semibold">
          Venue ID
          <input
            name="venue_id"
            required
            defaultValue={venueId}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-aro-hairline bg-white px-3 py-2"
          />
        </label>
        <button className="min-h-[44px] rounded-xl bg-aro-espresso px-4 py-2 text-white">
          Open venue deliveries
        </button>
      </form>
      {venueId ? (
        <DeliveryQueue key={venueId} venueId={venueId} userId={user.id} />
      ) : (
        <p>Select a venue to view deliveries available to your account.</p>
      )}
    </main>
  )
}
