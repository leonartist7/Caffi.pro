'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Users } from 'lucide-react'

type Step = 'form' | 'confirmed' | 'waitlist_joined'

export default function ReservePage({ params }: { params: { slug: string } }) {
  const slug = params.slug
  const [clientUuid] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  )
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('form')
  const [confirmation, setConfirmation] = useState<{
    reservation_id: string
    starts_at: string
    party_size: number
    status: string
  } | null>(null)

  // Default date: tomorrow local (guest device) — slots still computed venue-local server-side.
  useEffect(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    const ymd = d.toISOString().slice(0, 10)
    setDate(ymd)
  }, [])

  const loadSlots = useCallback(async () => {
    if (!date || !slug) return
    setError(null)
    setSelectedSlot(null)
    const res = await fetch(
      `/api/reservations/availability?venue_slug=${encodeURIComponent(slug)}&party_size=${partySize}&date=${date}`
    )
    if (!res.ok) {
      setConfigured(false)
      setSlots([])
      return
    }
    const body = (await res.json()) as { configured: boolean; slots: string[] }
    setConfigured(body.configured)
    setSlots(body.slots ?? [])
  }, [date, partySize, slug])

  useEffect(() => {
    void loadSlots()
  }, [loadSlots])

  const slotLabels = useMemo(
    () =>
      slots.map(iso => ({
        iso,
        label: new Date(iso).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }),
      })),
    [slots]
  )

  async function submitBooking() {
    if (!selectedSlot) {
      setError('Pick a time slot.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_slug: slug,
          client_uuid: clientUuid,
          guest_name: guestName,
          guest_phone: guestPhone,
          guest_email: guestEmail || undefined,
          party_size: partySize,
          starts_at: selectedSlot,
          notes: notes || undefined,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Booking failed')
      setConfirmation(body)
      setStep('confirmed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed')
    } finally {
      setBusy(false)
    }
  }

  async function joinWaitlist() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_slug: slug,
          client_uuid: clientUuid,
          guest_name: guestName,
          guest_phone: guestPhone,
          party_size: partySize,
          notes: notes || undefined,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Could not join waitlist')
      setStep('waitlist_joined')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join waitlist')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'confirmed' && confirmation) {
    return (
      <main className="min-h-screen bg-aro-cream px-4 py-10 text-aro-ink">
        <div className="mx-auto max-w-md rounded-[28px] border border-aro-hairline bg-aro-cream-warm p-8 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-aro-terra">
            Confirmed
          </p>
          <h1 className="mt-3 font-display text-3xl text-aro-espresso">You&apos;re booked</h1>
          <p className="mt-4 text-aro-muted">
            Party of{' '}
            <span className="font-mono font-bold text-aro-espresso">{confirmation.party_size}</span>
          </p>
          <p className="mt-2 font-mono text-lg text-aro-terra">
            {new Date(confirmation.starts_at).toLocaleString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
          <p className="mt-6 text-sm text-aro-muted">
            Reference <span className="font-mono">#{confirmation.reservation_id.slice(0, 8)}</span>
          </p>
        </div>
      </main>
    )
  }

  if (step === 'waitlist_joined') {
    return (
      <main className="min-h-screen bg-aro-cream px-4 py-10 text-aro-ink">
        <div className="mx-auto max-w-md rounded-[28px] border border-aro-hairline bg-aro-cream-warm p-8 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-aro-terra">
            Waitlist
          </p>
          <h1 className="mt-3 font-display text-3xl text-aro-espresso">You&apos;re on the list</h1>
          <p className="mt-4 text-sm text-aro-muted">
            Staff will seat you when a table opens. Same-day only.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-aro-cream px-4 py-8 text-aro-ink">
      <div className="mx-auto max-w-md space-y-6">
        <header className="rounded-[28px] bg-aro-espresso px-6 py-8 text-aro-cream">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terracotta">
            Reserve a table
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight">Book your visit</h1>
          <p className="mt-3 text-sm text-aro-cream/65">One form. One thumb. No account needed.</p>
        </header>

        {configured === false ? (
          <div className="rounded-[24px] border border-dashed border-aro-clay bg-aro-cream-warm p-6 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-aro-terra" />
            <p className="mt-3 font-display text-xl text-aro-espresso">
              This café hasn&apos;t opened online bookings yet
            </p>
            <p className="mt-2 text-sm text-aro-muted">Check back once they set their hours.</p>
          </div>
        ) : (
          <form
            className="space-y-4 rounded-[24px] border border-aro-hairline bg-aro-cream-warm p-5"
            onSubmit={e => {
              e.preventDefault()
              void submitBooking()
            }}
          >
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-aro-muted">
                Name
              </span>
              <input
                required
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-aro-hairline bg-white px-4 py-3"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-aro-muted">
                Phone
              </span>
              <input
                required
                type="tel"
                value={guestPhone}
                onChange={e => setGuestPhone(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-aro-hairline bg-white px-4 py-3"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-aro-muted">
                Email (optional)
              </span>
              <input
                type="email"
                value={guestEmail}
                onChange={e => setGuestEmail(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-aro-hairline bg-white px-4 py-3"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-aro-muted">
                <Users className="mr-1 inline h-3 w-3" />
                Party size
              </span>
              <input
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={e => setPartySize(Number(e.target.value) || 1)}
                className="mt-1 w-full rounded-2xl border border-aro-hairline bg-white px-4 py-3 font-mono"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-aro-muted">
                Date
              </span>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-aro-hairline bg-white px-4 py-3 font-mono"
              />
            </label>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-aro-muted">
                Time slot
              </p>
              {slotLabels.length === 0 ? (
                <div className="mt-2 rounded-2xl border border-dashed border-aro-clay p-4 text-sm text-aro-muted">
                  No tables open for this day and party size.
                  {guestName && guestPhone ? (
                    <button
                      type="button"
                      onClick={() => void joinWaitlist()}
                      disabled={busy}
                      className="mt-3 block w-full rounded-full bg-aro-sand py-3 text-sm font-bold text-aro-espresso"
                    >
                      No tables right now? Join the waitlist
                    </button>
                  ) : (
                    <p className="mt-2 text-xs">Enter name and phone to join the waitlist.</p>
                  )}
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {slotLabels.map(s => (
                    <button
                      key={s.iso}
                      type="button"
                      onClick={() => setSelectedSlot(s.iso)}
                      className={`rounded-full px-3 py-2 font-mono text-sm ${
                        selectedSlot === s.iso
                          ? 'bg-aro-terra text-white'
                          : 'bg-white text-aro-espresso border border-aro-hairline'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-aro-muted">
                Notes (optional)
              </span>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-2xl border border-aro-hairline bg-white px-4 py-3"
              />
            </label>

            {error ? <p className="text-sm text-rose-700">{error}</p> : null}

            <button
              type="submit"
              disabled={busy || !selectedSlot}
              className="w-full rounded-full bg-aro-terra py-4 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? 'Booking…' : 'Confirm reservation'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
