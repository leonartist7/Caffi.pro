import { RecentOrders } from '@/components/storefront/RecentOrders'
export default function OrdersPage({ params }: { params: { slug: string } }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terra">
        This device
      </p>
      <h1 className="mt-1 mb-6 font-display text-4xl text-aro-espresso">Recent orders</h1>
      <RecentOrders slug={params.slug} />
    </div>
  )
}
