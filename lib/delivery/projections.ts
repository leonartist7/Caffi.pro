import type { DeliveryJob } from './contracts'

export function guestDelivery(job: DeliveryJob, provider: string) {
  return {
    state: job.state,
    provider: provider === 'own_driver' ? 'own_driver' : 'simulator',
    tracking_accuracy: 'milestones' as const,
    updated_at: job.safe_tracking?.updated_at ?? job.created_at,
    exception: Boolean(job.exception),
  }
}
export function driverDelivery(job: DeliveryJob, preparation: string, destination: unknown) {
  return {
    id: job.id,
    state: job.state,
    version: job.version,
    provider: 'own_driver',
    driver_user_id: job.driver_user_id,
    preparation_status: preparation,
    destination,
  }
}
