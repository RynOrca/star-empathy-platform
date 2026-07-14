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
