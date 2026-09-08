# Electricity statistics

Solita Dev Academy Autumn 2026 pre-assignment: a full-stack TypeScript app over the
provided Finnish electricity dataset (Fingrid production/consumption + porssisahko.net
spot prices).

The original assignment brief is kept verbatim in [docs/assignment.md](docs/assignment.md).

- **Tech stack:** Fastify · Kysely · Postgres · React · TanStack Query/Router/Table · Recharts · Tailwind · Playwright

---

## Quick start

Requires [Docker Desktop](https://docs.docker.com/desktop/), Node 20+, and pnpm 10.

```bash
pnpm install
docker compose up -d                      # provided Postgres + Adminer, unmodified
cp apps/api/.env.example apps/api/.env    # defaults already match docker-compose.yml
pnpm dev                                  # API :3000 and web :5173, in parallel
```

Then open **http://localhost:5173**.

`apps/api/.env` needs these two values (identical to the upstream compose file; the
example file uses placeholders purely to keep the habit):

```
DATABASE_URL=postgres://academy:academy@localhost:5432/electricity
PORT=3000
```

| URL                     | What                                    |
| ----------------------- | --------------------------------------- |
| `localhost:5173`        | Web app                                 |
| `localhost:3000/health` | API health check                        |
| `localhost:8088`        | Adminer (creds in `docs/assignment.md`) |

The database container takes a couple of minutes to seed on first run.

Other scripts: `pnpm typecheck`, `pnpm format:check`, `pnpm test:e2e`.

### Or run the API in Docker

`docker-compose.app.yml` is an overlay that adds the API container to the provided
database stack. The upstream `docker-compose.yml` is not modified; the two are merged:

```bash
pnpm install                    # the frontend still runs locally, so it still needs deps
docker compose -f docker-compose.yml -f docker-compose.app.yml up -d --build
pnpm --filter @repo/web dev     # proxies to the container on :3000
```

The API image is a two-stage build ([apps/api/Dockerfile](apps/api/Dockerfile)): esbuild
bundles the server and the shared schemas into one file, so the runtime stage is Node plus
a single `index.js` — no `node_modules`, no package manager, non-root user.

---

## Status

Everything in the assignment is implemented except two of the "surprise us" bonuses.

**Required — daily statistics list**

- [x] Total consumption per day
- [x] Total production per day
- [x] Average price per day
- [x] Longest consecutive negative-price streak, in hours, per day

**Additional — daily list**

- [x] Pagination (server-side)
- [x] Ordering per column (server-side, `NULLS LAST`)
- [x] Search
- [x] Date-range filtering

**Additional — other**

- [x] Single-day view: totals, hour of peak consumption, hour of peak production, the gap
      between them, and the N cheapest hours (adjustable)
- [x] Graph visualisations (three synced panels — production, consumption, price)

**Surprise us**

- [x] Backend in Docker
- [ ] Backend in the cloud
- [x] E2E tests: 33 Playwright specs against the real stack

All list and day-view state lives in the URL, so any view is a shareable link.

---

## API

| Endpoint             | Notes                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `GET /health`        | `{ ok: true }`                                                                              |
| `GET /api/daily`     | Daily stats list. Query: `page`, `pageSize`, `sortBy`, `sortDir`, `dateFrom`, `dateTo`, `q` |
| `GET /api/day/:date` | One day: hourly rows + a summary. `404` if the date has no rows                             |

```bash
curl 'localhost:3000/api/daily?dateFrom=2023-07-02&dateTo=2023-07-02'
```

```json
{
  "data": [
    {
      "date": "2023-07-02",
      "productionKwh": 711648000,
      "consumptionKwh": null,
      "averagePriceSntKwh": 0.644125,
      "productionHoursReported": 24,
      "consumptionHoursReported": 0,
      "priceHoursReported": 24,
      "hoursTotal": 24,
      "longestNegativePriceStreakHours": 14
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 1
}
```

Energy is normalised to **kWh** everywhere; price stays **snt/kWh** (VAT-incl.).
Request and response shapes are Zod schemas in [`packages/shared`](packages/shared/src) —
the API validates and serialises with them, the web client re-parses every response
through them, and the E2E suite asserts against them. One definition, three consumers.

---

## Data notes

The parts of this dataset that punish assumptions. Longer write-ups and the dated
decisions log live in [docs/plan.md](docs/plan.md).

- **Three different units.** Production is MWh/h, consumption is kWh, price is cents per kWh (denoted as snt/kWh).
  Conversion happens in SQL (`productionamount * 1000`) so nothing downstream has to
  remember.
- **Nulls are the normal case, not an edge case.** `consumptionamount` is null in ~31% of
  rows. Every response carries a per-metric `hoursReported` count, so "no data" and "reported zero" stay distinguishable — the UI shows `—` plus a coverage badge, never a misleading `0`.
- **Days are not 24 hours.** Spring-forward days in this data have 23 rows. Aggregates
  group by the `date` column and report `hoursTotal`; nothing divides timestamps or
  assumes a row count. Pinned by an E2E test.
- **The day boundary is the source's, not ours.** `date` is UTC-derived, and porssisahko
  documents keying on UTC deliberately so DST introduces no special case. Grouping by the
  stored column as-is keeps our numbers reconcilable with the source rather than silently
  re-cut.
- **Negative-price streaks are solved in SQL**, as gaps-and-islands with window functions.
  The run predicate is `(hourlyprice < 0) IS TRUE`, so an hour with no price _breaks_ a
  streak instead of invisibly bridging a data gap.
- **`NUMERIC` arrives as a string in node-pg.** Raw columns are typed `string | null`;
  aggregates cast to `::float8` so JSON numbers come out as numbers. The `DATE` parser is
  overridden to return plain `YYYY-MM-DD` and dodge timezone shifts entirely.

---

## Architecture

pnpm workspaces, ESM, strict TypeScript (`noUncheckedIndexedAccess` on).

```
apps/api        Fastify + Kysely. routes/ stay thin; queries/ hold the SQL.
apps/web        Vite + React. features/daily-list, features/day-view.
packages/shared Zod schemas — the API contract, imported by all three.
e2e             Playwright, against the real stack.
docs            plan.md (working log + decisions) · assignment.md (upstream brief)
```

Why these: **Fastify** for first-class Zod schema validation and serialisation via
`fastify-type-provider-zod`. **Kysely** for typed SQL without an ORM's opinions — the
schema is one table, so its `Database` interface is handwritten, and window-function work
drops to raw SQL fragments where the builder would only get in the way. **TanStack
Router** for typed search params, which is what makes the URL the single source of truth
for list state.

---

## Tests

```bash
docker compose up -d
pnpm --filter @repo/e2e exec playwright install chromium   # first run only
pnpm test:e2e
```

33 Playwright tests, no mocks: API contract (paging, sorting, filtering, 400/404), the
daily list UI, and the day view. Two checks earn their keep independently of the UI — the
daily summary is reconciled against the hourly rows, and the SQL negative-price streak is
recomputed in JS and compared. Details in [e2e/README.md](e2e/README.md).

---

## Use of AI

I used Claude Code (primarily Opus 4.7, but also Opus 5) as a coding assistant throughout this project. Essentially all code was written by agents, but I reviewed each diff and made the architectural decisions.

**How.** The steering documents are checked in and readable; [CLAUDE.md](CLAUDE.md) is
the context and constraints I gave the tool, and [docs/plan.md](docs/plan.md) is the
running plan and dated decisions log I worked from. In addition to setting development constraints for the agents to follow, both served as living documentation; they can be read and reviewed.

---

## Attribution

- Assignment, database image and seed data: [solita/dev-academy-autumn-2026-exercise](https://github.com/solita/dev-academy-autumn-2026-exercise)
- Production and consumption data: [Fingrid](https://data.fingrid.fi/)
- Price data: [porssisahko.net](https://porssisahko.net/)

`docker-compose.yml`, `Dockerfile`, `init-db.tar.gz` and `login.png` are upstream and
unmodified.
