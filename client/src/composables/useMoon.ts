/**
 * useMoon — 月相居中预览窗 composable
 *
 * 整合：
 * - astronomy-engine：月相相位、亮面比例、月球位置、升落时间、下次满月/新月
 * - lunar-javascript：精确农历（干支年、月日、节气、生肖、节日）
 * - 后端：DeepSeek 生成个性化诗句（已登录用户）
 * - localStorage：7 天缓存 + 喜好 hash 双重校验
 *
 * 数据流：
 * 1. 同步：前端立即计算月相+农历+位置+升落+7天日程+诗词
 * 2. 已登录用户：读 localStorage 缓存 → 异步请求 /api/moon/insight → 写缓存
 * 3. 未登录用户：不请求后端，仅显示诗词区通用诗词
 *
 * 关键逻辑：
 * - 未登录：prefsHash='anonymous'，不读/写 localStorage
 * - 已登录无故事：prefsHash='empty'，请求后端（无偏好参数），写缓存
 * - 已登录有故事：prefsHash=hash，请求后端（带偏好），写缓存
 * - 缓存双重校验：7 天 TTL + prefsHash 匹配
 * - 防并发：同一时刻只允许一个 loadInsight 请求
 */

import { shallowRef, ref, type ShallowRef } from 'vue'
import * as A from 'astronomy-engine'
import { getLunarInfo, getSeason, type LunarInfo } from '../utils/lunar'
import { selectMoonPoem, type MoonPoem } from '../data/moonPoems'
import { usePreferences, computePrefsHash, type UserPreferences } from './usePreferences'

// ─── 类型定义 ────────────────────────────────────────────────────────

export interface MoonScheduleItem {
  /** 日期 */
  date: Date
  /** 相位角（0-360°） */
  phaseAngle: number
  /** 亮面比例（0-1） */
  illumination: number
  /** 相位标签 */
  phaseLabel: string
}

export interface MoonInsight {
  /** 诗句 */
  poem: string
  /** 诗句注解 */
  note: string
}

export interface MoonPanelData {
  // 基础相位
  phaseAngle: number
  phaseLabel: string
  illumination: number
  moonAge: number
  // 精确农历
  lunar: LunarInfo
  // 用户时间与位置
  observer: {
    time: Date
    timezone: string
    lat: number
    lon: number
  }
  // 月球位置（基于 observer）
  position: {
    ra: number
    dec: number
    altitude: number
    azimuth: number
    constellation: string
    aboveHorizon: boolean
  }
  // 升落时间
  events: {
    rise: Date | null
    set: Date | null
    transit: Date | null
    transitAltitude: number
  }
  // 倒计时
  countdown: {
    nextFullMoon: Date | null
    nextNewMoon: Date | null
    daysToFullMoon: number | null
    daysToNewMoon: number | null
  }
  // 7 天日程
  schedule: MoonScheduleItem[]
  // 诗词
  poem: MoonPoem | null
}

export interface UseMoonOptions {
  /** 观测者纬度（度）— 响应式源 */
  observerLat: () => number | null
  /** 观测者经度（度）— 响应式源 */
  observerLon: () => number | null
}

// ─── 常量 ────────────────────────────────────────────────────────────

const MOON_PHASE_LABELS = [
  '新月', '蛾眉月', '上弦月', '盈凸月',
  '满月', '亏凸月', '下弦月', '残月',
] as const

/** 月球所在星座映射（简化版：按赤经划分 12 宫） */
const RA_CONSTELLATIONS: Array<{ max: number; name: string }> = [
  { max: 2, name: '双鱼座' },
  { max: 4, name: '白羊座' },
  { max: 6, name: '金牛座' },
  { max: 8, name: '双子座' },
  { max: 10, name: '巨蟹座' },
  { max: 12, name: '狮子座' },
  { max: 14, name: '室女座' },
  { max: 16, name: '天秤座' },
  { max: 18, name: '天蝎座' },
  { max: 20, name: '人马座' },
  { max: 22, name: '摩羯座' },
  { max: 24, name: '宝瓶座' },
]

// ─── localStorage 缓存 ─────────────────────────────────────────────

