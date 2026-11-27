# =============================================================================
# web.Dockerfile — Luna Blog 前端（站点 + 后台）静态镜像
#
# 多阶段构建：
#   builder 阶段用 pnpm 分别构建 blog-web(base=/) 与 blog-admin(base=/admin/)
#   runtime 阶段用 nginx:alpine 托管两份静态产物，并反代 /api 到后端容器
#
# 构建（在仓库根目录执行，上下文 = 仓库根）：
#   docker build -f docker/web.Dockerfile -t luna-blog-web:local .
# =============================================================================
FROM node:22-alpine AS builder

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true

RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

WORKDIR /src

# 先装依赖（命中缓存）
COPY blog-web/package.json blog-web/pnpm-lock.yaml ./blog-web/
COPY blog-admin/package.json blog-admin/pnpm-lock.yaml ./blog-admin/
RUN cd blog-web && pnpm install --frozen-lockfile --ignore-scripts \
 && cd ../blog-admin && pnpm install --frozen-lockfile --ignore-scripts

# 再拷源码构建
COPY blog-web ./blog-web
COPY blog-admin ./blog-admin
RUN cd blog-web && pnpm build \
 && cd ../blog-admin && pnpm build --base=/admin/

# 后台产物必须带 /admin/ base，否则部署到 /admin/ 后资源 404
RUN grep -q '/admin/assets/' blog-admin/dist/index.html


FROM nginx:1.27-alpine AS runtime

# 站点静态产物 → /usr/share/nginx/html/web
COPY --from=builder /src/blog-web/dist /usr/share/nginx/html/web
# 后台静态产物 → /usr/share/nginx/html/admin
COPY --from=builder /src/blog-admin/dist /usr/share/nginx/html/admin

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/robots.txt >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
