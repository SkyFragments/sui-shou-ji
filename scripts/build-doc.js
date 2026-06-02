/**
 * 生成《说明.doc》— 随手记 设计文档
 */
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak
} = require('docx')

// ============ 辅助 ============
const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { line: 360, before: 60, after: 60 },
    children: [new TextRun({ text, ...opts })],
  })

const pBold = (text) => p(text, { bold: true })

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, color: '2E5C2E' })],
  })

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 160 },
    children: [new TextRun({ text, bold: true, color: '4A7A4A' })],
  })

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, color: '666666' })],
  })

const code = (text) =>
  new Paragraph({
    spacing: { before: 80, after: 80 },
    shading: { fill: 'F4F4F4', type: ShadingType.CLEAR },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
    },
    children: [new TextRun({ text, font: 'Consolas', size: 20 })],
  })

// 多行代码/ASCII 树 — 用单格表格，每行独立 paragraph，避免 Word reflow 破坏对齐
const codeBox = (text) => {
  const lines = text.split('\n')
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: allBorders,
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: 'F4F4F4', type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 160, right: 160 },
            children: lines.map((line) =>
              new Paragraph({
                spacing: { before: 0, after: 0, line: 280 },
                children: [
                  new TextRun({
                    text: line.length === 0 ? ' ' : line,
                    font: 'Consolas',
                    size: 20,
                  }),
                ],
              })
            ),
          }),
        ],
      }),
    ],
  })
}

const li = (text, level = 0) =>
  new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { line: 320, before: 40, after: 40 },
    children: [new TextRun(text)],
  })

const num = (text) =>
  new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    spacing: { line: 320, before: 40, after: 40 },
    children: [new TextRun(text)],
  })

// ============ 表格辅助 ============
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }
const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }

const cell = (text, width, opts = {}) =>
  new TableCell({
    borders: allBorders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.header
      ? { fill: 'E8F0E8', type: ShadingType.CLEAR }
      : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [
      new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text, bold: !!opts.header, size: 22 })],
      }),
    ],
  })

const row = (cells) => new TableRow({ children: cells })

// ============ 内容 ============
const children = []

// 封面 / 标题
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1200, after: 400 },
    children: [
      new TextRun({ text: '随 手 记', size: 64, bold: true, color: '2E5C2E' }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({ text: '个人记账小程序 · 设计文档', size: 32, color: '4A7A4A' }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 },
    children: [
      new TextRun({ text: 'SuishouJi Design Specification', size: 24, italics: true, color: '888888' }),
    ],
  }),
  new Paragraph({ children: [new PageBreak()] }),
)

// === 一、技术栈 ===
children.push(h1('一、技术栈'))

children.push(h2('1.1 客户端（前端）'))
children.push(
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 2800, 4160],
    rows: [
      row([cell('类别', 2400, { header: true }), cell('技术', 2800, { header: true }), cell('说明', 4160, { header: true })]),
      row([cell('跨端框架', 2400), cell('UniApp', 2800), cell('基于 Vue.js，一套代码编译为 H5 / 微信小程序 / Android / iOS', 4160)]),
      row([cell('视图层', 2400), cell('Vue 3', 2800), cell('Composition API + <script setup>，响应式数据驱动视图', 4160)]),
      row([cell('状态管理', 2400), cell('Pinia', 2800), cell('Vue 官方推荐，模块化 store，支持持久化与同步钩子', 4160)]),
      row([cell('样式', 2400), cell('SCSS + rpx', 2800), cell('SCSS 预处理；rpx 自适应，750rpx = 屏幕宽度', 4160)]),
      row([cell('图表', 2400), cell('CSS + Canvas', 2800), cell('饼图/折线图/环形图均为自研轻量组件，无第三方图表库依赖', 4160)]),
      row([cell('本地存储', 2400), cell('uni.setStorageSync', 2800), cell('封装为 storage 工具，按 ssj_ 前缀的复数 key 存储', 4160)]),
    ],
  }),
)

children.push(h2('1.2 服务端（可选）'))
children.push(p('随 手 记 默认以本地 LocalStorage 持久化运行，可零配置启动；同时预留服务端同步能力。'))
children.push(
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 2800, 4160],
    rows: [
      row([cell('类别', 2400, { header: true }), cell('技术', 2800, { header: true }), cell('说明', 4160, { header: true })]),
      row([cell('Web 框架', 2400), cell('Node.js + Express', 2800), cell('轻量 RESTful 接口，token 鉴权', 4160)]),
      row([cell('数据库', 2400), cell('MySQL 8', 2800), cell('关系型存储账单/分类/账户/预算四张表', 4160)]),
      row([cell('鉴权', 2400), cell('JWT (jsonwebtoken)', 2800), cell('用户登录后下发 token，请求头 Bearer 鉴权', 4160)]),
      row([cell('部署', 2400), cell('Nginx + Node', 2800), cell('前置 Nginx 反代，Node 进程托管账单 API', 4160)]),
    ],
  }),
)

