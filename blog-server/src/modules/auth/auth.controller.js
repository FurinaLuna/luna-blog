import { z } from 'zod'
import { ok } from '../../core/response.js'
import { parseInput } from '../../core/validate.js'
import { clientIp } from '../../core/text.js'
import { changePassword, login } from './auth.service.js'

const loginSchema = z.object({
  username: z.string().trim().min(3, '请输入用户名').max(50),
  password: z.string().min(1, '请输入密码').max(64),
})

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, '请输入原密码').max(64),
    newPassword: z
      .string()
      .min(8, '新密码至少 8 位')
      .max(32, '新密码最多 32 位')
      .regex(/[a-zA-Z]/, '新密码需包含字母')
      .regex(/\d/, '新密码需包含数字'),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.confirmPassword || data.confirmPassword === data.newPassword, {
    message: '两次输入的新密码不一致',
    path: ['confirmPassword'],
  })

/** POST /api/auth/login */
export async function handleLogin(ctx) {
  const input = parseInput(loginSchema, ctx.request.body)
  const result = await login({ ...input, ip: clientIp(ctx) })
  ok(ctx, result, '登录成功')
}

/** GET /api/auth/profile */
export async function handleProfile(ctx) {
  ok(ctx, ctx.state.admin.toSafeJSON())
}

/** PUT /api/auth/password */
export async function handleChangePassword(ctx) {
  const input = parseInput(passwordSchema, ctx.request.body)
  const user = await changePassword(ctx.state.admin, input)
  ok(ctx, user, '密码修改成功')
}
