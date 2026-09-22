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

type RecentOrderCredential = {
  order_id: string
  tracking_token: string
  resume_url?: string
}

type LoadedRecentOrder = RecentOrder & { credential: RecentOrderCredential }

function readRecentOrders(slug: string): RecentOrderCredential[] {
  try {
    const raw = JSON.parse(localStorage.getItem(`aro-recent-orders:${slug}`) || '[]') as Array<
      string | Partial<RecentOrderCredential>
    >
    // Older local records had only an order ID. They cannot satisfy the new
    // guest credential contract and are intentionally ignored.
    return raw.filter(
      (entry): entry is RecentOrderCredential =>
        typeof entry === 'object' &&
        typeof entry.order_id === 'string' &&
        typeof entry.tracking_token === 'string'
    )
  } catch {
    return []
  }
}

export function RecentOrders({ slug }: { slug: string }) {
  const [orders, setOrders] = useState<LoadedRecentOrder[] | null>(null)
  useEffect(() => {
    const credentials = readRecentOrders(slug)
    void Promise.all(
      credentials.map(async credential => {
        const query = new URLSearchParams({ tracking: credential.tracking_token })
        const response = await fetch(
          `/api/orders/${encodeURIComponent(credential.order_id)}/status?${query}`
        )
        return response.ok
          ? { ...((await response.json()) as RecentOrder), credential }
          : null
      })
    ).then(rows => setOrders(rows.filter((row): row is LoadedRecentOrder => Boolean(row))))
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
        <div
          key={order.order_id}
          className="flex items-center justify-between rounded-[22px] border border-aro-hairline bg-aro-cream-warm p-5"
        >
          <Link
            href={`/shop/${slug}/order-confirmation/${order.order_id}?tracking=${encodeURIComponent(order.credential.tracking_token)}`}
            className="min-w-0 flex-1"
          >
          <div>
            <p className="font-display text-xl text-aro-espresso">
              Order {order.order_id.slice(0, 8)}
            </p>
            <p className="mt-1 text-sm capitalize text-aro-muted">
              {order.order_type.replace('_', ' ')} · {order.status}
            </p>
          </div>
          </Link>
          {order.status === 'pending' && order.credential.resume_url?.startsWith('https://') ? (
            <a
              href={order.credential.resume_url}
              className="mr-3 rounded-full bg-aro-espresso px-3 py-2 text-xs font-bold text-aro-cream"
            >
              Resume payment
            </a>
          ) : null}
          <ArrowRight className="h-5 w-5 text-aro-terra" />
        </div>
      ))}
    </div>
  )
}