children.push(h2('1.3 开发与构建工具'))
children.push(
  li('HBuilderX — UniApp 官方 IDE，内置运行/调试/打包'),
  li('Vite — 现代前端构建工具'),
  li('ESLint + 统一 SCSS 变量 (common/style.scss) 保证风格一致'),
  li('Git — 版本管理（master 主干分支）'),
)

// === 二、项目功能结构图 ===
children.push(new Paragraph({ children: [new PageBreak()] }))
children.push(h1('二、项目功能结构图'))

children.push(p('整体采用「页面层 + 组件层 + Store 层 + 工具/服务层」四层结构，依赖单向流动。'))

children.push(h2('2.1 总体架构'))
children.push(codeBox(
`┌─────────────────────────────────────────────────────────────┐
│                       pages  (8 个页面)                      │
│  index / add / records / stats / budget                     │
│  account / category / my                                     │
└────────────┬────────────────────────────────────────────────┘
             │  props / emit
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  components  (7 个自定义组件)                │
│  amount-keyboard   category-picker   bill-item               │
│  pie-chart         line-chart       ring-chart   stat-card   │
└────────────┬────────────────────────────────────────────────┘
             │  useStore()
             ▼
┌─────────────────────────────────────────────────────────────┐
│            store  (Pinia — 4 个业务 store + 1 sync)          │
│   bill.js   category.js   account.js   budget.js            │
│   sync.js (云端同步协调)                                    │
└────────────┬────────────────────────────────────────────────┘
             │  getStorage / setStorage / api
             ▼
┌─────────────────────────────────────────────────────────────┐
│            utils  (7 个工具模块)                            │
│  storage  db  schema  init-data  api  auth  export          │
└─────────────────────────────────────────────────────────────┘
             │
             ▼
        LocalStorage  (ssj_ 前缀)
        可选: server  (Express + MySQL)`))

children.push(h2('2.2 页面功能结构树'))
children.push(codeBox(
`随手记 (SuiShouJi)
├── 首页 (pages/index)
│   ├── 今日支出/收入概况
│   ├── 月度预算环形图（ring-chart）
│   ├── 超支智能提醒
│   ├── 快捷记账模板（9 个预设）
│   └── 今日账单列表（跳转 add 编辑）
│
├── 记一笔 (pages/add)            ← 编辑模式: ?recordId=xxx
│   ├── 自定义金额键盘（amount-keyboard）
│   ├── 支出/收入 段控件切换
│   ├── 分类选择器（category-picker）
│   ├── 账户选择 + 日期选择
│   └── 备注输入 + 保存/删除
│
├── 账单列表 (pages/records)
│   ├── 月份切换（左右箭头 / 日期 picker）
│   ├── 月度统计概览（支出/收入/结余）
│   ├── 按日分组 + 每日小计
│   └── 下拉加载更多
│
├── 统计分析 (pages/stats)
│   ├── 月份切换
│   ├── 分类占比饼图（pie-chart）
│   │   ├── 触摸旋转 + 惯性
│   │   ├── 点击 spin 落点
│   │   ├── 边缘 % 标签 + 引线
│   │   └── <5% 切块合并为"其他"
│   ├── 分类详情弹窗
│   └── 日支出趋势折线图（line-chart）
│
├── 预算 (pages/budget)
│   ├── 月预算数字输入 + slider 调节
│   ├── 6 档预设按钮
│   └── 执行进度环形图
│
├── 账户管理 (pages/account)
│   ├── 现金/支付宝/微信/银行卡 默认账户
│   ├── 添加 / 编辑 / 删除账户
│   └── 余额维护
│
├── 分类管理 (pages/category)
│   ├── 支出/收入分类切换
│   ├── 9 + 4 个默认分类（icon + 颜色 + 名称 + code）
│   └── 自定义新增 / 编辑
│
└── 我的 (pages/my)
    ├── 登录/未登录状态切换（mock）
    ├── 跳转账户/分类/预算管理
    ├── 数据导出（CSV / Excel xlsx）
    ├── 同步状态查看
    └── 关于`))

// === 三、项目目录结构 ===
children.push(new Paragraph({ children: [new PageBreak()] }))
children.push(h1('三、项目目录结构'))

