import 'server-only'

import { OpenAiDraftProvider } from '@/lib/ai/adapters/openai'

export { AiProviderConfigurationError, AiProviderRequestError } from '@/lib/ai/errors'

/**
 * The kinds this release can actually generate. `ai_drafts.kind`'s CHECK
 * constraint is wider (it also allows `winback`, `slowday`, `social_image`)
 * because the schema was built ahead of the app — but winback/slowday imply a
 * send path that does not exist until M-1, and social_image needs an image
 * vendor decision nobody has framed. Keeping this union narrow is what stops
 * a future caller from quietly generating a kind with no home to go to.
 */
export type GeneratableDraftKind = 'social_caption' | 'digest'

export interface DraftRequest {
  kind: GeneratableDraftKind
  /** System-level voice instructions, built by lib/ai/prompts/shared.ts. */
  system: string
  /** The kind-specific, fully-grounded user prompt. */
  prompt: string
  /** Upper bound on completion length — captions are short, digests shorter. */
  maxOutputTokens: number
}

export type DraftResult = { ok: true; output: string; model: string } | { ok: false; error: string }

/**
 * Generation boundary. Routes and components only ever know this interface;
 * vendor-specific code stays inside `lib/ai/adapters/`, mirroring the
 * PaymentProvider doctrine in lib/payments/provider.ts. The abstraction earns
 * its keep even with one adapter: the owner already moved this decision once
 * (Anthropic → OpenAI, D-4) and the interface absorbed it without a rewrite.
 */
export interface AiProvider {
  readonly key: string
  generateDraft(req: DraftRequest): Promise<DraftResult>
}

/**
 * One provider for now. A future venue-level model choice belongs here rather
 * than leaking vendor conditionals into the generate route.
 */
export function getAiProvider(): AiProvider {
  return new OpenAiDraftProvider()
}
