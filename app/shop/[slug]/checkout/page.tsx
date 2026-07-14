import { getDeliveryZones } from '@/lib/storefront'
import { CheckoutForm } from '@/components/storefront/CheckoutForm'

export default async function CheckoutPage({ params }: { params: { slug: string } }) {
  const zones = await getDeliveryZones(params.slug)
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terra">
        Guest checkout
      </p>
      <h1 className="mt-1 mb-6 font-display text-4xl text-aro-espresso">Almost yours.</h1>
      <CheckoutForm slug={params.slug} zones={zones} />
    </div>
  )
}
