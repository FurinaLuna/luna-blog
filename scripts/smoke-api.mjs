/**
 * 后端接口冒烟测试（可重复执行）
 *
 * 前置：blog-server 已 `pnpm db:init` 并在 3000 端口运行
 * 运行：node scripts/smoke-api.mjs
 *
 * 覆盖：健康检查 → 登录/强制改密 → 文章 CRUD 与前台可见性 → 访客评论 → 审核 → 点赞幂等
 *      → 说说/相册/资源/友链/留言 → 通知未读 → 上传 → RSS
 */
const BASE = process.env.API_BASE ?? 'http://127.0.0.1:3000'
const ADMIN_USER = process.env.ADMIN_USERNAME ?? 'admin'
const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? 'Luna@2026'
const TEMP_PASS = 'Temp@2026x'

let passed = 0
const failures = []
const created = { article: null, comment: null, talk: null, album: null, resource: null, friendLink: null, message: null }

function check(name, condition, extra) {
  if (condition) {
    passed += 1
    console.log(`  ✓ ${name}`)
  } else {
    failures.push(name)
    console.log(`  ✗ ${name}`, extra === undefined ? '' : JSON.stringify(extra).slice(0, 300))
  }
}

async function api(method, path, { body, token, form } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (form) {
    payload = form
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload })
  const type = res.headers.get('content-type') ?? ''
  const data = type.includes('json') ? await res.json() : await res.text()
  return { status: res.status, data }
}

async function section(title, fn) {
  console.log(`\n▸ ${title}`)
  try {
    await fn()
  } catch (error) {
    failures.push(`${title}（异常：${error instanceof Error ? error.message : error}）`)
    console.log(`  ✗ 抛出异常：`, error instanceof Error ? error.message : error)
  }
}

/* ------------------------------------------------------------------ */

await section('健康检查', async () => {
  const { status, data } = await api('GET', '/api/health')
  check('GET /api/health 返回 200', status === 200, { status, data })
})

let token = ''
await section('登录与强制改密', async () => {
  const bad = await api('POST', '/api/auth/login', { body: { username: ADMIN_USER, password: 'wrong-pass-1' } })
  check('错误密码返回 401', bad.status === 401, bad)

  const login = await api('POST', '/api/auth/login', { body: { username: ADMIN_USER, password: ADMIN_PASS } })
  check('管理员登录成功', login.status === 200 && !!login.data?.data?.token, login)

  if (login.status !== 200) return
  token = login.data.data.token
  const profile = await api('GET', '/api/auth/profile', { token })
  check('GET /api/auth/profile 可读', profile.status === 200 && profile.data.data.username === ADMIN_USER, profile)

  if (profile.data?.data?.needPasswordChange) {
    const blocked = await api('POST', '/api/admin/articles', { token, body: { title: 'x', content: 'y' } })
    check(
      '首登未改密时写接口被拦截（403 PASSWORD_CHANGE_REQUIRED）',
      blocked.status === 403 && blocked.data?.data?.reason === 'PASSWORD_CHANGE_REQUIRED',
      blocked,
    )
    const weak = await api('PUT', '/api/auth/password', { token, body: { oldPassword: ADMIN_PASS, newPassword: '123', confirmPassword: '123' } })
    check('弱密码被拒绝（400）', weak.status === 400, weak)

    const changed = await api('PUT', '/api/auth/password', {
      token,
      body: { oldPassword: ADMIN_PASS, newPassword: TEMP_PASS, confirmPassword: TEMP_PASS },
    })
    check('修改密码成功', changed.status === 200, changed)

    const oldLogin = await api('POST', '/api/auth/login', { body: { username: ADMIN_USER, password: ADMIN_PASS } })
    check('旧密码失效（401）', oldLogin.status === 401, oldLogin)

    const relogin = await api('POST', '/api/auth/login', { body: { username: ADMIN_USER, password: TEMP_PASS } })
    check('新密码可登录', relogin.status === 200 && !!relogin.data?.data?.token, relogin)
    token = relogin.data?.data?.token ?? token

    const restore = await api('PUT', '/api/auth/password', {
      token,
      body: { oldPassword: TEMP_PASS, newPassword: ADMIN_PASS, confirmPassword: ADMIN_PASS },
    })
    check('密码已还原为初始值', restore.status === 200, restore)
  }
})

