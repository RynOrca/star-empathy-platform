/**
 * 阶段 3 P2-1：主带小行星轨道根数（静态数据层）
 *
 * 数据源：MPC (Minor Planet Center) J2000 历元轨道根数
 * 8 颗主要小行星：Ceres/Vesta/Pallas/Juno/Eunomia/Hebe/Iris/Flora
 * 轨道根数 10 年误差累积 < 1°，足够视觉精度
 *
 * 模块边界（brooks-audit）：
 *   本文件仅保留静态数据 + 类型定义。天体力学计算（开普勒方程、坐标转换）
 *   归属 utils/astro.ts，避免数据层污染计算逻辑。
 *   视位置计算见 utils/astro.ts → getAsteroidPosition()。
 */

/** 小行星轨道根数（MPC J2000 历元） */
export interface AsteroidElement {
  name: string
  nameCN: string
  number: number        // MPC 编号
  a: number             // 半长轴 (AU)
  e: number             // 偏心率
  i: number             // 倾角 (°)
  omega: number         // 近日点幅角 (°)
  M0: number            // J2000 历元平近点角 (°)
  n: number             // 每日平均运动 (°/day)
  mag: number           // 平均视星等（冲日时）
  color: string         // 渲染色调
}

/**
 * 8 颗主要小行星轨道根数
 * 数据来源：MPC Orbit Database (https://minorplanetcenter.net/data)
 * 历元：JD 2451545.0 (J2000.0)
 */
export const ASTEROIDS: AsteroidElement[] = [
  { name: 'Ceres',    nameCN: '谷神星',   number: 1,  a: 2.769, e: 0.0757, i: 10.59, omega: 73.6,  M0: 95.99,  n: 0.21406, mag: 7.0,  color: '#a89888' },
  { name: 'Vesta',    nameCN: '灶神星',   number: 4,  a: 2.361, e: 0.0887, i: 7.14,  omega: 150.6, M0: 309.96, n: 0.27682, mag: 5.9,  color: '#c8a878' },
  { name: 'Pallas',   nameCN: '智神星',   number: 2,  a: 2.772, e: 0.2299, i: 34.84, omega: 173.1, M0: 170.32, n: 0.21366, mag: 7.0,  color: '#988878' },
  { name: 'Juno',     nameCN: '婚神星',   number: 3,  a: 2.668, e: 0.2579, i: 12.99, omega: 247.0, M0: 235.43, n: 0.22604, mag: 8.1,  color: '#b89878' },
  { name: 'Eunomia',  nameCN: '司法神星', number: 15, a: 2.644, e: 0.1847, i: 11.73, omega: 343.5, M0: 332.24, n: 0.22991, mag: 8.2,  color: '#a89868' },
  { name: 'Hebe',     nameCN: '韶神星',   number: 6,  a: 2.426, e: 0.1595, i: 14.78, omega: 244.2, M0: 232.45, n: 0.26336, mag: 7.5,  color: '#b08868' },
  { name: 'Iris',     nameCN: '虹神星',   number: 7,  a: 2.386, e: 0.2299, i: 5.52,  omega: 145.9, M0: 264.19, n: 0.27272, mag: 7.6,  color: '#c8a088' },
  { name: 'Flora',    nameCN: '花神星',   number: 8,  a: 2.202, e: 0.1560, i: 5.89,  omega: 279.0, M0: 321.21, n: 0.32561, mag: 7.9,  color: '#a89878' },
]
