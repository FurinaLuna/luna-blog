#!/usr/bin/env bash
# =============================================================================
# backend-release.sh — 在服务器上更新后端代码（Node.js / blog-server）
#
# 用法（服务器上执行）：
#   # A. 源码已在服务器某目录（例如 scp 上来的 /tmp/blog-server）：
#   sudo bash deploy/ops/backend-release.sh /tmp/blog-server
#
#   # B. 按版本从 releases/<版本>/server 取源码（若你的发布包含后端源码）：
#   sudo bash deploy/ops/backend-release.sh 20261126-2244
#   sudo bash deploy/ops/backend-release.sh 20261126-2244 /tmp/blog-server   # 显式指定源码目录
#
#   # C. 直接在现有 src/blog-server 上安装 + 自检 + 重启（已手工 rsync 过时用）：
#   sudo bash deploy/ops/backend-release.sh --local-src
#
# 流程：rsync 源码 → chown deploy:deploy → pnpm install --prod --frozen-lockfile
#       → 以 luna-blog 身份跑 scripts/check.js 语法自检（deploy 读不了 .env）
#       → systemctl restart luna-blog → 健康检查（失败自动打印状态与日志）
#
# 可选环境变量：
#   SKIP_CHECK=1   跳过语法自检（仅限紧急排障，不建议）
#   DRY_RUN=1      只打印将要执行的命令
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/ops/lib.sh
source "$SCRIPT_DIR/lib.sh"

usage() {
  cat >&2 <<'EOF'
用法：
  backend-release.sh <源码目录>              # 用该目录的内容覆盖 src/blog-server
  backend-release.sh <版本> [源码目录]       # 源码默认取 releases/<版本>/server
  backend-release.sh --local-src             # 不动源码，只 install + 自检 + 重启

可选环境变量：
  SKIP_CHECK=1   跳过 scripts/check.js 语法自检（紧急用）
  DRY_RUN=1      只打印将要执行的命令
EOF
  exit 2
}

[[ $# -ge 1 ]] || usage

MODE=""
VERSION=""
SRC_REF=""

if [[ "$1" == "--local-src" ]]; then
  MODE="local"
  SRC_REF="$BACKEND_DIR"
elif [[ -d "$1" ]]; then
  MODE="dir"
  SRC_REF="$1"
else
  MODE="version"
  VERSION="$1"
  assert_valid_version "$VERSION"
  SRC_REF="${2:-$RELEASES_DIR/$VERSION/server}"
fi

# 源码合法性：必须是 blog-server 包（package.json + src/server.js）
check_source_layout() {
  local dir="$1"
  [[ -f "$dir/package.json" ]] || die "源码目录缺少 package.json：$dir" \
    "确认传入的是 blog-server 源码根目录（其下应有 package.json、src/server.js、scripts/check.js）"
  [[ -f "$dir/src/server.js" ]] || die "源码目录缺少 src/server.js：$dir" \
    "确认传入路径指向 blog-server 根目录，而不是它的上级仓库根目录"
}

case "$MODE" in
  local)
    check_source_layout "$SRC_REF"
    log "模式：--local-src（不 rsync，直接使用 $BACKEND_DIR）"
    ;;
  dir)
    check_source_layout "$SRC_REF"
    log "模式：从源码目录 $SRC_REF 同步到 $BACKEND_DIR"
    ;;
  version)
    [[ -d "$SRC_REF" ]] || die "找不到版本源码目录：$SRC_REF" \
      "把后端源码放到 $SRC_REF（需含 package.json 与 src/server.js），或直接传源码目录：backend-release.sh <源码目录>"
    check_source_layout "$SRC_REF"
    log "模式：版本 $VERSION，源码 $SRC_REF"
    ;;
esac

# ---------------------------------------------------------------------------
# 前置检查
# ---------------------------------------------------------------------------
require_cmd rsync "sudo apt-get install -y rsync"
NODE_BIN="$(command -v node || true)"
[[ -n "$NODE_BIN" ]] || die "找不到 node" "确认 Node 24 已安装：/usr/bin/node -v"

NODE_MAJOR="$("$NODE_BIN" -v | sed 's/^v//' | cut -d. -f1)"
[[ "$NODE_MAJOR" =~ ^[0-9]+$ ]] || die "无法解析 node 版本：$("$NODE_BIN" -v)" "检查 /usr/bin/node 是否正常"
if ((NODE_MAJOR < 22)); then
  die "Node 版本过低：$("$NODE_BIN" -v)（blog-server 要求 >= 22.12）" \
    "安装 Node 24：见 docs/ops/RUNBOOK.md「首次部署 / Node.js」"
fi

# 运行期依赖 .env：必须对 luna-blog 可读（deploy 读不了属正常，属主 root:luna-blog 640）
if [[ -f "$BACKEND_DIR/.env" ]]; then
  if ! sudo -u luna-blog test -r "$BACKEND_DIR/.env"; then
    die "luna-blog 用户读不到 $BACKEND_DIR/.env" \
      "修正：sudo chown root:luna-blog $BACKEND_DIR/.env && sudo chmod 640 $BACKEND_DIR/.env"
  fi
else
  warn "$BACKEND_DIR/.env 不存在——若后端尚未首次部署，请先按 RUNBOOK 创建 .env"
fi

# ---------------------------------------------------------------------------
# DRY_RUN 预览
# ---------------------------------------------------------------------------
if is_dry_run; then
  cat >&2 <<EOF