children.push(p('严格遵循 UniApp 官方规范，目录按职责划分。'))
children.push(codeBox(
`SuiShouJi/
├── pages/                  # 页面（8 个 .vue 单文件组件）
│   ├── index/index.vue
│   ├── add/add.vue
│   ├── records/records.vue
│   ├── stats/stats.vue
│   ├── budget/budget.vue
│   ├── account/account.vue
│   ├── category/category.vue
│   └── my/my.vue
│
├── components/             # 自定义组件（7 个）
│   ├── amount-keyboard/    # 自定义数字键盘
│   ├── category-picker/    # 分类网格选择器
│   ├── bill-item/          # 账单行项
│   ├── pie-chart/          # 可交互饼图
│   ├── line-chart/         # 折线图
│   ├── ring-chart/         # 环形进度图
│   └── stat-card/          # 统计卡片
│
├── store/                  # Pinia 状态层
│   ├── index.js            # 统一注册
│   ├── bill.js             # 账单 CRUD
│   ├── category.js         # 分类 CRUD
│   ├── account.js          # 账户 CRUD
│   ├── budget.js           # 预算管理
│   └── sync.js             # 云同步协调
│
├── utils/                  # 工具 / 服务
│   ├── storage.js          # 异步存储封装
│   ├── db.js               # 表初始化 + ID 生成
│   ├── schema.js           # 数据模型常量
│   ├── init-data.js        # 首次启动默认数据
│   ├── api.js              # 远端 API 封装
│   ├── auth.js             # 登录态/token
│   └── export.js           # 数据导出
│
├── common/                 # 全局样式
│   ├── style.scss          # CSS 变量（色板/间距/圆角/阴影/动画/z-index）
│   └── flex.scss           # 弹性/对齐/截断/卡片/按钮/触摸反馈
│
├── static/                 # 静态资源
│   ├── icon/               # SVG 图标（tabbar / 通用）
│   └── tabbar/             # tabbar 静态素材
│
├── server/                 # 可选后端
│   ├── index.js            # Express 入口
│   ├── routes/             # 路由
│   ├── middleware/         # 鉴权中间件
│   ├── db/                 # MySQL schema + 连接
│   └── nginx.conf.example
│
├── App.vue                 # 应用根组件（onLaunch 初始化）
├── main.js                 # 入口（createSSRApp + Pinia）
├── pages.json              # 页面路由注册
├── manifest.json           # 应用清单（AppID / 平台配置）
├── uni.scss                # 全局 SCSS 变量
└── 说明.doc                # 本设计文档`))

// === 四、核心功能说明 ===
children.push(new Paragraph({ children: [new PageBreak()] }))
children.push(h1('四、核心功能说明'))

const features = [
  {
    name: '4.1 快速记账',
    desc: '首页 / 中央 FAB 入口直达。3 步完成：输入金额 → 选分类 → 选账户/日期 → 保存。',
    bullets: [
      '自定义数字键盘（amount-keyboard）支持小数、退格、长按连续删除',
      '支出/收入 段控件一键切换，分类网格随之刷新',
      '编辑模式: 传入 ?recordId=xxx 进入修改态，顶部出现「删除」按钮',
    ],
  },
  {
    name: '4.2 账单列表',
    desc: '按月浏览所有账单，按日分组聚合，统计每日小计。',
    bullets: [
      '左右箭头 / 日期 picker 切换月份',
      'scroll-view 滚动到底自动加载',
      '点击单条 → 编辑；右滑可删除（预留）',
    ],
  },
  {
    name: '4.3 统计分析',
    desc: '可视化本月数据，识别消费结构。',
    bullets: [
      '分类占比饼图：触摸旋转 + 惯性 + 点击 spin 落点 + 边缘引线标签',
      '切块 <5% 自动合并为「其他」，避免图例爆炸',
      '日支出折线图：双轴联动，可识别周末/月末消费高峰',
      '点击图例 / 切块弹出分类详情（金额/占比/笔数）',
    ],
  },
  {
    name: '4.4 预算管理',
    desc: '每月设置总预算，超支时首页弹条提醒。',
    bullets: [
      '数字输入 + slider 调节 + 5 档预设（1000 / 2000 / 3000 / 5000 / 10000）',
      '环形图实时反映已用 / 剩余比例',
      '剩余 < 10% 红色警示，< 0 时首页红色 banner 提醒',
    ],
  },
  {
    name: '4.5 账户与分类管理',
    desc: '基础数据维护，所有账单/统计依赖于此。',
    bullets: [
      '账户: 现金/支付宝/微信/银行卡 4 个默认；可新增自定义',
      '分类: 9 个支出 + 4 个收入默认；icon + 颜色 + 名称 + code 唯一标识',
      '默认数据/默认分类不可删，自定义可删',
    ],
  },
  {
    name: '4.6 数据导出',
    desc: '在「我的」中导出指定时间范围的账单为 CSV 或 Excel (.xlsx)，方便备份或迁移。',
    bullets: [
      'CSV: 纯表格（日期/类型/分类/账户/金额/备注），直接用 Excel 打开',
      'Excel (xlsx): 带表头样式，可在 WPS / Excel 中二次分析',
      '无 JSON 导出（设计上 CSV/Excel 已足够覆盖本地迁移场景）',
    ],
  },
]

features.forEach((f) => {
  children.push(h2(f.name))
  children.push(p(f.desc))
  f.bullets.forEach((b) => children.push(li(b)))
})

// === 五、数据存储与状态管理 ===
children.push(new Paragraph({ children: [new PageBreak()] }))
children.push(h1('五、数据存储与状态管理'))

