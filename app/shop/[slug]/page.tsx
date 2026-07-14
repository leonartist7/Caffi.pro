import Link from 'next/link'
import { ArrowRight, Coffee, MapPin, ShoppingBag } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/get-tenant'

export default async function ShopHomePage({ params }: { params: { slug: string } }) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[34px] bg-aro-espresso px-6 py-14 text-aro-cream shadow-2xl sm:px-10 sm:py-20">
        <div className="relative z-10 max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-aro-terracotta">
            Order direct · No app needed
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[0.95] sm:text-7xl">
            Your favourite, made fresh.
          </h1>
          <p className="mt-5 max-w-xl text-aro-cream/70">
            Pickup, table service, or local delivery from {tenant.app_name || tenant.business_name}.
          </p>
          <Link
            href={`/shop/${tenant.slug}/menu`}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-aro-terra px-6 py-4 font-bold text-white shadow-lg"
          >
            Start an order <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <Coffee className="absolute -bottom-16 -right-10 h-72 w-72 rotate-12 text-aro-terracotta/10" />
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          [ShoppingBag, 'Pickup', 'Order ahead and skip the queue.'],
          [Coffee, 'Dine in', 'Scan your table and order in place.'],
          [MapPin, 'Local delivery', 'Delivered by the people who made it.'],
        ].map(([Icon, title, copy]) => {
          const FeatureIcon = Icon as typeof Coffee
          return (
            <div
              key={title as string}
              className="rounded-[24px] border border-aro-hairline bg-aro-cream-warm p-5"
            >
              <FeatureIcon className="h-6 w-6 text-aro-terra" />
              <h2 className="mt-4 font-display text-xl text-aro-espresso">{title as string}</h2>
              <p className="mt-1 text-sm text-aro-muted">{copy as string}</p>
            </div>
          )
        })}
      </section>
    </div>
  )
}
