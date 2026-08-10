'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Ticket, Search, Check, Users, ClipboardList, X } from 'lucide-react'
import { expectedCostCentsPerReveal, expectedPointsPerReveal } from '@/lib/loyalty/mystery'

interface SurveyQuestionDraft {
  id: string
  text: string
  type: 'text' | 'choice'
  options: string
}

interface MysteryPrizeDraft {
  id: string
  label: string
  weight: string
  reward: 'points' | 'dollars'
  pointsValue: string
  dollars: string
}

interface ProgramConfig {
  default_points_value?: number
  default_value_cents?: number
  delay_days?: number
  window_days?: number
  questions?: { id: string; text: string; type: 'text' | 'choice'; options?: string[] }[]
  prizes?: {
    id: string
    label: string
    weight: number
    pointsValue?: number
    valueCents?: number
  }[]
  visit_threshold?: number
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
  delayDaysLabel: 'Days until valid',
  windowDaysLabel: 'Days the window stays open',
  bounceBackHint: '"$5 back when you return between day 3 and day 14" = 3 and 11.',
  batchIssue: 'Issue to cohort',
  cohortLabel: 'Send to',
  cohortRegular: 'Regulars',
  cohortFading: 'Fading regulars',
  previewCount: 'Preview',
  previewing: 'Checking…',
  confirmPrompt: (count: number) => `Type ${count} to confirm sending to ${count} members`,
  confirmPlaceholder: 'Type the number to confirm',
  send: 'Send',
  sending: 'Sending…',
  batchFailed: 'Failed to issue the batch.',
  batchSuccess: (count: number) => `Issued ${count} offer${count === 1 ? '' : 's'}.`,
  skippedNote: (count: number) =>
    count > 0 ? ` (${count} already hold an unredeemed offer from this program, skipped)` : '',
  runDaily: "Run today's birthday/anniversary issues now",
  runningDaily: 'Running…',
  runDailyResult: (birthday: number, anniversary: number) =>
    `Issued ${birthday} birthday and ${anniversary} anniversary offer${birthday + anniversary === 1 ? '' : 's'}.`,
  runDailyFailed: "Couldn't run today's issues — try again.",
  runDailyHint:
    'Runs automatically every day once CRON_SECRET is set — use this to test or catch up in the meantime.',
  questionsLabel: 'Questions (3–5)',
  addQuestion: 'Add question',
  questionPlaceholder: 'Question text',
  questionTypeText: 'Free text',
  questionTypeChoice: 'Multiple choice',
  optionsPlaceholder: 'Options, comma separated',
  questionsHint:
    'Every question needs an answer — this is for completing, never for a particular answer.',
  viewResults: 'View responses',
  resultsTitle: 'Responses',
  resultsEmpty: 'No responses yet.',
  resultsFailed: "Couldn't load responses.",
  visitThresholdLabel: 'Reveal every N visits',
  prizesLabel: 'Prizes',
  addPrize: 'Add prize',
  prizeLabelPlaceholder: 'Prize name',
  weightPlaceholder: 'Weight',
  rewardPoints: 'Points',
  rewardDollars: 'Dollars',
  expectedCostPrefix: 'Expected cost per reveal:',
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
  const [delayDays, setDelayDays] = useState('')
  const [windowDays, setWindowDays] = useState('')
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestionDraft[]>([])
  const [mysteryPrizes, setMysteryPrizes] = useState<MysteryPrizeDraft[]>([])
  const [visitThreshold, setVisitThreshold] = useState('5')

  const [resultsFor, setResultsFor] = useState<Program | null>(null)
  const [results, setResults] = useState<{ answers: Record<string, string> }[] | null>(null)
  const [resultsLoading, setResultsLoading] = useState(false)

  const [runningDaily, setRunningDaily] = useState(false)

