'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock3, Coffee, Loader2, Star } from 'lucide-react'
import { formatCents } from '@/lib/money'

const REVIEW_STRINGS = {
  heading: 'Enjoyed your visit?',
  body: "We'd love a quick public review — it takes a second.",
  cta: 'Leave a review',
  dismiss: 'No thanks',
}

function reviewShownKey(orderId: string): string {
  return `aro-review-shown:${orderId}`
}

async function postReviewEvent(orderId: string, type: 'prompted' | 'clicked') {
  try {
    await fetch(`/api/orders/${encodeURIComponent(orderId)}/review-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
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
}

export function OrderStatus({
  orderId,
  slug,
  currency,
  reviewUrl,
}: {
  orderId: string
  slug: string
  currency: string
  reviewUrl?: string | null
}) {
  const [order, setOrder] = useState<StatusData | null>(null)
  const [missing, setMissing] = useState(false)
  const [wasAlreadyShownAtLoad, setWasAlreadyShownAtLoad] = useState(true)
  const [reviewChecked, setReviewChecked] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setWasAlreadyShownAtLoad(localStorage.getItem(reviewShownKey(orderId)) === '1')
    setReviewChecked(true)
  }, [orderId])

  useEffect(() => {
    let active = true
    async function poll() {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
        cache: 'no-store',
      })
      if (!active) return
      if (!response.ok) {
        setMissing(true)
        return
      }
      setOrder(await response.json())
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 5000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [orderId])

  const settled = order
    ? ['paid', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed'].includes(
        order.status
      )
    : false
  const showReviewPrompt =
    reviewChecked && settled && Boolean(reviewUrl) && !wasAlreadyShownAtLoad && !dismissed

  useEffect(() => {
    if (!showReviewPrompt) return
    localStorage.setItem(reviewShownKey(orderId), '1')
    void postReviewEvent(orderId, 'prompted')
  }, [showReviewPrompt, orderId])

  if (missing)
    return <div className="py-20 text-center text-aro-muted">This order link is not available.</div>
  if (!order)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-aro-terra" />
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
        {LABELS[order.status] || order.status}
      </h1>
      <p className="mt-3 text-aro-muted">
        Thanks, {order.first_name}. This page updates automatically as your order moves.
      </p>
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
              onClick={() => void postReviewEvent(orderId, 'clicked')}
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
