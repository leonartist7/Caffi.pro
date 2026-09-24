import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { GeneratableDraftKind } from './provider'

export class AiBudgetError extends Error {
  constructor(readonly code: 'DISABLED' | 'EXHAUSTED' | 'UNAVAILABLE') {
    super(code)
  }
}

/** Byte length is a conservative upper bound for text tokenization. */
export function reservationTokens(system: string, prompt: string, maxOutputTokens: number): number {
  const count = Buffer.byteLength(system + prompt, 'utf8') + maxOutputTokens
  if (!Number.isSafeInteger(count) || count < 1 || count > 100000) throw new AiBudgetError('UNAVAILABLE')
  return count
}

export async function reserveGeneration(input: {
  venueId: string
  kind: GeneratableDraftKind
  provider: 'gateway' | 'openai'
  model: string
  tokens: number
}): Promise<string> {
  const { data, error } = await getSupabaseAdmin().rpc('ai_reserve_generation', {
    p_venue_id: input.venueId,
    p_kind: input.kind,
    p_provider: input.provider,
    p_model: input.model,
    p_reserved_tokens: input.tokens,
  })
  if (error || typeof data !== 'string') {
    if (error?.message.includes('AI_BUDGET_DISABLED')) throw new AiBudgetError('DISABLED')
    if (error?.message.includes('AI_BUDGET_EXHAUSTED')) throw new AiBudgetError('EXHAUSTED')
    throw new AiBudgetError('UNAVAILABLE')
  }
  return data
}
export async function settleGeneration(
  venueId: string, id: string, outcome: 'succeeded' | 'failed' | 'unknown', usedTokens?: number
): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc('ai_settle_generation', {
    p_venue_id: venueId, p_id: id, p_outcome: outcome, p_used_tokens: usedTokens ?? null,
  })
  if (error) throw new AiBudgetError('UNAVAILABLE')
}
