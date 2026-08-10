import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isValidSurveyConfig, type SurveyQuestion } from '@/lib/loyalty/survey'

/**
 * Survey form (PLAN-16) — PUBLIC by bearer serial, same trust model as
 * the rest of `/pass/[serial]/**`. Plain `<form>`, zero client JS: each
 * question renders as a `q_<id>` field the submission route
 * (`/api/pass/[serial]/survey`) reconstructs into the same answers map a
 * JSON POST would send.
 */

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Quick survey' }

interface SurveyPageData {
  venueName: string
  questions: SurveyQuestion[]
  alreadyResponded: boolean
}

async function getSurvey(serial: string, programId: string): Promise<SurveyPageData | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serial)) return null

  const admin = getSupabaseAdmin()
  const { data: member } = await admin
    .from('members')
    .select('member_id, tenant_id')
    .eq('pass_serial', serial)
    .maybeSingle()
  if (!member) return null

  const { data: program } = await admin
    .from('loyalty_programs')
    .select('program_id, status, config, venues(business_name)')
    .eq('program_id', programId)
    .eq('venue_id', member.tenant_id)
    .eq('type', 'survey')
    .maybeSingle()
  if (!program || program.status !== 'active') return null

  const config = (program.config ?? {}) as { questions?: unknown }
  if (!isValidSurveyConfig(config.questions)) return null

  const { data: existing } = await admin
    .from('survey_responses')
    .select('response_id')
    .eq('program_id', programId)
    .eq('member_id', member.member_id)
    .maybeSingle()

  const venue = program.venues as unknown as { business_name: string } | null

  return {
    venueName: venue?.business_name ?? 'Your café',
    questions: config.questions as SurveyQuestion[],
    alreadyResponded: Boolean(existing),
  }
}

export default async function SurveyPage({
  params,
  searchParams,
}: {
  params: { serial: string; programId: string }
  searchParams: { error?: string }
}) {
  const survey = await getSurvey(params.serial, params.programId)

  if (!survey) {
    return (
      <main className="min-h-screen bg-aro-cream flex items-center justify-center p-6">
        <div className="relative grain-soft max-w-sm w-full rounded-2xl bg-aro-cream-warm border border-aro-hairline p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-aro-ink mb-2">Survey unavailable</h1>
          <p className="text-aro-ink-soft text-sm">This survey link isn&apos;t active right now.</p>
        </div>
      </main>
    )
  }

  if (survey.alreadyResponded) {
    return (
      <main className="min-h-screen bg-aro-cream flex items-center justify-center p-6">
        <div className="relative grain-soft max-w-sm w-full rounded-2xl bg-aro-cream-warm border border-aro-hairline p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-aro-ink mb-2">Already answered</h1>
          <p className="text-aro-ink-soft text-sm">
            Thanks — you&apos;ve already completed this one.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-aro-cream flex items-center justify-center p-6">
      <div className="relative grain-soft max-w-sm w-full rounded-2xl bg-aro-cream-warm border border-aro-hairline p-8">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-aro-muted mb-1">
          {survey.venueName}
        </p>
        <h1 className="font-display text-2xl font-bold text-aro-ink mb-6">A quick survey</h1>

        {searchParams.error && (
          <p role="alert" className="text-sm text-aro-rose font-medium mb-4">
            {searchParams.error}
          </p>
        )}

        <form method="post" action={`/api/pass/${params.serial}/survey`} className="space-y-5">
          <input type="hidden" name="program_id" value={params.programId} />
          {survey.questions.map(q => (
            <div key={q.id}>
              <label className="block text-sm font-medium text-aro-ink mb-2">{q.text}</label>
              {q.type === 'choice' ? (
                <div className="space-y-1.5">
                  {q.options?.map(opt => (
                    <label
                      key={opt}
                      className="flex items-center gap-2 text-sm text-aro-ink-soft cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={`q_${q.id}`}
                        value={opt}
                        required
                        className="h-4 w-4"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  name={`q_${q.id}`}
                  required
                  rows={2}
                  className="w-full rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white/60"
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            className="w-full rounded-xl bg-aro-terra text-white font-display font-bold text-lg py-3.5 hover:opacity-90"
          >
            Submit
          </button>
        </form>
      </div>
    </main>
  )
}
