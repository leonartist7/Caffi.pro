import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarDays, MapPin, ShoppingBag } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/get-tenant'
import { getSiteHoursBySlug, hasConfiguredHours } from '@/lib/site-data'
import { buildSiteMetadata } from '@/lib/site-metadata'
import { sitePageUrl } from '@/lib/site-profile'
import { getStorefront } from '@/lib/storefront'

const STRINGS = {
  eyebrow: 'Welcome in',
  aboutEyebrow: 'Our place',
  aboutTitle: 'Made for the neighbourhood.',
  orderCta: 'Order now',
  reserveCta: 'Book a table',
  galleryEyebrow: 'Around the café',
  galleryTitle: 'A place worth lingering.',
  visitEyebrow: 'Come by',
  visitTitle: 'Your table is waiting.',
  directionsLabel: 'Find us',
  galleryAlt: 'gallery image',
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) return {}
  return buildSiteMetadata(tenant, 'home')
}

export default async function SiteHomePage({ params }: { params: { slug: string } }) {
  const [tenant, hours, storefront] = await Promise.all([
    getTenantBySlug(params.slug),
    getSiteHoursBySlug(params.slug),
    getStorefront(params.slug),
  ])
  if (!tenant) notFound()

  const profile = tenant.site_profile
  const canOrder = tenant.features_enabled?.ordering !== false && !!storefront?.items.length
  const canReserve = hasConfiguredHours(hours)

  return (
    <main>
      <section className="relative overflow-hidden bg-aro-espresso px-5 py-20 text-aro-cream sm:px-8 sm:py-28">
        <div className="grain-soft absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-6xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-aro-terracotta">
            {STRINGS.eyebrow}
          </p>
          <h1 className="mt-5 max-w-5xl font-display text-5xl leading-[0.92] sm:text-7xl lg:text-8xl">
            {profile.tagline ?? tenant.business_name}
          </h1>
          <p className="mt-6 font-serif text-2xl italic text-aro-cream/70">
            {tenant.business_name}
          </p>
          {(canOrder || canReserve) && (
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              {canOrder && (
                <Link
                  href={`/shop/${tenant.slug}/menu`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-aro-terra px-6 py-3 font-bold text-aro-cream transition-transform hover:-translate-y-0.5"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {STRINGS.orderCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              {canReserve && (
                <Link
                  href={`/reserve/${tenant.slug}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-aro-clay px-6 py-3 font-bold text-aro-cream transition-colors hover:border-aro-terracotta hover:text-aro-terracotta"
                >
                  <CalendarDays className="h-4 w-4" />
                  {STRINGS.reserveCta}
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {profile.about && (
        <section className="bg-aro-cream px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terra">
                {STRINGS.aboutEyebrow}
              </p>
              <h2 className="mt-3 font-display text-4xl leading-none text-aro-espresso sm:text-5xl">
                {STRINGS.aboutTitle}
              </h2>
            </div>
            <p className="whitespace-pre-line text-lg leading-8 text-aro-ink-soft">
              {profile.about}
            </p>
          </div>
        </section>
      )}

      {profile.gallery.length > 0 && (
        <section className="bg-aro-sand px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terra">
              {STRINGS.galleryEyebrow}
            </p>
            <h2 className="mt-3 font-display text-4xl text-aro-espresso sm:text-5xl">
              {STRINGS.galleryTitle}
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profile.gallery.map((imageUrl, index) => (
                <div
                  key={`${imageUrl}-${index}`}
                  className="aspect-[4/3] overflow-hidden rounded-[26px] bg-aro-clay"
                >
                  {/* Owner-provided hosts are intentionally unrestricted in release one. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={`${tenant.business_name} ${STRINGS.galleryAlt} ${index + 1}`}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {profile.address && (
        <section className="bg-aro-cream px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 rounded-[32px] border border-aro-hairline bg-aro-cream-warm p-8 sm:flex-row sm:items-end sm:p-12">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terra">
                {STRINGS.visitEyebrow}
              </p>
              <h2 className="mt-3 font-display text-4xl text-aro-espresso">{STRINGS.visitTitle}</h2>
              <p className="mt-5 flex items-start gap-2 text-aro-ink-soft">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-aro-terra" />
                {profile.address}
              </p>
            </div>
            <Link
              href={sitePageUrl(tenant, 'hours')}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-aro-espresso px-6 py-3 font-bold text-aro-cream"
            >
              {STRINGS.directionsLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}
    </main>
  )
}
