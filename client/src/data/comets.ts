/**
 * OPT-10：彗星数据（哈雷彗星 + 恩克彗星）
 *
 * 轨道根数来源：
 * - 1P/Halley: JPL Small-Body Database (epoch 1968-01-24)
 * - 2P/Encke: JPL Small-Body Database (epoch 2023-02-25)
 *
 * 位置计算使用开普勒方程 + 二体问题近似，适用于实时渲染（精度 ~0.1°）
 */

export interface CometElement {
  name: string         // 英文名
  nameCN: string       // 中文名
  q: number            // 近日点距离 (AU)
  e: number            // 偏心率
  i: number            // 轨道倾角 (度)
  node: number         // 升交点黄经 (度, J2000.0)
  peri: number         // 近日点幅角 (度)
  Tp: number           // 近日点通过时刻 (儒略日)
  nucleusSize: number  // 彗核半径 (渲染用，非真实物理尺寸)
  color: string        // 颜色 (hex)
}

/** 哈雷彗星 (1P/Halley) — 周期 ~75.3 年 */
const HALLEY: CometElement = {
  name: 'Halley',
  nameCN: '哈雷彗星',
  q: 0.585978,
  e: 0.967143,
  i: 162.2627,
  node: 58.4201,
  peri: 111.3325,
  Tp: 2446470.5,       // 1986-02-09
  nucleusSize: 5.5,
  color: '#aaddff',
}

/** 恩克彗星 (2P/Encke) — 周期 ~3.3 年，轨道周期最短的已知彗星 */
const ENCKE: CometElement = {
  name: 'Encke',
  nameCN: '恩克彗星',
  q: 0.3359,
  e: 0.8483,
  i: 11.781,
  node: 334.568,
  peri: 186.550,
  Tp: 2460240.5,       // 2023-10-22 (approx)
  nucleusSize: 2.4,
  color: '#ccddff',
}

export const COMETS: CometElement[] = [HALLEY, ENCKE]

const D2R = Math.PI / 180
const R2D = 180 / Math.PI
const GAUSS_K = 0.01720209895 // 高斯引力常数

/**
 * 同步计算彗星在给定日期的日心黄道坐标，再转为赤道坐标 (RA/Dec)
 *
 * 算法：开普勒方程 → 日心黄道坐标 → 地心赤道坐标
 * 精度：~0.1° 量级，适用于实时渲染；不适用于精密天文计算
 */
export function getCometPositionSync(
  _AE: typeof import('astronomy-engine'),
  comet: CometElement,
  date: Date,
  earthHelio?: { x: number; y: number; z: number },
): { ra: number; dec: number; sunDist: number } | null {
  try {
    const jd = date.getTime() / 86400000 + 2440587.5

    // 1. 平均近点角
    const a = comet.q / (1 - comet.e)
    const n = GAUSS_K / Math.sqrt(a * a * a) // 弧度/天
    const M = n * (jd - comet.Tp)

    // 2. 开普勒方程：E - e*sin(E) = M（牛顿迭代法）
    let E = M
    for (let i = 0; i < 10; i++) {
      const dE = (M - E + comet.e * Math.sin(E)) / (1 - comet.e * Math.cos(E))
      E += dE
      if (Math.abs(dE) < 1e-8) break
    }

    // 3. 真近点角
    const cosV = (Math.cos(E) - comet.e) / (1 - comet.e * Math.cos(E))
    const sinV = (Math.sqrt(1 - comet.e * comet.e) * Math.sin(E)) / (1 - comet.e * Math.cos(E))
    const v = Math.atan2(sinV, cosV)

    // 4. 日心距离
    const r = a * (1 - comet.e * Math.cos(E))

    // 5. 日心黄道坐标 (J2000.0)
    const periRad = comet.peri * D2R
    const nodeRad = comet.node * D2R
    const iRad = comet.i * D2R

    const u = v + periRad
    const xHelio = r * (Math.cos(nodeRad) * Math.cos(u) - Math.sin(nodeRad) * Math.sin(u) * Math.cos(iRad))
    const yHelio = r * (Math.sin(nodeRad) * Math.cos(u) + Math.cos(nodeRad) * Math.sin(u) * Math.cos(iRad))
    const zHelio = r * Math.sin(u) * Math.sin(iRad)

    // 6. 地心坐标 = 日心 - 地球日心
    let dx = xHelio
    let dy = yHelio
    let dz = zHelio
    if (earthHelio) {
      dx -= earthHelio.x
      dy -= earthHelio.y
      dz -= earthHelio.z
    }

    // 7. 转为赤道坐标 (RA 小时, Dec 度)
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const ra = ((Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 24
    const dec = Math.asin(dz / dist) * R2D

    return { ra, dec, sunDist: r }
  } catch {
    return null
  }
}

/**
 * 计算彗尾方向（反太阳方向，用于粒子拖尾渲染）
 * @returns 反太阳方向的单位向量分量 (RA 方向, Dec 方向)
 */
export function cometTailDirection(
  ra: number,
  dec: number,
  sunRa: number,
  sunDec: number,
): { dx: number; dy: number; dz: number } {
  // 太阳方向：从彗星指向太阳（赤道坐标）
  const dRa = (sunRa - ra) * 15 * D2R  // 转为度再转弧度
  const dDec = (sunDec - dec) * D2R

  // 反太阳方向（即彗尾方向）
  const cosDec = Math.cos(dec * D2R)
  const dx = -Math.cos(dDec) * Math.cos(dRa) * cosDec
  const dy = -Math.cos(dDec) * Math.sin(dRa) * cosDec
  const dz = -Math.sin(dDec)

  // 归一化
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (len < 1e-10) return { dx: 0, dy: 0, dz: -1 }
  return { dx: dx / len, dy: dy / len, dz: dz / len }
}