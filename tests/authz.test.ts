import { beforeEach, describe, expect, it, vi } from 'vitest'

type Membership = {
  role: 'owner' | 'manager' | 'staff' | 'aro_admin'
  venue_id: string | null
  org_id: string
  is_active?: boolean
}

type State = {
  session: { user: { id: string } | null; error: unknown } | Error
  venue: { data: { venue_id: string; org_id: string } | null; error: unknown }
  resource: { data: { tenant_id: string } | null; error: unknown }
  memberships: { data: Membership[] | null; error: unknown }
}

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }))
vi.mock('react', async importOriginal => {
  const react = await importOriginal<typeof import('react')>()
  return { ...react, cache: <T>(fn: T) => fn }
})

import { requireRowVenueRole, requireVenueRole } from '@/lib/authz'

const venueA = 'venue-a'
const venueB = 'venue-b'
const orgA = 'org-a'
const orgB = 'org-b'

let state: State
let membershipEq: ReturnType<typeof vi.fn>

function configure(stateForTest: State) {
  state = stateForTest
  let requestedVenueId = venueA

  const venueQuery = {
    select: vi.fn(() => venueQuery),
    eq: vi.fn((column: string, value: string) => {
      if (column === 'venue_id') requestedVenueId = value
      return venueQuery
    }),
    single: vi.fn(async () =>
      requestedVenueId === venueB
        ? { data: { venue_id: venueB, org_id: orgB }, error: null }
        : state.venue
    ),
  }
  const resourceQuery = {
    select: vi.fn(() => resourceQuery),
    eq: vi.fn(() => resourceQuery),
    single: vi.fn(async () => state.resource),
  }
  const membershipsQuery = {
    select: vi.fn(() => membershipsQuery),
    eq: vi.fn(),
  }
  membershipEq = membershipsQuery.eq
  membershipEq.mockImplementationOnce(() => membershipsQuery).mockImplementation(() => state.memberships)

  mocks.createClient.mockReturnValue({
    auth: {
      getUser: vi.fn(async () => {
        if (state.session instanceof Error) throw state.session
        return { data: { user: state.session.user }, error: state.session.error }
      }),
    },
  })
  mocks.getSupabaseAdmin.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'venues') return venueQuery
      if (table === 'members') return resourceQuery
      if (table === 'memberships') return membershipsQuery
      throw new Error(`Unexpected table ${table}`)
    }),
  })
}

function defaultState(): State {
  return {
    session: { user: { id: 'user-a' }, error: null },
    venue: { data: { venue_id: venueA, org_id: orgA }, error: null },
    resource: { data: { tenant_id: venueB }, error: null },
    memberships: { data: [], error: null },
  }
}

async function expectDenied(result: Awaited<ReturnType<typeof requireVenueRole>>, status: number) {
  expect(result.ok).toBe(false)
  if (result.ok) throw new Error('Expected authorization to be denied')
  expect(result.response.status).toBe(status)
}

describe('SPEC-01-AC-01 requireVenueRole active-membership contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configure(defaultState())
  })

  it('returns 400 before any dependency call when venue ID is absent', async () => {
    await expectDenied(await requireVenueRole(null), 400)
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('returns 401 when the session is absent or fails', async () => {
    state.session = { user: null, error: null }
    await expectDenied(await requireVenueRole(venueA), 401)

    configure({ ...defaultState(), session: new Error('cookie unavailable') })
    await expectDenied(await requireVenueRole(venueA), 401)
  })

  it('returns 404 for a missing venue and 500 for a membership dependency failure', async () => {
    state.venue = { data: null, error: { message: 'not found' } }
    await expectDenied(await requireVenueRole(venueA), 404)

    configure({ ...defaultState(), memberships: { data: null, error: { message: 'database down' } } })
    await expectDenied(await requireVenueRole(venueA), 500)
  })

  it('denies a revoked venue owner (the regression that failed before the repair)', async () => {
    state.memberships = {
      data: [{ role: 'owner', venue_id: venueA, org_id: orgA, is_active: false }],
      error: null,
    }

    await expectDenied(await requireVenueRole(venueA), 403)
    expect(membershipEq).toHaveBeenCalledWith('is_active', true)
  })

  it.each([
    { role: 'manager' as const, venue_id: null, org_id: orgA },
    { role: 'aro_admin' as const, venue_id: null, org_id: orgB },
  ])('denies an inactive $role membership', async membership => {
    state.memberships = { data: [{ ...membership, is_active: false }], error: null }
    await expectDenied(await requireVenueRole(venueA), 403)
  })

  it('permits an active same-venue allowed role', async () => {
    state.memberships = {
      data: [{ role: 'owner', venue_id: venueA, org_id: orgA, is_active: true }],
      error: null,
    }
    const result = await requireVenueRole(venueA, ['owner'])
    expect(result).toMatchObject({ ok: true, ctx: { role: 'owner', venueId: venueA } })
  })
})

describe('SPEC-01-AC-02 requireVenueRole tenant isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configure(defaultState())
  })

  it('permits an active org-wide manager in the venue organization', async () => {
    state.memberships = {
      data: [{ role: 'manager', venue_id: null, org_id: orgA, is_active: true }],
      error: null,
    }
    const result = await requireVenueRole(venueA, ['manager'])
    expect(result).toMatchObject({ ok: true, ctx: { role: 'manager', venueId: venueA } })
  })

  it('permits an active platform administrator without widening other roles', async () => {
    state.memberships = {
      data: [{ role: 'aro_admin', venue_id: null, org_id: orgB, is_active: true }],
      error: null,
    }
    const result = await requireVenueRole(venueA, ['owner'])
    expect(result).toMatchObject({ ok: true, ctx: { role: 'aro_admin', venueId: venueA } })
  })

  it.each([
    { role: 'owner' as const, venue_id: venueB, org_id: orgA, label: 'another venue' },
    { role: 'manager' as const, venue_id: null, org_id: orgB, label: 'another organization' },
    { role: 'staff' as const, venue_id: venueA, org_id: orgA, label: 'a disallowed role' },
  ])('denies an active membership from $label', async membership => {
    state.memberships = { data: [{ ...membership, is_active: true }], error: null }
    await expectDenied(await requireVenueRole(venueA, ['owner', 'manager']), 403)
  })

  it('resolves a resource venue before authorization, denying a guessed cross-tenant row ID', async () => {
    state.memberships = {
      data: [{ role: 'owner', venue_id: venueA, org_id: orgA, is_active: true }],
      error: null,
    }
    await expectDenied(await requireRowVenueRole('members', 'member_id', 'guessed-member', ['owner']), 403)
  })
})
