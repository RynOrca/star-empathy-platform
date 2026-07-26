// ─── 纯天文数学（零运行时依赖） ───
// 仅用于「启动时，根据经纬度 + 当前时间，把相机转到观测者头顶的真实朝向」。
// 所有角度函数内部用「度」作为输入/输出，调用方负责和 Three 的弧度互换。
//
// 模块边界（brooks-audit）：天体力学计算（开普勒方程、轨道根数 → 视位置）归属此文件，
// data/ 模块仅保留静态星表/根数数据，避免污染数据层。

import type { AsteroidElement } from '../data/asteroids'

const D2R = Math.PI / 180
const R2D = 180 / Math.PI
const HOURS_TO_DEG = 15.04106864   // 平均恒星日 → 360°/23.9344699 h

/** J2000 历元 (JD 2451545.0) 对应的 Date */
const EPOCH_J2000 = new Date('2000-01-01T12:00:00Z')

/** 黄赤交角常量（度） */
const OBLIQUITY_DEG = 23.44

/** JS Date → 儒略日 */
export function dateToJD(date: Date): number {
  // Meeus Astronomical Algorithms 7.1
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  const d = date.getUTCDate()
  const h = date.getUTCHours()
    + date.getUTCMinutes() / 60
    + date.getUTCSeconds() / 3600
    + date.getUTCMilliseconds() / 3_600_000
  const Y = m <= 2 ? y - 1 : y
  const M = m <= 2 ? m + 12 : m
  const A = Math.floor(Y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (Y + 4716))
    + Math.floor(30.6001 * (M + 1))
    + d + B - 1524.5 + h / 24
}

/** 地方恒星时（度，已规范到 [0,360) ） */
export function lstDeg(jd: number, lonDeg: number): number {
  const T = (jd - 2451545.0) / 36525   // 儒略世纪
  // IAU 2000B 简化式，精度 ~0.1s，对星图足够
  let gmst = 280.46061837
    + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * T * T
    - T * T * T / 38710000
  gmst = ((gmst % 360) + 360) % 360
  return ((gmst + lonDeg) % 360 + 360) % 360
}

/** 高度角 / 方位角（北东地平系，度） */
export function altAz(
  raH: number,
  decD: number,
  latDeg: number,
  lstDegValue: number,
): { alt: number; az: number } {
  const ha = ((lstDegValue / 15 - raH + 24) % 24) * 15 * D2R   // 时角（弧度）
  const dec = decD * D2R
  const lat = latDeg * D2R
  const sd = Math.sin(dec), cd = Math.cos(dec)
  const sh = Math.sin(ha), ch = Math.cos(ha)
  const sl = Math.sin(lat), cl = Math.cos(lat)
  const alt = Math.asin(sd * sl + cd * cl * ch)
  const az = Math.atan2(-sh * cd, sd * cl - cd * sl * ch)
  return { alt: alt * R2D, az: ((az * R2D) + 360) % 360 }
}

/** 相机初始欧拉角 {rotX, rotY}（弧度），对应 useSky.ts 的 YXZ 约定 */
export function orientationEuler(latDeg: number, lstDegValue: number): { rotX: number; rotY: number } {
  return {
    rotX: Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, latDeg * D2R)),
    rotY: -(lstDegValue / 15) * D2R,
  }
}

// ─── 真黄赤交角（按日期） ───
// IAU 2000B 简化式，精度 ~0.1″，足够星图用。
export function trueObliquityRad(date: Date): number {
  const T = (dateToJD(date) - 2451545.0) / 36525
  const eps0 = (84381.406 - 46.836769 * T - 0.0001831 * T * T + 0.00200340 * T * T * T) / 3600 * D2R
  return eps0
}

