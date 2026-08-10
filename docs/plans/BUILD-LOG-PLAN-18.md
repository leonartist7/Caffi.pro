# BUILD-LOG — PLAN-18 (Web push channel)

Branch `sonnet/lane-a-plan18-web-push`, off `main` after PLAN-17 (PR #81)
merged. Zero migrations — `push_subscriptions` and `messages.channel`
(both PLAN-10) already had everything this item needs.

## What shipped

- **`web-push` + `@types/web-push`** added as dependencies (`npm install
web-push`, `npm install -D @types/web-push`) — the only third-party
  package this item needs; no vendor account behind it.
- `lib/push/provider.ts` — `sendPushNotification()` (never throws; every
  failure is a typed result), `getVapidPublicKey()` (client-safe, via
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY`), `isPushConfigured()` (server-side,
  checks all three secret vars). `PushProviderConfigurationError` mirrors
  `lib/payments/adapters/stripe.ts`'s `PaymentProviderConfigurationError`
  exactly — same visible-stub doctrine, same shape.
- `lib/push/eligibility.ts` — `getEligiblePushSubscriptions()`, the
  compliance boundary: one query, `WHERE venue_id = ? AND revoked_at IS
NULL`, with a defensive post-filter dropping any row somehow missing
  its own `p256dh`/`auth` keys (shouldn't happen — both are `NOT NULL`-
  equivalent in practice via the subscribe route's own validation — but
  the type system shouldn't lie about it either).
- `app/api/pass/[serial]/push/subscribe/route.ts` /
  `.../unsubscribe/route.ts` — public by bearer serial. Subscribe upserts
  on the existing `UNIQUE(endpoint)` (a re-subscribe un-revokes rather
  than erroring); unsubscribe sets `revoked_at` scoped to the member who
  owns it (can't revoke someone else's subscription by guessing an
  endpoint).
- `public/sw.js` — extended the **existing** PWA service worker (already
  registered globally via `components/PWARegister.tsx`) with `push` and
  `notificationclick` handlers, rather than introducing a second service
  worker/scope. The push handler only ever displays a payload the server
  already decided and sent — no logic, no decision.
- `app/pass/[serial]/push-subscribe.tsx` — client subscribe/unsubscribe
  UI. Detects iOS Safari outside standalone mode and shows install
  instructions instead of a subscribe button; renders the STUBBED line
  when no public key is configured; renders nothing broken when
  `Notification`/`PushManager` aren't supported at all.
- `app/api/loyalty/push-send/route.ts` — owner-only, two-phase broadcast
  (title + body). Upfront `isPushConfigured()` check before touching
  eligibility. Per-recipient: on success, a `messages` row
  (`channel: 'push', status: 'sent'`); on a `404`/`410`, revokes the
  subscription, emits `push.revoked`, and still writes a `failed`
  `messages` row (a failed send is data, not silence); on any other
  failure, logs and writes `failed` too.
- `app/(owner)/loyalty/loyalty-client.tsx` — a broadcast composer
  (title/message → preview count → typed confirmation above 50 → send),
  same interaction shape as PLAN-13's appreciation batch panel.
- `.env.example` — `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/
  `VAPID_SUBJECT`/`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, all empty by default —
  genuinely unset in this environment, same as every other vendor-key gap
  this session has flagged honestly rather than faked.
- `lib/events.ts` — `push.subscribed`, `push.unsubscribed`, `push.sent`,
  `push.revoked` appended to the Lane A block.

## Deliberate scope cut

- No campaign/scheduling — a single ad hoc broadcast composer, matching
  what v2's N1 doctrine calls for at this stage. No push-on-offer-issuance
  auto-send (a birthday offer landing doesn't trigger a push on its own).

## Verification

- `npx tsc --noEmit` — clean.
- `npx next lint --max-warnings 0` — clean (the one pre-existing,
  unrelated `CreativeStudio.tsx` warning, also present on `main`).
- `npm run build` — clean; `/api/loyalty/push-send`,
  `/api/pass/[serial]/push/subscribe`, `/api/pass/[serial]/push/
unsubscribe` all registered.
- Grep gate: zero `coffee-*`/`cream-*`/`dark-*` in this PR's files.
- **Not verified live — the largest honest gap of any Lane A item this
  session.** `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` are
  unset in this environment, so:
  - No real push was ever sent to a real device — Android Chrome and an
    installed iOS PWA are both explicitly required by the acceptance
    line and neither was available in this session.
  - `web-push`'s actual VAPID-signing and HTTP behavior against a real
    push service (FCM/APNs/Mozilla's push service) was never exercised —
    only read from the library's own documented API shape.
  - No Supabase service-role key / MCP connection in this container,
    same gap as every Lane A PR this session — the eligibility query's
    exclusion behavior, the subscribe upsert, and the revoke-on-410 path
    are all argued from the SQL and the code, not fired against a real
    database.
  - The service worker's `push`/`notificationclick` handlers were never
    triggered by a real push event in a real browser.
    This item needs the most follow-up verification of anything shipped
    this session before it should be trusted in production — generate real
    VAPID keys, set all four env vars in Vercel, and run the full
    subscribe → send → receive → revoke loop against a real device before
    relying on it.
