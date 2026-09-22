import { notFound } from 'next/navigation'
import { getStorefront } from '@/lib/storefront'
import { MenuBrowser } from '@/components/storefront/MenuBrowser'

export default async function MenuPage({ params }: { params: { slug: string } }) {
  const storefront = await getStorefront(params.slug)
  if (!storefront) notFound()
  return (
    <div>
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terra">
          Made to order
        </p>
        <h1 className="mt-1 font-display text-4xl text-aro-espresso">The menu</h1>
        <p className="mt-2 text-aro-muted">Choose your favourites and make them exactly yours.</p>
        {!storefront.venue.ordering_open ? (
          <p className="mt-3 rounded-2xl bg-aro-sand px-4 py-3 text-sm text-aro-espresso" role="status">
            Ordering is currently closed. You can browse the menu and return during opening hours.
          </p>
        ) : null}
      </div>
      <MenuBrowser
        categories={storefront.categories}
        items={storefront.items}
        currency={storefront.venue.currency}
      />
    </div>
  )
}
