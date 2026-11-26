# Luna Blog 运维手册（RUNBOOK）

> 适用环境：Ubuntu 24.04 / 2 核 4GB / 公网 `43.143.72.12` / 备案进行中（暂用纯 HTTP）。
> 本手册里的路径、账号、变量名与 `deploy/ops/*.sh`、`deploy/systemd/*`、`deploy/nginx/*` 一一对应。
> 标注 **待验证** 的条目表示：仓库里无法 100% 确认线上实际值，操作前先在服务器上核对。

---

## 1. 架构与路径总览

### 1.1 请求链路

```
浏览器 ──HTTP:80──> nginx
                     ├─ /                 → /var/www/luna-blog/current/web       （blog-web 静态）
                     ├─ /assets/          → current/web/assets                   （长缓存）
                     ├─ /admin/           → current/admin（仅 127.0.0.1/::1）    （blog-admin，base=/admin/）
                     ├─ /api/             → 反代 http://127.0.0.1:3000           （blog-server）
                     ├─ /uploads/         → /var/www/luna-blog/data/uploads      （用户上传）
                     └─ /robots.txt /sitemap.xml /rss.xml → 反代 127.0.0.1:3000
                                          blog-server（systemd: luna-blog.service，User=luna-blog，PORT=3000）
```

备案期后台访问方式（公网不允许直连 `/admin/`）：

```bash
# 本机执行，把服务器 127.0.0.1:80 映射到本机 8080
ssh -L 8080:127.0.0.1:80 ubuntu@43.143.72.12
# 浏览器打开 http://127.0.0.1:8080/admin/
```

### 1.2 目录与权限（服务器）

| 路径 | 属主:属组 | 权限 | 用途 |
| --- | --- | --- | --- |
| `/var/www/luna-blog` | `root:root` | `755` | 站点根，**deploy 不可写**（软链必须 sudo 创建） |
| `/var/www/luna-blog/src` | `deploy:deploy` | `755` | 后端源码根 |
| `/var/www/luna-blog/src/blog-server` | `deploy:deploy` | `755` | Node 应用（`.env` 除外，见下） |
| `/var/www/luna-blog/releases/<版本>` | `deploy:deploy` | `755` | 前端产物 `web/` + `admin/` |
| `/var/www/luna-blog/current` | `root` 创建的软链 | — | → `releases/<版本>` |
| `/var/www/luna-blog/data` | `luna-blog:luna-blog` | `750` | 运行期数据 |
| `/var/www/luna-blog/data/uploads` | `luna-blog:luna-blog` | `750` | 上传文件（后端唯一可写目录） |
| `/var/www/luna-blog/secrets` | `root:luna-blog` | `750` | 密钥目录 |
| `secrets/mysql.txt` | `root:luna-blog` | `640` | `DB_NAME` / `DB_USER` / `DB_PASSWORD` |
| `secrets/admin.txt` | `root:luna-blog` | `640` | `ADMIN_USERNAME` / `ADMIN_PASSWORD` |
| `secrets/jwt.txt` | `root:luna-blog` | `640` | `JWT_SECRET` |
| `/var/www/luna-blog/backups` | `root:root` | `700` | 备份产物 |
| `/var/www/luna-blog/src/deploy/ops` | `deploy:deploy` | `755` | 本手册配套脚本落点 |
| `/etc/systemd/system/luna-blog.service` | `root:root` | `644` | 后端服务单元 |
| `/etc/nginx/sites-available/luna-blog` | `root:root` | `644` | 站点配置 |

### 1.3 账号

| 账号 | 用途 | 说明 |
| --- | --- | --- |
| `ubuntu` | 登录/运维 | 云厂商默认账号，带 sudo |
| `deploy` | 部署、切软链、pnpm install | 有 `sudo NOPASSWD`（`/etc/sudoers.d/90-deploy`，**待验证** 文件名） |
| `luna-blog` | 运行后端的系统用户 | `nologin`，只能读源码、写 `data/uploads`、读 `.env` |

### 1.4 关键常量（与 `deploy/ops/lib.sh` 一致）

| 变量 | 值 |
| --- | --- |
| `APP_ROOT` | `/var/www/luna-blog` |
| `SRC_DIR` | `/var/www/luna-blog/src` |
| `RELEASES_DIR` | `/var/www/luna-blog/releases` |
| `CURRENT_LINK` | `/var/www/luna-blog/current` |
| `UPLOAD_DIR` | `/var/www/luna-blog/data/uploads` |
| `SECRETS_DIR` | `/var/www/luna-blog/secrets` |
| `BACKUP_DIR` | `/var/www/luna-blog/backups` |
| `SERVICE` | `luna-blog` |
| `HEALTH_URL` | `http://127.0.0.1:3000/api/health` |
| `KEEP_RELEASES` / `KEEP_DAYS` / `KEEP_WEEKS` | `5` / `7` / `4` |

