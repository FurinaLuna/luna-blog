#!/usr/bin/env bash
# =============================================================================
# healthcheck-docker.sh - health probe for the Docker stack.
#   Probe http://127.0.0.1/api/health three times (5s apart). On persistent
#   failure, recreate the api + web containers and log the outcome.
#   Installed as /var/www/luna-blog/src/deploy/ops/healthcheck-docker.sh and
#   invoked by luna-blog-healthcheck-docker.timer every minute.
# =============================================================================
set -euo pipefail

ROOT=/var/www/luna-blog
OPS="$ROOT/src/deploy/ops"
LOG_TAG=luna-blog-healthcheck-docker
HEALTH_URL=http://127.0.0.1/api/health
ATTEMPTS=3

log() { logger -t "$LOG_TAG" -- "$*"; echo "$(date '+%F %T') $*"; }
warn() { logger -t "$LOG_TAG" -p user.warning -- "$*"; echo "$(date '+%F %T') WARN $*" >&2; }

die() {
  warn "$1"
  exit 1
}

compose() {
  docker compose -f "$ROOT/docker-compose.yml" \
    --env-file "$ROOT/compose.env" --env-file "$ROOT/images.env" "$@"
}

probe() {
  curl -fsS --max-time 8 "$HEALTH_URL" 2>/dev/null | grep -q '"code":0'
}

ok=0
for i in $(seq 1 "$ATTEMPTS"); do
  if probe; then
    ok=1
    break
  fi
  [[ $i -lt $ATTEMPTS ]] && sleep 5
done

if [[ $ok -eq 1 ]]; then
  exit 0
fi

warn "健康检查连续 ${ATTEMPTS} 次失败，重启 api/web 容器"
if ! compose restart api web >>/dev/null 2>&1; then
  die "重启容器失败，请检查 docker.service 与 compose 文件"
fi

sleep 10
if probe; then
  log "重启后恢复"
  exit 0
fi

die "重启后仍不健康：$HEALTH_URL"