children.push(h2('5.1 存储键约定（复数前缀）'))
children.push(p('所有 LocalStorage 键以 ssj_ 开头 + 复数名词，保证全局唯一且语义清晰。'))
children.push(codeBox(
`ssj_records         # 账单记录
ssj_categories      # 分类
ssj_accounts        # 账户
ssj_budgets         # 预算
ssj_users           # 用户
ssj_sync_status     # 同步元数据（最后同步时间等）
ssj_sync_dead_letter # 同步失败死信队列`))

children.push(h2('5.2 核心数据模型（schema.js）'))
children.push(
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1800, 2400, 5160],
    rows: [
      row([cell('实体', 1800, { header: true }), cell('字段', 2400, { header: true }), cell('说明', 5160, { header: true })]),
      row([cell('record', 1800), cell('id', 2400), cell('账单唯一 ID（generateId 生成）', 5160)]),
      row([cell('', 1800), cell('type', 2400), cell('1=支出 / 2=收入', 5160)]),
      row([cell('', 1800), cell('amount', 2400), cell('金额，number', 5160)]),
      row([cell('', 1800), cell('category_code', 2400), cell('关联 category.code', 5160)]),
      row([cell('', 1800), cell('account_code', 2400), cell('关联 account.code', 5160)]),
      row([cell('', 1800), cell('record_date', 2400), cell('YYYY-MM-DD', 5160)]),
      row([cell('', 1800), cell('remark', 2400), cell('备注', 5160)]),
      row([cell('', 1800), cell('sync_status', 2400), cell('0=未同步 / 1=已同步', 5160)]),
      row([cell('category', 1800), cell('code / name / icon / color / type / sort / is_default', 2400), cell('分类；type 区分支出收入', 5160)]),
      row([cell('account', 1800), cell('code / name / type / balance / sort / is_default', 2400), cell('账户；type 区分支付渠道', 5160)]),
      row([cell('budget', 1800), cell('year_month / total_budget / update_time', 2400), cell('按月存储；getBudget() 返回数值', 5160)]),
    ],
  }),
)

children.push(h2('5.3 Pinia Store 划分'))
children.push(
  li('bill: 账单 CRUD，按月/分类/日聚合查询'),
  li('category: 分类加载（首次启动注入默认）、增删改'),
  li('account: 账户加载、增删改；记录账单时联动更新余额'),
  li('budget: 按 year_month key 存储预算；getBudget/ setBudget 暴露便捷方法'),
  li('sync: 协调本地与远端（登录态、增量同步、冲突解决）'),
)

children.push(h2('5.4 组件通信约定'))
children.push(
  li('父 → 子: props（数据）'),
  li('子 → 父: emit（事件） — 例如 pie-chart 的 @legend-click 触发分类详情弹窗'),
  li('跨层: 直接 useXxxStore()，避免 prop drilling'),
)

// === 六、UI/UX 设计要点 ===
children.push(new Paragraph({ children: [new PageBreak()] }))
children.push(h1('六、UI/UX 设计要点'))

children.push(h2('6.1 配色与主题'))
children.push(p('主色: #07c160（记账绿 — 收入/正向）、辅色 #dd524d（警示红 — 支出/超支）。背景 #FDF4E9 暖米色降低视觉疲劳。所有色值在 common/style.scss 中以 CSS 变量统一管理。'))

children.push(h2('6.2 布局规范'))
children.push(
  li('页面统一 padding 20-30rpx，卡片化 (border-radius 16rpx + 浅阴影)'),
  li('底部 tabbar 固定 100rpx + 安全区内边距；中央 FAB 凸起 (margin-top -18rpx) 形成视觉焦点'),
  li('所有页面 750rpx 设计稿基准，rpx 自适应'),
)

children.push(h2('6.3 动效'))
children.push(
  li('页面进场: animate-slide-up + delay-N 级联（0.1s × N）'),
  li('按钮 / Tab: 0.2s cubic-bezier 缓动，触摸 scale 0.94 反馈'),
  li('饼图 spin: 0.9s cubic-bezier 缓动，自然减速'),
)

children.push(h2('6.4 自定义组件亮点'))
children.push(
  pBold('amount-keyboard 金额键盘'),
  li('9 宫格数字 + 小数点 + 退格'),
  li('长按退格可连续删除'),
  li('与表单解耦，props 双向同步 displayAmount'),
)

children.push(pBold('pie-chart 可交互饼图'))
children.push(p('同目录下其它图表的进阶版。除基本渲染外还支持：'))
children.push(
  li('触摸拖拽旋转 + 抬手惯性（requestAnimationFrame 衰减）'),
  li('点击切块 spin 旋转对齐到顶部（cubic-bezier 缓动 0.9s）'),
  li('边缘 % 标签 + 2rpx 灰色引线，从饼边延伸到标签前'),
  li('<5% 切块自动合并为灰色「其他」'),
  li('图例点击触发 legend-click 事件，上层可弹分类详情'),
)