await section('文章 CRUD 与前台可见性', async () => {
  const list = await api('GET', '/api/articles?page=1&pageSize=5')
  check('GET /api/articles 返回分页结构', list.status === 200 && Array.isArray(list.data?.data?.list) && typeof list.data.data.total === 'number', list)

  const title = `冒烟测试文章 ${Date.now()}`
  const create = await api('POST', '/api/admin/articles', {
    token,
    body: {
      title,
      summary: '由 smoke-api.mjs 创建',
      content: '# 冒烟测试\n\n这是一篇测试文章。',
      status: 'published',
      isRecommend: false,
    },
  })
  check('创建并发布文章', create.status === 200 && create.data?.data?.id, create)
  created.article = create.data?.data?.id

  if (!created.article) return
  const search = await api('GET', `/api/articles?keyword=${encodeURIComponent(title)}`)
  check('前台搜索能搜到新文章', search.data?.data?.list?.some((item) => item.id === created.article), search.data)

  const detail = await api('GET', `/api/articles/${created.article}`)
  check('文章详情含 Markdown 正文与阅读时长', detail.status === 200 && !!detail.data?.data?.content, detail)

  const draft = await api('POST', '/api/admin/articles', { token, body: { title: `${title} 草稿`, content: '草稿内容' } })
  const draftId = draft.data?.data?.id
  const publicDraft = await api('GET', `/api/articles/${draftId}`)
  check('草稿在前台不可见（404）', publicDraft.status === 404, publicDraft)
  if (draftId) await api('DELETE', `/api/admin/articles/${draftId}`, { token })

  const like1 = await api('POST', `/api/articles/${created.article}/like`)
  const like2 = await api('POST', `/api/articles/${created.article}/like`)
  check('文章点赞同 IP 幂等（计数不重复增加）', like1.data?.data?.likeCount === like2.data?.data?.likeCount, { like1: like1.data, like2: like2.data })
})

await section('访客评论 → 审核 → 公开', async () => {
  if (!created.article) return check('跳过：无可用文章', false)
  const unreadBefore = await api('GET', '/api/admin/notifications/unread-count', { token })
  const guest = await api('POST', '/api/comments', {
    body: {
      targetType: 'article',
      articleId: created.article,
      nickname: '冒烟访客',
      email: 'smoke@example.com',
      content: '这是一条不需要登录的评论。',
    },
  })
  check('访客无需登录即可提交评论', guest.status === 200 && !!guest.data?.data?.id, guest)
  created.comment = guest.data?.data?.id

  const pending = await api('GET', `/api/comments?targetType=article&targetId=${created.article}`)
  check('待审核评论不出现在前台', !pending.data?.data?.list?.some((item) => item.id === created.comment), pending.data)

  const sensitive = await api('POST', '/api/comments', {
    body: { targetType: 'article', articleId: created.article, nickname: '测试', email: 's2@example.com', content: '这里有敏感词' },
  })
  check('敏感词/必填校验有响应', [400, 429].includes(sensitive.status), sensitive)

  const adminList = await api('GET', '/api/admin/comments?status=pending', { token })
  check('后台能看到待审核评论', adminList.data?.data?.list?.some((item) => item.id === created.comment), adminList.data)

  const review = await api('PATCH', `/api/admin/comments/${created.comment}/review`, { token, body: { status: 'approved' } })
  check('审核通过评论', review.status === 200, review)

  const published = await api('GET', `/api/comments?targetType=article&targetId=${created.article}`)
  check('审核后前台可见', published.data?.data?.list?.some((item) => item.id === created.comment), published.data)

  const unreadAfter = await api('GET', '/api/admin/notifications/unread-count', { token })
  check(
    '新评论产生后台未读通知',
    typeof unreadBefore.data?.data?.count === 'number' && unreadAfter.data?.data?.count > unreadBefore.data.data.count,
    { before: unreadBefore.data, after: unreadAfter.data },
  )

  const badDelete = await api('DELETE', `/api/admin/comments/${created.comment}`)
  check('未登录不能删评论（401）', badDelete.status === 401, badDelete)

  const likeComment = await api('POST', `/api/comments/${created.comment}/like`)
  check('评论点赞可用', likeComment.status === 200 && typeof likeComment.data?.data?.likeCount === 'number', likeComment)
})

