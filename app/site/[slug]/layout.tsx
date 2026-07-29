import { notFound } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { getTenantBySlug } from '@/lib/get-tenant'
import { SiteShell } from '@/components/site/SiteShell'
import { buildLocalBusinessJsonLd, getSiteBaseUrl } from '@/lib/site-structured-data'

/**
 * Public, unauthenticated route group (like /shop and /reserve) — not under
 * (dashboard) or (owner). The venue exists but `site_enabled` may still be
 * false, which is not a 404: it's an owner who hasn't finished setup yet
 * (mirrors the reservations "hours not configured" convention from PLAN-02).
 * Child pages never render in that case — short-circuited here.
 */
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
      <main className="flex min-h-screen items-center justify-center bg-aro-cream px-4 text-aro-ink">
        <div className="max-w-md rounded-[28px] border border-dashed border-aro-clay bg-aro-cream-warm p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-aro-terra" />
          <h1 className="mt-4 font-display text-2xl text-aro-espresso">
            {tenant.business_name}&apos;s site is coming soon
          </h1>
          <p className="mt-3 text-sm text-aro-muted">
            They&apos;re still putting the finishing touches on it. Check back soon.
          </p>
        </div>
      </main>
    )
  }

  const jsonLd = buildLocalBusinessJsonLd(tenant, `${getSiteBaseUrl()}/site/${tenant.slug}`)

  return (
    <>
      {/* Skipped entirely (no script tag) for a disabled site — handled by
          the short-circuit above, this only ever renders once enabled. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteShell tenant={tenant}>{children}</SiteShell>
    </>
  )
}
