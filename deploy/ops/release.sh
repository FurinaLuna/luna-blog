#!/usr/bin/env bash
# =============================================================================
# release.sh — 在服务器上部署一个新版本的前端静态产物（web + admin）
#
# 前置：本机已执行 deploy/ops/build-local.sh，并把产物 scp 到服务器：
#   scp build/release-<版本>.tgz ubuntu@43.143.72.12:/tmp/release-<版本>.tgz
#
# 用法（服务器上执行，任意带 sudo 的账号）：
#   sudo bash /var/www/luna-blog/src/deploy/ops/release.sh 20261126-2244
#   TARBALL=/tmp/xxx.tgz bash deploy/ops/release.sh 20261126-2244   # 自定义包路径
#   DRY_RUN=1 bash deploy/ops/release.sh 20261126-2244               # 只打印
#   ALLOW_OVERWRITE=1 bash ...                                        # 允许覆盖已存在的版本目录
#
# 流程：校验包 → 解包到 releases/<版本> → chown deploy:deploy →
#       nginx -t → 切 current 软链 → reload nginx → 健康检查 → 清理旧版本
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/ops/lib.sh
source "$SCRIPT_DIR/lib.sh"

usage() {
  cat >&2 <<'EOF'
用法：release.sh <版本>

  <版本> 形如 20261126-2244，对应 /tmp/release-<版本>.tgz

可选环境变量：
  TARBALL=/tmp/xxx.tgz   指定发布包路径（默认 /tmp/release-<版本>.tgz）
  ALLOW_OVERWRITE=1      允许覆盖已存在的 releases/<版本> 目录（默认拒绝）
  DRY_RUN=1              只打印将要执行的命令
  KEEP_RELEASES=5        保留的版本数量
EOF
  exit 2
}

