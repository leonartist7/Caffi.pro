import 'server-only'

import { AiProviderConfigurationError } from '@/lib/ai/errors'
import type { AiProvider, DraftRequest, DraftResult } from '@/lib/ai/provider'

/**
 * The only file in the codebase that knows OpenAI exists (PLAN-07 Phase 1,
 * decision D-4). Implemented over `fetch` rather than the vendor SDK: the
 * request is one JSON POST, and skipping the dependency keeps the provider
 * boundary genuinely thin — there is no SDK type that could leak upward into
 * a route or component even by accident.
 */
const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions'

/**
 * Overridable per deployment so the model tier can be upgraded without a code
 * change, exactly as R4 requires. The default is a conservative fast/cheap
 * chat model; whoever wires the production key should set AI_DRAFT_MODEL to
 * whatever OpenAI's current cheap tier is at that time rather than trusting
 * this constant to have aged well.
 */
const DEFAULT_MODEL = 'gpt-4o-mini'

/** Generation is user-blocking: fail fast rather than hang the composer. */
const REQUEST_TIMEOUT_MS = 20_000

function requiredEnv(name: 'OPENAI_API_KEY'): string {
  const value = process.env[name]
  if (!value) {
    // Thrown, not returned: a missing key is a deployment fault the caller
    // must surface as a STUBBED badge, not as a retryable generation failure.
    throw new AiProviderConfigurationError(`STUBBED — needs ${name}`)
  }
  return value
}

export function draftModel(): string {
  return process.env.AI_DRAFT_MODEL?.trim() || DEFAULT_MODEL
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[]
}

export class OpenAiDraftProvider implements AiProvider {
  readonly key = 'openai'

  async generateDraft(req: DraftRequest): Promise<DraftResult> {
    const apiKey = requiredEnv('OPENAI_API_KEY')
    const model = draftModel()

    let response: Response
    try {
      response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.prompt },
          ],
          max_completion_tokens: req.maxOutputTokens,
          // Warm but not wild. High enough that two captions for the same
          // brief differ, low enough that the model stays on the facts it
          // was given rather than embroidering them.
          temperature: 0.8,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: 'no-store',
      })
    } catch (err) {
      // Network failure or timeout — transient by nature, so the UI retries.
      const reason = err instanceof Error ? err.message : 'unknown error'
      console.error('[ai] openai request failed:', reason)
      return { ok: false, error: 'The drafting service did not respond in time.' }
    }

    if (!response.ok) {
      // Body may carry the real reason but can also be huge or HTML; log a
      // bounded slice and never surface upstream text to the owner verbatim.
      const detail = (await response.text().catch(() => '')).slice(0, 500)
      console.error('[ai] openai returned', response.status, detail)
      return { ok: false, error: 'The drafting service refused that request.' }
    }

    let payload: ChatCompletionResponse
    try {
      payload = (await response.json()) as ChatCompletionResponse
    } catch {
      console.error('[ai] openai returned unparseable JSON')
      return { ok: false, error: 'The drafting service returned something unreadable.' }
    }

    const output = payload.choices?.[0]?.message?.content?.trim()
    if (!output) {
      // An empty completion must never be stored: a blank draft in the
      // approvals list reads as a product bug, and §7.6 forbids fake output.
      console.error('[ai] openai returned an empty completion')
      return { ok: false, error: 'The drafting service came back empty.' }
    }

    return { ok: true, output, model }
  }
}
