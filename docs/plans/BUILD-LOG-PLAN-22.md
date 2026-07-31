# BUILD-LOG — PLAN-22: Kitchen Display Surface

## What shipped

- **`app/kitchen/page.tsx` + `app/kitchen/kitchen-screen.tsx`** — a
  dedicated kitchen route, authenticated with the exact same counter PIN
  session (`/api/counter/login`, `/api/counter/session`,
  `/api/counter/logout`, `COUNTER_COOKIE`) as `/counter`, but reachable
  directly at `/kitchen` instead of being buried behind the counter UI's
  "Open order queue" button.
- Reuses `app/api/counter/orders/route.ts` and
  `app/api/counter/orders/[id]/route.ts` **unchanged in logic** — the same
  payload, the same `transition_order_status` RPC call for status advance.
  One small additive change: the GET route now also returns
  `kitchen_config` alongside `orders` (zero behavioural change for the
  existing `/counter` consumer, which already ignores unknown keys).
- **Ticket age escalation**: `lib/orders/kitchen-config.ts` (mirrors
  `tip-config.ts`'s `brand_kit` namespacing pattern), configurable via a
  new `KitchenSettings` card on the HQ Orders page
  (`app/api/orders/kitchen-settings/route.ts`, owner/manager only).
  Defaults: 5 min → sage/saffron, 12 min → saffron/terra.
- **Chime**: muted by default; the `AudioContext` is created/resumed
  synchronously inside the unmute button's own click handler
  (`primeAudio`), not lazily inside the poll callback — this is the
  detail that actually matters for browser autoplay policy: a `new
AudioContext()` created outside a genuine user gesture can be silently
  blocked on some browsers even if a click happened moments earlier
  elsewhere on the page.
- **Always-on display mode**: `navigator.wakeLock.request('screen')` on
  mount, re-requested on `visibilitychange` (wake locks are released when
  a tab is hidden — reacquiring on return-to-visible is required, not
  optional). Silently no-ops where the API is unsupported.
- **Design bar, kitchen exception applied**: large type (`text-2xl`/`text-4xl`
  throughout), every control is a tap target ≥44px (several are 56px —
  the status-advance buttons), no hover-only affordance anywhere.

## Real architectural finding — flagged, not improvised

`MASTER-PLAN-v2R` §6 PLAN-22 calls for Supabase Realtime replacing the
15-second poll. Verified live against `aro-platform`
(`jjgccfrwjkwknyjtbtxa`):

- `orders` has RLS **enabled with zero policies**
  (`SELECT polname FROM pg_policy … WHERE relname='orders'` → empty rows).
  Deny-all to `anon`/`authenticated`, service-role only — correct and
  intentional per the batch-migration RLS doctrine.
- The counter/kitchen session (`lib/counter-session.ts`) is a **custom
  HMAC-signed cookie**, never a Supabase Auth session — no Supabase JWT
  is ever issued to this browser flow.
- A client-side Supabase Realtime subscription (`postgres_changes`) is
  authorized through the same RLS a REST call would use. With zero
  policies and no Supabase Auth session bound to this cookie, there is no
  legitimate way for a kitchen browser tab to receive `orders` change
  events directly from Supabase without either (a) loosening `orders` RLS
  to grant `anon`/`authenticated` a scoped read — a tenant-isolation
  change — or (b) minting a scoped custom JWT via a `SUPABASE_JWT_SECRET`
  for Realtime Authorization, a secret this environment does not have
  configured anywhere (`grep -in jwt .env.example` → nothing).
- Both paths are auth/tenant-isolation architecture decisions. Per the
  master plan's own binding doctrine ("never improvise on tenant
  isolation, auth… logic," and money/consent/cross-cutting design is a
  Fable-tier trigger), **this is escalated rather than built**. Shipped
  instead: a 3-second poll (down from 15s), with the screen honestly
  labelling itself "Live · polling every 3s" / "Reconnecting…" — it never
  claims to be realtime, and it never silently goes stale.
- **Recommendation for whoever picks this up**: the cleanest path is
  probably (b) — mint a short-lived custom JWT with a `venue_id` claim at
  counter-login time (alongside the existing HMAC cookie), add a
  `SUPABASE_JWT_SECRET` env var, and add a narrow `realtime.messages` RLS
  policy scoped to that claim for a `kitchen:<venue_id>` broadcast topic.
  That is an architecture decision, not a implementation detail — flagging
  it here and in STATUS.md rather than deciding it myself.

## Verified

- `npx tsc --noEmit`, `npm run build`, `npm run lint` all green (`.next`
  cache cleared first — a stale cache from a different branch's build
  otherwise produces phantom type errors for files that don't exist on
  this branch, worth noting for the next lane session that hits it).
- `grep -rE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]'` over every file this
  PR touches: clean.
- `order_items.notes` column existence confirmed by reading
  `supabase/aro_schema.sql` directly (not assumed) before using it in the
  kitchen ticket's item-notes line.

## Verification gap — honest about what was NOT checked

- **No live browser check.** Same environment gap as PLAN-20: no
  `SUPABASE_SERVICE_ROLE_KEY`/`.env.local`, so the dev server cannot
  authenticate to Supabase. The PIN login flow, the 3s poll, the chime's
  autoplay behaviour, the wake lock's actual screen-on effect, and the
  ticket-colour escalation were **not exercised in a real browser** — only
  verified by reading the code, the existing `/counter` precedent this
  reuses, and (for ticket colour) the pure `ticketUrgency` function's
  logic by inspection. `ticketUrgency` itself is a pure function that
  takes `nowMs` as a parameter specifically so it can be unit-tested with
  an injected clock later — no test harness exists in this repo to run one
  in this session.
- Chime sound quality/volume was not tested on a real device/speaker.
