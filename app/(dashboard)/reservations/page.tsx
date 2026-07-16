'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useTenant } from '@/contexts/TenantContext'

interface ReservationRow {
  reservation_id: string
  guest_name: string
  guest_phone: string
  party_size: number
  status: string
  starts_at: string
  duration_minutes: number
  notes: string | null
  table_id: string | null
  source: string
}

interface WaitlistRow {
  waitlist_id: string
  guest_name: string
  guest_phone: string
  party_size: number
  status: string
  notes: string | null
  joined_at: string
}

const RES_STATUSES = ['all', 'confirmed', 'seated', 'completed', 'no_show', 'canceled']
const LEGAL: Record<string, string[]> = {
  confirmed: ['seated', 'canceled', 'no_show'],
  seated: ['completed', 'canceled'],
  completed: [],
  no_show: [],
  canceled: [],
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type DayKey = (typeof DAY_KEYS)[number]

const EMPTY_HOURS: Record<DayKey, [string, string] | null> = {
  mon: ['08:00', '20:00'],
  tue: ['08:00', '20:00'],
  wed: ['08:00', '20:00'],
  thu: ['08:00', '20:00'],
  fri: ['08:00', '20:00'],
  sat: ['08:00', '20:00'],
  sun: null,
}

export default function ReservationsPage() {
  const { selectedTenant } = useTenant()
  const [tab, setTab] = useState<'bookings' | 'waitlist' | 'hours'>('bookings')
  const [status, setStatus] = useState('all')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<ReservationRow[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([])
  const [timezone, setTimezone] = useState('UTC')
  const [hoursConfigured, setHoursConfigured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [hoursDraft, setHoursDraft] = useState<Record<DayKey, [string, string] | null>>({
    ...EMPTY_HOURS,
  })
  const [savingHours, setSavingHours] = useState(false)

  const load = useCallback(async () => {
    if (!selectedTenant) return
    setLoading(true)
    const venueId = selectedTenant.tenant_id
    const [resBookings, resWait] = await Promise.all([
      fetch(`/api/reservations?venue_id=${venueId}&date=${date}&status=${status}`),
      fetch(`/api/waitlist?venue_id=${venueId}`),
    ])
    if (resBookings.ok) {
      const body = await resBookings.json()
      setRows(body.reservations ?? [])
      setTimezone(body.timezone || 'UTC')
      setHoursConfigured(body.hours_configured !== false)
    } else toast.error('Failed to load reservations')
    if (resWait.ok) {
      const body = await resWait.json()
      setWaitlist(body.entries ?? [])
    }
    setLoading(false)
  }, [selectedTenant, date, status])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selectedTenant || tab !== 'hours') return
    void (async () => {
      const res = await fetch(`/api/clients/${selectedTenant.tenant_id}`)
      if (!res.ok) return
      const body = await res.json()
      const cfg = body.client?.reservation_config
      if (cfg?.hours && typeof cfg.hours === 'object') {
        setHoursDraft({ ...EMPTY_HOURS, ...cfg.hours })
      }
    })()
  }, [selectedTenant, tab])

  async function setReservationStatus(id: string, next: string) {
    const res = await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (!res.ok) {
      toast.error((await res.json()).error || 'Update failed')
      return
    }
    toast.success(`Marked ${next.replace('_', ' ')}`)
    await load()
  }

  async function setWaitlistStatus(id: string, next: string) {
    const res = await fetch(`/api/waitlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (!res.ok) {
      toast.error((await res.json()).error || 'Update failed')
      return
    }
    toast.success(`Waitlist → ${next}`)
    await load()
  }

  async function saveHours() {
    if (!selectedTenant) return
    setSavingHours(true)
    try {
      const res = await fetch(`/api/clients/${selectedTenant.tenant_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservation_config: {
            slot_minutes: 30,
            min_party: 1,
            max_party: 8,
            max_advance_days: 30,
            buffer_minutes: 15,
            default_duration_minutes: 90,
            hours: hoursDraft,
          },
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      toast.success('Booking hours saved')
      setHoursConfigured(true)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingHours(false)
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ReservationRow[]>()
    for (const row of rows) {
      const label = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(row.starts_at))
      const list = map.get(label) ?? []
      list.push(row)
      map.set(label, list)
    }
    return Array.from(map.entries())
  }, [rows, timezone])

  return (
    <main className="min-h-full bg-aro-cream p-4 text-aro-ink sm:p-7">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[30px] bg-aro-espresso p-7 text-aro-cream">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terracotta">
            Floor / Bookings
          </p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl">Reservations</h1>
              <p className="mt-2 text-aro-cream/60">
                Day view, waitlist, and booking hours — times in {timezone}.
              </p>
            </div>
            <button onClick={() => void load()} className="rounded-full bg-aro-cream/10 p-3">
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </header>

        {!hoursConfigured ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-aro-clay bg-aro-cream-warm p-5">
            <p className="font-display text-xl text-aro-espresso">Set booking hours to go live</p>
            <p className="mt-1 text-sm text-aro-muted">
              Guests see “hasn&apos;t opened online bookings yet” until hours are configured.
            </p>
            <button
              onClick={() => setTab('hours')}
              className="mt-3 rounded-full bg-aro-terra px-4 py-2 text-sm font-bold text-white"
            >
              Open booking hours
            </button>
          </div>
        ) : null}

        <div className="my-5 flex flex-wrap gap-2">
          {(
            [
              ['bookings', 'Bookings'],
              ['waitlist', 'Waitlist'],
              ['hours', 'Booking hours'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                tab === key ? 'bg-aro-terra text-white' : 'bg-aro-cream-warm'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'bookings' ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="rounded-full border border-aro-hairline bg-white px-4 py-2 font-mono text-sm"
              />
              <div className="flex gap-2 overflow-x-auto">
                {RES_STATUSES.map(value => (
                  <button
                    key={value}
                    onClick={() => setStatus(value)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold capitalize ${
                      status === value ? 'bg-aro-terra text-white' : 'bg-aro-cream-warm'
                    }`}
                  >
                    {value.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="py-20 text-center text-aro-muted">Loading reservations…</div>
            ) : grouped.length ? (
              <div className="space-y-4">
                {grouped.map(([timeLabel, items]) => (
                  <section
                    key={timeLabel}
                    className="overflow-hidden rounded-[26px] border border-aro-hairline bg-aro-cream-warm"
                  >
                    <div className="border-b border-aro-hairline px-5 py-3">
                      <p className="font-mono text-sm font-bold text-aro-terra">{timeLabel}</p>
                    </div>
                    <div className="divide-y divide-aro-hairline">
                      {items.map(row => {
                        const next = LEGAL[row.status] ?? []
                        return (
                          <article
                            key={row.reservation_id}
                            className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center"
                          >
                            <div>
                              <p className="font-display text-lg text-aro-espresso">
                                {row.guest_name}{' '}
                                <span className="font-mono text-xs text-aro-muted">
                                  party {row.party_size} · #{row.reservation_id.slice(0, 8)}
                                </span>
                              </p>
                              <p className="mt-1 text-xs text-aro-muted">
                                {row.guest_phone}
                                {row.notes ? ` · ${row.notes}` : ''}
                              </p>
                              <span className="mt-2 inline-block rounded-full bg-aro-sand px-3 py-1 text-xs font-semibold capitalize">
                                {row.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {next.includes('seated') ? (
                                <ActionBtn
                                  onClick={() =>
                                    void setReservationStatus(row.reservation_id, 'seated')
                                  }
                                >
                                  Seat
                                </ActionBtn>
                              ) : null}
                              {next.includes('completed') ? (
                                <ActionBtn
                                  onClick={() =>
                                    void setReservationStatus(row.reservation_id, 'completed')
                                  }
                                >
                                  Complete
                                </ActionBtn>
                              ) : null}
                              {next.includes('no_show') ? (
                                <ActionBtn
                                  onClick={() =>
                                    void setReservationStatus(row.reservation_id, 'no_show')
                                  }
                                >
                                  No-show
                                </ActionBtn>
                              ) : null}
                              {next.includes('canceled') ? (
                                <ActionBtn
                                  muted
                                  onClick={() =>
                                    void setReservationStatus(row.reservation_id, 'canceled')
                                  }
                                >
                                  Cancel
                                </ActionBtn>
                              ) : null}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="rounded-[26px] border border-dashed border-aro-clay bg-aro-cream-warm py-20 text-center">
                <CalendarDays className="mx-auto h-9 w-9 text-aro-terra" />
                <p className="mt-3 text-aro-muted">No reservations for this day.</p>
              </div>
            )}
          </>
        ) : null}

        {tab === 'waitlist' ? (
          loading ? (
            <div className="py-20 text-center text-aro-muted">Loading waitlist…</div>
          ) : waitlist.length ? (
            <div className="overflow-hidden rounded-[26px] border border-aro-hairline bg-aro-cream-warm">
              <div className="divide-y divide-aro-hairline">
                {waitlist.map(entry => (
                  <article
                    key={entry.waitlist_id}
                    className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="font-display text-lg text-aro-espresso">
                        {entry.guest_name}{' '}
                        <span className="font-mono text-xs text-aro-muted">
                          party {entry.party_size}
                        </span>
                      </p>
                      <p className="text-xs text-aro-muted">{entry.guest_phone}</p>
                      <span className="mt-2 inline-block rounded-full bg-aro-sand px-3 py-1 text-xs font-semibold capitalize">
                        {entry.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {entry.status === 'waiting' ? (
                        <ActionBtn
                          onClick={() => void setWaitlistStatus(entry.waitlist_id, 'notified')}
                        >
                          Notify
                        </ActionBtn>
                      ) : null}
                      {entry.status === 'waiting' || entry.status === 'notified' ? (
                        <ActionBtn
                          onClick={() => void setWaitlistStatus(entry.waitlist_id, 'seated')}
                        >
                          Seat
                        </ActionBtn>
                      ) : null}
                      {entry.status === 'waiting' || entry.status === 'notified' ? (
                        <ActionBtn
                          muted
                          onClick={() => void setWaitlistStatus(entry.waitlist_id, 'canceled')}
                        >
                          Cancel
                        </ActionBtn>
                      ) : null}
                      {entry.status !== 'expired' ? (
                        <ActionBtn
                          muted
                          onClick={() => void setWaitlistStatus(entry.waitlist_id, 'expired')}
                        >
                          Expire
                        </ActionBtn>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[26px] border border-dashed border-aro-clay bg-aro-cream-warm py-20 text-center text-aro-muted">
              No active waitlist entries today.
            </div>
          )
        ) : null}

        {tab === 'hours' ? (
          <section className="rounded-[26px] border border-aro-hairline bg-aro-cream-warm p-5">
            <h2 className="font-display text-2xl text-aro-espresso">Booking hours</h2>
            <p className="mt-1 text-sm text-aro-muted">
              Weekly window guests can book (venue-local). Closed days return no slots.
            </p>
            <div className="mt-5 space-y-3">
              {DAY_KEYS.map(day => {
                const closed = hoursDraft[day] == null
                const open = hoursDraft[day]?.[0] ?? '08:00'
                const close = hoursDraft[day]?.[1] ?? '20:00'
                return (
                  <div
                    key={day}
                    className="grid items-center gap-3 rounded-2xl bg-white/60 p-3 sm:grid-cols-[80px_1fr_1fr_auto]"
                  >
                    <span className="font-mono text-xs uppercase text-aro-muted">{day}</span>
                    <input
                      type="time"
                      disabled={closed}
                      value={open}
                      onChange={e =>
                        setHoursDraft(h => ({
                          ...h,
                          [day]: closed ? null : [e.target.value, close],
                        }))
                      }
                      className="rounded-xl border px-3 py-2 font-mono text-sm disabled:opacity-40"
                    />
                    <input
                      type="time"
                      disabled={closed}
                      value={close}
                      onChange={e =>
                        setHoursDraft(h => ({
                          ...h,
                          [day]: closed ? null : [open, e.target.value],
                        }))
                      }
                      className="rounded-xl border px-3 py-2 font-mono text-sm disabled:opacity-40"
                    />
                    <label className="flex items-center gap-2 text-xs text-aro-muted">
                      <input
                        type="checkbox"
                        checked={closed}
                        onChange={e =>
                          setHoursDraft(h => ({
                            ...h,
                            [day]: e.target.checked ? null : [open, close],
                          }))
                        }
                      />
                      Closed
                    </label>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => void saveHours()}
              disabled={savingHours}
              className="mt-5 rounded-full bg-aro-terra px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {savingHours ? 'Saving…' : 'Save booking hours'}
            </button>
          </section>
        ) : null}
      </div>
    </main>
  )
}

function ActionBtn({
  children,
  onClick,
  muted,
}: {
  children: React.ReactNode
  onClick: () => void
  muted?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
        muted ? 'bg-aro-sand text-aro-espresso' : 'bg-aro-terra text-white'
      }`}
    >
      {children}
    </button>
  )
}
