'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Ticket, Search, Check } from 'lucide-react'

interface ProgramConfig {
  default_points_value?: number
  default_value_cents?: number
}

interface Program {
  program_id: string
  type: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'archived'
  config: ProgramConfig
  created_at: string
}

interface MemberResult {
  memberId: string
  fullName: string | null
}

const PROGRAM_TYPES: { value: string; label: string }[] = [
  { value: 'accrual', label: 'Accrual' },
  { value: 'bounce_back', label: 'Bounce-back' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'appreciation', label: 'Appreciation' },
  { value: 'winback', label: 'Win-back' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'survey', label: 'Survey' },
  { value: 'referral', label: 'Referral' },
]

const STATUS_LABEL: Record<Program['status'], string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
}

const STATUS_CLASS: Record<Program['status'], string> = {
  draft: 'bg-aro-sand text-aro-muted',
  active: 'bg-aro-sage/30 text-aro-ink',
  paused: 'bg-aro-saffron/30 text-aro-ink',
  archived: 'bg-aro-sand text-aro-muted',
}

const STRINGS = {
  title: 'Loyalty',
  subtitle: 'Offer programs your regulars can earn and redeem — bounce-back, birthday, and more.',
  newProgram: 'New program',
  namePlaceholder: 'Program name',
  save: 'Save',
  saving: 'Saving…',
  cancel: 'Cancel',
  empty: 'No programs yet — create one to start issuing offers.',
  loadFailed: "Couldn't load programs — check your connection and try again.",
  createFailed: 'Failed to create program.',
  updateFailed: 'Failed to update status.',
  activate: 'Activate',
  pause: 'Pause',
  resume: 'Resume',
  archive: 'Archive',
  issueOffer: 'Issue offer',
  close: 'Close',
  searchPlaceholder: 'Search members by name or phone…',
  pointsLabel: 'Points value',
  dollarLabel: 'Dollar value ($)',
  dollarWarning:
    "Dollar-value offers aren't applied automatically at checkout yet — redeeming just marks the offer used.",
  expiresLabel: 'Expires (optional)',
  issue: 'Issue',
  issuing: 'Issuing…',
  issueFailed: 'Failed to issue offer.',
  codeIssuedPrefix: 'Code issued for',
} as const

