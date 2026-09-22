import { createHmac, randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const venueId = '13000000-0000-4000-8000-000000000001'
const driverId = '11000000-0000-4000-8000-000000000005'
const slug = 'spec01-north-one'
let database: SupabaseClient
let password: string
let workerSecret: string

// Real disposable-stack tests, not route mocks. Credentials remain in the Node
// runner: the browser receives only ordinary fixture login/session credentials.
test.describe.configure({ mode: 'serial' })
test.beforeAll(() => {
  for (const name of [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_TEST_DATABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CAFFI_LOCAL_FIXTURE_PASSWORD',
    'CAFFI_DELIVERY_WORKER_SECRET',
    'CAFFI_DELIVERY_WEBHOOK_SECRET',
  ]) {
    if (!process.env[name])
      throw new Error(`Required isolated journey configuration missing: ${name}`)
  }
  for (const value of [
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_TEST_DATABASE_URL!,
    process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
  ]) {
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(value).hostname))
      throw new Error('Delivery journeys refuse non-loopback services.')
  }
  expect(process.env.CAFFI_SYNTHETIC_FIXTURES).toBe('1')
  expect(process.env.CAFFI_DELIVERY_MODE).toBe('simulation')
  expect(process.env.CAFFI_PAYMENT_MODE).toBe('test')
  expect(process.env.CAFFI_SYNTHETIC_VENUE_ID).toBe(venueId)
  expect(process.env.VERCEL).toBeFalsy()
  password = process.env.CAFFI_LOCAL_FIXTURE_PASSWORD!
  workerSecret = process.env.CAFFI_DELIVERY_WORKER_SECRET!
  database = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
})

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/(?:home|counter)(?:\/|$|\?)/)
  await page.goto(`/deliveries?venue_id=${venueId}`)
  await expect(page.getByRole('heading', { name: 'Deliveries', exact: true })).toBeVisible()
}

async function guestCheckout(page: Page, mode: 'own_driver' | 'simulator') {
  await page.goto(`/shop/${slug}/menu`)
  await page.getByRole('button', { name: /Synthetic croissant/ }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Add to order/ })
    .click()
  await page.getByRole('button', { name: 'Increase Synthetic croissant', exact: true }).click()
  await page.getByRole('link', { name: 'Continue to checkout' }).click()
  await page.getByRole('button', { name: 'Delivery', exact: true }).click()
  await page.getByLabel('Name', { exact: true }).fill('Synthetic Delivery Guest')
  await page.getByLabel('Delivery service', { exact: true }).selectOption(mode)
  await page.getByLabel('Address', { exact: true }).fill('1 Synthetic Fixture Street')
  await page.getByLabel('Postal code', { exact: true }).fill('TST 123')
  await page.getByLabel('City', { exact: true }).fill('Fixture City')
  await page.getByLabel('Country code', { exact: true }).fill('CA')
  const pay = page.getByRole('button', { name: 'Continue to secure payment', exact: true })
  await expect(pay).toBeDisabled()
  await page.getByRole('button', { name: 'Get delivery quote', exact: true }).click()
  await expect(pay).toBeEnabled()
  // A real input mutation must invalidate the quoted context in the browser.
  await page.getByLabel('City', { exact: true }).fill('Fixture City Updated')
  await expect(pay).toBeDisabled()
  await page.getByRole('button', { name: 'Get delivery quote', exact: true }).click()
  await expect(pay).toBeEnabled()
  const responsePromise = page.waitForResponse(
    response =>
      new URL(response.url()).pathname === '/api/orders' && response.request().method() === 'POST'
  )
  await pay.click()
  const response = await responsePromise
  expect(response.ok(), 'Guest checkout API must succeed').toBeTruthy()
  const checkout = await response.json()
  expect(checkout.payment_mode).toBe('test')
  expect(checkout.order.order_id).toMatch(/^[a-f0-9-]{36}$/)
  await expect(page).toHaveURL(new RegExp(`/order-confirmation/${checkout.order.order_id}`))
  await expect(page.getByRole('heading', { name: 'Payment received', exact: true })).toBeVisible()
  const orderId = checkout.order.order_id as string
  const payment = await database
    .from('payments')
    .select('status,amount_cents')
    .eq('order_id', orderId)
    .throwOnError()
  expect(payment.data?.filter(row => row.status === 'succeeded')).toHaveLength(1)
  const order = await database
    .from('orders')
    .select('status,total_cents,delivery_fee_cents')
    .eq('order_id', orderId)
    .single()
    .throwOnError()
  expect(order.data?.status).toBe('paid')
  expect(payment.data?.find(row => row.status === 'succeeded')?.amount_cents).toBe(
    order.data?.total_cents
  )
  return {
    orderId,
    trackingToken: checkout.tracking_token as string,
    guestCharge: order.data!.delivery_fee_cents,
  }
}

