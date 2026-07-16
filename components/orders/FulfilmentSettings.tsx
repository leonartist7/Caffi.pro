'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Printer, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { qrSvg } from '@/lib/qr'
import { dollarsToCents, formatCents } from '@/lib/money'

interface TableRow {
  table_id: string
  label: string
  qr_token: string
  capacity?: number
}
interface ZoneRow {
  zone_id: string
  name: string
  fee_cents: number
  min_order_cents: number
  postal_prefixes: string[]
}

export function FulfilmentSettings({ venueId }: { venueId: string }) {
  const [tables, setTables] = useState<TableRow[]>([])
  const [zones, setZones] = useState<ZoneRow[]>([])
  const [tableLabel, setTableLabel] = useState('')
  const [tableCapacity, setTableCapacity] = useState('2')
  const [zone, setZone] = useState({ name: '', fee: '5.00', minimum: '20.00', prefixes: '' })
  const load = useCallback(async () => {
    const res = await fetch(`/api/fulfilment?venue_id=${venueId}`)
    if (res.ok) {
      const body = await res.json()
      setTables(body.tables)
      setZones(body.zones)
    }
  }, [venueId])
  useEffect(() => {
    void load()
  }, [load])
  async function create(kind: 'table' | 'zone') {
    try {
      const payload =
        kind === 'table'
          ? {
              kind,
              venue_id: venueId,
              label: tableLabel,
              capacity: Math.max(1, Number(tableCapacity) || 2),
            }
          : {
              kind,
              venue_id: venueId,
              name: zone.name,
              fee_cents: dollarsToCents(zone.fee),
              min_order_cents: dollarsToCents(zone.minimum),
              postal_prefixes: zone.prefixes
                .split(',')
                .map(value => value.trim().toUpperCase())
                .filter(Boolean),
            }
      const res = await fetch('/api/fulfilment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      if (kind === 'table') {
        setTableLabel('')
        setTableCapacity('2')
      } else setZone({ name: '', fee: '5.00', minimum: '20.00', prefixes: '' })
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save')
    }
  }
  async function remove(kind: 'tables' | 'zones', id: string) {
    await fetch(`/api/fulfilment/${kind}/${id}`, { method: 'DELETE' })
    await load()
  }
  async function updateCapacity(tableId: string, capacity: number) {
    if (!Number.isFinite(capacity) || capacity < 1) return
    const res = await fetch(`/api/fulfilment/tables/${tableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capacity }),
    })
    if (!res.ok) {
      toast.error((await res.json()).error || 'Could not update capacity')
      return
    }
    await load()
  }
  return (
    <section className="mt-7 grid gap-5 lg:grid-cols-2">
      <div className="rounded-[26px] border border-aro-hairline bg-aro-cream-warm p-5">
        <div className="flex justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-aro-muted">Dine in</p>
            <h2 className="font-display text-2xl text-aro-espresso">Tables & QR</h2>
          </div>
          <button onClick={() => window.print()} className="rounded-full bg-aro-sand p-2">
            <Printer className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={tableLabel}
            onChange={event => setTableLabel(event.target.value)}
            placeholder="Table 3"
            className="min-w-0 flex-1 rounded-full border border-aro-hairline px-4"
          />
          <input
            value={tableCapacity}
            onChange={event => setTableCapacity(event.target.value)}
            placeholder="Seats"
            type="number"
            min={1}
            className="w-20 rounded-full border border-aro-hairline px-3 font-mono"
            title="Capacity (seats)"
          />
          <button
            onClick={() => void create('table')}
            className="rounded-full bg-aro-terra p-3 text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {tables.map(table => {
            const path = `/t/${table.qr_token}`
            return (
              <div key={table.table_id} className="rounded-2xl bg-white/60 p-3 text-center">
                <div className="mx-auto w-28" dangerouslySetInnerHTML={{ __html: qrSvg(path) }} />
                <p className="mt-2 font-semibold">{table.label}</p>
                <label className="mt-1 flex items-center justify-center gap-1 text-xs text-aro-muted">
                  Seats
                  <input
                    type="number"
                    min={1}
                    defaultValue={table.capacity ?? 2}
                    onBlur={e =>
                      void updateCapacity(table.table_id, Math.max(1, Number(e.target.value) || 2))
                    }
                    className="w-12 rounded border border-aro-hairline px-1 font-mono text-center"
                  />
                </label>
                <p className="break-all font-mono text-[8px] text-aro-muted">{path}</p>
                <button onClick={() => void remove('tables', table.table_id)}>
                  <Trash2 className="mt-1 h-3.5 w-3.5 text-aro-muted" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
      <div className="rounded-[26px] border border-aro-hairline bg-aro-cream-warm p-5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-aro-muted">Delivery</p>
        <h2 className="font-display text-2xl text-aro-espresso">Zones</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <input
            value={zone.name}
            onChange={event => setZone({ ...zone, name: event.target.value })}
            placeholder="Zone name"
            className="rounded-xl border px-3 py-2"
          />
          <input
            value={zone.prefixes}
            onChange={event => setZone({ ...zone, prefixes: event.target.value })}
            placeholder="T2N, T2P"
            className="rounded-xl border px-3 py-2"
          />
          <input
            value={zone.fee}
            onChange={event => setZone({ ...zone, fee: event.target.value })}
            placeholder="Fee"
            className="rounded-xl border px-3 py-2 font-mono"
          />
          <input
            value={zone.minimum}
            onChange={event => setZone({ ...zone, minimum: event.target.value })}
            placeholder="Minimum"
            className="rounded-xl border px-3 py-2 font-mono"
          />
        </div>
        <button
          onClick={() => void create('zone')}
          className="mt-3 rounded-full bg-aro-terra px-4 py-2 text-sm font-bold text-white"
        >
          Add zone
        </button>
        <div className="mt-4 space-y-2">
          {zones.map(row => (
            <div key={row.zone_id} className="flex justify-between rounded-2xl bg-white/60 p-3">
              <div>
                <p className="font-semibold">{row.name}</p>
                <p className="font-mono text-xs text-aro-muted">
                  {formatCents(row.fee_cents)} · min {formatCents(row.min_order_cents)} ·{' '}
                  {row.postal_prefixes.join(', ')}
                </p>
              </div>
              <button onClick={() => void remove('zones', row.zone_id)}>
                <Trash2 className="h-4 w-4 text-aro-muted" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
