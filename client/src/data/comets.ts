 /**
 * comets.ts — 彗星数据与位置计算
 *
 * ─── 设计要点 ───────────────────────────────────────────────────────
 *
 * 1. **轨道根数来源**
 *    NASA JPL Small-Body Database（https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html）
 *    使用 J2000 黄道参考系，元素为：q（近日距 AU）、e（偏心率）、i（轨道倾角°）、
 *    Ω（升交点黄经°）、ω（近日点幅角°）、T（近日点时刻，儒略日 JD）。
 *
 * 2. **位置计算（开普勒方程）**
 *    a. 半长轴 a = q / (1 - e)
 *    b. 平均运动 n = 2π / P，P = 365.25 * a^1.5（开普勒第三定律，单位天）
 *    c. 平近点角 M = n * (t - T)
 *    d. 迭代解开普勒方程 M = E - e·sin(E)（牛顿-拉夫森，6 次收敛到 1e-8）
 *    e. 真近点角 ν：cos ν = (cos E - e) / (1 - e·cos E)
 *    f. 日心距 r = a · (1 - e·cos E)
 *    g. perifocal → 黄道 J2000：标准 3-2-3 旋转 R = Rz(Ω)·Rx(i)·Rz(ω)
 *    h. 黄道 → 赤道 J2000：绕 x 轴旋转 -ε（J2000 平黄赤交角 23.4392911°）
 *    i. 减去地球日心位置（astronomy-engine HelioVector，赤道 J2000）→ 地心向量
 *    j. RA = atan2(y, x)，Dec = asin(z/|r|)
 *
 * 3. **精度**
 *    - 开普勒方程迭代 6 次，误差 < 1e-8 rad（< 0.001″）
 *    - 忽略行星摄动（对短时间跨度足够，误差 < 1′ ）
 *    - 忽略非引力效应（仅对接近太阳的彗星有显著影响，可视化可接受）
 *    - 忽略周年光行差（最大 ~20.5″，在 R=500 天球上 < 0.05 像素，远低于视觉阈值）
 *    - 忽略光行时差（典型 8 分钟 × 30 km/s = 14,400 km，角度误差 ~20″，可忽略）
 *    - 上述取舍与 astronomy-engine 的 Equator(aberration=false) 设计一致，保持参考系统一
 *
 * 4. **彗星选择**
 *    - 1P/Halley：最著名，周期 76 年，下次近日点 2061-07-28
 *    - 2P/Encke：最短周期 3.3 年，适合展示运动效果
 *    - 67P/Churyumov-Gerasimenko：罗塞塔号 2014 年首次登陆彗星的目标，周期 6.44 年
 *    - C/1995 O1 (Hale-Bopp)：1997 年世纪大彗星，周期约 2364 年，近 50 年最亮彗星
 *
 * 5. **拖尾方向**
 *    彗尾总是背向太阳。在天空球面上，拖尾方向 = 彗星 3D 位置 - 太阳 3D 位置（归一化）。
 *    使用与 useSky.ts raDecXYZ 相同的坐标系约定（y=up, z 负向 RA 增加方向）。
 *    注：当前使用弦方向近似（非切平面投影），在合附近会退化为默认方向；
 *    对可视化目的可接受，未来如需严格物理正确可改为切平面投影。
 */

import type * as A from 'astronomy-engine'

// ─── 类型定义 ─────────────────────────────────────────────────────────

export interface CometElement {
  /** 内部标识（英文名） */
  name: string
  /** 中文显示名 */
  nameCN: string
  /** 彗核渲染半径（场景单位） */
  nucleusSize: number
  /** 颜色（十六进制，如 0xa8d8ff） */
  color: number
  /** 彗星 ID（负数，与 stars 表 catalog_star_id 区分；用于点击回调与故事查询） */
  planetId: number
  /** 近日距 q（AU） */
  q: number
  /** 偏心率 e */
  e: number
  /** 轨道倾角 i（度，J2000） */
  i: number
  /** 升交点黄经 Ω（度，J2000） */
  omega: number          // 大写 Ω
  /** 近日点幅角 ω（度，J2000） */
  argPeri: number        // 小写 ω
  /** 近日点时刻（儒略日 JD） */
  perihelionJD: number
  /** 轨道周期（年），用于平均运动计算 */
  periodYears: number
}