  const [batchFor, setBatchFor] = useState<Program | null>(null)
  const [cohortStatus, setCohortStatus] = useState<'regular' | 'fading'>('regular')
  const [batchPreview, setBatchPreview] = useState<{
    recipientCount: number
    skippedCount: number
    requiresConfirmation: boolean
  } | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [batchBusy, setBatchBusy] = useState(false)
  const [batchResult, setBatchResult] = useState<{
    issuedCount: number
    skippedCount: number
  } | null>(null)

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
      if (type === 'bounce_back') {
        if (delayDays) config.delay_days = Number(delayDays)
        if (windowDays) config.window_days = Number(windowDays)
      }
      if (type === 'survey') {
        if (surveyQuestions.length < 3 || surveyQuestions.length > 5) {
          throw new Error('Add 3–5 questions')
        }
        config.questions = surveyQuestions.map(q => ({
          id: q.id,
          text: q.text.trim(),
          type: q.type,
          ...(q.type === 'choice'
            ? {
                options: q.options
                  .split(',')
                  .map(o => o.trim())
                  .filter(Boolean),
              }
            : {}),
        }))
        if (
          config.questions.some(
            q => !q.text || (q.type === 'choice' && (!q.options || q.options.length < 2))
          )
        ) {
          throw new Error('Every question needs text; choice questions need 2+ options')
        }
      }
      if (type === 'mystery') {
        if (mysteryPrizes.length < 1) {
          throw new Error('Add at least one prize')
        }
        config.visit_threshold = Number(visitThreshold) || 5
        config.prizes = mysteryPrizes.map(p => ({
          id: p.id,
          label: p.label.trim(),
          weight: Number(p.weight) || 0,
          ...(p.reward === 'points'
            ? { pointsValue: Number(p.pointsValue) || 0 }
            : { valueCents: Math.round((Number(p.dollars) || 0) * 100) }),
        }))
        if (
          config.prizes.some(p => !p.label || p.weight <= 0 || (!p.pointsValue && !p.valueCents))
        ) {
          throw new Error('Every prize needs a name, a positive weight, and a reward value')
        }
      }

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
      setDelayDays('')
      setWindowDays('')
      setSurveyQuestions([])
      setMysteryPrizes([])
      setVisitThreshold('5')
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