export function LoyaltyClient({ venueId }: { venueId: string }) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<string>(PROGRAM_TYPES[0].value)
  const [defaultPoints, setDefaultPoints] = useState('')
  const [defaultDollars, setDefaultDollars] = useState('')

  const [issuingFor, setIssuingFor] = useState<Program | null>(null)
  const [memberQuery, setMemberQuery] = useState('')
  const [memberResults, setMemberResults] = useState<MemberResult[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null)
  const [issuePoints, setIssuePoints] = useState('')
  const [issueDollars, setIssueDollars] = useState('')
  const [issueExpires, setIssueExpires] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [issuedCode, setIssuedCode] = useState<{ code: string; memberName: string } | null>(null)

  async function fetchPrograms() {
    try {
      setLoading(true)
      const res = await fetch(`/api/loyalty/programs?venue_id=${venueId}`)
      if (!res.ok) throw new Error('load failed')
      const { programs: data } = await res.json()
      setPrograms(data ?? [])
      setLoadFailed(false)
    } catch (error) {
      console.error('[loyalty] load failed:', error)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrograms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId])

  // Debounced member search for the issue-offer panel.
  useEffect(() => {
    if (!issuingFor || memberQuery.trim().length < 2) {
      setMemberResults([])
      return
    }
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/members?venue_id=${venueId}&search=${encodeURIComponent(memberQuery.trim())}&page_size=6`
        )
        if (!res.ok) return
        const { members } = await res.json()
        setMemberResults(members ?? [])
      } catch {
        // Search failing silently is fine — the field just shows no matches.
      }
    }, 250)
    return () => clearTimeout(handle)
  }, [memberQuery, issuingFor, venueId])

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const config: ProgramConfig = {}
      if (defaultPoints) config.default_points_value = Number(defaultPoints)
      if (defaultDollars) config.default_value_cents = Math.round(Number(defaultDollars) * 100)

      const res = await fetch('/api/loyalty/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_id: venueId, name: name.trim(), type, config }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'create failed')
      }
      setName('')
      setDefaultPoints('')
      setDefaultDollars('')
      setShowForm(false)
      await fetchPrograms()
      toast.success('Program created.')
    } catch (error) {
      console.error('[loyalty] create failed:', error)
      toast.error(error instanceof Error ? error.message : STRINGS.createFailed)
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(program: Program, status: Program['status']) {
    try {
      const res = await fetch(`/api/loyalty/programs/${program.program_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('update failed')
      setPrograms(prev =>
        prev.map(p => (p.program_id === program.program_id ? { ...p, status } : p))
      )
    } catch (error) {
      console.error('[loyalty] status change failed:', error)
      toast.error(STRINGS.updateFailed)
    }
  }

  function openIssuePanel(program: Program) {
    setIssuingFor(program)
    setMemberQuery('')
    setMemberResults([])
    setSelectedMember(null)
    setIssuePoints(
      program.config.default_points_value != null ? String(program.config.default_points_value) : ''
    )
    setIssueDollars(
      program.config.default_value_cents != null
        ? (program.config.default_value_cents / 100).toFixed(2)
        : ''
    )
    setIssueExpires('')
    setIssuedCode(null)
  }

  async function handleIssue() {
    if (!issuingFor || !selectedMember || issuing) return
    setIssuing(true)
    try {
      const res = await fetch('/api/loyalty/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: venueId,
          member_id: selectedMember.memberId,
          program_id: issuingFor.program_id,
          points_value: issuePoints ? Number(issuePoints) : null,
          value_cents: issueDollars ? Math.round(Number(issueDollars) * 100) : null,
          expires_at: issueExpires ? new Date(issueExpires).toISOString() : null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'issue failed')
      }
      const { offer } = await res.json()
      setIssuedCode({ code: offer.code, memberName: selectedMember.fullName ?? 'this member' })
      setSelectedMember(null)
      setMemberQuery('')
      toast.success('Offer issued.')
    } catch (error) {
      console.error('[loyalty] issue failed:', error)
      toast.error(error instanceof Error ? error.message : STRINGS.issueFailed)
    } finally {
      setIssuing(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl font-bold text-aro-ink">{STRINGS.title}</h1>
        <button
          type="button"
          onClick={() => setShowForm(open => !open)}
          className="flex items-center gap-1.5 rounded-lg bg-aro-terra px-3 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {STRINGS.newProgram}
        </button>
      </div>
      <p className="text-sm text-aro-muted mb-4">{STRINGS.subtitle}</p>

      {showForm && (
        <div className="rounded-xl bg-white border border-aro-hairline p-4 mb-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={STRINGS.namePlaceholder}
              className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
            />
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
            >
              {PROGRAM_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={defaultPoints}
              onChange={e => setDefaultPoints(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder={STRINGS.pointsLabel}
              inputMode="numeric"
              className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
            />
            <input
              value={defaultDollars}
              onChange={e => setDefaultDollars(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder={STRINGS.dollarLabel}
              inputMode="decimal"
              className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
            />
          </div>
          {defaultDollars && <p className="text-xs text-aro-muted">{STRINGS.dollarWarning}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="rounded-lg bg-aro-terra px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? STRINGS.saving : STRINGS.save}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-aro-hairline px-4 py-2 text-sm font-medium text-aro-ink-soft"
            >
              {STRINGS.cancel}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-aro-muted py-8 text-center">Loading…</p>
      ) : loadFailed ? (
        <p className="text-sm text-aro-rose py-8 text-center">{STRINGS.loadFailed}</p>
      ) : programs.length === 0 ? (
        <p className="text-sm text-aro-muted py-8 text-center">{STRINGS.empty}</p>
      ) : (
        <div className="space-y-1.5">
          {programs.map(program => (
            <div
              key={program.program_id}
              className="rounded-xl bg-white border border-aro-hairline"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-aro-ink truncate">{program.name}</p>
                  <p className="text-xs text-aro-muted">
                    {PROGRAM_TYPES.find(t => t.value === program.type)?.label ?? program.type}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[program.status]}`}
                  >
                    {STATUS_LABEL[program.status]}
                  </span>
                  {program.status !== 'archived' && (
                    <>
                      {(program.status === 'draft' || program.status === 'paused') && (
                        <button
                          type="button"
                          onClick={() => setStatus(program, 'active')}
                          className="rounded-lg border border-aro-hairline px-2.5 py-1 text-xs font-medium text-aro-ink-soft hover:bg-aro-sand/40"
                        >
                          {program.status === 'paused' ? STRINGS.resume : STRINGS.activate}
                        </button>
                      )}
                      {program.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => setStatus(program, 'paused')}
                          className="rounded-lg border border-aro-hairline px-2.5 py-1 text-xs font-medium text-aro-ink-soft hover:bg-aro-sand/40"
                        >
                          {STRINGS.pause}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setStatus(program, 'archived')}
                        className="rounded-lg border border-aro-hairline px-2.5 py-1 text-xs font-medium text-aro-ink-soft hover:bg-aro-sand/40"
                      >
                        {STRINGS.archive}
                      </button>
                    </>
                  )}
                  {program.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => openIssuePanel(program)}
                      aria-label={`${STRINGS.issueOffer}: ${program.name}`}
                      className="rounded-lg bg-aro-sand/60 p-2 text-aro-terra hover:bg-aro-sand"
                    >
                      <Ticket className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {issuingFor?.program_id === program.program_id && (
                <div className="border-t border-aro-hairline px-4 py-3 space-y-3">
                  {issuedCode ? (
                    <div className="rounded-lg bg-aro-sage/20 border border-aro-sage/40 px-3 py-3 text-sm text-aro-ink flex items-center gap-2">
                      <Check className="h-4 w-4 text-aro-sage shrink-0" aria-hidden="true" />
                      <span>
                        {STRINGS.codeIssuedPrefix} {issuedCode.memberName}:{' '}
                        <span className="font-mono font-bold">{issuedCode.code}</span>
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-aro-muted"
                          aria-hidden="true"
                        />
                        <input
                          value={selectedMember ? (selectedMember.fullName ?? '') : memberQuery}
                          onChange={e => {
                            setSelectedMember(null)
                            setMemberQuery(e.target.value)
                          }}
                          placeholder={STRINGS.searchPlaceholder}
                          className="w-full rounded-lg border border-aro-hairline pl-9 pr-3 py-2 text-sm bg-white"
                        />
                      </div>
                      {!selectedMember && memberResults.length > 0 && (
                        <div className="rounded-lg border border-aro-hairline divide-y divide-aro-hairline overflow-hidden">
                          {memberResults.map(m => (
                            <button
                              key={m.memberId}
                              type="button"
                              onClick={() => {
                                setSelectedMember(m)
                                setMemberResults([])
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-aro-ink hover:bg-aro-sand/40"
                            >
                              {m.fullName ?? 'Unnamed member'}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={issuePoints}
                          onChange={e => setIssuePoints(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder={STRINGS.pointsLabel}
                          inputMode="numeric"
                          className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
                        />
                        <input
                          value={issueDollars}
                          onChange={e => setIssueDollars(e.target.value.replace(/[^0-9.]/g, ''))}
                          placeholder={STRINGS.dollarLabel}
                          inputMode="decimal"
                          className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
                        />
                      </div>
                      {issueDollars && (
                        <p className="text-xs text-aro-muted">{STRINGS.dollarWarning}</p>
                      )}
                      <div>
                        <label className="block text-xs text-aro-muted mb-1">
                          {STRINGS.expiresLabel}
                        </label>
                        <input
                          type="date"
                          value={issueExpires}
                          onChange={e => setIssueExpires(e.target.value)}
                          className="rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleIssue}
                          disabled={issuing || !selectedMember || (!issuePoints && !issueDollars)}
                          className="rounded-lg bg-aro-terra px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                        >
                          {issuing ? STRINGS.issuing : STRINGS.issue}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIssuingFor(null)}
                          className="rounded-lg border border-aro-hairline px-4 py-2 text-sm font-medium text-aro-ink-soft"
                        >
                          {STRINGS.cancel}
                        </button>
                      </div>
                    </>
                  )}
                  {issuedCode && (
                    <button
                      type="button"
                      onClick={() => setIssuingFor(null)}
                      className="rounded-lg border border-aro-hairline px-4 py-2 text-sm font-medium text-aro-ink-soft"
                    >
                      {STRINGS.close}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
