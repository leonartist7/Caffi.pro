# PLAN-18 — Web push channel

Lane A, `MASTER-PLAN-v2R-remastered.md` §6. The platform's first
promotional channel needing no vendor account, no pricing call, and no
contract — VAPID keys are self-generated (`web-push generate-vapid-keys`),
configuration, not a vendor relationship. That's the entire reason this
is unblocked while email (v2 §N1) and SMS (§N6) are not.

## Design

**Zero schema change.** `push_subscriptions` (PLAN-10) already has
exactly what this needs: `endpoint UNIQUE`, `revoked_at`, and RLS already
wired service-role-only (no client grant at all — a bearer capability,
never exposed to `authenticated`). `messages.channel` already allows
`'push'` (PLAN-10's own widening of the original `sms`/`email` CHECK).

**The eligibility query is the compliance boundary**, v2 §N1's doctrine
applied here verbatim: `lib/push/eligibility.ts`'s
`getEligiblePushSubscriptions` is **the** query — `WHERE venue_id = ? AND
revoked_at IS NULL` — not a convenience wrapper around a broader one. No
second code path filters recipients differently; the send route
(`/api/loyalty/push-send`) has no ability to see a subscription this
function excluded. `revoked_at` is one column serving two revocation
reasons (an explicit unsubscribe and an automatic 410/404) — a member
with either reaches the exact same excluded state, checked the exact same
way.

**Browser permission is not consent** — the pass page's subscribe button
(`push-subscribe.tsx`) only fires from an explicit tap on copy the venue
controls, never from a bare `Notification.requestPermission()` triggered
on page load. Unsubscribe (`/api/pass/[serial]/push/unsubscribe`) sets
`revoked_at` immediately; the next send's eligibility query excludes it
on the very next read.

**A `404`/`410` from the push service marks the subscription revoked
automatically** — `lib/push/provider.ts`'s `sendPushNotification` never
throws; every failure mode (missing VAPID config, a dead endpoint, a
transient error) is a typed result the send route acts on, revoking on
`{ revoked: true }` and writing a `push.revoked` event plus a `failed`
`messages` row either way — a failed send is never silently dropped.

**Visible-stub, three places, not one.** `lib/push/provider.ts` throws a
typed `PushProviderConfigurationError` when any of
`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` is unset, mirroring
`lib/payments/adapters/stripe.ts`'s existing pattern exactly. The send
route checks this upfront (`isPushConfigured()`) before even computing
eligibility, so an owner sees "not configured" immediately rather than
after a preview. The pass page's subscribe component checks
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` and renders an honest "not set up yet"
line instead of a broken subscribe button.

**iOS's real limit is stated, not hidden**: web push only delivers to an
installed (Home-Screen) PWA on iOS Safari. `push-subscribe.tsx` detects
iOS Safari not running in standalone mode and shows install instructions
instead of a subscribe button that would silently fail to ever deliver —
the design bar's "never promise a member something their device won't
do," applied literally.

**Sends above 50 recipients require typed confirmation** — same
two-phase pattern PLAN-13's appreciation batch established:
`confirm: false` (or omitted) is always a dry run at any recipient count;
the owner UI forces a typed-count match before it ever sends
`confirm: true` once the count exceeds 50.

## Non-goals

- No campaign/scheduling system — this is a single ad hoc broadcast
  composer (title + body), matching the scope of what v2's own N1
  doctrine calls for at this stage.
- No push-triggered-by-offer-issuance (a birthday offer landing doesn't
  auto-push) — that's a natural follow-up once this channel is proven
  live, not part of this item's stated acceptance.

## ✅ Acceptance

- [ ] `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` in
      `.env.example`; missing keys render the visible STUBBED state.
- [ ] A member can subscribe from the pass — **not verified live** (no
      Android Chrome / installed iOS PWA available in this session).
- [ ] Unsubscribe revokes immediately; the next send skips them.
- [ ] A `410`/`404` marks the subscription revoked automatically.
- [ ] Every send writes a `messages` row with `channel = 'push'`.
- [ ] The eligibility query is the compliance boundary.
- [ ] Sends above 50 recipients require typed confirmation matching a
      hand-run count.
- [ ] Design bar (§2).
