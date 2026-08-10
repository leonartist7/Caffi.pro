import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { qrSvg } from '@/lib/qr'
import { isOfferExpired, isOfferNotYetValid } from '@/lib/loyalty/offers'
import { ShareReferral } from './share-referral'

/**
 * Web pass (Plan 2) — PUBLIC by bearer serial (unguessable uuid).
 * Server-rendered; zero browser Supabase calls. Shows first name ONLY —
 * never phone/email back to whoever holds the link.
 */

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Your pass' }

interface PassOffer {
  code: string
  programName: string | null
  pointsValue: number | null
  valueCents: number | null
  expiresAt: string | null
  validFrom: string | null
  notYetValid: boolean
}

interface PassData {
  firstName: string | null
  venueName: string
  venueSlug: string | null
  balance: number
  nextReward: { name: string; points_required: number } | null
  offers: PassOffer[]
  /** PLAN-17 — issued, not-yet-revealed mystery offers. Deliberately
   * carries no prize information — only the offer id to link to the
   * reveal page, which is the one place the prize is allowed to appear. */
  unrevealedMysteryOfferIds: string[]
  serial: string
  hasBirthday: boolean
  openSurveys: { programId: string; name: string }[]
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

async function getPass(serial: string): Promise<PassData | null> {
  // Serial must look like a uuid — anything else is not worth a query
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serial)) {
    return null
  }
  const admin = getSupabaseAdmin()
  const { data: member } = await admin
    .from('members')
    .select('member_id, tenant_id, full_name, pass_serial, birthday_month, birthday_day')
    .eq('pass_serial', serial)
    .maybeSingle()
  if (!member) return null

  const [{ data: venue }, { data: bal }, { data: rewards }, { data: offerRows }] =
    await Promise.all([
      admin.from('venues').select('business_name, slug').eq('venue_id', member.tenant_id).single(),
      admin
        .from('member_balances')
        .select('balance')
        .eq('member_id', member.member_id)
        .maybeSingle(),
      admin
        .from('rewards')
        .select('name, points_required')
        .eq('tenant_id', member.tenant_id)
        .eq('is_active', true)
        .order('points_required', { ascending: true }),
      admin
        .from('member_offers')
        .select(
          'offer_id, code, points_value, value_cents, status, expires_at, valid_from, revealed_at, loyalty_programs(name, type)'
        )
        .eq('member_id', member.member_id)
        .eq('status', 'issued')
        .order('issued_at', { ascending: false }),
    ])

  // PLAN-16 — active surveys this member hasn't answered yet. Two bounded
  // queries (active survey programs for the venue, then this member's own
  // response rows against just those ids) rather than one page-owning
  // both concerns — the response check has to be scoped to the member
  // regardless, so there's no cheaper single-query shape here.
  const { data: surveyPrograms } = await admin
    .from('loyalty_programs')
    .select('program_id, name')
    .eq('venue_id', member.tenant_id)
    .eq('type', 'survey')
    .eq('status', 'active')
  let openSurveys: { programId: string; name: string }[] = []
  if (surveyPrograms && surveyPrograms.length > 0) {
    const { data: answered } = await admin
      .from('survey_responses')
      .select('program_id')
      .eq('member_id', member.member_id)
      .in(
        'program_id',
        surveyPrograms.map(p => p.program_id)
      )
    const answeredIds = new Set((answered ?? []).map(a => a.program_id))
    openSurveys = surveyPrograms
      .filter(p => !answeredIds.has(p.program_id))
      .map(p => ({ programId: p.program_id, name: p.name }))
  }

  const balance = bal?.balance ?? 0
  const nextReward =
    rewards?.find(r => r.points_required > balance) ?? rewards?.[rewards.length - 1] ?? null

  // PLAN-12 — only unexpired, unredeemed offers belong on the pass; expiry
  // is checked lazily here rather than relying on a background sweep
  // having already flipped status to 'expired'. PLAN-17 splits off
  // unrevealed mystery offers before they ever reach `offers` — this is
  // the one place in the whole pass-data pipeline that decides what's
  // safe to disclose, so a prize leaking pre-reveal would be a bug here,
  // not in the reveal page itself.
  const unrevealedMysteryOfferIds: string[] = []
  const offers: PassOffer[] = []
  for (const o of offerRows ?? []) {
    if (isOfferExpired(o)) continue
    const program = o.loyalty_programs as unknown as { name: string | null; type: string } | null
    if (program?.type === 'mystery' && !o.revealed_at) {
      unrevealedMysteryOfferIds.push(o.offer_id)
      continue
    }
    offers.push({
      code: o.code,
      programName: program?.name ?? null,
      pointsValue: o.points_value,
      valueCents: o.value_cents,
      expiresAt: o.expires_at,
      validFrom: o.valid_from,
      notYetValid: isOfferNotYetValid(o),
    })
  }

  return {
    firstName: member.full_name?.split(' ')[0] ?? null,
    venueName: venue?.business_name ?? 'Your café',
    venueSlug: venue?.slug ?? null,
    balance,
    nextReward,
    offers,
    unrevealedMysteryOfferIds,
    serial,
    hasBirthday: member.birthday_month != null && member.birthday_day != null,
    openSurveys,
  }
}

