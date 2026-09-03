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

- [ ] `apps/api` workspace: fastify, kysely, pg, zod, tsx (for dev), fastify-type-provider-zod
- [ ] Handwrite `db/types.ts` — the `Database` interface for the one table
- [ ] `db/client.ts` — pg pool + kysely + DATE parser override
- [ ] `/health` endpoint (proves fastify + zod wiring works before touching db)
- [ ] `/api/daily` endpoint returning the daily-stats list (no pagination yet, just make it work)
  - Query design decisions to make here:
    - [ ] Handling nulls: `SUM` ignores nulls but should the response distinguish "0 hours reported" from "24 hours reported all zero"? → probably yes, add `hoursReported` field per metric
    - [ ] Unit normalization: convert production MWh → kWh in the query, so response is uniformly in kWh
    - [ ] Longest negative streak: SQL window function (gaps-and-islands). Draft in psql first, port to kysely `sql\`...\`` fragment
- [ ] Manually hit endpoint with curl/httpie, eyeball a few days, sanity check numbers
  - Rough sanity: finland uses ~80 TWh/yr, so a day is ~220 GWh = 220_000_000 kWh nationally. seed data may be a subset — just check it's in a reasonable order of magnitude, not garbage.

## Phase 2 — Shared schemas

- [ ] `packages/shared`: extract the zod schemas from the api into here
- [ ] Api imports from `@repo/shared` instead of defining locally
- [ ] Confirm workspace linking works (change a schema in shared, api picks it up)

## Phase 3 — Frontend skeleton

Goal: table on screen showing real data from the api.

- [ ] `apps/web` workspace: vite, react, tanstack-query, tanstack-table, tailwind
- [ ] Vite dev proxy to api (so no CORS config needed in dev)
- [ ] `features/daily-list/`: query hook + table component
- [ ] Import types from `@repo/shared`, validate response with zod at the boundary
- [ ] Basic styling — readable, not pretty yet

## Phase 4 — Required feature complete

- [ ] Daily list shows: date, total consumption (kWh), total production (kWh), avg price (snt/kWh), longest negative-price streak (hours)
- [ ] Nulls / partial-coverage days handled visibly (not silently dropped, not shown as 0)
- [ ] Empty state, loading state, error state
- [ ] README first pass — how to run, what's implemented, AI disclosure

**Checkpoint: this is the minimum viable submission. Everything below is optional/bonus.**

## Phase 5 — Optional features (pick as time allows)

- [ ] Pagination (server-side, cursor or offset — offset is fine for this)
- [ ] Column ordering
- [ ] Date range filter
- [ ] Search (by date? not much else to search on)
- [ ] Single-day view route
  - [ ] Hour of max consumption, hour of max production, delta
  - [ ] "Cheapest hours" — top N by lowest price, maybe with a threshold input
  - [ ] Recharts line chart: consumption + production + price on shared time axis
    - Twin y-axes needed (kWh vs snt/kWh). Design decision: one chart with 2 axes, or stacked small multiples? Small multiples usually read better but take more space.

## Phase 6 — Bonuses (pick as time allows)

- [ ] Dockerfile for api, wire into docker-compose (or a second compose file)
- [ ] Cloud deploy — fly.io or railway are lowest-effort for a fastify + pg app
- [ ] Playwright: at minimum, "the daily list renders and has more than 0 rows"

## Open questions / to decide

- [ ] Frontend router: needed only if we build the single-day view. Tanstack Router vs React Router — probably React Router bc it's the boring default and this project doesn't need anything fancy.
- [ ] Testing on the backend: vitest for the query fns? Worth it for the gaps-and-islands one specifically.

## Decisions log

<!-- append decisions as they're made, dated -->

- YYYY-MM-DD: chose X over Y because ...
- 2026-09-03: `/api/daily` groups by the stored `date` column as-is (UTC-derived). Rationale: data is from Fingrid + porssisahko, and porssisahko's public docs state they deliberately key on ISO-8601 UTC "koska kesäajan alkaessa ja päättyessä ei tapahdu erikoistapausta kuten paikallisessa ajassa tapahtuu". Trusting the source's own UTC day boundary keeps hour counts consistent across DST. Document in the README.
