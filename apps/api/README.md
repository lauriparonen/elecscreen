# @repo/api

Fastify + Kysely backend for the dev academy exercise.

## Local dev

The DB comes from the repo-root `docker-compose.yml` (Postgres on `localhost:5432`, user/pass/db `academy` / `academy` / `electricity` — public creds from the upstream compose file).

```bash
# from repo root
docker compose up -d

# then in apps/api/
cp .env.example .env
```

Fill in `.env` with the values that match `docker-compose.yml`:

```
DATABASE_URL=postgres://academy:academy@localhost:5432/electricity
PORT=3000
```

Then, from repo root:

```bash
pnpm --filter @repo/api dev
```

## Notes

- `.env.example` uses placeholders on purpose to maintain env var hygiene even though in this case they're identical to the upstream repo.
- If something else is already on port 3000, override with `PORT=3001` in `.env`.

## Build

```bash
pnpm --filter @repo/api build   # -> dist/index.js
pnpm --filter @repo/api start
```

The build is esbuild, not `tsc`. `@repo/shared` is consumed as TypeScript source, which
tsx and Vite resolve happily but Node does not — a `tsc` build emits a `dist/index.js`
that still imports `@repo/shared`, resolves to a `.ts` file, and dies at boot with
`ERR_UNKNOWN_FILE_EXTENSION`. Bundling inlines the shared schemas and the runtime deps
into one self-contained ESM file. Type checking stays with tsc, under `pnpm typecheck`.

See [build.js](build.js) for the config and the `createRequire` banner (Fastify and pg are
CommonJS and call `require()` internally).

## Docker

Built from the repo root — the image needs the lockfile and `packages/shared`:

```bash
docker compose -f docker-compose.yml -f docker-compose.app.yml up -d --build
```

Two stages: a builder that installs with pnpm and runs the bundle, and a runtime stage
holding Node plus a single `index.js`, running as the non-root `node` user with a
`/health` healthcheck.
