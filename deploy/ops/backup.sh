#!/usr/bin/env bash
# =============================================================================
# backup.sh — 每日备份：MySQL 全库 + 上传目录
#
# 用法（服务器上，root 或带 sudo 的账号）：
#   sudo bash /var/www/luna-blog/src/deploy/ops/backup.sh
#   DRY_RUN=1 bash deploy/ops/backup.sh          # 只打印计划
#
# 产物（$BACKUP_DIR，默认 /var/www/luna-blog/backups）：
#   db-<YYYYmmdd-HHMMSS>.sql.gz
#   uploads-<YYYYmmdd-HHMMSS>.tar.gz
#   SHA256SUMS                 追加式校验清单
#   db-<...>-weekly.sql.gz     周日额外生成硬链接（保留 4 周）
#   uploads-<...>-weekly.tar.gz
#
# 由 systemd timer 每天 03:30 触发（deploy/systemd/luna-blog-backup.timer）。
# 用 flock 防止并发；先写 *.partial 再原子 mv，失败不会留下半份备份被误认。
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/ops/lib.sh
source "$SCRIPT_DIR/lib.sh"

TS="$(date +%Y%m%d-%H%M%S)"
DOW="$(date +%u)"   # 1=周一 … 7=周日
SHA256SUMS="$BACKUP_DIR/SHA256SUMS"
LOCK_FILE="$BACKUP_DIR/.backup.lock"

# ---------------------------------------------------------------------------
# DRY_RUN：只打印计划（不需要 root）
# ---------------------------------------------------------------------------
if is_dry_run; then
  cat >&2 <<EOF
[DRY_RUN] 备份计划：
  数据库：${MYSQL_DB_NAME:-（从 secrets/mysql.txt 读取 DB_NAME）}
  mysqldump --single-transaction --routines --triggers | gzip → $BACKUP_DIR/db-$TS.sql.gz
  tar czf → $BACKUP_DIR/uploads-$TS.tar.gz（源：$APP_ROOT/data/uploads）
  sha256sum 追加到 $SHA256SUMS
  清理：每日备份保留 $KEEP_DAYS 天；每周备份保留 $KEEP_WEEKS 份（周日生成 *-weekly）
EOF
  exit 0
fi

require_root_via_sudo "$@"

require_cmd mysqldump "sudo apt-get install -y mysql-client"
require_cmd mysql "sudo apt-get install -y mysql-client"
require_cmd gzip "sudo apt-get install -y gzip"
require_cmd tar "sudo apt-get install -y tar"
require_cmd sha256sum "sudo apt-get install -y coreutils"
require_cmd flock "sudo apt-get install -y util-linux"

SECONDS=0
START_AT="$(date '+%F %T')"

# ---------------------------------------------------------------------------
# 目录准备
# ---------------------------------------------------------------------------
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

if [[ ! -d "$UPLOAD_DIR" ]]; then
  warn "上传目录不存在，自动创建空目录：$UPLOAD_DIR（首次部署尚未上传时会出现）"
  mkdir -p "$UPLOAD_DIR"
fi

# ---------------------------------------------------------------------------
# 并发锁：同一时间只允许一个备份
# ---------------------------------------------------------------------------
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  warn "另一个备份正在进行（锁：$LOCK_FILE），本次跳过"
  exit 0
fi

DB_FILE="$BACKUP_DIR/db-$TS.sql.gz"
UPLOADS_FILE="$BACKUP_DIR/uploads-$TS.tar.gz"
DB_PARTIAL="$DB_FILE.partial"
UPLOADS_PARTIAL="$UPLOADS_FILE.partial"

