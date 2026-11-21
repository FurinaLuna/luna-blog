import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../index.js'

export class Talk extends Model {}

Talk.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    images: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    likeCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    commentCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  { sequelize, modelName: 'Talk', tableName: 'talk' },
)

export class Message extends Model {}

Message.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    nickname: { type: DataTypes.STRING(50), allowNull: false },
    content: { type: DataTypes.STRING(500), allowNull: false },
    color: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '' },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
    likeCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    ip: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
  },
  { sequelize, modelName: 'Message', tableName: 'message', indexes: [{ fields: ['status'] }] },
)

export class FriendLink extends Model {}

FriendLink.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    url: { type: DataTypes.STRING(500), allowNull: false },
    avatar: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
    description: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
    sort: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ip: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
  },
  { sequelize, modelName: 'FriendLink', tableName: 'friend_link', indexes: [{ fields: ['status'] }] },
)

export class Notification extends Model {}

Notification.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    type: { type: DataTypes.ENUM('comment', 'message', 'friendlink', 'system'), allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    content: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    targetType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '' },
    targetId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { sequelize, modelName: 'Notification', tableName: 'notification', indexes: [{ fields: ['is_read'] }] },
)
