#!/usr/bin/env bash
# =============================================================================
# lib.sh — Luna Blog 运维脚本共享库
#
# 被 deploy/ops/*.sh 以 source 方式引用，本身不单独执行，也**不**设置
# set -euo pipefail（由各入口脚本设置，避免 source 时意外改变调用者行为）。
#
# 路径与权限以服务器实际部署为准（见 docs/ops/RUNBOOK.md）：
#   /var/www/luna-blog/
#     src/                 deploy:deploy     后端源码（src/blog-server）
#     releases/<版本>/     deploy:deploy     web/ + admin/ 静态产物
#     current -> releases/<版本>             root 创建的软链
#     data/uploads/        luna-blog:luna-blog 750
#     secrets/             root:luna-blog 750（文件 640）
#     backups/             root（根目录 700）
# =============================================================================

# 防止被重复 source 时重复定义（函数重复定义无害，但保持干净）
if [[ -n "${LUNA_LIB_LOADED:-}" ]]; then
  return 0 2>/dev/null || true
else
  LUNA_LIB_LOADED=1
fi

# ---------------------------------------------------------------------------
# 路径与常量（均可用同名环境变量覆盖，便于演练时指向测试目录）
# ---------------------------------------------------------------------------
APP_ROOT="${APP_ROOT:-/var/www/luna-blog}"
SRC_DIR="$APP_ROOT/src"
BACKEND_DIR="$SRC_DIR/blog-server"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
UPLOAD_DIR="$APP_ROOT/data/uploads"
SECRETS_DIR="$APP_ROOT/secrets"
BACKUP_DIR="$APP_ROOT/backups"
SERVICE="${SERVICE:-luna-blog}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/api/health}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
KEEP_DAYS="${KEEP_DAYS:-7}"
KEEP_WEEKS="${KEEP_WEEKS:-4}"

# 运维脚本在服务器上的固定落点（systemd 单元里的 ExecStart 指向这里）
OPS_DIR="$SRC_DIR/deploy/ops"

# 数据库连接默认值；主机/端口不在 secrets/mysql.txt 里，可用环境变量覆盖
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_SECRET_FILE="$SECRETS_DIR/mysql.txt"

# ---------------------------------------------------------------------------
# 基础输出
# ---------------------------------------------------------------------------
is_dry_run() {
  case "${DRY_RUN:-0}" in
    1 | true | TRUE | yes | YES) return 0 ;;
    *) return 1 ;;
  esac
}

_ts() { date '+%Y-%m-%d %H:%M:%S'; }

log()  { printf '[%s] %s\n' "$(_ts)" "$*" >&2; }
warn() { printf '[%s] [WARN] %s\n' "$(_ts)" "$*" >&2; }

# die "错误" ["可操作提示"]
die() {
  local msg="${1:-未知错误}" hint="${2:-}"
  printf '[%s] [ERROR] %s\n' "$(_ts)" "$msg" >&2
  if [[ -n "$hint" ]]; then
    printf '         提示：%s\n' "$hint" >&2
  fi
  exit 1
}

# 检查命令是否存在：require_cmd <命令> ["安装提示"]
require_cmd() {
  local cmd="$1" hint="${2:-}"
  command -v "$cmd" >/dev/null 2>&1 || die "找不到命令：$cmd" "${hint:-请先安装 $cmd 后重试}"
}

# ---------------------------------------------------------------------------
# DRY_RUN 支持
#   run <命令...>        —— 以 argv 方式执行；DRY_RUN=1 时只打印
#   run_shell "<字符串>" —— 需要管道/重定向时使用；DRY_RUN=1 时只打印
# 说明：带 > 重定向、>> 追加、sed -i 等副作用请勿直接写在脚本里，改用
#       run/run_shell，或在 if is_dry_run 分支里明确处理。
# ---------------------------------------------------------------------------
run() {
  if is_dry_run; then
    log "[DRY_RUN] $*"
    return 0
  fi
  "$@"
}

run_shell() {
  local cmd="$1"
  if is_dry_run; then
    log "[DRY_RUN] $cmd"
    return 0
  fi
  bash -c "$cmd"
}

# ---------------------------------------------------------------------------
# 权限：确保以 root 运行；当前不是 root 时用 sudo 重新执行本脚本
# （服务器上 deploy 账号配置了 NOPASSWD sudo）
# ---------------------------------------------------------------------------
require_root_via_sudo() {
  if [[ "${EUID}" -eq 0 ]]; then
    return 0
  fi
  require_cmd sudo "请用 root 执行，或安装 sudo"
  log "当前不是 root，改用 sudo 重新执行：$0 $*"
  # 显式保留 DRY_RUN，其余环境变量按 sudo 默认策略处理
  exec sudo env "DRY_RUN=${DRY_RUN:-0}" bash "$0" "$@"
}

