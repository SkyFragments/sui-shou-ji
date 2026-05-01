/**
 * 数据库表结构定义
 * 随手记 - 个人记账小程序
 *
 * 表结构：
 *
 * 1. record 表 - 账单记录
 *    - id: 主键
 *    - type: 类型 (1=支出, 2=收入)
 *    - amount: 金额
 *    - category_code: 分类编码
 *    - category_name: 分类名称
 *    - account_code: 账户编码
 *    - remark: 备注
 *    - record_date: 记录日期 (YYYY-MM-DD)
 *    - create_time: 创建时间
 *    - update_time: 更新时间
 *    - sync_status: 同步状态 (0=未同步, 1=已同步)
 *
 * 2. category 表 - 分类表
 *    - id: 主键
 *    - code: 分类编码
 *    - name: 分类名称
 *    - icon: 图标
 *    - color: 颜色
 *    - type: 类型 (1=支出, 2=收入)
 *    - sort: 排序
 *    - is_default: 是否默认 (0=否, 1=是)
 *
 * 3. account 表 - 账户表
 *    - id: 主键
 *    - code: 账户编码
 *    - name: 账户名称
 *    - type: 账户类型
 *    - balance: 余额
 *    - sort: 排序
 *    - is_default: 是否默认 (0=否, 1=是)
 *    - create_time: 创建时间
 *    - update_time: 更新时间
 *
 * 4. budget 表 - 预算表
 *    - id: 主键
 *    - year_month: 年月 (YYYY-MM)
 *    - total_budget: 总预算
 *    - create_time: 创建时间
 *    - update_time: 更新时间
 *
 * 5. user 表 - 用户表
 *    - id: 主键
 *    - openid: 微信openid
 *    - default_budget: 默认预算
 *    - last_sync_time: 最后同步时间
 *    - create_time: 创建时间
 */

// 数据库表名常量
export const TABLE_NAMES = {
  RECORD: 'ssj_record',
  CATEGORY: 'ssj_category',
  ACCOUNT: 'ssj_account',
  BUDGET: 'ssj_budget',
  USER: 'ssj_user'
}

// record 表字段
export const RECORD_COLUMNS = {
  ID: 'id',
  TYPE: 'type',
  AMOUNT: 'amount',
  CATEGORY_CODE: 'category_code',
  CATEGORY_NAME: 'category_name',
  ACCOUNT_CODE: 'account_code',
  REMARK: 'remark',
  RECORD_DATE: 'record_date',
  CREATE_TIME: 'create_time',
  UPDATE_TIME: 'update_time',
  SYNC_STATUS: 'sync_status'
}

// category 表字段
export const CATEGORY_COLUMNS = {
  ID: 'id',
  CODE: 'code',
  NAME: 'name',
  ICON: 'icon',
  COLOR: 'color',
  TYPE: 'type',
  SORT: 'sort',
  IS_DEFAULT: 'is_default'
}

// account 表字段
export const ACCOUNT_COLUMNS = {
  ID: 'id',
  CODE: 'code',
  NAME: 'name',
  TYPE: 'type',
  BALANCE: 'balance',
  SORT: 'sort',
  IS_DEFAULT: 'is_default',
  CREATE_TIME: 'create_time',
  UPDATE_TIME: 'update_time'
}

// budget 表字段
export const BUDGET_COLUMNS = {
  ID: 'id',
  YEAR_MONTH: 'year_month',
  TOTAL_BUDGET: 'total_budget',
  CREATE_TIME: 'create_time',
  UPDATE_TIME: 'update_time'
}

// user 表字段
export const USER_COLUMNS = {
  ID: 'id',
  OPENID: 'openid',
  DEFAULT_BUDGET: 'default_budget',
  LAST_SYNC_TIME: 'last_sync_time',
  CREATE_TIME: 'create_time'
}

// 支出分类编码
export const EXPENSE_CATEGORY_CODES = {
  FOOD: 'FOOD',           // 餐饮
  TRANSPORT: 'TRANSPORT', // 交通
  SHOPPING: 'SHOPPING',   // 购物
  ENTERTAINMENT: 'ENTERTAINMENT', // 娱乐
  LIVING: 'LIVING',       // 居住
  MEDICAL: 'MEDICAL',     // 医疗
  EDUCATION: 'EDUCATION', // 教育
  COMMUNICATION: 'COMMUNICATION', // 通讯
  OTHER: 'OTHER'          // 其他
}

// 收入分类编码
export const INCOME_CATEGORY_CODES = {
  SALARY: 'SALARY',       // 工资
  SIDE_JOB: 'SIDE_JOB',   // 副业
  INVESTMENT: 'INVESTMENT', // 投资
  OTHER_INCOME: 'OTHER_INCOME' // 其他
}

// 账户编码
export const ACCOUNT_CODES = {
  CASH: 'cash',           // 现金
  ALIPAY: 'alipay',       // 支付宝
  WECHAT: 'wechat',       // 微信
  BANKCARD: 'bankcard'    // 银行卡
}