export interface PlanetData {
  name: string
  nameCN: string
  color: number
  size: number // 渲染半径
  ringColor?: number
  ringSize?: number
  // 简化轨道参数（日心，AU 单位）
  semiMajorAxis: number
  eccentricity: number
  inclination: number
  period: number // 年
}

export const planets: PlanetData[] = [
  {
    name: 'Sun', nameCN: '太阳', color: 0xffdd88, size: 5,
    semiMajorAxis: 0, eccentricity: 0, inclination: 0, period: 0,
  },
  {
    name: 'Moon', nameCN: '月球', color: 0xcccccc, size: 1.2,
    semiMajorAxis: 0.00257, eccentricity: 0.0549, inclination: 5.1, period: 0.075,
  },
  {
    name: 'Venus', nameCN: '金星', color: 0xe8cda0, size: 1.8,
    semiMajorAxis: 0.723, eccentricity: 0.007, inclination: 3.4, period: 0.615,
  },
  {
    name: 'Mars', nameCN: '火星', color: 0xdd6644, size: 1.4,
    semiMajorAxis: 1.524, eccentricity: 0.093, inclination: 1.85, period: 1.881,
  },
  {
    name: 'Jupiter', nameCN: '木星', color: 0xddaa77, size: 3.5,
    semiMajorAxis: 5.203, eccentricity: 0.048, inclination: 1.3, period: 11.86,
  },
  {
    name: 'Saturn', nameCN: '土星', color: 0xddcc99, size: 3.0,
    ringColor: 0xccbb88, ringSize: 5.5,
    semiMajorAxis: 9.537, eccentricity: 0.054, inclination: 2.49, period: 29.46,
  },
]

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

// ═══ 真实天文计算 ═══

/** J2000.0 儒略日 */
const JD_J2000 = 2451545.0

/** 当前儒略日 */
function getCurrentJD(): number {
  return Date.now() / 86400000 + 2440587.5
}

/** J2000 起的儒略世纪数 */
function julianCenturies(jd: number = getCurrentJD()): number {
  return (jd - JD_J2000) / 36525
}

/** 真黄赤交角（弧度），根据日期计算 */
export function trueObliquity(jd: number = getCurrentJD()): number {
  const T = julianCenturies(jd)
  // IAU 2006 精确公式
  const eps0 = 84381.406
    - 46.836769 * T
    - 0.0001831 * T * T
    + 0.00200340 * T * T * T
    - 0.000000576 * T * T * T * T
  // 章动修正（简化）
  const dPsi = -0.0001 // 简化章动
  const dEps = -0.00003
  return (eps0 + dEps) / 3600 * Math.PI / 180
}

/** 简化行星轨道元素（J2000 平均值 + 世纪变化率） */
interface OrbitalElements {
  L: number   // 平均黄经（度，J2000）
  Lrate: number // 平均黄经变化率（度/世纪）
  a: number   // 半长轴（AU）
  e: number   // 偏心率
  i: number   // 轨道倾角（度，相对黄道）
  w: number   // 近日点经度（度）
  Or: number  // 升交点经度（度）
}

const ORBITAL_ELEMENTS: Record<string, OrbitalElements> = {
  Mercury: { L: 252.251, Lrate: 149472.675, a: 0.387, e: 0.2056, i: 7.005, w: 77.456, Or: 48.331 },
  Venus:   { L: 181.980, Lrate: 58517.816, a: 0.723, e: 0.0068, i: 3.395, w: 131.564, Or: 76.680 },
  Mars:    { L: 355.433, Lrate: 19140.299, a: 1.524, e: 0.0934, i: 1.850, w: 336.060, Or: 49.558 },
  Jupiter: { L: 34.351, Lrate: 3034.906, a: 5.203, e: 0.0485, i: 1.303, w: 14.331, Or: 100.464 },
  Saturn:  { L: 50.077, Lrate: 1222.114, a: 9.537, e: 0.0542, i: 2.489, w: 93.057, Or: 113.665 },
}

/** 求解开普勒方程 M = E - e*sin(E) */
function solveKepler(M: number, e: number): number {
  let E = M
  for (let iter = 0; iter < 20; iter++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E))
    E += dE
    if (Math.abs(dE) < 1e-8) break
  }
  return E
}

/**
 * 计算行星的赤道坐标（RA 小时, Dec 度）
 * @param name 行星英文名
 * @param jd 儒略日（默认当前时间）
 */
export function computePlanetRaDec(name: string, jd: number = getCurrentJD()): { ra: number; dec: number; dist: number } | null {
  if (name === 'Sun') return { ra: 0, dec: 0, dist: 0 }
  if (name === 'Moon') return null // 月球需要地球位置，暂跳过

  const el = ORBITAL_ELEMENTS[name]
  if (!el) return null

  const T = julianCenturies(jd)
  const D2R = Math.PI / 180

  // 平均黄经
  const L = (el.L + el.Lrate * T) * D2R
  // 近日点参数
  const w = (el.w + (el.Or > 0 ? -el.Or : 0)) * D2R // 简化
  const wbar = el.w * D2R + el.Lrate * T * D2R // 近日点经度近似
  const M = L - wbar // 平均近点角

  const E = solveKepler(M, el.e)

  // 日心黄道坐标
  const cosE = Math.cos(E)
  const sinE = Math.sin(E)
  const xEcl = el.a * (cosE - el.e)
  const yEcl = el.a * Math.sqrt(1 - el.e * el.e) * sinE

  // 转换为黄道经纬
  const cosw = Math.cos(el.w * D2R)
  const sinw = Math.sin(el.w * D2R)
  const cosO = Math.cos(el.Or * D2R)
  const sinO = Math.sin(el.Or * D2R)
  const cosI = Math.cos(el.i * D2R)
  const sinI = Math.sin(el.i * D2R)

  // 黄道坐标
  const xOrb = xEcl * cosw - yEcl * sinw
  const yOrb = xEcl * sinw + yEcl * cosw
  const xEcl2 = xOrb * cosO - yOrb * cosI * sinO
  const yEcl2 = xOrb * sinO + yOrb * cosI * cosO
  const zEcl2 = yOrb * sinI

  // 从地球位置计算（简化：地球轨道近似圆）
  const earthL = (100.464 + 35999.372 * T) * D2R
  const earthA = 1.0
  const xEarth = earthA * Math.cos(earthL)
  const yEarth = earthA * Math.sin(earthL)
  const zEarth = 0

  // 地心黄道坐标
  const dx = xEcl2 - xEarth
  const dy = yEcl2 - yEarth
  const dz = zEcl2 - zEarth
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

  // 黄道经纬
  const lon = Math.atan2(dy, dx)
  const lat = Math.atan2(dz, Math.sqrt(dx * dx + dy * dy))

  // 转换为赤道坐标
  const eps = trueObliquity(jd)
  const sinLon = Math.sin(lon)
  const cosLon = Math.cos(lon)
  const sinLat = Math.sin(lat)
  const cosLat = Math.cos(lat)
  const sinEps = Math.sin(eps)
  const cosEps = Math.cos(eps)

  const ra = Math.atan2(
    sinLon * cosEps - Math.tan(lat) * sinEps,
    cosLon
  )
  const dec = Math.asin(
    sinLat * cosEps + cosLat * sinEps * sinLon
  )

  const raH = ((ra + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 24
  const decDeg = dec / D2R

  return { ra: raH, dec: decDeg, dist }
}