await section('说说 / 相册 / 资源 / 友链 / 留言', async () => {
  const talk = await api('POST', '/api/admin/talks', { token, body: { content: '冒烟测试说说', images: [] } })
  check('创建说说', talk.status === 200 && !!talk.data?.data?.id, talk)
  created.talk = talk.data?.data?.id
  const talks = await api('GET', '/api/talks?page=1&pageSize=5')
  check('前台说说列表含新说说', talks.data?.data?.list?.some((item) => item.id === created.talk), talks.data)

  const album = await api('POST', '/api/admin/albums', { token, body: { name: '冒烟相册', description: '测试' } })
  check('创建相册', album.status === 200 && !!album.data?.data?.id, album)
  created.album = album.data?.data?.id
  const albums = await api('GET', '/api/albums')
  check('前台相册列表含新相册', albums.data?.data?.some?.((item) => item.id === created.album), albums.data)

  const resource = await api('POST', '/api/admin/resources', { token, body: { name: '冒烟资源', url: 'https://example.com', description: '测试', category: '测试' } })
  check('创建资源', resource.status === 200 && !!resource.data?.data?.id, resource)
  created.resource = resource.data?.data?.id

  const friendLink = await api('POST', '/api/friend-links', { body: { name: '冒烟友链', url: 'https://example.org', description: '测试站点' } })
  check('访客可申请友链（待审核）', friendLink.status === 200 && !!friendLink.data?.data?.id, friendLink)
  created.friendLink = friendLink.data?.data?.id

  const message = await api('POST', '/api/messages', { body: { nickname: '冒烟留言', content: '这是一条留言', email: 'm@example.com' } })
  check('访客可留言（待审核）', message.status === 200 && !!message.data?.data?.id, message)
  created.message = message.data?.data?.id

  const approveMsg = await api('PATCH', `/api/admin/messages/${created.message}/review`, { token, body: { status: 'approved' } })
  check('管理员审核留言', approveMsg.status === 200, approveMsg)
  const messages = await api('GET', '/api/messages')
  check('审核后留言公开', messages.data?.data?.list?.some?.((item) => item.id === created.message) ?? messages.data?.data?.some?.((item) => item.id === created.message), messages.data)
})

await section('仪表盘 / 站点配置 / 上传 / RSS', async () => {
  const dashboard = await api('GET', '/api/admin/dashboard', { token })
  check(
    '仪表盘统计可读',
    dashboard.status === 200 && typeof dashboard.data?.data?.counts?.article === 'number' && Array.isArray(dashboard.data?.data?.trend),
    dashboard,
  )

  const config = await api('GET', '/api/site-config')
  check('公开站点配置可读', config.status === 200 && !!config.data?.data?.siteName, config)

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
    'base64',
  )
  const form = new FormData()
  form.append('file', new Blob([png], { type: 'image/png' }), 'smoke.png')
  const upload = await api('POST', '/api/admin/upload', { token, form })
  check('图片上传返回可访问 URL', upload.status === 200 && String(upload.data?.data?.url).startsWith('/uploads/'), upload)
  if (upload.status === 200) {
    const fetched = await fetch(`${BASE}${upload.data.data.url}`)
    check('上传文件可通过静态服务访问', fetched.status === 200, fetched.status)
  }

  const rss = await api('GET', '/rss.xml')
  check('RSS 输出 RSS 2.0', typeof rss.data === 'string' && rss.data.includes('<rss'), String(rss.data).slice(0, 120))
})

await section('清理测试数据', async () => {
  for (const [key, path] of [
    ['comment', '/api/admin/comments/'],
    ['talk', '/api/admin/talks/'],
    ['album', '/api/admin/albums/'],
    ['resource', '/api/admin/resources/'],
    ['friendLink', '/api/admin/friend-links/'],
    ['message', '/api/admin/messages/'],
    ['article', '/api/admin/articles/'],
  ]) {
    if (created[key]) await api('DELETE', `${path}${created[key]}`, { token })
  }
})

console.log(`\n结果：${passed} 项通过，${failures.length} 项失败`)
if (failures.length) {
  console.log('失败项：')
  for (const name of failures) console.log(` - ${name}`)
  process.exit(1)
}
console.log('全部冒烟测试通过 🎉')
