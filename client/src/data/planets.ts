export interface PlanetInfo {
  name: string
  nameCN: string
  color: number          // 保留，用于 fallback
  texture: string        // 纹理文件路径（/textures/planets/xxx.jpg）
  size: number // 渲染半径
  /** 行星 ID（负数，与 stars 表的 catalog_star_id 区分；用于点击回调与故事查询 */
  planetId: number
  ringColor?: number     // 保留向后兼容
  ringSize?: number
  ringTexture?: string   // 土星环纹理（带 alpha 通道）
  /** 土星环内半径因子（相对 planet.size 的倍数）；默认 1.4 */
  ringInnerFactor?: number
  /** 土星环外半径因子（相对 planet.size 的倍数）；默认 2.3 */
  ringOuterFactor?: number
  // 简化轨道参数（日心，AU 单位）
  semiMajorAxis: number
  eccentricity: number
  inclination: number
  period: number // 年
  rotationPeriod?: number // 自转周期（小时），14-A §4；负值表示逆向自转
  axialTilt?: number      // 轴倾角（度），14-A §4
  atmosphere?: {          // 大气层光晕（菲涅尔 shader）
    color: number         // 大气颜色（如地球蓝、金星黄）
    intensity: number     // 强度 0~1
    /** Rayleigh 散射系数 [r, g, b]（OPT-9 Physical-Lite shader，可选） */
    rayleigh?: [number, number, number]
    /** Mie 散射系数（OPT-9 Physical-Lite shader，可选） */
    mie?: number
    /** Henyey-Greenstein 不对称参数 g（OPT-9，可选） */
    mieG?: number
  }
}

/** @deprecated 保留向后兼容 */
export type PlanetData = PlanetInfo

