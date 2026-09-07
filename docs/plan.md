# Build plan

Working doc. Check things off as they land. Notes and decisions inline.

## Phase 0 — Repo hygiene

- [x] Fork/remote setup verified (origin = mine, upstream = solita)
- [x] Root scaffolding: pnpm workspaces, tsconfig.base, prettier, gitignore
- [x] `pnpm install` clean, `pnpm format:check` green
- [x] Confirm docker db comes up: `docker compose up -d`, then `psql` in and eyeball a few rows
  - [x] Verify `starttime` column type — `timestamp without time zone`. DST caveat still applies; group by `date`, not by dividing timestamps.
  - [x] Verify `hourlyprice` unit by sample values — min -50, max 235.104, avg ~10.35 → consistent with snt/kWh (VAT-incl).
  - [x] Note seed date range: 2020-12-31 → 2024-10-01, 1371 distinct dates. Early rows have null consumption/price (rows exist for 2020-12-31 22:00/23:00 with only production filled) — nulls per-column are real, not just theoretical.
  - Schema surprise: actual column/table names are lowercase unquoted (`electricitydata`, `starttime`, `productionamount`, `consumptionamount`, `hourlyprice`, `date`, `id`). Original brief's camelCase was misleading. `id` is `bigint`, not `integer`. Only `id` is `NOT NULL` — every metric column plus `date` and `starttime` are nullable.
  - Timestamp convention TBD: row 1 has `date=2020-12-31`, `starttime=2020-12-31 22:00:00`. If UTC, that's 2021-01-01 00:00 Finland local — but `date` matches the UTC calendar day, so `date` looks like `starttime::date` (UTC-based). Need to decide whether the UI presents "days" as UTC or Europe/Helsinki when building `/api/daily`.

## Phase 1 — Backend skeleton

Goal: `curl localhost:3000/health` returns `{ok: true}`, and one real endpoint returns real data from the db.

- [x] `apps/api` workspace: fastify, kysely, pg, zod, tsx (for dev), fastify-type-provider-zod
- [x] Handwrite `db/types.ts` — the `Database` interface for the one table
- [x] `db/client.ts` — pg pool + kysely + DATE parser override
- [x] `/health` endpoint (proves fastify + zod wiring works before touching db)
- [x] `/api/daily` endpoint returning the daily-stats list (no pagination yet, just make it work)
  - Query design decisions to make here:
    - [x] Handling nulls: `SUM` ignores nulls but should the response distinguish "0 hours reported" from "24 hours reported all zero"? → probably yes, add `hoursReported` field per metric
    - [x] Unit normalization: convert production MWh → kWh in the query, so response is uniformly in kWh
    - [x] Longest negative streak: SQL window function (gaps-and-islands). Draft in psql first, port to kysely `sql\`...\`` fragment
- [x] Manually hit endpoint with curl/httpie, eyeball a few days, sanity check numbers
  - Rough sanity: finland uses ~80 TWh/yr, so a day is ~220 GWh = 220_000_000 kWh nationally. seed data may be a subset — just check it's in a reasonable order of magnitude, not garbage.

### /api/daily notes

- Response shape (flat, per row): `date`, `productionKwh`, `consumptionKwh`, `averagePriceSntKwh`, `productionHoursReported`, `consumptionHoursReported`, `priceHoursReported`, `hoursTotal`, `longestNegativePriceStreakHours`. Wrapped in `{ data: [...] }`.
- Null strategy: metric fields nullable (SUM/AVG of all-null → null). Per-metric `hoursReported` lets the UI distinguish "no data reported" from "reported and zero".
- Unit normalization at the SQL layer: production MWh → kWh via `* 1000`; consumption already kWh; price stays snt/kWh. All aggregates cast `::float8` so pg returns JS numbers, not strings.
- Negative-price streak: gaps-and-islands CTE using `((hourlyprice < 0) IS TRUE)` as the run predicate — a null-price hour is treated as "not negative", correctly breaking a streak instead of silently spanning across a data gap. Drafted in `scratchpad/daily.sql` first, then ported to a Kysely `sql\`...\`` fragment in [apps/api/src/queries/daily.ts](apps/api/src/queries/daily.ts).
- Verification: 1371 rows returned (matches distinct-date count). 2024-09-29 has a 3-hour negative streak at avg 0.69 snt/kWh — matches psql draft. 2020-12-31 boundary: 2 hours, no price → `averagePriceSntKwh: null`, streak 0.
- Consumption coverage (verified in adminer): `consumptionamount` is null in 10,186 of 32,838 rows (~31%). Filled span is roughly 2023–2024; null elsewhere, including a tail gap in Sep–Oct 2024. UI needs to render "no consumption reported" days without crashing, but it's not the majority case.

## Phase 2 — Shared schemas

- [x] `packages/shared`: extract the zod schemas from the api into here
- [x] Api imports from `@repo/shared` instead of defining locally
- [x] Confirm workspace linking works (change a schema in shared, api picks it up)

## Phase 3 — Frontend skeleton

Goal: table on screen showing real data from the api.

