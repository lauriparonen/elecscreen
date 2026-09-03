# CLAUDE.md

Guidance for AI coding agents working in this repo. Human reviewers may also read this — it doubles as architecture documentation.

## What this is

Pre-assignment for **Solita Dev Academy Autumn 2026**. A web app (backend + frontend) that surfaces Finnish electricity production, consumption, and spot price data from a provided PostgreSQL container.

Deliverable: a public GitHub repo link. AI tool usage must be disclosed in the README.

## Data model

Single table `electricitydata` in the provided `init-db.tar.gz`:

| Column              | Type          | Unit               | Nullable | Notes                                      |
| ------------------- | ------------- | ------------------ | -------- | ------------------------------------------ |
| `id`                | integer PK    | —                  | no       |                                            |
| `date`              | DATE          | —                  | no       | Finland local date                         |
| `starttime`         | TIMESTAMP     | —                  | no       | verify tz-awareness before writing queries |
| `productionamount`  | NUMERIC(11,5) | MWh/h              | yes      |                                            |
| `consumptionamount` | NUMERIC(11,3) | kWh                | yes      |                                            |
| `hourlyprice`       | NUMERIC(6,3)  | snt/kWh (VAT-incl) | yes      | from porssisahko.net                       |

Column names are lowercase and were created quoted, so raw SQL must double-quote them: `"productionamount"`.

## Critical gotchas (read before touching queries)

1. **Unit mismatch.** Production is MWh/h, consumption is kWh, price is snt/kWh. Convert at the query layer, expose consistent units in the API. Recommended: normalize energy to kWh in responses (multiply production by 1000).
2. **`MWh/h` == `MWh` per row.** Each row is one hour, so `SUM(productionamount)` over a day yields MWh.
3. **DST.** Finland (Europe/Helsinki) has 23-hour and 25-hour days twice a year. Do **not** assume 24 rows per date. Group by the `date` column, not by dividing timestamps.
4. **Nullable metric columns.** All three metric columns can be null. Aggregates need per-metric null handling, and the UI should surface a data-coverage indicator (e.g. "22/24 hours reported") rather than silently dropping nulls.
5. **`NUMERIC` returns as string in node-pg.** JS numbers can't safely hold arbitrary-precision decimals. Strategy: keep raw columns typed as `string | null` in the Kysely `Database` interface, and cast to `::float8` inside aggregation queries so results come back as JS numbers. Override the `DATE` (oid 1082) parser to return raw `YYYY-MM-DD` strings and avoid timezone shifts.
6. **Longest consecutive negative-price streak** is a classic _gaps-and-islands_ problem. Solve it in SQL (window functions), not in application code.

## Architecture

Monorepo, TypeScript end-to-end.

- **Backend** (`apps/api`): Fastify + Kysely + Zod. Fastify chosen for speed and first-class Zod integration via `fastify-type-provider-zod`. Kysely for query-builder ergonomics without ORM overhead.
- **Frontend** (`apps/web`): Vite + React + TanStack Query + TanStack Table + Recharts + Tailwind.
- **Shared** (`packages/shared`): Zod schemas as the single source of truth for request/response shapes. Both api and web import from here.
- **E2E** (`e2e/`): Playwright. Bonus feature.
- **DB**: provided PostgreSQL container, unmodified.

## Folder structure

```
/
├─ docker-compose.yml         upstream, DO NOT modify
├─ Dockerfile                 upstream (db image), DO NOT modify
├─ init-db.tar.gz             upstream, DO NOT modify
├─ login.png                  upstream, DO NOT modify
├─ README.md                  ours — must credit upstream and disclose AI usage
├─ CLAUDE.md                  this file
├─ docs
│  ├─ plan.md                 general project through-line, both agent-and-human-readable
├─ package.json               workspace root, private, no runtime deps
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ apps/
│  ├─ api/
│  │  └─ src/
│  │     ├─ index.ts          fastify bootstrap
│  │     ├─ server.ts         build() fn — exported for tests
│  │     ├─ db/               types.ts (handwritten), client.ts (pool + kysely)
│  │     ├─ routes/           thin: parse → call query → return
│  │     └─ queries/          pure query fns, unit-testable without fastify
│  └─ web/
│     └─ src/
│        ├─ main.tsx
│        ├─ App.tsx
│        ├─ features/         daily-list/, day-detail/ — colocated hooks + components
│        ├─ api/              tanstack query hooks + fetch client
│        ├─ components/ui/    generic reusables
│        └─ lib/              formatters (units, dates)
├─ packages/
│  └─ shared/                 zod schemas + inferred types
└─ e2e/                       playwright, bonus
```

## Conventions

- ESM everywhere (`"type": "module"` at root, inherited by all workspaces).
- Strict TypeScript. `noUncheckedIndexedAccess` is on — `arr[0]` is `T | undefined`.
- Kysely `Database` interface is **handwritten** (schema is one table). Do not add `kysely-codegen`.
- Zod schemas define the API contract; TS types are derived via `z.infer<>`.
- Route handlers stay thin (~10 lines); business/query logic lives in `queries/` or `services/`.
- Prefer Kysely query builder over raw SQL, but drop to raw SQL fragments (`sql\`...\``) for window functions where the builder would be clumsier than helpful.

## Hard constraints

- **Never modify upstream files** (`docker-compose.yml`, `Dockerfile`, `init-db.tar.gz`, `login.png`). If a fix is genuinely needed, propose it in chat rather than editing silently.
- **Never guess package versions.** Always run `npm view <pkg> version` (or the equivalent) before writing a version into `package.json`. Prefer caret ranges (`^x.y.z`) unless there's a specific reason to pin.
- **Never commit `.env` files.** Provide `.env.example` with placeholder values.
- **Never fabricate a `packageManager` version.** Read it from `pnpm --version`.

## Features (priority order)

**Required:**

- Daily statistics list: per date, show total consumption, total production, average price, longest consecutive negative-price streak in hours.

**Optional (implement in this order):**

- Pagination
- Per-column ordering
- Search
- Filtering
- Single-day view with: hour of max consumption, hour of max production, difference between them, cheapest hours to consume
- Graph visualization on the single-day view

**Bonus:**

- Backend in Docker (add a Dockerfile in `apps/api/`)
- Cloud deploy (link from README)
- Playwright E2E tests

## Working style

- Small verifiable steps.
- Iterate on failure: if verification fails, capture what happened, fix, and note the fix in the task file's "Notes" section so we don't hit the same wall twice.
- Prefer editing existing files over creating new ones.
- Ask before doing anything destructive (deleting files, rewriting upstream files, force-pushing).

## Disclosure

Development uses Claude (Anthropic) as a coding collaborator throughout. The README will document scope and nature of AI assistance per the assignment's requirements.