async function prepare(request: APIRequestContext, orderId: string) {
  const login = await request.post('/api/counter/login', {
    data: { venue_slug: slug, pin: '4242', device: 'spec03-browser-fixture' },
  })
  expect(login.ok()).toBeTruthy()
  for (const status of ['accepted', 'preparing', 'ready']) {
    const response = await request.patch(`/api/counter/orders/${orderId}`, { data: { status } })
    expect(response.ok(), `Kitchen transition ${status} must succeed`).toBeTruthy()
    const order = await database
      .from('orders')
      .select('status')
      .eq('order_id', orderId)
      .single()
      .throwOnError()
    expect(order.data?.status).toBe(status)
  }
}

async function worker(request: APIRequestContext) {
  const response = await request.post('/api/delivery/worker', {
    headers: { authorization: `Bearer ${workerSecret}` },
  })
  expect(response.ok(), 'Authenticated local worker must complete').toBeTruthy()
  return response.json()
}

async function jobFor(orderId: string) {
  const result = await database
    .from('delivery_jobs')
    .select('*')
    .eq('venue_id', venueId)
    .eq('order_id', orderId)
    .single()
    .throwOnError()
  expect(result.data).toBeTruthy()
  return result.data!
}

async function assertDelivered(
  page: Page,
  orderId: string,
  trackingToken: string,
  guestCharge: number
) {
  await page.reload()
  const tracking = page.getByRole('region', { name: 'Delivery tracking' })
  await expect(tracking.getByText('Delivered', { exact: true })).toBeVisible()
  await expect(tracking.getByText(/confirmed milestones/)).toBeVisible()
  const response = await page.request.get(
    `/api/orders/${orderId}/status?${new URLSearchParams({ tracking: trackingToken })}`
  )
  expect(response.ok()).toBeTruthy()
  const guest = await response.json()
  expect(guest.delivery.state).toBe('delivered')
  expect(guest.delivery.tracking_accuracy).toBe('milestones')
  for (const field of [
    'id',
    'job_id',
    'connection_id',
    'approved_cost_minor',
    'actual_cost_minor',
    'address',
    'driver_user_id',
  ]) {
    expect(guest.delivery).not.toHaveProperty(field)
  }
  const jobs = await database
    .from('delivery_jobs')
    .select('id,operation_key,connection_id,state')
    .eq('order_id', orderId)
    .throwOnError()
  expect(jobs.data).toHaveLength(1)
  expect(jobs.data![0].state).toBe('delivered')
  const bookings = await database
    .from('delivery_simulator_bookings')
    .select('external_ref')
    .eq('connection_id', jobs.data![0].connection_id)
    .eq('operation_key', jobs.data![0].operation_key)
    .throwOnError()
  expect(bookings.data).toHaveLength(1)
  const order = await database
    .from('orders')
    .select('status,delivery_fee_cents')
    .eq('order_id', orderId)
    .single()
    .throwOnError()
  expect(order.data?.status, 'Courier events must not overwrite restaurant preparation state').toBe(
    'ready'
  )
  expect(order.data?.delivery_fee_cents, 'Courier cost must not change guest charge').toBe(
    guestCharge
  )
}