export default async function PassPage({
  params,
  searchParams,
}: {
  params: { serial: string }
  searchParams: { birthday_set?: string; birthday_error?: string }
}) {
  const pass = await getPass(params.serial)

  if (!pass) {
    return (
      <main className="min-h-screen bg-aro-cream flex items-center justify-center p-6">
        <div className="relative grain-soft max-w-sm w-full rounded-2xl bg-aro-cream-warm border border-aro-hairline p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-aro-ink mb-2">Pass not found</h1>
          <p className="text-aro-ink-soft text-sm">
            This pass link isn&apos;t valid. Scan the café&apos;s QR to join again — your points are
            safe.
          </p>
        </div>
      </main>
    )
  }

  const walletReady = Boolean(
    process.env.APPLE_PASS_CERT_P12_BASE64 || process.env.GOOGLE_WALLET_ISSUER_ID
  )
  const svg = qrSvg(pass.serial, '#1F1612')

  // PLAN-15 referral share link — same NEXT_PUBLIC_SITE_URL-first,
  // request-origin-fallback convention /api/staff and /api/invites use.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || `https://${headers().get('host') ?? 'localhost:3000'}`
  const referralUrl = pass.venueSlug ? `${origin}/join/${pass.venueSlug}?ref=${pass.serial}` : null

  return (
    <main className="min-h-screen bg-aro-cream flex items-center justify-center p-6">
      <div className="relative grain-soft max-w-sm w-full rounded-2xl bg-aro-cream-warm border border-aro-hairline p-8 text-center">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-aro-muted mb-4">
          {pass.venueName}
        </p>

        <h1 className="font-display text-4xl font-bold text-aro-ink leading-none mb-1">
          {pass.firstName ? `Hi, ${pass.firstName}` : 'Welcome in'}
        </h1>
        <p className="font-serif italic text-aro-ink-soft mb-6">you&apos;re in the circle</p>

        <div
          className="mx-auto w-48 h-48 rounded-xl bg-white p-3 border border-aro-hairline"
          // Inline SVG QR from our vendored encoder — no client JS, no images
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-aro-muted mt-2 mb-6">
          show this at the counter
        </p>

        <div className="rounded-xl bg-aro-sand/60 border border-aro-hairline px-4 py-3 mb-2">
          <p className="font-display text-3xl font-bold text-aro-ink">{pass.balance}</p>
          <p className="text-xs text-aro-muted">points</p>
        </div>
        {pass.nextReward && (
          <p className="text-sm text-aro-ink-soft">
            {pass.balance >= pass.nextReward.points_required ? (
              <>
                <span className="font-semibold text-aro-terra">{pass.nextReward.name}</span> is
                yours — redeem at the counter
              </>
            ) : (
              <>
                {pass.nextReward.points_required - pass.balance} points to{' '}
                <span className="font-semibold">{pass.nextReward.name}</span>
              </>
            )}
          </p>
        )}

        {pass.offers.length > 0 && (
          <div className="mt-6 pt-5 border-t border-aro-hairline text-left space-y-2">
            <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-aro-muted mb-1 text-center">
              your offers
            </p>
            {pass.offers.map(offer => (
              <div
                key={offer.code}
                className="rounded-xl bg-aro-sand/60 border border-aro-hairline px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-aro-ink">
                    {offer.programName ?? 'Offer'}
                  </p>
                  <p
                    className={`font-mono text-lg font-bold tracking-widest ${offer.notYetValid ? 'text-aro-muted' : 'text-aro-terra'}`}
                  >
                    {offer.code}
                  </p>
                </div>
                <p className="text-xs text-aro-muted mt-0.5">
                  {offer.pointsValue != null && `+${offer.pointsValue} points`}
                  {offer.pointsValue != null && offer.valueCents != null && ' · '}
                  {offer.valueCents != null && `$${(offer.valueCents / 100).toFixed(2)} value`}
                  {offer.expiresAt &&
                    ` · expires ${new Date(offer.expiresAt).toLocaleDateString()}`}
                </p>
                {offer.notYetValid && offer.validFrom && (
                  <p className="text-xs text-aro-terra mt-1 font-medium">
                    Good starting{' '}
                    {new Date(offer.validFrom).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>
            ))}
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-aro-muted text-center pt-1">
              show a code at the counter
            </p>
          </div>
        )}

        {!pass.hasBirthday && !searchParams.birthday_set && (
          <div className="mt-6 pt-5 border-t border-aro-hairline text-left">
            <p className="text-sm font-semibold text-aro-ink mb-1">Add your birthday?</p>
            <p className="text-xs text-aro-muted mb-3">
              Just the month and day — never asked twice, never shared.
            </p>
            {searchParams.birthday_error && (
              <p className="text-xs text-aro-rose mb-2">{searchParams.birthday_error}</p>
            )}
            <form
              method="post"
              action={`/api/pass/${pass.serial}/birthday`}
              className="flex flex-col sm:flex-row gap-2"
            >
              <select
                name="month"
                required
                defaultValue=""
                className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
              >
                <option value="" disabled>
                  Month
                </option>
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                name="day"
                required
                defaultValue=""
                className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
              >
                <option value="" disabled>
                  Day
                </option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-aro-terra px-4 py-2 text-sm font-medium text-white shrink-0"
              >
                Save
              </button>
            </form>
          </div>
        )}
        {pass.hasBirthday && searchParams.birthday_set && (
          <p className="mt-6 pt-5 border-t border-aro-hairline text-sm text-aro-sage font-medium">
            Birthday saved — see you then.
          </p>
        )}

        {pass.unrevealedMysteryOfferIds.length > 0 && (
          <div className="mt-6 pt-5 border-t border-aro-hairline text-left space-y-2">
            {pass.unrevealedMysteryOfferIds.map(offerId => (
              <a
                key={offerId}
                href={`/pass/${pass.serial}/mystery/${offerId}`}
                className="block rounded-lg bg-aro-saffron/20 border border-aro-saffron/40 px-4 py-2.5 text-sm font-semibold text-aro-ink hover:bg-aro-saffron/30"
              >
                🎁 You have a mystery reward — tap to reveal
              </a>
            ))}
          </div>
        )}

        {pass.openSurveys.length > 0 && (
          <div className="mt-6 pt-5 border-t border-aro-hairline text-left space-y-2">
            {pass.openSurveys.map(s => (
              <a
                key={s.programId}
                href={`/pass/${pass.serial}/survey/${s.programId}`}
                className="block rounded-lg border border-aro-hairline px-4 py-2.5 text-sm font-medium text-aro-terra hover:bg-aro-sand/40"
              >
                {s.name} — quick survey
              </a>
            ))}
          </div>
        )}

        {referralUrl && <ShareReferral url={referralUrl} venueName={pass.venueName} />}

        <div className="mt-6 pt-5 border-t border-aro-hairline">
          {walletReady ? (
            <div className="flex gap-2 justify-center">
              <a
                href={`/api/wallet/apple/${pass.serial}`}
                className="rounded-lg bg-aro-espresso text-aro-cream text-sm px-4 py-2"
              >
                Add to Apple Wallet
              </a>
              <a
                href={`/api/wallet/google/${pass.serial}`}
                className="rounded-lg bg-aro-espresso text-aro-cream text-sm px-4 py-2"
              >
                Google Wallet
              </a>
            </div>
          ) : (
            <p className="text-xs text-aro-muted">
              Wallet passes coming soon — bookmark this page for now
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
