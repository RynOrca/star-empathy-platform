/**
 * Geohash 编码工具 — 纯 TypeScript 零依赖实现
 *
 * 原理：经纬度区间不断二分，经度位与纬度位交错排列成二进制串，
 * 每 5 bit 编码成 1 个 base32 字符。geohash 前缀越长 → 空间越近。
 *
 * 精度表（本项目使用）：
 *   3 位 → ±78km   → 省级降级
 *   4 位 → ±20km   → 城市级匹配
 *   5 位 → ±2.4km  → 同城精细
 *
 * 隐私：只存储截断到 5 位的 geohash，绝不存原始经纬度。
 * 参考：https://en.wikipedia.org/wiki/Geohash
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const BASE32_MAP: Record<string, number> = {};
for (let i = 0; i < BASE32.length; i++) BASE32_MAP[BASE32[i]] = i;

/** 将经纬度编码为指定精度的 geohash 字符串 */
export function encode(lat: number, lng: number, precision: number = 5): string {
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let hash = '';
  let bits = 0;
  let bit = 0;
  let even = true; // true=经度, false=纬度

  while (hash.length < precision) {
    if (even) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) { bits = (bits << 1) | 1; minLng = mid; }
      else { bits = (bits << 1); maxLng = mid; }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) { bits = (bits << 1) | 1; minLat = mid; }
      else { bits = (bits << 1); maxLat = mid; }
    }
    even = !even;
    bit++;
    if (bit === 5) {
      hash += BASE32[bits];
      bits = 0;
      bit = 0;
    }
  }
  return hash;
}

/** 将 geohash 字符串解码为 { lat, lng } 中心点 */
export function decode(hash: string): { lat: number; lng: number } {
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let even = true;

  for (const ch of hash) {
    const idx = BASE32_MAP[ch];
    if (idx === undefined) continue;
    for (let i = 4; i >= 0; i--) {
      const bit = (idx >> i) & 1;
      if (even) {
        const mid = (minLng + maxLng) / 2;
        if (bit) minLng = mid; else maxLng = mid;
      } else {
        const mid = (minLat + maxLat) / 2;
        if (bit) minLat = mid; else maxLat = mid;
      }
      even = !even;
    }
  }
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

const NEIGHBOR_DIRS: [string, number, number][] = [
  ['n',  1,  0], ['ne', 1,  1], ['e', 0,  1], ['se', -1, 1],
  ['s', -1,  0], ['sw', -1, -1], ['w', 0, -1], ['nw', 1, -1],
];

/** 计算某 geohash 的 8 个相邻格子（含自身共 9 格） */
export function neighbors(hash: string): string[] {
  const result: string[] = [hash];
  for (const [, dLat, dLng] of NEIGHBOR_DIRS) {
    const n = adjacent(hash, dLat, dLng);
    if (n) result.push(n);
  }
  return result;
}

/** 计算某 geohash 在指定方向上的相邻格子 */
function adjacent(hash: string, dLat: number, dLng: number): string {
  const { lat, lng } = decode(hash);
  const precision = hash.length;
  // 用解码中心 + 偏移再编码，精度足够时邻居不重叠
  // 每位精度约对应：纬度 ±(180/2^ceil(bits/2))，经度 ±(360/2^floor(bits/2))
  // 简化：用 decode 得到的格子大小做偏移
  const latErr = latError(precision);
  const lngErr = lngError(precision);
  return encode(lat + dLat * latErr * 2, lng + dLng * lngErr * 2, precision);
}

function latError(precision: number): number {
  const latBits = Math.ceil(precision * 5 / 2);
  return 180 / Math.pow(2, latBits);
}

function lngError(precision: number): number {
  const lngBits = Math.floor(precision * 5 / 2);
  return 360 / Math.pow(2, lngBits);
}

/** geohash 精度 → 对应地理层级 */
export const PRECISION_LEVELS = {
  PROVINCE: 3,   // ±78km，省级降级
  CITY: 4,        // ±20km，城市级匹配
  DISTRICT: 5,    // ±2.4km，同城精细
} as const;

/** k-匿名降级：将 geohash 截断到指定精度 */
export function truncate(hash: string, precision: number): string {
  return hash.slice(0, precision);
}

/** 生成 SQL LIKE 查询的 9 格前缀条件（自身 + 8 邻居） */
export function buildGridQuery(hash: string): { prefixes: string[] } {
  const grids = neighbors(hash);
  return { prefixes: grids };
}