test('SPEC-03-AC-03/04/07/08/09 guest payment → kitchen → staff dispatch → assigned driver → guest delivered', async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(150_000)
  const ownerContext = await browser.newContext({ baseURL })
  const driverContext = await browser.newContext({ baseURL })
  try {
    const owner = await ownerContext.newPage()
    const driver = await driverContext.newPage()
    const order = await guestCheckout(page, 'own_driver')
    await prepare(owner.request, order.orderId)
    await login(owner, 'spec01-owner@test.local')
    const awaiting = owner.getByRole('article', { name: `Order ${order.orderId}`, exact: true })
    await awaiting.getByRole('button', { name: 'Approve cost and dispatch', exact: true }).click()
    await expect(owner.getByRole('status')).toContainText('Dispatch requested')
    await worker(owner.request)
    const job = await jobFor(order.orderId)
    expect(job.state).toBe('booked')
    await owner.getByRole('button', { name: 'Refresh deliveries', exact: true }).click()
    const card = owner.getByRole('article', { name: `Delivery ${job.id}`, exact: true })
    await card.getByLabel('Assign restaurant driver').selectOption(driverId)
    await card.getByRole('button', { name: 'Assign driver', exact: true }).click()
    await expect(card.getByRole('heading', { name: 'Driver assigned', exact: true })).toBeVisible()
    await login(driver, 'spec02-counter@test.local')
    const assigned = driver.getByRole('article', { name: `Delivery ${job.id}`, exact: true })
    await expect(assigned.getByRole('region', { name: 'Delivery destination' })).toContainText(
      '1 Synthetic Fixture Street'
    )
    await expect(assigned.getByRole('button', { name: 'Request cancellation' })).toHaveCount(0)
    await assigned.getByRole('button', { name: 'Confirm pickup', exact: true }).click()
    await expect(assigned.getByRole('heading', { name: 'Picked up', exact: true })).toBeVisible()
    await assigned.getByRole('button', { name: 'Confirm delivery', exact: true }).click()
    await expect(assigned.getByRole('heading', { name: 'Delivered', exact: true })).toBeVisible()
    await assertDelivered(page, order.orderId, order.trackingToken, order.guestCharge)
  } finally {
    await ownerContext.close()
    await driverContext.close()
  }
})

test('SPEC-03-AC-04/05/06 concurrent dispatch books once and durable simulator reaches delivery', async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(240_000)
  const ownerContext = await browser.newContext({ baseURL })
  try {
    const owner = await ownerContext.newPage()
    const order = await guestCheckout(page, 'simulator')
    await prepare(owner.request, order.orderId)
    await login(owner, 'spec01-owner@test.local')
    await expect(
      owner.getByRole('article', { name: `Order ${order.orderId}`, exact: true })
    ).toBeVisible()
    const queue = await owner.request.get(`/api/deliveries?venue_id=${venueId}`)
    expect(queue.ok()).toBeTruthy()
    const pending = (await queue.json()).orders.find(
      (row: { order_id: string }) => row.order_id === order.orderId
    )
    expect(pending).toBeTruthy()
    // Independent keys race on the same order: DB order uniqueness must arbitrate.
    const responses = await Promise.all(
      Array.from({ length: 2 }, () =>
        owner.request.post(`/api/orders/${order.orderId}/delivery/dispatch`, {
          headers: { 'Idempotency-Key': randomUUID() },
          data: { quote_id: pending.quote_id, approved_cost_minor: pending.provider_cost_minor },
        })
      )
    )
    expect(responses.some(response => response.status() === 202)).toBe(true)
    for (const response of responses) expect([202, 409]).toContain(response.status())
    const initial = await jobFor(order.orderId)
    await worker(owner.request)
    await expect
      .poll(
        async () => {
          // Only make scheduled work due. The simulator's real elapsed clock advances
          // its milestones; do not edit booking, job, payment or preparation outcomes.
          await database
            .from('delivery_outbox')
            .update({ available_at: new Date(0).toISOString() })
            .eq('job_id', initial.id)
            .eq('venue_id', venueId)
            .eq('done', false)
            .throwOnError()
          await worker(owner.request)
          return (await jobFor(order.orderId)).state
        },
        {
          timeout: 115_000,
          intervals: [1000, 5000, 10000],
          message: 'Persisted simulator must progress through real worker lookups',
        }
      )
      .toBe('delivered')
    await owner.getByRole('button', { name: 'Refresh deliveries', exact: true }).click()
    await expect(
      owner
        .getByRole('article', { name: `Delivery ${initial.id}`, exact: true })
        .getByRole('heading', { name: 'Delivered', exact: true })
    ).toBeVisible()
    await assertDelivered(page, order.orderId, order.trackingToken, order.guestCharge)
    await expect(
      page.getByText('Simulated delivery. No real courier is travelling.', { exact: true })
    ).toBeVisible()
  } finally {
    await ownerContext.close()
  }
})