- [x] `apps/web` workspace: vite, react, tanstack-query, tanstack-table, tailwind
- [x] Vite dev proxy to api (so no CORS config needed in dev)
- [x] `features/daily-list/`: query hook + table component
- [x] Import types from `@repo/shared`, validate response with zod at the boundary
- [x] Basic styling — readable, not pretty yet

### Phase 3 notes

- Vite pinned to `^7.3.6` (not 8). Vite 8 uses rolldown, whose native binding is delivered via optional deps and pnpm 10 didn't materialise `@rolldown/binding-win32-x64-msvc` on this Windows/node 20 setup — `pnpm dev` crashed on boot with `Cannot find native binding`. Vite 7 is still rollup-based and works out of the box.
- Tailwind v4 via `@tailwindcss/vite`; no `tailwind.config.*` needed, single `@import 'tailwindcss'` in `src/index.css`.
- `@tanstack/react-table` installed but unused for now — plain `<table>` for phase 3, will wire the table instance when sorting/pagination lands in Phase 5.
- Zod validates the API response at the fetch boundary (`fetchJson<S extends z.ZodType>`), so anything the api adds/changes surfaces as a parse error rather than silent UI drift.

## Phase 4 — Required feature complete

- [x] Daily list shows: date, total consumption (kWh), total production (kWh), avg price (snt/kWh), longest negative-price streak (hours)
- [x] Nulls / partial-coverage days handled visibly (not silently dropped, not shown as 0)
- [x] Empty state, loading state, error state
- [] README first pass — how to run, what's implemented, AI disclosure

**Checkpoint: this is the minimum viable submission. Everything below is optional/bonus.**

## Phase 5 — Optional features (pick as time allows)

- [x] Pagination (server-side with offset)
- [x] Column ordering
- [x] Date range filter
- [x] Search (by date? not much else to search on)
- [x] Single-day view route
  - [x] Hour of max consumption, hour of max production, delta
  - [x] "Cheapest hours" — top N by lowest price, configurable (stepper on the view)
  - [x] Recharts: **stacked small multiples**, not twin axes (twin kWh/snt-kWh routinely mislead). Three panels — production (area), consumption (area), price (line + zero reference + negative-region shade + cheapest-hour dots). Shared x-axis + `syncId` so tooltips align.

### Phase 5b plan — single day view

Router: TanStack Router (code-based, not file-based — only 2 routes). Stay in the TanStack family since we're already using Query; its typed search-param story is what we need for URL-syncing list state.

Routes:

- `/` — daily list. Search schema mirrors `dailyQuery` (page, pageSize, sortBy, sortDir, dateFrom, dateTo, q). List state moves from `useState` into URL — enables shareable list URLs and back-button restoration from the day view.
- `/day/$date` — single-day view. Search schema: `cheapestN` (1..24, default 3).

API: `GET /api/day/:date`

- 404 if no rows for that date.
- Response shape:
  ```ts
  {
    date: string,
    hours: Array<{ hour, starttime, productionKwh, consumptionKwh, priceSntKwh }>,
    summary: {
      productionKwh, consumptionKwh, averagePriceSntKwh,
      productionHoursReported, consumptionHoursReported, priceHoursReported, hoursTotal,
      longestNegativePriceStreakHours,
      peakConsumption: { hour, valueKwh } | null,
      peakProduction:  { hour, valueKwh } | null,
      hoursBetweenPeaks: number | null,
    }
  }
  ```
- Peaks computed in SQL. Nulls handled per metric.
- Cheapest N hours are **computed client-side** from `hours`, not served. The client already has all 24 hours in memory to render the chart, so an extra `?cheapestN=` query param would just cause a refetch every time the user changes N with no new information gained. The stepper stays as a UI-only filter driven by the URL search param.

KPI header: 4 cards — totals × 3 + peaks-delta card ("Consumption peaked at 08:00, production at 13:00 — 5h apart").

Packages: `@tanstack/react-router`, `recharts`.

Order of work:

1. TanStack Router setup + list state → URL search params (single commit — touching the list route already)
2. Backend `/api/day/:date` + shared schema
3. Day view shell: fetch hook, KPI cards, coverage badges
4. Charts (small multiples)
5. Cheapest-N stepper wired to URL

## Phase 6 — Bonuses (pick as time allows)

- [ ] Dockerfile for api, wire into docker-compose (or a second compose file)
- [ ] Cloud deploy — fly.io or railway are lowest-effort for a fastify + pg app
- [ ] Playwright: at minimum, "the daily list renders and has more than 0 rows"

## Open questions / to decide

- [ ] Testing on the backend: vitest for the query fns? Worth it for the gaps-and-islands one specifically.

## Decisions log

<!-- append decisions as they're made, dated -->

- YYYY-MM-DD: chose X over Y because ...
- 2026-09-03: `/api/daily` groups by the stored `date` column as-is (UTC-derived). Rationale: data is from Fingrid + porssisahko, and porssisahko's public docs state they deliberately key on ISO-8601 UTC "koska kesäajan alkaessa ja päättyessä ei tapahdu erikoistapausta kuten paikallisessa ajassa tapahtuu". Trusting the source's own UTC day boundary keeps hour counts consistent across DST. Document in the README.
