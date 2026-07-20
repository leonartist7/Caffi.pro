import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/get-tenant'
import { formatCents } from '@/lib/money'
import { buildSiteMetadata } from '@/lib/site-metadata'
import { getStorefront } from '@/lib/storefront'

const STRINGS = {
  eyebrow: 'Made here, served fresh',
  title: 'The menu',
  intro: 'A simple look at what is on today.',
  orderCta: 'Order online',
  emptyEyebrow: 'The counter is getting ready',
  emptyTitle: 'The menu will be here soon.',
  emptyBody: 'Check back shortly for today’s drinks and bites.',
  moreSection: 'More',
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) return {}
  return buildSiteMetadata(tenant, 'menu')
}

export default async function SiteMenuPage({ params }: { params: { slug: string } }) {
  const [tenant, storefront] = await Promise.all([
    getTenantBySlug(params.slug),
    getStorefront(params.slug),
  ])
  if (!tenant || !storefront) notFound()

  const canOrder = tenant.features_enabled?.ordering !== false && storefront.items.length > 0
  const sections = storefront.categories
    .map(category => ({
      id: category.category_id,
      name: category.name,
      items: storefront.items.filter(item => item.category_id === category.category_id),
    }))
    .filter(section => section.items.length > 0)
  const uncategorized = storefront.items.filter(item => !item.category_id)
  if (uncategorized.length) {
    sections.push({ id: 'uncategorized', name: STRINGS.moreSection, items: uncategorized })
  }

  return (
    <main className="bg-aro-cream px-5 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col justify-between gap-7 border-b border-aro-hairline pb-10 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terra">
              {STRINGS.eyebrow}
            </p>
            <h1 className="mt-3 font-display text-5xl leading-none text-aro-espresso sm:text-6xl">
              {STRINGS.title}
            </h1>
            <p className="mt-4 text-aro-muted">{STRINGS.intro}</p>
          </div>
          {canOrder && (
            <Link
              href={`/shop/${tenant.slug}/menu`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-aro-terra px-6 py-3 font-bold text-aro-cream"
            >
              <ShoppingBag className="h-4 w-4" />
              {STRINGS.orderCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {sections.length === 0 ? (
          <section className="mt-12 rounded-[28px] border border-dashed border-aro-clay bg-aro-cream-warm p-10 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-aro-terra">
              {STRINGS.emptyEyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl text-aro-espresso">{STRINGS.emptyTitle}</h2>
            <p className="mt-3 text-aro-muted">{STRINGS.emptyBody}</p>
          </section>
        ) : (
          <div className="divide-y divide-aro-hairline">
            {sections.map(section => (
              <section key={section.id} className="py-12">
                <h2 className="font-display text-3xl text-aro-espresso">{section.name}</h2>
                <div className="mt-7 grid gap-x-12 gap-y-8 md:grid-cols-2">
                  {section.items.map(item => (
                    <article key={item.item_id} className="border-b border-aro-hairline pb-6">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-display text-xl text-aro-ink">{item.name}</h3>
                        <span className="shrink-0 font-mono text-sm font-bold text-aro-terra">
                          {formatCents(item.price_cents, storefront.venue.currency)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-2 text-sm leading-6 text-aro-muted">{item.description}</p>
                      )}
                      {item.dietary_tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.dietary_tags.map(tag => (
                            <span
                              key={tag}
                              className="rounded-full bg-aro-sage/20 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide text-aro-ink-soft"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
