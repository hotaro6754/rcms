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

# mariadb-dump from a throwaway container, so the server needs no database client installed.
# DATABASE_URL is mysql://user:password@host:port/name (user and password may be %-encoded).
re='^mysql://([^:]+):([^@]*)@([^:/]+):?([0-9]*)/([^?]+)'
[[ "$DATABASE_URL" =~ $re ]] || { echo "DATABASE_URL is not a mysql:// address" >&2; exit 1; }
urldecode() { local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }
DB_USER=$(urldecode "${BASH_REMATCH[1]}"); DB_PASS=$(urldecode "${BASH_REMATCH[2]}")
DB_HOST="${BASH_REMATCH[3]}"; DB_PORT="${BASH_REMATCH[4]:-3306}"; DB_NAME=$(urldecode "${BASH_REMATCH[5]}")
docker run --rm --network host -e MYSQL_PWD="$DB_PASS" mariadb:10.11 \
  mariadb-dump --single-transaction --routines --triggers --default-character-set=utf8mb4 \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" | gzip > "backups/db-$stamp.sql.gz"
docker run --rm -v rcmexcel_storage:/storage:ro alpine:3.20 tar -C /storage -czf - . > "backups/files-$stamp.tar.gz"
chmod 600 "backups/db-$stamp.sql.gz" "backups/files-$stamp.tar.gz"

find backups -type f -mtime +"${BACKUP_KEEP_DAYS:-14}" -delete
echo "$(date -u +%FT%TZ) backup ok: db-$stamp.sql.gz files-$stamp.tar.gz"