children.push(pBold('ring-chart 预算环'))
children.push(p('SVG 圆弧实现，圆心显示百分比，外圈带动画绘制。'))

children.push(h2('6.5 关键交互流程'))
children.push(codeBox(
`首次启动
  App.onLaunch
    └─ initAllData()    ← 注入默认分类/账户
        └─ 首屏: 首页
            ├─ 今日账单 (空状态)
            ├─ 预算卡片 (无预算 → 引导设置)
            └─ 快捷记账 (9 模板)

记一笔
  点中央 FAB / 首页快捷模板
    └─ pages/add
        ├─ 输入金额 (amount-keyboard)
        ├─ 选分类 (category-picker)
        ├─ 选账户/日期
        └─ 保存 → bill.addRecord() → 回首页
`))

// === 七、数据流与时序图 ===
children.push(new Paragraph({ children: [new PageBreak()] }))
children.push(h1('七、数据流与时序图'))

children.push(p('用 sequence 形式展示两个核心流程的参与者、调用关系与数据走向。'))

children.push(h2('7.1 记一笔（addRecord 全链路）'))
children.push(codeBox(
`用户          pages/add       billStore        LocalStorage     其他 pages
 │  输入金额      │                │                │                │
 │ 选分类 ────►  │                │                │                │
 │ 选账户 ────►  │                │                │                │
 │ 点保存 ────►  │                │                │                │
 │              │ addRecord() ─► │                │                │
 │              │                │ setStorage ──► │                │
 │              │                │ (ssj_records)  │                │
 │              │                │                │                │
 │              │ ◄── ok ──────  │                │                │
 │              │ uni.reLaunch ──┼────────────────┼───────────────►│
 │              │                │                │   首页/账单刷新  │
`))

children.push(h2('7.2 饼图点击 spin 落点'))
children.push(codeBox(
`用户          pie-chart      computed slices   rotation state   DOM
 │  tap 切块    │                │                │                │
 │ ──────────► │                │                │                │
 │            │ angleFromCenter │                │                │
 │            │ (touchStart)    │                │                │
 │            │ localConic =    │                │                │
 │            │  (tap+90-R)%360 │                │                │
 │            │ find slice  ──► │                │                │
 │            │ ◄─ slice ─────  │                │                │
 │            │ spinToSlice     │                │                │
 │            │  target = -midAngle mod 360      │                │
 │            │  delta = target - R + 2*360     │                │
 │            │ R += delta  ────────────────────►│                │
 │            │ spinning=true   │                │                │
 │            │ ───────────────────────────────────────────────►  │ transition
 │  0.9s 后  │                │                │ spinning=false │
 │            │                │                │ ─────────────► │ transition: none
`))

children.push(h2('7.3 月度切换 → 三页联动'))
children.push(codeBox(
`用户       stats / records / budget
 │  ◀ / ▶ 月份
 │  ──────►
 │          currentYearMonth.value = 'YYYY-MM'
 │                │
 │                ▼
 │  Pinia getter: getMonthStats / getRecordsByMonth / getBudget
 │                │
 │                ▼
 │  computed 重算 → DOM 自动更新
 │  (月统计 / 列表 / 预算进度同步刷新)
`))

// === 八、页面路由图 ===
children.push(new Paragraph({ children: [new PageBreak()] }))
children.push(h1('八、页面路由图'))

children.push(h2('8.1 总体路由关系'))
children.push(codeBox(
`                  ┌────────────────────────┐
                  │   App 启动 → pages/index │
                  └───────────┬────────────┘
                              │
        ┌────────────┬────────┼────────┬─────────────┐
        ▼            ▼        ▼        ▼             ▼
   pages/index   pages/   pages/   pages/        pages/
                records    add      stats         my
        │            │        ▲        │             │
        │            │   reLaunch     │             │
        │            │   (FAB跳转)    │             │
        │            │        │        │             │
        │            │  ?recordId=xxx │             │
        │            │  编辑模式入口 ─┘             │
        │            │                              │
        │            │  ◀──月份切换──▶               │
        │            │                              │
        │            │              ┌───────────────┘
        │            │              │
        │            │              ▼
        │            │         pages/budget  pages/account  pages/category
        │            │         (reLaunch)     (navigateTo)   (navigateTo)
        │            │
        │     scroll-view 触底 loadMore
        │            │
        │            └──► tap 单条 ─► pages/add?recordId=xxx (navigateTo)
        │
        └──► 快捷模板 tap ─► pages/add?type=1&category=FOOD&amount=xx
`))

