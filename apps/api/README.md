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
