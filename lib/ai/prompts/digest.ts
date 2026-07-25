import 'server-only'

import { voicePreamble, type BuiltPrompt } from '@/lib/ai/prompts/shared'
import type { VenueWeekStats } from '@/lib/owner-stats'

export interface DigestPromptContext {
  businessName: string
  stats: VenueWeekStats
}

/**
 * CS-2: the weekly owner digest — a short narrative of the venue's own
 * week, addressed to the owner (never sent to members). Numbers come only
 * from venue_week_stats; the model narrates, it does not compute. An
 * empty-data week gets the warm onboarding framing, never "0 regulars".
 */
export function buildDigestPrompt(ctx: DigestPromptContext): BuiltPrompt {
  const s = ctx.stats
  const lines = s.hasAnyData
    ? [
        `Café: ${ctx.businessName}`,
        `This week so far (their real numbers):`,
        `- Regulars who returned this week: ${s.regularsReturned}`,
        `- New members this week: ${s.membersThisWeek} (last week: ${s.membersLastWeek})`,
        `- Visits this week: ${s.visitsThisWeek} (last week: ${s.visitsLastWeek})`,
        `- Regulars at risk of drifting away: ${s.fadingNow}`,
        '',
        'Write a short weekly note to the owner (under ~80 words): lead with',
        'the regulars-returned number, add one honest observation from the',
        'rest, end with one gentle nudge (e.g. greet a fading regular by',
        'name at the counter). Use only the numbers above — never compare',
        'to other cafés or invent trends the numbers do not show.',
      ]
    : [
        `Café: ${ctx.businessName}`,
        'This café is brand new to aro — no visits or members recorded yet.',
        '',
        'Write a short, warm welcome note to the owner (under ~80 words):',
        'their first regulars week starts with the first scan — encourage',
        'them to put the join QR on the counter. No numbers, no zeros.',
      ]

  return { system: voicePreamble(), prompt: lines.join('\n') }
}