children.push(h2('8.2 tabbar 配置'))
children.push(p('底部 5 入口，中间「+」为 FAB 浮动按钮（带渐变 + 投影）。'))
children.push(
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1800, 1800, 1800, 3960],
    rows: [
      row([
        cell('位置', 1800, { header: true }),
        cell('页面', 1800, { header: true }),
        cell('跳转方式', 1800, { header: true }),
        cell('说明', 3960, { header: true }),
      ]),
      row([cell('1', 1800, { center: true }), cell('首页', 1800), cell('reLaunch', 1800), cell('今日概况 + 快捷模板', 3960)]),
      row([cell('2', 1800, { center: true }), cell('账单', 1800), cell('reLaunch', 1800), cell('按月浏览所有账单', 3960)]),
      row([cell('3', 1800, { center: true }), cell('+', 1800), cell('reLaunch', 1800), cell('中央 FAB: 跳记账页 add', 3960)]),
      row([cell('4', 1800, { center: true }), cell('分析', 1800), cell('reLaunch', 1800), cell('饼图 + 折线图统计', 3960)]),
      row([cell('5', 1800, { center: true }), cell('我的', 1800), cell('reLaunch', 1800), cell('设置 / 登录 / 导出', 3960)]),
    ],
  }),
)

children.push(h2('8.3 路由约定'))
children.push(
  li('主 tab 页面之间: uni.reLaunch() — 销毁栈重建，避免栈深膨胀'),
  li('子页面 / 编辑 / 管理页: uni.navigateTo() — 保留返回栈'),
  li('传参: URL query (?recordId=xxx, ?type=1, ?category=FOOD)'),
)

// === 九、关键算法实现 ===
children.push(new Paragraph({ children: [new PageBreak()] }))
children.push(h1('九、关键算法实现'))

children.push(h2('9.1 饼图：conic 与 CSS 角度坐标转换'))
children.push(pBold('问题：'))
children.push(p('conic-gradient 0° 在 12 点钟方向顺时针递增；CSS atan2 0° 在 3 点钟方向。两套坐标。'))

children.push(pBold('核心代码 (pie-chart.vue)：'))
children.push(codeBox(
`// 触摸点 → 屏幕极角（CSS atan2 坐标）
const angle = Math.atan2(touchY - cy, touchX - cx) * 180 / Math.PI

// 屏幕极角 → conic 局部角度 (扣除当前 rotation)
const localConic = (((angle + 90) - rotation) % 360 + 360) % 360

// 反之: 把切块旋到顶部
// 屏幕 conic (midAngle + R) mod 360 = 0  ⇒  R = -midAngle mod 360
const target = (360 - slice.midAngle) % 360
`))

children.push(h2('9.2 触摸旋转 + 惯性衰减'))
children.push(codeBox(
`// 跨 -180/+180 边界修正，否则 9 点方向拖动会瞬移反向
let delta = angle - lastAngle
if (delta > 180) delta -= 360
if (delta <= -180) delta += 360

// 末速采样 (deg/frame) → 抬手后 RAF 衰减
const velocity = (delta / dt) * 16   // ~16ms per frame
const tick = () => {
  rotation += velocity
  velocity *= 0.94                   // 衰减系数
  if (Math.abs(velocity) >= 0.3) requestAnimationFrame(tick)
}
`))

children.push(h2('9.3 预算超支判定（首页 banner）'))
children.push(codeBox(
`// store/budget.js
get currentBudget() {
  const ym = getCurrentYearMonth()
  return state.budgets[ym]?.total_budget ?? DEFAULT_BUDGET
}

// pages/index/index.vue
const monthUsed = computed(() => billStore.getMonthExpense(currentYM))
const remaining = computed(() => budget.value - monthUsed.value)
const remainingClass = computed(() =>
  remaining.value < 0 ? 'over' :
  remaining.value / budget.value < 0.1 ? 'danger' : 'ok'
)
const alertMessage = computed(() => {
  if (remaining.value < 0) return \`已超支 ¥\${Math.abs(remaining.value).toFixed(2)}\`
  if (remaining.value / budget.value < 0.1) return \`预算仅剩 ¥\${remaining.value.toFixed(2)}\`
  return ''
})
`))

children.push(h2('9.4 复数 key 存储约定（避坑）'))
children.push(p('约定所有 LocalStorage key 复数 + ssj_ 前缀，避免多表 key 冲突。每个 Pinia store 内统一用 STORAGE_KEY 常量引用，业务代码零字面量。'))
children.push(codeBox(
`// store/bill.js
const STORAGE_KEY = 'ssj_records'   // 单一来源，不在调用处写字符串

// store/account.js
const STORAGE_KEY = 'ssj_accounts'

// store/category.js
const STORAGE_KEY = 'ssj_categories'

// store/budget.js
const STORAGE_KEY = 'ssj_budgets'

// store/sync.js (元数据，与业务表平级)
const STORAGE_KEY            = 'ssj_sync_status'
const STORAGE_KEY_DEAD_LETTER = 'ssj_sync_dead_letter'
`))
children.push(p('对比：utils/db.js 内有个 createTables() 函数用单数 key + 前缀拼接 (ssj_record / ssj_category…)，与全项目复数约定不符；该函数未被调用，作为死代码保留。'))