const CACHE_KEY_PREFIX = 'moon_insight_'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 天

interface CachedInsight {
  insight: MoonInsight
  generatedAt: number
  prefsHash: string
  phaseLabel: string
  lunarDay: string
}

function getCacheKey(userId: number, phaseLabel: string, lunarDay: string): string {
  return `${CACHE_KEY_PREFIX}${userId}_${phaseLabel}_${lunarDay}`
}

function readCache(userId: number, phaseLabel: string, lunarDay: string, currentPrefsHash: string): CachedInsight | null {
  const key = getCacheKey(userId, phaseLabel, lunarDay)
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const cached: CachedInsight = JSON.parse(raw)

    // 双重校验：1. TTL 7 天内 2. 喜好 hash 匹配
    const isExpired = Date.now() - cached.generatedAt > CACHE_TTL
    const isPrefsChanged = cached.prefsHash !== currentPrefsHash
    if (isExpired || isPrefsChanged) {
      localStorage.removeItem(key)
      return null
    }
    return cached
  } catch {
    return null
  }
}

function writeCache(userId: number, phaseLabel: string, lunarDay: string, insight: MoonInsight, prefsHash: string): void {
  const key = getCacheKey(userId, phaseLabel, lunarDay)
  const data: CachedInsight = {
    insight,
    generatedAt: Date.now(),
    prefsHash,
    phaseLabel,
    lunarDay,
  }
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // localStorage 满或被禁用：清理旧缓存后重试
    cleanOldCaches()
    try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* 静默 */ }
  }
}

function cleanOldCaches(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX))
  const now = Date.now()
  const expired: string[] = []
  const valid: Array<{ key: string; generatedAt: number }> = []

  for (const key of keys) {
    try {
      const cached = JSON.parse(localStorage.getItem(key) || '{}')
      if (now - cached.generatedAt > CACHE_TTL) {
        expired.push(key)
      } else {
        valid.push({ key, generatedAt: cached.generatedAt })
      }
    } catch {
      expired.push(key)
    }
  }

  // 1. 先清理所有过期的
  expired.forEach(k => localStorage.removeItem(k))

  // 2. 如果仍然超过 50 条，清理最旧的 20%
  if (valid.length > 50) {
    valid.sort((a, b) => a.generatedAt - b.generatedAt)
    valid.slice(0, Math.ceil(valid.length * 0.2)).forEach(item => {
      localStorage.removeItem(item.key)
    })
  }
}

// ─── 辅助函数 ────────────────────────────────────────────────────────

/** 月相相位角 → 8 段标签 */
function phaseAngleToLabel(phaseAngle: number): string {
  const idx = Math.floor(((phaseAngle + 22.5) % 360 + 360) % 360 / 45) % 8
  return MOON_PHASE_LABELS[idx]
}

/** 月相相位角 → 月龄（天，0-29.53） */
function phaseAngleToMoonAge(phaseAngle: number): number {
  return (phaseAngle / 360) * 29.53
}

/** 月球赤经 → 所在星座（简化） */
function raToConstellation(ra: number): string {
  for (const c of RA_CONSTELLATIONS) {
    if (ra < c.max) return c.name
  }
  return '双鱼座'
}

/** 获取时区字符串（如"UTC+8"） */
function getTimezone(): string {
  const offset = -new Date().getTimezoneOffset() / 60
  return `UTC${offset >= 0 ? '+' : ''}${offset}`
}

/** 从 JWT token 解析 userId（无 token 或解析失败返回 null） */
function getUserIdFromToken(): number | null {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return typeof payload.userId === 'number' ? payload.userId : null
  } catch {
    return null
  }
}

// ─── 核心 composable ─────────────────────────────────────────────────

