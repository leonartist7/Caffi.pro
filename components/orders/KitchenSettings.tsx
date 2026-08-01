'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChefHat } from 'lucide-react'
import { toast } from 'sonner'
import { DEFAULT_KITCHEN_CONFIG } from '@/lib/orders/kitchen-config'

const STRINGS = {
  heading: 'Kitchen display',
  subheading: 'When a ticket changes colour on /kitchen, in minutes since it was placed.',
  warnLabel: 'Warn (sage → saffron)',
  urgentLabel: 'Urgent (saffron → terra)',
  save: 'Save',
  saved: 'Kitchen thresholds saved',
  invalid: 'Urgent must be greater than warn, both positive',
}

export function KitchenSettings({ venueId }: { venueId: string }) {
  const [warnAfterMinutes, setWarnAfterMinutes] = useState(
    String(DEFAULT_KITCHEN_CONFIG.warnAfterMinutes)
  )
  const [urgentAfterMinutes, setUrgentAfterMinutes] = useState(
    String(DEFAULT_KITCHEN_CONFIG.urgentAfterMinutes)
  )
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/kitchen-settings?venue_id=${venueId}`)
    if (res.ok) {
      const body = await res.json()
      setWarnAfterMinutes(
        String(body.kitchen_config?.warnAfterMinutes ?? DEFAULT_KITCHEN_CONFIG.warnAfterMinutes)
      )
      setUrgentAfterMinutes(
        String(body.kitchen_config?.urgentAfterMinutes ?? DEFAULT_KITCHEN_CONFIG.urgentAfterMinutes)
      )
    }
  }, [venueId])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    const warn = Number(warnAfterMinutes)
    const urgent = Number(urgentAfterMinutes)
    if (!(warn > 0) || !(urgent > warn)) {
      toast.error(STRINGS.invalid)
      return
    }
    setSaving(true)
    const res = await fetch('/api/orders/kitchen-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venue_id: venueId,
        warnAfterMinutes: warn,
        urgentAfterMinutes: urgent,
      }),
    })
    if (res.ok) toast.success(STRINGS.saved)
    else toast.error((await res.json()).error || 'Could not save')
    setSaving(false)
  }

  return (
    <section className="mt-7 rounded-[26px] border border-aro-hairline bg-aro-cream-warm p-5">
      <div className="flex items-center gap-2">
        <ChefHat className="h-5 w-5 text-aro-terra" />
        <h2 className="font-display text-2xl text-aro-espresso">{STRINGS.heading}</h2>
      </div>
      <p className="mt-1 text-sm text-aro-muted">{STRINGS.subheading}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-aro-ink">
          {STRINGS.warnLabel}
          <input
            type="number"
            min={1}
            value={warnAfterMinutes}
            onChange={e => setWarnAfterMinutes(e.target.value)}
            className="mt-2 min-h-[44px] w-full rounded-2xl border border-aro-hairline bg-white/60 px-4 py-3 font-mono outline-none focus:border-aro-terra"
          />
        </label>
        <label className="block text-sm font-semibold text-aro-ink">
          {STRINGS.urgentLabel}
          <input
            type="number"
            min={1}
            value={urgentAfterMinutes}
            onChange={e => setUrgentAfterMinutes(e.target.value)}
            className="mt-2 min-h-[44px] w-full rounded-2xl border border-aro-hairline bg-white/60 px-4 py-3 font-mono outline-none focus:border-aro-terra"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="mt-4 min-h-[44px] rounded-full bg-aro-terra px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {STRINGS.save}
      </button>
    </section>
  )
}
