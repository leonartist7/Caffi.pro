# Before Gallery — Caffi.pro as found (2026-07-07)

Captured headlessly (Chromium 1440×900, full-page) against a clean production
build (`npm run build && npm start`) with the repo's own `.env.local`. Console
errors per route logged in `before/capture-log.json`. This container cannot reach
`*.supabase.co` (egress policy), so data fetches fail here — but the dominant
failure (`placeholder.supabase.co` writes from client components) is code-level
and reproduces anywhere; see `GAP-TABLE.md` §2.

| Route                                                                          | Screenshot                                | What it shows                                                                       |
| ------------------------------------------------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `/`                                                                            | [root.png](before/root.png)               | Redirects to /dashboard — auth bypassed ("DEVELOPMENT MODE" TODO)                   |
| `/login`                                                                       | [login.png](before/login.png)             | Real Supabase password login (works, but nothing enforces it)                       |
| `/dashboard`                                                                   | [dashboard.png](before/dashboard.png)     | **Fully mocked** static numbers (€2,400, 1,234 users, fake feed); renders w/o login |
| `/clients`                                                                     | [clients.png](before/clients.png)         | Tenant (café-client) manager — HQ persona, not owner; fetch fails                   |
| `/cafes`                                                                       | [cafes.png](before/cafes.png)             | Locations list; fetch fails                                                         |
| `/menu`                                                                        | [menu.png](before/menu.png)               | Menu manager; reads fail; writes would hit placeholder host                         |
| `/orders`, `/coupons`, `/rewards`, `/notifications`, `/analytics`, `/activity` | same-named .png                           | Real UIs wired to Supabase; all data calls fail                                     |
| `/settings`                                                                    | [settings.png](before/settings.png)       | Static form, zero persistence                                                       |
| `/staff`                                                                       | [staff.png](before/staff.png)             | Staff admin (dashboard side)                                                        |
| `/staff/login`                                                                 | [staff_login.png](before/staff_login.png) | Separate staff auth (email+password; no PIN)                                        |
| `/staff/dashboard` … `/staff/team`                                             | staff\_\*.png                             | All correctly redirect to staff login — the one properly gated area                 |
| `/shop/demo-cafe` + subroutes                                                  | shop_demo-cafe\*.png                      | Customer ordering PWA; graceful "Coffee Shop Not Found" without DB                  |

Not captured: `/tenants/[id]`, `/menu/[slug]`, `/cafes/[slug]` (need live tenant
rows), `/api/*` (JSON). The "after" gallery per phase goes in `docs/audit/after/`.
