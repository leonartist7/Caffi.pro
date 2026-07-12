'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Mail, Phone } from 'lucide-react'

export interface LeadRow {
  lead_id: string
  source: string
  name: string | null
  email: string | null
  phone: string | null
  venue_name: string | null
  city: string | null
  score: number | null
  answers: Record<string, unknown>
  status: string
  created_at: string
}

const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'] as const

function scoreColor(score: number | null): string {
  if (score === null) return 'bg-gray-200 text-gray-600'
  if (score >= 70) return 'bg-aro-sage/30 text-aro-ink'
  if (score >= 40) return 'bg-aro-saffron/30 text-aro-ink'
  return 'bg-aro-rose/30 text-aro-ink'
}

export function LeadsInbox({ initialLeads }: { initialLeads: LeadRow[] }) {
  const [leads, setLeads] = useState(initialLeads)
  const [open, setOpen] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  async function setStatus(id: string, status: string) {
    setSaving(id)
    const prev = leads
    setLeads(ls => ls.map(l => (l.lead_id === id ? { ...l, status } : l)))
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) setLeads(prev)
    } catch {
      setLeads(prev)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Leads</h1>
      <p className="text-sm text-gray-500 mb-6">
        Every completed diagnostic and demo request — nothing gets lost anymore.
      </p>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
          No leads yet. When someone completes the aro.club diagnostic, they land here instantly.
        </div>
      ) : (
        <ul className="space-y-2">
          {leads.map(lead => (
            <li key={lead.lead_id} className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-3 p-4">
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${scoreColor(lead.score)}`}
                >
                  {lead.score ?? '—'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {lead.name || 'Unnamed'}{' '}
                    {lead.venue_name && (
                      <span className="text-gray-400 font-normal">
                        · {lead.venue_name}
                        {lead.city ? `, ${lead.city}` : ''}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                    {lead.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail size={12} /> {lead.email}
                      </span>
                    )}
                    {lead.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={12} /> {lead.phone}
                      </span>
                    )}
                    <span>{new Date(lead.created_at).toLocaleString()}</span>
                  </p>
                </div>
                <select
                  value={lead.status}
                  disabled={saving === lead.lead_id}
                  onChange={e => setStatus(lead.lead_id, e.target.value)}
                  className="rounded-lg border border-gray-300 text-sm px-2 py-1.5 bg-white disabled:opacity-50"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setOpen(open === lead.lead_id ? null : lead.lead_id)}
                  className="p-1.5 text-gray-400 hover:text-gray-700"
                  aria-label="Toggle details"
                >
                  {open === lead.lead_id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
              {open === lead.lead_id && (
                <div className="border-t border-gray-100 px-4 py-3 text-sm">
                  {Object.keys(lead.answers ?? {}).length === 0 ? (
                    <p className="text-gray-400">No per-question detail recorded.</p>
                  ) : (
                    <dl className="space-y-1.5">
                      {Object.entries(lead.answers).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <dt className="text-gray-500 shrink-0">{k}:</dt>
                          <dd className="text-gray-800 break-all">
                            {typeof v === 'string' ? v : JSON.stringify(v)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <p className="mt-2 text-xs text-gray-400">source: {lead.source}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
