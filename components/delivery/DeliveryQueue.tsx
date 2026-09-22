'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatCents } from '@/lib/money'

type Job = {
  id: string
  order_id?: string
  state: string
  version: number
  provider?: string
  exception?: string | null
  approved_cost_minor?: number
  currency?: string
  preparation_status?: string
  driver_user_id?: string | null
  destination?: {
    line1: string
    line2?: string | null
    city: string
    postalCode: string
    countryCode: string
  } | null
}
type ReadyOrder = {
  order_id: string
  status: string
  quote_id: string
  provider_cost_minor: number
  currency: string
}
type QueueData = {
  jobs: Job[]
  drivers?: { user_id: string; full_name: string }[]
  orders?: ReadyOrder[]
}
type Quote = {
  quote_id: string
  provider_cost_minor: number
  currency: string
  expires_at: string
  expected_version?: number
}
const button =
  'min-h-[44px] rounded-xl border border-aro-hairline px-4 py-2 text-sm font-semibold disabled:opacity-40'
const input = 'min-h-[44px] w-full rounded-xl border border-aro-hairline bg-white px-3 py-2'
const labels: Record<string, string> = {
  dispatch_pending: 'Waiting for dispatch',
  booked: 'Booked',
  assigned: 'Driver assigned',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  reconciliation_required: 'Reconciliation required',
  cancellation_pending: 'Cancellation requested',
  cancelled: 'Cancelled',
  failed: 'Failed',
  returned: 'Returned',
}

