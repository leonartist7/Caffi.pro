'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react'
import {
  parseKitchenConfig,
  ticketUrgency,
  URGENCY_CLASSES,
  type KitchenConfig,
} from '@/lib/orders/kitchen-config'

const STRINGS = {
  title: 'Kitchen',
  empty: 'No active tickets. All caught up.',
  live: 'Live · polling every 3s',
  reconnecting: 'Reconnecting…',
  unmute: 'Unmute new-order chime',
  mute: 'Mute chime',
  cancel: 'Cancel',
}

const POLL_MS = 3000

interface QueueOrder {
  order_id: string
  status: string
  order_type: string
  guest_name: string
  placed_at: string
  tip_cents: number
  total_cents: number
  items: Array<{
    order_item_id: string
    name_snapshot: string
    quantity: number
    notes: string | null
    modifiers: Array<{ id: string; name_snapshot: string }>
  }>
}

const NEXT: Record<string, string> = {
  paid: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  out_for_delivery: 'completed',
}

function ticketAgeLabel(placedAt: string, nowMs: number): string {
  const minutes = Math.max(0, Math.floor((nowMs - new Date(placedAt).getTime()) / 60000))
  return `${minutes}m`
}

export function KitchenScreen({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [orders, setOrders] = useState<QueueOrder[]>([])
  const [kitchenConfig, setKitchenConfig] = useState<KitchenConfig>(parseKitchenConfig(null))
  const [busy, setBusy] = useState('')
  const [live, setLive] = useState(true)
  const [muted, setMuted] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const knownIdsRef = useRef<Set<string>>(new Set())
  const audioCtxRef = useRef<AudioContext | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  /**
   * Browsers only allow audio after a genuine user gesture. Creating (or
   * resuming) the AudioContext must happen synchronously inside the click
   * handler that unmutes — not lazily inside the poll callback that fires
   * the actual chime — or some browsers silently refuse to ever play it.
   */
  const primeAudio = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = audioCtxRef.current ?? new AudioCtx()
      audioCtxRef.current = ctx
      if (ctx.state === 'suspended') void ctx.resume()
    } catch {
      // No Web Audio support — chime stays silently unavailable.
    }
  }, [])

  const playChime = useCallback(() => {
    if (muted) return
    const ctx = audioCtxRef.current
    if (!ctx) return
    try {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + 0.6)
    } catch {
      // Autoplay/audio failures are non-fatal — a silent kitchen screen is
      // still a working kitchen screen, just without the chime.
    }
  }, [muted])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/counter/orders')
      if (res.status === 401) return onSessionExpired()
      if (!res.ok) {
        setLive(false)
        return
      }
      const body = await res.json()
      const nextOrders = (body.orders ?? []) as QueueOrder[]
      const nextIds = new Set(nextOrders.map(o => o.order_id))
      const hasNewOrder = [...nextIds].some(id => !knownIdsRef.current.has(id))
      if (hasNewOrder && knownIdsRef.current.size > 0) playChime()
      knownIdsRef.current = nextIds
      setOrders(nextOrders)
      if (body.kitchen_config) setKitchenConfig(body.kitchen_config)
      setLive(true)
    } catch {
      setLive(false)
    }
  }, [onSessionExpired, playChime])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), POLL_MS)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => {
    const clockTimer = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(clockTimer)
  }, [])

  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch {
        // No wake lock support / permission — display still functions.
      }
    }
    void requestWakeLock()
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') void requestWakeLock()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void wakeLockRef.current?.release()
    }
  }, [])

  async function advance(order: QueueOrder, status: string) {
    setBusy(order.order_id)
    const res = await fetch(`/api/counter/orders/${order.order_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.status === 401) onSessionExpired()
    await load()
    setBusy('')
  }

  return (
    <div className="min-h-screen bg-aro-cream p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-4xl font-bold text-aro-espresso">{STRINGS.title}</h1>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
              live ? 'bg-aro-sage/20 text-aro-ink' : 'bg-aro-rose/20 text-aro-ink'
            }`}
          >
            {live ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {live ? STRINGS.live : STRINGS.reconnecting}
          </span>
          <button
            type="button"
            onClick={() => {
              primeAudio()
              setMuted(m => !m)
            }}
            aria-label={muted ? STRINGS.unmute : STRINGS.mute}
            className="flex min-h-[44px] items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-aro-ink"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            {muted ? STRINGS.unmute : STRINGS.mute}
          </button>
        </div>
      </header>

      {orders.length === 0 ? (
        <p className="py-24 text-center text-2xl text-aro-muted">{STRINGS.empty}</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map(order => {
            const urgency = ticketUrgency(order.placed_at, kitchenConfig, now)
            const next =
              order.status === 'ready' && order.order_type === 'delivery'
                ? 'out_for_delivery'
                : NEXT[order.status]
            return (
              <article
                key={order.order_id}
                className={`rounded-3xl border-2 p-5 ${URGENCY_CLASSES[urgency]}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-2xl font-bold">{order.guest_name || 'Guest'}</p>
                    <p className="text-sm uppercase tracking-wide opacity-70">
                      {order.order_type.replace('_', ' ')} · {order.status.replace('_', ' ')}
                    </p>
                  </div>
                  <span className="rounded-full bg-black/10 px-3 py-1 font-mono text-lg font-bold">
                    {ticketAgeLabel(order.placed_at, now)}
                  </span>
                </div>
                <div className="my-4 space-y-2 text-lg">
                  {order.items.map(item => (
                    <div key={item.order_item_id}>
                      <p className="font-semibold">
                        {item.quantity} × {item.name_snapshot}
                      </p>
                      {item.modifiers.length ? (
                        <p className="text-sm opacity-70">
                          {item.modifiers.map(m => m.name_snapshot).join(' · ')}
                        </p>
                      ) : null}
                      {item.notes ? (
                        <p className="text-sm italic opacity-80">{item.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  {next ? (
                    <button
                      disabled={busy === order.order_id}
                      onClick={() => void advance(order, next)}
                      className="min-h-[56px] rounded-2xl bg-aro-espresso py-4 text-lg font-bold text-aro-cream disabled:opacity-60"
                    >
                      {next.replace('_', ' ')}
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    disabled={busy === order.order_id}
                    onClick={() => void advance(order, 'canceled')}
                    className="min-h-[56px] rounded-2xl border-2 border-aro-rose px-5 text-base font-semibold disabled:opacity-60"
                  >
                    {STRINGS.cancel}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
