#!/usr/bin/env bash
# Builds and (re)starts RCMExcel on this server. Run from anywhere:
#   deploy/deploy.sh            migrate the database, build, restart, check health
#   deploy/deploy.sh seed       load the reference content (safe to repeat; never overwrites)
#   deploy/deploy.sh admin you@example.com
#                               make an existing, verified account the first Super Administrator
#   deploy/deploy.sh logs       follow the app log
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] || { echo "Missing deploy/.env: copy deploy/.env.example and fill it in." >&2; exit 1; }
set -a; . ./.env; set +a
export DOCKER_BUILDKIT=1

case "${1:-deploy}" in
  seed)  exec docker compose run --rm --no-deps app npm run db:seed ;;
  admin) [ -n "${2:-}" ] || { echo "Usage: deploy/deploy.sh admin <email>" >&2; exit 1; }
         exec docker compose run --rm --no-deps app npm run admin:bootstrap -- "$2" ;;
  logs)  exec docker compose logs -f --tail=200 app ;;
  deploy) ;;
  *) echo "Unknown command: $1" >&2; exit 1 ;;
esac

if [[ ",${COMPOSE_PROFILES:-}," == *",localdb,"* ]]; then
  echo "==> Starting the database"
  docker compose up -d --wait db
fi

echo "==> Applying database migrations"
docker compose build migrate
docker compose run --rm migrate

echo "==> Building the app (pages are prerendered from the database)"
docker compose build app

echo "==> Starting"
docker compose up -d --remove-orphans

echo "==> Waiting for the app to report healthy"
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/api/health 2>/dev/null; then
    echo "Up. Visit ${NEXT_PUBLIC_APP_URL}"
    exit 0
  fi
  sleep 3
done
echo "The app did not become healthy. Recent log:" >&2
docker compose logs --tail=80 app >&2
exit 1
