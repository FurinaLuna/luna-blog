/**
 * 敏感词表：命中即拒绝提交（不做替换，避免出现莫名其妙的占位文本）。
 * 词表按业务需要维护，可继续追加。
 */
export const SENSITIVE_WORDS = [
  '代开发票',
  '办证',
  '博彩',
  '百家乐',
  '六合彩',
  '成人视频',
  '色情',
  '裸聊',
  '赌博',
  '洗钱',
  '枪支',
  '冰毒',
  '贷款秒批',
  '刷单',
  '加微信领',
  '免费领取红包',
]

/**
 * 检查文本是否包含敏感词。
 * @param {string} text
 * @returns {string | null} 命中的敏感词，未命中返回 null
 */
export function findSensitiveWord(text) {
  const normalized = text.toLowerCase().replace(/\s+/g, '')
  return SENSITIVE_WORDS.find((word) => normalized.includes(word.toLowerCase())) ?? null
}
