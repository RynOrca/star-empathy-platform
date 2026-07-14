import catalogData from '../data/stars.json'

interface CatalogStar {
  id: number
  name: string | null
  ra: number; dec: number; mag: number
  color: string; con: string
  x: number; y: number; z: number
}

const CATALOG: CatalogStar[] = (catalogData as { stars: CatalogStar[] }).stars

/** 根据名字模糊查找星表恒星 */
function findStar(namePattern: string): CatalogStar | null {
  return CATALOG.find(s => s.name?.includes(namePattern)) ?? null
}

/**
 * 手工映射：种子故事 → 对应的真实恒星
 * key: 故事标题 (匹配 seed.ts 中的 title)
 *
 * 核心思路：
 *   - 优先把同一颗星在不同文化中的传说聚在一起
 *     （织女星 同时承载"水调歌头 / 牛郎织女 / 天琴与竖琴"的中国/希腊书写），
 *     让用户在同一颗星上读到文明对照；
 *   - 也引入一些本就有跨文明原型的恒星 / 星座
 *     （如"恶魔之星"大陵五、北极星的岁差故事）。
 */
const SEED_STAR_MAP: Record<string, string> = {
  // ── 原 ──
  '静夜思':     '北极星 Polaris',
  '不永恒的北极': '北极星 Polaris', // 岁差 → 北极星（公元前 3000 年 → 天龙座α，现代 → 勾陈一）
  '水调歌头':   '织女星 Vega',
  '牛郎织女':   '织女星 Vega',
  '天琴与竖琴': '织女星 Vega',     // 俄耳甫斯竖琴 = 天琴座 = 织女星
  '春江花月夜': '角宿一 Spica',
  '望月怀远':   '毕宿五 Aldebaran',
  '霜月':       '参宿七 Rigel',
  '十五夜望月': '五车二 Capella',
  '月下独酌':   '玉衡 Alioth',
  '古朗月行':   '天枢 Dubhe',
  '把酒问月':   '天津四 Deneb',
  '西江月':     '轩辕十四 Regulus',
  '帝车与四乡': '天枢 Dubhe',      // 史记·天官书 → 北斗"帝车"
  '天狼星':     '天狼星 Sirius',
  '猎户座':     '参宿四 Betelgeuse',
  '天蝎座':     '心宿二 Antares',
  '双子座':     '北河三 Pollux',
  '仙女座':     '仙女座α Alpheratz',
  '北斗七星':   '天枢 Dubhe',
  '参商二星':   '参宿四 Betelgeuse',
  '深夜独白':   '南河三 Procyon',
  '异乡人':     '北落师门 Fomalhaut',
  '程序员的自白': '大角 Arcturus',
  '雨天思考':   '天璇 Merak',
  '毕业季':     '十字架二 Acrux',
  '天鹅与飞鸟': '天津四 Deneb',    // 天津四 = 天鹅尾巴（东亚视角）
  '牵牛不服箱': '牛郎星 Altair',   // 《诗经·大东》"牵牛" = 河鼓二 = 牛郎星

  // ── v2 新增 ──
  // 英仙座 β 大陵五 Algol —— 恶魔之星 / 美杜莎之首，跨文化凶星
  '恶魔之星':   '大陵五 Algol',

  // 仙后座 α（Schedar / 王良一）—— 虚荣王后被罚倒悬
  // 注：findStar 用 s.name.includes(pattern) 匹配，西方恒星 catalog 中无中文名，
  // 故 pattern 取拉丁名。中文名仅作注释。
  '仙后的惩罚': 'Schedar',

  // 白羊座 α（Hamal / 娄宿三）—— 金羊毛
  '金毛与公羊': 'Hamal',

  // 仙王座 α（Alderamin / 天钩五）—— 皇室四星座
  '皇室四星座': 'Alderamin',

  // ── 西方亮星的名字由来（v3）──────────────────────────────
  '尾刺·Shaula':        'Shaula',        // 天蝎座 λ
  '十字横臂·Gacrux':     'Gacrux',        // 南十字座 γ
  '撞角·Elnath':         'Elnath',        // 金牛座 β / 御夫座 ζ
  '平静之水·Miaplacidus': 'Miaplacidus',  // 船底座 β
  '亮者·Alnair':         'Alnair',        // 天鹤座 α
  '重量·Wezen':          'Wezen',         // 大犬座 δ
  '手肘·Mirfak':         'Mirfak',        // 英仙座 α
  '南弓·Kaus Australis': 'Kaus Australis',// 人马座 ε
  '航海家·Avior':        'Avior',         // 船底座 ε
  '古名·Sargas':         'Sargas',        // 天蝎座 θ
  '缰绳之肩·Menkalinan': 'Menkalinan',    // 御夫座 β
  '三角之首·Atria':      'Atria',         // 南三角座 α
  '印记·Alhena':         'Alhena',        // 双子座 γ
  '孔雀之首·Peacock':    'Peacock',       // 孔雀座 α
  '先驱·Mirzam':         'Mirzam',        // 大犬座 β
  '孤独者·Alphard':      'Alphard',       // 长蛇座 α
  '羔羊·Hamal':          'Hamal',         // 白羊座 α
  '狮鬃·Algieba':        'Algieba',       // 狮子座 γ
  '火星之敌·Antares':    'Antares',       // 天蝎座 α

  // ── 次亮西方星名由来（v3b）────────────────────────────────
  '狮尾·Denebola':             'Denebola',         // 狮子座 β
  '腰肋·Zosma':                'Zosma',            // 狮子座 ζ
  '第二蛙·Diphda':             'Diphda',           // 鲸鱼座 β
  '腰带·Mirach':               'Mirach',           // 仙女座 β
  '飞马之脐·Alpheratz':        'Alpheratz',        // 仙女/飞马 α
  '查理之心·Cor Caroli':      'Cor Caroli',      // 猎犬座 α
  '缠蛇者之头·Rasalhague':     'Rasalhague',      // 蛇夫座 α
  '断冕之珠·Alphecca':         'Alphecca',         // 北冕座 α
  '织带·Izar':                 'Izar',             // 牧夫座 ε
  '龙首·Eltanin':              'Eltanin',          // 天龙座 γ
  '南爪·Zubenelgenubi':        'Zubenelgenubi',   // 天秤座 α
  '弓之中段·Kaus Media':       'Kaus Media',      // 人马座 δ
  '蛇喉·Unukalhai':            'Unukalhai',       // 巨蛇座 γ
  '乌喙·Kraz':                 'Kraz',            // 乌鸦座 β
  '苍蝇座·Mus':               'Mus',              // 苍蝇座 α
  '猎鹰·Tarazed':              'Tarazed',         // 天鹰座 ζ
  '帆船·Alsephina':            'Alsephina',       // 船帆座 γ

  // ── 剩余西方亮星分组（v3c）──────────────────────────────
  '天蝎之冠·Dschubba':  'Dschubba',    // 天蝎座 δ
  '仙后之座·Schedar':   'Schedar',     // 仙后座 α
  '飞马大四方形·Enif':  'Enif',        // 飞马座 ε
  '联星之美·Almach':    'Almach',      // 仙女座 γ
  '医神之犬·Sabik':     'Sabik',       // 蛇夫座 η
  '南斗之弓·Nunki':     'Nunki',       // 人马座 σ
  '耕者之腿·Muphrid':   'Muphrid',     // 牧夫座 η
  '小熊之腰·Pherkad':   'Pherkad',     // 小熊座 γ
  '天鹅之心·Sadr':      'Sadr',        // 天鹅座 γ
  '众尾星·Gienah':      'Gienah',      // 乌鸦座 γ
  '羊角尖·Sheratan':    'Sheratan',    // 白羊座 β
  '龙尾·Rastaban':      'Rastaban',    // 天龙座 β
  '天秤双臂·Zubeneschamali':'Zubeneschamali', // 天秤座 β
  '南方补漏·HyiTuc':    ' Hyi',        // 长蛇座 β
  '南天多层命名·AraPhe':'Ankaa',       // 凤凰座 α
}

