import { User } from '../db/models/index.js'
import { readBearer, verifyToken } from '../core/jwt.js'
import { passwordChangeRequired, unauthorized } from '../core/errors.js'

/**
 * 只校验登录态（不检查首登改密），供「修改密码」等接口使用。
 * @param {import('koa').Context} ctx
 * @param {import('koa').Next} next
 */
export async function adminAuthOnly(ctx, next) {
  const token = readBearer(ctx.get('authorization'))
  if (!token) throw unauthorized('请先登录')

  const payload = verifyToken(token)
  const user = await User.findByPk(payload.id)
  if (!user) throw unauthorized('账号不存在，请重新登录')

  ctx.state.admin = user
  await next()
}

/**
 * 管理员鉴权：校验 Bearer Token，加载管理员，并在首登未改密时拦截写操作。
 * @param {import('koa').Context} ctx
 * @param {import('koa').Next} next
 */
export async function adminAuth(ctx, next) {
  await adminAuthOnly(ctx, async () => {
    if (ctx.state.admin.needPasswordChange && ctx.method !== 'GET') {
      throw passwordChangeRequired()
    }
    await next()
  })
}
