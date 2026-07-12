import { NextResponse } from 'next/server'

/**
 * Apple Wallet pass (Plan 2 — visible stub).
 * The pass page only renders the wallet buttons when the certificate envs
 * exist; until PassKit signing is implemented this returns an explicit 501
 * so nothing ever fakes a pass. TODO(Phase 3): PassKit .pkpass generation
 * (APPLE_PASS_CERT_P12_BASE64 / APPLE_PASS_CERT_PASSWORD / APPLE_TEAM_ID /
 * APPLE_PASS_TYPE_ID).
 */
export async function GET() {
  return NextResponse.json(
    { stubbed: true, message: 'Apple Wallet passes arrive in the next phase' },
    { status: 501 }
  )
}
