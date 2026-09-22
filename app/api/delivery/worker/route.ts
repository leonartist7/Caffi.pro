import { timingSafeEqual } from 'node:crypto'
import { handled, json, DeliveryHttpError } from '@/lib/delivery/http'
import { processDeliveryWork } from '@/lib/delivery/worker'

export async function POST(request: Request) {
  return handled(async () => {
    const secret = process.env.CAFFI_DELIVERY_WORKER_SECRET
    const supplied = request.headers.get('authorization') ?? ''
    const expected = `Bearer ${secret}`
    if (
      !secret ||
      secret.length < 32 ||
      supplied.length !== expected.length ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
    )
      throw new DeliveryHttpError('NOT_AUTHENTICATED', 401)
    return json(await processDeliveryWork())
  })
}
