import 'server-only'

import { voicePreamble, type BuiltPrompt } from '@/lib/ai/prompts/shared'

export interface SocialCaptionContext {
  businessName: string
  tagline: string | null
  about: string | null
  /** The owner's own words about what this post is about — the brief. */
  brief: string
}

/**
 * CS-1: one grounded Instagram/Facebook caption from the owner's brief.
 * The brief is the creative source of truth for WHAT the post is about
 * (no database table tracks today's pastry case); the venue rows ground
 * the VOICE. One caption, not a list of variants — approve-in-seconds.
 */
export function buildSocialCaptionPrompt(ctx: SocialCaptionContext): BuiltPrompt {
  const lines = [
    `Café: ${ctx.businessName}`,
    ctx.tagline ? `Their tagline: "${ctx.tagline}"` : null,
    ctx.about ? `How they describe themselves: "${ctx.about}"` : null,
    '',
    'The owner wants a social media caption about this:',
    `"${ctx.brief}"`,
    '',
    'Write ONE caption (under ~60 words) ready to paste into Instagram.',
    'Ground it in the brief above — do not add offerings, dates, or claims',
    'beyond what the owner wrote.',
  ].filter((l): l is string => l !== null)

  return { system: voicePreamble(), prompt: lines.join('\n') }
}
