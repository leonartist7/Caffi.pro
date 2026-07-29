# aro — Operating System Masterplan **v2R** (remastered)

**Status: complete draft, 2026-07-29.** This document **extends**
`MASTER-PLAN-v2-operating-system.md`; it does not replace it. Every
doctrine in v2 — the ordering principle, the 🔴/🟡/⚪ tiering, the
"Gated on" column, the Section 7 executor tiering, the STOP-and-flag
protocol — is inherited verbatim and applied to a new batch of work.
Where v2 and this document disagree about what exists, **the codebase
won**: every claim below was verified by reading the repository on
2026-07-29, and the verification is cited inline.

**Reading order for an executor:** `MASTER-PLAN-aro.md` (§4/§5 binding)
→ `MASTER-PLAN-v2-operating-system.md` (sequence + doctrine) →
`docs/plans/STATUS.md` (living status) → this document → your lane's
`PLAN-NN`. Nothing here overrides `MASTER-PLAN-aro.md` §4/§5; conflicts
stop the work.

> **Owner note, 2026-07-29 (post-draft): executor substitution — Fable 5 → Opus 5.**
> Everywhere this document or `MASTER-PLAN-v2-operating-system.md` §7 says
> **"Fable 5"** as the required architect-tier author/reviewer (PLAN-10's
> migration + RLS design, PLAN-12's redemption idempotency, PLAN-15's
> pre-merge once-only-credit review, PLAN-18's consent/revocation design,
> PLAN-24's depletion idempotency, PLAN-36's tip-allocation math, and any
> other "Fable 5 authors/reviews" line in §7 of either document), read
> **"Opus 5"** instead. The owner has chosen to run architect-tier work on
> Opus 5 for this batch. Nothing else about the tiering doctrine changes —
> the *reason* a task is architect-tier (money, consent, or cross-cutting
> design) is unchanged, only which model fills that seat. A lane that hits
> a "Fable 5" line should treat it as "Opus 5" and either escalate to an
> Opus 5 session/agent for that specific design step, or stop and flag if
> none is available — never build the architecture itself on Sonnet-tier
> judgment.

---

## §0 — Two facts about this document's own inputs

Recorded up front because they change what an executor should trust.

1. **`docs/plans/STATUS.md` and `docs/plans/PLAN-09-admin-venue-impersonation.md`
   are not on `main`.** Both exist only on the unmerged branch
   `origin/claude/hq-unification-plan09` (single commit `6f30c85`,
   "feat(admin): venue impersonation for aro_admin (PLAN-09)"). They were
   read from that branch for this document. Anyone reading `main` will not
   find them. See **PR-0** below — this is a hard gate on Lane C, not a
   footnote.

2. **v2 was written before R3/R4 landed and before PLAN-09 existed.**
   STATUS.md is the correction layer, and this document folds STATUS.md's
   two live recommendations in: N8 is re-prioritized out of "filler work"
   (Lane C owns it), and the HQ ↔ venue-console split is treated as one
   product with two shells, never two products.

---

## §1 — GROUND-TRUTH PASS

Required process step 1. Every idea from the request, checked against the
repository and the existing plan corpus. **Only the rows marked 🆕 NEW or
⚠️ INCOMPLETE get a fresh spec below.** Rows marked ✅ BUILT or 📋 PLANNED
are named here so they are not re-proposed as if they were new.

| # | Idea | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | AI voice agent (reservations/questions) | 📋 **PLANNED** | `MASTER-PLAN-v2` §L1 verbatim — "Voice agent for phone reservations/orders", ⚪ LATER, gated on D-13 vendor decision + M-1/M-2 track record. The `create_reservation` RPC it would call is live (`app/api/reservations/route.ts:106`). **Blocked — not in any lane.** |
| 2 | Members page that shows all members | ⚠️ **INCOMPLETE — real bug** | Page exists (`app/(dashboard)/members/page.tsx`) but `listRegulars` (`lib/owner-stats.ts:101`) hard-caps at `limit ?? 50`, the API passes `limit: 100` (`app/api/members/route.ts`), there is **no pagination**, it orders by `days_since_last ASC, nullsFirst: false` — so never-visited members sort **last** and fall off the cap — and `opts.search` filters **client-side, after the limit** (`lib/owner-stats.ts:140`), so searching for member #101 returns nothing. → **Lane A, PLAN-11.** |
| 3a | Marketing — **email** | 📋 **PLANNED** | `MASTER-PLAN-v2` §N1 (M-1 Resend). Gated on D-1 + D-2 + D-10. **Blocked.** |
| 3b | Marketing — **SMS** | 📋 **PLANNED** | `MASTER-PLAN-v2` §N6 (M-2 Twilio). Gated on D-1b. **Blocked.** |
| 3c | Marketing — **app push** | 🆕 **NEW** | Zero hits for `VAPID`, `push_subscription`, `service-worker`, `web push` across `app/ lib/ public/`. A legacy `push_campaigns` table name appears once in the RLS loop (`supabase/aro_schema.sql:965`) with no app code behind it. **This is the only promotional channel that needs no vendor account** — VAPID keys are self-generated. → **Lane A, PLAN-18.** |
| 4 | Creative Studio | ✅ **BUILT** | R4, merged PR #54 (STATUS.md). `app/(owner)/creative/page.tsx`, `components/owner/CreativeStudio.tsx`, `lib/ai/provider.ts` + `lib/ai/adapters/openai.ts`, `lib/ai/prompts/{shared,digest,social-caption}.ts`. Generation still returns STUBBED — `OPENAI_API_KEY` unset. **Do not rebuild.** |
| 5 | Reservations | ✅ **BUILT** | `supabase/migrations/20260716160000_reservations_core.sql` (`reservations` + `waitlist_entries`), `lib/reservations.ts`, `app/reserve/[slug]`, `app/(dashboard)/reservations`, `app/api/reservations/*`, `create_reservation` RPC. **Do not rebuild.** |
| 6a | QR ordering — **order** | ✅ **BUILT** | `venue_tables.qr_token` (`aro_schema.sql:1366`) → `app/t/[token]/page.tsx` redirects to `/shop/[slug]/menu?table=…`. Full storefront: menu, cart, checkout, order confirmation. Parked behind `ORDERING_ENABLED=false` (`lib/flags.ts`). |
| 6b | QR ordering — **pay** | ✅ **BUILT, unkeyed** | `lib/payments/provider.ts` + `adapters/stripe.ts`, `app/api/webhooks/stripe`. `MASTER-PLAN-v2` §R2 — owner env action only. |
| 6c | QR ordering — **tip** | 🆕 **NEW** | Zero hits for `tip`/`gratuity` in `app/ lib/ supabase/`. Non-trivial: `orders` carries `CHECK (total_cents = subtotal_cents + delivery_fee_cents + tax_cents)` (`aro_schema.sql:1410`), so a tip column requires dropping and re-adding that constraint. → **Lane B, PLAN-20.** |
| 6d | QR ordering — **review prompt after payment** | 🆕 **NEW** | Zero hits for `review_url`/`review_prompt`/`google review`. → **Lane B, PLAN-21.** |
| 7a | Team management | ⚠️ **PARTIAL** | `memberships` with roles `owner\|manager\|staff\|aro_admin`, email invites (`lib/invites.ts`), bcrypt counter PINs (`set_counter_pin`/`verify_counter_pin`), `app/(dashboard)/staff` + `app/api/staff/*`. Missing: shifts, hours, tip attribution. → **Lane C, PLAN-34/35.** |
| 7b | Employee tips (allocation) | 🆕 **NEW** | Depends on 6c existing first. Report-only allocation is buildable. → **Lane C, PLAN-36.** |
| 7c | **Payroll** | 🆕 **NEW — BLOCKED** | Tax withholding, remittance, and direct deposit are jurisdiction-bound and need an owner/accountant sign-off of the same class as D-2. A **CSV export of hours + tips** is not payroll processing and *is* buildable (PLAN-37). Payroll proper → **Blocked section.** |
| 8 | Perpetual inventory | 🆕 **NEW** | `inventory_items`, `inventory_transactions`, `menu_item_ingredients` appear **only** as strings in the legacy-RLS loop (`aro_schema.sql:965`) — they are not created by any migration and have zero app code. Nothing exists. → **Lane B, PLAN-23/24/26.** |
| 9a | Loyalty library — point accrual | ✅ **BUILT** | `points_ledger` (append-only, trigger-enforced), `member_balances` view, `venues.loyalty_config` JSONB (`points_per_euro`, `signup_bonus`). |
| 9b | Loyalty library — **birthday** | 📋 **PLANNED, with a schema conflict** | `MASTER-PLAN-v2` §N9 specs `birthday_month`/`birthday_day` SMALLINT and forbids storing a year. **But `members.birthday DATE` already exists** (`aro_schema.sql:326`) — a year-bearing column N9 never accounted for. → **Lane A, PLAN-14** executes N9 *and* resolves the conflict. |
| 9c | Loyalty library — **win-back / "miss you"** | 📋 **PLANNED** | `MASTER-PLAN-v2` §N1; `campaigns.type` CHECK already allows `winback`. Blocked on the send channel. The **offer mechanics** are buildable now (PLAN-13); only the send is blocked. |
| 9d | Loyalty library — **bounce-back cash** | 🆕 **NEW** | No offer/credit table exists. `points_ledger.reason` is bare `TEXT NOT NULL` with no CHECK (`aro_schema.sql:119`) — so v2 §N5's claim that `reason` "already allows `'referral'`" is true only because it allows anything. → **Lane A, PLAN-13.** |
| 9e | Loyalty library — **anniversary** | 🆕 **NEW** | Same surface as birthday; `members.created_at` already gives the join anniversary for free. → **Lane A, PLAN-14.** |
| 9f | Loyalty library — **customer appreciation** | 🆕 **NEW** | Same offer engine as 9d. → **Lane A, PLAN-13.** |
| 9g | Loyalty library — **mystery gamification** | 🆕 **NEW** | Zero hits. → **Lane A, PLAN-17.** |
| 9h | Loyalty library — **survey promotions** | 🆕 **NEW** | Zero hits for `survey`. → **Lane A, PLAN-16.** |
| 9i | Loyalty library — **gift cards** | 📋 **PLANNED — BLOCKED** | `MASTER-PLAN-v2` §H3 (Horizon 3), explicitly: "never built before D-2-class compliance sign-off exists for it specifically — it is a heavier compliance surface than email/SMS." Stored value is regulated money. **Blocked section. Not in any lane.** |
| 9j | Loyalty library — **referrals** | 📋 **PLANNED** | `MASTER-PLAN-v2` §N5, fully specced there, **unblocked** ("needs R4 proven"). Lane A executes v2's spec rather than re-writing it. → **Lane A, PLAN-15.** |
| 10 | Kitchen order flow (app → kitchen, full detail) | ⚠️ **INCOMPLETE — ~70% built** | `components/counter/OrdersQueue.tsx` + `app/api/counter/orders/route.ts` already return every open order with items **and** modifiers, and advance `paid→accepted→preparing→ready→completed`. Gaps: no dedicated kitchen route (it is buried behind the counter PIN UI), 15-second polling instead of realtime, no ticket age, no audible new-order alert, no always-on display mode. → **Lane B, PLAN-22.** |
| 11 | Food costing | 🆕 **NEW** | Needs the recipe link from #8. → **Lane B, PLAN-25.** |
| 12 | Delivery integrations (DoorDash Drive, Uber Direct, Tookan, Uber Eats/Postmates, Careem, Noon, First Delivery, Shipday, Lalamove) | 📋 **PLANNED** | `MASTER-PLAN-v2` §L6 ("delivery dispatch") and `PHASE-6-COMMERCE-CANDIDATES.md`. Every one needs a merchant account, API credentials, and per-market commercial terms. **Blocked section. Not in any lane.** |