children.push(h2('9.5 金额显示：等宽数字避免抖动'))
children.push(p('月度切换 ¥135.00 → ¥1000.00 时不同字号宽度会导致布局左右抖。解决：'))
children.push(codeBox(
`.kpi-value {
  font-variant-numeric: tabular-nums;   /* 等宽数字 */
}
`))

// === 十、接口设计（可选后端） ===
children.push(new Paragraph({ children: [new PageBreak()] }))
children.push(h1('十、接口设计（server/ Express + MySQL）'))

children.push(p('后端为可选模块，LocalStorage 模式下不依赖；登录后走 /api/sync 增量同步。'))

children.push(h2('10.1 鉴权约定'))
children.push(
  li('登录: POST /api/auth/login → 返回 { token, user }'),
  li('所有业务接口: Header 携带 Authorization: Bearer <token>'),
  li('中间件 verifyToken 校验后挂载 req.user = { id, ... }'),
  li('token 失效: 401 → 前端清登录态，跳登录页'),
)

children.push(h2('10.2 REST 端点列表（共 20 个）'))
children.push(
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1400, 1800, 1800, 4360],
    rows: [
      row([
        cell('资源', 1400, { header: true }),
        cell('方法 + 路径', 1800, { header: true }),
        cell('鉴权', 1800, { header: true }),
        cell('说明', 4360, { header: true }),
      ]),
      row([cell('auth', 1400), cell('POST /login', 1800), cell('公开', 1800), cell('微信小程序 code 换 token', 4360)]),
      row([cell('records', 1400), cell('GET /', 1800), cell('Bearer', 1800), cell('查询（支持 ?year_month=）', 4360)]),
      row([cell('', 1400), cell('POST /', 1800), cell('Bearer', 1800), cell('新增账单', 4360)]),
      row([cell('', 1400), cell('PUT /:id', 1800), cell('Bearer', 1800), cell('更新账单', 4360)]),
      row([cell('', 1400), cell('DELETE /:id', 1800), cell('Bearer', 1800), cell('删除账单', 4360)]),
      row([cell('categories', 1400), cell('GET /', 1800), cell('Bearer', 1800), cell('查询全部分类', 4360)]),
      row([cell('', 1400), cell('POST /', 1800), cell('Bearer', 1800), cell('新增分类', 4360)]),
      row([cell('', 1400), cell('PUT /:id', 1800), cell('Bearer', 1800), cell('更新分类', 4360)]),
      row([cell('', 1400), cell('DELETE /:id', 1800), cell('Bearer', 1800), cell('删除分类', 4360)]),
      row([cell('accounts', 1400), cell('GET /', 1800), cell('Bearer', 1800), cell('查询全部账户', 4360)]),
      row([cell('', 1400), cell('POST /', 1800), cell('Bearer', 1800), cell('新增账户', 4360)]),
      row([cell('', 1400), cell('PUT /:id', 1800), cell('Bearer', 1800), cell('更新账户', 4360)]),
      row([cell('', 1400), cell('DELETE /:id', 1800), cell('Bearer', 1800), cell('删除账户', 4360)]),
      row([cell('budgets', 1400), cell('GET /', 1800), cell('Bearer', 1800), cell('查询全月预算', 4360)]),
      row([cell('', 1400), cell('POST /', 1800), cell('Bearer', 1800), cell('新增预算', 4360)]),
      row([cell('', 1400), cell('PUT /:id', 1800), cell('Bearer', 1800), cell('更新预算', 4360)]),
      row([cell('', 1400), cell('DELETE /:id', 1800), cell('Bearer', 1800), cell('删除预算', 4360)]),
      row([cell('sync', 1400), cell('GET /', 1800), cell('Bearer', 1800), cell('拉取增量（?since=timestamp）', 4360)]),
      row([cell('', 1400), cell('POST /', 1800), cell('Bearer', 1800), cell('推送增量，返回合并结果', 4360)]),
      row([cell('health', 1400), cell('GET /api/health', 1800), cell('公开', 1800), cell('存活探针', 4360)]),
    ],
  }),
)

children.push(h2('10.3 同步策略'))
children.push(
  li('增量同步: 客户端记录 last_sync_at，请求时携带，服务端返回该时间戳之后变更'),
  li('冲突解决: 简单 LWW (Last Write Wins) — 后续可升级为字段级合并'),
  li('离线优先: 离线时所有写操作进本地 + 标记 sync_status=0，连网后批量推送'),
)

// === 十一、自检清单与已知限制 ===
children.push(new Paragraph({ children: [new PageBreak()] }))
children.push(h1('十一、自检清单与已知限制'))

