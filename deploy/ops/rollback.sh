#!/usr/bin/env bash
# =============================================================================
# rollback.sh — 把 current 软链切回某个已发布版本
#
# 用法（服务器上执行）：
#   bash deploy/ops/rollback.sh                 # 只列出可用版本（不切换）
#   sudo bash deploy/ops/rollback.sh 20261125-2130
#   DRY_RUN=1 bash deploy/ops/rollback.sh 20261125-2130
#
# 说明：这只回滚**前端静态产物**（web/admin）。后端代码回滚请用
#       backend-release.sh 指向上一份源码目录重新部署。
# 每次切换都会在 releases/ROLLBACK.log 追加一行：
#   ROLLBACK at 2026-11-26T22:50:00+08:00 to 20261125-2130
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/ops/lib.sh
source "$SCRIPT_DIR/lib.sh"

ROLLBACK_LOG="$RELEASES_DIR/ROLLBACK.log"
CURRENT="$(current_release)"

# ---------------------------------------------------------------------------
# 无参数：列出可用版本
# ---------------------------------------------------------------------------
if [[ $# -eq 0 ]]; then
  mapfile -t ALL_RELEASES < <(list_releases)
  if [[ ${#ALL_RELEASES[@]} -eq 0 ]]; then
    die "没有任何已发布版本：$RELEASES_DIR" \
      "先按 docs/ops/RUNBOOK.md 完成一次发布（build-local.sh → scp → release.sh）"
  fi
  printf '可回滚的版本（最新在前）：\n\n'
  printf '  %-20s %-10s %s\n' '版本' '体积' '说明'
  for dir in "${ALL_RELEASES[@]}"; do
    name="$(basename "$dir")"
    marker=""
    if [[ -n "$CURRENT" && "$dir" == "$CURRENT" ]]; then
      marker="  ← 当前"
    fi
    printf '  %-20s %-10s%s\n' "$name" "$(human_size "$dir" 2>/dev/null || echo '?')" "$marker"
  done
  if [[ -f "$ROLLBACK_LOG" ]]; then
    printf '\n最近回滚记录（%s）：\n' "$ROLLBACK_LOG"
    tail -n 10 "$ROLLBACK_LOG" | sed 's/^/  /'
  fi
  printf '\n用法：sudo bash %s <版本>\n' "$0"
  exit 0
fi

if [[ $# -ne 1 || "$1" == "-h" || "$1" == "--help" ]]; then
  die "参数错误" "用法：rollback.sh <版本>（不带参数可列出可用版本）"
fi

TARGET_VERSION="$1"
assert_valid_version "$TARGET_VERSION"
TARGET_DIR="$RELEASES_DIR/$TARGET_VERSION"

# ---------------------------------------------------------------------------
# 校验目标版本
# ---------------------------------------------------------------------------
[[ -d "$TARGET_DIR" ]] || die "版本目录不存在：$TARGET_DIR" \
  "先运行不带参数的 rollback.sh 查看可用版本"
[[ -f "$TARGET_DIR/web/index.html" ]] || die "目标版本缺少 web/index.html：$TARGET_DIR" \
  "该版本目录不完整（可能上次部署中断），请换一个版本"
[[ -f "$TARGET_DIR/admin/index.html" ]] || warn "目标版本缺少 admin/index.html：$TARGET_DIR" \
  "后台页面可能不可用；如不重要可继续"

if [[ -n "$CURRENT" && "$(readlink -f "$CURRENT")" == "$(readlink -f "$TARGET_DIR")" ]]; then
  die "$TARGET_VERSION 已经是当前版本，无需回滚" "选择其它版本：bash $0"
fi

require_cmd nginx "sudo apt-get install -y nginx"

if [[ "${EUID}" -ne 0 ]]; then
  require_cmd sudo "需要 sudo 权限（切软链、reload nginx）"
  sudo -n true 2>/dev/null || die "当前账号无法免密 sudo" "用有 sudo 权限的账号（ubuntu / deploy）执行"
fi

log "回滚到：$TARGET_VERSION"
log "回滚前 current：${CURRENT:-（无）}"

if is_dry_run; then
  log "[DRY_RUN] 将执行："
  log "  sudo nginx -t"
  log "  sudo ln -sfn $TARGET_DIR $CURRENT_LINK"
  log "  sudo systemctl reload nginx"
  log "  wait_for_health 30"
  log "  sudo tee -a $ROLLBACK_LOG <<< \"ROLLBACK at \$(date -Iseconds) to $TARGET_VERSION\""
  exit 0
fi

on_error() {
  local code=$?
  printf '\n' >&2
  warn "rollback.sh 执行失败（退出码 $code）"
  warn "当前 current 指向：$(current_release)"
  warn "如站点不可用，可再切回任意版本：sudo bash $0 <版本>"
  exit "$code"
}
trap on_error ERR

# ---------------------------------------------------------------------------
# 切换
# ---------------------------------------------------------------------------
log "校验 nginx 配置……"
sudo nginx -t

log "切换 current → $TARGET_DIR"
sudo ln -sfn "$TARGET_DIR" "$CURRENT_LINK"

log "reload nginx……"
sudo systemctl reload nginx

if ! wait_for_health 30; then
  die "回滚后健康检查失败：$HEALTH_URL" \
    "前端回滚通常不影响后端；若同时改过后端，请检查 sudo systemctl status $SERVICE --no-pager 与 sudo journalctl -u $SERVICE -n 80 --no-pager"
fi

# ---------------------------------------------------------------------------
# 记录回滚日志（releases/ 属 deploy:deploy，root 与 deploy 均可写）
# ---------------------------------------------------------------------------
LOG_LINE="ROLLBACK at $(date -Iseconds) to $TARGET_VERSION"
if [[ -w "$RELEASES_DIR" ]]; then
  printf '%s\n' "$LOG_LINE" >>"$ROLLBACK_LOG"
else
  printf '%s\n' "$LOG_LINE" | sudo tee -a "$ROLLBACK_LOG" >/dev/null
fi
log "已记录：$LOG_LINE"

trap - ERR
cat >&2 <<EOF
--------------------------------------------------------------------------
回滚完成
  current → $(current_release)
  健康检查：$HEALTH_URL 通过
  记录文件：$ROLLBACK_LOG

验证：
  curl -I http://43.143.72.12/
  curl -s http://43.143.72.12/api/health
  # 后台需 SSH 隧道：ssh -L 8080:127.0.0.1:80 ubuntu@43.143.72.12
  #                 浏览器打开 http://127.0.0.1:8080/admin/
--------------------------------------------------------------------------
EOF