[DRY_RUN] 将执行：
$( [[ "$MODE" != "local" ]] && printf '  sudo rsync -a --delete --exclude node_modules --exclude .env --exclude uploads %s/ %s/\n' "$SRC_REF" "$BACKEND_DIR" )
  sudo chown -R deploy:deploy $SRC_DIR
  sudo -u deploy env HOME=/home/deploy <pnpm> -C $BACKEND_DIR install --prod --frozen-lockfile
  sudo -u luna-blog env HOME=/tmp $NODE_BIN $BACKEND_DIR/scripts/check.js
  sudo systemctl restart $SERVICE
  wait_for_health 30
EOF
  exit 0
fi

if [[ "${EUID}" -ne 0 ]]; then
  require_cmd sudo "需要 sudo 权限：服务器上 deploy 账号已配置 NOPASSWD"
  sudo -n true 2>/dev/null || die "当前账号无法免密 sudo" "用有 sudo 权限的账号执行"
fi

on_error() {
  local code=$?
  printf '\n' >&2
  warn "backend-release.sh 执行失败（退出码 $code）"
  warn "--- systemctl status $SERVICE ---"
  sudo systemctl status "$SERVICE" --no-pager -l 2>&1 | tail -n 40 >&2 || true
  warn "--- journalctl -u $SERVICE -n 80 ---"
  sudo journalctl -u "$SERVICE" -n 80 --no-pager 2>&1 | tail -n 80 >&2 || true
  warn "排查提示：常见原因是 .env 缺失/权限不对、MySQL 连不上、pnpm install 失败。"
  warn "如需回到上一份代码，重新执行 backend-release.sh <上一版源码目录> 并重启服务。"
  exit "$code"
}
trap on_error ERR

# ---------------------------------------------------------------------------
# 1. 同步源码（保留 node_modules 与 .env）
# ---------------------------------------------------------------------------
if [[ "$MODE" != "local" ]]; then
  log "rsync $SRC_REF/ → $BACKEND_DIR/"
  sudo rsync -a --delete \
    --exclude node_modules \
    --exclude .env \
    --exclude uploads \
    --exclude '*.log' \
    "$SRC_REF"/ "$BACKEND_DIR"/
  sudo chown -R deploy:deploy "$SRC_DIR"
  log "源码同步完成"
fi

# ---------------------------------------------------------------------------
# 2. 安装生产依赖（以 deploy 身份，避免 node_modules 属主变成 root）
# ---------------------------------------------------------------------------
PNPM_BIN="${PNPM_BIN:-}"
if [[ -z "$PNPM_BIN" ]]; then
  PNPM_BIN="$(sudo -u deploy bash -lc 'command -v pnpm' 2>/dev/null || true)"
fi
[[ -n "$PNPM_BIN" ]] || die "deploy 用户找不到 pnpm" \
  "以 deploy 身份启用 corepack：sudo -u deploy -H bash -lc 'corepack enable && corepack prepare pnpm@latest --activate'；或 sudo npm i -g pnpm"

log "pnpm install --prod --frozen-lockfile（$PNPM_BIN）……"
sudo -u deploy env \
  HOME=/home/deploy \
  PATH="$(dirname "$PNPM_BIN"):/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
  "$PNPM_BIN" -C "$BACKEND_DIR" install --prod --frozen-lockfile

# ---------------------------------------------------------------------------
# 3. 语法自检：必须以 luna-blog 身份运行（配置模块会读 .env）
# ---------------------------------------------------------------------------
if [[ "${SKIP_CHECK:-0}" == "1" ]]; then
  warn "SKIP_CHECK=1：已跳过 scripts/check.js 语法自检（仅限紧急排障，请尽快补检）"
else
  [[ -f "$BACKEND_DIR/scripts/check.js" ]] || die "缺少自检脚本：$BACKEND_DIR/scripts/check.js" \
    "源码不完整；确认 rsync 来源包含 scripts/ 目录"
  log "语法自检：sudo -u luna-blog env HOME=/tmp $NODE_BIN $BACKEND_DIR/scripts/check.js"
  sudo -u luna-blog env HOME=/tmp "$NODE_BIN" "$BACKEND_DIR/scripts/check.js"
fi

# ---------------------------------------------------------------------------
# 4. 重启并做健康检查
# ---------------------------------------------------------------------------
log "重启 $SERVICE ……"
sudo systemctl restart "$SERVICE"

if ! wait_for_health 30; then
  die "重启后健康检查失败：$HEALTH_URL" \
    "查看：sudo systemctl status $SERVICE --no-pager；sudo journalctl -u $SERVICE -n 80 --no-pager"
fi

# 确认服务确实处于 active
if ! systemctl is-active --quiet "$SERVICE"; then
  die "服务 $SERVICE 未处于 active 状态" "sudo systemctl status $SERVICE --no-pager"
fi

trap - ERR
cat >&2 <<EOF
--------------------------------------------------------------------------
后端更新完成
  源码：${SRC_REF}
  自检：$( [[ "${SKIP_CHECK:-0}" == "1" ]] && echo '已跳过（SKIP_CHECK=1）' || echo '通过' )
  服务：$(systemctl is-active "$SERVICE")
  健康：$HEALTH_URL 通过

后续建议：
  sudo journalctl -u $SERVICE -f          # 观察运行日志
  sudo systemctl status $SERVICE --no-pager
--------------------------------------------------------------------------
EOF
