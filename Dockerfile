# syntax=docker/dockerfile:1.7
#
# Production image. Built on the server by deploy/deploy.sh (see docs/DEPLOYMENT.md).
# Some public pages are prerendered from the database during `next build`, so the build needs
# the database: its URL and the auth secret are passed as BuildKit secrets, which are never
# written into an image layer.

ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV NEXT_TELEMETRY_DISABLED=1 NPM_CONFIG_UPDATE_NOTIFIER=false
WORKDIR /app
# The PDF page renderer falls back to system fonts for text whose font is not embedded.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates fontconfig fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*

# Dependencies only: this stage also runs database migrations (deploy/docker-compose.yml).
FROM base AS deps
COPY package.json package-lock.json .npmrc prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_APP_URL
ARG SITE_INDEXING=off
ENV NODE_ENV=production NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL SITE_INDEXING=$SITE_INDEXING
RUN --mount=type=secret,id=database_url,required=true \
    --mount=type=secret,id=auth_secret,required=true \
    DATABASE_URL="$(cat /run/secrets/database_url)" \
    BETTER_AUTH_SECRET="$(cat /run/secrets/auth_secret)" \
    BETTER_AUTH_URL="$NEXT_PUBLIC_APP_URL" \
    npm run build

FROM base AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
# The whole build output, including dev dependencies: the one-off admin scripts
# (seed, admin:bootstrap) run with tsx inside this image.
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/storage && chown node:node /app/storage
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["sh", "-c", "exec node_modules/.bin/next start -H \"${HOSTNAME:-0.0.0.0}\" -p \"${PORT:-3000}\""]
