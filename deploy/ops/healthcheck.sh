#!/usr/bin/env bash
# =============================================================================
# healthcheck.sh — 定时健康检查（由 luna-blog-healthcheck.timer 每 60s 触发）
#
# 策略：
#   连续 3 次探测失败才认定异常 → systemctl restart luna-blog → 再等 30s
#   仍不健康：logger -t luna-healthcheck 记错误并以非 0 退出
#             （systemd 会把该次 service 标记为 failed，可在 systemctl --failed 看到）
#   另外检查磁盘使用率，>80% 用 logger 告警（不重启服务）
#
# 用法：sudo bash deploy/ops/healthcheck.sh        DRY_RUN=1 只打印
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/ops/lib.sh
source "$SCRIPT_DIR/lib.sh"

PROBES=3
PROBE_INTERVAL=5
DISK_WARN_PCT=80

probe_once() {
  curl -fsS --max-time 5 -o /dev/null "$HEALTH_URL" 2>/dev/null
}

# ---------------------------------------------------------------------------
# 磁盘使用率检查（对根分区与 APP_ROOT 所在分区各查一次）
# ---------------------------------------------------------------------------
check_disk() {
  local path pct free
  for path in / "$APP_ROOT"; do
    [[ -e "$path" ]] || continue
    # df -P 输出 POSIX 格式：Filesystem 1024-blocks Used Available Capacity Mounted
    pct="$(df -P "$path" | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
    free="$(df -P "$path" | awk 'NR==2 {print $4}')"
    [[ "$pct" =~ ^[0-9]+$ ]] || continue
    if ((pct > DISK_WARN_PCT)); then
      logger -t luna-healthcheck "WARN: 磁盘使用率 ${pct}%（$path，剩余 $((free / 1024)) MB）"
      warn "磁盘使用率 ${pct}%（$path），已写入 syslog（journalctl -t luna-healthcheck）"
    fi
  done
}

if is_dry_run; then
  cat >&2 <<EOF
[DRY_RUN] 健康检查计划：
  探测 $HEALTH_URL 连续 $PROBES 次（间隔 ${PROBE_INTERVAL}s）
  全部失败 → sudo systemctl restart $SERVICE → wait_for_health 30
  仍失败 → logger -t luna-healthcheck + 非 0 退出
  磁盘使用率 > ${DISK_WARN_PCT}% → logger -t luna-healthcheck 告警
EOF
  exit 0
fi

require_root_via_sudo "$@"
require_cmd curl "sudo apt-get install -y curl"

check_disk

# ---------------------------------------------------------------------------
# 连续探测
# ---------------------------------------------------------------------------
failures=0
for ((i = 1; i <= PROBES; i++)); do
  if probe_once; then
    log "健康检查通过（第 ${i} 次探测，$HEALTH_URL）"
    exit 0
  fi
  failures=$((failures + 1))
  if ((i < PROBES)); then
    sleep "$PROBE_INTERVAL"
  fi
done

# ---------------------------------------------------------------------------
# 3 次都失败：重启服务
# ---------------------------------------------------------------------------
msg="健康检查连续 ${failures} 次失败（$HEALTH_URL），尝试重启 $SERVICE"
warn "$msg"
logger -t luna-healthcheck "WARN: $msg"

if ! systemctl restart "$SERVICE"; then
  logger -t luna-healthcheck "ERROR: systemctl restart $SERVICE 失败，健康检查放弃"
  warn "重启 $SERVICE 失败："
  systemctl status "$SERVICE" --no-pager -l 2>&1 | tail -n 30 >&2 || true
  die "健康检查失败且无法重启服务" \
    "查看：sudo systemctl status $SERVICE --no-pager；sudo journalctl -u $SERVICE -n 80 --no-pager；确认 .env 与 MySQL"
fi

if wait_for_health 30; then
  log "重启后恢复健康：$SERVICE（$(systemctl is-active "$SERVICE")）"
  logger -t luna-healthcheck "INFO: 重启 $SERVICE 后健康检查恢复"
  exit 0
fi

# ---------------------------------------------------------------------------
# 重启后仍不健康：记录并失败退出，交给 systemd / 人工处理
# ---------------------------------------------------------------------------
logger -t luna-healthcheck "ERROR: 重启 $SERVICE 后健康检查仍失败（$HEALTH_URL）"
warn "重启后仍不健康，最近日志如下："
systemctl status "$SERVICE" --no-pager -l 2>&1 | tail -n 25 >&2 || true
journalctl -u "$SERVICE" -n 50 --no-pager 2>&1 | tail -n 50 >&2 || true
die "健康检查失败：$HEALTH_URL" \
  "见上方 systemctl status 与 journal；常见原因：MySQL 不可用、.env 密钥错误、端口 3000 被占用、内存不足（MemoryMax=768M）"
