# =============================================================================
# api.Dockerfile — Luna Blog 后端（Koa 3 + Sequelize + MySQL）运行镜像
#
# 构建（在仓库根目录执行，上下文 = 仓库根）：
#   docker build -f docker/api.Dockerfile -t luna-blog-api:local .
#
# 说明：
#   * 生产依赖用 pnpm --prod 安装，镜像里不含 devDependencies
#   * 以非 root 用户运行（node:alpine 自带 node 用户组）
#   * 上传目录默认挂到 /data/uploads（compose 里映射宿主机目录）
#   * 健康检查直接打 /api/health，容器不健康时 compose 会重启
# =============================================================================
FROM node:22-alpine AS deps

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true

RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

WORKDIR /app

# 只先拷贝依赖清单，命中 Docker 层缓存
COPY blog-server/package.json blog-server/pnpm-lock.yaml ./

# 生产依赖（--prod 会跳过 devDependencies）
RUN pnpm install --prod --frozen-lockfile --ignore-scripts


FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=/data/uploads

WORKDIR /app

# 运行期只需要源码 + 生产依赖
COPY --from=deps /app/node_modules ./node_modules
COPY blog-server/package.json ./package.json
COPY blog-server/src ./src
COPY blog-server/scripts ./scripts

RUN mkdir -p /data/uploads && chown -R node:node /data /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "src/server.js"]
