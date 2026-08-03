'use client'

import { useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { toast } from 'sonner'
import { AlertTriangle, Download, Info, Loader2 } from 'lucide-react'
import { formatCents } from '@/lib/money'

type Basis = 'hours' | 'equal' | 'manual'

interface RosterMember {
  membershipId: string
  fullName: string | null
  role: string
  countedMinutes: number
}

interface ReportRow {
  shiftId: string
  membershipId: string
  fullName: string | null
  role: string
  startedAt: string
  endedAt: string
  countedMinutes: number
  tipCents: number
}

interface ShiftWarning {
  shiftId: string
  membershipId: string
  fullName: string | null
  startedAt: string
}

interface ReportOk {
  ok: true
  poolCents: number
  excludedCanceledCents: number
  excludedCanceledCount: number
  excludedRefundedCents: number
  excludedRefundedCount: number
  rows: ReportRow[]
  openShiftWarnings: ShiftWarning[]
  overlapWarnings: ShiftWarning[]
  periodOngoing: boolean
  computedAt: string
}

type ReportResult =
  | ReportOk
  | { ok: false; reason: 'NO_MEASURABLE_HOURS' | 'NO_MANUAL_WEIGHTS' | 'NO_SHIFTS_IN_PERIOD' }
  | { ok: false; reason: 'ROSTER_NEEDED'; roster: RosterMember[] }

function defaultPeriod() {
  const end = new Date()
  const start = new Date(end.getTime() - 7 * 86400000)
  const toLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return { start: toLocal(start), end: toLocal(end) }
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const REFUSAL_MESSAGES: Record<string, string> = {
  NO_MEASURABLE_HOURS:
    'No measurable hours were recorded in this period. Choose the equal or manual basis, or correct the shifts in the time clock.',
  NO_MANUAL_WEIGHTS: 'Give at least one person a nonzero share before computing.',
  NO_SHIFTS_IN_PERIOD:
    'This period has pooled tips but no recorded shifts — nothing can be allocated.',
}

export default function TipsPage() {
  const { selectedTenant } = useTenant()
  const initial = defaultPeriod()
  const [periodStart, setPeriodStart] = useState(initial.start)
  const [periodEnd, setPeriodEnd] = useState(initial.end)
  const [basis, setBasis] = useState<Basis>('hours')
  const [includeOwnerManager, setIncludeOwnerManager] = useState<boolean | null>(null)
  const [roster, setRoster] = useState<RosterMember[] | null>(null)
  const [manualWeights, setManualWeights] = useState<Record<string, number>>({})
  const [result, setResult] = useState<ReportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  function buildParams(includeManualWeights: boolean) {
    if (!selectedTenant || includeOwnerManager === null) return null
    const start = new Date(periodStart)
    const end = new Date(periodEnd)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null
    const params = new URLSearchParams({
      venue_id: selectedTenant.tenant_id,
      basis,
      include_owner_manager: String(includeOwnerManager),
      period_start: start.toISOString(),
      period_end: end.toISOString(),
    })
    if (basis === 'manual' && includeManualWeights) {
      params.set('manual_weights', JSON.stringify(manualWeights))
    }
    return params
  }

  function exportHref(): string | null {
    const params = buildParams(true)
    if (!params) return null
    return `/api/tips/export?${params.toString()}`
  }

  async function runReport(includeManualWeights: boolean) {
    const params = buildParams(includeManualWeights)
    if (!params) {
      toast.error('Pick a valid period and an owner/manager choice first')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/tips/allocation?${params.toString()}`)
      const data = (await res.json()) as ReportResult
      if (!res.ok && !('reason' in data)) {
        throw new Error('error' in data ? String(data.error) : 'Failed to compute report')
      }
      if (!data.ok && data.reason === 'ROSTER_NEEDED') {
        setRoster(data.roster)
        setManualWeights(Object.fromEntries(data.roster.map(m => [m.membershipId, 0])))
        setResult(null)
        return
      }
      setRoster(null)
      setResult(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to compute report')
    } finally {
      setLoading(false)
    }
  }

  async function saveReport() {
    if (!selectedTenant || includeOwnerManager === null || !result?.ok) return
    setSaving(true)
    try {
      const start = new Date(periodStart)
      const end = new Date(periodEnd)
      const res = await fetch('/api/tips/allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: selectedTenant.tenant_id,
          basis,
          include_owner_manager: includeOwnerManager,
          period_start: start.toISOString(),
          period_end: end.toISOString(),
          manual_weights: basis === 'manual' ? manualWeights : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      toast.success('Allocation saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!selectedTenant) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-display font-bold text-aro-ink mb-2">No client selected</h2>
        <p className="text-aro-ink-soft">Please select a client from the dropdown above.</p>
      </div>
    )
  }

  const canRun = includeOwnerManager !== null && periodStart && periodEnd

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-aro-ink">Tip allocation</h1>
        <p className="text-aro-ink-soft mt-1">
          See how a period&apos;s pooled tips would divide among staff.
        </p>
      </div>

      <div className="rounded-xl border border-aro-saffron/40 bg-aro-saffron/10 px-4 py-3 text-sm text-aro-ink flex gap-2">
        <Info className="w-5 h-5 flex-shrink-0 text-aro-terracotta" />
        <span>
          <strong>This is a calculation aid, not a payroll record.</strong> No money moves when you
          save it — it&apos;s a snapshot you can hand to your accountant.
        </span>
      </div>

      <div className="bg-white border border-aro-hairline rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-aro-ink mb-1">Period start</label>
            <input
              type="datetime-local"
              value={periodStart}
              onChange={e => {
                setPeriodStart(e.target.value)
                setRoster(null)
                setResult(null)
              }}
              className="w-full px-3 py-2 rounded-lg border border-aro-hairline focus:ring-2 focus:ring-aro-terra outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-aro-ink mb-1">Period end</label>
            <input
              type="datetime-local"
              value={periodEnd}
              onChange={e => {
                setPeriodEnd(e.target.value)
                setRoster(null)
                setResult(null)
              }}
              className="w-full px-3 py-2 rounded-lg border border-aro-hairline focus:ring-2 focus:ring-aro-terra outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-aro-ink mb-1">Basis</label>
          <div className="flex gap-2">
            {(['hours', 'equal', 'manual'] as Basis[]).map(b => (
              <button
                key={b}
                onClick={() => {
                  setBasis(b)
                  setRoster(null)
                  setResult(null)
                }}
                className={
                  basis === b
                    ? 'px-4 py-2 rounded-lg bg-aro-terra text-white text-sm font-medium capitalize'
                    : 'px-4 py-2 rounded-lg border border-aro-hairline text-aro-ink-soft text-sm font-medium capitalize'
                }
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-aro-ink mb-1">
            Owner &amp; manager shifts
          </label>
          <p className="text-xs text-aro-ink-soft mb-2">
            Tip-pool eligibility rules for supervisors vary by jurisdiction — confirm with your
            accountant. There is no default; pick one before running the report.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIncludeOwnerManager(true)
                setRoster(null)
                setResult(null)
              }}
              className={
                includeOwnerManager === true
                  ? 'px-4 py-2 rounded-lg bg-aro-terra text-white text-sm font-medium'
                  : 'px-4 py-2 rounded-lg border border-aro-hairline text-aro-ink-soft text-sm font-medium'
              }
            >
              Include
            </button>
            <button
              onClick={() => {
                setIncludeOwnerManager(false)
                setRoster(null)
                setResult(null)
              }}
              className={
                includeOwnerManager === false
                  ? 'px-4 py-2 rounded-lg bg-aro-terra text-white text-sm font-medium'
                  : 'px-4 py-2 rounded-lg border border-aro-hairline text-aro-ink-soft text-sm font-medium'
              }
            >
              Exclude
            </button>
          </div>
        </div>

        <button
          onClick={() => void runReport(false)}
          disabled={!canRun || loading}
          className="rounded-lg bg-aro-espresso text-aro-cream px-5 py-2.5 font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Compute
        </button>
      </div>

      {roster && (
        <div className="bg-white border border-aro-hairline rounded-xl p-5 space-y-3">
          <h2 className="font-display font-bold text-aro-ink">Manual weights</h2>
          <p className="text-xs text-aro-ink-soft">
            Shares, not dollar amounts — 1 is a normal share, 2 is a double share, 0 excludes
            someone. Only staff with a recorded shift in this period can be allocated.
          </p>
          <div className="space-y-2">
            {roster.map(m => (
              <div key={m.membershipId} className="flex items-center justify-between gap-3">
                <span className="text-sm text-aro-ink">
                  {m.fullName ?? m.membershipId}{' '}
                  <span className="text-aro-ink-soft">
                    ({m.role}, {formatMinutes(m.countedMinutes)})
                  </span>
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={manualWeights[m.membershipId] ?? 0}
                  onChange={e =>
                    setManualWeights({
                      ...manualWeights,
                      [m.membershipId]: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                    })
                  }
                  className="w-24 px-3 py-1.5 rounded-lg border border-aro-hairline text-right"
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => void runReport(true)}
            disabled={loading}
            className="rounded-lg bg-aro-terra text-white px-5 py-2.5 font-medium disabled:opacity-50"
          >
            Compute allocation
          </button>
        </div>
      )}

      {result && !result.ok && result.reason !== 'ROSTER_NEEDED' && (
        <div className="rounded-xl border border-aro-rose/40 bg-aro-rose/10 px-4 py-3 text-sm text-aro-ink">
          {REFUSAL_MESSAGES[result.reason]}
        </div>
      )}

      {result && result.ok && (
        <div className="space-y-4">
          {result.openShiftWarnings.length > 0 && (
            <div className="rounded-xl border border-aro-rose/40 bg-aro-rose/10 px-4 py-3 text-sm text-aro-ink flex gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-aro-terracotta" />
              <div>
                <strong>
                  {result.openShiftWarnings.length} open shift
                  {result.openShiftWarnings.length === 1 ? '' : 's'} excluded
                </strong>{' '}
                — no measurable duration.{' '}
                {!result.periodOngoing && 'Saving is blocked until these are closed or corrected.'}
                <ul className="mt-1 list-disc list-inside">
                  {result.openShiftWarnings.map(w => (
                    <li key={w.shiftId}>
                      {w.fullName ?? w.membershipId} — since{' '}
                      {new Date(w.startedAt).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {result.overlapWarnings.length > 0 && (
            <div className="rounded-xl border border-aro-rose/40 bg-aro-rose/10 px-4 py-3 text-sm text-aro-ink">
              <strong>{result.overlapWarnings.length} overlapping shifts detected</strong> — hours
              may be double-counted. Review in the time clock.
            </div>
          )}

          {(result.excludedCanceledCount > 0 || result.excludedRefundedCount > 0) && (
            <div className="rounded-xl border border-aro-hairline bg-aro-sand/30 px-4 py-3 text-sm text-aro-ink-soft">
              Excluded from this pool: {formatCents(result.excludedCanceledCents)} on{' '}
              {result.excludedCanceledCount} canceled order
              {result.excludedCanceledCount === 1 ? '' : 's'} and{' '}
              {formatCents(result.excludedRefundedCents)} on {result.excludedRefundedCount} refunded
              order{result.excludedRefundedCount === 1 ? '' : 's'}.
            </div>
          )}

          {result.periodOngoing && (
            <div className="rounded-xl border border-aro-hairline bg-aro-sand/30 px-4 py-3 text-sm text-aro-ink-soft">
              Provisional — this period has not ended.
            </div>
          )}

          <div className="bg-white border border-aro-hairline rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-aro-hairline flex items-center justify-between">
              <span className="font-display font-bold text-aro-ink">
                Pool: {formatCents(result.poolCents)}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={exportHref() ?? '#'}
                  className="rounded-lg border border-aro-hairline text-aro-ink px-4 py-2 text-sm font-medium flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </a>
                <button
                  onClick={() => void saveReport()}
                  disabled={saving}
                  className="rounded-lg bg-aro-terra text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save this allocation'}
                </button>
              </div>
            </div>
            {result.rows.length === 0 ? (
              <p className="px-4 py-6 text-center text-aro-ink-soft text-sm">
                No shifts in this period.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-aro-sand/50 text-left text-aro-ink-soft">
                  <tr>
                    <th className="px-4 py-3 font-medium">Staff</th>
                    <th className="px-4 py-3 font-medium">Shift</th>
                    <th className="px-4 py-3 font-medium">Hours</th>
                    <th className="px-4 py-3 font-medium text-right">Tip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-aro-hairline">
                  {result.rows.map(r => (
                    <tr key={r.shiftId}>
                      <td className="px-4 py-3 text-aro-ink font-medium">
                        {r.fullName ?? r.membershipId}
                      </td>
                      <td className="px-4 py-3 text-aro-ink-soft">
                        {new Date(r.startedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-aro-ink-soft">
                        {formatMinutes(r.countedMinutes)}
                      </td>
                      <td className="px-4 py-3 text-right text-aro-ink font-mono">
                        {formatCents(r.tipCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
