#!/usr/bin/env bash
# =============================================================================
# backup-docker.sh - daily backup for the Docker stack
#
# Dumps MySQL from the `db` container and tars the host uploads directory.
#
# Usage (server, root):
#   sudo bash /var/www/luna-blog/src/deploy/ops/backup-docker.sh
#   DRY_RUN=1 bash deploy/ops/backup-docker.sh
#
# Output (BACKUP_DIR, default /var/www/luna-blog/backups):
#   db-<YYYYmmdd-HHMMSS>.sql.gz
#   uploads-<YYYYmmdd-HHMMSS>.tar.gz
#   SHA256SUMS
#
# Secrets are read from compose.env / api.env (no host MySQL client needed).
# =============================================================================
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/luna-blog}"
BACKUP_DIR="${BACKUP_DIR:-$APP_ROOT/backups}"
UPLOAD_DIR="${UPLOAD_DIR:-$APP_ROOT/data/uploads}"
COMPOSE_ENV="${COMPOSE_ENV:-$APP_ROOT/compose.env}"
API_ENV="${API_ENV:-$APP_ROOT/api.env}"
KEEP_DAYS="${KEEP_DAYS:-7}"
KEEP_WEEKS="${KEEP_WEEKS:-4}"

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*" >&2; }
die() { log "[ERROR] $*"; exit 1; }

is_dry_run() {
  case "${DRY_RUN:-0}" in 1|true|TRUE|yes|YES) return 0 ;; *) return 1 ;; esac
}

# Read KEY from a KEY=VALUE env file (no side effects).
env_value() {
  local file="$1" key="$2"
  awk -v key="$key" '
    { line = $0; sub(/\r$/, "", line); p = index(line, "=")
      if (p == 0) next
      k = substr(line, 1, p - 1); gsub(/^[ \t]+|[ \t]+$/, "", k)
      if (k != key) next
      v = substr(line, p + 1); sub(/\r$/, "", v); print v; exit }' "$file"
}

DB_NAME="$(env_value "$API_ENV" DB_NAME || true)"
DB_NAME="${DB_NAME:-$(env_value "$COMPOSE_ENV" DB_NAME || true)}"
DB_USER="$(env_value "$API_ENV" DB_USER || true)"
DB_USER="${DB_USER:-$(env_value "$COMPOSE_ENV" DB_USER || true)}"
DB_PASS="$(env_value "$API_ENV" DB_PASSWORD || true)"
DB_PASS="${DB_PASS:-$(env_value "$COMPOSE_ENV" DB_PASSWORD || true)}"
DB_NAME="${DB_NAME:-luna_blog}"
DB_USER="${DB_USER:-luna_blog}"

TS="$(date +%Y%m%d-%H%M%S)"
DOW="$(date +%u)"
SHA256SUMS="$BACKUP_DIR/SHA256SUMS"
LOCK_FILE="$BACKUP_DIR/.backup.lock"

if is_dry_run; then
  cat >&2 <<EOF
[DRY_RUN] docker backup plan:
  database: ${DB_NAME} (user ${DB_USER}) via container db
  -> $BACKUP_DIR/db-$TS.sql.gz
  uploads: $UPLOAD_DIR -> $BACKUP_DIR/uploads-$TS.tar.gz
  prune: daily keep ${KEEP_DAYS}d, weekly keep ${KEEP_WEEKS}
EOF
  exit 0
fi

if [[ "${EUID}" -ne 0 ]]; then
  log "not root, re-executing with sudo"
  exec sudo -E env "DRY_RUN=${DRY_RUN:-0}" bash "$0" "$@"
fi

[[ -n "$DB_PASS" ]] || die "DB_PASSWORD not found in $API_ENV or $COMPOSE_ENV"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "another backup is running, skipping"
  exit 0
fi

DB_FILE="$BACKUP_DIR/db-$TS.sql.gz"
UPLOADS_FILE="$BACKUP_DIR/uploads-$TS.tar.gz"
DB_PARTIAL="$DB_FILE.partial"
UPLOADS_PARTIAL="$UPLOADS_FILE.partial"

cleanup() {
  local code=$?
  rm -f "$DB_PARTIAL" "$UPLOADS_PARTIAL"
  if (( code != 0 )); then
    log "backup failed (exit $code), partial files removed"
  fi
}
trap cleanup EXIT

export MYSQL_PWD="$DB_PASS"