---

## 2. 首次部署

以下命令默认在服务器上以带 sudo 的账号执行；`<...>` 为需要替换的值。

### 2.1 系统准备与账号

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl ca-certificates rsync nginx mysql-server \
  mysql-client gzip tar coreutils util-linux ufw fail2ban

# 部署账号（如云镜像已自带则跳过）
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG sudo deploy
echo 'deploy ALL=(ALL) NOPASSWD:ALL' | sudo tee /etc/sudoers.d/90-deploy
sudo chmod 440 /etc/sudoers.d/90-deploy
sudo visudo -c

# 后端运行账号（系统用户，不建 home、不可登录）
sudo adduser --system --group --no-create-home --shell /usr/sbin/nologin luna-blog
```

把本机公钥追加到 `/home/deploy/.ssh/authorized_keys`（`ubuntu` 同理），随后确认 `ssh deploy@43.143.72.12` 可免密登录。

### 2.2 目录与权限

```bash
sudo mkdir -p /var/www/luna-blog/{src,releases,data/uploads,secrets,backups}
sudo chown root:root /var/www/luna-blog
sudo chmod 755 /var/www/luna-blog

sudo chown -R deploy:deploy /var/www/luna-blog/src /var/www/luna-blog/releases

sudo chown -R luna-blog:luna-blog /var/www/luna-blog/data
sudo chmod 750 /var/www/luna-blog/data /var/www/luna-blog/data/uploads

sudo chown root:luna-blog /var/www/luna-blog/secrets
sudo chmod 750 /var/www/luna-blog/secrets

sudo chown root:root /var/www/luna-blog/backups
sudo chmod 700 /var/www/luna-blog/backups
```

> `/var/www/luna-blog` 属 `root:root 755`，因此 `current` 软链由 root（`sudo ln -sfn`）创建，deploy 不能直接改。

### 2.3 MySQL

```bash
sudo mysql <<'SQL'
CREATE DATABASE IF NOT EXISTS luna_blog
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'luna_blog'@'127.0.0.1' IDENTIFIED BY '<强随机密码>';
GRANT ALL PRIVILEGES ON luna_blog.* TO 'luna_blog'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

# 验证
mysql -h 127.0.0.1 -u luna_blog -p -e 'SELECT DATABASE(), VERSION();'
```

> MySQL 8 默认 `caching_sha2_password`，`mysql2` 驱动支持；若连接报认证错误，见 §7「MySQL 认证」。
> **待验证**：本机 MySQL root 的认证方式（`auth_socket` 还是密码），决定要不要 `sudo mysql`。

### 2.4 Node.js 24 与 pnpm

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm i -g pnpm

/usr/bin/node -v      # 期望 v24.x
pnpm -v
sudo -u deploy bash -lc 'command -v pnpm'   # backend-release.sh 用 deploy 身份跑 pnpm
```

> 单元里 `ExecStart=/usr/bin/node` 写死系统路径，不要依赖 nvm。

### 2.5 上传后端源码

在本机仓库根目录执行（Git Bash）：

```bash
# 后端源码
rsync -az --delete -e ssh \
  --exclude node_modules --exclude .env \
  blog-server/ deploy@43.143.72.12:/var/www/luna-blog/src/blog-server/

# 运维脚本与配置（release.sh / backup.sh 等要在服务器上可用）
rsync -az -e ssh deploy/ ubuntu@43.143.72.12:/var/www/luna-blog/src/deploy/
rsync -az -e ssh docs/ops/ ubuntu@43.143.72.12:/var/www/luna-blog/src/docs/ops/

# 服务器上修正属主并加执行权限
sudo chown -R deploy:deploy /var/www/luna-blog/src
sudo chmod +x /var/www/luna-blog/src/deploy/ops/*.sh
```

### 2.6 三个密钥文件与 `.env`

```bash
# 生成强密码示例
openssl rand -base64 24

# 1) 数据库密钥：每行 KEY=VALUE，不要 export、不要引号
sudo tee /var/www/luna-blog/secrets/mysql.txt >/dev/null <<'EOF'
DB_NAME=luna_blog
DB_USER=luna_blog
DB_PASSWORD=<强随机密码>
EOF

# 2) 后台初始管理员（init-db 用）
sudo tee /var/www/luna-blog/secrets/admin.txt >/dev/null <<'EOF'
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<至少 8 位的强密码>
EOF

# 3) JWT 密钥（至少 16 位，建议 32+）
sudo tee /var/www/luna-blog/secrets/jwt.txt >/dev/null <<'EOF'
JWT_SECRET=<openssl rand -base64 32 的输出>
EOF

sudo chown root:luna-blog /var/www/luna-blog/secrets/*.txt
sudo chmod 640 /var/www/luna-blog/secrets/*.txt
```

