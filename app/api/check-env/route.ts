import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Dev-only env sanity check. In production this route 404s — it must not
 * advertise which secrets exist on a live deployment.
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const envCheck = {
    timestamp: new Date().toISOString(),
    hasPublicUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasPublicKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
    hasSentryDsn: !!process.env.SENTRY_DSN,
    demoMode: process.env.DEMO_MODE === 'true',
    orderingEnabled: process.env.ORDERING_ENABLED === 'true',
    nodeEnv: process.env.NODE_ENV,
  }

  const allGood = envCheck.hasPublicUrl && envCheck.hasPublicKey && envCheck.hasServiceKey

  return NextResponse.json({
    status: allGood
      ? 'All required Supabase variables loaded'
      : 'Missing variables — see .env.example',
    ...envCheck,
  })
}
