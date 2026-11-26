#!/usr/bin/env bash
# =============================================================================
# restore.sh — 从备份恢复数据库（默认恢复到临时库，绝不默认覆盖生产库）
#
# 用法（服务器上，root 或带 sudo 的账号）：
#   sudo bash deploy/ops/restore.sh /var/www/luna-blog/backups/db-20261126-033000.sql.gz
#   sudo bash deploy/ops/restore.sh <db.sql.gz> my_test_db
#   sudo bash deploy/ops/restore.sh <db.sql.gz> --uploads <uploads.tar.gz>   # 附带校验上传包
#   sudo bash deploy/ops/restore.sh <db.sql.gz> luna_blog --force-prod       # 覆盖生产库（危险）
#
# 安全约定：
#   * 目标库默认 luna_blog_restore_test，先恢复到演练库；
#   * 目标库等于 secrets/mysql.txt 里的生产库名时，必须显式 --force-prod，
#     且要么交互输入库名确认，要么设置 CONFIRM_TO_PROD=<库名>（非交互环境）。
#   * --uploads 只解压到临时目录做校验，不会写入 data/uploads。
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/ops/lib.sh
source "$SCRIPT_DIR/lib.sh"

DEFAULT_TARGET_DB="luna_blog_restore_test"
EXPECTED_TABLES=16

usage() {
  cat >&2 <<EOF
用法：
  restore.sh <db.sql.gz> [目标库] [--uploads <uploads.tar.gz>] [--force-prod]

  目标库默认 $DEFAULT_TARGET_DB（演练库），不会默认覆盖生产库。
  --force-prod   目标库恰为生产库时才允许覆盖（需再次确认）
  --uploads <tar.gz>   额外把上传目录备份解压到临时目录做校验

示例：
  sudo bash $0 /var/www/luna-blog/backups/db-20261126-033000.sql.gz
  sudo bash $0 /var/www/luna-blog/backups/db-20261126-033000.sql.gz luna_blog_restore_test \\
       --uploads /var/www/luna-blog/backups/uploads-20261126-033000.tar.gz
EOF
  exit 2
}

[[ $# -ge 1 ]] || usage

DB_DUMP=""
TARGET_DB=""
UPLOADS_TAR=""
FORCE_PROD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help) usage ;;
    --uploads)
      [[ $# -ge 2 ]] || die "--uploads 缺少参数" "用法：--uploads <uploads.tar.gz>"
      UPLOADS_TAR="$2"
      shift 2
      ;;
    --force-prod)
      FORCE_PROD=1
      shift
      ;;
    -*)
      die "未知参数：$1" "运行 restore.sh --help 查看用法"
      ;;
    *)
      if [[ -z "$DB_DUMP" ]]; then
        DB_DUMP="$1"
      elif [[ -z "$TARGET_DB" ]]; then
        TARGET_DB="$1"
      else
        die "多余参数：$1" "用法：restore.sh <db.sql.gz> [目标库] [--uploads <tar.gz>] [--force-prod]"
      fi
      shift
      ;;
  esac
done

[[ -n "$DB_DUMP" ]] || usage
TARGET_DB="${TARGET_DB:-$DEFAULT_TARGET_DB}"

# ---------------------------------------------------------------------------
# 参数与文件校验
# ---------------------------------------------------------------------------
[[ -f "$DB_DUMP" ]] || die "备份文件不存在：$DB_DUMP" \
  "确认路径；备份目录默认 $BACKUP_DIR（ls -lh $BACKUP_DIR）"
gunzip -t "$DB_DUMP" 2>/dev/null || die "备份文件不是有效的 gzip：$DB_DUMP" \
  "可能是 .partial 残留或 scp 传输不完整；重新下载/重新备份"

[[ "$TARGET_DB" =~ ^[A-Za-z0-9_]+$ ]] || die "目标库名非法：$TARGET_DB" \
  "只允许字母、数字、下划线（MySQL 库名约束）"

if [[ -n "$UPLOADS_TAR" ]]; then
  [[ -f "$UPLOADS_TAR" ]] || die "上传备份不存在：$UPLOADS_TAR" "检查路径"
  tar -tzf "$UPLOADS_TAR" >/dev/null 2>&1 || die "上传备份损坏或不是 tar.gz：$UPLOADS_TAR" "重新备份 uploads"
fi

MYSQL_SECRET_FILE="$SECRETS_DIR/mysql.txt"
PROD_DB_NAME="$(read_secret_file "$MYSQL_SECRET_FILE" DB_NAME)"

IS_PROD_TARGET=0
[[ "$TARGET_DB" == "$PROD_DB_NAME" ]] && IS_PROD_TARGET=1

