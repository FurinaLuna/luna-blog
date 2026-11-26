import Router from '@koa/router'

import { registerAuthRoutes } from '../modules/auth/auth.routes.js'
import { registerArticleRoutes } from '../modules/article/article.routes.js'
import { registerTaxonomyRoutes } from '../modules/taxonomy/taxonomy.routes.js'
import { registerCommentRoutes } from '../modules/comment/comment.routes.js'
import { registerSiteRoutes } from '../modules/site/site.routes.js'
import { registerNotificationRoutes } from '../modules/notification/notification.routes.js'
import { registerUploadRoutes } from '../modules/upload/upload.routes.js'
import { registerTalkRoutes } from '../modules/talk/talk.routes.js'
import { registerMessageRoutes } from '../modules/message/message.routes.js'
import { registerAlbumRoutes } from '../modules/album/album.routes.js'
import { registerResourceRoutes } from '../modules/resource/resource.routes.js'
import { registerFriendLinkRoutes } from '../modules/friend-link/friend-link.routes.js'
import { registerDashboardRoutes } from '../modules/dashboard/dashboard.routes.js'
import { registerVisitRoutes } from '../modules/visit/visit.routes.js'
import { registerMusicRoutes } from '../modules/music/music.routes.js'

const apiRouter = new Router()

const registrars = [
  registerAuthRoutes,
  registerArticleRoutes,
  registerTaxonomyRoutes,
  registerCommentRoutes,
  registerSiteRoutes,
  registerNotificationRoutes,
  registerUploadRoutes,
  registerTalkRoutes,
  registerMessageRoutes,
  registerAlbumRoutes,
  registerResourceRoutes,
  registerFriendLinkRoutes,
  registerDashboardRoutes,
  registerVisitRoutes,
  registerMusicRoutes,
]

for (const register of registrars) register(apiRouter)

export { apiRouter }
export { rssRouter } from '../modules/rss/rss.routes.js'
export { seoRouter } from '../modules/seo/seo.routes.js'
