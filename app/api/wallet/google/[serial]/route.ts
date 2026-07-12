import { NextResponse } from 'next/server'

/**
 * Google Wallet pass (Plan 2 — visible stub).
 * Same rule as the Apple route: explicit 501 until Google Wallet issuance
 * is implemented. TODO(Phase 3): Generic pass class + signed JWT save link
 * (GOOGLE_WALLET_ISSUER_ID / GOOGLE_WALLET_SA_KEY_JSON).
 */
export async function GET() {
  return NextResponse.json(
    { stubbed: true, message: 'Google Wallet passes arrive in the next phase' },
    { status: 501 }
  )
}
