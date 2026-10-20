#!/usr/bin/env bash
# Copies the database and the uploaded files to deploy/backups/, keeping BACKUP_KEEP_DAYS days.
# Run nightly from the server's crontab, e.g.
#   15 2 * * *  /opt/rcmexcel/deploy/backup.sh >> /var/log/rcmexcel-backup.log 2>&1
# A backup on the same server does not survive losing the server: copy deploy/backups/
# elsewhere too (see docs/DEPLOYMENT.md, "Backups").
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)

# pg_dump from a throwaway container, so the server needs no PostgreSQL client installed.
docker run --rm --network host -e DATABASE_URL postgres:16-alpine \
  sh -c 'pg_dump --format=custom --no-owner "$DATABASE_URL"' > "backups/db-$stamp.dump"
docker run --rm -v rcmexcel_storage:/storage:ro alpine:3.20 tar -C /storage -czf - . > "backups/files-$stamp.tar.gz"
chmod 600 "backups/db-$stamp.dump" "backups/files-$stamp.tar.gz"

find backups -type f -mtime +"${BACKUP_KEEP_DAYS:-14}" -delete
echo "$(date -u +%FT%TZ) backup ok: db-$stamp.dump files-$stamp.tar.gz"
