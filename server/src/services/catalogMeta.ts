/**
 * catalogMetaService
 *
 * 后端「星表恒星元数据」统一入口。
 *
 * 架构事实：
 *   · 项目没有 catalog_stars 表。恒星元数据（id / name / 星座缩写 / mag / 距离）
 *     是离线预计算的 JSON：client/src/data/stars.json（stars: [{ id, name, con, mag, dist? }]）
 *   · 后端各模块（chat.ts / search.ts 等）目前各自 load 一份 JSON，导致重复与漂移。
 *   · 本 service 把这份 load + 星座缩写→中文名统一抽出来，供全项目复用。
 */

import fs from 'node:fs'
import path from 'node:path'
import { PLANET_MAP, isPlanetId } from './narrative'

// ──────────────────────── 星表数据结构（与 stars.json 对齐） ────────────────────────

export interface RawCatalogStar {
  id: number
  name: string | null
  con: string       // 星座缩写：'Ori' | 'Lyr' | ...
  mag: number
  dist?: number
}

export interface CatalogStarMeta extends RawCatalogStar {
  constellationCN: string  // 中文名：'猎户' / '天琴' / ...
}

// ──────────────────────── 项目根目录解析 ────────────────────────

function getProjectRoot(): string {
  const cwd = process.cwd()
  if (cwd.endsWith('server') || cwd.endsWith('server/') || cwd.endsWith('server\\')) {
    return path.resolve(cwd, '..')
  }
  return cwd
}

// ──────────────────────── 星座缩写 → 中文名（88 星座） ────────────────────────

export const CON_NAMES: Record<string, string> = {
  And: '仙女', Ant: '唧筒', Aps: '天燕', Aqr: '宝瓶', Aql: '天鹰', Ara: '天坛',
  Ari: '白羊', Aur: '御夫', Boo: '牧夫', Cae: '雕具', Cam: '鹿豹', Cnc: '巨蟹',
  CVn: '猎犬', CMa: '大犬', CMi: '小犬', Cap: '摩羯', Car: '船底', Cas: '仙后',
  Cen: '半人马', Cep: '仙王', Cet: '鲸鱼', Cha: '蝘蜓', Cir: '圆规', Col: '天鸽',
  Com: '后发', CrA: '南冕', CrB: '北冕', Crv: '乌鸦', Crt: '巨爵', Cru: '南十字',
  Cyg: '天鹅', Del: '海豚', Dor: '剑鱼', Dra: '天龙', Equ: '小马', Eri: '波江',
  For: '天炉', Gem: '双子', Gru: '天鹤', Her: '武仙', Hor: '时钟', Hya: '长蛇',
  Hyi: '水蛇', Ind: '印第安', Lac: '蝎虎', Leo: '狮子', LMi: '小狮', Lep: '天兔',
  Lib: '天秤', Lup: '豺狼', Lyn: '天猫', Lyr: '天琴', Men: '山案', Mic: '显微镜',
  Mon: '麒麟', Mus: '苍蝇', Nor: '矩尺', Oct: '南极', Oph: '蛇夫', Ori: '猎户',
  Pav: '孔雀', Peg: '飞马', Per: '英仙', Phe: '凤凰', Pic: '绘架', Psc: '双鱼',
  PsA: '南鱼', Pup: '船尾', Pyx: '罗盘', Ret: '网罟', Sge: '天箭', Sgr: '人马',
  Sco: '天蝎', Scl: '玉夫', Sct: '盾牌', Ser: '巨蛇', Sex: '六分仪', Tau: '金牛',
  Tel: '望远镜', Tri: '三角', TrA: '南三角', Tuc: '杜鹃', UMa: '大熊', UMi: '小熊',
  Vel: '船帆', Vir: '处女', Vol: '飞鱼', Vul: '狐狸',
}

// ──────────────────────── JSON 加载（懒加载 + 只加载一次） ────────────────────────

let loaded = false
let starsList: RawCatalogStar[] = []
let starsById: Map<number, RawCatalogStar> = new Map()

function ensureLoaded(): void {
  if (loaded) return
  loaded = true
  try {
    const p = path.resolve(getProjectRoot(), 'client/src/data/stars.json')
    if (!fs.existsSync(p)) {
      console.warn(`[catalogMeta] 找不到 stars.json（路径: ${p}），catalog 查找全部返回 undefined`)
      return
    }
    const raw = fs.readFileSync(p, 'utf-8')
    const obj = JSON.parse(raw) as { stars?: RawCatalogStar[]; lines?: unknown }
    const arr = Array.isArray(obj?.stars) ? obj.stars : []
    starsList = arr
    starsById = new Map(arr.map(s => [s.id, s]))
    console.log(`[catalogMeta] 已加载 ${starsList.length} 颗星表恒星（来自 ${p}）`)
  } catch (e) {
    console.warn('[catalogMeta] 加载 stars.json 失败:', e instanceof Error ? e.message : String(e))
  }
}

// ──────────────────────── 对外 API ────────────────────────

/**
 * 查单颗星的元数据。
 * · 支持太阳系行星（负 id，走 narrative.PLANET_MAP 合成）
 * · 未命中时返回 undefined
 */
export function getCatalogStar(id: string | number): CatalogStarMeta | undefined {
  ensureLoaded()
  const nid = typeof id === 'string' ? parseInt(id, 10) : id
  if (!Number.isFinite(nid)) return undefined

  if (isPlanetId(nid)) {
    const planet = PLANET_MAP[String(nid)]
    const conCN = planet?.nameCN || '太阳系'
    return {
      id: nid,
      name: planet?.nameCN || null,
      con: '',
      mag: 0,
      constellationCN: conCN,
    }
  }

  const raw = starsById.get(nid)
  if (!raw) return undefined
  return {
    ...raw,
    constellationCN: CON_NAMES[raw.con] || raw.con || '未分星座',
  }
}

/**
 * 便捷：拿「星名 + 星座中文名」的展示组合（用于 DeepSeek system/user prompt）
 *   e.g. { starName: '天狼星', constellation: '大犬座' }
 *   name 缺失时 fallback 为 `星 #id`
 */
export function getStarDisplay(id: string | number): { starName: string; constellation: string } {
  const s = getCatalogStar(id)
  if (!s) {
    const nid = typeof id === 'number' ? id : (parseInt(id, 10) || 0)
    return { starName: `星 #${nid || 0}`, constellation: '未分星座' }
  }
  const starName = s.name || `星 #${s.id}`
  const con = s.constellationCN ? `${s.constellationCN}座` : '未分星座'
  return { starName, constellation: con }
}

/**
 * 返回全量列表（用于需要遍历的场景）。只读，不要改。
 */
export function listAllCatalogStars(): CatalogStarMeta[] {
  ensureLoaded()
  return starsList.map(s => ({
    ...s,
    constellationCN: CON_NAMES[s.con] || s.con || '未分星座',
  }))
}
