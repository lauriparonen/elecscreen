# Build context is the repo root, not this directory — the build needs the
# pnpm lockfile and the @repo/shared workspace package:
#   docker build -f apps/api/Dockerfile .

# ---- builder ---------------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /repo
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Manifests first, so the dependency layer is only rebuilt when deps change.
# Every workspace manifest is copied, not just the API's: pnpm matches them
# against the lockfile's importers, and --frozen-lockfile fails if any is absent.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY e2e/package.json e2e/

RUN pnpm install --frozen-lockfile --filter @repo/api...

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm --filter @repo/api build

# ---- runtime ---------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# The bundle inlines @repo/shared and every runtime dependency, so the final
# image is one JS file on top of Node — no node_modules, no package manager.
COPY --from=builder /repo/apps/api/dist/index.js ./index.js

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "index.js"]
