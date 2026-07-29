import { voicePreamble, type VenueVoiceContext } from '@/lib/ai/prompts/shared'
import type { VenueWeekStats } from '@/lib/owner-stats'

/**
 * CS-2. Almost entirely a formatting exercise: `venue_week_stats` already
 * returns every number this needs in one round trip, and the owner already
 * sees those raw numbers on /home. The digest's job is to say what they mean
 * — which weeks moved, and in which direction — not to repeat the tiles.
 *
 * Addressed to the owner, never to a member: a digest has no send path in
 * this release, so it can speak plainly about at-risk regulars in a way a
 * customer-facing message never would.
 */
export interface DigestContext extends VenueVoiceContext {
  stats: VenueWeekStats
}

/** A short paragraph. Longer than this and the owner stops reading it weekly. */
export const DIGEST_MAX_TOKENS = 320

function trendLine(label: string, current: number, previous: number): string {
  const delta = current - previous
  const direction =
    delta > 0 ? `up ${delta} from` : delta < 0 ? `down ${Math.abs(delta)} from` : 'level with'
  return `- ${label}: ${current} this week, ${direction} ${previous} last week.`
}

export function buildDigestPrompt(ctx: DigestContext): { system: string; prompt: string } {
  const { stats } = ctx

  const system = [
    voicePreamble(ctx),
    '',
    "You are writing this week's short summary for the café owner — not for customers.",
    'Three or four sentences, one paragraph, no headings, no bullet points, no sign-off.',
    'Lead with whatever actually moved. If nothing moved much, say so plainly rather than',
    'manufacturing a highlight.',
  ].join('\n')

  const figures = [
    // No last-week counterpart exists for this one in venue_week_stats, so it
    // is stated flat. Handing the model a neighbouring metric to compare it
    // against would manufacture a trend that the data does not support.
    `- Regulars who came back: ${stats.regularsReturned} this week. There is no last-week figure for this one, so do not describe it as rising or falling.`,
    trendLine('New members', stats.membersThisWeek, stats.membersLastWeek),
    trendLine('Visits', stats.visitsThisWeek, stats.visitsLastWeek),
    stats.fading7dAgo === null
      ? `- Members drifting away: ${stats.fadingNow} right now. There is no comparison for last week yet — this is the café's first tracked week, so do not describe this number as rising or falling.`
      : trendLine('Members drifting away', stats.fadingNow, stats.fading7dAgo),
  ].join('\n')

  const prompt = [
    "Here are this week's figures. These are the only numbers you may use, and you may not",
    'round, combine, or extrapolate them into any other figure:',
    '',
    figures,
    '',
    '"Regulars who came back" is the number the owner cares about most — treat it as the headline.',
    '"Members drifting away" means people whose usual rhythm has slipped; going up is bad news,',
    'going down is good news.',
    '',
    'Write the summary.',
  ].join('\n')

  return { system, prompt }
}