`/var/www/luna-blog/src/blog-server/.env`（应用启动时由 dotenv 读取，**必须**属 `root:luna-blog 640`，deploy 读不到属正常）：

```bash
sudo tee /var/www/luna-blog/src/blog-server/.env >/dev/null <<'EOF'
NODE_ENV=production
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=luna_blog
DB_USER=luna_blog
DB_PASSWORD=<与 secrets/mysql.txt 一致>
JWT_SECRET=<与 secrets/jwt.txt 一致>
JWT_EXPIRES_IN=7d
UPLOAD_DIR=/var/www/luna-blog/data/uploads
UPLOAD_MAX_IMAGE_MB=5
UPLOAD_MAX_FILE_MB=10
SITE_URL=http://43.143.72.12
CORS_ORIGINS=http://43.143.72.12

# init-db 创建首个管理员用（首次初始化后可删掉这两行）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<与 secrets/admin.txt 一致>
EOF
sudo chown root:luna-blog /var/www/luna-blog/src/blog-server/.env
sudo chmod 640 /var/www/luna-blog/src/blog-server/.env

# 让 luna-blog 能进入源码目录
sudo -u luna-blog test -r /var/www/luna-blog/src/blog-server/.env && echo '.env 可读：OK'
```

> **待验证**：环境变量全集以 `src/config/index.js` 的 zod schema 为准（本文件按该 schema 整理）。
> 注意：`.env` 与 `secrets/*.txt` 有重复字段（DB_*、JWT_SECRET、ADMIN_*），改动时**两处一起改**，否则备份/init-db 会用到旧密码。

### 2.7 安装依赖、初始化数据库、语法自检

```bash
cd /var/www/luna-blog/src/blog-server

sudo -u deploy bash -lc 'cd /var/www/luna-blog/src/blog-server && pnpm install --prod --frozen-lockfile'

# 建表 + 建管理员 + 种子配置（需要能读 .env，因此用 luna-blog 身份）
sudo -u luna-blog env HOME=/tmp /usr/bin/node scripts/init-db.js

# 语法/依赖自检（scripts/check.js 会 import src/app.js，同样需要 luna-blog 身份）
sudo -u luna-blog env HOME=/tmp /usr/bin/node scripts/check.js
```

期望：init-db 输出「初始化完成」，表数 16（`category, tag, article, article_tag, comment, like_record, album, photo, site_config, resource, talk, message, friend_link, notification, user, visit`）。

### 2.8 systemd 单元

```bash
sudo cp /var/www/luna-blog/src/deploy/systemd/luna-blog.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now luna-blog
sudo systemctl status luna-blog --no-pager

# 验证：本机 curl 必须通
curl -fsS http://127.0.0.1:3000/api/health
```

> **待验证**：线上单元以 `systemctl cat luna-blog` 为准；`deploy/systemd/luna-blog.service` 是据部署事实整理的副本，若两者有差异，请把线上内容回写到仓库。

### 2.9 Nginx

```bash
sudo apt-get install -y nginx

sudo cp /var/www/luna-blog/src/deploy/nginx/luna-blog-headers.conf /etc/nginx/snippets/
sudo cp /var/www/luna-blog/src/deploy/nginx/luna-blog-proxy.conf   /etc/nginx/snippets/
sudo cp /var/www/luna-blog/src/deploy/nginx/luna-blog.conf         /etc/nginx/sites-available/luna-blog

sudo ln -sfn /etc/nginx/sites-available/luna-blog /etc/nginx/sites-enabled/luna-blog
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t && sudo systemctl reload nginx
```

> **待验证**：限流 zone（`api_general` / `api_write` / `api_login`）与 `upstream luna_blog_api` 写在站点文件顶部，依赖 `sites-enabled/*` 被 include 在 `http {}` 内。如果 `/etc/nginx/conf.d/` 里已有同名 zone，`nginx -t` 会报 `duplicate zone`，此时删掉重复定义（保留一份即可）。

### 2.10 构建并发布前端

本机（Windows Git Bash，仓库根目录）：

```bash
bash deploy/ops/build-local.sh
# 产物：build/release-<版本>.tgz（版本默认 date +%Y%m%d-%H%M）
scp build/release-<版本>.tgz ubuntu@43.143.72.12:/tmp/release-<版本>.tgz
```

服务器：

```bash
sudo bash /var/www/luna-blog/src/deploy/ops/release.sh <版本>
```

### 2.11 定时任务（健康检查 + 备份）

```bash
sudo cp /var/www/luna-blog/src/deploy/systemd/luna-blog-healthcheck.* /etc/systemd/system/
sudo cp /var/www/luna-blog/src/deploy/systemd/luna-blog-backup.*      /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now luna-blog-healthcheck.timer luna-blog-backup.timer

systemctl list-timers 'luna-blog-*' --no-pager
sudo systemctl start luna-blog-backup.service   # 手动跑一次验证
sudo systemctl status luna-blog-backup.service --no-pager
```