export const planets: PlanetData[] = [
  {
    name: 'Sun', nameCN: '太阳', color: 0xffdd88, texture: '/textures/planets/2k_sun.jpg',
    // 物理直径 1,392,700 km = 5.0 基准（太阳作为基准天体）
    size: 5.0, planetId: -100, semiMajorAxis: 0, eccentricity: 0, inclination: 0, period: 0,
    rotationPeriod: 609.12, axialTilt: 7.25,
  },
  {
    name: 'Mercury', nameCN: '水星', color: 0x999999, texture: '/textures/planets/2k_mercury.jpg',
    // 物理直径 4,879 km → 5.0 * 4879/1392700 = 0.018
    size: 0.018, planetId: -106, semiMajorAxis: 0.387, eccentricity: 0.206, inclination: 7.0, period: 0.241,
    rotationPeriod: 1407.6, axialTilt: 0.03,
  },
  {
    name: 'Venus', nameCN: '金星', color: 0xe8cda0, texture: '/textures/planets/2k_venus_surface.jpg',
    // 物理直径 12,104 km → 5.0 * 12104/1392700 = 0.043
    size: 0.043, planetId: -102, semiMajorAxis: 0.723, eccentricity: 0.007, inclination: 3.4, period: 0.615,
    rotationPeriod: -5832.5, axialTilt: 177.36, // 逆向自转
    // 浓密黄色 CO2 大气：Rayleigh 偏暖黄（蓝光被吸收），Mie 高浑浊度
    atmosphere: {
      color: 0xffe0a0, intensity: 0.6,
      rayleigh: [0.8, 0.7, 0.4], mie: 0.5, mieG: 0.85,
    },
  },
  {
    name: 'Moon', nameCN: '月球', color: 0xcccccc, texture: '/textures/planets/2k_moon.jpg',
    // 物理直径 3,474 km → 5.0 * 3474/1392700 = 0.012
    size: 0.012, planetId: -101, semiMajorAxis: 0.00257, eccentricity: 0.0549, inclination: 5.1, period: 0.075,
    rotationPeriod: 655.7, axialTilt: 6.68,
  },
  {
    name: 'Mars', nameCN: '火星', color: 0xdd6644, texture: '/textures/planets/2k_mars.jpg',
    // 物理直径 6,779 km → 5.0 * 6779/1392700 = 0.024
    size: 0.024, planetId: -103, semiMajorAxis: 1.524, eccentricity: 0.093, inclination: 1.85, period: 1.881,
    rotationPeriod: 24.6, axialTilt: 25.19,
    // 稀薄红色 CO2 大气：Rayleigh 偏暖红，Mie 低浑浊度（大气薄）
    atmosphere: {
      color: 0xff8866, intensity: 0.35,
      rayleigh: [0.6, 0.5, 0.4], mie: 0.3, mieG: 0.8,
    },
  },
  {
    name: 'Jupiter', nameCN: '木星', color: 0xddaa77, texture: '/textures/planets/2k_jupiter.jpg',
    // 物理直径 139,820 km → 5.0 * 139820/1392700 = 0.502
    size: 0.502, planetId: -104, semiMajorAxis: 5.203, eccentricity: 0.048, inclination: 1.3, period: 11.86,
    rotationPeriod: 9.93, axialTilt: 3.13,
    // 厚 H2/He 大气：Rayleigh 偏冷蓝（气体巨星），Mie 中等浑浊度
    atmosphere: {
      color: 0xeed8a8, intensity: 0.45,
      rayleigh: [0.5, 0.6, 0.8], mie: 0.4, mieG: 0.75,
    },
  },
  {
    name: 'Saturn', nameCN: '土星', color: 0xddcc99, texture: '/textures/planets/2k_saturn.jpg',
    // 物理直径 116,460 km → 5.0 * 116460/1392700 = 0.418
    size: 0.418, planetId: -105, ringColor: 0xccbb88, ringSize: 5.5, ringTexture: '/textures/planets/2k_saturn_ring_alpha.png',
    ringInnerFactor: 1.4, ringOuterFactor: 2.3,
    semiMajorAxis: 9.537, eccentricity: 0.054, inclination: 2.49, period: 29.46,
    rotationPeriod: 10.7, axialTilt: 26.73,
    atmosphere: {
      color: 0xeed8a8, intensity: 0.45,
      rayleigh: [0.5, 0.6, 0.8], mie: 0.4, mieG: 0.75,
    },
  },
  {
    name: 'Uranus', nameCN: '天王星', color: 0x88ccdd, texture: '/textures/planets/2k_uranus.jpg',
    // 物理直径 50,724 km → 5.0 * 50724/1392700 = 0.182
    size: 0.182, planetId: -107, semiMajorAxis: 19.191, eccentricity: 0.047, inclination: 0.77, period: 84.01,
    rotationPeriod: -17.24, axialTilt: 97.77, // 侧躺自转
    // 甲烷大气：Rayleigh 偏青蓝（CH4 吸收红光），Mie 低浑浊度
    atmosphere: {
      color: 0x88dde8, intensity: 0.55,
      rayleigh: [0.3, 0.5, 0.9], mie: 0.3, mieG: 0.75,
    },
  },
  {
    name: 'Neptune', nameCN: '海王星', color: 0x3366cc, texture: '/textures/planets/2k_neptune.jpg',
    // 物理直径 49,244 km → 5.0 * 49244/1392700 = 0.177
    size: 0.177, planetId: -108, semiMajorAxis: 30.069, eccentricity: 0.009, inclination: 1.77, period: 164.79,
    rotationPeriod: 16.11, axialTilt: 28.32,
    // 甲烷大气深蓝：Rayleigh 偏深蓝，Mie 低浑浊度
    atmosphere: {
      color: 0x4488ff, intensity: 0.6,
      rayleigh: [0.2, 0.4, 1.0], mie: 0.3, mieG: 0.75,
    },
  },
]

