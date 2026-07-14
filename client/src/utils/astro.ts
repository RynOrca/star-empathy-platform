// ─── 纯天文数学（零依赖） ───
// 仅用于「启动时，根据经纬度 + 当前时间，把相机转到观测者头顶的真实朝向」。
// 所有角度函数内部用「度」作为输入/输出，调用方负责和 Three 的弧度互换。

const D2R = Math.PI / 180
const R2D = 180 / Math.PI
const HOURS_TO_DEG = 15.04106864   // 平均恒星日 → 360°/23.9344699 h

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
