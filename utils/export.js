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
/**
 * 导出账单记录为 Excel 格式
 * @param {Array} records 账单记录数组
 * @param {Object} options 导出选项
 * @param {Object} options.categoryMap 分类编码到名称的映射
 * @param {Object} options.accountMap 账户编码到名称的映射
 * @returns {Uint8Array} Excel 文件的二进制数据
 */
export function exportToExcel(records, options = {}) {
  const { categoryMap = {}, accountMap = {} } = options

  const XLSX = require('xlsx')

  const headers = ['日期', '类型', '分类', '账户', '金额', '备注']

  const dataRows = records.map(record => {
    const typeText = record.type === 1 ? '支出' : '收入'
    const categoryName = categoryMap[record.category_code] || record.category_name || ''
    const accountName = accountMap[record.account_code] || record.account_code || ''

    return [
      record.record_date,
      typeText,
      categoryName,
      accountName,
      record.amount,
      record.remark || ''
    ]
  })

  const wsData = [headers, ...dataRows]
  const worksheet = XLSX.utils.aoa_to_sheet(wsData)

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '账单记录')

  const excelData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Uint8Array(excelData)
}

/**
 * 导出账单记录为带样式的 Excel 格式（支出红色、收入绿色）
 * @param {Array} records 账单记录数组
 * @param {Object} options 导出选项
 * @returns {Uint8Array} Excel 文件的二进制数据
 */
export function exportToExcelWithStyle(records, options = {}) {
  const { categoryMap = {}, accountMap = {} } = options

  const XLSX = require('xlsx')

  const headers = [
    { t: 's', v: '日期' },
    { t: 's', v: '类型' },
    { t: 's', v: '分类' },
    { t: 's', v: '账户' },
    { t: 's', v: '金额' },
    { t: 's', v: '备注' }
  ]

  const dataRows = records.map(record => {
    const typeText = record.type === 1 ? '支出' : '收入'
    const categoryName = categoryMap[record.category_code] || record.category_name || ''
    const accountName = accountMap[record.account_code] || record.account_code || ''

    const amountCell = { t: 'n', v: record.amount }
    if (record.type === 1) {
      amountCell.rgb = 'FF0000'
    } else {
      amountCell.rgb = '00AA00'
    }

    return [
      { t: 's', v: record.record_date },
      { t: 's', v: typeText },
      { t: 's', v: categoryName },
      { t: 's', v: accountName },
      amountCell,
      { t: 's', v: record.remark || '' }
    ]
  })

  const wsData = [headers, ...dataRows]
  const worksheet = XLSX.utils.aoa_to_sheet(wsData)

  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 6 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 20 }
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '账单记录')

  const excelData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Uint8Array(excelData)
}

/**
 * 生成 Excel 格式的文件名
 * @param {string} startDate 开始日期
 * @param {string} endDate 结束日期
 * @returns {string} 文件名
 */
export function generateExcelFileName(startDate, endDate) {
  const timestamp = new Date().toISOString().split('T')[0]
  if (startDate && endDate && startDate !== endDate) {
    return `随手记_${startDate}_${endDate}_${timestamp}.xlsx`
  }
  return `随手记_${timestamp}.xlsx`
}

/**
 * 触发 Excel 文件下载（微信小程序环境）
 * @param {Uint8Array} data Excel 文件二进制数据
 * @param {string} fileName 文件名
 */
export function downloadExcelFile(data, fileName) {
  // #ifdef MP-WEIXIN
  const buffer = wx.arrayBufferToBase64(data)
  const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`
  const fs = wx.getFileSystemManager()
  fs.writeFile({
    filePath,
    data: buffer,
    encoding: 'base64',
    success: () => {
      wx.openDocument({
        filePath,
        fileType: 'xlsx',
        showMenu: true,
        success: (res) => {
          console.log('Excel opened:', res)
        }
      })
    },
    fail: (err) => {
      console.error('Save Excel failed:', err)
      uni.showToast({ title: '保存失败', icon: 'none' })
    }
  })
  // #endif

  // #ifndef MP-WEIXIN
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
  // #endif
}
