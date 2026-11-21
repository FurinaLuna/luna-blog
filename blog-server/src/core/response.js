/**
 * 统一成功响应：HTTP 200 + { code: 0, message, data }。
 * @param {import('koa').Context} ctx
 * @param {unknown} data
 * @param {string} [message]
 */
export function ok(ctx, data = null, message = 'ok') {
  ctx.status = 200
  ctx.body = { code: 0, message, data }
}

/**
 * 统一分页结果。
 * @template T
 * @param {T[]} list
 * @param {number} total
 * @param {{ page: number, pageSize: number }} paging
 */
export function pageData(list, total, { page, pageSize }) {
  return {
    list,
    total,
    page,
    pageSize,
    totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
  }
}