export function DeliveryQueue({ venueId, userId }: { venueId: string; userId: string }) {
  const [data, setData] = useState<QueueData | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [driverId, setDriverId] = useState('')
  const sequence = useRef(0)
  const invalidateRequests = useCallback(() => {
    sequence.current += 1
  }, [])
  const operationKeys = useRef<Record<string, string>>({})
  const load = useCallback(async () => {
    const request = ++sequence.current
    try {
      const response = await fetch(
        `/api/deliveries?${new URLSearchParams({ venue_id: venueId })}`,
        { cache: 'no-store' }
      )
      const body = await response.json().catch(() => ({}))
      if (request !== sequence.current) return
      if (!response.ok)
        throw new Error(
          body.error || 'Delivery queue is unavailable. Your access may have changed.'
        )
      if (!Array.isArray(body.jobs)) throw new Error('Delivery queue response is unavailable.')
      setData(body)
    } catch (caught) {
      if (request !== sequence.current) return
      setData(null)
      setError(caught instanceof Error ? caught.message : 'Unable to refresh deliveries')
    }
  }, [venueId])

  useEffect(() => {
    setData(null)
    setQuotes({})
    void load()
    const timer = window.setInterval(() => void load(), 10000)
    return () => {
      invalidateRequests()
      window.clearInterval(timer)
    }
  }, [load, invalidateRequests])

  async function post(path: string, payload: Record<string, unknown>, operation?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (operation) {
      const storageKey = `aro-delivery-operation:${venueId}:${operation}`
      try {
        operationKeys.current[operation] ||=
          sessionStorage.getItem(storageKey) || crypto.randomUUID()
        sessionStorage.setItem(storageKey, operationKeys.current[operation])
      } catch {
        operationKeys.current[operation] ||= crypto.randomUUID()
      }
      headers['Idempotency-Key'] = operationKeys.current[operation]
    }
    const response = await fetch(path, { method: 'POST', headers, body: JSON.stringify(payload) })
    const body = await response.json().catch(() => ({}))
    if (!response.ok)
      throw new Error(body.error || 'This action could not be completed. Refresh before retrying.')
    return body
  }

  async function act(action: () => Promise<void>, message: string) {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      setNotice(message)
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Delivery action failed')
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function refreshQuote(orderId: string, version?: number) {
    const quote = await post(`/api/orders/${encodeURIComponent(orderId)}/delivery/quote`, {})
    if (
      typeof quote.quote_id !== 'string' ||
      !Number.isSafeInteger(quote.provider_cost_minor) ||
      quote.provider_cost_minor < 0 ||
      typeof quote.currency !== 'string' ||
      !(Date.parse(quote.expires_at) > Date.now())
    )
      throw new Error('The replacement quote is invalid or expired.')
    setQuotes(previous => ({ ...previous, [orderId]: { ...quote, expected_version: version } }))
  }

  async function dispatch(
    orderId: string,
    quote: Pick<Quote, 'quote_id' | 'provider_cost_minor'> & { expected_version?: number }
  ) {
    await post(
      `/api/orders/${encodeURIComponent(orderId)}/delivery/dispatch`,
      {
        quote_id: quote.quote_id,
        approved_cost_minor: quote.provider_cost_minor,
        expected_version: quote.expected_version,
      },
      orderId
    )
    setQuotes(previous => {
      const next = { ...previous }
      delete next[orderId]
      return next
    })
  }

  const managing = Boolean(data?.orders && data?.drivers)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Deliveries</h1>
          <p className="mt-2 text-sm text-aro-muted">
            Preparation, delivery and payment are tracked separately.
          </p>
        </div>
        <button
          type="button"
          className={button}
          disabled={busy}
          onClick={() => {
            setError('')
            void load()
          }}
        >
          Refresh deliveries
        </button>
      </div>
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-xl bg-green-50 p-4 text-green-900">
          {notice}
        </p>
      ) : null}
      {!data && !error ? <p role="status">Loading deliveries…</p> : null}
      {managing ? (
        <section aria-label="Orders awaiting dispatch" className="space-y-3">
          <h2 className="font-display text-xl">Orders awaiting dispatch</h2>
          <p className="text-sm text-aro-muted">
            Dispatch checks confirmed payment and restaurant acceptance. Approving courier cost does
            not change the guest charge.
          </p>
          {!data?.orders?.length ? <p>No orders awaiting dispatch.</p> : null}
          {data?.orders?.map(order => {
            const quote = quotes[order.order_id]
            return (
              <article
                key={order.order_id}
                className="rounded-2xl border border-aro-hairline p-4"
                aria-label={`Order ${order.order_id}`}
              >
                <h3 className="font-semibold">Order {order.order_id.slice(0, 8)}</h3>
                <p className="mt-2 text-sm">Preparation: {order.status}</p>
                <p className="mt-2 text-sm">
                  Courier cost to approve:{' '}
                  {formatCents(
                    quote?.provider_cost_minor ?? order.provider_cost_minor,
                    quote?.currency ?? order.currency
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => refreshQuote(order.order_id),
                        'New quote received. Review the cost before approving.'
                      )
                    }
                  >
                    Refresh quote
                  </button>
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => dispatch(order.order_id, quote || order),
                        'Dispatch requested. Follow the delivery state for confirmation.'
                      )
                    }
                  >
                    Approve cost and dispatch
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      ) : null}
      <section aria-label="Delivery queue" className="space-y-3">
        <h2 className="font-display text-xl">
          {managing ? 'Delivery queue' : 'Your assigned deliveries'}
        </h2>
        {data && !data.jobs.length ? <p>No deliveries to show.</p> : null}
        {data?.jobs.map(job => (
          <DeliveryCard
            key={job.id}
            job={job}
            userId={userId}
            managing={managing}
            drivers={data.drivers || []}
            busy={busy}
            quote={job.order_id ? quotes[job.order_id] : undefined}
            action={(action, payload) =>
              act(
                async () => {
                  await post(`/api/deliveries/${encodeURIComponent(job.id)}/${action}`, {
                    ...payload,
                    expected_version: job.version,
                  })
                },
                action === 'cancel'
                  ? 'Cancellation requested. Wait for confirmed cancellation; no refund was issued.'
                  : 'Action recorded. Review the updated delivery state.'
              )
            }
            refresh={() =>
              act(
                () => refreshQuote(job.order_id!, job.version),
                'Replacement quote received. Explicit cost approval is still required.'
              )
            }
            approve={() =>
              act(
                () => dispatch(job.order_id!, quotes[job.order_id!]),
                'Replacement quote approved. Guest charge is unchanged.'
              )
            }
          />
        ))}
      </section>
      {managing ? (
        <section className="rounded-2xl border border-aro-hairline p-4" aria-label="Driver access">
          <h2 className="font-display text-xl">Driver access</h2>
          <p className="mt-2 text-sm text-aro-muted">
            Grant only to an active restaurant team member. Driver access permits assigned delivery
            milestones, not management actions.
          </p>
          <label className="mt-3 block text-sm">
            Team member user ID
            <input
              className={`${input} mt-1`}
              value={driverId}
              onChange={event => setDriverId(event.target.value)}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {[true, false].map(enabled => (
              <button
                key={String(enabled)}
                type="button"
                className={button}
                disabled={busy || !driverId.trim()}
                onClick={() =>
                  void act(
                    async () => {
                      await post('/api/delivery/drivers', {
                        venue_id: venueId,
                        user_id: driverId.trim(),
                        enabled,
                      })
                    },
                    enabled ? 'Driver access enabled.' : 'Driver access revoked.'
                  )
                }
              >
                {enabled ? 'Enable driver access' : 'Revoke driver access'}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function DeliveryCard({
  job,
  userId,
  managing,
  drivers,
  busy,
  quote,
  action,
  refresh,
  approve,
}: {
  job: Job
  userId: string
  managing: boolean
  drivers: NonNullable<QueueData['drivers']>
  busy: boolean
  quote?: Quote
  action: (action: string, payload: Record<string, unknown>) => Promise<void>
  refresh: () => Promise<void>
  approve: () => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [driver, setDriver] = useState('')
  const ownDriver = job.provider === 'own_driver'
  const assignedToMe = job.driver_user_id === userId
  const terminal = ['delivered', 'cancelled', 'failed', 'returned'].includes(job.state)
  return (
    <article
      className="rounded-2xl border border-aro-hairline bg-white p-4"
      aria-label={`Delivery ${job.id}`}
    >
      <h3 className="font-semibold">{labels[job.state] || 'Delivery update pending'}</h3>
      {job.order_id ? <p className="mt-1 text-sm">Order {job.order_id.slice(0, 8)}</p> : null}
      <p className="mt-2 text-sm">Preparation: {job.preparation_status || 'Not available'}</p>
      {assignedToMe && job.destination ? (
        <section aria-label="Delivery destination" className="mt-3 rounded-xl bg-aro-cream p-3">
          <h4 className="text-sm font-semibold">Delivery destination</h4>
          <address className="mt-1 text-sm not-italic">
            <span className="block">{job.destination.line1}</span>
            {job.destination.line2 ? <span className="block">{job.destination.line2}</span> : null}
            <span className="block">
              {job.destination.city}, {job.destination.postalCode}
            </span>
            <span className="block">{job.destination.countryCode}</span>
          </address>
        </section>
      ) : null}
      {job.provider === 'simulator' ? (
        <p className="mt-2 text-sm font-semibold">Simulation — no real courier</p>
      ) : null}
      {managing && job.approved_cost_minor != null && job.currency ? (
        <p className="mt-2 text-sm">
          Approved courier cost: {formatCents(job.approved_cost_minor, job.currency)}
        </p>
      ) : null}
      {job.exception ? (
        <p role="status" className="mt-2 rounded-xl bg-amber-50 p-3 text-sm">
          Needs attention: {job.exception}. Reconcile before attempting further delivery actions.
        </p>
      ) : null}
      {managing ? (
        <div className="mt-4 space-y-3">
          {job.state === 'dispatch_pending' && job.order_id ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => void refresh()}
              >
                Refresh delivery quote
              </button>
              {quote ? (
                <>
                  <span className="text-sm">
                    New courier cost: {formatCents(quote.provider_cost_minor, quote.currency)}
                  </span>
                  <button
                    type="button"
                    className={button}
                    disabled={
                      busy ||
                      quote.expected_version !== job.version ||
                      Date.parse(quote.expires_at) <= Date.now()
                    }
                    onClick={() => void approve()}
                  >
                    Approve replacement quote
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
          {!terminal ? (
            <>
              <label className="block text-sm">
                Recovery reason
                <input
                  className={`${input} mt-1`}
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={button}
                  disabled={busy || !reason.trim()}
                  onClick={() => void action('reconcile', { reason: reason.trim() })}
                >
                  Reconcile delivery
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={busy || !reason.trim() || job.state === 'cancellation_pending'}
                  onClick={() => void action('cancel', { reason: reason.trim() })}
                >
                  Request cancellation
                </button>
              </div>
            </>
          ) : null}
          {ownDriver && ['booked', 'assigned'].includes(job.state) ? (
            <div className="space-y-2">
              <label className="block text-sm">
                Assign restaurant driver
                <select
                  className={`${input} mt-1`}
                  value={driver}
                  onChange={event => setDriver(event.target.value)}
                >
                  <option value="">Choose an enabled driver</option>
                  {drivers.map(member => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.full_name || member.user_id}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={button}
                disabled={busy || !driver}
                onClick={() =>
                  void action('assignment', {
                    driver_user_id: driver,
                    reason: 'Assign restaurant driver',
                  })
                }
              >
                Assign driver
              </button>
            </div>
          ) : null}
          <p className="text-xs text-aro-muted">
            Cancellation does not refund payment. Refunds and paid re-dispatch require a separately
            approved policy and are unavailable here.
          </p>
        </div>
      ) : null}
      {ownDriver && assignedToMe ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {job.state === 'assigned' ? (
            <button
              type="button"
              className={button}
              disabled={busy || job.preparation_status !== 'ready'}
              onClick={() => void action('milestones', { state: 'picked_up' })}
            >
              Confirm pickup
            </button>
          ) : null}
          {job.state === 'picked_up' ? (
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => void action('milestones', { state: 'delivered' })}
            >
              Confirm delivery
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