cleanup() {
  local code=$?
  rm -f "$DB_PARTIAL" "$UPLOADS_PARTIAL"
  if ((code != 0)); then
    warn "备份失败（退出码 $code），已清理未完成的 .partial 文件"
    warn "排查：df -h $BACKUP_DIR；sudo systemctl status mysql --no-pager；sudo mysqladmin status"
  fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# 1. 读取密钥（root 才能读 secrets/mysql.txt）
# ---------------------------------------------------------------------------
load_mysql_secrets
log "开始备份数据库：$MYSQL_DB_NAME@$MYSQL_HOST:$MYSQL_PORT"

# 密码通过环境变量传给 mysqldump，不出现在命令行（ps 看不到）
export MYSQL_PWD="$MYSQL_DB_PASSWORD"

# ---------------------------------------------------------------------------
# 2. 导出数据库
# ---------------------------------------------------------------------------
log "mysqldump → $DB_FILE"
if ! mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  --host="$MYSQL_HOST" \
  --port="$MYSQL_PORT" \
  --user="$MYSQL_DB_USER" \
  "$MYSQL_DB_NAME" 2>"$BACKUP_DIR/.mysqldump.err" | gzip -9 >"$DB_PARTIAL"; then
  warn "mysqldump 失败，错误输出："
  sed 's/^/  /' "$BACKUP_DIR/.mysqldump.err" >&2 || true
  die "数据库备份失败" \
    "确认 MySQL 正在运行、secrets/mysql.txt 中账号密码正确、磁盘有空间；可用 mysql -u\$DB_USER -p -e 'SHOW DATABASES;' 手工验证"
fi
rm -f "$BACKUP_DIR/.mysqldump.err"

[[ -s "$DB_PARTIAL" ]] || die "数据库备份为空：$DB_PARTIAL" "检查 mysqldump 是否输出了内容；数据库名是否写错"
gzip -t "$DB_PARTIAL" || die "数据库备份 gzip 校验失败：$DB_PARTIAL" "重新执行备份；若持续失败请检查磁盘/内存"
mv "$DB_PARTIAL" "$DB_FILE"

# ---------------------------------------------------------------------------
# 3. 打包上传目录（保留 uploads/ 前缀，恢复时可直接 tar -C /var/www/luna-blog/data -xf）
# ---------------------------------------------------------------------------
log "打包上传目录 → $UPLOADS_FILE"
tar czf "$UPLOADS_PARTIAL" -C "$APP_ROOT/data" uploads
[[ -s "$UPLOADS_PARTIAL" ]] || die "上传目录备份为空：$UPLOADS_PARTIAL" "确认 $UPLOAD_DIR 是否为空；空目录也应生成非空 tar.gz，检查 tar 报错"
mv "$UPLOADS_PARTIAL" "$UPLOADS_FILE"

# ---------------------------------------------------------------------------
# 4. 校验和（追加式；路径相对 BACKUP_DIR，便于 cd 后 sha256sum -c）
# ---------------------------------------------------------------------------
(
  cd "$BACKUP_DIR"
  sha256sum "db-$TS.sql.gz" "uploads-$TS.tar.gz" >>"$SHA256SUMS"
)
log "已追加校验和：$SHA256SUMS"

# ---------------------------------------------------------------------------
# 5. 每周备份（周日 03:30 那次生成硬链接，不额外占空间）
# ---------------------------------------------------------------------------
if [[ "$DOW" == "7" ]]; then
  ln -f "$DB_FILE" "$BACKUP_DIR/db-$TS-weekly.sql.gz"
  ln -f "$UPLOADS_FILE" "$BACKUP_DIR/uploads-$TS-weekly.tar.gz"
  log "已生成周备份（硬链接）：db-$TS-weekly.sql.gz / uploads-$TS-weekly.tar.gz"
fi

# ---------------------------------------------------------------------------
# 6. 清理：每日备份保留 KEEP_DAYS 天；周备份保留 KEEP_WEEKS 份
# ---------------------------------------------------------------------------
log "清理超过 $KEEP_DAYS 天的每日备份……"
while IFS= read -r old; do
  [[ -n "$old" ]] || continue
  base="$(basename "$old")"
  # 从 db-<时间戳>.sql.gz 推出时间戳，成对删除 uploads
  stamp="${base#db-}"
  stamp="${stamp%.sql.gz}"
  assert_under_app_root "$old"
  rm -f "$BACKUP_DIR/db-$stamp.sql.gz" "$BACKUP_DIR/uploads-$stamp.tar.gz"
  log "  删除：$stamp"
done < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db-*.sql.gz' \
  ! -name '*-weekly.sql.gz' -mtime "+$KEEP_DAYS" -print | sort)

log "清理超出 $KEEP_WEEKS 份的周备份……"
mapfile -t WEEKLY_DBS < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db-*-weekly.sql.gz' \
  -printf '%T@ %p\n' | sort -rn | cut -d' ' -f2-)
for i in "${!WEEKLY_DBS[@]}"; do
  if ((i >= KEEP_WEEKS)); then
    f="${WEEKLY_DBS[$i]}"
    name="$(basename "$f")"
    stamp="${name#db-}"
    stamp="${stamp%-weekly.sql.gz}"
    assert_under_app_root "$f"
    rm -f "$BACKUP_DIR/db-$stamp-weekly.sql.gz" "$BACKUP_DIR/uploads-$stamp-weekly.tar.gz"
    log "  删除周备份：$stamp"
  fi
done

# SHA256SUMS 里已删除文件的记录一并清掉，避免 sha256sum -c 报缺失
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

# ---------------------------------------------------------------------------
# 7. 汇报
# ---------------------------------------------------------------------------
DB_SIZE="$(human_size "$DB_FILE")"
UP_SIZE="$(human_size "$UPLOADS_FILE")"
TOTAL_SIZE="$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"

# 备份目录所在分区剩余空间
FREE="$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')"
USE_PCT="$(df -h "$BACKUP_DIR" | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
if [[ -n "$USE_PCT" ]] && ((USE_PCT > 80)); then
  logger -t luna-backup "WARN: backup 分区使用率 ${USE_PCT}%（目录 $BACKUP_DIR）"
  warn "备份分区使用率偏高：${USE_PCT}%（剩余 $FREE）"
fi

trap - EXIT

cat >&2 <<EOF
--------------------------------------------------------------------------
备份完成（耗时 ${SECONDS}s，开始于 $START_AT）
  数据库：$DB_FILE（$DB_SIZE）
  上传：  $UPLOADS_FILE（$UP_SIZE）
  校验：  $SHA256SUMS
  目录：  $BACKUP_DIR（合计 $TOTAL_SIZE，剩余空间 $FREE）

校验备份：
  cd $BACKUP_DIR && sha256sum -c SHA256SUMS
恢复演练（不要在生产库上直接试）：
  sudo bash $OPS_DIR/restore.sh $DB_FILE
--------------------------------------------------------------------------
EOF
