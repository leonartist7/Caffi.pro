import 'server-only'

import { AnthropicAiProvider } from '@/lib/ai/adapters/anthropic'

/**
 * Generation boundary (Creative Studio, PLAN-07). Routes and UI only know
 * this interface; provider-specific code stays inside `lib/ai/adapters/` so
 * adding a second LLM vendor later does not spread provider conditionals
 * through the application — same doctrine as lib/payments/provider.ts.
 */

export type AiDraftKind = 'social_caption' | 'digest'

export interface GenerateDraftRequest {
  kind: AiDraftKind
  /** System prompt: shared voice doctrine + kind-specific rules. */
  system: string
  /** User prompt: the grounded venue context + the ask. */
  prompt: string
}

export type GenerateDraftResult = { ok: true; output: string } | { ok: false; error: string }

export interface AiProvider {
  readonly key: string
  generateDraft(req: GenerateDraftRequest): Promise<GenerateDraftResult>
}

/**
 * True iff the deployment can actually generate. When false, callers must
 * surface the visible STUBBED state ({ stubbed: true }) — never fake copy,
 * never a silent no-op (master plan §3 rule 5).
 */
export function isAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

/**
 * Release-one always selects Anthropic. Only call when isAiConfigured() is
 * true — a missing key is the caller's stub branch, not an adapter error.
 */
export function getAiProvider(): AiProvider {
  return new AnthropicAiProvider()
}
