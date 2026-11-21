import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { unauthorized } from './errors.js'

/**
 * @param {{ id: number, username: string }} payload
 */
export function signToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn })
}

/**
 * @param {string} token
 * @returns {{ id: number, username: string, iat: number, exp: number }}
 */
export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret)
    if (typeof decoded === 'string' || typeof decoded.id !== 'number') {
      throw new Error('invalid payload')
    }
    return /** @type {{ id: number, username: string, iat: number, exp: number }} */ (decoded)
  } catch {
    throw unauthorized('登录已过期，请重新登录')
  }
}

/**
 * 从 Authorization 头提取令牌。
 * @param {string | undefined} header
 */
export function readBearer(header) {
  if (!header) return ''
  const matched = /^Bearer\s+(.+)$/i.exec(header.trim())
  return matched ? matched[1].trim() : ''
}
