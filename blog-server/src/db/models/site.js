import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../index.js'

export class SiteConfig extends Model {}

SiteConfig.init(
  {
    key: { type: DataTypes.STRING(60), allowNull: false, primaryKey: true },
    value: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  },
  { sequelize, modelName: 'SiteConfig', tableName: 'site_config', timestamps: false },
)

export class Resource extends Model {}

Resource.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    url: { type: DataTypes.STRING(500), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    icon: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
    category: { type: DataTypes.STRING(50), allowNull: false, defaultValue: '常用站点' },
    sort: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, modelName: 'Resource', tableName: 'resource' },
)