# ---------------------------------------------------------------------------
# 逗号/空白安全地读取 KEY=VALUE 形式的密钥文件
#   read_secret_file <文件> <键名>
# 输出：值（不含换行）；文件缺失、不可读、键缺失时 die
# ---------------------------------------------------------------------------
read_secret_file() {
  local file="$1" key="$2" value

  [[ -f "$file" ]] || die "找不到密钥文件：$file" \
    "确认已按 docs/ops/RUNBOOK.md 创建 $SECRETS_DIR 下的密钥文件（root:luna-blog 640）"
  [[ -r "$file" ]] || die "当前用户无权读取密钥文件：$file" \
    "用 root 执行；或把当前用户加入 luna-blog 组：sudo usermod -aG luna-blog <用户>（重新登录生效）"

  value="$(awk -v key="$key" '
    {
      line = $0
      sub(/\r$/, "", line)
      p = index(line, "=")
      if (p == 0) next
      k = substr(line, 1, p - 1)
      gsub(/^[ \t]+|[ \t]+$/, "", k)
      if (k != key) next
      v = substr(line, p + 1)
      sub(/\r$/, "", v)
      print v
      exit
    }
  ' "$file")"

  # 容忍值两侧的成对引号
  if [[ ${#value} -ge 2 && "$value" == \"*\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ ${#value} -ge 2 && "$value" == \'*\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  [[ -n "$value" ]] || die "密钥文件 $file 缺少有效值：$key" \
    "文件格式为每行 KEY=VALUE，例如 DB_NAME=luna_blog；注意不要写成 export KEY=..."
  printf '%s' "$value"
}

# 一次性加载 MySQL 密钥到 MYSQL_* 变量（backup.sh / restore.sh 共用）
load_mysql_secrets() {
  MYSQL_DB_NAME="$(read_secret_file "$MYSQL_SECRET_FILE" DB_NAME)"
  MYSQL_DB_USER="$(read_secret_file "$MYSQL_SECRET_FILE" DB_USER)"
  MYSQL_DB_PASSWORD="$(read_secret_file "$MYSQL_SECRET_FILE" DB_PASSWORD)"
  # 只读校验：确认三个值都非空（read_secret_file 已保证，这里防止后续误改）
  [[ -n "$MYSQL_DB_NAME" && -n "$MYSQL_DB_USER" && -n "$MYSQL_DB_PASSWORD" ]] || \
    die "MySQL 密钥不完整：$MYSQL_SECRET_FILE" "需要 DB_NAME / DB_USER / DB_PASSWORD 三行"
}

# ---------------------------------------------------------------------------
# 健康检查：轮询 HEALTH_URL，最多 timeout 秒（默认 30），成功返回 0，超时返回 1
# ---------------------------------------------------------------------------
wait_for_health() {
  local timeout="${1:-30}" waited=0

  require_cmd curl "sudo apt-get install -y curl"

  if is_dry_run; then
    log "[DRY_RUN] 跳过健康检查轮询：$HEALTH_URL（超时 ${timeout}s）"
    return 0
  fi

  while ((waited < timeout)); do
    if curl -fsS --max-time 3 -o /dev/null "$HEALTH_URL" 2>/dev/null; then
      log "健康检查通过（等待 ${waited}s）：$HEALTH_URL"
      return 0
    fi
    sleep 2
    waited=$((waited + 2))
  done

  warn "健康检查超时（${timeout}s）：$HEALTH_URL"
  return 1
}

# ---------------------------------------------------------------------------
# 发布目录相关
# ---------------------------------------------------------------------------
# 列出 releases 下的版本目录，按修改时间倒序（最新在前）
list_releases() {
  find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' 2>/dev/null \
    | sort -rn \
    | cut -d' ' -f2-
}

# current 实际指向（解析失败时输出空）
current_release() {
  readlink -f "$CURRENT_LINK" 2>/dev/null || true
}

# 拒绝操作 APP_ROOT 之外的路径，避免 rm -rf 误伤
assert_under_app_root() {
  local path="$1"
  [[ -n "$path" ]] || die "拒绝操作空路径" "这是脚本内部保护，请检查调用处"
  case "$path" in
    "$APP_ROOT"/*) ;;
    *) die "拒绝操作不在 $APP_ROOT 之下的路径：$path" "脚本已中止，避免误删" ;;
  esac
}

# 校验版本号是否安全（用于目录名、tar 文件名）
assert_valid_version() {
  local version="$1"
  [[ -n "$version" ]] || die "版本号不能为空" "格式示例：20261126-2244"
  [[ "$version" =~ ^[0-9A-Za-z._-]+$ ]] || die "版本号含非法字符：$version" \
    "只允许字母、数字、点、下划线、短横线；格式示例：20261126-2244"
}

# 打印文件/目录大小（人类可读；目录要汇总，故用 -s，否则 du 会逐层输出多行）
human_size() {
  du -sh -- "$1" 2>/dev/null | cut -f1
}