**Score:** of 12 idea clusters, **3 are already built** (Creative Studio,
reservations, QR order+pay), **5 are already planned in v2** (voice,
email, SMS, referrals, delivery), **2 are meaningfully incomplete**
(members directory, kitchen flow), and **the rest are genuinely new**
(tips, review prompt, push, inventory, food costing, the offer engine and
its four program types, shifts/tip allocation).

---

## §2 — DESIGN BAR (binding on every phase in this document)

Required process step 4. Stated once; a hard acceptance criterion on
**every** `PLAN-NN` below, not a suggestion. A PR that ships working logic
and misses this bar is **not done**.

1. **`aro` tokens exclusively.** Every new or rebuilt surface uses only
   the `aro-*` Tailwind namespace (`tailwind.config.ts` — `aro.cream`,
   `sand`, `clay`, `terracotta`, `espresso`, `ink`, `ink-soft`, `muted`,
   `hairline`, `terra`, `rose`, `saffron`, `plum`, `sage`, `honey`) plus
   the four registered families (`font-display`, `font-serif`,
   `font-body`, `font-mono`) and the `.grain` overlay in
   `app/globals.css`. **Zero** `coffee-*`, `cream-*`, or `dark-*` classes.
   Enforced per PR by grep gate — see the standing gate in §7. No
   off-system hex values anywhere; a colour the token set lacks gets added
   to the token set, never inlined.
2. **Fully responsive, phone-first.** Every surface is usable at 375 px,
   768 px, and 1280 px. No horizontal page scroll at any of the three. Any
   wide element (order ticket, inventory table, costing grid) scrolls
   inside its own `overflow-x-auto` container, never the page body. Touch
   targets on counter/kitchen/pass surfaces are ≥ 44 px — those are used
   one-handed during service.
3. **Premium, never AI-placeholder.** No lorem ipsum, no unlabelled
   emoji-as-icon, no "Feature coming soon" text shipped as if it were
   content, no default browser controls where the product has a styled
   equivalent. Empty states follow the existing doctrine — warm and
   specific, like the members page's "Your circle starts with the first
   scan.", never "No data". Loading states use `SkeletonLoader`, never a
   bare spinner on a white page. Confetti stays reserved for
   order-placed/reward-redeemed per the aro motion doctrine.
4. **String discipline** (inherited from `MASTER-PLAN-v2` §R3.3):
   user-visible strings are hoisted to a named `STRINGS` constant at the
   top of each new page/component file, never inline JSX literals. Applies
   to new surfaces only; no retrofitting.
5. **Visible-stub rule** (inherited, `MASTER-PLAN-aro.md`): a missing key
   or unconfigured vendor renders a visible "STUBBED — needs `<KEY>`"
   state. Never a silent no-op, never a faked connection.

---

## §3 — SEQUENCING DOCTRINE APPLIED

Required process steps 2 and 3. v2's ordering principle is unchanged:
**revenue leaks before revenue features; proof before promises;
vendor-free before vendor-blocked.** v2's tiers are reused, not forked.

**The autonomy filter, stated as a rule:** an item enters a lane only if a
session can build, test, and merge it **today** with no owner input of any
kind — no vendor account, no API key, no pricing call, no compliance
sign-off. Everything else goes to §8 (Blocked). A lane must never discover
mid-build that its next item was never buildable. Note the distinction this
document relies on repeatedly: *building* a surface that will eventually
send/charge is unblocked; *sending* or *charging* through it is blocked.
PLAN-13's offers can be created and redeemed at the counter with zero
vendors; delivering them by email is N1's problem.

### New items slotted into v2's existing tiers

