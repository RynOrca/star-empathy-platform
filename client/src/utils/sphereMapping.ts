import { Vector3 } from 'three'
import { SPHERE_RADIUS } from './constants'

/**
 * 将后端立方体坐标 (pos_x, pos_y, pos_z ∈ [-300, 300])
 * 归一化后投影到天球穹顶表面。
 * 保持方向不变，统一视距 = SPHERE_RADIUS。
 */
export function cubeToSphere(x: number, y: number, z: number): Vector3 {
  const len = Math.sqrt(x * x + y * y + z * z)
  if (len === 0) {
    return new Vector3(0, SPHERE_RADIUS, 0) // 兜底：正上方
  }
  return new Vector3(
    (x / len) * SPHERE_RADIUS,
    (y / len) * SPHERE_RADIUS,
    (z / len) * SPHERE_RADIUS,
  )
}

/**
 * 在球面上均匀随机撒点（用于背景星空）
 */
export function randomSpherePoint(radius: number): Vector3 {
  // Marsaglia 方法：球面均匀分布
  let u: number, v: number, s: number
  do {
    u = Math.random() * 2 - 1
    v = Math.random() * 2 - 1
    s = u * u + v * v
  } while (s >= 1)
  const factor = 2 * Math.sqrt(1 - s)
  return new Vector3(
    u * factor * radius,
    v * factor * radius,
    (1 - 2 * s) * radius,
  )
}
