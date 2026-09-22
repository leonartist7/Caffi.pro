import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { scope } from '@/lib/delivery/http'
import { DeliveryQueue } from '@/components/delivery/DeliveryQueue'

export const dynamic = 'force-dynamic'

function UnavailableDeliveries() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-6 bg-aro-cream p-4 text-aro-espresso sm:p-8">
      <h1 className="font-display text-3xl">Deliveries</h1>
      <p role="status">
        No accessible delivery venue is available. Contact your restaurant manager if you need
        access.
      </p>
    </main>
  )
}

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: { venue_id?: string }
}) {
  let userId: string | undefined
  try {
    const { data, error } = await createClient().auth.getUser()
    if (error) return <UnavailableDeliveries />
    userId = data.user?.id
  } catch {
    return <UnavailableDeliveries />
  }
  if (!userId) redirect('/login')

  const venueId = process.env.CAFFI_SYNTHETIC_VENUE_ID
  if (!venueId || (searchParams.venue_id !== undefined && searchParams.venue_id !== venueId)) {
    return <UnavailableDeliveries />
  }

  let venueName: string
  try {
    // The delivery scope gate checks configuration and active venue/driver
    // permissions before any privileged lookup can reveal the venue's name.
    await scope(venueId, userId)
    const { data, error } = await getSupabaseAdmin()
      .from('venues')
      .select('venue_id,business_name')
      .eq('venue_id', venueId)
      .maybeSingle()
    if (
      error ||
      data?.venue_id !== venueId ||
      typeof data.business_name !== 'string' ||
      !data.business_name.trim()
    ) {
      return <UnavailableDeliveries />
    }
    venueName = data.business_name
  } catch {
    return <UnavailableDeliveries />
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-6 bg-aro-cream p-4 text-aro-espresso sm:p-8">
      <p className="font-semibold">{venueName}</p>
      <DeliveryQueue key={venueId} venueId={venueId} userId={userId} />
    </main>
  )
}