if ((IS_PROD_TARGET)); then
  if ((FORCE_PROD != 1)); then
    die "拒绝覆盖生产库：$PROD_DB_NAME" \
      "默认恢复到演练库 $DEFAULT_TARGET_DB；确实要覆盖生产库请加 --force-prod（强烈建议先在演练库验证）"
  fi
  warn "目标库就是生产库：$PROD_DB_NAME —— 覆盖后线上数据将被备份内容替换！"
  if [[ -t 0 ]]; then
    read -r -p "输入生产库名 '$PROD_DB_NAME' 以确认覆盖：" CONFIRM
    [[ "$CONFIRM" == "$PROD_DB_NAME" ]] || die "确认失败，已中止" "未做任何修改"
  else
    [[ "${CONFIRM_TO_PROD:-}" == "$PROD_DB_NAME" ]] || die "非交互环境覆盖生产库需要 CONFIRM_TO_PROD=$PROD_DB_NAME" \
      "例如：sudo CONFIRM_TO_PROD=$PROD_DB_NAME bash $0 $DB_DUMP $PROD_DB_NAME --force-prod"
  fi
fi

if is_dry_run; then
  cat >&2 <<EOF
[DRY_RUN] 恢复计划：
  备份文件：$DB_DUMP
  目标库：  $TARGET_DB$( ((IS_PROD_TARGET)) && echo '（生产库！）' || echo '（演练库）' )
  mysql ... -e "CREATE DATABASE IF NOT EXISTS \`$TARGET_DB\` ..."
  gunzip -c $DB_DUMP | mysql ... $TARGET_DB
  校验：information_schema.tables 表数（期望 $EXPECTED_TABLES）与 user 表行数
$( [[ -n "$UPLOADS_TAR" ]] && printf '  uploads 校验：解压 %s 到临时目录（不写 data/uploads）\n' "$UPLOADS_TAR" )
EOF
  exit 0
fi

# ---------------------------------------------------------------------------
# 权限与依赖
# ---------------------------------------------------------------------------
if [[ "${EUID}" -ne 0 ]]; then
  require_cmd sudo "需要 sudo 权限读取 secrets/mysql.txt"
  sudo -n true 2>/dev/null || die "当前账号无法免密 sudo" "用 root 或带 NOPASSWD sudo 的账号执行"
fi

require_cmd mysql "sudo apt-get install -y mysql-client"
require_cmd gunzip "sudo apt-get install -y gzip"

load_mysql_secrets

# 恢复属于管理员操作，必须建库/写库：用 MySQL root 的 unix socket 认证
# （`sudo mysql`），而不是只有生产库权限的应用账号（否则演练库会 1044）。
# 生产环境 mysqld 绑 127.0.0.1，root 走 socket 认证不需要口令。
if [[ "${EUID}" -eq 0 ]]; then
  MYSQL_BASE=(mysql --default-character-set=utf8mb4)
else
  MYSQL_BASE=(sudo -n mysql --default-character-set=utf8mb4)
  "${MYSQL_BASE[@]}" -e 'SELECT 1;' >/dev/null 2>&1 \
    || die "无法以 root 身份连接 MySQL" "请用 sudo 执行本脚本，且确认 root 可用 socket 认证登录"
fi

log "备份文件：$DB_DUMP（$(human_size "$DB_DUMP")）"
log "目标库：  $TARGET_DB"
log "源数据库：$MYSQL_DB_NAME（仅用于提示，恢复不会碰它）"

# ---------------------------------------------------------------------------
# 1. 建库（目标库不存在则创建）
# ---------------------------------------------------------------------------
log "创建目标库（如不存在）……"
"${MYSQL_BASE[@]}" -e "CREATE DATABASE IF NOT EXISTS \`$TARGET_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# ---------------------------------------------------------------------------
# 2. 恢复
# ---------------------------------------------------------------------------
log "开始恢复（gunzip -c | mysql）……"
if ! gunzip -c "$DB_DUMP" | "${MYSQL_BASE[@]}" "$TARGET_DB"; then
  die "恢复失败（mysql 导入出错）" \
    "常见原因：MySQL 未运行、权限不足、备份与 MySQL 版本不兼容、磁盘满。查看：sudo journalctl -u mysql -n 50 --no-pager"
fi
log "数据导入完成"

# ---------------------------------------------------------------------------
# 3. 校验：表数 16 + user 表行数
# ---------------------------------------------------------------------------
TABLE_COUNT="$("${MYSQL_BASE[@]}" -N -B -e \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$TARGET_DB';")"

