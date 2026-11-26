import { DataTypes } from 'sequelize'
import { sequelize } from './index.js'

/**
 * 幂等补齐历史库缺失的列。
 *
 * 生产环境用 `sequelize.sync()`（不 alter），旧库不会自动新增列；
 * 这里只处理「新增列」这种最安全的变更，新库由 sync() 直接建出，不受影响。
 * 注意：模型开了 underscored，JS 字段 `tokenVersion` 对应列名 `token_version`。
 * 以后新增列时在这里追加一行判断即可，避免引入整套迁移框架。
 */
export async function ensureSchema() {
  const qi = sequelize.getQueryInterface()

  const userColumns = await qi.describeTable('user').catch(() => null)
  if (userColumns && !userColumns.token_version) {
    await qi.addColumn('user', 'token_version', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    })
    console.log('✓ 已补齐 user.token_version（改密后旧令牌失效）')
  }
  // 早期误建的 camelCase 列，清掉避免混淆
  if (userColumns && userColumns.tokenVersion) {
    await qi.removeColumn('user', 'tokenVersion')
    console.log('✓ 已清理误建的 user.tokenVersion 列')
  }
}
