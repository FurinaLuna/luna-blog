import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../index.js'

export class User extends Model {
  /** 对外安全字段（永不返回密码） */
  toSafeJSON() {
    return {
      id: this.id,
      username: this.username,
      nickname: this.nickname,
      avatar: this.avatar,
      email: this.email,
      needPasswordChange: this.needPasswordChange,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
    }
  }
}

User.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(100), allowNull: false },
    nickname: { type: DataTypes.STRING(50), allowNull: false, defaultValue: '博主' },
    avatar: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
    email: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '' },
    needPasswordChange: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    /** 每次改密 +1，签进 JWT；校验时比对，旧令牌自动失效 */
    tokenVersion: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'User', tableName: 'user' },
)
