import { voicePreamble, type VenueVoiceContext } from '@/lib/ai/prompts/shared'

/**
 * CS-1's flagship kind. This is the one kind in this release with a
 * human-written brief: a caption is fundamentally about something specific
 * happening today ("maple oat latte is back", "closed Monday"), which no
 * table in the database tracks. Everything the model is allowed to assert
 * comes from either the venue row or that brief.
 */
export interface SocialCaptionContext extends VenueVoiceContext {
  /** The owner's own words about what this post is for. Already validated. */
  brief: string
}

/** Roughly two short sentences plus a hashtag — enough for any platform. */
export const SOCIAL_CAPTION_MAX_TOKENS = 220

export function buildSocialCaptionPrompt(ctx: SocialCaptionContext): {
  system: string
  prompt: string
} {
  const system = [
    voicePreamble(ctx),
    '',
    'You are writing a single social media caption (Instagram or Facebook).',
    'Two or three short lines at most. It must read as postable exactly as written.',
  ].join('\n')

  const prompt = [
    'Write one caption for this post.',
    '',
    `What the post is about, in the owner's words: ${ctx.brief}`,
    '',
    'Use only what is in that description. If it is vague, keep the caption',
    'correspondingly general rather than inventing details to fill it out.',
  ].join('\n')

  return { system, prompt }
}
