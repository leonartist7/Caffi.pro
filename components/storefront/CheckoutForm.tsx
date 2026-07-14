'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Coffee, MapPin, ShoppingBag, Truck } from 'lucide-react'
import { useOrderingCart } from '@/contexts/OrderingCartContext'
import type { DeliveryZone } from '@/lib/storefront'
import { formatCents } from '@/lib/money'

type OrderType = 'pickup' | 'dine_in' | 'delivery'

export function CheckoutForm({ slug, zones }: { slug: string; zones: DeliveryZone[] }) {
  const cart = useOrderingCart()
  const router = useRouter()
  const search = useSearchParams()
  const tableToken = search.get('table')
  const [orderType, setOrderType] = useState<OrderType>(tableToken ? 'dine_in' : 'pickup')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [zoneId, setZoneId] = useState(zones[0]?.zone_id ?? '')
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [notes, setNotes] = useState('')
  const [passSerial, setPassSerial] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [stubbed, setStubbed] = useState(false)

  useEffect(() => {
    if (!cart.items.length) router.replace(`/shop/${slug}/menu`)
  }, [cart.items.length, router, slug])

  const selectedZone = zones.find(zone => zone.zone_id === zoneId)
  const estimatedTotal = useMemo(
    () => cart.subtotalCents + (orderType === 'delivery' ? (selectedZone?.fee_cents ?? 0) : 0),
    [cart.subtotalCents, orderType, selectedZone]
  )

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setStubbed(false)
    const clientKey = `aro-order-id:${slug}`
    const clientUuid = localStorage.getItem(clientKey) || crypto.randomUUID()
    localStorage.setItem(clientKey, clientUuid)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_slug: slug,
          client_uuid: clientUuid,
          order_type: orderType,
          table_token: orderType === 'dine_in' ? tableToken : null,
          zone_id: orderType === 'delivery' ? zoneId : null,
          guest: { name, phone, email },
          delivery_address: orderType === 'delivery' ? address : null,
          delivery_postal_code: orderType === 'delivery' ? postalCode : null,
          items: cart.items.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity,
            modifier_ids: item.modifiers.map(modifier => modifier.modifier_id),
            notes: item.notes,
          })),
          notes,
          member_pass_serial: passSerial || null,
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setStubbed(body.code === 'PAYMENTS_STUBBED')
        throw new Error(body.error || 'Checkout failed')
      }
      const recentKey = `aro-recent-orders:${slug}`
      const recent = JSON.parse(localStorage.getItem(recentKey) || '[]') as string[]
      localStorage.setItem(
        recentKey,
        JSON.stringify(
          [body.order.order_id, ...recent.filter(id => id !== body.order.order_id)].slice(0, 10)
        )
      )
      localStorage.removeItem(clientKey)
      cart.clearCart()
      window.location.assign(body.redirectUrl)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Checkout failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <section className="rounded-[26px] border border-aro-hairline bg-aro-cream-warm p-5">
          <h2 className="font-display text-2xl text-aro-espresso">How should we serve you?</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {(
              [
                ['pickup', ShoppingBag, 'Pickup'],
                ['dine_in', Coffee, 'Dine in'],
                ['delivery', Truck, 'Delivery'],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                disabled={Boolean(tableToken) && value !== 'dine_in'}
                onClick={() => setOrderType(value)}
                className={`rounded-2xl border px-4 py-4 text-left ${orderType === value ? 'border-aro-terra bg-aro-terra/10' : 'border-aro-hairline bg-white/50'} disabled:opacity-40`}
              >
                <Icon className="h-5 w-5 text-aro-terra" />
                <span className="mt-2 block font-semibold">{label}</span>
              </button>
            ))}
          </div>
          {orderType === 'dine_in' && tableToken ? (
            <p className="mt-3 text-sm text-aro-muted">Your table is linked from the QR code.</p>
          ) : null}
        </section>

        <section className="rounded-[26px] border border-aro-hairline bg-aro-cream-warm p-5">
          <h2 className="font-display text-2xl text-aro-espresso">Your details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Name" required value={name} onChange={setName} placeholder="Your name" />
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="Optional" />
            <div className="sm:col-span-2">
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="Optional receipt email"
              />
            </div>
          </div>
        </section>

        {orderType === 'delivery' ? (
          <section className="rounded-[26px] border border-aro-hairline bg-aro-cream-warm p-5">
            <h2 className="flex items-center gap-2 font-display text-2xl text-aro-espresso">
              <MapPin className="h-5 w-5 text-aro-terra" /> Delivery
            </h2>
            {zones.length ? (
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-semibold">
                  Zone
                  <select
                    value={zoneId}
                    onChange={event => setZoneId(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-aro-hairline bg-white/60 px-4 py-3"
                  >
                    {zones.map(zone => (
                      <option key={zone.zone_id} value={zone.zone_id}>
                        {zone.name} · {formatCents(zone.fee_cents, cart.currency)} · min{' '}
                        {formatCents(zone.min_order_cents, cart.currency)}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Address"
                  required
                  value={address}
                  onChange={setAddress}
                  placeholder="Street address and unit"
                />
                <Field
                  label="Postal code"
                  required
                  value={postalCode}
                  onChange={setPostalCode}
                  placeholder="T2N 1N4"
                />
              </div>
            ) : (
              <p className="mt-3 text-sm text-aro-rose">
                Delivery is not configured for this venue yet.
              </p>
            )}
          </section>
        ) : null}

        <section className="rounded-[26px] border border-aro-hairline bg-aro-cream-warm p-5">
          <Field
            label="Order notes"
            value={notes}
            onChange={setNotes}
            placeholder="Anything the team should know?"
          />
          <div className="mt-4">
            <Field
              label="Loyalty pass serial"
              value={passSerial}
              onChange={setPassSerial}
              placeholder="Optional UUID from your pass"
            />
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-[26px] bg-aro-espresso p-5 text-aro-cream lg:sticky lg:top-24">
        <h2 className="font-display text-2xl">Order summary</h2>
        <div className="mt-4 space-y-3">
          {cart.items.map(item => (
            <div key={item.line_id} className="flex justify-between gap-3 text-sm">
              <span>
                {item.quantity} × {item.name}
              </span>
              <span className="font-mono">
                {formatCents(
                  (item.base_price_cents +
                    item.modifiers.reduce((sum, modifier) => sum + modifier.price_delta_cents, 0)) *
                    item.quantity,
                  cart.currency
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-5 border-t border-aro-cream/15 pt-4">
          <div className="flex justify-between text-sm text-aro-cream/65">
            <span>Estimated total</span>
            <span className="font-mono">{formatCents(estimatedTotal, cart.currency)}</span>
          </div>
          <p className="mt-2 text-xs text-aro-cream/50">
            Tax and final pricing are securely recalculated before payment.
          </p>
        </div>
        {error ? (
          <div
            className={`mt-4 rounded-2xl p-3 text-sm ${stubbed ? 'bg-aro-saffron/20 text-aro-saffron' : 'bg-aro-rose/20 text-aro-cream'}`}
          >
            {stubbed ? (
              <strong className="mb-1 block font-mono text-[10px] uppercase tracking-wider">
                STUBBED · Payment setup required
              </strong>
            ) : null}
            {error}
          </div>
        ) : null}
        <button
          disabled={submitting || !cart.items.length || (orderType === 'delivery' && !zones.length)}
          className="mt-5 w-full rounded-full bg-aro-terra px-5 py-4 text-sm font-bold text-white disabled:opacity-50"
        >
          {submitting ? 'Securing your order...' : 'Continue to secure payment'}
        </button>
      </aside>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
  type?: string
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-aro-hairline bg-white/60 px-4 py-3 font-normal outline-none focus:border-aro-terra"
      />
    </label>
  )
}
