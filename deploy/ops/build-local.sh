#!/usr/bin/env bash
# =============================================================================
# build-local.sh — 在部署者本机（Windows 的 Git Bash）构建前端发布包
#
# 用法（在仓库根目录或任意目录执行均可）：
#   bash deploy/ops/build-local.sh
#   VERSION=20261126-2300 bash deploy/ops/build-local.sh
#   DRY_RUN=1 bash deploy/ops/build-local.sh     # 只打印将要做什么
#
# 产物：
#   build/release-<版本>/web/     ← blog-web 的 dist 内容
#   build/release-<版本>/admin/   ← blog-admin 的 dist 内容（--base=/admin/）
#   build/release-<版本>.tgz      ← 之后 scp 到服务器 /tmp/release-<版本>.tgz
#
# 注意：本脚本只在本地跑，不连接服务器、不执行 git。
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=deploy/ops/lib.sh
source "$SCRIPT_DIR/lib.sh"

VERSION="${VERSION:-$(date +%Y%m%d-%H%M)}"
assert_valid_version "$VERSION"

OUT_ROOT="$REPO_ROOT/build"
OUT_DIR="$OUT_ROOT/release-$VERSION"
TARBALL="$OUT_ROOT/release-$VERSION.tgz"

# ---------------------------------------------------------------------------
# 前置检查
# ---------------------------------------------------------------------------
if command -v pnpm >/dev/null 2>&1; then
  PNPM=(pnpm)
elif command -v pnpm.cmd >/dev/null 2>&1; then
  # Windows Git Bash 下 corepack 提供的入口有时只暴露 pnpm.cmd
  PNPM=(pnpm.cmd)
else
  die "找不到 pnpm" \
    "在 Git Bash 中安装/启用 pnpm（Node >= 22）：corepack enable && corepack prepare pnpm@latest --activate；或 npm i -g pnpm"
fi

log "仓库根目录：$REPO_ROOT"
log "版本号：$VERSION"
log "输出目录：$OUT_DIR"
log "发布包：$TARBALL"

if [[ -e "$OUT_DIR" || -e "$TARBALL" ]]; then
  die "输出已存在：$OUT_DIR 或 $TARBALL" \
    "换一个版本号（VERSION=<YYYYMMDD-HHMM>）后重试，或先手动清理 build/ 下的同名产物"
fi

if is_dry_run; then
  log "[DRY_RUN] 将执行："
  log "  ${PNPM[*]} -C blog-web build"
  log "  ${PNPM[*]} -C blog-admin build --base=/admin/"
  log "  收集 blog-web/dist → $OUT_DIR/web"
  log "  收集 blog-admin/dist → $OUT_DIR/admin"
  log "  tar czf $TARBALL -C $OUT_DIR web admin"
  exit 0
fi

# ---------------------------------------------------------------------------
# 1. 构建（构建脚本内部自带类型/语法检查：blog-web/scripts/check.cjs）
# ---------------------------------------------------------------------------
cd "$REPO_ROOT"

log "开始构建 blog-web（base=/）……"
run "${PNPM[@]}" -C blog-web build

log "开始构建 blog-admin（base=/admin/）……"
run "${PNPM[@]}" -C blog-admin build --base=/admin/

[[ -f "blog-web/dist/index.html" ]] || die "blog-web 构建产物缺失：blog-web/dist/index.html" \
  "检查 blog-web 构建日志；确认 pnpm -C blog-web build 成功退出"
[[ -f "blog-admin/dist/index.html" ]] || die "blog-admin 构建产物缺失：blog-admin/dist/index.html" \
  "检查 blog-admin 构建日志；确认 pnpm -C blog-admin build --base=/admin/ 成功退出"

# 后台必须带 /admin/ base，否则部署到 /admin/ 后资源 404
if ! grep -q '/admin/assets/' "blog-admin/dist/index.html"; then
  die "blog-admin 产物未带 /admin/ base（index.html 中没有 /admin/assets/ 引用）" \
    "用 pnpm -C blog-admin build --base=/admin/ 重新构建；不要在 blog-admin 目录直接 vite build"
fi

# ---------------------------------------------------------------------------
# 2. 收进 release 目录
# ---------------------------------------------------------------------------
mkdir -p "$OUT_DIR/web" "$OUT_DIR/admin"
cp -a "blog-web/dist/." "$OUT_DIR/web/"
cp -a "blog-admin/dist/." "$OUT_DIR/admin/"

log "web 产物：$(du -sh "$OUT_DIR/web" | cut -f1)"
log "admin 产物：$(du -sh "$OUT_DIR/admin" | cut -f1)"

# ---------------------------------------------------------------------------
# 3. 打包
# ---------------------------------------------------------------------------
tar czf "$TARBALL" -C "$OUT_DIR" web admin

[[ -f "$TARBALL" ]] || die "打包失败：$TARBALL 不存在" "检查 build/ 目录权限与磁盘空间"

SIZE="$(human_size "$TARBALL")"
SHA="$(sha256sum "$TARBALL" | cut -d' ' -f1)"

cat >&2 <<EOF
--------------------------------------------------------------------------
构建完成
  发布包：$TARBALL
  体积：  $SIZE
  SHA256：$SHA

下一步（在 Git Bash 中执行，替换为你的 SSH 用户/密钥）：
  1) scp "$TARBALL" ubuntu@43.143.72.12:/tmp/release-$VERSION.tgz
  2) ssh ubuntu@43.143.72.12
     sudo bash /var/www/luna-blog/src/deploy/ops/release.sh $VERSION

发布后验证：
  curl -I  http://43.143.72.12/
  curl -s  http://43.143.72.12/api/health
  # 后台仅允许本机，需先建 SSH 隧道：
  # ssh -L 8080:127.0.0.1:80 ubuntu@43.143.72.12
  # 然后浏览器打开 http://127.0.0.1:8080/admin/
--------------------------------------------------------------------------
EOF