test('SPEC-03-AC-01/07 authenticated webhook quarantine is durable, deduplicated and hidden from drivers', async ({
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(120_000)
  const secret = process.env.CAFFI_DELIVERY_WEBHOOK_SECRET!
  expect(secret.length).toBeGreaterThanOrEqual(32)
  const connectionId = '1b000000-0000-4000-8000-000000000001'
  const eventId = `fixture-event-${randomUUID()}`
  const externalRef = `unmatched-fixture-${randomUUID()}`
  // Exact raw bytes are signed in the runner; neither signing nor service keys
  // enter browser JavaScript. This is our simulator protocol, not Uber evidence.
  const raw = JSON.stringify({
    provider_event_id: eventId,
    external_ref: externalRef,
    state: 'picked_up',
    occurred_at: new Date().toISOString(),
  })
  const signature = createHmac('sha256', secret).update(raw).digest('hex')
  const invalidSignature = `${signature[0] === '0' ? '1' : '0'}${signature.slice(1)}`
  const path = `/api/webhooks/delivery/simulator/${connectionId}`
  const inbox = () =>
    database
      .from('delivery_events')
      .select(
        'id,venue_id,connection_id,job_id,external_ref,provider_event_id,state,processed_at,outcome'
      )
      .eq('connection_id', connectionId)
      .eq('provider_event_id', eventId)
      .throwOnError()
  const send = (header: string) =>
    request.post(path, {
      headers: { 'Content-Type': 'application/json', 'x-simulator-signature': header },
      data: raw,
    })

  const rejected = await send(invalidSignature)
  expect(rejected.status()).toBe(401)
  expect((await inbox()).data).toEqual([])

  // Semantically equivalent JSON must not pass a signature over different bytes.
  const changedBytes = await request.post(path, {
    headers: { 'Content-Type': 'application/json', 'x-simulator-signature': signature },
    data: `${raw}\n`,
  })
  expect(changedBytes.status()).toBe(401)
  expect((await inbox()).data).toEqual([])

  const accepted = await send(signature)
  expect(accepted.status()).toBe(200)
  expect(await accepted.json()).toEqual({ received: true })
  const afterAcknowledgement = await inbox()
  expect(afterAcknowledgement.data).toHaveLength(1)
  const recorded = afterAcknowledgement.data![0]
  expect(recorded).toMatchObject({
    venue_id: venueId,
    connection_id: connectionId,
    job_id: null,
    external_ref: externalRef,
    provider_event_id: eventId,
    state: 'picked_up',
    processed_at: null,
    outcome: 'quarantined',
  })

  const replays = await Promise.all([send(signature), send(signature)])
  for (const replay of replays) {
    expect(replay.status()).toBe(200)
    expect(await replay.json()).toEqual({ received: true })
  }
  expect((await inbox()).data).toEqual(afterAcknowledgement.data)

  const ownerContext = await browser.newContext({ baseURL })
  const driverContext = await browser.newContext({ baseURL })
  try {
    const owner = await ownerContext.newPage()
    const driver = await driverContext.newPage()
    await login(owner, 'spec01-owner@test.local')
    const ownerQueue = await owner.request.get(`/api/deliveries?venue_id=${venueId}`)
    expect(ownerQueue.status()).toBe(200)
    const ownerBody = await ownerQueue.json()
    expect(ownerBody.quarantined_events.length).toBeLessThanOrEqual(100)
    const summary = ownerBody.quarantined_events.find(
      (event: { id: string }) => event.id === recorded.id
    )
    expect(summary).toMatchObject({
      external_ref: externalRef,
      provider_event_id: eventId,
      connection_id: connectionId,
      state: 'picked_up',
    })
    expect(Object.keys(summary).sort()).toEqual(
      ['id', 'connection_id', 'external_ref', 'provider_event_id', 'state', 'received_at'].sort()
    )
    await expect(owner.getByRole('region', { name: 'Unmatched courier events' })).toContainText(
      externalRef
    )

    await login(driver, 'spec02-counter@test.local')
    const driverQueue = await driver.request.get(`/api/deliveries?venue_id=${venueId}`)
    expect(driverQueue.status()).toBe(200)
    const driverBody = await driverQueue.json()
    expect(Object.keys(driverBody)).toEqual(['jobs'])
    expect(driverBody).not.toHaveProperty('quarantined_events')
    expect(JSON.stringify(driverBody)).not.toContain(eventId)
    expect(JSON.stringify(driverBody)).not.toContain(externalRef)
    await expect(driver.getByRole('region', { name: 'Unmatched courier events' })).toHaveCount(0)
  } finally {
    await ownerContext.close()
    await driverContext.close()
  }
})
