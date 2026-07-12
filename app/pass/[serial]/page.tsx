import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { qrSvg } from '@/lib/qr'

/**
 * Web pass (Plan 2) — PUBLIC by bearer serial (unguessable uuid).
 * Server-rendered; zero browser Supabase calls. Shows first name ONLY —
 * never phone/email back to whoever holds the link.
 */

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Your pass' }

interface PassData {
  firstName: string | null
  venueName: string
  balance: number
  nextReward: { name: string; points_required: number } | null
  serial: string
}

async function getPass(serial: string): Promise<PassData | null> {
  // Serial must look like a uuid — anything else is not worth a query
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serial)) {
    return null
  }
  const admin = getSupabaseAdmin()
  const { data: member } = await admin
    .from('members')
    .select('member_id, tenant_id, full_name, pass_serial')
    .eq('pass_serial', serial)
    .maybeSingle()
  if (!member) return null

  const [{ data: venue }, { data: bal }, { data: rewards }] = await Promise.all([
    admin.from('venues').select('business_name').eq('venue_id', member.tenant_id).single(),
    admin.from('member_balances').select('balance').eq('member_id', member.member_id).maybeSingle(),
    admin
      .from('rewards')
      .select('name, points_required')
      .eq('tenant_id', member.tenant_id)
      .eq('is_active', true)
      .order('points_required', { ascending: true }),
  ])

  const balance = bal?.balance ?? 0
  const nextReward =
    rewards?.find(r => r.points_required > balance) ?? rewards?.[rewards.length - 1] ?? null

  return {
    firstName: member.full_name?.split(' ')[0] ?? null,
    venueName: venue?.business_name ?? 'Your café',
    balance,
    nextReward,
    serial,
  }
}

export default async function PassPage({ params }: { params: { serial: string } }) {
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
