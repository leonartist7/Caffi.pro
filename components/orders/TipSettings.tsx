'use client'

import { useCallback, useEffect, useState } from 'react'
import { HandCoins } from 'lucide-react'
import { toast } from 'sonner'

const STRINGS = {
  heading: 'Tips',
  subheading: 'Dine-in and pickup guests are always asked to tip. Delivery is off by default.',
  toggleLabel: 'Prompt for a tip on delivery orders too',
}

export function TipSettings({ venueId }: { venueId: string }) {
  const [deliveryEnabled, setDeliveryEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/tip-settings?venue_id=${venueId}`)
      if (res.ok) {
        const body = await res.json()
        setDeliveryEnabled(Boolean(body.tip_config?.delivery_enabled))
      }
    } catch {
      toast.error('Could not load tip settings')
    } finally {
      setLoading(false)
    }
  }, [venueId])

  useEffect(() => {
    void load()
  }, [load])

  async function toggle() {
    const next = !deliveryEnabled
    setSaving(true)
    setDeliveryEnabled(next)
    try {
      const res = await fetch('/api/orders/tip-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_id: venueId, delivery_enabled: next }),
      })
      if (!res.ok) {
        setDeliveryEnabled(!next)
        toast.error('Could not save tip settings')
      }
    } catch {
      setDeliveryEnabled(!next)
      toast.error('Could not save tip settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-7 rounded-[26px] border border-aro-hairline bg-aro-cream-warm p-5">
      <div className="flex items-center gap-2">
        <HandCoins className="h-5 w-5 text-aro-terra" />
        <h2 className="font-display text-2xl text-aro-espresso">{STRINGS.heading}</h2>
      </div>
      <p className="mt-1 text-sm text-aro-muted">{STRINGS.subheading}</p>
      <label className="mt-4 flex min-h-[44px] items-center justify-between gap-3 rounded-2xl bg-white/60 px-4 py-3">
        <span className="text-sm font-semibold">{STRINGS.toggleLabel}</span>
        <button
          type="button"
          role="switch"
          aria-checked={deliveryEnabled}
          disabled={loading || saving}
          onClick={() => void toggle()}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            deliveryEnabled ? 'bg-aro-terra' : 'bg-aro-hairline'
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
              deliveryEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </label>
    </section>
  )
}
