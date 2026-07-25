import 'server-only'

import type { AiProvider, GenerateDraftRequest, GenerateDraftResult } from '@/lib/ai/provider'

/**
 * Anthropic Messages API adapter — the ONLY file in the repo that knows the
 * Anthropic API shape (master plan §4.7 doctrine applied to generation).
 * Plain fetch, no SDK dependency. Every failure maps to a generic safe
 * { ok: false } — provider internals are logged server-side, never returned.
 */

const API_URL = 'https://api.anthropic.com/v1/messages'
const API_VERSION = '2023-06-01'
const DEFAULT_MODEL = 'claude-haiku-4-5'
const MAX_TOKENS = 400
const TIMEOUT_MS = 30_000

interface MessagesResponse {
  content?: { type: string; text?: string }[]
}

export class AnthropicAiProvider implements AiProvider {
  readonly key = 'anthropic'

  async generateDraft(req: GenerateDraftRequest): Promise<GenerateDraftResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // Defensive only — callers gate on isAiConfigured() and show the
      // STUBBED state before ever reaching the adapter.
      return { ok: false, error: 'ai_not_configured' }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify({
          model: process.env.AI_DRAFT_MODEL ?? DEFAULT_MODEL,
          max_tokens: MAX_TOKENS,
          system: req.system,
          messages: [{ role: 'user', content: req.prompt }],
        }),
        signal: controller.signal,
        // Generation is always a fresh, per-request call — never cached.
        cache: 'no-store',
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        console.error('[ai] anthropic non-2xx:', res.status, detail.slice(0, 500))
        return { ok: false, error: 'generation_failed' }
      }

      const data = (await res.json()) as MessagesResponse
      const text = data.content?.find(b => b.type === 'text')?.text?.trim()
      if (!text) {
        console.error('[ai] anthropic empty/malformed response')
        return { ok: false, error: 'generation_failed' }
      }
      return { ok: true, output: text }
    } catch (err) {
      console.error('[ai] anthropic request failed:', err)
      return { ok: false, error: 'generation_failed' }
    } finally {
      clearTimeout(timeout)
    }
  }
}
