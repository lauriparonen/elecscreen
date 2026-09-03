# Build plan

Working doc. Check things off as they land. Notes and decisions inline.

## Phase 0 — Repo hygiene
- [x] Fork/remote setup verified (origin = mine, upstream = solita)
- [ ] Root scaffolding: pnpm workspaces, tsconfig.base, prettier, gitignore
- [ ] `pnpm install` clean, `pnpm format:check` green
- [ ] Confirm docker db comes up: `docker compose up -d`, then `psql` in and eyeball a few rows
  - [ ] Verify `startTime` column type (TIMESTAMP vs TIMESTAMPTZ) — matters for DST handling
  - [ ] Verify `hourlyPrice` unit by sample values — confirmed snt/kWh from source docs
  - [ ] Note the date range in the seed data (affects what "today" queries return)

## Phase 1 — Backend skeleton
Goal: `curl localhost:3000/health` returns `{ok: true}`, and one real endpoint returns real data from the db.

- [ ] `apps/api` workspace: fastify, kysely, pg, zod, tsx (for dev), fastify-type-provider-zod
- [ ] Handwrite `db/types.ts` — the `Database` interface for the one table
- [ ] `db/client.ts` — pg pool + kysely + DATE parser override
- [ ] `/health` endpoint (proves fastify + zod wiring works before touching db)
- [ ] `/api/daily` endpoint returning the daily-stats list (no pagination yet, just make it work)
  - Query design decisions to make here:
    - [ ] Handling nulls: `SUM` ignores nulls but should the response distinguish "0 hours reported" from "24 hours reported all zero"?  → probably yes, add `hoursReported` field per metric
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