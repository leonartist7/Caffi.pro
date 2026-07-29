import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarDays, ShoppingBag } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/get-tenant'
import { getStorefront } from '@/lib/storefront'
import { getVenueHours } from '@/lib/site-hours'
import { siteMetaDescription, siteOgImage } from '@/lib/site-meta'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) return {}
  const { tagline, about } = tenant.site_profile
  return {
    title: `${tenant.business_name} — ${tagline ?? 'Menu, hours & location'}`,
    description: siteMetaDescription(about),
    openGraph: siteOgImage(tenant.site_profile),
  }
}

export default async function SiteHomePage({ params }: { params: { slug: string } }) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  // Reuses the exact same storefront + hours reads the /shop and /site/hours
  // pages already use — no second query path for either.
  const [storefront, venueHours] = await Promise.all([
    getStorefront(tenant.slug),
    getVenueHours(tenant.tenant_id),
  ])

  const canOrder = (storefront?.items.length ?? 0) > 0
  const canBook = venueHours?.hours !== null && venueHours?.hours !== undefined
  const { tagline, about, gallery } = tenant.site_profile
  const root = `/site/${tenant.slug}`

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[34px] bg-aro-espresso px-6 py-14 text-aro-cream shadow-2xl sm:px-10 sm:py-20">
        <div className="relative z-10 max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-aro-terracotta">
            {tenant.business_name}
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[0.95] sm:text-6xl">
            {tagline ?? `Welcome to ${tenant.business_name}`}
          </h1>
          <div className="mt-8 flex flex-wrap gap-3">
            {canOrder && (
              <Link
                href={`/shop/${tenant.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-aro-terra px-6 py-4 font-bold text-white shadow-lg"
              >
                Order now <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {canBook && (
              <Link
                href={`/reserve/${tenant.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-aro-cream/30 px-6 py-4 font-bold text-aro-cream"
              >
                <CalendarDays className="h-4 w-4" /> Book a table
              </Link>
            )}
            {!canOrder && !canBook && (
              <Link
                href={`${root}/contact`}
                className="inline-flex items-center gap-2 rounded-full bg-aro-terra px-6 py-4 font-bold text-white shadow-lg"
              >
                Get in touch <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
        <ShoppingBag className="absolute -bottom-16 -right-10 h-72 w-72 rotate-12 text-aro-terracotta/10" />
      </section>

      {about && (
        <section className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terra">About</p>
          <div className="mt-3 space-y-4 whitespace-pre-line text-aro-ink-soft">{about}</div>
        </section>
      )}

      {gallery.length > 0 && (
        <section>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((url, i) => (
              <div
                key={url}
                className="relative aspect-square overflow-hidden rounded-[20px] bg-aro-sand"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(min-width: 640px) 33vw, 50vw"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