| Tier | # | Item | PLAN | Lane | Funnel stage | Gated on |
| --- | --- | --- | --- | --- | --- | --- |
| 🔴 NOW | R5 | Batch schema + RLS migration (all lanes' tables, one migration) | PLAN-10 | A (pre-lane) | Platform: unblocks everything below | **Nothing** |
| 🔴 NOW | R6 | Members directory rebuild — pagination + server-side search | PLAN-11 | A | Platform: owner retention | **Nothing** |
| 🔴 NOW | R7 | Tips on QR orders | PLAN-20 | B | Platform: commerce revenue | **Nothing to build.** Live tips need R2. |
| 🔴 NOW | R8 | Post-payment review prompt | PLAN-21 | B | Agency: proof asset | **Nothing** |
| 🟡 NEXT | N10 | Kitchen display surface | PLAN-22 | B | Platform: daily habit | Nothing |
| 🟡 NEXT | N11 | Offer engine + bounce-back / appreciation programs | PLAN-12, PLAN-13 | A | Platform: reactivation | Nothing to build; sends need N1 |
| 🟡 NEXT | N12 | Birthday + anniversary capture (executes v2 §N9) | PLAN-14 | A | Platform: reactivation | Nothing |
| 🟡 NEXT | N13 | Referral engine (executes v2 §N5) | PLAN-15 | A | Both funnels | Nothing |
| 🟡 NEXT | N14 | Survey promotions | PLAN-16 | A | Platform: insight + reactivation | Nothing |
| 🟡 NEXT | N15 | Mystery reward gamification | PLAN-17 | A | Platform: visit frequency | Nothing |
| 🟡 NEXT | N16 | Web push channel (VAPID) | PLAN-18 | A | Platform: reactivation | **Nothing** — self-generated keys |
| 🟡 NEXT | N17 | Owner shell nav unification (+ 3 dead links) | PLAN-30 | C | Platform: perceived quality | PR-0 |
| 🟡 NEXT | N8′ | HQ aro refit (v2 §N8, **re-prioritized** per STATUS.md) | PLAN-31/32/33 | C | Platform: perceived quality | PR-0 |
| 🟡 NEXT | N18 | Inventory foundation + perpetual depletion + 86-ing | PLAN-23/24/26 | B | Platform: operations | Nothing |
| 🟡 NEXT | N19 | Food costing & margin report | PLAN-25 | B | Platform: operations | PLAN-24 |
| 🟡 NEXT | N20 | Team suite + time clock | PLAN-34/35 | C | Platform: operations | PR-0 |
| 🟡 NEXT | N21 | Tip allocation report (read-only) | PLAN-36 | C | Platform: operations | PLAN-20 (Lane B) |
| 🟡 NEXT | N22 | Hours + tips CSV export | PLAN-37 | C | Platform: operations | PLAN-35, PLAN-36 |

**Why R6 (the members bug) is 🔴 and not 🟡:** it is the same class as v2's
R1 — not a feature, a hole. v2's own vision names the loyalty graph as the
moat and `/home` as "the retention engine for the platform's own revenue."
A venue that crosses 100 members silently loses the ability to see or
search most of its own graph, and nothing in the UI says so. The owner's
first reaction to that is not "there's a pagination bug," it is "this
product lost my customers." Revenue leak, therefore 🔴.

**Why R7/R8 are 🔴:** both are pure revenue arithmetic on a code path that
already exists. Tips are 15–20% of a café ticket that the platform is
currently leaving on the counter, and the review prompt converts a paying
customer at the exact moment of maximum goodwill — the single cheapest
agency proof asset in this document. Neither needs a vendor.

---

## §4 — PR-0 (hard gate, before any lane starts)

**Merge `origin/claude/hq-unification-plan09` into `main`.**

This is not optional housekeeping. That branch carries:

- `docs/plans/STATUS.md` — the living status layer all three lanes are
  required to update. It does not exist on `main`.
- `docs/plans/PLAN-09-admin-venue-impersonation.md` + `lib/impersonation.ts`
  + `app/api/admin/impersonate/route.ts`.
- **Edits to `app/(owner)/owner-shell.tsx` (145 lines changed),
  `app/(owner)/layout.tsx`, `app/(dashboard)/clients/page.tsx`,
  `lib/events.ts`, and `.env.example`.**

Those last five are precisely the shared and Lane-C-owned files this
document partitions. If Lane C starts PLAN-30 (owner shell nav) or
PLAN-32 (clients page refit) before PLAN-09 merges, the conflict is
guaranteed and ugly — a 145-line rewrite of the same file from two
directions.

**PR-0 acceptance:** ✅ pass/fail, no partial credit.

- [ ] `origin/claude/hq-unification-plan09` is merged to `main`; `git merge-base --is-ancestor` confirms it.
- [ ] `docs/plans/STATUS.md` and `docs/plans/PLAN-09-admin-venue-impersonation.md` exist on `main`.
- [ ] `npm run build` and `tsc --noEmit` green on `main` post-merge.
- [ ] PLAN-09's own acceptance checklist is either fully green or its unchecked items are copied verbatim into STATUS.md as known-open. (PLAN-09 is documented as built-but-unverified-live, pending `IMPERSONATION_SECRET`. Merging unverified code is acceptable *here* because it is admin-only and env-gated — but the gap must be recorded, not silently inherited.)

**Executor:** Sonnet 5 / GPT 5.6. Mechanical merge; escalate to Fable 5
only if the merge surfaces a real conflict with post-`6f30c85` main.

---

## §5 — PLAN-10: THE SCHEMA-FIRST BATCH MIGRATION

Required process step 10. **One migration, applied once, before lane work
begins.** Three lanes racing `apply_migration` against the live
`aro-platform` project (`jjgccfrwjkwknyjtbtxa`) is how tenant isolation
gets assembled piecemeal and wrong.

**Owner:** Lane A. **No other lane applies any migration until PLAN-10 has
merged.** After PLAN-10, a lane needing an unforeseen column opens a
follow-up migration PR that Lane A reviews — the rule is *coherent RLS
review*, not *Lane A forever holds the pen*.

**Executor:** **Fable 5 authors the migration and the RLS policy set
personally.** This is `MASTER-PLAN-v2` §7.1's exact trigger — tenant
isolation across a whole batch is architecture, and RLS designed
table-by-table by three different sessions is how a venue eventually reads
another venue's rows. Sonnet 5 / GPT 5.6 applies it, mirrors it, and runs
the advisor check.

### Tables and columns (the complete batch)

**For Lane A — loyalty & member growth**

| Object | Shape | Notes |
| --- | --- | --- |
| `loyalty_programs` | `program_id`, `venue_id` FK, `type` CHECK (`accrual`,`bounce_back`,`birthday`,`anniversary`,`appreciation`,`winback`,`mystery`,`survey`,`referral`), `name`, `status` CHECK (`draft`,`active`,`paused`,`archived`), `config JSONB`, timestamps, `UNIQUE(venue_id, type, name)` | The strategy library's spine. Deliberately **not** `campaigns` — `campaigns` is the *send* object (v2 §N1) and stays that. A program can exist and issue offers with no send channel at all. |
| `member_offers` | `offer_id`, `venue_id` FK, `member_id` FK, `program_id` FK, `code` (short, `UNIQUE(venue_id, code)`), `value_cents INT NULL`, `points_value INT NULL`, `issued_at`, `expires_at`, `redeemed_at NULL`, `redeemed_by_membership_id NULL`, `status` CHECK (`issued`,`redeemed`,`expired`,`void`) | Redemption writes `redeemed_at` **once**; a partial unique index guarantees it. Value never mutates. |
| `survey_responses` | `response_id`, `venue_id` FK, `member_id NULL` FK, `program_id` FK, `answers JSONB`, `offer_id NULL` FK, `created_at`, `UNIQUE(program_id, member_id)` where `member_id IS NOT NULL` | One response per member per survey. `member_id` nullable so an anonymous response is possible without breaking the unique. |
| `push_subscriptions` | `subscription_id`, `venue_id` FK, `member_id` FK, `endpoint TEXT UNIQUE`, `p256dh`, `auth`, `user_agent`, `created_at`, `revoked_at NULL` | Web Push. `endpoint` globally unique — that is what the spec guarantees. |
| `members.birthday_month`, `members.birthday_day` | `SMALLINT NULL` + CHECKs (1–12, 1–31) | Executes v2 §N9 exactly. **See the `members.birthday` resolution below.** |
| `members.referred_by_member_id` | `UUID NULL REFERENCES members(member_id) ON DELETE SET NULL` + index | Executes v2 §N5 step 1 verbatim. |

**For Lane B — commerce & kitchen ops**

| Object | Shape | Notes |
| --- | --- | --- |
| `orders.tip_cents` | `INTEGER NOT NULL DEFAULT 0 CHECK (tip_cents >= 0)` | **Requires dropping and re-adding the existing total CHECK** (`aro_schema.sql:1410`) to `total_cents = subtotal_cents + delivery_fee_cents + tax_cents + tip_cents`. The `DEFAULT 0` makes every existing row satisfy the new constraint unchanged — verify that before the `ADD CONSTRAINT`, do not assume it. |
| `orders.accepted_at`, `orders.ready_at` | `TIMESTAMPTZ NULL` | Ticket age for the kitchen display. Written by the existing status-advance path. |
| `inventory_items` | `item_id`, `venue_id` FK, `name`, `unit` CHECK (`g`,`kg`,`ml`,`l`,`each`), `cost_per_unit_cents INT`, `par_level NUMERIC NULL`, `is_active`, timestamps, `UNIQUE(venue_id, name)` | New table. **Not** the legacy `inventory_items` name from the RLS loop — that table has never been created; PLAN-10 creates it for the first time, and must assert `NOT EXISTS` before creating rather than assuming. |
| `inventory_movements` | `movement_id`, `venue_id` FK, `item_id` FK, `qty NUMERIC NOT NULL` (signed), `reason` CHECK (`receive`,`count`,`waste`,`sale`,`adjust`), `order_id NULL` FK, `note`, `membership_id NULL`, `created_at` | **Append-only, same doctrine as `points_ledger`** — a `BEFORE UPDATE OR DELETE` trigger raises. On-hand is a derived `SUM`, never a stored column. This is the single most important design decision in the inventory work. |
| `menu_item_ingredients` | `id`, `venue_id` FK, `item_id` FK → `menu_items`, `inventory_item_id` FK, `qty_per_unit NUMERIC`, `UNIQUE(item_id, inventory_item_id)` | The recipe link. Powers both depletion (PLAN-24) and costing (PLAN-25). |

**For Lane C — team & platform**

| Object | Shape | Notes |
| --- | --- | --- |
| `staff_shifts` | `shift_id`, `venue_id` FK, `membership_id` FK, `started_at`, `ended_at NULL`, `source` CHECK (`counter`,`manual`), `note`, timestamps | Partial unique index: **at most one open shift per membership** (`WHERE ended_at IS NULL`). That index is the whole correctness story for a time clock. |
| `tip_allocations` | `allocation_id`, `venue_id` FK, `shift_id` FK, `membership_id` FK, `period_start`, `period_end`, `tip_cents INT`, `basis` CHECK (`hours`,`equal`,`manual`), `created_at` | **Report-only.** No payout, no rails, no money movement. Records how the pooled tips *would* divide. |

### Standing RLS design for the whole batch

Coherent, not per-table improvised. Every new table:

1. `ALTER TABLE … ENABLE ROW LEVEL SECURITY;` — no exceptions.
2. Carries a **real `venue_id` column** (never inferred through a parent
   join) so every policy is a direct `venue_id IN (SELECT aro_my_venue_ids())`.
   This costs a denormalized column and buys a policy that cannot be got
   wrong. `member_offers`, `survey_responses`, `inventory_movements`, and
   `order_items` all follow the precedent `order_items` already set.
3. Read policy: `venue_id IN (SELECT aro_my_venue_ids()) OR aro_is_aro_admin()`.
4. Write policies (INSERT/UPDATE/DELETE): `venue_id IN (SELECT aro_my_managed_venue_ids())`
   — owner/manager only, matching the existing helper functions exactly.
5. **`push_subscriptions` and `tip_allocations` get RLS on and ZERO client
   grants** — server-only, per §11 of the existing RLS file. A push
   endpoint is a bearer capability; a tip allocation is compensation data.
   Neither belongs in a client-reachable table.
6. **No anon grants on anything in this batch.** The only anon-reachable
   new path is offer-code lookup, and that goes through a server route with
   the events-table rate-limit pattern, never a direct table grant.
7. Append-only triggers on `inventory_movements` and `member_offers`
   (offers allow exactly one UPDATE — the redemption — enforced by a
   `BEFORE UPDATE` trigger that rejects any change other than
   `redeemed_at`/`redeemed_by_membership_id`/`status`).

### The `members.birthday` conflict — resolved here

`MASTER-PLAN-v2` §N9's privacy-by-design rule is "store month + day only,
**never year**." But `members.birthday DATE` already exists
(`aro_schema.sql:326`), added in the Phase-2 consent block, and no code
writes it. v2 never noticed.

**Resolution:** PLAN-10 adds `birthday_month`/`birthday_day` and, in the
same migration, **drops `members.birthday`** after asserting it holds zero
non-null values (`SELECT count(*) FROM members WHERE birthday IS NOT NULL`
must be 0; if it is not, the migration **stops** and escalates to Fable —
real birthday data is not something a migration discards on its own
authority). Leaving a dormant year-bearing column while writing a
"we never store the year" acceptance test would make that test a lie.

### ✅ PLAN-10 acceptance checklist

- [ ] One migration file under `supabase/migrations/`, applied via the Supabase MCP connector to `jjgccfrwjkwknyjtbtxa`, and **mirrored into `supabase/aro_schema.sql`** in the same PR.
- [ ] `mcp__Supabase__get_advisors` (security **and** performance) returns **zero new** findings attributable to this migration. Pre-existing findings are recorded in the PR body, not silently absorbed.
- [ ] Every new table has RLS enabled — verified by query, not by reading the file.
- [ ] `scripts/verify-live.mjs` extended with one anon-denied check per new table, appended at the end of the existing check list. Run green.
- [ ] `inventory_movements` append-only proven: an `UPDATE` and a `DELETE` both raise.
- [ ] `member_offers` double-redemption proven impossible: two concurrent redeems of one code produce exactly one `redeemed_at`.
- [ ] `staff_shifts` open-shift uniqueness proven: a second clock-in without a clock-out fails at the DB, not in application code.
- [ ] `orders.tip_cents` added and the total CHECK re-established; **every pre-existing order row still satisfies it** (asserted by query before and after).
- [ ] `members.birthday` dropped, with the zero-non-null assertion recorded in the PR body.
- [ ] `grep -rn "birthday_year\|birthdate\|date_of_birth" app lib supabase` returns nothing (v2 §N9's own gate, now honestly passable).
- [ ] `npm run build` + `tsc --noEmit` green.

---

## §6 — THE THREE LANES

Required process step 7. Partition is by **file and surface ownership**,
so three sessions can run simultaneously without collision.

### PLAN-NN number ranges (required process step 9)

**Stated explicitly so three sessions do not each guess "the next number"
and all pick PLAN-10:**

| Lane | Range | Rule |
| --- | --- | --- |
| **Lane A** | `PLAN-10` … `PLAN-19` | PLAN-10 is the batch migration and is claimed. |
| **Lane B** | `PLAN-20` … `PLAN-29` | |
| **Lane C** | `PLAN-30` … `PLAN-39` | |

A lane that exhausts its range **stops and escalates** rather than
borrowing a neighbour's. `PLAN-00` … `PLAN-09` are historical and
immutable.

---

### Lane A — Loyalty & member growth

**Exclusively owns**

```
app/(dashboard)/members/**
app/(owner)/regulars/**
app/pass/**
app/join/**
app/api/members/**
app/api/join/**
app/api/pass/**            (new)
app/api/offers/**          (new)
app/api/push/**            (new)
app/api/surveys/**         (new)
lib/owner-stats.ts
lib/loyalty/**             (new)
lib/push/**                (new)
supabase/migrations/**     (PLAN-10 only; then by review)
components/loyalty/**      (new)
```

**Note the seam:** Lane A owns `app/(dashboard)/members/**`, which also
appears in Lane C's N8 refit inventory. **Lane A refits those two files to
`aro` tokens as part of PLAN-11**, and Lane C's inventory explicitly
excludes them. One owner per file, no exceptions.

| PR | Item | Executor | Depends on |
| --- | --- | --- | --- |
| **PLAN-10** | Batch schema + RLS migration (§5) | **Fable 5** authors; Sonnet 5 applies | PR-0 |
| **PLAN-11** | Members directory rebuild | Sonnet 5 / GPT 5.6 | PR-0 |
| **PLAN-12** | Offer engine core (`loyalty_programs` + `member_offers` issue/redeem) | **Fable 5** authors the redemption-idempotency design; Sonnet 5 builds | PLAN-10 |
| **PLAN-13** | Bounce-back + customer-appreciation programs | Sonnet 5 / GPT 5.6 | PLAN-12 |
| **PLAN-14** | Birthday + anniversary capture (executes v2 §N9) | Sonnet 5 / GPT 5.6 | PLAN-10 |
| **PLAN-15** | Referral engine (executes v2 §N5) | Sonnet 5 / GPT 5.6, **Fable pre-merge review of once-only credit** (v2 §7 mandate, unchanged) | PLAN-10 |
| **PLAN-16** | Survey promotions | Sonnet 5 / GPT 5.6 | PLAN-12 |
| **PLAN-17** | Mystery reward gamification | Sonnet 5 / GPT 5.6 | PLAN-12 |
| **PLAN-18** | Web push channel | **Fable 5** authors the consent + revocation design; Sonnet 5 builds | PLAN-10 |

#### PLAN-11 — Members directory rebuild 🔴

**Objective** — every member a venue has is reachable, searchable, and
countable, no matter how many there are.

The current failure has three independent causes and all three must die:

1. `lib/owner-stats.ts:113` — `.limit(opts.limit ?? 50)` with no offset and
   no total count. Replace with keyset pagination on
   `(days_since_last, member_id)` and a separate `count: 'exact', head: true`
   total. Offset pagination is acceptable only if the count query proves
   venue sizes are small; keyset is correct regardless, so build keyset.
2. `lib/owner-stats.ts:140` — `rows.filter(...)` runs **after** the DB
   limit. Search must move into the query as an `ilike`/`or` across
   `full_name`, `phone`, and `email` (both index-backed:
   `idx_members_tenant_phone`, `idx_members_tenant_email`). This also fixes
   the unstated bug that you currently cannot find a member by phone — the
   single most common thing a barista knows about them.
3. `.order('days_since_last', { ascending: true, nullsFirst: false })` —
   never-visited members sort last and vanish past the cap. Sort must be
   explicit and switchable, and the default must never make a whole class
   of member unreachable.

Plus: a real total count in the header ("312 members · 41 fading"), a
`fading`-first default that matches `/home`'s narrative, and the §2 design
bar (these two files are on `coffee-*` today).

**✅ Acceptance**

- [ ] A venue seeded with **250 members** renders every one across pages; the last page contains member 250. Proven with a real seeded count, not a unit test on a mock.
- [ ] Searching a member who sorts at position 200 by recency **finds them** — the exact case that fails today.
- [ ] Search matches `full_name`, `phone`, and `email`; a phone-number search returns the member.
- [ ] A member with **zero visits** appears in the list and is reachable by search.
- [ ] Header total equals a hand-run `SELECT count(*) FROM members WHERE tenant_id = …`.
- [ ] Filter chips (`all`/`new`/`regular`/`fading`/`lost`) each return a count matching a hand-run SQL count for that status.
- [ ] **Design bar:** `grep -rE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]' 'app/(dashboard)/members'` returns nothing. Renders correctly at 375/768/1280 with no horizontal page scroll.
- [ ] No new N+1: the page issues a bounded number of queries regardless of page size (assert the query count).
- [ ] `npm run build` + `tsc --noEmit` green.

#### PLAN-12 — Offer engine core 🟡

**Objective** — a venue can define a loyalty program, that program can
issue a redeemable offer to a member, and a barista can redeem it at the
counter exactly once.

This is the **library's foundation**, and every subsequent Lane A program
type is configuration on top of it rather than a new mechanism. That is the
whole design bet: seven "features" from the idea list (bounce-back,
appreciation, birthday, anniversary, win-back, mystery, survey reward) are
one engine and seven `loyalty_programs.type` rows.

Redemption is the risky part and inherits v2 §N5's doctrine directly: the
credit lands **once**, proven by replay, and the guarantee lives in the
database (partial unique index + trigger from PLAN-10), not in an
application `if`.

Deliberate non-goal, stated with teeth: **PLAN-12 does not send anything.**
An offer is issued and displayed on the member's pass and at the counter.
Email/SMS delivery is v2 §N1/§N6 and is blocked. Push delivery is PLAN-18.

**✅ Acceptance**

- [ ] An owner can create, activate, pause, and archive a program from `/creative`-adjacent Loyalty surface; state changes emit events.
- [ ] Issuing an offer to a member creates exactly one `member_offers` row; the offer appears on that member's pass.
- [ ] Redeeming at the counter marks it redeemed, credits per config, and **a replayed redeem of the same code returns the already-redeemed state and writes nothing** — proven by firing the same redeem three times concurrently.
- [ ] An expired offer cannot be redeemed; the counter shows why, warmly, not "Error 409".
- [ ] A cross-venue offer code is rejected — venue B cannot redeem venue A's code. Tenant-isolation test, run explicitly.
- [ ] Events emitted + labelled: `offer.issued`, `offer.redeemed`, `offer.expired`, `program.created`, `program.status_changed`.
- [ ] **Design bar** (§2) — all five clauses.
- [ ] `scripts/verify-live.mjs` extended; `npm run build` + `tsc --noEmit` green.

#### PLAN-13 — Bounce-back + appreciation 🟡

**Objective** — the two highest-value zero-vendor program types run
end-to-end on PLAN-12's engine.

*Bounce-back*: a visit or paid order issues an offer valid in a configured
future window ("$5 back when you return between day 3 and day 14"). The
window is the mechanism — an offer with no dead period is a discount, not
a bounce-back. *Appreciation*: an owner selects a member cohort from the
existing `member_status` view (`regular`, `fading`) and issues a
hand-approved batch.

**✅ Acceptance**

- [ ] A paid order issues exactly one bounce-back offer when the program is active, and **zero** when paused — proven both ways.
- [ ] The offer is not redeemable before `valid_from` and not after `expires_at`; both boundaries tested at the exact second.
- [ ] Batch issue shows the exact recipient count before committing, and requires typed confirmation above 50 recipients (v2 §N1's fat-finger guard, reused rather than reinvented).
- [ ] Re-running the same batch does **not** double-issue to a member who already holds an unredeemed offer from that program.
- [ ] Offers appear on `/pass/[serial]` with expiry stated in plain language.
- [ ] **Design bar** (§2). `npm run build` + `tsc --noEmit` green.

#### PLAN-14 — Birthday + anniversary 🟡

Executes `MASTER-PLAN-v2` §N9 as written (one-shot ask on the pass, month
+ day selects, no year field anywhere, 409 on second write, calendar
validation in a pure `lib/` function, rate-limited via the events-table
window pattern, `member.birthday_set` event) — **plus** the anniversary
variant, which needs no capture at all because `members.created_at`
already holds the join date.

**✅ Acceptance** — v2 §N9's checklist verbatim, all seven items, plus:

- [ ] Anniversary offers issue on the join-date anniversary in **venue-local** time (the Sunday-23:30 timezone bug class v2 §N3 names must not recur here).
- [ ] A member who joined on Feb 29 gets an anniversary in non-leap years — pick Feb 28 and state the choice in the build log rather than letting it silently never fire.
- [ ] **Design bar** (§2).

#### PLAN-15 — Referral engine 🟡

Executes `MASTER-PLAN-v2` §N5 as written — all six numbered steps, both
loops, unchanged. v2's spec is already executor-grade; this document adds
**one** delta: the referrer's credit issues through PLAN-12's
`member_offers` when the program config asks for a value reward, and
through `points_ledger` when it asks for points. Same once-only guarantee,
one engine.

**✅ Acceptance** — v2 §N5's checklist verbatim, all five items, plus the
§2 design bar. **Fable 5's pre-merge review of the once-only-credit logic
is mandatory** and is inherited from v2 §7, not re-decided here.

#### PLAN-16 — Survey promotions 🟡

A short survey (3–5 questions, owner-authored) reachable from the pass;
completion issues an offer via PLAN-12. **The reward is for completing,
never for a particular answer** — pay for the response, not the rating, or
the data is worthless and the practice is dishonest.

**✅ Acceptance**

- [ ] One response per member per survey, enforced at the DB (PLAN-10's unique index), not in the route.
- [ ] Completion issues exactly one offer; replaying the submit issues zero more.
- [ ] Results view shows per-question aggregates; **free-text answers are shown verbatim and never fed to any AI surface** without an explicit separate decision — member words are member words.
- [ ] Anonymous responses are possible and are excluded from the per-member unique.
- [ ] **Design bar** (§2). `npm run build` + `tsc --noEmit` green.

#### PLAN-17 — Mystery reward gamification 🟡

A "reveal" on the pass after a configured visit count — the prize is drawn
server-side at issue time from a weighted table the owner configures, and
the animation only *reveals* what the server already decided.

Non-negotiable: **the client never draws.** A client-side random is a
client-side exploit, and the value distribution is the venue's money.
Weights are owner-configured and the effective odds are shown to the owner
in plain numbers on the config screen — a café owner who cannot see the
expected cost per reveal will misprice it.

**✅ Acceptance**

- [ ] The prize is determined and persisted server-side before any reveal UI renders; the API response before reveal contains no prize information (inspect the payload, do not assume).
- [ ] Reload mid-reveal shows the **same** prize.
- [ ] Weighted distribution verified over 1,000 simulated draws within tolerance.
- [ ] Owner config screen states expected cost per reveal in currency.
- [ ] Reveal animation respects `prefers-reduced-motion`.
- [ ] **Design bar** (§2).

#### PLAN-18 — Web push channel 🟡

**Objective** — the platform's first promotional channel that needs no
vendor account, no pricing call, and no contract.

VAPID keys are self-generated (`web-push` generates a keypair locally);
they are configuration, not a vendor relationship. That is the entire
reason this is unblocked while email and SMS are not — and it is worth
stating plainly because it is the most valuable unblocked item in this
document: **it lets the graph's insight finally reach a member with zero
owner input.**

Consent doctrine is inherited unchanged from `MASTER-PLAN-v2` §N1: **one
server-side eligibility query** whose `WHERE` enforces venue scope AND an
active, unrevoked subscription AND not-unsubscribed. No application-layer
filtering on top of a broader query. Browser permission is *not* consent
to marketing — a member must opt in on the pass, in the venue's own words,
and a `410 Gone` from the push service revokes the subscription
immediately and permanently.

Honest limits, stated so nobody discovers them in production: iOS delivers
web push only when the pass is installed to the home screen; the pass must
therefore prompt for install before it prompts for push, and the UI must
never promise a member something their device will not do.

**✅ Acceptance**

- [ ] `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` appended to `.env.example`; missing keys render the visible STUBBED state, never a silent no-op.
- [ ] A member can subscribe from the pass and receives a real test push on Android Chrome **and** an installed iOS PWA.
- [ ] Unsubscribe from the pass revokes immediately; the next send skips them and records the skip.
- [ ] A `410`/`404` from the push service marks the subscription revoked automatically — proven by sending to a deliberately stale endpoint.
- [ ] **The eligibility query is the compliance boundary**: a member with a revoked subscription never appears in an eligible count. Test written and green **before** the send route exists (v2 §N1's pre-M-1 test pattern, applied here).
- [ ] Every send writes a `messages` row. **`messages.channel` CHECK currently allows only `sms`/`email`** — PLAN-10 or this PR must widen it to include `push`; do not write a `push` row against the current constraint and do not silently mislabel it as `email`.
- [ ] Sends above 50 recipients require typed confirmation, and the count shown matches a hand-run SQL count.
- [ ] **Design bar** (§2). `scripts/verify-live.mjs` extended.

---

### Lane B — Commerce & kitchen ops

**Exclusively owns**

```
app/shop/**
app/t/**
app/kitchen/**             (new)
app/(dashboard)/orders/**
app/(dashboard)/menu/**
app/api/orders/**
app/api/menu/**
app/api/counter/orders/**
app/api/inventory/**       (new)
app/api/webhooks/stripe/**
lib/storefront.ts
lib/payments/**
lib/menu/**
lib/inventory/**           (new)
components/storefront/**
components/counter/**
components/orders/**
components/menu/**
components/inventory/**    (new)
```

**Note:** Lane B's surfaces are already largely on `aro` tokens
(`app/shop/[slug]/checkout/page.tsx` uses `text-aro-terra`,
`font-display`, `text-aro-espresso`) — the §2 bar is mostly a *maintain*
obligation here rather than a refit.

| PR | Item | Executor | Depends on |
| --- | --- | --- | --- |
| **PLAN-20** | Tips on QR orders | Sonnet 5 / GPT 5.6 — **money surface, never light tier** (v2 §7.3) | PLAN-10 |
| **PLAN-21** | Post-payment review prompt | Sonnet 5 / GPT 5.6 | PLAN-20 |
| **PLAN-22** | Kitchen display surface | Sonnet 5 / GPT 5.6 | PR-0 |
| **PLAN-23** | Inventory foundation (items, receive, count, waste) | Sonnet 5 / GPT 5.6 | PLAN-10 |
| **PLAN-24** | Perpetual depletion (recipes → auto-decrement) | **Fable 5** authors the idempotency design; Sonnet 5 builds | PLAN-23 |
| **PLAN-25** | Food costing & margin report | Sonnet 5 / GPT 5.6 | PLAN-24 |
| **PLAN-26** | 86-ing / stock-out → menu availability | Sonnet 5 / GPT 5.6 | PLAN-24 |

#### PLAN-20 — Tips 🔴

**Objective** — a guest can add a tip at checkout; the tip reaches the
order total, the payment, and the venue's records without distorting
loyalty or tax.

The design calls that matter, resolved here so no executor debates them:

- **Tip is a separate column, never folded into `subtotal_cents`.** Tax is
  computed on subtotal; a tip inside subtotal silently over-taxes the
  guest. The PLAN-10 CHECK change encodes this.
- **Tips do not earn loyalty points.** `points_per_euro` applies to
  `subtotal_cents` only. A guest who tips 20% has not bought 20% more
  coffee, and letting tips inflate points is a slow, invisible leak in the
  loyalty economy.
- **Presets are percentages of subtotal, not of total**, plus a custom
  amount and an explicit, non-shaming "No tip" — a tip screen with no
  graceful zero is a dark pattern, and this product does not ship those.
- **Order-type aware**: dine-in and pickup default to prompting; delivery
  defaults off unless the venue enables it.

**✅ Acceptance**

- [ ] A tipped order's `total_cents` equals `subtotal + delivery_fee + tax + tip`, enforced by the DB CHECK, proven by attempting an inconsistent insert (it must fail).
- [ ] Tax is computed on subtotal and is **byte-identical** with and without a tip.
- [ ] Points accrued on a tipped order equal points on the identical untipped order.
- [ ] The Stripe charge amount equals `total_cents` including tip (verified in the test-mode dashboard, not just in local state).
- [ ] A refund refunds the full amount including tip, as a **new** `payments` row — never a mutation (append-only money doctrine, v2 §R2).
- [ ] "No tip" is one tap, visually equal in weight to the presets, and completes checkout with `tip_cents = 0`.
- [ ] Tip appears as its own line on the order confirmation, the counter order detail, and the HQ order view.
- [ ] With Stripe unkeyed, the tip UI still renders and the STUBBED badge behaviour is unchanged.
- [ ] **Design bar** (§2) — the tip selector is the single most-touched control in this document; ≥ 44 px targets, 375 px layout verified.
- [ ] `npm run build` + `tsc --noEmit` green.

#### PLAN-21 — Post-payment review prompt 🔴

**Objective** — a guest who just paid is asked, at the moment of maximum
goodwill, to leave a public review.

Design calls resolved:

- The destination is a **venue-configured URL** stored under
  `venues.brand_kit.review_profile` — reusing the exact JSONB namespacing
  pattern `lib/site-profile.ts` established for PLAN-05 (**zero
  migration**). A Google Place ID *lookup* would need a Google API key and
  is therefore **out of scope** — the owner pastes their link. That single
  decision is what keeps this item unblocked.
- **No gating, no review-filtering.** The prompt does not ask for a
  private star rating first and route only the happy ones to Google.
  That practice violates Google's policies, is a legal exposure in several
  markets, and is beneath the product. Everyone sees the same prompt.
- Shown **once per order**, dismissible, and never shown at all when the
  venue has configured no URL — a dead link is worse than no prompt.

**✅ Acceptance**

- [ ] With a configured URL, a successful payment shows the prompt on the confirmation screen; tapping it opens the venue's review page in a new tab.
- [ ] With no URL configured, no prompt renders anywhere — proven on a venue with an empty `brand_kit`.
- [ ] The prompt appears **once per order**; reloading the confirmation does not re-prompt.
- [ ] Dismissal persists for that order.
- [ ] No rating is collected before the redirect (assert absent in the DOM — this is the anti-gating gate, and it is pass/fail).
- [ ] Settings field validates that the URL is `https` and warns on a non-review-looking host without blocking it.
- [ ] Events emitted + labelled: `review.prompted`, `review.clicked`.
- [ ] **Design bar** (§2). `npm run build` + `tsc --noEmit` green.

#### PLAN-22 — Kitchen display 🟡

**Objective** — the kitchen sees every incoming order, in full detail,
on a screen built for a kitchen.

Honest scoping: `components/counter/OrdersQueue.tsx` and
`app/api/counter/orders/route.ts` already do most of this — every open
order with items and modifiers, and the full `paid→…→completed` advance
chain. **Do not rewrite them.** PLAN-22 promotes that logic to a real
surface and closes the five gaps a kitchen actually feels:

1. A dedicated `/kitchen` route that does not live behind the counter UI's
   navigation, authenticated by the same counter PIN session.
2. **Supabase Realtime** on `orders` replacing the 15-second poll, with the
   poll retained as an explicit fallback — a kitchen screen that silently
   stops updating is worse than one that never worked.
3. **Ticket age** from `placed_at`, escalating colour at owner-configured
   thresholds (`aro-sage` → `aro-saffron` → `aro-terra`; never raw red).
4. An **audible chime** on new orders, muted by default with a visible
   unmute — browsers block autoplay, and a chime that silently never fires
   is a missed order.
5. **Always-on display mode**: wake-lock where available, high-contrast
   large type, no hover-dependent controls (kitchen screens are touched
   with the back of a knuckle).

**✅ Acceptance**

- [ ] A new paid order appears on `/kitchen` within 2 seconds without a manual refresh.
- [ ] Killing the realtime connection falls back to polling and **visibly says so** — the screen never lies about being live.
- [ ] Every ticket shows all items, quantities, modifiers, and item notes — parity with the existing `/api/counter/orders` payload, asserted field by field.
- [ ] Status advance from `/kitchen` writes the same transitions as the counter path and emits `order.status_changed`; `accepted_at`/`ready_at` are stamped.
- [ ] Ticket age colour changes at the configured thresholds; verified with an injected clock.
- [ ] Chime is muted by default and fires after one user gesture unmutes it.
- [ ] Legible at 2 m on a 1080p display; **no hover-only affordances** (assert every control is reachable by tap).
- [ ] **Design bar** (§2), with the kitchen exception stated: high-contrast `aro-espresso`-on-`aro-cream` may be used at larger type sizes for viewing distance — still `aro` tokens only, still measured to WCAG 2.1 AA.
- [ ] `npm run build` + `tsc --noEmit` green.

#### PLAN-23 — Inventory foundation 🟡

Items, units, cost per unit, par levels; receive / count / waste movements;
derived on-hand. **On-hand is always `SUM(qty)` over `inventory_movements`,
never a stored column** — the same "derive, don't store" doctrine that
governs `member_balances`, applied to stock. A physical count is a
*movement* (the delta that reconciles), not an overwrite, so the history of
what went missing survives.

**✅ Acceptance**

- [ ] Receive, count, and waste each write exactly one movement row; on-hand recomputes correctly after each.
- [ ] `UPDATE`/`DELETE` on `inventory_movements` both raise (PLAN-10's trigger, proven from the app path too).
- [ ] A physical count that disagrees with derived on-hand writes a reconciling delta and **preserves both numbers** in the history.
- [ ] Items below par level are visibly flagged.
- [ ] Cross-venue read denied (tenant-isolation test, run explicitly).
- [ ] **Design bar** (§2) — inventory tables scroll in their own container at 375 px; the page body does not.
- [ ] `npm run build` + `tsc --noEmit` green.

#### PLAN-24 — Perpetual depletion 🟡

Recipe links (`menu_item_ingredients`) drive automatic stock decrement
when an order is paid.

**The entire risk is idempotency**, which is why Fable authors the design:
Stripe webhooks retry, and a double-fired `order.paid` that decrements
twice makes inventory quietly wrong forever — the failure is invisible for
weeks and then unrecoverable. The guarantee must be a **unique index on
`(order_id, reason='sale')`**, mirroring the existing
`idx_points_ledger_order` partial-unique precedent
(`aro_schema.sql:2005`), not an application-level check.

**✅ Acceptance**

- [ ] A paid order decrements each linked ingredient by `qty_per_unit × quantity`.
- [ ] **Replaying the same `order.paid` webhook three times decrements exactly once** — the central test of this PR.
- [ ] A refunded order writes a compensating movement; it does not delete the original.
- [ ] An item with no recipe link decrements nothing and does **not** error.
- [ ] Depletion failure never blocks or reverses the order — it logs, emits `inventory.depletion_failed`, and the sale stands. An order is never lost to a stock bug.
- [ ] Negative on-hand is permitted and flagged, not blocked — a kitchen that ran a count wrong must not be prevented from selling coffee.
- [ ] **Design bar** (§2). `npm run build` + `tsc --noEmit` green.

#### PLAN-25 — Food costing & margin 🟡

Per-item theoretical cost from the recipe, margin against menu price, and
a venue-level report ranked by margin contribution. Read-model over
PLAN-23/24 data; **no new tables**.

**✅ Acceptance**

- [ ] Per-item cost equals the hand-computed sum of `qty_per_unit × cost_per_unit_cents` — verified on three items by hand.
- [ ] Margin % and margin currency both shown; a zero-price item shows "—", never `Infinity` or `NaN`.
- [ ] Items with incomplete recipes are labelled **"partial recipe"** and excluded from venue totals — a costing report that silently under-counts is worse than one that admits a gap.
- [ ] Report ranks by margin contribution (margin × units sold), not margin % alone — the number an owner can act on.
- [ ] All money via `lib/money.ts`; no float arithmetic anywhere (grep-verifiable).
- [ ] **Design bar** (§2). `npm run build` + `tsc --noEmit` green.

#### PLAN-26 — 86-ing / stock-out 🟡

An item whose ingredients are out goes unavailable on the storefront
automatically, plus a manual one-tap 86 from the counter and kitchen.

**✅ Acceptance**

- [ ] An ingredient at or below zero marks every dependent menu item unavailable within one order cycle.
- [ ] Manual 86 hides the item from the storefront immediately and shows it as 86'd on counter and kitchen.
- [ ] Un-86 restores it; a restock movement crossing above zero auto-restores only items that were auto-86'd, **never** ones manually 86'd (a manual decision outranks an automatic one).
- [ ] An 86'd item already in a guest's cart is rejected at checkout with a clear, warm message — never a silent removal, never a failed payment.
- [ ] Events emitted + labelled: `menu.item_86ed`, `menu.item_restored`.
- [ ] **Design bar** (§2). `npm run build` + `tsc --noEmit` green.

---

### Lane C — Team & platform polish

**Exclusively owns**

```
app/(dashboard)/dashboard/**   app/(dashboard)/clients/**
app/(dashboard)/leads/**       app/(dashboard)/activity/**
app/(dashboard)/analytics/**   app/(dashboard)/settings/**
app/(dashboard)/staff/**       app/(dashboard)/rewards/**
app/(dashboard)/layout-client.tsx
app/(owner)/layout.tsx         app/(owner)/owner-shell.tsx
app/(owner)/rewards-admin/**   (new)   app/(owner)/campaigns/**  (new)
app/(owner)/settings/**        (new)
app/api/staff/**               app/api/shifts/**  (new)
app/api/tips/**                (new)
lib/team/**                    (new)   lib/impersonation.ts
components/Sidebar.tsx         components/MobileNav.tsx
components/StatCard.tsx        components/SkeletonLoader.tsx
components/ThemeToggle.tsx     components/TenantSelector.tsx
components/ConfirmDialog.tsx   components/ComingSoon.tsx
components/LiveClock.tsx       components/team/**  (new)
app/error.tsx                  app/(dashboard)/error.tsx
```

**Explicitly NOT Lane C's** (despite appearing in the legacy-token grep):
`app/(dashboard)/members/page.tsx` and `app/(dashboard)/members/[id]/page.tsx`
→ **Lane A, PLAN-11**. `app/shop/[slug]/error.tsx` → **Lane B**.

| PR | Item | Executor | Depends on |
| --- | --- | --- | --- |
| **PLAN-30** | Owner shell nav unification | Sonnet 5 / GPT 5.6 | **PR-0** |
| **PLAN-31** | N8 refit part 1 — shared components (11 files) | **Light tier (Kimi K3-class)** | PLAN-30 |
| **PLAN-32** | N8 refit part 2 — HQ pages (dashboard, clients, activity, analytics) | **Light tier** | PLAN-31 |
| **PLAN-33** | N8 refit part 3 — settings, staff, rewards, error boundaries | **Light tier** | PLAN-32 |
| **PLAN-34** | Team management suite | Sonnet 5 / GPT 5.6 | PLAN-30 |
| **PLAN-35** | Time clock | Sonnet 5 / GPT 5.6 | PLAN-10, PLAN-34 |
| **PLAN-36** | Tip allocation report | **Fable 5** authors; Sonnet 5 builds | PLAN-35 + **Lane B PLAN-20** |
| **PLAN-37** | Hours + tips CSV export | Sonnet 5 / GPT 5.6 | PLAN-36 |

**Why PLAN-31/32/33 are the only light-tier work in this document:** they
meet `MASTER-PLAN-v2` §7.3's three conditions simultaneously — purely
mechanical (a known token substitution applied repeatedly), pass/fail by
grep, and zero design freedom. They touch no auth, money, consent,
migration, or public API. **Every other item in all three lanes is
Sonnet-tier floor or above**, and the split into three PRs exists so a
light-tier session never faces more than ~8 files at once.

#### PLAN-30 — Owner shell nav unification 🟡

**Objective** — the venue console's navigation stops lying.

`app/(owner)/owner-shell.tsx:21` declares a six-item `NAV`. **Three of the
six do not resolve to an owner surface:** `/rewards-admin` and `/campaigns`
have no page anywhere in `app/`, and `/settings` resolves into the
`(dashboard)` HQ group — so an owner clicking "Settings" in their own
console is thrown into the agency shell with the coffee/cream skin. Only
`/home`, `/regulars`, and `/creative` exist under `app/(owner)/`.

This is the concrete, mechanical form of STATUS.md's "HQ ↔ venue-console
unification" recommendation, and it is why Lane C leads with it.

**Resolution:** the owner nav becomes **derived from `lib/modules.ts`**
(`surface: 'owner'`) rather than a hand-maintained array. `lib/modules.ts`
already carries the `surface` field and already documents exactly this
hazard — "an aro_admin following an (owner) link gets bounced to /counter,
so HQ nav must not render owner-surface modules." One registry, two
shells. After PLAN-30, Lanes A and B add an owner nav entry by appending
a module row — **no lane ever edits `owner-shell.tsx` again.** That is
what makes the shared-file convention in §7 hold.

Then: create the three missing owner surfaces (`/rewards-admin`,
`/campaigns`, `/settings` under `(owner)`), or remove their nav entries
until their lane ships them. **A dead nav item is not acceptable in either
direction** — build it or delete it, never leave it.

**✅ Acceptance**

- [ ] Every entry in the owner nav resolves to a page **inside the `(owner)` group** — asserted by a test that walks `MODULES.filter(surface==='owner')` and requires a matching route file.
- [ ] Zero 404s from the owner nav; zero owner-nav links landing in the `(dashboard)` shell.
- [ ] `owner-shell.tsx` contains **no hardcoded nav array** (grep gate).
- [ ] PLAN-09's impersonation banner still renders on every owner page and still exits correctly (regression gate — PLAN-30 rewrites the file PLAN-09 just changed).
- [ ] Nav renders correctly at 375/768/1280; the mobile panel closes on navigation (existing behaviour preserved).
- [ ] **Design bar** (§2). `npm run build` + `tsc --noEmit` green.

#### PLAN-31 / 32 / 33 — N8 HQ aro refit 🟡

Executes `MASTER-PLAN-v2` §N8, **re-prioritized from "filler work" to
scheduled Lane C work** per STATUS.md's recorded recommendation.

**Verified scope, 2026-07-29** — the screen inventory v2 §N8 asked for,
already done here so the light-tier executor does not have to derive it:

- **~1,006 legacy token uses across 22 files** (`coffee-*` 500 in 20
  files; `cream-*` 257 in 14; `dark-*` 249). For contrast, `aro-*` is
  already at 782 uses across 38 files — the new system is the majority
  system, and this is the tail.
- **PLAN-31 (11 shared components):** `Sidebar`, `MobileNav`, `StatCard`,
  `SkeletonLoader`, `ThemeToggle`, `TenantSelector`, `ConfirmDialog`,
  `ComingSoon`, `LiveClock`, `app/error.tsx`, `app/(dashboard)/error.tsx`.
  Components first, deliberately: they are imported by the pages, so
  refitting them first shrinks PLAN-32/33.
- **PLAN-32 (4 HQ pages):** `dashboard`, `clients`, `activity`, `analytics`.
- **PLAN-33 (3 pages + sweep):** `settings`, `staff`, `rewards`, then the
  repository-wide grep gate.

**Binding constraints for the light tier, restated from v2 §N8 so no
imagination is required:** commits are **style-only** — zero logic
changes, zero prop changes, zero JSX structure changes beyond className
values. A diff that touches a hook, a handler, or a conditional is out of
scope and gets escalated, not merged.

**✅ Acceptance (each of the three PRs)**

- [ ] `grep -rE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]' <that PR's file list>` returns **nothing**.
- [ ] `git diff` for the PR contains **no** changes outside `className` string values, imports of removed helpers, and the token map — verified by reading the whole diff.
- [ ] **Measured** WCAG 2.1 AA contrast table for every foreground/background token pair introduced, recorded in the build log. Any failing pair gets an ink-derived accessible variant **added to the token set** — never an off-system hex (v2 §N8's own rule).
- [ ] Every refitted screen renders correctly at 375/768/1280 — screenshot or DOM assertion, not assumed.
- [ ] `npm run build` + `tsc --noEmit` green; smoke behaviour unchanged.
- [ ] **PLAN-33 additionally:** repository-wide `grep -rE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]' app components --include=*.tsx` returns **only** files owned by Lanes A and B (members ×2, shop error), and those are listed by name in the PR body with their owning PLAN number.

#### PLAN-34 — Team management suite 🟡

Staff profiles, role management, invite lifecycle visibility, deactivation
with history preserved. Builds on the existing `memberships` model —
**no new roles are invented.** The four in the CHECK constraint
(`owner|manager|staff|aro_admin`) are the model, and PLAN-09's non-goals
already explain why adding a fifth is expensive.

**✅ Acceptance**

- [ ] An owner can invite, view, edit, and deactivate staff; a deactivated membership retains its history and its shifts.
- [ ] A manager cannot escalate anyone to `owner` or `aro_admin` — enforced server-side and tested by attempting it.
- [ ] A staff member cannot reach the team surface at all (wrong-door redirect, not a 403 wall — existing doctrine).
- [ ] PIN set/reset flows through the existing `set_counter_pin` RPC; **no PIN value is ever logged or returned** (grep gate).
- [ ] Cross-venue access denied (tenant-isolation test, run explicitly).
- [ ] **Design bar** (§2). `npm run build` + `tsc --noEmit` green.

#### PLAN-35 — Time clock 🟡

Clock in/out at the counter using the existing PIN session; open-shift
uniqueness enforced by PLAN-10's partial unique index, not by application
logic.

**✅ Acceptance**

- [ ] Clock-in creates one open shift; a second clock-in without clock-out **fails at the database**.
- [ ] Clock-out stamps `ended_at`; duration computed, never stored.
- [ ] A shift left open past a configurable threshold is flagged for owner review and is **not** auto-closed — silently inventing an end time to compensation data is not acceptable.
- [ ] Manual correction by an owner writes a new record with `source='manual'` and preserves the original.
- [ ] Timezone-correct at venue-local midnight (the boundary bug class v2 §N3 names).
- [ ] Events emitted + labelled: `shift.started`, `shift.ended`, `shift.corrected`.
- [ ] **Design bar** (§2) — counter surface, ≥ 44 px targets, one-handed.

#### PLAN-36 — Tip allocation report 🟡

**Read-only.** Computes how a period's pooled tips divide across staff by
hours worked, equal split, or manual override. **No payout, no money
movement, no rails.**

**Executor: Fable 5 authors.** This is compensation arithmetic — v2 §7.1's
"money, consent, or compliance design" trigger. Sonnet builds from Fable's
spec; **Fable reviews the allocation math pre-merge regardless of builder**,
same standing rule as N1's eligibility query and N5's once-only credit.

**Boundary stated plainly, and it is the reason this item is in a lane at
all:** producing a *report* of how tips would divide is bookkeeping.
*Moving* money to a worker is payroll, and payroll is in §8. The report
must carry a visible, non-dismissible line stating it is a calculation aid
and not a payroll record — the moment it looks authoritative, someone will
treat it as one.

**✅ Acceptance**

- [ ] Hours-basis allocation sums **exactly** to the period's total tips — no cent lost, no cent invented. Remainder distribution rule stated in the build log and tested with a deliberately indivisible amount.
- [ ] Equal-basis and manual-basis each also sum exactly.
- [ ] A staff member with zero hours receives zero on the hours basis (not `NaN`, not a divide-by-zero).
- [ ] All arithmetic in integer cents via `lib/money.ts`; **zero float operations** (grep-verifiable).
- [ ] Re-running the report for the same period returns identical numbers.
- [ ] The "not a payroll record" notice renders on the report and in any export.
- [ ] Only `owner` can view; `manager` and `staff` are denied and the denial is tested.
- [ ] **Design bar** (§2).

#### PLAN-37 — Hours + tips CSV export 🟡

A CSV of hours and calculated tip allocations for a period, for the owner
to hand to their accountant or payroll provider. **This is a report, not
payroll**, which is exactly why it is buildable while payroll is not.

**✅ Acceptance**

- [ ] CSV columns documented in the build log; values match the PLAN-36 report exactly, row for row.
- [ ] Money as decimal strings, never floats; a value like `10.10` never renders as `10.1` or `10.100000001`.
- [ ] Filename carries venue slug and period; content is UTF-8 with a BOM (Excel compatibility — this is the difference between a working export and a support ticket).
- [ ] Export is owner-only and emits `report.exported` with the period in the payload — an audit trail for compensation data leaving the system.
- [ ] Export of an empty period produces a valid CSV with headers, not a zero-byte file.
- [ ] **Design bar** (§2).

---

## §7 — SHARED FILES AND APPEND-ONLY CONVENTIONS

Required process step 7, final clause. These files **cannot** be lane-owned
— all three lanes will touch them. The conventions below are what keep
concurrent edits mergeable, and they are binding.

| File | Convention |
| --- | --- |
| `lib/events.ts` | **Append only.** Add new `AroEventType` members at the **end** of the union, as one contiguous block prefixed `// Lane A —` / `// Lane B —` / `// Lane C —`. Add the matching `EVENT_LABELS` entries at the **end** of that object, same block, same order. **Never** reorder, re-sort, reformat, or realign existing lines — a formatting pass on this file turns three clean appends into three conflicts. Do not touch `activityAction()`'s regexes unless a new suffix genuinely has no bucket, and if so, say so in the PR body. |
| `lib/modules.ts` | **Append only.** New `ModuleKey` values at the **end** of the union; new `ModuleDef` entries at the **end** of `MODULES`. Set `surface: 'owner'` for venue-console modules. Never re-sort `MODULES` — its order is nav order. After PLAN-30 this is also the owner nav, so appending here is how a lane gets a nav entry. |
| `app/(owner)/owner-shell.tsx` | **Lane C only, and only in PLAN-30.** After PLAN-30 the nav derives from `lib/modules.ts` and **no lane edits this file again.** Before PLAN-30 lands, Lanes A and B must not touch it at all. |
| `.env.example` | **Append only, at the end of the file.** One new `# --- <Name> (<Phase>) ---` section per lane, never interleaved into existing sections. Never reorder or "tidy" existing entries. |
| `docs/plans/STATUS.md` | Each lane owns **its own `## Lane X — <name>` section** and edits nothing else. The 🔴/🟡/⚪ tier tables at the top are updated **only** by the PR that changes an item's status, and only that item's row. Never reflow the tables. (Requires PR-0.) |
| `scripts/verify-live.mjs` | **Append only** — new checks at the end of the existing check list, never interleaved. |
| `supabase/aro_schema.sql` | Mirror-only, and after PLAN-10 **only by a migration PR that Lane A reviews.** Appended at the end, matching the migration's own order. |
| `supabase/migrations/**` | **PLAN-10 only** until it merges. After that, one migration per PR, filename timestamp-ordered; a lane never applies a migration concurrently with another lane's. |
| `docs/plans/README.md` | Append the new `PLAN-NN` row; never reorder existing rows. |

**Standing per-PR gates for every PR in every lane** (in addition to each
PLAN's own checklist):

1. `grep -rE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]' <files touched>` → nothing (§2.1).
2. Renders at 375 / 768 / 1280 with no horizontal page scroll (§2.2).
3. `npm run build` + `tsc --noEmit` green.
4. `/code-review --level medium` pre-commit (existing house rule, unchanged).
5. STATUS.md updated in the **same** PR (`MASTER-PLAN-v2` doctrine: a
   partially-green checklist is a not-done system).

---

## §8 — BLOCKED — needs an owner decision

Required process step 11. **No lane is assigned anything in this section.**
Everything here is genuinely valuable and genuinely un-buildable today, and
it is separated precisely so a lane never discovers mid-build that its next
item was never buildable.

| Item | Blocked on | v2 reference | Recommendation |
| --- | --- | --- | --- |
| **AI voice agent** (reservations + questions) | D-13 vendor selection (Vapi/Retell/Bland), per-minute COGS pricing call, and v2's own gate: M-1/M-2 running clean first | §L1 | The highest-ceiling item on the whole list, and v2's doctrine for it is already right — inbound-first, behind `lib/voice/provider.ts`, booking through the existing `create_reservation` RPC (which is live and idempotent by `client_uuid`), never inventing availability. **Do not start it early because it is exciting.** Its true prerequisite is trust in the text loops, and those are themselves blocked. |
| **Email nudges (M-1)** | D-1 (Resend account), D-2 (CASL/CAN-SPAM sign-off), D-10 (sending domain + SPF/DKIM) | §N1 | Three separate owner decisions. Unchanged from v2. Note PLAN-18 (web push) delivers a *working* promotional channel with none of them — that is its whole point, and it also de-risks this by proving the consent + eligibility pattern first. |
| **SMS nudges (M-2)** | D-1b (Twilio), TCPA bar, per-send cost | §N6 | Trails email, per v2. |
| **Gift card management / stored value** | Compliance review — stored value is regulated money in most jurisdictions | §H3 (Horizon 3) | v2 is explicit: "never built casually, never built before D-2-class compliance sign-off exists for it specifically — it is a heavier compliance surface than email/SMS." **This is the single item on the owner's list most likely to be attempted casually. It must not be.** Its Horizon 3 rule also stands: it needs a full strategic diagnosis before it earns a spec. |
| **Payroll processing** (withholding, remittance, direct deposit) | Jurisdiction determination, an accountant/counsel sign-off of D-2 class, and almost certainly a payroll-provider integration (Wagepoint/Gusto/Rise-class) | New | Not a feature — a regulated financial obligation with personal liability for the owner. PLAN-35 (hours), PLAN-36 (allocation report), PLAN-37 (CSV export) deliver the genuinely useful 80% with zero exposure. **Recommendation: stop there permanently and integrate a payroll provider if demand is real.** |
| **Tip payout to staff** | Same as payroll, plus money-movement rails | New | PLAN-36 computes the split; moving the money is out of scope by design. |
| **Delivery integrations** (DoorDash Drive, Uber Direct, Tookan, Uber Eats/Postmates, Careem, Noon, First Delivery, Shipday, Lalamove) | A merchant account + API credentials + commercial terms **per vendor**, and per-market availability | §L6, `PHASE-6-COMMERCE-CANDIDATES.md` | Nine vendors across at least three regulatory markets. When it opens, build **one** behind `lib/delivery/provider.ts` (the fourth application of the provider-abstraction doctrine, after payments, AI, and comms) and prove the abstraction before adding a second. The `delivery_zones` table and `order_type='delivery'` already exist, so first-party delivery works today without any of them. |
| **Wallet passes** | D-14 (Apple/Google developer accounts) | §L3 | Unchanged. Stubs remain honest 501s. |
| **Billing / tier pricing** | D-12 (tier prices) | §N7 | Unchanged. v2 is explicit that N7 is **not buildable by any tier as currently written** until Fable writes the full spec post-D-12. |
| **Review-response + GBP automation** | D-15 (Google Business Profile API) | §L4 | Note PLAN-21 deliberately avoids this gate by having the owner paste their review URL. |
| **Google Place ID auto-lookup** (PLAN-21 convenience) | A Google Places API key | New | Explicitly cut from PLAN-21 so PLAN-21 stays unblocked. Add later if pasting a link proves to be real friction. |

**Owner actions still outstanding from STATUS.md** (minutes of dashboard
work, not decisions — and all four block *verification*, not *building*):
`SUPABASE_SERVICE_ROLE_KEY` confirmed against `aro-platform` (not the
legacy project), `OPENAI_API_KEY`, `IMPERSONATION_SECRET`, plus v2's D-8
(Stripe keys) and D-9 (AURA env parity). **PLAN-20's live tip transactions
need D-8**; everything else in all three lanes builds and merges without
any of them.

---

## §9 — EXECUTOR MODEL ASSIGNMENTS

Required process step 5. `MASTER-PLAN-v2` §7's tiering doctrine is used
**unchanged** — no parallel system is invented here. The four rules
(Fable = architect/money/consent/compliance *design*; Sonnet 5 / GPT 5.6 =
senior executor and the **floor** for migrations, authz, money, consent;
light tier = mechanical + grep-verifiable + zero design freedom; escalate,
never improvise) are inherited verbatim, including the review gates.

| Item | Spec author | Builder | Why this split |
| --- | --- | --- | --- |
| PR-0 merge | — | Sonnet 5 / GPT 5.6 | Mechanical merge; escalate on real conflict |
| PLAN-10 schema batch | **Fable 5** | Sonnet 5 applies + advisor-checks | Cross-lane RLS and tenant isolation is architecture — v2 §7.1's exact trigger |
| PLAN-11 members | Fable 5 (done, this doc) | Sonnet 5 / GPT 5.6 | Query correctness + authz surface; spec is literal |
| PLAN-12 offer engine | **Fable 5** (redemption idempotency) | Sonnet 5 / GPT 5.6 | Value-bearing, once-only — same risk class as v2 §N5 |
| PLAN-13 bounce-back/appreciation | Fable 5 (done, this doc) | Sonnet 5 / GPT 5.6 | Configuration on a reviewed engine |
| PLAN-14 birthday/anniversary | Fable 5 (v2 §N9 + this doc's conflict resolution) | Sonnet 5 / GPT 5.6 | v2 §7: consent/abuse-adjacent, **never light tier** despite its size |
| PLAN-15 referrals | Fable 5 (v2 §N5, unchanged) | Sonnet 5 / GPT 5.6 + **mandatory Fable pre-merge review of once-only credit** | Inherited verbatim from v2 §7 |
| PLAN-16 surveys | Fable 5 (done, this doc) | Sonnet 5 / GPT 5.6 | Member data collection |
| PLAN-17 mystery | Fable 5 (done, this doc) | Sonnet 5 / GPT 5.6 | Server-authoritative draw is a money surface |
| PLAN-18 web push | **Fable 5** (consent + revocation design) | Sonnet 5 / GPT 5.6 | A send channel. v2 §N1: consent-bearing infrastructure is **never** light tier, and Fable reviews the eligibility query pre-merge regardless of builder |
| PLAN-20 tips | Fable 5 (done, this doc) | Sonnet 5 / GPT 5.6 | Money surface — Sonnet is the floor (v2 §7.2) |
| PLAN-21 review prompt | Fable 5 (done, this doc) | Sonnet 5 / GPT 5.6 | Small, but the anti-gating rule is a policy boundary |
| PLAN-22 kitchen display | Fable 5 (done, this doc) | Sonnet 5 / GPT 5.6 | Realtime + fallback is genuine design work |
| PLAN-23 inventory | Fable 5 (done, this doc) | Sonnet 5 / GPT 5.6 | New tables + append-only ledger |
| PLAN-24 depletion | **Fable 5** (webhook idempotency) | Sonnet 5 / GPT 5.6 | A double-decrement is silent and unrecoverable — Fable designs the guarantee |
| PLAN-25 food costing | Fable 5 (done, this doc) | Sonnet 5 / GPT 5.6 | Read-model, but money arithmetic |
| PLAN-26 86-ing | Fable 5 (done, this doc) | Sonnet 5 / GPT 5.6 | Touches checkout |
| PLAN-30 owner nav | Fable 5 (done, this doc) | Sonnet 5 / GPT 5.6 | Rewrites a file PLAN-09 just changed; routing/authz-adjacent |
| **PLAN-31/32/33 N8 refit** | Fable 5 (inventory done, §6 Lane C) | **Kimi K3-class / light tier** | The only work here meeting all three of v2 §7.3's conditions: mechanical, grep-gated, mistake-evident |
| PLAN-34 team suite | Fable 5 (done, this doc) | Sonnet 5 / GPT 5.6 | Role/authz surface — **never light tier** (v2 §7.3) |
| PLAN-35 time clock | Fable 5 (done, this doc) | Sonnet 5 / GPT 5.6 | Compensation-adjacent data |
| PLAN-36 tip allocation | **Fable 5** + **mandatory Fable pre-merge review of the math** | Sonnet 5 / GPT 5.6 | Compensation arithmetic — v2 §7.1's money/compliance trigger |
| PLAN-37 CSV export | Fable 5 (done, this doc) | Sonnet 5 / GPT 5.6 | Compensation data leaving the system |
| §8 blocked items | **Fable 5 only**, when each gate opens | Not assigned | v2 §7: direction paragraphs are Fable-input; no lower tier builds from them |

**The detail-level rule, inherited verbatim from v2 §7:** a task may only
be assigned to a tier if the spec it runs on leaves that tier **zero
imagination to fill in.** Where this table says "Fable authors," that
authoring step is part of the dependency chain, not an optional nicety.

---

## §10 — CROSS-LANE DEPENDENCIES (the complete list)

Required process step 7. Every edge, in one place.

```
PR-0  (merge plan09)  ─┬─→  Lane A: PLAN-10 ──→ 11, 12, 14, 15, 18
                       │                  └──→ 12 ──→ 13, 16, 17
                       │
                       ├─→  Lane B: PLAN-10 ──→ 20 ──→ 21
                       │            PLAN-22 (independent, needs PR-0 only)
                       │            PLAN-10 ──→ 23 ──→ 24 ──→ 25
                       │                                └──→ 26
                       │
                       └─→  Lane C: PLAN-30 ──→ 31 ──→ 32 ──→ 33
                                    PLAN-30 ──→ 34 ──→ 35 ──→ 36 ──→ 37
```

**The only true cross-lane edges:**

1. **PR-0 → everything.** Non-negotiable. Lane C is hardest-blocked
   (PLAN-09 rewrites 145 lines of the file PLAN-30 rewrites), but STATUS.md
   itself is on that branch, so all three lanes need it.
2. **Lane A PLAN-10 → Lane B and Lane C.** Lane B cannot start PLAN-20
   (needs `orders.tip_cents`) or PLAN-23 (needs the inventory tables);
   Lane C cannot start PLAN-35 (needs `staff_shifts`). **No lane applies
   any migration until PLAN-10 merges.**
3. **Lane B PLAN-20 → Lane C PLAN-36.** There is nothing to allocate until
   tips are captured. Lane C runs PLAN-30 → 31 → 32 → 33 → 34 → 35 while
   waiting; by then PLAN-20 will have landed.

**Work available immediately after PR-0 + PLAN-10, in parallel, with zero
contention:** Lane A → PLAN-11; Lane B → PLAN-22 (needs only PR-0) then
PLAN-20; Lane C → PLAN-30. Three sessions, three files sets, no overlap.

---

## §11 — HOW A LANE SESSION STARTS

1. Confirm **PR-0** is merged (`git log origin/main --oneline | grep -i impersonation`). If not, stop — do PR-0 or wait.
2. Confirm **PLAN-10** is merged if your first item depends on it (§10). If not and you are not Lane A, pick a non-migration item or wait.
3. Read `MASTER-PLAN-aro.md` §4/§5, then `MASTER-PLAN-v2-operating-system.md`, then `STATUS.md`, then **§2 (design bar) and §7 (shared files) of this document**. §2 and §7 are the two sections a lane will otherwise violate on its first PR.
4. Write your lean `PLAN-NN` file from your item's spec above, using your lane's number range (§6), as the **first commit** of the work — the house pattern (v2 §"How an executor consumes this document", item 3).
5. Build. One PR per numbered item. Every acceptance checklist is pass/fail; a partially-green checklist is a not-done system.
6. Update **your section** of STATUS.md in the same PR. Never another lane's.
7. Hit a genuine judgment call, a schema surprise, or a contradiction between this document and the repo? **Escalate to Fable 5. Never improvise** (v2 §7.4, inherited).

---

## §12 — WHAT THIS DOCUMENT DELIBERATELY DID NOT DO

- **Did not re-plan anything v2 already sequenced.** R1–R4 and N1–N9 stand
  as written. Where a Lane A item executes a v2 item (PLAN-14 → §N9,
  PLAN-15 → §N5), it says so and inherits v2's checklist rather than
  forking it.
- **Did not invent a parallel tiering, a parallel executor doctrine, or a
  parallel decision register.** v2's 🔴/🟡/⚪, its "Gated on" column, its
  §7 tiers, and its D-NN register are the ones in force. New blockers are
  described in §8 in the same terms rather than given new IDs — the owner
  should not have to reconcile two registers.
- **Did not schedule a single blocked item into a lane.** The voice agent
  is the most valuable idea on the owner's list and it is in §8, because
  scheduling it would violate the autonomy constraint that is the point of
  this document.
- **Did not write specs for Horizon 3 items.** Gift cards get a blocked-row
  and v2's own rule, not a design paragraph — v2 §6 forbids building from
  Horizon 3 without a full strategic diagnosis first, and writing one here
  would have been exactly the false precision that rule exists to prevent.

---

**The shape of this batch in one sentence:** merge the branch that is
already holding the status layer hostage, land one coherent migration
before three sessions race the database, then fix the members bug, capture
the tips the platform is leaving on the counter, give the kitchen a real
screen, and turn the loyalty strategy library into one offer engine with
seven configurations — while the one promotional channel that needs no
vendor at all finally lets the graph's insight reach a member.