// ─── 真实彗星数据（NASA JPL Small-Body Database）─────────────────────

export const COMETS: CometElement[] = [
  {
    name: 'Halley',
    nameCN: '哈雷彗星',
    nucleusSize: 0.6,
    color: 0xa8d8ff,
    planetId: -113,
    // 1P/Halley (J2000, epoch 1986-02-18)
    // Source: https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=1P
    q: 0.58597811,
    e: 0.96714291,
    i: 162.26269,
    omega: 58.42008,       // Ω
    argPeri: 111.33249,    // ω
    perihelionJD: 2446470.9586,  // 1986-02-09.4586
    periodYears: 76.0,
  },
  {
    name: 'Encke',
    nameCN: '恩克彗星',
    nucleusSize: 0.45,
    color: 0xc8e8ff,
    planetId: -114,
    // 2P/Encke (J2000, epoch 2023-04-05)
    // Source: https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=2P
    q: 0.33600561,
    e: 0.84830892,
    i: 11.78177,
    omega: 334.56831,      // Ω
    argPeri: 186.23814,    // ω
    perihelionJD: 2460240.953,  // 2023-10-22.453
    periodYears: 3.30,
  },
  {
    name: '67P',
    nameCN: '丘留莫夫-格拉西缅科彗星',
    nucleusSize: 0.4,
    color: 0xb8d8b8,
    planetId: -115,
    // 67P/Churyumov-Gerasimenko (J2000, epoch 2015-12-21 = JD 2457305.5)
    // Source: NASA JPL SBDB (orbit_id K213/6, 2024-02-01 solution)
    // https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=67P&full-prec=1
    q: 1.243265641416762,
    e: 0.6409081306555051,
    i: 7.040294906760007,
    omega: 50.13557380441372,   // Ω
    argPeri: 12.79824973415729, // ω
    perihelionJD: 2457247.588657863465,  // 2015-08-13.09
    periodYears: 6.44,          // 2353.08 天 / 365.25
  },
  {
    name: 'HaleBopp',
    nameCN: '海尔-波普彗星',
    nucleusSize: 0.7,
    color: 0xd8e8f8,
    planetId: -116,
    // C/1995 O1 (Hale-Bopp) (J2000, epoch 2022-12-16 = JD 2459837.5)
    // Source: NASA JPL SBDB (orbit_id 226, 2022-08-01 solution)
    // https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=C/1995%20O1&full-prec=1
    q: 0.890537663547794,
    e: 0.9949810027633206,
    i: 89.28759424740302,
    omega: 282.7334213961641,   // Ω
    argPeri: 130.4146670659176, // ω
    perihelionJD: 2450537.134907143944,  // 1997-04-01.63
    periodYears: 2363.5,        // 863279.5 天 / 365.25
  },
]

// ─── 数学常量 ─────────────────────────────────────────────────────────

const D2R = Math.PI / 180
const R2D = 180 / Math.PI
const TWO_PI = Math.PI * 2
/** J2000 平黄赤交角（度）— IAU 1976 / Lieske 1979 */
const OBLIQUITY_J2000_DEG = 23.43929111
const OBLIQUITY_J2000_RAD = OBLIQUITY_J2000_DEG * D2R
const COS_OBL = Math.cos(OBLIQUITY_J2000_RAD)
const SIN_OBL = Math.sin(OBLIQUITY_J2000_RAD)

/** 儒略日 → Date 对象 */
function jdToDate(jd: number): Date {
  // JD 2440587.5 = 1970-01-01 00:00:00 UTC
  return new Date((jd - 2440587.5) * 86400000)
}

