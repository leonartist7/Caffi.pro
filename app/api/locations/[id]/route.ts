import { NextResponse } from 'next/server'

// Locations module isn't wired to a live table yet — see lib/modules.ts.
// Kept as a stub (not deleted) because app/tenants/[id]/page.tsx still
// calls it; deleting would turn a "not enabled" state into a 404.
export async function GET() {
  return NextResponse.json({ error: 'module not enabled' }, { status: 501 })
}

export async function PATCH() {
  return NextResponse.json({ error: 'module not enabled' }, { status: 501 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'module not enabled' }, { status: 501 })
}