/** @deprecated 使用 getBodyPosition 代替（基于 astronomy-engine） */
// 简化轨道计算：返回相对于太阳的天球坐标（RA 小时, Dec 度, 距离 AU）
export function getPlanetPosition(
  planet: PlanetData,
  jdOffset: number = 0, // 儒略日偏移（默认用今天）
): { ra: number; dec: number; dist: number } {
  if (planet.semiMajorAxis === 0) return { ra: 0, dec: 0, dist: 0 } // 太阳在原点

  // 简化开普勒方程：平均近点角 + 偏近点角近似
  const meanAnomaly = (jdOffset / 365.25) / planet.period * 360
  const rad = meanAnomaly * Math.PI / 180
  // 用偏近点角近似（忽略偏心率影响）
  const angle = rad + planet.eccentricity * Math.sin(rad)

  const r = planet.semiMajorAxis * (1 - planet.eccentricity * Math.cos(angle))

  // 3D 位置（日心黄道坐标）
  const x = r * Math.cos(angle)
  const z = r * Math.sin(angle)
  const y = r * Math.sin(planet.inclination * Math.PI / 180) * Math.sin(angle)

  // 用方向计算 RA/Dec
  const d = Math.sqrt(x * x + y * y + z * z)
  const ra = ((Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 24
  const dec = Math.asin(y / d) * 180 / Math.PI

  return { ra, dec, dist: r }
}

import type { Body as AEBody } from 'astronomy-engine'

/** 行星名称到 astronomy-engine Body 枚举值的映射 */
export const BODY_MAP: Record<string, string> = {
  'Sun': 'Sun',
  'Moon': 'Moon',
  'Mercury': 'Mercury',
  'Venus': 'Venus',
  'Mars': 'Mars',
  'Jupiter': 'Jupiter',
  'Saturn': 'Saturn',
  'Uranus': 'Uranus',
  'Neptune': 'Neptune',
} as const

/**
 * 使用 astronomy-engine 计算行星的赤道坐标
 * @param name 行星英文名
 * @param observerLat 观测者纬度（度）
 * @param observerLng 观测者经度（度）
 * @returns { ra: number (小时), dec: number (度), dist: number (AU) } | null
 */
export async function getBodyPosition(
  name: string,
  observerLat: number,
  observerLng: number,
  date: Date = new Date(),
): Promise<{ ra: number; dec: number; dist: number } | null> {
  try {
    const A = await import('astronomy-engine')
    const bodyName = BODY_MAP[name]
    if (!bodyName) return null
    const body = (A.Body as unknown as Record<string, AEBody>)[bodyName]
    if (!body) return null

    const observer = new A.Observer(observerLat, observerLng, 0)
    const eq = A.Equator(body, date, observer, true, false)

    return {
      ra: eq.ra,   // 已经是小时
      dec: eq.dec, // 已经是度
      dist: eq.dist,
    }
  } catch (e) {
    console.error('[planets] getBodyPosition failed for', name, e)
    return null
  }
}

/**
 * 阶段 3 P0-2：行星视运动轨迹（14-A §2 视运动）
 * 通过对 astronomy-engine Equator() 在未来 N 天采样，得到行星在天球上的视运动轨迹
 * - 内行星（水星、金星）会合周期短，采样 200 天每天一点
 * - 外行星会合周期长，采样 800 天每 5 天一点
 * - 太阳/月球不绘制轨迹（太阳是参考系原点，月球轨迹太复杂由月相代替）
 * @returns { ra: 小时, dec: 度 }[] 数组，空数组表示不支持
 */
export async function getOrbitPath(
  name: string,
  observerLat: number,
  observerLng: number,
): Promise<{ ra: number; dec: number }[]> {
  // 太阳/月球不绘制视运动轨迹
  if (name === 'Sun' || name === 'Moon') return []
  try {
    const A = await import('astronomy-engine')
    const bodyName = BODY_MAP[name]
    if (!bodyName) return []
    const body = (A.Body as unknown as Record<string, AEBody>)[bodyName]
    if (!body) return []

    const observer = new A.Observer(observerLat, observerLng, 0)
    // 内行星会合周期 ~116/584 天，外行星 ~780 天以上
    // 采样参数：内行星每天一点共 200 点，外行星每 5 天一点共 160 点
    const isInner = name === 'Mercury' || name === 'Venus'
    const stepDays = isInner ? 1 : 5
    const totalDays = isInner ? 200 : 800
    const now = new Date()
    const path: { ra: number; dec: number }[] = []
    for (let d = 0; d <= totalDays; d += stepDays) {
      const date = new Date(now.getTime() + d * 86400000)
      const eq = A.Equator(body, date, observer, true, false)
      path.push({ ra: eq.ra, dec: eq.dec })
    }
    return path
  } catch (e) {
    console.error('[planets] getOrbitPath failed for', name, e)
    return []
  }
}

/**
 * 阶段 3 P0-1：月相计算（14-C §1 地月系）
 * 使用 astronomy-engine Illumination(Body.Moon, date) 获取月相信息
 * @returns { phaseFraction: 0~1, phaseName: 中文月相名, illumination: 0~1 }
 */
export async function getMoonPhase(): Promise<{
  phaseFraction: number
  phaseName: string
  illumination: number
} | null> {
  try {
    const A = await import('astronomy-engine')
    const info = A.Illumination(A.Body.Moon, new Date())
    // phase_fraction: 0=新月, 0.25=上弦, 0.5=满月, 0.75=下弦
    const f = info.phase_fraction
    let phaseName: string
    if (f < 0.03 || f > 0.97) phaseName = '新月'
    else if (f < 0.22) phaseName = '蛾眉月'
    else if (f < 0.28) phaseName = '上弦月'
    else if (f < 0.47) phaseName = '盈凸月'
    else if (f < 0.53) phaseName = '满月'
    else if (f < 0.72) phaseName = '亏凸月'
    else if (f < 0.78) phaseName = '下弦月'
    else phaseName = '残月'
    return {
      phaseFraction: f,
      phaseName,
      illumination: info.phase_fraction < 0.5
        ? info.phase_fraction * 2        // 上半月：0~1
        : (1 - info.phase_fraction) * 2, // 下半月：1~0
    }
  } catch (e) {
    console.error('[planets] getMoonPhase failed', e)
    return null
  }
}

/**
 * 阶段 3 P1-1：当前节气计算（14-B §3 黄道与节气）
 * 太阳黄经每 15° 一个节气，春分 0°、清明 15°、夏至 90°...
 * 使用 astronomy-engine SunPosition(date).elon 获取太阳黄经
 * @returns { termName: 当前节气名, nextTermName: 下一节气名, daysToNext: 距下一节气天数 }
 */
export async function getSolarTerm(): Promise<{
  termName: string
  nextTermName: string
  daysToNext: number
} | null> {
  try {
    const A = await import('astronomy-engine')
    // 24 节气中文名（春分起，每 15°一个）
    // 春分 0°、清明 15°、谷雨 30°、立夏 45°、小满 60°、芒种 75°、
    // 夏至 90°、小暑 105°、大暑 120°、立秋 135°、处暑 150°、白露 165°、
    // 秋分 180°、寒露 195°、霜降 210°、立冬 225°、小雪 240°、大雪 255°、
    // 冬至 270°、小寒 285°、大寒 300°、立春 315°、雨水 330°、惊蛰 345°
    const TERMS = [
      '春分', '清明', '谷雨', '立夏', '小满', '芒种',
      '夏至', '小暑', '大暑', '立秋', '处暑', '白露',
      '秋分', '寒露', '霜降', '立冬', '小雪', '大雪',
      '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰',
    ]
    const now = new Date()
    const sun = A.SunPosition(now)
    const lonDeg = ((sun.elon % 360) + 360) % 360
    const idx = Math.floor(lonDeg / 15) % 24
    const termName = TERMS[idx]
    const nextTermName = TERMS[(idx + 1) % 24]
    // 计算下一节气还有多少天：找到下一节气边界
    // 简化：用线性外推（太阳黄经变化 ~0.9856°/天）
    const nextBoundary = ((idx + 1) * 15) % 360
    let diff = nextBoundary - lonDeg
    if (diff <= 0) diff += 360
    const daysToNext = diff / 0.9856
    return { termName, nextTermName, daysToNext: Math.ceil(daysToNext) }
  } catch (e) {
    console.error('[planets] getSolarTerm failed', e)
    return null
  }
}
