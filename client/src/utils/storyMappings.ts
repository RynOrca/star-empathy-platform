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