  async function runDailyNow() {
    if (runningDaily) return
    setRunningDaily(true)
    try {
      const res = await fetch('/api/loyalty/run-birthday-anniversary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_id: venueId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'run failed')
      toast.success(STRINGS.runDailyResult(body.birthdayIssued, body.anniversaryIssued))
    } catch (error) {
      console.error('[loyalty] run-daily failed:', error)
      toast.error(STRINGS.runDailyFailed)
    } finally {
      setRunningDaily(false)
    }
  }

  const hasActiveDateProgram = programs.some(
    p => p.status === 'active' && (p.type === 'birthday' || p.type === 'anniversary')
  )

  function addSurveyQuestion() {
    if (surveyQuestions.length >= 5) return
    setSurveyQuestions(prev => [
      ...prev,
      { id: crypto.randomUUID(), text: '', type: 'text', options: '' },
    ])
  }

  function updateSurveyQuestion(id: string, patch: Partial<SurveyQuestionDraft>) {
    setSurveyQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...patch } : q)))
  }

  function removeSurveyQuestion(id: string) {
    setSurveyQuestions(prev => prev.filter(q => q.id !== id))
  }

  function addMysteryPrize() {
    if (mysteryPrizes.length >= 12) return
    setMysteryPrizes(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: '',
        weight: '1',
        reward: 'points',
        pointsValue: '',
        dollars: '',
      },
    ])
  }

  function updateMysteryPrize(id: string, patch: Partial<MysteryPrizeDraft>) {
    setMysteryPrizes(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)))
  }

  function removeMysteryPrize(id: string) {
    setMysteryPrizes(prev => prev.filter(p => p.id !== id))
  }

  const mysteryPreviewPrizes = mysteryPrizes
    .filter(p => p.label.trim() && Number(p.weight) > 0)
    .map(p => ({
      id: p.id,
      label: p.label,
      weight: Number(p.weight) || 0,
      pointsValue: p.reward === 'points' ? Number(p.pointsValue) || 0 : undefined,
      valueCents: p.reward === 'dollars' ? Math.round((Number(p.dollars) || 0) * 100) : undefined,
    }))
  const expectedCents = expectedCostCentsPerReveal(mysteryPreviewPrizes)
  const expectedPoints = expectedPointsPerReveal(mysteryPreviewPrizes)

  async function openResults(program: Program) {
    setResultsFor(program)
    setResults(null)
    setResultsLoading(true)
    try {
      const res = await fetch(
        `/api/loyalty/survey-responses?venue_id=${venueId}&program_id=${program.program_id}`
      )
      if (!res.ok) throw new Error('load failed')
      const { responses } = await res.json()
      setResults(responses ?? [])
    } catch (error) {
      console.error('[loyalty] results load failed:', error)
      toast.error(STRINGS.resultsFailed)
    } finally {
      setResultsLoading(false)
    }
  }

  function openBatchPanel(program: Program) {
    setBatchFor(program)
    setCohortStatus('regular')
    setBatchPreview(null)
    setConfirmText('')
    setBatchResult(null)
  }

  async function previewBatch() {
    if (!batchFor || batchBusy) return
    setBatchBusy(true)
    setBatchPreview(null)
    try {
      const res = await fetch('/api/loyalty/appreciation-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: venueId,
          program_id: batchFor.program_id,
          status: cohortStatus,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'preview failed')
      setBatchPreview({
        recipientCount: body.recipientCount,
        skippedCount: body.skippedCount,
        requiresConfirmation: body.requiresConfirmation,
      })
    } catch (error) {
      console.error('[loyalty] batch preview failed:', error)
      toast.error(STRINGS.batchFailed)
    } finally {
      setBatchBusy(false)
    }
  }

  async function submitBatch() {
    if (!batchFor || !batchPreview || batchBusy) return
    if (
      batchPreview.requiresConfirmation &&
      confirmText.trim() !== String(batchPreview.recipientCount)
    ) {
      return
    }
    setBatchBusy(true)
    try {
      const res = await fetch('/api/loyalty/appreciation-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: venueId,
          program_id: batchFor.program_id,
          status: cohortStatus,
          confirm: true,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'batch failed')
      setBatchResult({ issuedCount: body.issuedCount, skippedCount: body.skippedCount })
      toast.success(STRINGS.batchSuccess(body.issuedCount))
    } catch (error) {
      console.error('[loyalty] batch issue failed:', error)
      toast.error(error instanceof Error ? error.message : STRINGS.batchFailed)
    } finally {
      setBatchBusy(false)
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

      {hasActiveDateProgram && (
        <div className="rounded-xl bg-aro-sand/40 border border-aro-hairline px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          <p className="text-xs text-aro-muted">{STRINGS.runDailyHint}</p>
          <button
            type="button"
            onClick={runDailyNow}
            disabled={runningDaily}
            className="shrink-0 rounded-lg border border-aro-hairline px-3 py-2 text-xs font-medium text-aro-ink-soft hover:bg-aro-sand disabled:opacity-60"
          >
            {runningDaily ? STRINGS.runningDaily : STRINGS.runDaily}
          </button>
        </div>
      )}

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
          {type === 'bounce_back' && (
            <div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={delayDays}
                  onChange={e => setDelayDays(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={STRINGS.delayDaysLabel}
                  inputMode="numeric"
                  className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
                />
                <input
                  value={windowDays}
                  onChange={e => setWindowDays(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={STRINGS.windowDaysLabel}
                  inputMode="numeric"
                  className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
                />
              </div>
              <p className="text-xs text-aro-muted mt-1">{STRINGS.bounceBackHint}</p>
            </div>
          )}
          {type === 'survey' && (
            <div className="space-y-2">
              <p className="text-xs text-aro-muted">{STRINGS.questionsHint}</p>
              {surveyQuestions.map((q, i) => (
                <div key={q.id} className="rounded-lg border border-aro-hairline p-2.5 space-y-1.5">
                  <div className="flex gap-2 items-start">
                    <input
                      value={q.text}
                      onChange={e => updateSurveyQuestion(q.id, { text: e.target.value })}
                      placeholder={`${STRINGS.questionPlaceholder} ${i + 1}`}
                      className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
                    />
                    <select
                      value={q.type}
                      onChange={e =>
                        updateSurveyQuestion(q.id, { type: e.target.value as 'text' | 'choice' })
                      }
                      className="rounded-lg border border-aro-hairline px-2 py-2 text-sm bg-white"
                    >
                      <option value="text">{STRINGS.questionTypeText}</option>
                      <option value="choice">{STRINGS.questionTypeChoice}</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeSurveyQuestion(q.id)}
                      aria-label="Remove question"
                      className="rounded-lg p-2 text-aro-muted hover:bg-aro-sand/40"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  {q.type === 'choice' && (
                    <input
                      value={q.options}
                      onChange={e => updateSurveyQuestion(q.id, { options: e.target.value })}
                      placeholder={STRINGS.optionsPlaceholder}
                      className="w-full rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
                    />
                  )}
                </div>
              ))}
              {surveyQuestions.length < 5 && (
                <button
                  type="button"
                  onClick={addSurveyQuestion}
                  className="rounded-lg border border-aro-hairline px-3 py-1.5 text-xs font-medium text-aro-ink-soft hover:bg-aro-sand/40"
                >
                  {STRINGS.addQuestion} ({surveyQuestions.length}/5)
                </button>
              )}
            </div>
          )}
          {type === 'mystery' && (
            <div className="space-y-2">
              <input
                value={visitThreshold}
                onChange={e => setVisitThreshold(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder={STRINGS.visitThresholdLabel}
                inputMode="numeric"
                className="w-full rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
              />
              {mysteryPrizes.map(p => (
                <div key={p.id} className="rounded-lg border border-aro-hairline p-2.5 space-y-1.5">
                  <div className="flex gap-2 items-start">
                    <input
                      value={p.label}
                      onChange={e => updateMysteryPrize(p.id, { label: e.target.value })}
                      placeholder={STRINGS.prizeLabelPlaceholder}
                      className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
                    />
                    <input
                      value={p.weight}
                      onChange={e =>
                        updateMysteryPrize(p.id, { weight: e.target.value.replace(/[^0-9]/g, '') })
                      }
                      placeholder={STRINGS.weightPlaceholder}
                      inputMode="numeric"
                      className="w-20 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeMysteryPrize(p.id)}
                      aria-label="Remove prize"
                      className="rounded-lg p-2 text-aro-muted hover:bg-aro-sand/40"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      value={p.reward}
                      onChange={e =>
                        updateMysteryPrize(p.id, { reward: e.target.value as 'points' | 'dollars' })
                      }
                      className="rounded-lg border border-aro-hairline px-2 py-2 text-sm bg-white"
                    >
                      <option value="points">{STRINGS.rewardPoints}</option>
                      <option value="dollars">{STRINGS.rewardDollars}</option>
                    </select>
                    {p.reward === 'points' ? (
                      <input
                        value={p.pointsValue}
                        onChange={e =>
                          updateMysteryPrize(p.id, {
                            pointsValue: e.target.value.replace(/[^0-9]/g, ''),
                          })
                        }
                        placeholder={STRINGS.pointsLabel}
                        inputMode="numeric"
                        className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
                      />
                    ) : (
                      <input
                        value={p.dollars}
                        onChange={e =>
                          updateMysteryPrize(p.id, {
                            dollars: e.target.value.replace(/[^0-9.]/g, ''),
                          })
                        }
                        placeholder={STRINGS.dollarLabel}
                        inputMode="decimal"
                        className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
                      />
                    )}
                  </div>
                </div>
              ))}
              {mysteryPrizes.length < 12 && (
                <button
                  type="button"
                  onClick={addMysteryPrize}
                  className="rounded-lg border border-aro-hairline px-3 py-1.5 text-xs font-medium text-aro-ink-soft hover:bg-aro-sand/40"
                >
                  {STRINGS.addPrize} ({mysteryPrizes.length}/12)
                </button>
              )}
              {mysteryPreviewPrizes.length > 0 && (
                <p className="text-xs text-aro-terra font-medium">
                  {STRINGS.expectedCostPrefix} ${(expectedCents / 100).toFixed(2)}
                  {expectedPoints > 0 ? ` + ${expectedPoints} points` : ''}
                </p>
              )}
            </div>
          )}
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
                  {program.status === 'active' && program.type === 'appreciation' && (
                    <button
                      type="button"
                      onClick={() => openBatchPanel(program)}
                      aria-label={`${STRINGS.batchIssue}: ${program.name}`}
                      className="rounded-lg bg-aro-sand/60 p-2 text-aro-terra hover:bg-aro-sand"
                    >
                      <Users className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                  {program.type === 'survey' && (
                    <button
                      type="button"
                      onClick={() => openResults(program)}
                      aria-label={`${STRINGS.viewResults}: ${program.name}`}
                      className="rounded-lg bg-aro-sand/60 p-2 text-aro-terra hover:bg-aro-sand"
                    >
                      <ClipboardList className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {resultsFor?.program_id === program.program_id && (
                <div className="border-t border-aro-hairline px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-aro-ink">{STRINGS.resultsTitle}</p>
                    <button
                      type="button"
                      onClick={() => setResultsFor(null)}
                      className="text-xs text-aro-muted underline"
                    >
                      {STRINGS.close}
                    </button>
                  </div>
                  {resultsLoading ? (
                    <p className="text-sm text-aro-muted">Loading…</p>
                  ) : !results || results.length === 0 ? (
                    <p className="text-sm text-aro-muted">{STRINGS.resultsEmpty}</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {results.map((r, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-aro-sand/40 border border-aro-hairline px-3 py-2 text-xs text-aro-ink space-y-0.5"
                        >
                          {Object.entries(r.answers).map(([qid, answer]) => (
                            <p key={qid}>
                              <span className="text-aro-muted">{qid}:</span> {answer}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {batchFor?.program_id === program.program_id && (
                <div className="border-t border-aro-hairline px-4 py-3 space-y-3">
                  {batchResult ? (
                    <div className="rounded-lg bg-aro-sage/20 border border-aro-sage/40 px-3 py-3 text-sm text-aro-ink flex items-center gap-2">
                      <Check className="h-4 w-4 text-aro-sage shrink-0" aria-hidden="true" />
                      <span>
                        {STRINGS.batchSuccess(batchResult.issuedCount)}
                        {STRINGS.skippedNote(batchResult.skippedCount)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                        <span className="text-xs text-aro-muted">{STRINGS.cohortLabel}</span>
                        <select
                          value={cohortStatus}
                          onChange={e => {
                            setCohortStatus(e.target.value as 'regular' | 'fading')
                            setBatchPreview(null)
                            setConfirmText('')
                          }}
                          className="rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
                        >
                          <option value="regular">{STRINGS.cohortRegular}</option>
                          <option value="fading">{STRINGS.cohortFading}</option>
                        </select>
                        <button
                          type="button"
                          onClick={previewBatch}
                          disabled={batchBusy}
                          className="rounded-lg border border-aro-hairline px-3 py-2 text-xs font-medium text-aro-ink-soft disabled:opacity-60"
                        >
                          {batchBusy ? STRINGS.previewing : STRINGS.previewCount}
                        </button>
                      </div>

                      {batchPreview && (
                        <div className="space-y-2">
                          <p className="text-sm text-aro-ink">
                            {batchPreview.recipientCount} member
                            {batchPreview.recipientCount === 1 ? '' : 's'} will receive an offer.
                            {STRINGS.skippedNote(batchPreview.skippedCount)}
                          </p>
                          {batchPreview.requiresConfirmation && (
                            <div>
                              <label className="block text-xs text-aro-muted mb-1">
                                {STRINGS.confirmPrompt(batchPreview.recipientCount)}
                              </label>
                              <input
                                value={confirmText}
                                onChange={e => setConfirmText(e.target.value)}
                                placeholder={STRINGS.confirmPlaceholder}
                                className="rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
                              />
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={submitBatch}
                              disabled={
                                batchBusy ||
                                batchPreview.recipientCount === 0 ||
                                (batchPreview.requiresConfirmation &&
                                  confirmText.trim() !== String(batchPreview.recipientCount))
                              }
                              className="rounded-lg bg-aro-terra px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                            >
                              {batchBusy ? STRINGS.sending : STRINGS.send}
                            </button>
                            <button
                              type="button"
                              onClick={() => setBatchFor(null)}
                              className="rounded-lg border border-aro-hairline px-4 py-2 text-sm font-medium text-aro-ink-soft"
                            >
                              {STRINGS.cancel}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {batchResult && (
                    <button
                      type="button"
                      onClick={() => setBatchFor(null)}
                      className="rounded-lg border border-aro-hairline px-4 py-2 text-sm font-medium text-aro-ink-soft"
                    >
                      {STRINGS.close}
                    </button>
                  )}
                </div>
              )}

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
