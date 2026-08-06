'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTenant } from '@/contexts/TenantContext'
import { toast } from 'sonner'
import { Clock, ArrowLeft, Plus } from 'lucide-react'

interface ShiftRow {
  shiftId: string
  membershipId: string
  fullName: string | null
  startedAt: string
  endedAt: string | null
  source: 'counter' | 'manual'
  note: string | null
  durationMinutes: number | null
  isStale: boolean
}

interface StaffOption {
  staff_id: string
  full_name: string | null
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** Local-datetime-input value ("YYYY-MM-DDTHH:mm") from an ISO instant. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ShiftsPage() {
  const { selectedTenant } = useTenant()
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([])
  const [closeTarget, setCloseTarget] = useState<ShiftRow | null>(null)
  const [closeEndedAt, setCloseEndedAt] = useState('')
  const [closeNote, setCloseNote] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    membership_id: '',
    started_at: '',
    ended_at: '',
    note: '',
  })

  const fetchShifts = async () => {
    if (!selectedTenant) return
    setLoading(true)
    try {
      const res = await fetch(`/api/shifts?venue_id=${selectedTenant.tenant_id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load shifts')
      setShifts(data.shifts ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load shifts')
    } finally {
      setLoading(false)
    }
  }

  const fetchStaffOptions = async () => {
    if (!selectedTenant) return
    try {
      const res = await fetch(`/api/staff?venue_id=${selectedTenant.tenant_id}`)
      const data = await res.json()
      if (res.ok) {
        setStaffOptions(
          (data.staff ?? []).map((s: StaffOption) => ({
            staff_id: s.staff_id,
            full_name: s.full_name,
          }))
        )
      }
    } catch {
      // Non-fatal — the add-shift member picker just stays empty.
    }
  }

  useEffect(() => {
    void fetchShifts()
    void fetchStaffOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant])

  async function submitClose() {
    if (!closeTarget || !closeEndedAt) return
    try {
      const res = await fetch(`/api/shifts/${closeTarget.shiftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ended_at: new Date(closeEndedAt).toISOString(),
          note: closeNote.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to close shift')
      toast.success('Shift closed')
      setCloseTarget(null)
      setCloseNote('')
      await fetchShifts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to close shift')
    }
  }

  async function submitAdd() {
    if (!selectedTenant || !addForm.membership_id || !addForm.started_at || !addForm.ended_at) {
      toast.error('Pick a staff member and both times')
      return
    }
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: selectedTenant.tenant_id,
          membership_id: addForm.membership_id,
          started_at: new Date(addForm.started_at).toISOString(),
          ended_at: new Date(addForm.ended_at).toISOString(),
          note: addForm.note.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add shift')
      toast.success('Shift added')
      setAddOpen(false)
      setAddForm({ membership_id: '', started_at: '', ended_at: '', note: '' })
      await fetchShifts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add shift')
    }
  }

  if (!selectedTenant) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 text-aro-muted mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold text-aro-ink mb-2">No client selected</h2>
        <p className="text-aro-ink-soft">Please select a client from the dropdown above.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/staff"
            className="inline-flex items-center gap-1 text-sm text-aro-ink-soft hover:text-aro-ink mb-1"
          >
            <ArrowLeft className="w-4 h-4" /> Team
          </Link>
          <h1 className="text-3xl font-display font-bold text-aro-ink">Shifts</h1>
          <p className="text-aro-ink-soft mt-1">This week&apos;s clock-ins, from the counter.</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="bg-aro-terra hover:bg-aro-terracotta text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add missed shift</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 w-full bg-aro-sand/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : shifts.length === 0 ? (
        <div className="text-center py-12 bg-white border border-aro-hairline rounded-xl">
          <Clock className="w-12 h-12 text-aro-muted mx-auto mb-3" />
          <p className="text-aro-ink-soft">No shifts recorded this week yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-aro-hairline rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-aro-sand/50 text-left text-aro-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Ended</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aro-hairline">
              {shifts.map(s => (
                <tr key={s.shiftId} className={s.isStale ? 'bg-aro-rose/10' : undefined}>
                  <td className="px-4 py-3 text-aro-ink font-medium">{s.fullName ?? '—'}</td>
                  <td className="px-4 py-3 text-aro-ink-soft">{formatDateTime(s.startedAt)}</td>
                  <td className="px-4 py-3 text-aro-ink-soft">
                    {s.endedAt ? (
                      formatDateTime(s.endedAt)
                    ) : s.isStale ? (
                      <span className="text-aro-terracotta font-medium">
                        Open — flagged for review
                      </span>
                    ) : (
                      <span className="text-aro-ink-soft">Open</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-aro-ink-soft">
                    {formatDuration(s.durationMinutes)}
                  </td>
                  <td className="px-4 py-3 text-aro-ink-soft capitalize">{s.source}</td>
                  <td className="px-4 py-3 text-right">
                    {!s.endedAt && (
                      <button
                        onClick={() => {
                          setCloseTarget(s)
                          setCloseEndedAt(toLocalInputValue(new Date().toISOString()))
                        }}
                        className="text-aro-terra hover:underline text-xs font-medium"
                      >
                        Close shift
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {closeTarget && (
        <div className="fixed inset-0 bg-aro-ink/40 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
            <h2 className="text-lg font-display font-bold text-aro-ink">
              Close {closeTarget.fullName ?? 'this'}&apos;s shift
            </h2>
            <p className="text-xs text-aro-ink-soft">
              Started {formatDateTime(closeTarget.startedAt)}. This only sets when it ended — the
              original clock-in is never changed.
            </p>
            <div>
              <label className="block text-sm font-medium text-aro-ink mb-1">Ended at</label>
              <input
                type="datetime-local"
                value={closeEndedAt}
                onChange={e => setCloseEndedAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-aro-hairline focus:ring-2 focus:ring-aro-terra outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-aro-ink mb-1">Note (optional)</label>
              <input
                type="text"
                value={closeNote}
                onChange={e => setCloseNote(e.target.value)}
                placeholder="e.g. forgot to clock out"
                className="w-full px-3 py-2 rounded-lg border border-aro-hairline focus:ring-2 focus:ring-aro-terra outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCloseTarget(null)}
                className="px-4 py-2 rounded-lg text-aro-ink-soft hover:bg-aro-sand/50"
              >
                Cancel
              </button>
              <button
                onClick={() => void submitClose()}
                className="px-4 py-2 rounded-lg bg-aro-terra text-white font-medium"
              >
                Close shift
              </button>
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 bg-aro-ink/40 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
            <h2 className="text-lg font-display font-bold text-aro-ink">Add missed shift</h2>
            <p className="text-xs text-aro-ink-soft">
              For a shift the counter never captured — a separate record, source &quot;manual&quot;.
            </p>
            <div>
              <label className="block text-sm font-medium text-aro-ink mb-1">Staff member</label>
              <select
                value={addForm.membership_id}
                onChange={e => setAddForm({ ...addForm, membership_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-aro-hairline focus:ring-2 focus:ring-aro-terra outline-none"
              >
                <option value="">Select…</option>
                {staffOptions.map(s => (
                  <option key={s.staff_id} value={s.staff_id}>
                    {s.full_name ?? s.staff_id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-aro-ink mb-1">Started at</label>
              <input
                type="datetime-local"
                value={addForm.started_at}
                onChange={e => setAddForm({ ...addForm, started_at: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-aro-hairline focus:ring-2 focus:ring-aro-terra outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-aro-ink mb-1">Ended at</label>
              <input
                type="datetime-local"
                value={addForm.ended_at}
                onChange={e => setAddForm({ ...addForm, ended_at: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-aro-hairline focus:ring-2 focus:ring-aro-terra outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-aro-ink mb-1">Note (optional)</label>
              <input
                type="text"
                value={addForm.note}
                onChange={e => setAddForm({ ...addForm, note: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-aro-hairline focus:ring-2 focus:ring-aro-terra outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAddOpen(false)}
                className="px-4 py-2 rounded-lg text-aro-ink-soft hover:bg-aro-sand/50"
              >
                Cancel
              </button>
              <button
                onClick={() => void submitAdd()}
                className="px-4 py-2 rounded-lg bg-aro-terra text-white font-medium"
              >
                Add shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
