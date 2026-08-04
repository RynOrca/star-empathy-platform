/**
 * starName.ts — 星表恒星 + 太阳系行星 统一名称/元信息查找工具
 *
 * 背景：
 *   · stars.json 只含真实恒星（正数 id），不含行星
 *   · 太阳系行星用负数 catalog_star_id 编码（-100 太阳、-101 月球 … -108 海王星）
 *     定义在 client/src/data/planets.ts 的 planets[].planetId
 *   · 此前 ProfilePage / StarDetail / SkyPage 各自用 stars.json 构建本地 lookup，
 *     对负数 id 一律查不到，导致收藏行星显示「星星 #-100」且无法跳转回行星
 *
 * 本工具合并两份数据源，提供统一查找 API，消除三处重复 lookup 的漂移风险。
 */

import catalogData from '../data/stars.json'
import { planets } from '../data/planets'

export interface StarNameInfo {
  /** 显示名（恒星：name 或 `星座缩写 #id`；行星：中文名如「太阳」） */
  name: string
  /** 星座缩写（如 'Ori'）；行星为 '' */
  con: string
  /** 视星等；行星为 0 */
  mag: number
  /** 颜色 hex（如 '#ffdd88'） */
  color: string
  /** 是否太阳系行星 */
  isPlanet: boolean
}

interface RawStar {
  id: number
  name: string | null
  con: string
  mag: number
  color?: string
}

// ─── 内部查找表（懒构建，模块级常量） ───

const planetById = new Map<number, (typeof planets)[number]>()
for (const p of planets) planetById.set(p.planetId, p)

const starById = new Map<number, RawStar>()
for (const s of (catalogData as { stars: RawStar[] }).stars) starById.set(s.id, s)

/** 将 planets.ts 的 number 颜色（0xffdd88）转为 hex 字符串 '#ffdd88' */
function planetColorToHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0')
}

// ─── 对外 API ───

/** 判断 id 是否为太阳系行星（负数 planetId） */
export function isPlanetId(id: number): boolean {
  return planetById.has(id)
}

/**
 * 按 catalog_star_id 查找星名信息。
 * · 正数 id → 查 stars.json
 * · 负数 id → 查 planets（太阳系行星）
 * · 未命中返回 undefined
 */
export function getStarNameInfo(id: number): StarNameInfo | undefined {
  const planet = planetById.get(id)
  if (planet) {
    return {
      name: planet.nameCN,
      con: '',
      mag: 0,
      color: planetColorToHex(planet.color),
      isPlanet: true,
    }
  }
  const star = starById.get(id)
  if (!star) return undefined
  return {
    name: star.name || `${star.con || ''} #${star.id}`,
    con: star.con || '',
    mag: star.mag,
    color: star.color || '#fff',
    isPlanet: false,
  }
}

/**
 * 便捷：取显示名。未命中 fallback 为 `星星 #${id}`。
 * 维持与原 ProfilePage.getStarName 一致的 fallback 文案。
 */
export function getStarDisplayName(id: number): string {
  return getStarNameInfo(id)?.name || `星星 #${id}`
}

/**
 * 取行星的英文 bodyName（如 'Sun' 'Moon' 'Mars'），供 useSky.focusOnPlanet(bodyName) 使用。
 * 仅对行星有效；恒星或未命中返回 undefined。
 */
export function getPlanetBodyName(planetId: number): string | undefined {
  return planetById.get(planetId)?.name
}
