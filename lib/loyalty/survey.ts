/**
 * PLAN-16 — pure survey shape + validation. Zero Supabase imports: given a
 * program's configured questions (`loyalty_programs.config.questions`)
 * and a submitted answers map, says whether the submission is well-formed
 * before it ever reaches the database.
 */

export interface SurveyQuestion {
  id: string
  text: string
  type: 'text' | 'choice'
  /** Required, non-empty for `type: 'choice'`; ignored for `type: 'text'`. */
  options?: string[]
}

export type SurveyAnswers = Record<string, string>

const MIN_QUESTIONS = 3
const MAX_QUESTIONS = 5

/** A program's `config.questions` is well-formed: 3–5 questions (the
 * "short survey" the spec calls for), each with a non-empty id/text, and
 * a choice question always carries at least two options. */
export function isValidSurveyConfig(questions: unknown): questions is SurveyQuestion[] {
  if (!Array.isArray(questions)) return false
  if (questions.length < MIN_QUESTIONS || questions.length > MAX_QUESTIONS) return false
  const ids = new Set<string>()
  for (const q of questions) {
    if (typeof q !== 'object' || q === null) return false
    const question = q as Partial<SurveyQuestion>
    if (typeof question.id !== 'string' || !question.id.trim()) return false
    if (ids.has(question.id)) return false
    ids.add(question.id)
    if (typeof question.text !== 'string' || !question.text.trim()) return false
    if (question.type !== 'text' && question.type !== 'choice') return false
    if (question.type === 'choice') {
      if (!Array.isArray(question.options) || question.options.length < 2) return false
      if (question.options.some(o => typeof o !== 'string' || !o.trim())) return false
    }
  }
  return true
}

/** A submission is required to answer every question — "pay for the
 * response, not the rating" doesn't mean pay for a half-empty one. Choice
 * answers must be one of the question's own configured options (never an
 * arbitrary string masquerading as a choice pick). */
export function validateSurveyAnswers(
  questions: SurveyQuestion[],
  answers: unknown
): answers is SurveyAnswers {
  if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) return false
  const map = answers as Record<string, unknown>
  for (const q of questions) {
    const value = map[q.id]
    if (typeof value !== 'string' || !value.trim()) return false
    if (q.type === 'choice' && !q.options?.includes(value)) return false
  }
  return true
}
