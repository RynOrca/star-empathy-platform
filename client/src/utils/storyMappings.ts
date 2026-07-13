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
 */
const SEED_STAR_MAP: Record<string, string> = {
  '静夜思':     '北极星 Polaris',   // 静夜望月 → 北极星
  '水调歌头':   '织女星 Vega',     // 明月几时有 → 织女星
  '春江花月夜': '角宿一 Spica',    // 春江月明 → 室女座最亮星
  '望月怀远':   '毕宿五 Aldebaran', // 海上明月 → 金牛座之眼
  '霜月':       '参宿七 Rigel',     // 月中霜里 → 猎户座蓝超巨星
  '十五夜望月': '五车二 Capella',   // 秋思落谁家 → 御夫座最亮星
  '月下独酌':   '玉衡 Alioth',     // 举杯邀明月 → 北斗玉衡
  '古朗月行':   '天枢 Dubhe',      // 小时不识月 → 北斗天枢
  '把酒问月':   '天津四 Deneb',    // 问月几何 → 天鹅座
  '西江月':     '轩辕十四 Regulus', // 明月别枝 → 狮子座
  '牛郎织女':   '织女星 Vega',     // 同用 Vega
  '天狼星':     '天狼星 Sirius',   // 直接对应
  '猎户座':     '参宿四 Betelgeuse', // 猎户座α
  '天蝎座':     '心宿二 Antares',  // 天蝎座α
  '双子座':     '北河三 Pollux',   // 双子座β
  '仙女座':     '仙女座α Alpheratz', // 仙女座α
  '北斗七星':   '天枢 Dubhe',      // 北斗第一星
  '参商二星':   '参宿四 Betelgeuse', // 参星
  '深夜独白':   '南河三 Procyon',  // 小犬座
  '异乡人':     '北落师门 Fomalhaut', // 南鱼座
  '程序员的自白': '大角 Arcturus', // 牧夫座最亮
  '雨天思考':   '天璇 Merak',      // 北斗之二
  '毕业季':     '十字架二 Acrux',  // 南十字
}

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
