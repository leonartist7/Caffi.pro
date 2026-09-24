import 'server-only'
import { AiProviderConfigurationError } from '@/lib/ai/errors'
import type { AiProvider, DraftRequest, DraftResult } from '@/lib/ai/provider'

const GATEWAY = 'https://ai-gateway.vercel.sh/v1'

export class GatewayDraftProvider implements AiProvider {
  readonly key = 'gateway' as const
  readonly model: string
  private readonly apiKey: string
  constructor() {
    const model = process.env.AI_GATEWAY_MODEL?.trim()
    const apiKey = process.env.AI_GATEWAY_API_KEY?.trim()
    if (!model || !/^[a-z0-9-]+\/[a-z0-9][a-z0-9._-]+$/.test(model) || !apiKey)
      throw new AiProviderConfigurationError('STUBBED — Gateway model/key is not configured')
    this.model = model
    this.apiKey = apiKey
  }
  async generateDraft(req: DraftRequest): Promise<DraftResult> {
    const headers = { Authorization: 'Bearer ' + this.apiKey, 'Content-Type': 'application/json' }
    try {
      // An unavailable/renamed model is a configuration fault, never a paid fallback.
      const catalog = await fetch(GATEWAY + '/models', {
        headers, cache: 'no-store', signal: AbortSignal.timeout(5000),
      })
      if (!catalog.ok) return { ok: false, error: 'Model catalogue unavailable.' }
      const listing = await catalog.json() as { data?: { id?: string }[] }
      if (!listing.data?.some(entry => entry.id === this.model))
        return { ok: false, error: 'Configured model is unavailable.' }
      const response = await fetch(GATEWAY + '/chat/completions', {
        method: 'POST', headers, cache: 'no-store', signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.prompt }],
          max_completion_tokens: req.maxOutputTokens,
        }),
      })
      if (!response.ok) return { ok: false, error: 'The drafting service refused that request.' }
      const payload = await response.json() as {
        choices?: { message?: { content?: string | null } }[]
        usage?: { total_tokens?: number }
      }
      const output = payload.choices?.[0]?.message?.content?.trim()
      if (!output) return { ok: false, error: 'The drafting service came back empty.' }
      return { ok: true, output, model: this.model, usageTokens: payload.usage?.total_tokens }
    } catch {
      return { ok: false, error: 'The drafting service did not respond in time.' }
    }
  }
}