---

## 3. 日常发布流程

### 3.1 前端（改了 blog-web / blog-admin）

```
改代码 → 本机 bash deploy/ops/build-local.sh → scp 到 /tmp/
       → 服务器 release.sh <版本>（解包→chown→nginx -t→切 current→reload→健康检查→保留 5 版）
       → 验证首页 / 后台 / API
```

```bash
# 本机
VERSION=$(date +%Y%m%d-%H%M) bash deploy/ops/build-local.sh
scp build/release-$VERSION.tgz ubuntu@43.143.72.12:/tmp/release-$VERSION.tgz

# 服务器
sudo bash /var/www/luna-blog/src/deploy/ops/release.sh $VERSION

# 验证
curl -I http://43.143.72.12/
curl -s  http://43.143.72.12/api/health
curl -I http://43.143.72.12/rss.xml
```

后台验证要开隧道：`ssh -L 8080:127.0.0.1:80 ubuntu@43.143.72.12` → `http://127.0.0.1:8080/admin/`。
注意浏览器的旧 `index.html` 缓存：Ctrl+F5 强刷，或确认响应头 `Cache-Control: no-cache`。

### 3.2 后端（改了 blog-server）

```bash
# 本机：把源码推到服务器临时目录
rsync -az --delete -e ssh --exclude node_modules --exclude .env \
  blog-server/ ubuntu@43.143.72.12:/tmp/blog-server/

# 服务器：同步 → pnpm install → 语法自检 → 重启 → 健康检查
sudo bash /var/www/luna-blog/src/deploy/ops/backend-release.sh /tmp/blog-server

# 只改了 .env / secrets，不动代码时：
sudo systemctl restart luna-blog
```

`backend-release.sh` 的关键点：

- rsync 带 `--delete`，但**排除** `node_modules` 与 `.env`（线上 `.env` 不会被覆盖）；
- `pnpm install --prod --frozen-lockfile` 以 `deploy` 身份执行（避免 `node_modules` 变 root 属主）；
- 自检命令固定为 `sudo -u luna-blog env HOME=/tmp /usr/bin/node scripts/check.js`（deploy 读不了 `.env`）；
- 失败会自动打印 `systemctl status luna-blog` 与 `journalctl -u luna-blog -n 80`。

### 3.3 发布前/后检查清单

发布前：`systemctl is-active luna-blog`、`df -h /var/www/luna-blog`、本机 `pnpm -C blog-web build` 通过。
发布后：`/api/health` 返回 `{"code":0,...}`、首页 200、`/rss.xml` 200、后台隧道可登录、上一版本仍在 `releases/`。

---

## 4. 回滚

```bash
# 1) 列出可用版本（最新在前，标出当前版本）
bash /var/www/luna-blog/src/deploy/ops/rollback.sh

# 2) 切回某个版本（会 nginx -t → ln -sfn → reload → 健康检查，并写 ROLLBACK.log）
sudo bash /var/www/luna-blog/src/deploy/ops/rollback.sh 20261125-2130

# 3) 验证
curl -I http://43.143.72.12/
curl -s http://43.143.72.12/api/health
tail -n 10 /var/www/luna-blog/releases/ROLLBACK.log
```

- 回滚只切**前端静态产物**。后端代码回滚：用 `backend-release.sh` 指向上一份源码目录重新部署并重启。
- 若要回滚到已被清理的旧版本（超过 5 个），从备份/本机 `build/` 里找 tgz，重新 `release.sh`。
- 回滚记录格式：`ROLLBACK at 2026-11-26T22:50:00+08:00 to 20261125-2130`。

---

## 5. 备份与恢复演练

### 5.1 备份

```bash
# 手动触发（定时器每天 03:30 自动跑）
sudo bash /var/www/luna-blog/src/deploy/ops/backup.sh

# 查看产物
sudo ls -lh /var/www/luna-blog/backups/
sudo cd /var/www/luna-blog/backups && sudo sha256sum -c SHA256SUMS

# 定时器状态
systemctl list-timers 'luna-blog-*' --no-pager
sudo journalctl -u luna-blog-backup.service -n 50 --no-pager
```

产物命名：`db-<YYYYmmdd-HHMMSS>.sql.gz`、`uploads-<YYYYmmdd-HHMMSS>.tar.gz`、`SHA256SUMS`；周日额外生成 `*-weekly` 硬链接。
保留：每日 7 天、每周 4 份（脚本内实现）。`flock` 防止并发，先写 `.partial` 再原子 `mv`。

### 5.2 恢复演练（每季度至少一次，**不要**直接在生产库上试）

