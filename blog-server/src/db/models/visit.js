import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../index.js'

/**
 * 访问记录：每一次前台页面浏览写一行。
 * - 总访问量（PV）= 行数
 * - 总访客数（UV）= 去重后的 ip_hash 数量
 * 只记哈希，不存明文 IP。
 */
export class Visit extends Model {}

Visit.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    ipHash: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
    path: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    userAgent: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    referer: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
  },
  {
    sequelize,
    modelName: 'Visit',
    tableName: 'visit',
    indexes: [{ fields: ['ip_hash'] }, { fields: ['created_at'] }],
  },
)
