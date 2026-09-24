'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock3, Coffee, Loader2, Star } from 'lucide-react'
import { formatCents } from '@/lib/money'
import { isSettledOrderStatus } from '@/lib/orders/review-config'
import { useOrderingCart } from '@/contexts/OrderingCartContext'

const REVIEW_STRINGS = {
  heading: 'Enjoyed your visit?',
  body: "We'd love a quick public review — it takes a second.",
  cta: 'Leave a review',
  dismiss: 'No thanks',
}

function reviewShownKey(orderId: string): string {
  return `aro-review-shown:${orderId}`
}

async function postReviewEvent(orderId: string, trackingToken: string, type: 'prompted' | 'clicked') {
  try {
    await fetch(`/api/orders/${encodeURIComponent(orderId)}/review-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, tracking: trackingToken }),
    })
  } catch {
    // Fire-and-forget: a lost analytics event must never block the guest.
  }
}

interface StatusData {
  order_id: string
  status: string
  order_type: string
  first_name: string
  subtotal_cents: number
  tip_cents: number
  total_cents: number
  placed_at: string
  payment_state?: 'reconciliation_required'
  delivery?: {
    state: string
    provider: string
    tracking_accuracy: 'milestones' | 'provider_estimate'
    updated_at: string
    eta?: string | null
    exception: boolean
  } | null
}

const DELIVERY_LABELS: Record<string, string> = {
  dispatch_pending: 'Waiting for dispatch',
  booked: 'Delivery booked',
  assigned: 'Driver assigned',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  reconciliation_required: 'Delivery update being checked',
  cancellation_pending: 'Cancellation requested',
  cancelled: 'Delivery cancelled',
  failed: 'Delivery unsuccessful',
  returned: 'Returned to the restaurant',
}

const LABELS: Record<string, string> = {
  pending: 'Waiting for payment',
  paid: 'Payment received',
  accepted: 'Accepted by the café',
  preparing: 'Being prepared',
  ready: 'Ready for you',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed',
  canceled: 'Canceled',
  refunded: 'Refunded',
  reconciliation_required: 'Payment needs review',
}

export function OrderStatus({
  orderId,
  slug,
  currency,
  trackingToken,
  reviewUrl,
}: {
  orderId: string
  slug: string
  currency: string
  trackingToken: string
  reviewUrl?: string | null
}) {
  const cart = useOrderingCart()
  const [order, setOrder] = useState<StatusData | null>(null)
  const [missing, setMissing] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [wasAlreadyShownAtLoad, setWasAlreadyShownAtLoad] = useState(true)
  const [reviewChecked, setReviewChecked] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      setWasAlreadyShownAtLoad(localStorage.getItem(reviewShownKey(orderId)) === '1')
    } catch {
      // Storage disabled/blocked (private mode, permissions): fail toward
      // "already shown" so a storage error can only suppress the prompt,
      // never duplicate it.
      setWasAlreadyShownAtLoad(true)
    }
    setReviewChecked(true)
  }, [orderId])

  useEffect(() => {
    // Two tabs open on the same pending order both start with the flag
    // absent. If one tab shows the prompt and writes the flag, the other
    // must react to that write instead of independently re-showing the
    // prompt once its own poll observes the order settle.
    function onStorage(event: StorageEvent) {
      if (event.key === reviewShownKey(orderId) && event.newValue === '1') {
        setWasAlreadyShownAtLoad(true)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [orderId])

  useEffect(() => {
    let active = true
    async function poll() {
      try {
        const query = new URLSearchParams({ tracking: trackingToken })
        const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status?${query}`, {
          cache: 'no-store',
        })
        if (!active) return
        if (!response.ok) {
          if ([401, 403, 404, 410].includes(response.status)) setMissing(true)
          else setLoadError(true)
          return
        }
        setOrder(await response.json())
        setMissing(false)
        setLoadError(false)
      } catch {
        if (active) setLoadError(true)
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 5000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [orderId, trackingToken])

  useEffect(() => {
    if (
      !order ||
      !['paid', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed'].includes(
        order.status
      )
    ) {
      return
    }
    try {
      const operation = JSON.parse(
        localStorage.getItem(`aro-order-operation:${order.order_id}`) || 'null'
      ) as { slug?: string; client_uuid?: string } | null
      const clientKey = `aro-order-id:${slug}`
      if (operation?.slug === slug && localStorage.getItem(clientKey) === operation.client_uuid) {
        localStorage.removeItem(clientKey)
        cart.clearCart()
      }
      localStorage.removeItem(`aro-order-operation:${order.order_id}`)
    } catch {
      // A storage failure should never interfere with paid order visibility.
    }
  }, [cart, order, slug])

  const settled = order ? isSettledOrderStatus(order.status) : false
  const showReviewPrompt =
    reviewChecked && settled && Boolean(reviewUrl) && !wasAlreadyShownAtLoad && !dismissed

  useEffect(() => {
    if (!showReviewPrompt) return
    try {
      localStorage.setItem(reviewShownKey(orderId), '1')
    } catch {
      // Storage disabled/blocked — the prompt still renders this once; we
      // accept a possible re-show on reload rather than crashing the page.
    }
    void postReviewEvent(orderId, trackingToken, 'prompted')
  }, [showReviewPrompt, orderId, trackingToken])

  if (missing)
    return <div className="py-20 text-center text-aro-muted">This order link is not available.</div>
  if (!order)
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-aro-terra" />
        {loadError ? (
          <p className="mt-4 text-sm text-aro-muted" role="status">
            We could not refresh your order. We&apos;ll keep trying.
          </p>
        ) : null}
      </div>
    )
  return (
    <div className="mx-auto max-w-xl rounded-[32px] border border-aro-hairline bg-aro-cream-warm p-6 text-center shadow-xl sm:p-10">
      <span
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${settled ? 'bg-aro-sage/25 text-aro-sage' : 'bg-aro-sand text-aro-terra'}`}
      >
        {settled ? <CheckCircle2 className="h-8 w-8" /> : <Clock3 className="h-8 w-8" />}
      </span>
      <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-aro-muted">
        Order {order.order_id.slice(0, 8)}
      </p>
      <h1 className="mt-2 font-display text-4xl text-aro-espresso">
        {order.payment_state === 'reconciliation_required'
          ? LABELS.reconciliation_required
          : LABELS[order.status] || order.status}
      </h1>
      <p className="mt-3 text-aro-muted">
        Thanks, {order.first_name}. This page updates automatically as your order moves.
      </p>
      {order.payment_state === 'reconciliation_required' ? (
        <p className="mt-3 rounded-2xl bg-aro-sand/60 px-4 py-3 text-sm text-aro-muted">
          We&apos;re checking this payment. Please do not try again while the café resolves it.
        </p>
      ) : null}
      {loadError ? (
        <p role="status" className="mt-3 text-sm text-aro-muted">
          Updates are delayed. Showing the last confirmed information while we retry.
        </p>
      ) : null}
      {order.order_type === 'delivery' ? (
        <section
          aria-label="Delivery tracking"
          className="mt-6 rounded-2xl border border-aro-hairline bg-white/60 p-4 text-left"
        >
          <h2 className="font-display text-xl">Delivery</h2>
          <p className="mt-2 font-semibold">
            {order.delivery
              ? DELIVERY_LABELS[order.delivery.state] || 'Waiting for a confirmed delivery update'
              : 'No confirmed delivery tracking is available yet.'}
          </p>
          {order.delivery?.provider === 'simulator' ? (
            <p className="mt-2 text-sm">Simulated delivery. No real courier is travelling.</p>
          ) : null}
          {order.delivery?.exception ? (
            <p className="mt-2 text-sm">
              The restaurant is checking a delivery issue. Payment and any refund are handled
              separately.
            </p>
          ) : null}
          {order.delivery?.tracking_accuracy === 'milestones' ? (
            <p className="mt-2 text-sm text-aro-muted">
              Tracking uses confirmed milestones. Live location and arrival estimates are not
              available.
            </p>
          ) : null}
          {order.delivery?.tracking_accuracy === 'provider_estimate' &&
          order.delivery.eta &&
          Number.isFinite(Date.parse(order.delivery.eta)) ? (
            <p className="mt-2 text-sm">
              Provider&apos;s estimated arrival: {new Date(order.delivery.eta).toLocaleTimeString()}
              . This is an estimate.
            </p>
          ) : null}
          {order.delivery?.updated_at && Number.isFinite(Date.parse(order.delivery.updated_at)) ? (
            <p className="mt-2 text-xs text-aro-muted">
              Last confirmed update:{' '}
              <time dateTime={order.delivery.updated_at}>
                {new Date(order.delivery.updated_at).toLocaleString()}
              </time>
            </p>
          ) : null}
        </section>
      ) : null}
      <div className="mt-6 rounded-2xl bg-aro-sand/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm capitalize">{order.order_type.replace('_', ' ')}</span>
          <span className="font-mono font-bold">{formatCents(order.total_cents, currency)}</span>
        </div>
        {order.tip_cents > 0 ? (
          <div className="mt-1 flex items-center justify-between text-xs text-aro-muted">
            <span>Includes tip</span>
            <span className="font-mono">{formatCents(order.tip_cents, currency)}</span>
          </div>
        ) : null}
      </div>
      {showReviewPrompt ? (
        <div className="mt-6 rounded-2xl border border-aro-hairline bg-white/60 p-4 text-left">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 shrink-0 text-aro-terra" />
            <h2 className="font-display text-lg text-aro-espresso">{REVIEW_STRINGS.heading}</h2>
          </div>
          <p className="mt-1 text-sm text-aro-muted">{REVIEW_STRINGS.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={reviewUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void postReviewEvent(orderId, trackingToken, 'clicked')}
              className="inline-flex min-h-[44px] items-center rounded-full bg-aro-terra px-4 text-sm font-bold text-white"
            >
              {REVIEW_STRINGS.cta}
            </a>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold text-aro-muted hover:bg-aro-sand"
            >
              {REVIEW_STRINGS.dismiss}
            </button>
          </div>
        </div>
      ) : null}
      <Link
        href={`/shop/${slug}/menu`}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-aro-espresso px-5 py-3 text-sm font-bold text-aro-cream"
      >
        <Coffee className="h-4 w-4" /> Back to menu
      </Link>
    </div>
  )
}
