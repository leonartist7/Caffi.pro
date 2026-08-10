import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { emitEvent } from '@/lib/events'
import {
  isValidSurveyConfig,
  validateSurveyAnswers,
  type SurveyQuestion,
} from '@/lib/loyalty/survey'
import { issueMemberOffer } from '@/lib/loyalty/issue'

/**
 * POST /api/pass/[serial]/survey — PUBLIC by bearer serial, same trust
 * model as `/api/join` and `/api/pass/[serial]/birthday`. Body:
 * `{ program_id, answers }`.
 *
 * `survey_responses.uq_survey_responses_program_member` (PLAN-10) is the
 * actual "one response per member per survey" guarantee — a `23505` there
 * is treated as "already responded," not an error, and issues nothing
 * more. Completion issues exactly one offer, gated by the SAME response
 * insert succeeding: the offer only fires after the response row lands,
 * so a replayed submit (which 23505s on the response) never reaches the
 * issuance call at all — belt, not just suspenders, since
 * `issueMemberOffer`'s own `period_key` dedup would catch a double-issue
 * anyway if this route were ever restructured to call it twice.
 */
export async function POST(request: NextRequest, { params }: { params: { serial: string } }) {
  // Dual mode, same convention as /api/join and /api/pass/[serial]/birthday:
  // form fields are named `q_<questionId>` so a plain <form> (zero JS)
  // reconstructs the same answers map a JSON POST would send.
  const contentType = request.headers.get('content-type') ?? ''
  const isFormPost = !contentType.includes('application/json')
  let programId: string | undefined
  let answers: unknown
  try {
    if (isFormPost) {
      const form = await request.formData()
      programId = form.get('program_id')?.toString()
      const map: Record<string, string> = {}
      for (const [key, value] of form.entries()) {
        if (key.startsWith('q_') && typeof value === 'string') map[key.slice(2)] = value
      }
      answers = map
    } else {
      const body = (await request.json()) as { program_id?: string; answers?: unknown }
      programId = body.program_id
      answers = body.answers
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  function fail(error: string, status: number) {
    if (isFormPost) {
      return NextResponse.redirect(
        new URL(
          `/pass/${params.serial}/survey/${programId ?? ''}?error=${encodeURIComponent(error)}`,
          request.url
        ),
        303
      )
    }
    return NextResponse.json({ error }, { status })
  }

  if (!programId) {
    return fail('program_id is required', 400)
  }

  const admin = getSupabaseAdmin()

  const { data: member } = await admin
    .from('members')
    .select('member_id, tenant_id')
    .eq('pass_serial', params.serial)
    .maybeSingle()
  if (!member) {
    return fail('Pass not found', 404)
  }

  const { data: program } = await admin
    .from('loyalty_programs')
    .select('program_id, status, config')
    .eq('program_id', programId)
    .eq('venue_id', member.tenant_id)
    .eq('type', 'survey')
    .maybeSingle()
  if (!program || program.status !== 'active') {
    return fail('Survey not found or not active', 404)
  }

  const config = (program.config ?? {}) as {
    questions?: unknown
    default_points_value?: number
    default_value_cents?: number
  }
  if (!isValidSurveyConfig(config.questions)) {
    console.error('[pass/survey] program has an invalid question set:', program.program_id)
    return fail('This survey is not configured correctly', 500)
  }
  const questions = config.questions as SurveyQuestion[]

  if (!validateSurveyAnswers(questions, answers)) {
    return fail('Every question needs an answer', 400)
  }

  const { data: response, error } = await admin
    .from('survey_responses')
    .insert({
      venue_id: member.tenant_id,
      member_id: member.member_id,
      program_id: program.program_id,
      answers,
    })
    .select('response_id')
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      return fail('You already completed this survey', 409)
    }
    console.error('[pass/survey] insert failed:', error.message)
    return fail('Could not save your response', 500)
  }

  const pointsValue =
    typeof config.default_points_value === 'number' ? config.default_points_value : null
  const valueCents =
    typeof config.default_value_cents === 'number' ? config.default_value_cents : null

  let offerId: string | null = null
  if (pointsValue != null || valueCents != null) {
    const result = await issueMemberOffer(admin, {
      venueId: member.tenant_id,
      memberId: member.member_id,
      programId: program.program_id,
      pointsValue,
      valueCents,
      periodKey: 'survey_completion',
    })
    if (result.issued) {
      offerId = result.offer.offerId
      // Link the reward back to the response it was earned by — read-side
      // convenience for the results view, not load-bearing for anything.
      await admin
        .from('survey_responses')
        .update({ offer_id: offerId })
        .eq('response_id', response!.response_id)
    } else if (result.reason === 'error') {
      console.error('[pass/survey] offer issue failed:', result.message)
    }
  }

  void emitEvent({
    type: 'survey.completed',
    actor: `member:${member.member_id}`,
    venueId: member.tenant_id,
    payload: { program_id: program.program_id, offer_id: offerId },
  })

  if (isFormPost) {
    return NextResponse.redirect(new URL(`/pass/${params.serial}?survey_done=1`, request.url), 303)
  }
  return NextResponse.json({ ok: true, offer_issued: offerId != null })
}
