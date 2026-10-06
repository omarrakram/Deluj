# DELUJ Digital Operating System — Demo

One Deluj. Every order. Connected.

A working, multi-device demonstration of a digital operating system for **Deluj**: a guest orders from their table on their phone, the kitchen display hears it instantly, and Hosny's command center updates live. It runs on the real Deluj menu and brand.

| Screen | Route | Designed for |
| --- | --- | --- |
| Landing / system overview | `/` | any |
| Guest ordering (Table 07) | `/order/table-07` | phone (works at 360 px and up) |
| Kitchen display system | `/staff` | landscape tablet / kitchen screen (also phone) |
| Owner command center | `/owner` (`#menu`, `#floor`, `#settings`) | laptop (full mobile companion layout) |
| Printable Table 07 QR card | `/print/table-07` | A6 print, plus `qr.png` / `qr.svg` downloads |

Any table works: `/order/table-01` … `/order/table-14`.

---

## Overview

**Customer** — Branded mobile menu with search, sticky sections, the real add-ons (Alt Milk, Syrup, Cold Foam at EGP 45 only where they make sense, plus free preferences like ice level and Egyptian sugar levels for Turkish coffee), special instructions, a context-aware "Perfect with this" pairing moment, cart with upsells, a demo-safe checkout (card / Apple Pay / cash — no card data is ever collected), a live order tracker, and one-tap guest requests (call waiter, bill, water, napkins, cutlery, sauce) with duplicate protection.

**Kitchen** — New / Preparing / Ready / Served board with elapsed timers and late flags, modifiers and notes in large type, one-tap Accept → Preparing → Ready → Served with one-step recall, the guest request center (bill requests highlighted), arrival highlights and an opt-in synthesised chime, a dark kitchen mode and a screen wake lock.

**Owner** — "Good Morning, Hosny" (by Cairo time). Live KPIs that count up and float the delta when an order lands (revenue, orders, average order, active tables, direct-order share, new vs returning guests), revenue trend, orders by hour vs a typical day, best sellers, channel mix, menu performance, recent orders, **Live at Deluj** (every order, request and change as it happens), **Smart Insights**, the floor, quick availability toggles and full menu control (availability, price, section, featured). Demo controls (Reset Demo, offline mode) live discreetly under Settings.

> All dashboard figures are **illustrative demo data** generated for this demonstration — not Deluj's real business performance — and are labelled as such. Menu items, prices and descriptions are Deluj's current menu.

## Architecture

```
src/
  domain/        Pure TypeScript, no framework imports — runs in the browser and on the server
    menu.ts          the real Deluj menu, sections and add-ons (source of truth)
    cart.ts          pricing and validation (the server re-prices every order)
    orders.ts        lifecycle, transitions, urgency, the guest's progress stages
    requests.ts      guest service requests, de-duplication, rate limiting
    engine.ts        the command reducer every backend runs: state + command → state + row changes
    recommend.ts     "Perfect with this" pairing engine (+ pairings.ts)
    analytics.ts     KPIs, trends, floor status
    insights.ts      Smart Insights rules engine
    seed.ts          deterministic demo history (identical on every device)
  server/        Repositories and server-only helpers
    supabase-repo.ts Postgres via the service role; Realtime streams the row changes
    memory-repo.ts   one Node process + Server-Sent Events (local / LAN backup)
    access.ts        optional team access code for /staff and /owner
    qr.ts            branded QR rendering
  client/        Browser data layer
    backend.ts       transports: Supabase Realtime, SSE, or same-device offline mode
    store.tsx        live store: merge, optimistic overlays, retries, resync, clock alignment
  app/           Next.js routes (App Router) and API route handlers
  components/    brand, ui, customer, staff, owner
supabase/schema.sql   tables, RLS, realtime publication, server-only RPCs
tests/unit            Vitest — domain logic
tests/e2e             Playwright — the three-device meeting, resilience, offline mode
```