# Compose needs the project file even when only `exec` is used (systemd runs
# with cwd=/), so pin the compose file explicitly.
COMPOSE_FILE="$APP_ROOT/docker-compose.yml"
[[ -f "$COMPOSE_FILE" ]] || die "compose file not found: $COMPOSE_FILE"
compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" "$@"
}

log "dump database $DB_NAME from container"
if ! compose exec -T db \
  sh -c 'exec mysqldump --single-transaction --routines --triggers --default-character-set=utf8mb4 -u"$0" "$1"' \
  "$DB_USER" "$DB_NAME" 2>"$BACKUP_DIR/.mysqldump.err" | gzip -9 >"$DB_PARTIAL"; then
  log "mysqldump failed:"
  sed 's/^/  /' "$BACKUP_DIR/.mysqldump.err" >&2 || true
  die "database backup failed"
fi
rm -f "$BACKUP_DIR/.mysqldump.err"

[[ -s "$DB_PARTIAL" ]] || die "database backup is empty"
gzip -t "$DB_PARTIAL" || die "database backup failed gzip test"
mv "$DB_PARTIAL" "$DB_FILE"

log "tar uploads -> $UPLOADS_FILE"
tar czf "$UPLOADS_PARTIAL" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
[[ -s "$UPLOADS_PARTIAL" ]] || die "uploads backup is empty"
mv "$UPLOADS_PARTIAL" "$UPLOADS_FILE"

(
  cd "$BACKUP_DIR"
  sha256sum "db-$TS.sql.gz" "uploads-$TS.tar.gz" >>"$SHA256SUMS"
)
log "sha256 appended to $SHA256SUMS"

if [[ "$DOW" == "7" ]]; then
  ln -f "$DB_FILE" "$BACKUP_DIR/db-$TS-weekly.sql.gz"
  ln -f "$UPLOADS_FILE" "$BACKUP_DIR/uploads-$TS-weekly.tar.gz"
  log "weekly hardlinks created"
fi

# prune daily backups older than KEEP_DAYS
while IFS= read -r old; do
  base="$(basename "$old")"
  stamp="${base#db-}"; stamp="${stamp%.sql.gz}"
  rm -f "$BACKUP_DIR/db-$stamp.sql.gz" "$BACKUP_DIR/uploads-$stamp.tar.gz"
  log "removed daily backup $stamp"
done < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db-*.sql.gz' \
  ! -name '*-weekly.sql.gz' -mtime "+$KEEP_DAYS" -print | sort)

# prune weekly backups beyond KEEP_WEEKS
mapfile -t WEEKLY_DBS < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db-*-weekly.sql.gz' \
  -printf '%T@ %p\n' | sort -rn | cut -d' ' -f2-)
for i in "${!WEEKLY_DBS[@]}"; do
  if (( i >= KEEP_WEEKS )); then
    name="$(basename "${WEEKLY_DBS[$i]}")"
    stamp="${name#db-}"; stamp="${stamp%-weekly.sql.gz}"
    rm -f "$BACKUP_DIR/db-$stamp-weekly.sql.gz" "$BACKUP_DIR/uploads-$stamp-weekly.tar.gz"
    log "removed weekly backup $stamp"
  fi
done

if [[ -f "$SHA256SUMS" ]]; then
  tmp_sum="$(mktemp)"
  while IFS= read -r line; do
    f="${line#*  }"
    [[ -f "$BACKUP_DIR/$f" ]] && printf '%s\n' "$line" >>"$tmp_sum"
  done <"$SHA256SUMS"
  mv "$tmp_sum" "$SHA256SUMS"
  chmod 600 "$SHA256SUMS"
fi

unset MYSQL_PWD
trap - EXIT

DB_SIZE="$(du -sh "$DB_FILE" 2>/dev/null | cut -f1)"
UP_SIZE="$(du -sh "$UPLOADS_FILE" 2>/dev/null | cut -f1)"
TOTAL_SIZE="$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"

cat >&2 <<EOF
--------------------------------------------------------------------------
backup done
  database: $DB_FILE ($DB_SIZE)
  uploads : $UPLOADS_FILE ($UP_SIZE)
  checksums: $SHA256SUMS
  directory: $BACKUP_DIR ($TOTAL_SIZE)
verify: cd $BACKUP_DIR && sha256sum -c SHA256SUMS
--------------------------------------------------------------------------
EOF
