import bcrypt from 'bcryptjs'
import { User } from '../../db/models/index.js'
import { signToken } from '../../core/jwt.js'
import { badRequest, unauthorized } from '../../core/errors.js'
import { assertRateLimit } from '../../core/rate-limit.js'

/**
 * 管理员登录。失败不区分「用户不存在 / 密码错误」，避免账号枚举。
 * @param {{ username: string, password: string, ip: string }} input
 */
export async function login({ username, password, ip }) {
  assertRateLimit(`login:${ip}`, {
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: '登录尝试过于频繁，请 15 分钟后再试',
  })

  const user = await User.findOne({ where: { username } })
  if (!user) throw unauthorized('用户名或密码错误')

  const matched = await bcrypt.compare(password, user.password)
  if (!matched) throw unauthorized('用户名或密码错误')

  user.lastLoginAt = new Date()
  await user.save()

  return {
    token: signToken({ id: user.id, username: user.username }),
    user: user.toSafeJSON(),
  }
}

/**
 * 修改密码（首登强制改密也走这里）。
 * @param {User} user
 * @param {{ oldPassword: string, newPassword: string }} input
 */
export async function changePassword(user, { oldPassword, newPassword }) {
  if (oldPassword === newPassword) throw badRequest('新密码不能与原密码相同')

  const matched = await bcrypt.compare(oldPassword, user.password)
  if (!matched) throw badRequest('原密码不正确')

  user.password = await bcrypt.hash(newPassword, 10)
  user.needPasswordChange = false
  await user.save()

  return user.toSafeJSON()
}