children.push(h2('11.1 已自测功能 ✓'))
children.push(
  li('8 个页面路由可达，无 404 / 报错'),
  li('记一笔: 输入金额、选分类、选账户、备注、保存，首页/账单/统计三处同步刷新'),
  li('账单编辑: ?recordId=xxx 进入编辑态，修改保存正常，删除生效'),
  li('预算: 数字输入 / slider / 5 档预设 三种方式均生效，刷新后保留'),
  li('饼图: 触摸旋转 + 抬手惯性流畅；点击切块 spin 0.9s 后落在顶部'),
  li('饼图: <5% 切块自动合并为「其他」'),
  li('折线图: 跨月份切换正确；空数据占位'),
  li('数据导出: CSV / Excel (xlsx) 格式正确，Excel 打开列对齐；含日期范围选择'),
  li('路由回退: navigateTo 页面左上角返回键可正常返回'),
)

children.push(h2('11.2 已知限制 △'))
children.push(
  li('后端同步为可选模块，LocalStorage 是默认主路径 — 无登录态时所有数据仅本机可见'),
  li('饼图小切块合并阈值 5% 硬编码，未提供设置项'),
  li('金额键盘未做负数限制（业务上也用不到，但代码层可加 assert）'),
  li('分类 icon 用了 emoji，部分 Android 系统 emoji 字体不一致（已替换为 SVG，但部分旧分类仍是 emoji）'),
  li('未做 E2E 自动化测试，主要靠手动验收'),
  li('App 端未做屏幕旋转适配（锁定竖屏）'),
)

children.push(h2('11.3 未来规划 →'))
children.push(
  li('E2E 测试: 接入 Playwright / miniprogram-automator，覆盖记一笔 / 编辑 / 同步三条主路径'),
  li('多账户资金池: 同一笔账单支持多账户拆分转账'),
  li('周期性账单: 自动生成房租 / 订阅等定期记录'),
  li('图表升级: 引入 uCharts 替代自研，支持柱状/面积/雷达等更多形态'),
  li('数据导入: CSV 反向导入，方便从其他记账 App 迁移'),
)

// === 十二、运行与验收说明 ===
children.push(new Paragraph({ children: [new PageBreak()] }))
children.push(h1('十二、运行与验收说明'))

children.push(h2('12.1 环境要求'))
children.push(
  li('HBuilderX ≥ 3.8（UniApp Vue3 编译）'),
  li('Node.js ≥ 16（仅在编译自定义组件时需要）'),
  li('微信开发者工具（小程序预览，可选）'),
)

children.push(h2('12.2 启动方式'))
children.push(num('用 HBuilderX 打开项目根目录'))
children.push(num('菜单: 运行 → 运行到浏览器 → Chrome (H5 调试)'))
children.push(num('或: 运行 → 运行到小程序模拟器 → 微信开发者工具'))
children.push(num('或: 运行 → 运行到手机或模拟器 (需连接 Android/iOS 设备)'))

children.push(h2('12.3 默认登录'))
children.push(p('项目为本地优先，无需注册即可使用全部功能。「我的」页提供登录入口（mock），登录后开放云同步能力。'))

children.push(h2('12.4 验收要点'))
children.push(
  li('8 个页面均能正常进入，路由无 404 / 报错'),
  li('首页、账单、统计三个核心页面数据联动一致 (新增账单 → 各处实时刷新)'),
  li('饼图旋转 / 惯性 / 点击 spin 手感流畅，标签不与图例重叠'),
  li('预算超支时首页 banner 正确显示'),
  li('数据导出 JSON / CSV 格式正确，Excel 可正常打开 CSV'),
  li('所有本地数据持久化（重启 App 不丢失）'),
)

children.push(h2('12.5 浏览器 / 模拟器兼容性'))
children.push(
  li('H5: Chrome ≥ 90 / Edge ≥ 90 / Safari ≥ 14'),
  li('小程序: 微信开发者工具基础库 ≥ 2.30'),
  li('App: Android 6.0+ / iOS 12+'),
)

children.push(
  new Paragraph({
    spacing: { before: 600 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '— 文档结束 —', italics: true, color: '888888' })],
  }),
)

// ============ 组装文档 ============
const doc = new Document({
  creator: 'SuiShouJi Team',
  title: '随手记 - 设计文档',
  styles: {
    default: {
      document: { run: { font: 'Microsoft YaHei', size: 22 } },
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Microsoft YaHei' },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Microsoft YaHei' },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Microsoft YaHei' },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '●', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '○', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ],
      },
      {
        reference: 'numbers',
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: '随手记 · 设计文档', italics: true, color: '888888', size: 20 })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: '第 ', color: '888888', size: 20 }),
              new TextRun({ children: [PageNumber.CURRENT], color: '888888', size: 20 }),
              new TextRun({ text: ' 页 / 共 ', color: '888888', size: 20 }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], color: '888888', size: 20 }),
              new TextRun({ text: ' 页', color: '888888', size: 20 }),
            ],
          })],
        }),
      },
      children,
    },
  ],
})

const outPath = path.join(__dirname, '..', '说明.docx')
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf)
  console.log('✅ 文档已生成:', outPath)
  console.log('   大小:', (buf.length / 1024).toFixed(1), 'KB')
})
