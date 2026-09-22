import { beforeEach, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
const mocks = vi.hoisted(() => ({ resource: vi.fn(), rpc: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/delivery/http', () => ({
  userId: async () => 'driver',
  resource: mocks.resource,
  rpc: mocks.rpc,
  body: async (request: Request) => request.json(),
  handled: async (action: () => Promise<Response>) => action(),
  json: (value: unknown, status = 200) => NextResponse.json(value, { status }),
  DeliveryHttpError: class extends Error {},
}))
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => ({ from: mocks.from }) }))
import { POST } from '@/app/api/deliveries/[id]/[action]/route'

beforeEach(() => {
  mocks.resource.mockResolvedValue({ role: 'staff' })
  const query = {
    select: () => query,
    eq: () => query,
    single: async () => ({ data: { status: 'ready' } }),
  }
  mocks.from.mockReturnValue(query)
})

it('SPEC-03-AC-08 milestone mutation does not disclose the privileged RPC job to its driver', async () => {
  mocks.rpc.mockResolvedValue({
    id: 'job',
    order_id: 'order',
    venue_id: 'venue',
    state: 'picked_up',
    version: 3,
    driver_user_id: 'driver',
    operation_key: 'private-operation',
    connection_id: 'private-connection',
    quote_id: 'private-quote',
    external_ref: 'private-booking',
    approved_cost_minor: 500,
    actual_cost_minor: 700,
    exception: 'INTERNAL_DETAIL',
  })
  const response = await POST(
    new Request('https://example.test', {
      method: 'POST',
      body: JSON.stringify({ state: 'picked_up' }),
    }),
    { params: { id: 'job', action: 'milestones' } }
  )
  expect(await response.json()).toEqual({
    id: 'job',
    state: 'picked_up',
    version: 3,
    driver_user_id: 'driver',
    provider: 'own_driver',
    preparation_status: 'ready',
  })
})
