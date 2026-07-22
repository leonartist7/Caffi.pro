import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, Clock3, MapPin, Phone } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/get-tenant'
import { getSiteHoursBySlug, hasConfiguredHours } from '@/lib/site-data'
import { buildSiteMetadata } from '@/lib/site-metadata'

const STRINGS = {
  eyebrow: 'Plan your visit',
  title: 'Hours & location',
  intro: 'Weekly opening hours are shown in the café’s local time.',
  closed: 'Closed',
  bookCta: 'Book a table',
  locationTitle: 'Find us',
  phoneTitle: 'Call us',
  unconfiguredEyebrow: 'Hours are on the way',
  unconfiguredTitle: 'Check back before your next visit.',
  unconfiguredBody: 'The café is still confirming its weekly opening hours.',
}

const DAYS = [
  ['mon', 'Monday'],
  ['tue', 'Tuesday'],
  ['wed', 'Wednesday'],
  ['thu', 'Thursday'],
  ['fri', 'Friday'],
  ['sat', 'Saturday'],
  ['sun', 'Sunday'],
] as const

function formatClock(value: string): string {
  const [hour, minute] = value.split(':').map(Number)
  const date = new Date(Date.UTC(2026, 0, 1, hour, minute))
  return new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date)
}

function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) return {}
  return buildSiteMetadata(tenant, 'hours')
}

export default async function SiteHoursPage({ params }: { params: { slug: string } }) {
  const [tenant, hours] = await Promise.all([
    getTenantBySlug(params.slug),
    getSiteHoursBySlug(params.slug),
  ])
  if (!tenant) notFound()

  const configured = hasConfiguredHours(hours)
  const profile = tenant.site_profile

  return (
    <main className="bg-aro-cream px-5 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terra">
          {STRINGS.eyebrow}
        </p>
        <h1 className="mt-3 font-display text-5xl leading-none text-aro-espresso sm:text-6xl">
          {STRINGS.title}
        </h1>
        <p className="mt-4 text-aro-muted">{STRINGS.intro}</p>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          {configured && hours ? (
            <section className="rounded-[28px] border border-aro-hairline bg-aro-cream-warm p-6 sm:p-8">
              <div className="divide-y divide-aro-hairline">
                {DAYS.map(([key, label]) => {
                  const window = hours[key]
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0"
                    >
                      <span className="font-semibold text-aro-ink">{label}</span>
                      <span className="font-mono text-sm text-aro-ink-soft">
                        {window
                          ? `${formatClock(window[0])} — ${formatClock(window[1])}`
                          : STRINGS.closed}
                      </span>
                    </div>
                  )
                })}
              </div>
              <Link
                href={`/reserve/${tenant.slug}`}
                className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-aro-terra px-6 py-3 font-bold text-aro-cream sm:w-auto"
              >
                <CalendarDays className="h-4 w-4" />
                {STRINGS.bookCta}
              </Link>
            </section>
          ) : (
            <section className="rounded-[28px] border border-dashed border-aro-clay bg-aro-cream-warm p-8 text-center">
              <Clock3 className="mx-auto h-9 w-9 text-aro-terra" />
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-aro-terra">
                {STRINGS.unconfiguredEyebrow}
              </p>
              <h2 className="mt-3 font-display text-3xl text-aro-espresso">
                {STRINGS.unconfiguredTitle}
              </h2>
              <p className="mt-3 text-aro-muted">{STRINGS.unconfiguredBody}</p>
            </section>
          )}

          <aside className="space-y-5">
            {profile.address && (
              <div className="rounded-[24px] bg-aro-espresso p-6 text-aro-cream">
                <MapPin className="h-6 w-6 text-aro-terracotta" />
                <h2 className="mt-4 font-display text-2xl">{STRINGS.locationTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-aro-cream/70">{profile.address}</p>
              </div>
            )}
            {profile.phone_display && (
              <div className="rounded-[24px] border border-aro-hairline bg-aro-sand p-6">
                <Phone className="h-6 w-6 text-aro-terra" />
                <h2 className="mt-4 font-display text-2xl text-aro-espresso">
                  {STRINGS.phoneTitle}
                </h2>
                <a
                  href={phoneHref(profile.phone_display)}
                  className="mt-2 inline-block font-mono text-sm text-aro-ink-soft hover:text-aro-terra"
                >
                  {profile.phone_display}
                </a>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
