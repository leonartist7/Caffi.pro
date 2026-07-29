import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Coffee } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/get-tenant'
import { getStorefront } from '@/lib/storefront'
import { siteMetaDescription, siteOgImage } from '@/lib/site-meta'
import { formatCents } from '@/lib/money'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) return {}
  return {
    title: `Menu — ${tenant.business_name}`,
    description: siteMetaDescription(tenant.site_profile.about),
    openGraph: siteOgImage(tenant.site_profile),
  }
}

export default async function SiteMenuPage({ params }: { params: { slug: string } }) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  // Same public menu data /shop/[slug]/menu reads — no forked query, no cart.
  const storefront = await getStorefront(tenant.slug)
  const categories = storefront?.categories ?? []
  const items = storefront?.items ?? []

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terra">Menu</p>
          <h1 className="mt-1 font-display text-4xl text-aro-espresso">What we serve</h1>
        </div>
        {items.length > 0 && (
          <Link
            href={`/shop/${tenant.slug}/menu`}
            className="inline-flex items-center gap-2 rounded-full bg-aro-terra px-5 py-3 text-sm font-bold text-white shadow-lg"
          >
            Order online <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </header>

      {items.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-aro-clay bg-aro-cream-warm p-8 text-center">
          <Coffee className="mx-auto h-8 w-8 text-aro-terra" />
          <p className="mt-3 font-display text-xl text-aro-espresso">Menu coming soon</p>
          <p className="mt-2 text-sm text-aro-muted">Check back once it&apos;s posted.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {categories.map(category => {
            const categoryItems = items.filter(item => item.category_id === category.category_id)
            if (categoryItems.length === 0) return null
            return (
              <section key={category.category_id}>
                <h2 className="font-display text-2xl text-aro-espresso">{category.name}</h2>
                <div className="mt-4 divide-y divide-aro-hairline rounded-[20px] border border-aro-hairline bg-aro-cream-warm">
                  {categoryItems.map(item => (
                    <div key={item.item_id} className="flex items-start justify-between gap-4 p-4">
                      <div>
                        <p className="font-medium text-aro-ink">{item.name}</p>
                        {item.description && (
                          <p className="mt-1 text-sm text-aro-muted">{item.description}</p>
                        )}
                      </div>
                      <p className="shrink-0 font-mono text-sm text-aro-ink">
                        {formatCents(item.price_cents, storefront?.venue.currency ?? 'CAD')}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