Stack: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, Motion, Supabase (Postgres + Realtime), Vercel. Fonts are self-hosted; product art is Deluj-branded line illustration (no stock photos, and no dish is ever shown as something it isn't); the logo is rendered from the real Deluj artwork (`brand-source/`, extracted by `scripts/extract-logo.mjs`).

### Realtime architecture

1. Every change is a **command** (`placeOrder`, `setOrderStatus`, `createRequest`, `setRequestStatus`, `updateMenuItem`, `openTable`, `reset`) sent to `POST /api/command`.
2. The server validates it with the shared domain engine (prices recomputed from the menu, availability, transitions, idempotency, rate limits) and writes rows with the Supabase service-role key.
3. Supabase Realtime (`postgres_changes`) streams each row change to every subscribed screen; guest phones subscribe only to their own table's rows.
4. Screens apply changes as newest-wins upserts. The sender applies the server's answer immediately (and staff/owner actions are optimistic), so the person tapping never waits for the round trip.
5. Resilience: "Live" is only shown once Realtime confirms *Subscribed to PostgreSQL*; screens resync on reconnect, on focus, when the network returns, and every 15 s as a safety net; while the socket is down they poll. Orders and requests carry a client request id, so retries and double taps never duplicate.

Without Supabase the same API runs on an in-memory store and streams changes over Server-Sent Events — ideal on a laptop serving phones over a hotspot. With `?offline=1`, the engine runs entirely in the browser and tabs sync via `BroadcastChannel` (no network at all).

### Recommendation engine

Deterministic and offline (`src/domain/recommend.ts`). It scores the live menu using curated flavour pairings, the order's composition (it balances drinks and plates and never stacks a second drink onto a drink), time of day (no breakfast push in the evening), co-occurrence learned from today's orders, and availability (sold-out items are routed around). Examples: Iced Matcha → Maple Syrup Pancakes; Truffle Obsession → Flat White; Belgian Chocolate pancakes → Espresso / Americano / Latte; a savoury meal with a drink → something sweet to finish. No external model is involved, so it cannot fail during service; an LLM could later rephrase the copy without changing the logic.

### Smart Insights

A rules engine over live state (`src/domain/insights.ts`): it reacts to the order that just landed (pairings and their value), late orders, open bill requests, sold-out items, breakfast orders without a drink, Cold Foam attach rate, peak hours, direct-order share, best sellers, the highest-value iced coffee, matcha with returning guests, Breakfast Club premiums and average time-to-ready. Each rule only speaks when the data supports it.

## Supabase setup (exact steps, ≈5 minutes)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
   - Name: `deluj` · Region: **Central EU (Frankfurt)** (closest to Cairo and to the Vercel functions) · Plan: Free.
   - Set a database password (store it in your password manager; the app never needs it).
2. When the project is ready: **SQL Editor** → **New query** → paste the **entire** contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run**. Expected result: *Success. No rows returned*. (The script is idempotent; running it twice is harmless.)
3. Check it worked: **Database → Publications → `supabase_realtime`** lists 6 tables (`activity`, `demo_meta`, `menu_items`, `orders`, `service_requests`, `table_sessions`).
4. **Project Settings → API Keys** — copy three values:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable** key (`sb_publishable_…`; or the legacy *anon public* key) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Secret** key (`sb_secret_…`; or the legacy *service_role* key) → `SUPABASE_SERVICE_ROLE_KEY` — server only, never shared.

The database seeds itself on the first request. Security model: the browser key can only `SELECT` (Realtime needs it); every write goes through the Next.js server with the secret key; `reset_demo` and `next_order_number` are executable by the service role only. No card data is stored. Free projects pause after about a week without traffic — open the site the day before the meeting.

## Environment variables

| Variable | Required | Where it is used | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes (deployed) | browser + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes (deployed) | browser + server | publishable / anon key — read-only by RLS (alias: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (deployed) | **server only** | secret / service_role key — writes orders, requests, menu (alias: `SUPABASE_SECRET_KEY`) |
| `DELUJ_ACCESS_CODE` | yes (deployed) | server | protects `/staff`, `/owner` and their actions (Reset Demo, menu edits); guests never need it. 6+ characters |
| `NEXT_PUBLIC_SITE_URL` | optional | server | QR target for a custom domain (on Vercel the public production domain is used automatically) |
| `DELUJ_BACKEND=memory` | optional | server | force the in-memory backend (LAN backup) |

See [`.env.example`](.env.example). Configuration is read at request time; after changing a variable on Vercel, redeploy. On Vercel, a missing Supabase variable makes `/api/health` return **503** naming what is missing, instead of silently running without sync.

## Local development

```bash
npm install
npm run dev                 # http://localhost:3000 — in-memory backend, no setup needed
```

With Supabase, put the three variables in `.env.local` first.

**LAN / hotspot mode** (backup when the venue has no internet): build once with `npm run build`, then `npm run demo:start` on the laptop. It forces the in-memory backend, listens on the local network and prints the exact URL for the phone, iPad and laptop. Connect all three to the same Wi-Fi or hotspot; they stay in sync through the laptop. (`npm run demo:local` builds and starts in one go.)

## Testing

```bash
npm run typecheck
npm run lint
npm test                                   # unit tests: pricing, transitions, recommendations, analytics, the full sequence
npm run build
npm run start &                            # then, against the running server:
npm run test:e2e -- http://localhost:3000  # phone + kitchen tablet + owner laptop, 23 checks
npm run test:resilience -- http://localhost:3000
npm run test:offline -- http://localhost:3000
```

The three-device test drives isolated browser contexts through the whole meeting: open Table 07 → owner feed sees it → add Iced Matcha (oat, less ice) → pairing recommendation → add Maple Syrup Pancakes → pay → kitchen receives it → owner KPIs move by exactly EGP 485 → Accept / Preparing / Ready reach the phone → bill request appears on the kitchen "just now" (and a second tap is de-duplicated) → done → served → sold-out toggle reaches the phone and the server refuses to sell it → back on → no console errors. It passes against both the in-memory server and a real Supabase stack (Postgres 17 + Realtime).

## Deployment (Vercel — exact steps, ≈5 minutes)

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → `omarrakram/Deluj`. (If it isn't listed: *Adjust GitHub App Permissions* and grant access to the repository.)
2. Framework preset **Next.js** (auto-detected). Leave Root Directory, Build and Output settings at their defaults.
3. **Environment Variables** — add for **Production and Preview**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `DELUJ_ACCESS_CODE` (6+ characters; without it anyone with the URL can reset the demo).
4. **Deploy**. Your public address is the production domain shown on the project page, e.g. `https://deluj.vercel.app` (or `https://deluj-<suffix>.vercel.app`). Use that domain — not the long per-deployment URL, which Vercel protects with a login by default.
5. From a phone that is **not** signed in to Vercel, open `https://<production-domain>/api/health`. It must show `"ok":true,"backend":"supabase"` and a `qrTarget` on the production domain.
6. Open `https://<production-domain>/print/table-07` and print the card (A6, or 100 % scale on A4). The QR always encodes the public production domain.

`vercel.json` runs functions in Frankfurt (`fra1`), next to a Frankfurt Supabase project. If your plan refuses the region setting, delete `vercel.json` and redeploy — everything still works. Note: Vercel's free Hobby plan is for personal, non-commercial use; client work may need Pro.

### Verify production

```bash
npm ci && npx playwright install chromium  # once, on the laptop running the check
export DELUJ_ACCESS_CODE=<your code>       # the same code you set on Vercel
npm run verify:production -- https://<production-domain>
```

Checks `/api/health` (must say `supabase`), every route, that the Table 07 QR decodes to the production domain at several sizes, layout and console errors at phone / small-phone / tablet / desktop sizes, then runs the three-device realtime test and the network-drop resilience test against the live deployment. The realtime test starts with a demo reset, so run it before the meeting rather than during it. Add `--no-e2e` for a quick, non-destructive check.

**Before the meeting:** open `/owner#settings` → Reset demo, so the seeded day and its timers start fresh.

## Meeting day

See [`MEETING-DAY.md`](MEETING-DAY.md) — the one page to keep open tomorrow: reset, the three URLs, device setup, the 60-second sequence and the Wi-Fi fallback.

## Future production roadmap

The domain engine, command API and repository boundary are designed so these slot in without rewrites:

- **Payments** — card tokenisation behind the existing `paymentMethod` / `paymentStatus` fields; provider webhooks become commands.
- **Auth & permissions** — Supabase Auth with staff/owner roles replacing the shared access code; RLS policies per role and per branch.
- **Multi-branch** — a `branch_id` on every table; the owner view rolls branches up (a "future branch view" placeholder is in Settings).
- **Customer accounts, loyalty, rewards, CRM** — orders already record new vs returning guests; add profiles, favourites, "order again" and segments.
- **Direct delivery & pickup** — channels already exist in the data model; add addresses, rider assignment and tracking.
- **POS, kitchen printers, inventory** — consume the same command/event stream; sold-out can become automatic from stock.
- **Notifications** — WhatsApp / push when an order is ready; owner alerts for late orders.
- **Analytics & forecasting** — daily rollups, demand forecasting by hour and item, campaign automation.
- **AI wording** — optional LLM phrasing for insights and recommendations, always with the deterministic engine as the source of truth.
