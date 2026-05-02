/**
 * 数据导出工具
 * 随手记 - 个人记账小程序
 * 支持导出账单记录为 CSV 格式
 */

/**
 * 将记录转换为 CSV 行
 * @param {Object} record 账单记录
 * @param {Object} categoryMap 分类映射
 * @param {Object} accountMap 账户映射
 * @returns {string} CSV 行
 */
function recordToCsvRow(record, categoryMap = {}, accountMap = {}) {
  const typeText = record.type === 1 ? '支出' : '收入'
  const categoryName = categoryMap[record.category_code] || record.category_name || ''
  const accountName = accountMap[record.account_code] || record.account_code || ''

  // 转义CSV特殊字符
  const escape = (val) => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const fields = [
    escape(record.record_date),
    escape(typeText),
    escape(categoryName),
    escape(accountName),
    escape(record.amount),
    escape(record.remark)
  ]

  return fields.join(',')
}

/**
 * 导出账单记录为 CSV 格式
 * @param {Array} records 账单记录数组
 * @param {Object} options 导出选项
 * @param {Object} options.categoryMap 分类编码到名称的映射
 * @param {Object} options.accountMap 账户编码到名称的映射
 * @returns {string} CSV 格式的字符串
 */
export function exportToCSV(records, options = {}) {
  const { categoryMap = {}, accountMap = {} } = options

  const headers = ['日期', '类型', '分类', '账户', '金额', '备注']
  const headerRow = headers.join(',')

  const dataRows = records.map(record =>
    recordToCsvRow(record, categoryMap, accountMap)
  )

  return [headerRow, ...dataRows].join('\n')
}

/**
 * 生成导出的文件名
 * @param {string} startDate 开始日期
 * @param {string} endDate 结束日期
 * @returns {string} 文件名
 */
export function generateExportFileName(startDate, endDate) {
  const timestamp = new Date().toISOString().split('T')[0]
  if (startDate && endDate && startDate !== endDate) {
    return `随手记_${startDate}_${endDate}_${timestamp}.csv`
  }
  return `随手记_${timestamp}.csv`
}

/**
 * 触发文件下载（微信小程序环境）
 * @param {string} content 文件内容
 * @param {string} fileName 文件名
 */
export function downloadCSVFile(content, fileName) {
  // #ifdef MP-WEIXIN
  const buffer = wx.arrayBufferToBase64(wx.stringToArrayBuffer ? wx.stringToArrayBuffer(content) : content)
  wx.navigateTo({
    url: `/pages/webview/webview?url=data:text/csv;base64,${buffer}&filename=${encodeURIComponent(fileName)}`
  })
  // #endif

  // #ifndef MP-WEIXIN
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
  // #endif
}

export default {
  exportToCSV,
  generateExportFileName,
  downloadCSVFile
}