```bash
# 1) 恢复到演练库（默认 luna_blog_restore_test，绝不会默认覆盖生产库）
sudo bash /var/www/luna-blog/src/deploy/ops/restore.sh \
  /var/www/luna-blog/backups/db-20261126-033000.sql.gz

# 脚本会校验：表数应 16、user 表行数；不符合会以非 0 退出

# 2) 附带校验上传包（只解压到临时目录，不写 data/uploads）
sudo bash /var/www/luna-blog/src/deploy/ops/restore.sh \
  /var/www/luna-blog/backups/db-20261126-033000.sql.gz \
  --uploads /var/www/luna-blog/backups/uploads-20261126-033000.tar.gz

# 3) 人工比对（结构 / 行数 / 抽样）
#    restore.sh 用的是 MySQL root 的 unix socket 认证（sudo mysql），
#    因为应用账号 luna 只有 luna_blog.* 权限，建/写演练库会 1044。
sudo mysqldump --no-data luna_blog             > /tmp/prod-schema.sql
sudo mysqldump --no-data luna_blog_restore_test > /tmp/restore-schema.sql
diff /tmp/prod-schema.sql /tmp/restore-schema.sql

sudo mysql -e "SELECT table_name, table_rows FROM information_schema.tables
  WHERE table_schema IN ('luna_blog','luna_blog_restore_test') ORDER BY table_name;"
sudo mysql -e "SELECT COUNT(*) FROM luna_blog_restore_test.user;"

# 4) 演练结束后清理
sudo mysql -e 'DROP DATABASE luna_blog_restore_test;'
```

### 5.3 真发生数据损坏时的恢复（生产库，危险）

```bash
# 0) 先停写，避免恢复期间产生新数据
sudo systemctl stop luna-blog

# 1) 先备份"当前坏状态"，留证据
sudo bash /var/www/luna-blog/src/deploy/ops/backup.sh

# 2) 覆盖生产库（必须显式 --force-prod，并交互输入库名确认）
sudo bash /var/www/luna-blog/src/deploy/ops/restore.sh \
  /var/www/luna-blog/backups/db-<要恢复的时间点>.sql.gz luna_blog --force-prod

# 3) 恢复上传目录（先对比，再决定是否 --delete）
sudo rsync -av --ignore-existing /tmp/恢复的上传目录/uploads/ /var/www/luna-blog/data/uploads/

# 4) 启动并验证
sudo chown -R luna-blog:luna-blog /var/www/luna-blog/data/uploads
sudo systemctl start luna-blog
curl -s http://127.0.0.1:3000/api/health
```

---

## 6. 健康检查与日志

### 6.1 健康检查

- 探针：`GET http://127.0.0.1:3000/api/health`，返回 `{"code":0,"message":"ok","data":{"status":"up",...}}`。
- 定时：`luna-blog-healthcheck.timer`（`OnBootSec=60s`、`OnUnitActiveSec=60s`）→ `healthcheck.sh`：
  连续 3 次失败才 `systemctl restart luna-blog`；重启后仍失败则 `logger -t luna-healthcheck` + 非 0 退出（`systemctl --failed` 可见）；磁盘 >80% 也会 `logger` 告警。

```bash
systemctl list-timers 'luna-blog-*' --no-pager
sudo journalctl -t luna-healthcheck -n 50 --no-pager
sudo systemctl status luna-blog-healthcheck.service --no-pager
```

### 6.2 应用日志（journald）

```bash
sudo journalctl -u luna-blog -f
sudo journalctl -u luna-blog --since "30 min ago" --no-pager
sudo journalctl -u luna-blog -p err -n 100 --no-pager
sudo journalctl -u luna-blog -o json-pretty -n 20 --no-pager
sudo journalctl --disk-usage
sudo journalctl --vacuum-size=200M          # 磁盘紧张时清理
```

### 6.3 Nginx 日志

```bash
tail -f /var/log/nginx/luna-blog.access.log
tail -f /var/log/nginx/luna-blog.error.log
sudo nginx -T | grep -E 'limit_req_zone|client_max_body_size|server_name'
sudo logrotate -d /etc/logrotate.d/nginx    # 干跑验证轮转配置
```

> Nginx 默认由 `/etc/logrotate.d/nginx` 每日轮转并保留 14 份；如需调整保留天数，编辑该文件后 `sudo logrotate -f /etc/logrotate.d/nginx`。

### 6.4 MySQL 慢查询

```bash
# 临时开启（重启失效）
sudo mysql -e "SET GLOBAL slow_query_log=1; SET GLOBAL long_query_time=1;"
sudo mysql -e "SHOW VARIABLES LIKE 'slow_query_log%'; SHOW VARIABLES LIKE 'long_query_time';"
sudo tail -f /var/log/mysql/mysql-slow.log
```