/** Date → 儒略日 */
function dateToJD(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

// ─── 开普勒方程求解 ──────────────────────────────────────────────────

/**
 * 牛顿-拉夫森法解开普勒方程 M = E - e·sin(E)
 *
 * @param M 平近点角（弧度）
 * @param e 偏心率
 * @returns 偏近点角 E（弧度）
 */
function solveKepler(M: number, e: number): number {
  // 归一化 M 到 [-π, π]
  let m = M
  while (m > Math.PI) m -= TWO_PI
  while (m < -Math.PI) m += TWO_PI

  // 初始猜测：对低偏心率用 E=M，对高偏心率用 E=π
  let E = e < 0.8 ? m : Math.PI

  // 牛顿-拉夫森迭代（6 次足够收敛到 1e-8）
  for (let iter = 0; iter < 8; iter++) {
    const f = E - e * Math.sin(E) - m
    const fp = 1 - e * Math.cos(E)
    const dE = f / fp
    E -= dE
    if (Math.abs(dE) < 1e-10) break
  }
  return E
}

// ─── 轨道根数 → 日心黄道 J2000 位置 ──────────────────────────────────

/**
 * 由轨道根数计算日心黄道 J2000 位置
 *
 * @param comet 彗星轨道根数
 * @param date 计算时刻
 * @returns { x, y, z } 日心黄道 J2000 坐标（AU），或 null 表示计算失败
 */
function cometHelioEcliptic(
  comet: CometElement,
  date: Date,
): { x: number; y: number; z: number; r: number } | null {
  try {
    const a = comet.q / (1 - comet.e)           // 半长轴（AU）
    const periodDays = 365.25 * Math.pow(a, 1.5) // 开普勒第三定律（天）
    const n = TWO_PI / periodDays                // 平均运动（rad/day）

    const jd = dateToJD(date)
    const dt = jd - comet.perihelionJD            // 自近日点以来的天数
    const M = n * dt                              // 平近点角

    const E = solveKepler(M, comet.e)             // 偏近点角

    // 真近点角 ν
    const cosE = Math.cos(E)
    const sinE = Math.sin(E)
    const cosNu = (cosE - comet.e) / (1 - comet.e * cosE)
    const sinNu = Math.sqrt(1 - comet.e * comet.e) * sinE / (1 - comet.e * cosE)

    // 日心距
    const r = a * (1 - comet.e * cosE)

    // perifocal 坐标（近日点参考系）
    const xPqw = r * cosNu
    const yPqw = r * sinNu

    // 旋转到黄道 J2000：R = Rz(Ω) · Rx(i) · Rz(ω)
    const Ω = comet.omega * D2R
    const ω = comet.argPeri * D2R
    const i = comet.i * D2R

    const cosΩ = Math.cos(Ω), sinΩ = Math.sin(Ω)
    const cosω = Math.cos(ω), sinω = Math.sin(ω)
    const cosi = Math.cos(i), sini = Math.sin(i)

    // 旋转矩阵元素（3-2-3 旋转）
    const r11 = cosΩ * cosω - sinΩ * sinω * cosi
    const r12 = -cosΩ * sinω - sinΩ * cosω * cosi
    const r21 = sinΩ * cosω + cosΩ * sinω * cosi
    const r22 = -sinΩ * sinω + cosΩ * cosω * cosi
    const r31 = sinω * sini
    const r32 = cosω * sini

    const xEcl = r11 * xPqw + r12 * yPqw
    const yEcl = r21 * xPqw + r22 * yPqw
    const zEcl = r31 * xPqw + r32 * yPqw

    return { x: xEcl, y: yEcl, z: zEcl, r }
  } catch {
    return null
  }
}

// ─── 黄道 J2000 → 赤道 J2000 ─────────────────────────────────────────

/**
 * 黄道 J2000 坐标 → 赤道 J2000 坐标
 * 绕 x 轴旋转 -ε（黄赤交角）
 */
function eclipticToEquatorial(x: number, y: number, z: number) {
  return {
    x,
    y: COS_OBL * y - SIN_OBL * z,
    z: SIN_OBL * y + COS_OBL * z,
  }
}

// ─── 彗星位置主函数 ──────────────────────────────────────────────────

/**
 * 同步计算彗星的地心赤道坐标（RA/Dec）
 *
 * @param AE astronomy-engine 模块（由调用方传入，避免重复 import）
 * @param comet 彗星轨道根数
 * @param date 计算时刻
 * @param earthHelio 可选：预计算的地球日心赤道 J2000 位置（AU），避免重复调用 HelioVector
 * @returns { ra: 小时 [0,24), dec: 度 [-90,90], sunDist: AU } 或 null
 */
export function getCometPositionSync(
  AE: typeof A,
  comet: CometElement,
  date: Date,
  earthHelio?: { x: number; y: number; z: number },
): { ra: number; dec: number; sunDist: number } | null {
  // 1. 彗星日心黄道位置
  const helio = cometHelioEcliptic(comet, date)
  if (!helio) return null

  // 2. 转换到赤道 J2000（与 astronomy-engine HelioVector 同坐标系）
  const cometEq = eclipticToEquatorial(helio.x, helio.y, helio.z)

  // 3. 地球日心位置（赤道 J2000）
  let earthEq: { x: number; y: number; z: number }
  if (earthHelio) {
    earthEq = earthHelio
  } else {
    try {
      const ev = AE.HelioVector(AE.Body.Earth, date)
      earthEq = { x: ev.x, y: ev.y, z: ev.z }
    } catch {
      return null
    }
  }

  // 4. 地心向量 = 彗星日心 - 地球日心
  const geoX = cometEq.x - earthEq.x
  const geoY = cometEq.y - earthEq.y
  const geoZ = cometEq.z - earthEq.z
  const geoDist = Math.sqrt(geoX * geoX + geoY * geoY + geoZ * geoZ)

  // 5. RA/Dec
  let raRad = Math.atan2(geoY, geoX)
  if (raRad < 0) raRad += TWO_PI
  const ra = (raRad / TWO_PI) * 24            // [0, 24) 小时
  const dec = Math.asin(geoZ / geoDist) * R2D // [-90, 90] 度

  return {
    ra,
    dec,
    sunDist: helio.r,  // 彗星到太阳的距离（用于拖尾长度计算）
  }
}

// ─── 彗尾方向 ────────────────────────────────────────────────────────

/**
 * 计算彗尾在 3D 空间中的方向
 *
 * 彗尾总是背向太阳。在天球上，拖尾方向 = 从太阳指向彗星的方向（继续向外延伸）。
 *
 * 坐标系约定：与 useSky.ts 的 raDecXYZ 一致
 *   x = R · cos(dec) · cos(ra)
 *   y = R · sin(dec)
 *   z = -R · cos(dec) · sin(ra)
 *
 * @param cometRaHours 彗星赤经（小时）
 * @param cometDecDeg 彗星赤纬（度）
 * @param sunRaHours 太阳赤经（小时）
 * @param sunDecDeg 太阳赤纬（度）
 * @returns { dx, dy, dz } 归一化方向向量（背向太阳）
 */
export function cometTailDirection(
  cometRaHours: number,
  cometDecDeg: number,
  sunRaHours: number,
  sunDecDeg: number,
): { dx: number; dy: number; dz: number } {
  const raToRad = (h: number) => (h / 24) * TWO_PI
  const decToRad = (d: number) => d * D2R

  // 彗星 3D 单位向量
  const cRa = raToRad(cometRaHours)
  const cDec = decToRad(cometDecDeg)
  const cCd = Math.cos(cDec)
  const cx = cCd * Math.cos(cRa)
  const cy = Math.sin(cDec)
  const cz = -cCd * Math.sin(cRa)

  // 太阳 3D 单位向量
  const sRa = raToRad(sunRaHours)
  const sDec = decToRad(sunDecDeg)
  const sCd = Math.cos(sDec)
  const sx = sCd * Math.cos(sRa)
  const sy = Math.sin(sDec)
  const sz = -sCd * Math.sin(sRa)

  // 拖尾方向 = 彗星 - 太阳（背向太阳）
  const dx = cx - sx
  const dy = cy - sy
  const dz = cz - sz

  // 归一化
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (len < 1e-9) {
    // 彗星与太阳在天球上重合（罕见），返回默认方向
    return { dx: 1, dy: 0, dz: 0 }
  }
  return { dx: dx / len, dy: dy / len, dz: dz / len }
}
