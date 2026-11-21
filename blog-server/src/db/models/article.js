import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../index.js'

export class Category extends Model {}

Category.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    slug: { type: DataTypes.STRING(80), allowNull: false, defaultValue: '' },
    description: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    sort: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, modelName: 'Category', tableName: 'category' },
)

export class Tag extends Model {}

Tag.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    slug: { type: DataTypes.STRING(80), allowNull: false, defaultValue: '' },
    color: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '#2f8f83' },
  },
  { sequelize, modelName: 'Tag', tableName: 'tag' },
)

export class Article extends Model {}

Article.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    summary: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
    content: { type: DataTypes.TEXT('long'), allowNull: false },
    cover: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
    categoryId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    status: { type: DataTypes.ENUM('draft', 'published'), allowNull: false, defaultValue: 'draft' },
    isRecommend: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isTop: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    views: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    likeCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    commentCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    readingTime: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    publishedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'Article',
    tableName: 'article',
    indexes: [{ fields: ['status'] }, { fields: ['category_id'] }, { fields: ['published_at'] }],
  },
)

export class ArticleTag extends Model {}

ArticleTag.init(
  {
    articleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, primaryKey: true },
    tagId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, primaryKey: true },
  },
  { sequelize, modelName: 'ArticleTag', tableName: 'article_tag', timestamps: false },
)
