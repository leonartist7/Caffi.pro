import { NextResponse } from 'next/server'

export async function GET() {
  // This endpoint checks if environment variables are loaded correctly
  const envCheck = {
    timestamp: new Date().toISOString(),
    hasPublicUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasPublicKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    publicUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
    // Don't expose actual keys, just check lengths
    publicKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL || 'not deployed',
  }

  // All should be true for the app to work
  const allGood = envCheck.hasPublicUrl && envCheck.hasPublicKey && envCheck.hasServiceKey

  return NextResponse.json({
    status: allGood ? '✅ All environment variables loaded' : '❌ Missing variables',
    ...envCheck,
  })
}