export function useMoon(opts: UseMoonOptions) {
  const data: ShallowRef<MoonPanelData | null> = shallowRef(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 个性化解读（异步，独立于主数据）
  const insight = shallowRef<MoonInsight | null>(null)
  const insightLoading = ref(false)

  // 用户喜好
  const { load: loadPreferences, clear: clearPreferences } = usePreferences()

  // 防并发：同一时刻只允许一个 loadInsight 请求
  let insightPromise: Promise<void> | null = null

  // 诗词轮换种子（递增，保证"换一首"每次不同）
  const poemSeed = ref(0)

  /** 计算月相主数据（同步） */
  function refresh(): void {
    const lat = opts.observerLat()
    const lon = opts.observerLon()
    if (lat == null || lon == null) {
      data.value = null
      error.value = null
      return
    }

    try {
      loading.value = true
      const now = new Date()
      const observer = new A.Observer(lat, lon, 0)

      // 1. 月相基础数据
      const illum = A.Illumination(A.Body.Moon, now)
      const phaseAngle = A.MoonPhase(now)
      const phaseLabel = phaseAngleToLabel(phaseAngle)
      const moonAge = phaseAngleToMoonAge(phaseAngle)

      // 2. 农历
      const lunar = getLunarInfo(now)

      // 3. 月球位置（赤经赤纬 + 方位角高度）
      const eq = A.Equator(A.Body.Moon, now, observer, false, false)
      const hor = A.Horizon(now, observer, eq.ra, eq.dec, 'normal')
      const constellation = raToConstellation(eq.ra)

      // 4. 月升月落（极区处理：|lat|>66.6° 用 365 天窗口）
      const isPolar = Math.abs(lat) > 66.6
      const limitDays = isPolar ? 365 : 2
      const riseTime = A.SearchRiseSet(A.Body.Moon, observer, +1, now, limitDays)
      const setTime = A.SearchRiseSet(A.Body.Moon, observer, -1, now, limitDays)
      const transitEvent = A.SearchHourAngle(A.Body.Moon, observer, 0, now)
      const transitAltitude = transitEvent
        ? A.Horizon(transitEvent.time.date, observer, eq.ra, eq.dec, 'normal').altitude
        : 0

      // 5. 下次满月/新月
      const nextFullMoonTime = A.SearchMoonPhase(180, now, 35)
      const nextNewMoonTime = A.SearchMoonPhase(0, now, 35)
      const daysToFullMoon = nextFullMoonTime
        ? Math.round((nextFullMoonTime.date.getTime() - now.getTime()) / 86400000)
        : null
      const daysToNewMoon = nextNewMoonTime
        ? Math.round((nextNewMoonTime.date.getTime() - now.getTime()) / 86400000)
        : null

      // 6. 7 天日程
      const schedule: MoonScheduleItem[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getTime() + i * 86400000)
        const pa = A.MoonPhase(d)
        const il = A.Illumination(A.Body.Moon, d).phase_fraction
        schedule.push({
          date: d,
          phaseAngle: pa,
          illumination: il,
          phaseLabel: phaseAngleToLabel(pa),
        })
      }

      // 7. 诗词匹配（基于日期种子，每日固定）
      const season = getSeason(now)
      poemSeed.value = now.getDate()
      const poem = selectMoonPoem(phaseLabel, season, poemSeed.value)

      data.value = {
        phaseAngle,
        phaseLabel,
        illumination: illum.phase_fraction,
        moonAge,
        lunar,
        observer: {
          time: now,
          timezone: getTimezone(),
          lat,
          lon,
        },
        position: {
          ra: eq.ra,
          dec: eq.dec,
          altitude: hor.altitude,
          azimuth: hor.azimuth,
          constellation,
          aboveHorizon: hor.altitude > 0,
        },
        events: {
          rise: riseTime ? riseTime.date : null,
          set: setTime ? setTime.date : null,
          transit: transitEvent ? transitEvent.time.date : null,
          transitAltitude,
        },
        countdown: {
          nextFullMoon: nextFullMoonTime ? nextFullMoonTime.date : null,
          nextNewMoon: nextNewMoonTime ? nextNewMoonTime.date : null,
          daysToFullMoon,
          daysToNewMoon,
        },
        schedule,
        poem,
      }
      error.value = null
    } catch (e) {
      console.error('[useMoon] refresh failed', e)
      error.value = e instanceof Error ? e.message : '月相计算失败'
      data.value = null
    } finally {
      loading.value = false
    }
  }

  /** 加载个性化解读（异步，不阻塞主数据） */
  async function loadInsight(): Promise<void> {
    if (!data.value) return

    // 防并发：如果已有请求在进行，直接返回该 Promise
    if (insightPromise) return insightPromise

    insightPromise = doLoadInsight()
    try {
      await insightPromise
    } finally {
      insightPromise = null
    }
  }

  async function doLoadInsight(): Promise<void> {
    const d = data.value
    if (!d) return

    // ─── 分支 1：未登录用户 ───
    // 不请求后端，不读/写 localStorage
    // insight 保持 null，解读区隐藏，诗词区已显示通用诗词
    const userId = getUserIdFromToken()
    if (userId == null) {
      insight.value = null
      return
    }

    // ─── 分支 2：已登录用户 ───
    insightLoading.value = true
    insight.value = null

    try {
      // 2.1 获取用户喜好（失败降级为 null）
      const prefs: UserPreferences | null = await loadPreferences()
      const prefsHash = computePrefsHash(prefs, true)

      // 2.2 读 localStorage 缓存（双重校验）
      const cached = readCache(userId, d.phaseLabel, d.lunar.dayChinese, prefsHash)
      if (cached) {
        insight.value = cached.insight
        return
      }

      // 2.3 缓存未命中，请求后端（带 JWT 认证）
      const token = localStorage.getItem('token')
      const res = await fetch('/api/moon/insight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          phaseLabel: d.phaseLabel,
          lunarDay: d.lunar.dayChinese,
          jieQi: d.lunar.jieQi,
          season: getSeason(d.observer.time),
          altitude: d.position.altitude.toFixed(1),
          azimuth: d.position.azimuth.toFixed(1),
          daysToFullMoon: d.countdown.daysToFullMoon,
          userPreferences: prefs,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as {
        code: number
        data?: { insight: MoonInsight | null; source: 'ai' | 'fallback' }
      }

      if (json.code === 200 && json.data?.insight) {
        insight.value = json.data.insight

        // 只有 source === 'ai' 时才写缓存
        // fallback 的 insight 是临时的，不缓存
        if (json.data.source === 'ai') {
          writeCache(userId, d.phaseLabel, d.lunar.dayChinese, json.data.insight, prefsHash)
        }
      }
      // 如果 insight 为 null（理论上不会出现），解读区保持隐藏
    } catch {
      // 网络失败：保留旧缓存继续使用（如果有，已在 2.2 设置）
      // 如果没有旧缓存，解读区保持隐藏，仅显示诗词区
      // 不抛出错误，不显示提示
    } finally {
      insightLoading.value = false
    }
  }

  /** 重新生成 AI 解读（强制清除缓存重请求） */
  async function regenInsight(): Promise<void> {
    if (!data.value) return

    const userId = getUserIdFromToken()
    if (userId == null) {
      // 未登录用户：无 AI 解读，直接切换诗词
      rotatePoem(1)
      return
    }

    // 清除当前 insight，强制显示 loading
    insight.value = null
    insightLoading.value = true

    // 清除 localStorage 中该相位+农历日的缓存
    const d = data.value
    const prefs = await loadPreferences()
    const prefsHash = computePrefsHash(prefs, true)
    const cacheKey = getCacheKey(userId, d.phaseLabel, d.lunar.dayChinese)
    try { localStorage.removeItem(cacheKey) } catch { /* 静默 */ }

    // 重置防并发锁，强制发起新请求
    insightPromise = null

    // 清除后重新加载
    await loadInsight()
  }

  /** 切换诗词（"换一首"按钮） */
  function rotatePoem(offset: number = 1): void {
    if (!data.value?.poem) return
    const d = data.value
    const season = getSeason(d.observer.time)
    // 用递增偏移量保证每次切换都不同
    poemSeed.value += offset
    data.value = {
      ...d,
      poem: selectMoonPoem(d.phaseLabel, season, poemSeed.value),
    }
  }

  /** 清除状态（登出时调用） */
  function reset(): void {
    insight.value = null
    insightLoading.value = false
    insightPromise = null
    clearPreferences()
  }

  return {
    data,
    loading,
    error,
    insight,
    insightLoading,
    refresh,
    loadInsight,
    regenInsight,
    rotatePoem,
    reset,
  }
}