持久化（**待验证** 目录名可能因 MySQL 版本而异）：

```bash
sudo tee /etc/mysql/mysql.conf.d/zz-slow.cnf >/dev/null <<'EOF'
[mysqld]
slow_query_log = 1
slow_query_log_file = /var/log/mysql/mysql-slow.log
long_query_time = 1
EOF
sudo systemctl restart mysql
```

### 6.5 常用巡检一行命令

```bash
systemctl is-active luna-blog nginx mysql; \
curl -fsS http://127.0.0.1:3000/api/health; \
df -h /var/www/luna-blog; free -m; \
ls -lh /var/www/luna-blog/backups | tail -n 5
```

---

## 7. 常见故障排查

| 现象 | 优先排查 | 处理 |
| --- | --- | --- |
| **502 Bad Gateway** | 后端是否在跑：`systemctl status luna-blog`；`curl -i http://127.0.0.1:3000/api/health`；`journalctl -u luna-blog -n 100` | 起服务；`.env` 缺失/权限错；MySQL 未启动；端口不是 3000 |
| **403 /admin/** | 这是**预期**：只允许 `127.0.0.1/::1`，公网访问必须 403 | 用 SSH 隧道访问；不要为了让公网能开来删 `deny all`（备案期） |
| **403 /uploads/xxx** | 文件属主/权限：`namei -l /var/www/luna-blog/data/uploads/xxx` | 目录 `luna-blog:luna-blog 750`；新文件由后端写入，若手工拷入需 `chown luna-blog:luna-blog` |
| **404 首页正常但刷新子路由 404** | `current` 软链与 `try_files` | `ls -l /var/www/luna-blog/current`；确认 `try_files $uri $uri/ /index.html` |
| **404 /admin/assets/xxx** | 构建时没带 base | 用 `pnpm -C blog-admin build --base=/admin/`（build-local.sh 会校验 `/admin/assets/` 引用） |
| **404 全部静态资源** | `current` 指向的版本目录不完整 | `ls /var/www/luna-blog/releases/`；`release.sh` 重新发布；或 `rollback.sh` |
| **500 API 报错** | `journalctl -u luna-blog -n 100`；`.env` 能否被 luna-blog 读到；DB 连通性 | `sudo -u luna-blog env HOME=/tmp /usr/bin/node scripts/check.js`；修 `.env` 权限 `root:luna-blog 640` |
| **413 Request Entity Too Large** | `client_max_body_size` 与后端 `UPLOAD_MAX_*` | 当前 12m（图片 5MB/文件 10MB）；`sudo nginx -T \| grep client_max_body_size` |
| **上传 EACCES / EROFS** | `ReadWritePaths`、`ProtectSystem=strict`、目录属主 | `sudo -u luna-blog test -w /var/www/luna-blog/data/uploads && echo OK`；`chown -R luna-blog:luna-blog data/uploads`；确认单元里 `Environment=UPLOAD_DIR=...` |
| **429 Too Many Requests** | 命中限流：`api_general 20r/s burst 40`、`api_write 2r/s`、`api_login 6r/m` | 看 access log；正常流量可调 zone（改站点文件→`nginx -t`→reload）；前台批量点赞会触发 `api_write` |
| **磁盘满** | `df -h`、`du -sh /var/www/luna-blog/*`、`journalctl --disk-usage` | 清理旧备份/日志；`journalctl --vacuum-size=200M`；备份保留策略见 §5 |
| **端口 3000 被占用** | `sudo ss -ltnp \| grep :3000` | 杀掉残留进程或改 `PORT`（同时改 `.env` 与 `HEALTH_URL`/nginx upstream） |
| **systemd 起不来且提示 start-limit** | `systemctl status luna-blog` 里的 `start request repeated too quickly` | 修好根因后 `sudo systemctl reset-failed luna-blog && sudo systemctl start luna-blog` |
| **`duplicate zone` / nginx -t 失败** | zone 在 conf.d 与站点文件重复定义 | 只保留一处；`sudo nginx -T \| grep limit_req_zone` |
| **MySQL 认证失败** | `mysql -h 127.0.0.1 -u luna_blog -p` | 确认 `luna_blog@127.0.0.1` 存在；必要时 `ALTER USER ... IDENTIFIED WITH caching_sha2_password BY '...';` |
| **后台能登录但接口 403** | `/api/admin/` 的 `allow` 列表 | 走隧道时来源是 `127.0.0.1`；若经多层代理需确认 `$remote_addr` |

---

## 8. 备案后切 HTTPS 步骤清单

> 前提：域名备案通过，且 DNS 已解析到 `43.143.72.12`。以下顺序照抄即可，**HSTS 放最后**。

- [ ] **1. DNS**：添加 A 记录 `luna.example.com → 43.143.72.12`；`dig +short luna.example.com` 能看到 IP（生效可能要几分钟到几小时）。
- [ ] **2. server_name**：编辑 `/etc/nginx/sites-available/luna-blog`，改成
      `server_name luna.example.com 43.143.72.12;`（保留 IP 便于过渡期访问），`sudo nginx -t && sudo systemctl reload nginx`。
- [ ] **3. 证书**：`sudo apt-get install -y certbot python3-certbot-nginx`，然后
      `sudo certbot --nginx -d luna.example.com --redirect -m <你的邮箱> --agree-tos --no-eff-email`。
      certbot 会改写站点文件生成 443 server 块与 80→443 跳转；确认改写后**安全头/限流/上传配置仍在**（必要时手工补 `include snippets/luna-blog-headers.conf;`）。
- [ ] **4. 验证 HTTPS**：`curl -I https://luna.example.com/`、`curl -I http://luna.example.com/`（应 301 到 https）、`curl -s https://luna.example.com/api/health`。
- [ ] **5. HSTS（确认全站 HTTPS 正常后再加）**：在 443 server 块加
      `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`，`nginx -t` + reload。
- [ ] **6. SITE_URL / CORS**：`.env` 里 `SITE_URL=https://luna.example.com`、`CORS_ORIGINS=https://luna.example.com`，`sudo systemctl restart luna-blog`（影响 RSS/sitemap 里的绝对链接）。
- [ ] **7. 后台隧道**：备案后 `/admin/` 仍只允许本机；隧道改为
      `ssh -L 8080:127.0.0.1:443 ubuntu@43.143.72.12` → `https://127.0.0.1:8080/admin/`（自签/证书域名不匹配时浏览器需接受，或改用 `http://127.0.0.1:80` 隧道）。
- [ ] **8. 自动续期**：`systemctl list-timers | grep certbot`（或 `certbot renew --dry-run` 验证）；续期后 `nginx` 会自动 reload（certbot 部署钩子）。
- [ ] **9. 收尾**：更新 `docs/ops/RUNBOOK.md` 里的域名与 `SITE_URL`；把 `server_name` 的 IP 保留一段时间后再移除。

---

## 9. 安全基线清单

- [ ] **防火墙**：`sudo ufw default deny incoming`、`sudo ufw allow 22,80,443/tcp`、`sudo ufw enable`、`sudo ufw status verbose`。
      注意：云厂商安全组也要只放行 22/80/443（后台不暴露端口，不做额外放行）。
- [ ] **SSH**：`PasswordAuthentication no`、`PermitRootLogin prohibit-password`、`PubkeyAuthentication yes`（`/etc/ssh/sshd_config.d/*.conf`），改完 `sudo sshd -t && sudo systemctl reload ssh`，**另开一个会话验证**再退出。
- [ ] **fail2ban**：`sudo apt-get install -y fail2ban`，启用 `sshd` jail；`sudo fail2ban-client status sshd`。
- [ ] **`/admin/` 与 `/api/admin/` 仅本机**：`sudo nginx -T | grep -A3 'location ^~ /admin/'`；公网必须 403。
- [ ] **`.env`**：`root:luna-blog 640`；`ls -l /var/www/luna-blog/src/blog-server/.env`；绝不放进前端产物/仓库。
- [ ] **`secrets/`**：目录 `root:luna-blog 750`，文件 `640`；`sudo ls -l /var/www/luna-blog/secrets`。
- [ ] **备份目录**：`root:root 700`；备份文件不含明文密码（mysqldump 无 `--password` 参数、用 `MYSQL_PWD` 环境变量）。
- [ ] **密钥保管**：`JWT_SECRET` / DB 密码 / ADMIN 密码只在密码管理器与服务器 `secrets/` 各一份；轮换流程：改 `secrets/*.txt` + `.env` → `systemctl restart luna-blog` → 重新备份 → 旧备份按保留策略过期。
- [ ] **系统更新**：`sudo apt-get update && sudo apt-get upgrade -y`；建议启用 `unattended-upgrades`（至少安全更新）。
- [ ] **日志**：确认 journald 未无限增长（`journalctl --disk-usage`），nginx 日志有轮转。
- [ ] **管理端账号**：首次登录后立即改掉 `needPasswordChange=true` 的初始密码；`user` 表里不应有测试账号。
- [ ] **限流**：`/api/auth/login` 6r/m 生效（`ab`/`curl` 连打应出现 429），访客写接口有 `api_write` 限频。

---

## 10. 运维脚本速查

所有脚本支持 `DRY_RUN=1` 只打印不执行；除 `lib.sh` 外都应为可执行（`chmod +x`）。

| 脚本 | 在哪跑 | 用途 | 示例 |
| --- | --- | --- | --- |
| `deploy/ops/build-local.sh` | 本机 Windows Git Bash | 构建 web+admin 并打 tgz | `VERSION=20261126-2300 bash deploy/ops/build-local.sh` |
| `deploy/ops/release.sh` | 服务器 | 解包、切 `current`、reload、健康检查、清理旧版 | `sudo bash .../release.sh 20261126-2300` |
| `deploy/ops/backend-release.sh` | 服务器 | 同步后端源码、install、自检、重启 | `sudo bash .../backend-release.sh /tmp/blog-server` |
| `deploy/ops/rollback.sh` | 服务器 | 切回旧版本前端 | `sudo bash .../rollback.sh 20261125-2130` |
| `deploy/ops/backup.sh` | 服务器 | MySQL + uploads 备份、sha256、清理 | `sudo bash .../backup.sh` |
| `deploy/ops/restore.sh` | 服务器 | 恢复到演练库/指定库、校验表数 | `sudo bash .../restore.sh <db.sql.gz>` |
| `deploy/ops/healthcheck.sh` | 服务器（timer 调） | 3 次失败重启后端、磁盘告警 | `sudo bash .../healthcheck.sh` |
| `deploy/ops/lib.sh` | — | 共享变量与函数（被 source） | — |

---

## 11. 验收清单（18 条）

- [ ] 1. `http://43.143.72.12/` 返回 200，且是 blog-web 首页（`curl -I`）。
- [ ] 2. `http://43.143.72.12/api/health` 返回 `{"code":0,...}`。
- [ ] 3. 刷新前端子路由（如 `/articles/<id>`）不 404（SPA `try_files` 生效）。
- [ ] 4. `/assets/` 下静态资源 200，且响应头有较长 `Cache-Control`/`Expires`。
- [ ] 5. `/robots.txt`、`/sitemap.xml`、`/rss.xml` 返回 200 且内容来自后端。
- [ ] 6. 公网访问 `/admin/` 返回 403（不允许直连）。
- [ ] 7. SSH 隧道下 `/admin/` 可打开、可登录、刷新子路由不 404。
- [ ] 8. 公网访问 `/api/admin/...` 返回 403。
- [ ] 9. 登录接口连打会命中限流（429，`api_login 6r/m`）。
- [ ] 10. 访客写接口（评论/留言/友链/访问/点赞）能写入，且连打会 429（`api_write 2r/s`）。
- [ ] 11. 上传图片/文件成功，文件落到 `/var/www/luna-blog/data/uploads`，可直接访问 `/uploads/...`。
- [ ] 12. 超过 12MB 的上传返回 413（`client_max_body_size 12m`）。
- [ ] 13. `systemctl is-active luna-blog nginx mysql` 均为 active，`systemctl is-enabled luna-blog` 为 enabled。
- [ ] 14. `systemctl list-timers 'luna-blog-*'` 能看到 healthcheck（约 60s）与 backup（03:30）。
- [ ] 15. `/var/www/luna-blog/backups/` 有 db/uploads/SHA256SUMS，`sha256sum -c` 通过。
- [ ] 16. 恢复演练成功：演练库表数 16、`user` 表行数可读；演练库已按需清理。
- [ ] 17. 权限核对：`ls -ld /var/www/luna-blog/{src,releases,data/data/uploads,secrets,backups}` 与 §1.2 一致；`secrets/*.txt` 为 `root:luna-blog 640`。
- [ ] 18. 安全基线：`ufw status` 仅 22/80/443；SSH 禁密码登录；fail2ban 运行；`current` 软链指向最新版本且 `rollback.sh` 可列出 ≥2 个版本。

---

## 附录 A：发布版本目录结构

```
/var/www/luna-blog/releases/
├── 20261126-2145/          # 旧版本（保留最近 5 个）
├── 20261126-2244/          # 当前版本
│   ├── web/                # blog-web dist 内容（index.html、assets/…）
│   └── admin/              # blog-admin dist 内容（base=/admin/）
├── ROLLBACK.log            # 每次 rollback.sh 追加一行
└── .backup.lock            # 备份并发锁（在 backups/ 下）
```

## 附录 B：待验证项汇总

1. 线上 `luna-blog.service` 的完整内容（以 `systemctl cat luna-blog` 为准）。
2. 限流 zone / upstream 是否已在其它 nginx 配置中定义（`nginx -T | grep -E 'limit_req_zone|luna_blog_api'`）。
3. `deploy` 账号的 sudoers 文件名与授权范围（`/etc/sudoers.d/`）。
4. 本机 MySQL root 认证方式（影响 §2.3 是否需要 `sudo mysql`）。
5. `blog-server/.env` 的完整变量集合（以 `src/config/index.js` 的 zod schema 为准）。
6. MySQL 慢查询配置路径（`/etc/mysql/mysql.conf.d/` 在不同发行版/版本可能不同）。
