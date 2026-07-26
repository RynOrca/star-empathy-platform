/**
 * 阶段 3 P2-2：流星雨数据与活跃判定（14-C §6 季节性天象事件）
 *
 * 数据源：IMO (International Meteor Organization) 流星雨日历
 * 8 大主要流星雨：象限仪/天琴/宝瓶η/英仙/猎户/狮子/双子/小熊
 *
 * 视觉效果：从辐射点向外发散的拖尾粒子，活跃期内随机生成
 * 非真实天文事件，仅作视觉氛围（产品调性：星空情绪表达）
 */

/** 流星雨数据 */
export interface MeteorShower {
  name: string
  nameCN: string
  radiantRA: number      // 辐射点赤经（小时）
  radiantDec: number     // 辐射点赤纬（度）
  peakMonth: number      // 极大期月份（1-12）
  peakDay: number        // 极大期日（1-31）
  activeStart: [number, number]  // 活跃开始 [月, 日]
  activeEnd: [number, number]    // 活跃结束 [月, 日]
  zhr: number            // 极大期每小时天顶流星数（ZHR）
  speed: number          // 流星速度 (km/s)，影响拖尾长度
  color: string          // 拖尾主色调
}

/**
 * 8 大主要流星雨
 * 数据来源：IMO Meteor Shower Calendar 2024
 */
export const METEOR_SHOWERS: MeteorShower[] = [
  {
    name: 'Quadrantids', nameCN: '象限仪座流星雨',
    radiantRA: 15.5, radiantDec: 50,
    peakMonth: 1, peakDay: 4,
    activeStart: [12, 28], activeEnd: [1, 12],
    zhr: 110, speed: 41, color: '#a8c8ff',
  },
  {
    name: 'Lyrids', nameCN: '天琴座流星雨',
    radiantRA: 18.17, radiantDec: 33,
    peakMonth: 4, peakDay: 22,
    activeStart: [4, 15], activeEnd: [4, 29],
    zhr: 18, speed: 49, color: '#e8d8ff',
  },
  {
    name: 'Eta Aquariids', nameCN: '宝瓶座η流星雨',
    radiantRA: 22.5, radiantDec: -1,
    peakMonth: 5, peakDay: 6,
    activeStart: [4, 19], activeEnd: [5, 28],
    zhr: 50, speed: 66, color: '#a8e8ff',
  },
  {
    name: 'Perseids', nameCN: '英仙座流星雨',
    radiantRA: 3.17, radiantDec: 58,
    peakMonth: 8, peakDay: 12,
    activeStart: [7, 17], activeEnd: [8, 24],
    zhr: 100, speed: 59, color: '#fff5d8',
  },
  {
    name: 'Orionids', nameCN: '猎户座流星雨',
    radiantRA: 6.33, radiantDec: 15,
    peakMonth: 10, peakDay: 21,
    activeStart: [10, 2], activeEnd: [11, 7],
    zhr: 20, speed: 66, color: '#ffd8a8',
  },
  {
    name: 'Leonids', nameCN: '狮子座流星雨',
    radiantRA: 10.17, radiantDec: 22,
    peakMonth: 11, peakDay: 17,
    activeStart: [11, 6], activeEnd: [11, 30],
    zhr: 15, speed: 71, color: '#e8c8ff',
  },
  {
    name: 'Geminids', nameCN: '双子座流星雨',
    radiantRA: 7.5, radiantDec: 32,
    peakMonth: 12, peakDay: 14,
    activeStart: [12, 4], activeEnd: [12, 20],
    zhr: 120, speed: 35, color: '#fff0d8',
  },
  {
    name: 'Ursids', nameCN: '小熊座流星雨',
    radiantRA: 14.5, radiantDec: 76,
    peakMonth: 12, peakDay: 22,
    activeStart: [12, 17], activeEnd: [12, 26],
    zhr: 10, speed: 33, color: '#d8e8ff',
  },
]

/**
 * 判断指定日期是否在流星雨活跃期内
 * 跨年处理：象限仪座活跃期 [12,28]→[1,12]
 * @returns 活跃中的流星雨列表（含强度系数 0~1，极大期=1）
 */
export function getActiveShowers(date: Date = new Date()): Array<MeteorShower & { intensity: number }> {
  // 转换为年中日（1-365/366）便于比较
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000)
  const result: Array<MeteorShower & { intensity: number }> = []
  for (const s of METEOR_SHOWERS) {
    const peakDate = new Date(date.getFullYear(), s.peakMonth - 1, s.peakDay)
    const peakDayOfYear = Math.floor((peakDate.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000)
    const startDOY = Math.floor((new Date(date.getFullYear(), s.activeStart[0] - 1, s.activeStart[1]).getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000)
    const endDOY = Math.floor((new Date(date.getFullYear(), s.activeEnd[0] - 1, s.activeEnd[1]).getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000)
    // 跨年处理
    let inRange = false
    if (startDOY <= endDOY) {
      inRange = dayOfYear >= startDOY && dayOfYear <= endDOY
    } else {
      inRange = dayOfYear >= startDOY || dayOfYear <= endDOY
    }
    if (!inRange) continue
    // 强度：距极大期越近越强，高斯衰减 σ=3 天
    let diff = Math.abs(dayOfYear - peakDayOfYear)
    if (diff > 180) diff = 365 - diff  // 跨年
    const intensity = Math.exp(-(diff * diff) / (2 * 3 * 3))
    if (intensity > 0.05) {
      result.push({ ...s, intensity })
    }
  }
  return result
}