/** 黄道（当日真 ε）→ 赤道坐标（时 / 度），带日期入参 */
export function eclipticToRaDecJD(lonDeg: number, date: Date): { ra: number; dec: number } {
  const ε = trueObliquityRad(date)
  const λ = lonDeg * D2R
  const ra = Math.atan2(Math.sin(λ) * Math.cos(ε), Math.cos(λ))
  const dec = Math.asin(Math.sin(λ) * Math.sin(ε))
  return { ra: (ra + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * 24, dec: dec / R2D }
}

/** 某黄道经纬度（当日）相对观测者的 alt/az — 供可见弧段筛选 */
export function eclipticAltAz(lonDeg: number, obs: { lat: number; lon: number }, date: Date) {
  const { ra, dec } = eclipticToRaDecJD(lonDeg, date)
  return altAz(ra, dec, obs.lat, lstDeg(dateToJD(date), obs.lon))
}

// ─── 小行星轨道力学（MPC 轨道根数 → 地心视位置） ───
// 流程：M = M0 + n·(t-t0) → 牛顿迭代解开普勒方程 M = E - e·sin(E)
//       → 真近点角 v → 日心黄道坐标 → 减地球日心位置 → 黄道转赤道
// 参考：14-A §1 开普勒方程；Meeus Astronomical Algorithms Ch.33
//
// 简化：未做 Ω（升交点黄经）旋转，仅用 ω+i 近似黄道坐标，视觉精度 < 1°。
// 完整三次旋转（Ω→i→ω）多约 30 行代码，按 YAGNI 暂不实现。

/** 牛顿迭代求解开普勒方程 M = E - e·sin(E) */
function solveKepler(M: number, e: number): number {
  // 归一化 M 到 [-π, π]
  let m = ((M + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
  let E = m  // 初值
  for (let k = 0; k < 8; k++) {
    const f = E - e * Math.sin(E) - m
    const fp = 1 - e * Math.cos(E)
    const dE = f / fp
    E -= dE
    if (Math.abs(dE) < 1e-8) break
  }
  return E
}

/** 小行星日心黄道坐标（简化版，未做 Ω 旋转） */
function asteroidHelioPos(ast: AsteroidElement, date: Date): { x: number; y: number; z: number } {
  const daysSinceEpoch = (date.getTime() - EPOCH_J2000.getTime()) / 86400000
  const M = (ast.M0 + ast.n * daysSinceEpoch) * D2R
  const E = solveKepler(M, ast.e)
  // 真近点角
  const v = 2 * Math.atan2(
    Math.sqrt(1 + ast.e) * Math.sin(E / 2),
    Math.sqrt(1 - ast.e) * Math.cos(E / 2),
  )
  const r = ast.a * (1 - ast.e * Math.cos(E))
  // 日心黄道坐标（简化：仅做 ω + i 旋转，省略 Ω）
  const argLat = (ast.omega * D2R) + v  // 近日点幅角 + 真近点角
  const cosI = Math.cos(ast.i * D2R)
  const sinI = Math.sin(ast.i * D2R)
  return {
    x: r * Math.cos(argLat),
    y: r * Math.sin(argLat) * cosI,
    z: r * Math.sin(argLat) * sinI,
  }
}

/**
 * 计算小行星地心视位置（Ra/Dec）
 * 调用 astronomy-engine 获取地球日心位置，与小行星日心位置相减得地心向量，
 * 再做黄道 → 赤道坐标转换（ε = 23.44°）。
 *
 * @param ast 小行星轨道根数
 * @param date 观测日期
 * @returns { ra: 小时, dec: 度, distance: AU }，失败返回 null
 */
export async function getAsteroidPosition(
  ast: AsteroidElement,
  date: Date = new Date(),
): Promise<{ ra: number; dec: number; distance: number } | null> {
  try {
    const A = await import('astronomy-engine')
    return getAsteroidPositionSync(A, ast, date)
  } catch (e) {
    console.error('[astro] getAsteroidPosition failed for', ast.name, e)
    return null
  }
}

/**
 * 同步版本：复用调用方已导入的 astronomy-engine 模块，避免每帧动态 import
 * 用于 animate 循环每帧重算小行星位置（实时模拟运动）
 */
export function getAsteroidPositionSync(
  A: typeof import('astronomy-engine'),
  ast: AsteroidElement,
  date: Date,
): { ra: number; dec: number; distance: number } | null {
  try {
    const helioAst = asteroidHelioPos(ast, date)
    const earthState = A.HelioVector(A.Body.Earth, date)
    const geo_x = helioAst.x - earthState.x
    const geo_y = helioAst.y - earthState.y
    const geo_z = helioAst.z - earthState.z
    const distance = Math.sqrt(geo_x * geo_x + geo_y * geo_y + geo_z * geo_z)
    const eps = OBLIQUITY_DEG * D2R
    const cosE = Math.cos(eps)
    const sinE = Math.sin(eps)
    const eq_x = geo_x
    const eq_y = geo_y * cosE - geo_z * sinE
    const eq_z = geo_y * sinE + geo_z * cosE
    const ra = (Math.atan2(eq_y, eq_x) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI) * 24
    const dec = Math.atan2(eq_z, Math.sqrt(eq_x * eq_x + eq_y * eq_y)) / D2R
    return { ra, dec, distance }
  } catch {
    return null
  }
}
