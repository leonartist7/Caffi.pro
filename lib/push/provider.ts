import 'server-only'

import webpush from 'web-push'

/**
 * PLAN-18 — VAPID web push. `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/
 * `VAPID_SUBJECT` are self-generated (`npx web-push generate-vapid-keys`),
 * never a vendor account — the entire reason this channel is unblocked
 * while email/SMS aren't (v2R §8). Missing keys throw a typed error the
 * send route turns into a visible `STUBBED` response, matching the
 * `PaymentProviderConfigurationError` pattern `lib/payments/adapters/
 * stripe.ts` already established — never a silent no-op.
 */
export class PushProviderConfigurationError extends Error {}

let configured = false

function requireVapidConfig(): void {
  if (configured) return
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    throw new PushProviderConfigurationError(
      'STUBBED — needs VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT'
    )
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

export interface PushSubscriptionKeys {
  endpoint: string
  p256dh: string
  auth: string
}

export type PushSendResult =
  | { ok: true }
  | { ok: false; revoked: true } // 404/410 — the subscription is dead, caller should revoke it
  | { ok: false; revoked: false; message: string }

/** Sends one push message to one subscription. Never throws — every
 * failure mode (missing config, dead subscription, transient error) is a
 * typed result the caller decides what to do with. */
export async function sendPushNotification(
  subscription: PushSubscriptionKeys,
  payload: { title: string; body: string }
): Promise<PushSendResult> {
  requireVapidConfig() // throws PushProviderConfigurationError if unset — caller renders the STUBBED state

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    )
    return { ok: true }
  } catch (err) {
    const statusCode = (err as { statusCode?: number } | null)?.statusCode
    if (statusCode === 404 || statusCode === 410) {
      return { ok: false, revoked: true }
    }
    return {
      ok: false,
      revoked: false,
      message: err instanceof Error ? err.message : 'push send failed',
    }
  }
}

/** The public key the browser needs to call `pushManager.subscribe`.
 * `NEXT_PUBLIC_*` because it's used client-side; not a secret — VAPID
 * public keys are meant to be exposed, only the private key is sensitive. */
export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null
}

/** All three server-side VAPID vars present — used for an upfront visible-
 * stub check on the send route, so an owner sees "not configured" even
 * before there are any recipients to iterate. */
export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
  )
}
