import Link from 'next/link'
import { Coffee, Facebook, Instagram, MapPin, Phone } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/get-tenant'
import { sitePageUrl, type SitePage } from '@/lib/site-profile'

const STRINGS = {
  brand: 'aro local',
  comingSoonEyebrow: 'A little something is brewing',
  comingSoonTitle: "This café's site is coming soon.",
  comingSoonBody: 'They are putting the finishing touches on their new online home.',
  footerPrefix: 'Made with care by',
  addressLabel: 'Address',
  phoneLabel: 'Phone',
  instagramLabel: 'Instagram',
  facebookLabel: 'Facebook',
  primaryNavLabel: 'Primary',
}

const NAV_ITEMS: Array<{ page: SitePage; label: string }> = [
  { page: 'home', label: 'Home' },
  { page: 'menu', label: 'Menu' },
  { page: 'hours', label: 'Hours' },
  { page: 'contact', label: 'Contact' },
]

function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  if (!tenant.site_profile.site_enabled) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-aro-cream px-5 text-aro-ink">
        <section className="grain-soft w-full max-w-lg rounded-[32px] border border-aro-hairline bg-aro-cream-warm p-8 text-center sm:p-12">
          <Coffee className="mx-auto h-10 w-10 text-aro-terra" />
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terra">
            {STRINGS.comingSoonEyebrow}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-none text-aro-espresso">
            {STRINGS.comingSoonTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-aro-muted">{STRINGS.comingSoonBody}</p>
          <p className="mt-7 font-serif text-xl italic text-aro-ink-soft">{tenant.business_name}</p>
        </section>
      </main>
    )
  }

  const profile = tenant.site_profile
  const sameAs = [profile.instagram_url, profile.facebook_url].filter((url): url is string => !!url)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    name: tenant.business_name,
    url: sitePageUrl(tenant, 'home'),
    ...(profile.address
      ? { address: { '@type': 'PostalAddress', streetAddress: profile.address } }
      : {}),
    ...(profile.phone_display ? { telephone: profile.phone_display } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  }
  const structuredDataJson = JSON.stringify(structuredData).replace(/</g, '\\u003c')

  return (
    <div className="min-h-screen bg-aro-cream text-aro-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredDataJson }} />
      <header className="border-b border-aro-hairline bg-aro-cream/95">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link href={sitePageUrl(tenant, 'home')} className="group inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-aro-espresso text-aro-cream transition-transform group-hover:-rotate-6">
              <Coffee className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-display text-xl leading-none text-aro-espresso">
                {tenant.business_name}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-aro-muted">
                {STRINGS.brand}
              </span>
            </span>
          </Link>
          <nav
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
            aria-label={STRINGS.primaryNavLabel}
          >
            {NAV_ITEMS.map(item => (
              <Link
                key={item.page}
                href={sitePageUrl(tenant, item.page)}
                className="text-sm font-semibold text-aro-ink-soft transition-colors hover:text-aro-terra"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-t border-aro-hairline bg-aro-cream-warm">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
          <div>
            <p className="font-display text-2xl text-aro-espresso">{tenant.business_name}</p>
            {profile.tagline && (
              <p className="mt-2 max-w-sm font-serif text-lg italic text-aro-ink-soft">
                {profile.tagline}
              </p>
            )}
          </div>
          <div className="space-y-3 text-sm text-aro-muted">
            {profile.address && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-aro-terra" />
                <span>
                  <span className="sr-only">{STRINGS.addressLabel}: </span>
                  {profile.address}
                </span>
              </p>
            )}
            {profile.phone_display && (
              <a
                href={phoneHref(profile.phone_display)}
                className="flex items-center gap-2 hover:text-aro-terra"
              >
                <Phone className="h-4 w-4 text-aro-terra" />
                <span className="sr-only">{STRINGS.phoneLabel}: </span>
                {profile.phone_display}
              </a>
            )}
          </div>
          <div className="flex items-start gap-3 lg:justify-end">
            {profile.instagram_url && (
              <a
                href={profile.instagram_url}
                target="_blank"
                rel="noreferrer"
                aria-label={STRINGS.instagramLabel}
                className="rounded-full border border-aro-hairline p-3 text-aro-ink-soft transition-colors hover:border-aro-terra hover:text-aro-terra"
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {profile.facebook_url && (
              <a
                href={profile.facebook_url}
                target="_blank"
                rel="noreferrer"
                aria-label={STRINGS.facebookLabel}
                className="rounded-full border border-aro-hairline p-3 text-aro-ink-soft transition-colors hover:border-aro-terra hover:text-aro-terra"
              >
                <Facebook className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        <div className="border-t border-aro-hairline px-5 py-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-aro-muted">
          {STRINGS.footerPrefix} aro
        </div>
      </footer>
    </div>
  )
}
