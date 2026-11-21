import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../index.js'
import { escapeHtml, maskEmail } from '../../core/text.js'

export class Comment extends Model {
  /** 鍓嶅彴灞曠ず鐢細闅愯棌閭涓?IP */
  toPublicJSON() {
    return {
      id: this.id,
      targetType: this.targetType,
      articleId: this.articleId,
      talkId: this.talkId,
      parentId: this.parentId,
      nickname: this.nickname,
      email: maskEmail(this.email),
      website: this.website,
      content: escapeHtml(this.content),
      isAdmin: this.isAdmin,
      likeCount: this.likeCount,
      createdAt: this.createdAt,
    }
  }

  toAdminJSON() {
    return {
      id: this.id,
      targetType: this.targetType,
      articleId: this.articleId,
      talkId: this.talkId,
      parentId: this.parentId,
      nickname: this.nickname,
      email: this.email,
      website: this.website,
      content: escapeHtml(this.content),
      isAdmin: this.isAdmin,
      status: this.status,
      ip: this.ip,
      likeCount: this.likeCount,
      createdAt: this.createdAt,
    }
  }
}

Comment.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    targetType: { type: DataTypes.ENUM('article', 'talk'), allowNull: false, defaultValue: 'article' },
    articleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    talkId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    parentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    nickname: { type: DataTypes.STRING(50), allowNull: false },
    email: { type: DataTypes.STRING(100), allowNull: false },
    website: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
    content: { type: DataTypes.TEXT, allowNull: false },
    isAdmin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
    ip: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
    likeCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: 'Comment',
    tableName: 'comment',
    indexes: [
      { fields: ['status'] },
      { fields: ['article_id'] },
      { fields: ['talk_id'] },
      { fields: ['parent_id'] },
      { fields: ['created_at'] },
    ],
  },
)

export class Like extends Model {}

Like.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    targetType: { type: DataTypes.ENUM('article', 'comment', 'talk', 'message'), allowNull: false },
    targetId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    ip: { type: DataTypes.STRING(64), allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    sequelize,
    modelName: 'Like',
    tableName: 'like_record',
    updatedAt: false,
    indexes: [{ unique: true, fields: ['target_type', 'target_id', 'ip'] }],
  },
)
