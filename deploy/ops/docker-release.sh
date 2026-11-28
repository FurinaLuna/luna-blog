#!/usr/bin/env bash
# =============================================================================
# docker-release.sh - switch the Docker stack to a given image tag
#
# Usage (on the server, as root):
#   sudo bash /var/www/luna-blog/src/deploy/ops/docker-release.sh <tag>
#
# Behaviour:
#   1. write images.env (API_IMAGE / WEB_IMAGE) for the given tag
#   2. docker compose pull api web
#   3. docker compose up -d api web
#   4. wait for /api/health; on failure restore the previous images.env
#
# Registry: ghcr.io, images must be pulled after `docker login ghcr.io`.
# Everything is atomic per service: if `up -d` fails, previous tag is restored.
# =============================================================================
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/luna-blog}"
TAG="${1:-}"
REGISTRY_OWNER="${REGISTRY_OWNER:-furinaluna}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1/api/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"

if [[ -z "$TAG" ]]; then
  echo "usage: $0 <tag>" >&2
  exit 2
fi
if [[ ! "$TAG" =~ ^[0-9A-Za-z._-]+$ ]]; then
  echo "invalid tag: $TAG" >&2
  exit 2
fi

cd "$APP_ROOT"

COMPOSE_ENV="compose.env"
IMAGES_ENV="images.env"

api_image="ghcr.io/${REGISTRY_OWNER}/luna-blog-api:${TAG}"
web_image="ghcr.io/${REGISTRY_OWNER}/luna-blog-web:${TAG}"

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*" >&2; }

prev_images="$(cat "$IMAGES_ENV" 2>/dev/null || true)"

restore_prev() {
  if [[ -n "$prev_images" ]]; then
    log "rolling back images.env to previous tag set"
    printf '%s\n' "$prev_images" > "$IMAGES_ENV"
    docker compose --env-file "$COMPOSE_ENV" --env-file "$IMAGES_ENV" up -d api web || true
  fi
}

cleanup_on_error() {
  local code=$?
  if (( code != 0 )); then
    log "release failed (exit $code)"
    restore_prev
  fi
  rm -f "$IMAGES_ENV.tmp"
}
trap cleanup_on_error EXIT

cat > "$IMAGES_ENV.tmp" <<EOF
API_IMAGE=${api_image}
WEB_IMAGE=${web_image}
EOF
mv "$IMAGES_ENV.tmp" "$IMAGES_ENV"

log "pulling: $api_image / $web_image"
# GHCR may answer 403/denied for a freshly pushed tag while the package version
# is still being propagated, so retry the pull with backoff before giving up.
pull_attempt=1
pull_max=6
until docker compose --env-file "$COMPOSE_ENV" --env-file "$IMAGES_ENV" pull api web; do
  if (( pull_attempt >= pull_max )); then
    log "docker compose pull failed after ${pull_attempt} attempts (registry auth or propagation?)"
    exit 1
  fi
  delay=$(( pull_attempt * 10 ))
  log "pull failed (attempt ${pull_attempt}/${pull_max}); retrying in ${delay}s"
  sleep "$delay"
  pull_attempt=$(( pull_attempt + 1 ))
done
log "images pulled (tag $TAG)"

log "recreating api + web"
docker compose --env-file "$COMPOSE_ENV" --env-file "$IMAGES_ENV" up -d api web

log "waiting for health: $HEALTH_URL"
waited=0
while (( waited < HEALTH_TIMEOUT )); do
  if curl -fsS --max-time 3 -o /dev/null "$HEALTH_URL" 2>/dev/null; then
    log "health OK after ${waited}s (tag $TAG)"
    trap - EXIT
    exit 0
  fi
  sleep 2
  waited=$((waited + 2))
done

log "health check timed out after ${HEALTH_TIMEOUT}s"
exit 1
