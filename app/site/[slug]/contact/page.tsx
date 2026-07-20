import type { Metadata } from 'next'
import { Facebook, Instagram, MapPin, Phone } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/get-tenant'
import { buildSiteMetadata } from '@/lib/site-metadata'

const STRINGS = {
  eyebrow: 'Say hello',
  title: 'Contact',
  intro: 'Drop by, call, or follow along online.',
  addressTitle: 'Visit',
  phoneTitle: 'Call',
  instagramTitle: 'Instagram',
  facebookTitle: 'Facebook',
  emptyEyebrow: 'Details are coming',
  emptyTitle: 'The café is updating its contact information.',
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
  return buildSiteMetadata(tenant, 'contact')
}

export default async function SiteContactPage({ params }: { params: { slug: string } }) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  const profile = tenant.site_profile
  const hasContact = !!(
    profile.address ||
    profile.phone_display ||
    profile.instagram_url ||
    profile.facebook_url
  )

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

        {hasContact ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {profile.address && (
              <article className="rounded-[26px] bg-aro-espresso p-7 text-aro-cream">
                <MapPin className="h-6 w-6 text-aro-terracotta" />
                <h2 className="mt-5 font-display text-2xl">{STRINGS.addressTitle}</h2>
                <p className="mt-3 leading-7 text-aro-cream/70">{profile.address}</p>
              </article>
            )}
            {profile.phone_display && (
              <article className="rounded-[26px] border border-aro-hairline bg-aro-cream-warm p-7">
                <Phone className="h-6 w-6 text-aro-terra" />
                <h2 className="mt-5 font-display text-2xl text-aro-espresso">
                  {STRINGS.phoneTitle}
                </h2>
                <a
                  href={phoneHref(profile.phone_display)}
                  className="mt-3 inline-block font-mono text-aro-ink-soft hover:text-aro-terra"
                >
                  {profile.phone_display}
                </a>
              </article>
            )}
            {profile.instagram_url && (
              <a
                href={profile.instagram_url}
                target="_blank"
                rel="noreferrer"
                className="group rounded-[26px] border border-aro-hairline bg-aro-sand p-7 transition-colors hover:border-aro-terra"
              >
                <Instagram className="h-6 w-6 text-aro-terra" />
                <h2 className="mt-5 font-display text-2xl text-aro-espresso">
                  {STRINGS.instagramTitle}
                </h2>
                <p className="mt-3 break-all text-sm text-aro-muted group-hover:text-aro-terra">
                  {profile.instagram_url}
                </p>
              </a>
            )}
            {profile.facebook_url && (
              <a
                href={profile.facebook_url}
                target="_blank"
                rel="noreferrer"
                className="group rounded-[26px] border border-aro-hairline bg-aro-sand p-7 transition-colors hover:border-aro-terra"
              >
                <Facebook className="h-6 w-6 text-aro-terra" />
                <h2 className="mt-5 font-display text-2xl text-aro-espresso">
                  {STRINGS.facebookTitle}
                </h2>
                <p className="mt-3 break-all text-sm text-aro-muted group-hover:text-aro-terra">
                  {profile.facebook_url}
                </p>
              </a>
            )}
          </div>
        ) : (
          <section className="mt-12 rounded-[28px] border border-dashed border-aro-clay bg-aro-cream-warm p-10 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-aro-terra">
              {STRINGS.emptyEyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl text-aro-espresso">{STRINGS.emptyTitle}</h2>
          </section>
        )}
      </div>
    </main>
  )
}
