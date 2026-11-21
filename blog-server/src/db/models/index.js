import { sequelize } from '../index.js'
import { User } from './user.js'
import { Article, ArticleTag, Category, Tag } from './article.js'
import { Comment, Like } from './comment.js'
import { FriendLink, Message, Notification, Talk } from './social.js'
import { Album, Photo } from './media.js'
import { Resource, SiteConfig } from './site.js'

/* ---------------- 关联关系 ---------------- */
Category.hasMany(Article, { as: 'articles', foreignKey: 'categoryId' })
Article.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' })

Article.belongsToMany(Tag, {
  as: 'tags',
  through: ArticleTag,
  foreignKey: 'articleId',
  otherKey: 'tagId',
})
Tag.belongsToMany(Article, {
  as: 'articles',
  through: ArticleTag,
  foreignKey: 'tagId',
  otherKey: 'articleId',
})

Comment.belongsTo(Article, { as: 'article', foreignKey: 'articleId' })
Comment.belongsTo(Talk, { as: 'talk', foreignKey: 'talkId' })

Album.hasMany(Photo, { as: 'photos', foreignKey: 'albumId' })
Photo.belongsTo(Album, { as: 'album', foreignKey: 'albumId' })

export {
  sequelize,
  User,
  Article,
  ArticleTag,
  Category,
  Tag,
  Comment,
  Like,
  Talk,
  Message,
  FriendLink,
  Notification,
  Album,
  Photo,
  Resource,
  SiteConfig,
}

/** 建表（初始化脚本与测试使用；生产改用迁移时也复用同一组模型） */
export async function syncModels(options = {}) {
  await sequelize.sync(options)
}
