import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../index.js'

export class Album extends Model {}

Album.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    cover: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
    sort: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, modelName: 'Album', tableName: 'album' },
)

export class Photo extends Model {}

Photo.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    albumId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    url: { type: DataTypes.STRING(500), allowNull: false },
    title: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '' },
    description: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    width: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    height: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    sort: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, modelName: 'Photo', tableName: 'photo', indexes: [{ fields: ['album_id'] }] },
)
