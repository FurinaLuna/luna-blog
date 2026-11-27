#!/usr/bin/env bash
# =============================================================================
# docker-deploy.sh — 在服务器上用 Docker Compose 构建并启动/更新整套服务
#
# 用法（服务器上，root 或 sudo）：
#   sudo bash /var/www/luna-blog/src/deploy/ops/docker-deploy.sh
#   sudo bash /var/www/luna-blog/src/deploy/ops/docker-deploy.sh --no-build   # 只重启
#
# 前提：
#   * /var/www/luna-blog/api.env   （后端环境变量，见 docker/api.env.example）
#   * /var/www/luna-blog/compose.env（compose 插值：MYSQL_ROOT_PASSWORD、DB_PASSWORD）
#   * /var/www/luna-blog/src        仓库源码（compose build context）
#
# 说明：
#   * 首次启动会构建 api/web 两个镜像，耗时取决于服务器网络（拉基础镜像 + pnpm 依赖）
#   * 构建失败不会影响正在运行的旧容器（compose 是「先建新，再切」）
# =============================================================================
set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-/var/www/luna-blog}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1/api/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"

BUILD_FLAG="--build"
for arg in "$@"; do
  case "$arg" in
    --no-build) BUILD_FLAG="" ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      echo "未知参数：$arg（可用：--no-build）" >&2
      exit 2
      ;;
  esac
done

log() { printf '\n\033[1;36m[%s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"; }
die() { printf '\n\033[1;31m[失败]\033[0m %s\n' "$*" >&2; exit 1; }

[[ -d "$COMPOSE_DIR" ]] || die "目录不存在：$COMPOSE_DIR"
[[ -f "$COMPOSE_DIR/docker-compose.yml" ]] || die "缺少 $COMPOSE_DIR/docker-compose.yml"
[[ -f "$COMPOSE_DIR/api.env" ]] || die "缺少 $COMPOSE_DIR/api.env（参考 docker/api.env.example）"
[[ -f "$COMPOSE_DIR/compose.env" ]] || die "缺少 $COMPOSE_DIR/compose.env（MYSQL_ROOT_PASSWORD / DB_PASSWORD）"

cd "$COMPOSE_DIR"

log "构建并启动容器（$COMPOSE_DIR）"
if [[ -n "$BUILD_FLAG" ]]; then
  docker compose --env-file compose.env up -d --build --remove-orphans
else
  docker compose --env-file compose.env up -d --remove-orphans
fi

log "等待健康检查：$HEALTH_URL（最长 ${HEALTH_TIMEOUT}s）"
deadline=$(( $(date +%s) + HEALTH_TIMEOUT ))
while :; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" 2>/dev/null || true)"
  if [[ "$code" == "200" ]]; then
    log "健康检查通过（HTTP $code）"
    break
  fi
  if (( $(date +%s) >= deadline )); then
    echo
    echo "--- docker compose ps ---"
    docker compose ps || true
    echo "--- api 最近 50 行日志 ---"
    docker compose logs --tail 50 api || true
    die "健康检查超时（最后一次 HTTP $code）"
  fi
  sleep 2
done

log "容器状态"
docker compose ps

log "完成。后台经 SSH 隧道访问：ssh -N -L 8080:127.0.0.1:8080 ubuntu@<服务器>，浏览器打开 http://127.0.0.1:8080/admin/"