[[ $# -eq 1 && "$1" != "-h" && "$1" != "--help" ]] || usage
VERSION="$1"
assert_valid_version "$VERSION"

TARBALL="${TARBALL:-/tmp/release-$VERSION.tgz}"
RELEASE_DIR="$RELEASES_DIR/$VERSION"
INCOMING_DIR="$RELEASES_DIR/.incoming-$VERSION"
PREVIOUS_RELEASE="$(current_release)"

log "部署版本：$VERSION"
log "发布包：$TARBALL"
log "目标目录：$RELEASE_DIR"
log "当前版本：${PREVIOUS_RELEASE:-（无，首次部署）}"

# ---------------------------------------------------------------------------
# 前置检查
# ---------------------------------------------------------------------------
require_cmd tar "sudo apt-get install -y tar"
require_cmd nginx "sudo apt-get install -y nginx"

if [[ -z "$TARBALL" || ! -f "$TARBALL" ]]; then
  die "发布包不存在：$TARBALL" \
    "本机执行：scp build/release-$VERSION.tgz ubuntu@43.143.72.12:/tmp/release-$VERSION.tgz"
fi

# 发布包最小校验：tar 列表里必须同时有 web/ 与 admin/
# 注意：不要写 `tar -tzf … | grep -q`。grep -q 命中后会立即关闭管道，
# 在 `set -o pipefail` 下 tar 会因 SIGPIPE 退出 141，把本该通过的校验误判为失败。
TAR_LIST="$(tar -tzf "$TARBALL" 2>/dev/null)" \
  || die "发布包损坏或不是 tar.gz：$TARBALL" "重新 scp；确认文件大小非 0（当前 $(human_size "$TARBALL")）"
if ! grep -q '^web/' <<<"$TAR_LIST" || ! grep -q '^admin/' <<<"$TAR_LIST"; then
  die "发布包结构不对：缺少 web/ 或 admin/ 目录" \
    "用 deploy/ops/build-local.sh 重新打包；合格包根目录应同时含 web/ 与 admin/"
fi

if [[ -d "$RELEASE_DIR" && "${ALLOW_OVERWRITE:-0}" != "1" ]]; then
  die "版本目录已存在：$RELEASE_DIR" \
    "换一个版本号重新构建；或确认要覆盖时加 ALLOW_OVERWRITE=1（会先删旧目录，风险自负）"
fi

if is_dry_run; then
  cat >&2 <<EOF
[DRY_RUN] 将执行：
  sudo mkdir -p $RELEASES_DIR
  sudo tar -xzf $TARBALL -C $INCOMING_DIR        # 解包到临时目录
  sudo chown -R deploy:deploy $INCOMING_DIR
  sudo mv $INCOMING_DIR $RELEASE_DIR
  sudo nginx -t
  sudo ln -sfn $RELEASE_DIR $CURRENT_LINK
  sudo systemctl reload nginx
  wait_for_health 30
  # 清理：保留最新 $KEEP_RELEASES 个 releases/<版本> 目录
EOF
  exit 0
fi

# 需要 root 权限（创建 releases 下的目录、切软链、reload nginx）
if [[ "${EUID}" -ne 0 ]]; then
  require_cmd sudo "需要 sudo 权限：服务器上 deploy 账号已配置 NOPASSWD"
  sudo -n true 2>/dev/null || die "当前账号无法免密 sudo" \
    "用有 sudo 权限的账号（ubuntu / deploy）执行；或先 sudo -v 缓存凭据"
fi

# 失败时打印可操作的回滚提示
on_error() {
  local code=$?
  printf '\n' >&2
  warn "release.sh 执行失败（退出码 $code）"
  warn "当前 current 指向：$(current_release)"
  if [[ -n "$PREVIOUS_RELEASE" && -d "$PREVIOUS_RELEASE" ]]; then
    warn "如需回滚到上一个版本，执行："
    warn "  sudo bash $OPS_DIR/rollback.sh $(basename "$PREVIOUS_RELEASE")"
  fi
  warn "排查：sudo systemctl status nginx --no-pager；sudo journalctl -u nginx -n 50 --no-pager"
  exit "$code"
}
trap on_error ERR

# ---------------------------------------------------------------------------
# 1. 解包到临时目录（原子切换，避免半成品目录被当成可用版本）
# ---------------------------------------------------------------------------
if [[ -d "$INCOMING_DIR" ]]; then
  assert_under_app_root "$INCOMING_DIR"
  run sudo rm -rf "$INCOMING_DIR"
fi

run sudo mkdir -p "$RELEASES_DIR" "$INCOMING_DIR"
log "解包 $TARBALL → $INCOMING_DIR"
run sudo tar -xzf "$TARBALL" -C "$INCOMING_DIR"

[[ -f "$INCOMING_DIR/web/index.html" ]] || die "发布包缺少 web/index.html" \
  "本机 check：tar -tzf release-$VERSION.tgz | grep '^web/index.html'；重新构建"
[[ -f "$INCOMING_DIR/admin/index.html" ]] || die "发布包缺少 admin/index.html" \
  "blog-admin 需要用 --base=/admin/ 构建；重新执行 build-local.sh"

if [[ -d "$RELEASE_DIR" && "${ALLOW_OVERWRITE:-0}" = "1" ]]; then
  warn "ALLOW_OVERWRITE=1：删除已存在的 $RELEASE_DIR"
  assert_under_app_root "$RELEASE_DIR"
  run sudo rm -rf "$RELEASE_DIR"
fi

log "设置目录属主 deploy:deploy"
run sudo chown -R deploy:deploy "$INCOMING_DIR"
run sudo chmod 755 "$INCOMING_DIR"
run sudo mv "$INCOMING_DIR" "$RELEASE_DIR"

# ---------------------------------------------------------------------------
# 2. 先校验 nginx 配置，再切 current（配置错误时不动线上）
# ---------------------------------------------------------------------------
log "校验 nginx 配置……"
run sudo nginx -t

log "切换 current → $RELEASE_DIR"
run sudo ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

# ---------------------------------------------------------------------------
# 3. reload + 健康检查
# ---------------------------------------------------------------------------
log "reload nginx……"
run sudo systemctl reload nginx

if ! wait_for_health 30; then
  warn "健康检查未通过，正在回滚软链……"
  if [[ -n "$PREVIOUS_RELEASE" && -d "$PREVIOUS_RELEASE" ]]; then
    run sudo ln -sfn "$PREVIOUS_RELEASE" "$CURRENT_LINK"
    run sudo systemctl reload nginx || true
    die "新版本健康检查失败，已切回 $(basename "$PREVIOUS_RELEASE")" \
      "查看：sudo tail -n 80 /var/log/nginx/error.log；curl -i $HEALTH_URL；确认后端 luna-blog 服务是否正常"
  fi
  die "新版本健康检查失败，且没有可回滚的旧版本" \
    "查看：sudo tail -n 80 /var/log/nginx/error.log；curl -i $HEALTH_URL；sudo systemctl status luna-blog --no-pager"
fi

# ---------------------------------------------------------------------------
# 4. 清理旧版本（保留最新 KEEP_RELEASES 个，绝不删除刚部署的版本）
# ---------------------------------------------------------------------------
log "清理旧版本（保留最新 $KEEP_RELEASES 个）……"
mapfile -t ALL_RELEASES < <(list_releases)
kept=0
for dir in "${ALL_RELEASES[@]}"; do
  if [[ "$dir" == "$RELEASE_DIR" ]]; then
    kept=$((kept + 1))
    continue
  fi
  if ((kept < KEEP_RELEASES)); then
    kept=$((kept + 1))
    log "保留：$(basename "$dir")"
  else
    assert_under_app_root "$dir"
    log "删除：$(basename "$dir")"
    run sudo rm -rf "$dir"
  fi
done

trap - ERR

cat >&2 <<EOF
--------------------------------------------------------------------------
部署完成：$VERSION
  current → $(current_release)
  健康检查：$HEALTH_URL 通过

验证：
  curl -I http://43.143.72.12/
  curl -s http://43.143.72.12/api/health
  # /admin/ 仅允许本机访问，需 SSH 隧道：
  #   ssh -L 8080:127.0.0.1:80 ubuntu@43.143.72.12
  #   浏览器打开 http://127.0.0.1:8080/admin/

回滚（保留的版本见 ls $RELEASES_DIR）：
  sudo bash $OPS_DIR/rollback.sh ${PREVIOUS_RELEASE:+$(basename "$PREVIOUS_RELEASE")}
--------------------------------------------------------------------------
EOF
