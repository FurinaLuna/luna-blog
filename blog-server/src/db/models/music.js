import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../index.js'

/** 站内自建歌单（混合音源里的 local 模式） */
export class Music extends Model {}

Music.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(150), allowNull: false },
    artist: { type: DataTypes.STRING(120), allowNull: false, defaultValue: '' },
    album: { type: DataTypes.STRING(120), allowNull: false, defaultValue: '' },
    cover: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
    url: { type: DataTypes.STRING(500), allowNull: false },
    lrc: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
    sort: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, modelName: 'Music', tableName: 'music', timestamps: false, indexes: [{ fields: ['sort'] }] },
)
