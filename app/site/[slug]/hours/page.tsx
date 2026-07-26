import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, Clock } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/get-tenant'
import { getVenueHours } from '@/lib/site-hours'
import { siteMetaDescription, siteOgImage } from '@/lib/site-meta'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) return {}
  return {
    title: `Hours & location — ${tenant.business_name}`,
    description: siteMetaDescription(tenant.site_profile.about),
    openGraph: siteOgImage(tenant.site_profile),
  }
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export default async function SiteHoursPage({ params }: { params: { slug: string } }) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  const venueHours = await getVenueHours(tenant.tenant_id)
  const hours = venueHours?.hours ?? null
  const { address, phone_display } = tenant.site_profile

  return (
    <div className="max-w-xl space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terra">
          Hours &amp; location
        </p>
        <h1 className="mt-1 font-display text-4xl text-aro-espresso">Find us</h1>
      </header>

      {hours ? (
        <div className="overflow-hidden rounded-[20px] border border-aro-hairline bg-aro-cream-warm">
          {DAY_ORDER.map(day => {
            const window = hours[day]
            return (
              <div
                key={day}
                className="flex items-center justify-between border-b border-aro-hairline px-5 py-3 text-sm last:border-b-0"
              >
                <span className="font-medium text-aro-ink">{DAY_LABELS[day]}</span>
                <span className="text-aro-muted">
                  {window ? `${formatClock(window[0])} – ${formatClock(window[1])}` : 'Closed'}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-aro-clay bg-aro-cream-warm p-6 text-center">
          <Clock className="mx-auto h-8 w-8 text-aro-terra" />
          <p className="mt-3 font-display text-xl text-aro-espresso">Hours coming soon</p>
          <p className="mt-2 text-sm text-aro-muted">Give them a call in the meantime.</p>
        </div>
      )}

      {(address || phone_display) && (
        <div className="space-y-1 text-aro-ink-soft">
          {address && <p>{address}</p>}
          {phone_display && <p>{phone_display}</p>}
        </div>
      )}

      {hours && (
        <Link
          href={`/reserve/${tenant.slug}`}
          className="inline-flex items-center gap-2 rounded-full bg-aro-terra px-6 py-3 font-bold text-white shadow-lg"
        >
          <CalendarDays className="h-4 w-4" /> Book a table
        </Link>
      )}
    </div>
  )
}
