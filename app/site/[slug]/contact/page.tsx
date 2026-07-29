import type { Metadata } from 'next'
import { Instagram, Facebook, MapPin, Phone } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/get-tenant'
import { siteMetaDescription, siteOgImage } from '@/lib/site-meta'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) return {}
  return {
    title: `Contact — ${tenant.business_name}`,
    description: siteMetaDescription(tenant.site_profile.about),
    openGraph: siteOgImage(tenant.site_profile),
  }
}

export default async function SiteContactPage({ params }: { params: { slug: string } }) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  const { address, phone_display, instagram_url, facebook_url } = tenant.site_profile
  const hasContact = address || phone_display || instagram_url || facebook_url

  return (
    <div className="max-w-xl space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terra">
          Get in touch
        </p>
        <h1 className="mt-1 font-display text-4xl text-aro-espresso">Contact</h1>
      </header>

      {hasContact ? (
        <div className="space-y-4 rounded-[20px] border border-aro-hairline bg-aro-cream-warm p-6">
          {address && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-aro-terra" />
              <p className="text-aro-ink">{address}</p>
            </div>
          )}
          {phone_display && (
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-aro-terra" />
              <a href={`tel:${phone_display}`} className="text-aro-ink hover:text-aro-terra">
                {phone_display}
              </a>
            </div>
          )}
          {(instagram_url || facebook_url) && (
            <div className="flex items-center gap-4 pt-2">
              {instagram_url && (
                <a
                  href={instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm font-semibold text-aro-ink-soft hover:text-aro-terra"
                >
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
              )}
              {facebook_url && (
                <a
                  href={facebook_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm font-semibold text-aro-ink-soft hover:text-aro-terra"
                >
                  <Facebook className="h-4 w-4" /> Facebook
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-aro-clay bg-aro-cream-warm p-6 text-center">
          <p className="text-sm text-aro-muted">Contact details coming soon.</p>
        </div>
      )}
    </div>
  )
}