USER_ROWS="（user 表不存在）"
if "${MYSQL_BASE[@]}" -N -B "$TARGET_DB" -e "SELECT 1 FROM \`user\` LIMIT 1;" >/dev/null 2>&1; then
  USER_ROWS="$("${MYSQL_BASE[@]}" -N -B "$TARGET_DB" -e "SELECT COUNT(*) FROM \`user\`;")"
fi

VERIFY_FAIL=0
if [[ "$TABLE_COUNT" -ne "$EXPECTED_TABLES" ]]; then
  warn "表数异常：$TABLE_COUNT（期望 $EXPECTED_TABLES）"
  VERIFY_FAIL=1
else
  log "表数校验通过：$TABLE_COUNT 张表"
fi

if [[ "$USER_ROWS" == *不存在* ]]; then
  warn "user 表不存在，账号数据可能缺失"
  VERIFY_FAIL=1
else
  log "user 表行数：$USER_ROWS（请与生产库对比：SELECT COUNT(*) FROM \`user\`;）"
fi

# ---------------------------------------------------------------------------
# 4. 可选：上传目录备份校验（只解压到临时目录）
# ---------------------------------------------------------------------------
UPLOADS_TMP=""
if [[ -n "$UPLOADS_TAR" ]]; then
  UPLOADS_TMP="$(mktemp -d /tmp/luna-uploads-restore.XXXXXX)"
  log "解压上传备份到临时目录：$UPLOADS_TMP"
  tar xzf "$UPLOADS_TAR" -C "$UPLOADS_TMP"
  if [[ -d "$UPLOADS_TMP/uploads" ]]; then
    UPLOAD_FILES="$(find "$UPLOADS_TMP/uploads" -type f | wc -l)"
    UPLOAD_SIZE="$(du -sh "$UPLOADS_TMP/uploads" | cut -f1)"
    LIVE_FILES="（$UPLOAD_DIR 不存在）"
    LIVE_SIZE="?"
    if [[ -d "$UPLOAD_DIR" ]]; then
      LIVE_FILES="$(find "$UPLOAD_DIR" -type f | wc -l)"
      LIVE_SIZE="$(du -sh "$UPLOAD_DIR" | cut -f1)"
    fi
    cat >&2 <<EOF
--------------------------------------------------------------------------
上传目录校验（未写入线上目录）
  备份：$UPLOAD_FILES 个文件，$UPLOAD_SIZE
  线上：$LIVE_FILES 个文件，$LIVE_SIZE
  临时目录：$UPLOADS_TMP/uploads

人工比对（确认无误后再考虑同步，且避开访问高峰）：
  diff <(cd $UPLOAD_DIR && find . -type f | sort) \\
       <(cd $UPLOADS_TMP/uploads && find . -type f | sort) | head -n 50
  # 只补缺失、不删线上文件：
  sudo rsync -av --ignore-existing $UPLOADS_TMP/uploads/ $UPLOAD_DIR/
  # 完全覆盖（危险，会删除线上多出的文件）：
  # sudo rsync -a --delete $UPLOADS_TMP/uploads/ $UPLOAD_DIR/
  # 确认后清理临时目录：sudo rm -rf $UPLOADS_TMP
--------------------------------------------------------------------------
EOF
  else
    warn "上传备份内没有 uploads/ 目录，压缩包结构可能不对：$UPLOADS_TAR"
    VERIFY_FAIL=1
  fi
fi

# ---------------------------------------------------------------------------
# 5. 结论与人工比对建议
# ---------------------------------------------------------------------------
cat >&2 <<EOF
--------------------------------------------------------------------------
恢复完成：$DB_DUMP → $TARGET_DB
  表数：$TABLE_COUNT（期望 $EXPECTED_TABLES）
  user 行数：$USER_ROWS

人工比对建议：
  1) 结构：mysqldump -u$MYSQL_DB_USER -p --no-data $MYSQL_DB_NAME > /tmp/prod-schema.sql
           mysqldump -u$MYSQL_DB_USER -p --no-data $TARGET_DB    > /tmp/restore-schema.sql
           diff /tmp/prod-schema.sql /tmp/restore-schema.sql
  2) 行数：mysql -u$MYSQL_DB_USER -p -e "
             SELECT table_name, table_rows FROM information_schema.tables
             WHERE table_schema IN ('$MYSQL_DB_NAME','$TARGET_DB') ORDER BY table_name;"
  3) 抽样：SELECT COUNT(*) FROM article; SELECT COUNT(*) FROM comment;
  4) 演练库确认无误后，再按 RUNBOOK「恢复演练」步骤评估是否切换生产库。
     恢复完成后清理演练库：DROP DATABASE \`$TARGET_DB\`;（确认不再需要时）
--------------------------------------------------------------------------
EOF

if ((VERIFY_FAIL)); then
  die "恢复完成但校验发现问题，请人工确认（见上方告警）" \
    "不要急于切换生产库；先核对备份是否来自正确时间点、表结构是否与当前代码匹配"
fi
