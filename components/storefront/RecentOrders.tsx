'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock3 } from 'lucide-react'

interface RecentOrder {
  order_id: string
  status: string
  first_name: string
  order_type: string
}

export function RecentOrders({ slug }: { slug: string }) {
  const [orders, setOrders] = useState<RecentOrder[] | null>(null)
  useEffect(() => {
    const ids = JSON.parse(localStorage.getItem(`aro-recent-orders:${slug}`) || '[]') as string[]
    void Promise.all(
      ids.map(async id => {
        const response = await fetch(`/api/orders/${encodeURIComponent(id)}/status`)
        return response.ok ? ((await response.json()) as RecentOrder) : null
      })
    ).then(rows => setOrders(rows.filter((row): row is RecentOrder => Boolean(row))))
  }, [slug])
  if (orders === null)
    return <div className="py-16 text-center text-aro-muted">Loading recent orders...</div>
  if (!orders.length)
    return (
      <div className="rounded-[28px] border border-dashed border-aro-clay bg-aro-cream-warm py-16 text-center">
        <Clock3 className="mx-auto h-8 w-8 text-aro-terra" />
        <h2 className="mt-3 font-display text-2xl text-aro-espresso">
          No orders on this device yet
        </h2>
        <Link
          href={`/shop/${slug}/menu`}
          className="mt-5 inline-block rounded-full bg-aro-espresso px-5 py-3 text-sm font-bold text-aro-cream"
        >
          Browse the menu
        </Link>
      </div>
    )
  return (
    <div className="space-y-3">
      {orders.map(order => (
        <Link
          key={order.order_id}
          href={`/shop/${slug}/order-confirmation/${order.order_id}`}
          className="flex items-center justify-between rounded-[22px] border border-aro-hairline bg-aro-cream-warm p-5"
        >
          <div>
            <p className="font-display text-xl text-aro-espresso">
              Order {order.order_id.slice(0, 8)}
            </p>
            <p className="mt-1 text-sm capitalize text-aro-muted">
              {order.order_type.replace('_', ' ')} · {order.status}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-aro-terra" />
        </Link>
      ))}
    </div>
  )
}
