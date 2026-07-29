/**
 * 农历计算封装（基于 lunar-javascript）
 *
 * lunar-javascript 基于实际天文朔日，符合国标《农历的编算和颁行》。
 * 提供公历→农历互转、节气、生肖、传统节日等。
 */

import { Solar } from 'lunar-javascript'

export interface LunarInfo {
  /** 农历年（干支，如"甲辰"） */
  yearGanZhi: string
  /** 农历月（中文，如"六月"） */
  monthChinese: string
  /** 农历日（中文，如"廿五"） */
  dayChinese: string
  /** 生肖（如"龙"） */
  shengXiao: string
  /** 当前节气（如"大暑"），无则 null */
  jieQi: string | null
  /** 农历节日（如"端午节"），无则 null */
  festival: string | null
}

/**
 * 获取指定日期的农历信息
 *
 * @param date 公历日期，默认当前
 */
export function getLunarInfo(date: Date = new Date()): LunarInfo {
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  // 节气：lunar-javascript 的 getJieQi() 返回当前日期所在节气的节气名
  // 但 API 较复杂，这里用 getPrevJieQi 获取上一个节气
  let jieQi: string | null = null
  try {
    const prev = lunar.getPrevJieQi()
    jieQi = prev?.getName() ?? null
  } catch {
    jieQi = null
  }

  // 节日
  let festival: string | null = null
  try {
    const festivals = lunar.getFestivals()
    if (festivals && festivals.length > 0) {
      festival = festivals[0]
    }
  } catch {
    festival = null
  }

  return {
    yearGanZhi: lunar.getYearInGanZhi(),
    monthChinese: lunar.getMonthInChinese() + '月',
    dayChinese: lunar.getDayInChinese(),
    shengXiao: lunar.getYearShengXiao(),
    jieQi,
    festival,
  }
}

/**
 * 获取当前季节（用于诗词匹配）
 *
 * 按月份划分：3-5 春，6-8 夏，9-11 秋，12-2 冬
 */
export function getSeason(date: Date = new Date()): '春' | '夏' | '秋' | '冬' {
  const month = date.getMonth() + 1
  if (month >= 3 && month <= 5) return '春'
  if (month >= 6 && month <= 8) return '夏'
  if (month >= 9 && month <= 11) return '秋'
  return '冬'
}