// ─── 补充：新故事所用到的星表精确名称（findStar 模糊匹配用）───
// 以上 findStar 用 s.name?.includes(key) 匹配，故 key 必须是 stars.json
// 中 name 字段包含的片段 —— 这里列出以防后续维护者困惑：
//   '大陵五 Algol'   → stars.json 含 'Algol'
//   '王良一 Schedar' → stars.json 含 'Schedar'
//   '娄宿三 Hamal'   → stars.json 含 'Hamal'
//   '天钩五 Alderamin' → stars.json 含 'Alderamin'
//   '河鼓二 Altair'  → stars.json 含 'Altair'
// 若 stars.json 中实际字段有出入，请同步本表。

/**
 * 根据种子故事标题找到对应的星表恒星 ID
 */
export function getSeedStarId(title: string): number | null {
  const starName = SEED_STAR_MAP[title]
  if (!starName) return null
  const star = findStar(starName)
  return star?.id ?? null
}

/**
 * 为用户投递的故事随机分配一颗未命名的暗星
 * 优先选亮度适中的星 (mag 3.5~5.5)
 */
let userStarCursor = 0

export function assignUserStar(): CatalogStar {
  // 收集所有未命名且星等在 3.5~5.5 之间的星
  const pool = CATALOG.filter(s => !s.name && s.mag >= 3.5 && s.mag <= 5.5)
  if (pool.length === 0) {
    // 兜底：所有未命名星
    const fallback = CATALOG.filter(s => !s.name)
    return fallback[Math.floor(Math.random() * fallback.length)]
  }
  // 均匀分配（用 cursor 轮转，避免重复分到同一颗星）
  const star = pool[userStarCursor % pool.length]
  userStarCursor++
  return star
}

/**
 * 根据后端 pos_x/pos_y/pos_z 找最近的真实恒星（用于兼容无映射的数据）
 */
export function findNearestCatalogStar(px: number, py: number, pz: number): CatalogStar {
  let best = CATALOG[0]
  let minDist = Infinity
  for (const s of CATALOG) {
    const dx = s.x - px
    const dy = s.y - py
    const dz = s.z - pz
    const d = dx * dx + dy * dy + dz * dz
    if (d < minDist) { minDist = d; best = s }
  }
  return best
}
