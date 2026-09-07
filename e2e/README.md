# E2E tests

Playwright suite covering the API contract and both UI routes, driven against
the real stack — no mocks, no fixtures of our own.

## Running

The tests need the provided database container up; everything else starts
itself.

```bash
docker compose up -d
pnpm --filter @repo/e2e exec playwright install chromium   # first run only
pnpm test:e2e
```

Playwright boots the Fastify API (`:3000`) and the Vite dev server (`:5173`) via
its `webServer` config and reuses them if they are already running. It uses the
**dev** server on purpose: the `/api` proxy lives in `server.proxy`, which
`vite preview` does not apply.

`apps/api/.env` must exist (copy `apps/api/.env.example`) — the API's dev script
loads it with `--env-file`.

Other entry points:

| Command                               | What it does                  |
| ------------------------------------- | ----------------------------- |
| `pnpm test:e2e:ui`                    | Playwright's watch/inspect UI |
| `pnpm --filter @repo/e2e test:headed` | Run with a visible browser    |
| `pnpm --filter @repo/e2e report`      | Open the last HTML report     |

Point the suite at a deployed stack with `E2E_WEB_URL` / `E2E_API_URL`.

## What is covered

- **`tests/api.spec.ts`** — health, paging, sorting (including `NULLS LAST`),
  date-range filtering, search, 400/404 handling, and two correctness checks
  worth doing independently of the UI: the daily summary reconciles with the
  hourly rows, and the SQL gaps-and-islands negative-price streak is recomputed
  in JS and compared.
- **`tests/daily-list.spec.ts`** — the required daily statistics, per-metric
  coverage badges, null days rendering as `—` rather than `0`, column sorting,
  pagination edges, search, date-range filtering, empty state, and shareable
  deep links (including junk search params falling back to defaults).
- **`tests/day-view.spec.ts`** — navigation from the list, summary cards against
  the API, peak hours and their delta, chart panels appearing only for reported
  metrics, the cheapest-hours selector (URL-driven, and asserted to issue no
  refetch), and the 404 path.

Every API response is parsed through the `@repo/shared` zod schemas, so each
assertion doubles as a contract check against the schemas the server serialises
with and the client validates with.

## Notes

- Assertions lean on `getByRole` and label text; a handful of `data-testid`
  hooks exist where the DOM is genuinely ambiguous (table rows, stat cards,
  the pagination readout).
- The seeded dataset is fixed, so the few hardcoded anchors live together in
  `FIXTURES` in `tests/helpers.ts`.
- The daily list keeps the previous page on screen while the next one loads
  (`keepPreviousData`). Tests wait for the row contents to turn over, not for
  the pagination counter, which updates immediately.
