# Google Business Profile — owner onboarding guide

Pure documentation. No API integration, no new vendor account, no code —
this satisfies the master plan's "Google Business Profile guidance" line
for PLAN-05 without the vendor-account decision that a real API
integration would require (deliberately the same reason PLAN-05 itself was
promoted ahead of Phase 3/4: it needs nothing new from the owner to sign up
for). If aro ever builds a real GBP API integration, this doc is the
starting brief for that future plan, not a substitute for it.

Hand this to a café owner once their aro site (`/site/<slug>`, or their
custom domain once it's set up) is live and `site_enabled` is on — a
Business Profile with no working website link undersells the café, and a
site with no Business Profile is invisible to "coffee near me" searches.

## 1. Claim or create the listing

1. Go to [google.com/business](https://www.google.com/business) and sign
   in with the account the café wants to manage this from long-term (not a
   personal account that might leave the business later).
2. Search for the café's name and address. If a listing already exists
   (created automatically by Google or a past customer), claim it instead
   of creating a duplicate — duplicates split reviews and confuse search
   ranking.
3. Verify ownership. Google typically offers postcard-by-mail, phone, or
   email verification depending on the business category and history —
   follow whichever option Google presents; there's no aro-specific step
   here.

## 2. Fill in the profile completely

Every field below maps to something the café already entered in
**HQ → Settings → Website** — copy it over rather than re-typing from
scratch:

| Business Profile field | Comes from                                             |
| ---------------------- | ------------------------------------------------------ |
| Business name          | Settings → General → Business Name                     |
| Address                | Settings → Website → Address                           |
| Phone                  | Settings → Website → Phone                             |
| Website                | The aro site URL (`/site/<slug>` or the custom domain) |
| Category               | "Coffee shop" / "Café" — pick the closest match        |
| Hours                  | Settings → Reservations → weekly hours                 |

Add the aro site as the **Website** field specifically — not a social
media profile, not a delivery-app page. That URL is what carries the
café's own menu, hours, and story with no platform's branding on it.

## 3. Photos

Upload real photos: the storefront exterior (helps people find it on the
street), the interior, and a few drinks/food shots. The same gallery
images already added under Settings → Website work well here too — reuse
them rather than sourcing new ones.

## 4. Keep hours in sync

If the café's hours change, update them in **two places**: aro's Settings
(so the site and reservations stay correct) and the Business Profile
(so Google Search and Maps show the right hours). They are not connected
today — there is no API sync in this release — so a change made in only
one place will drift from the other.

## 5. Respond to reviews

A short, honest reply to every review — good or bad — measurably improves
both trust and local search ranking. Suggested cadence: check weekly,
reply within a few days. A reply doesn't need to be long: thanking a
happy reviewer by name, or acknowledging a complaint and inviting the
person back in, both count.

## 6. What this guide does not cover

- Google Posts, Google Q&A, and other Business Profile features exist but
  are not covered here — this guide is deliberately scoped to the handful
  of steps that connect directly to what aro already gives the café
  (the site URL, the address, the hours).
- Automated syncing between aro and Google Business Profile (hours,
  photos, review replies) would require the Google Business Profile API —
  a real vendor-account and API-key decision, out of scope for this
  release, and flagged here as the natural next step if this guidance
  proves valuable enough to be worth automating.
