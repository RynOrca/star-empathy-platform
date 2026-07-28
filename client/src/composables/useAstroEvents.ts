/**
 * useAstroEvents — 天文事件 composable
 *
 * 提供两类能力：
 *   1. 恒星升落 / 中天时刻（基于 astronomy-engine SearchRiseSet + SearchHourAngle）
 *   2. 月相 widget 数据（基于 Illumination + MoonPhase + SearchMoonPhase）
 *
 * ─── 设计要点 ───────────────────────────────────────────────────────
 *
 * 1. **DefineStar 全局槽位轮转**
 *    astronomy-engine 的 `DefineStar` 修改的是模块级全局 `StarTable`（astronomy.js:296），
 *    8 个槽位 Star1..Star8 静默覆盖、无并发保护。本 composable 用 `withStarSlot` 做
 *    同步轮转：DefineStar 与 Search 必须在同一同步执行块内完成，禁止中间 await。
 *
 * 2. **折射与视半径**
 *    SearchRiseSet 内置 34′ 大气折射 + 天体视半径修正（Sun/Moon），恒星按点源处理，
 *    不可关闭。这是该 API 的设计选择（参见 astronomy.js:129 REFRACTION_NEAR_HORIZON）。
 *
 * 3. **极区与拱极星**
 *    - 拱极星（永不落下）：SearchRiseSet 返回 null
 *    - 永不升起：SearchRiseSet 同样返回 null
 *    - 中天（SearchHourAngle）永远不返回 null，可放心调用
 *    - 极区观测者（|lat| > 66.6°）使用 365 天 limitDays 兜底
 *
 * 4. **月相选 API**
 *    - Illumination(Body.Moon, date).phase_fraction  → 0..1 亮面比例（用于画月相图标）
 *    - MoonPhase(date) → 0..360° 月日黄经差（用于 8 段相位标签）
 *    两者物理含义不同，前者考虑月球黄纬，后者只看黄经差，故同时调用。
 *
 * 5. **错误隔离**
 *    astronomy-engine 抛异常的情况（越界参数、未定义 Star）被 try/catch 吞掉，
 *    返回 null，避免阻塞详情面板渲染。
 *
 * ─── 性能 ───────────────────────────────────────────────────────────
 *
 * - SearchRiseSet 内部牛顿迭代，~10 次三角函数调用，<1ms
 * - SearchHourAngle 类似
 * - Illumination 含 GeoVector × 2 + Ecliptic × 2，~2ms
 * - 单次 computeAll 总耗时 < 5ms，可在选星切换时同步调用
 *
 * ─── 引用文档 ───────────────────────────────────────────────────────
 *
 * - SearchRiseSet:  astronomy.d.ts:1667
 * - SearchHourAngle: astronomy.d.ts:1808
 * - DefineStar:      astronomy.d.ts:194
 * - MoonPhase:       astronomy.d.ts:1487
 * - Illumination:    astronomy.d.ts (Illumination 函数)
 * - SearchMoonPhase: astronomy.d.ts:1523
 */

import { computed, ref, shallowRef, watch, onScopeDispose } from 'vue'
import * as A from 'astronomy-engine'

// ─── 类型定义 ─────────────────────────────────────────────────────────

export interface StarEventInfo {
  /** 下一次升起时刻（含 34′ 折射 + 视半径修正）；拱极星或永不升起则为 null */
  rise: Date | null
  /** 下一次落下时刻；同上 */
  set: Date | null
  /** 上中天时刻（天体经过本地子午圈，高度角最高）；永远存在 */
  transit: Date
  /** 上中天时的高度角（度，含折射）；用于判断可观测性 */
  transitAltitude: number
  /** 下中天时刻（高度角最低）；永远存在，但可能在地面以下 */
  antiTransit: Date
  /** 当前是否在地平线之上（基于 Horizon() 计算的当前 alt/az，含折射修正） */
  currentlyAboveHorizon: boolean
  /** 当前高度角（度） */
  currentAltitude: number
  /** 当前方位角（度，北=0，东=90） */
  currentAzimuth: number
}

export interface MoonPhaseInfo {
  /** 亮面比例 [0, 1]，直接对应渲染 */
  illumination: number
  /** 月日黄经差 [0, 360) 度；0=新月, 90=上弦, 180=满月, 270=下弦 */
  phaseAngle: number
  /** 8 段月相标签 */
  phaseLabel: '新月' | '蛾眉月' | '上弦月' | '盈凸月' | '满月' | '亏凸月' | '下弦月' | '残月'
  /** 月相 CSS 背景百分比（0-100，用于 box-shadow 绘制月相图） */
  phaseBrightness: number
  /** 下一次满月时刻 */
  nextFullMoon: Date | null
  /** 下一次新月时刻 */
  nextNewMoon: Date | null
}

export interface AstroEventsData {
  star: StarEventInfo | null
  moon: MoonPhaseInfo | null
  /** 计算时的观测者位置 */
  observer: { lat: number; lon: number } | null
  /** 计算时刻 */
  computedAt: Date
}

// ─── 全局 Star 槽位管理 ───────────────────────────────────────────────

/**
 * 8 个用户自定义星槽位轮转
 *
 * 必要性：DefineStar 是模块级全局可变状态，多个 composable 实例并发调用会静默覆盖。
 * 策略：8 槽轮转 + 调用同步紧跟。Vue 的 setup 是同步的，watch 回调默认也是同步的，
 * 因此只要在 withStarSlot 内不 await，就能保证 DefineStar → Search 的原子性。
 *
 * 注意：在异步上下文（如 fetch 回调）中调用 computeStarEvents 时，应改用 mutex。
 * 本 composable 的设计是「同步计算 + watch 触发」，故无需 mutex。
 */
const STAR_SLOTS = [
  A.Body.Star1, A.Body.Star2, A.Body.Star3, A.Body.Star4,
  A.Body.Star5, A.Body.Star6, A.Body.Star7, A.Body.Star8,
] as const

let slotCursor = 0

/**
 * 借用一个 Star 槽位执行同步计算
 *
 * @param raHours  赤经 [0, 24) 恒星时小时
 * @param decDeg   赤纬 [-90, +90] 度
 * @param fn       同步函数，禁止包含 await
 */
function withStarSlot<T>(raHours: number, decDeg: number, fn: (body: A.Body) => T): T | null {
  try {
    // 参数边界校验（astronomy-engine 内部会抛异常，提前拦截更友好）
    if (!Number.isFinite(raHours) || raHours < 0 || raHours >= 24) return null
    if (!Number.isFinite(decDeg) || decDeg < -90 || decDeg > 90) return null

    const slot = STAR_SLOTS[slotCursor]
    slotCursor = (slotCursor + 1) % STAR_SLOTS.length

    // 距离用 1000 光年：视差 <1″，对升落时间影响 <1s（astronomy-engine 文档建议值）
    A.DefineStar(slot, raHours, decDeg, 1000)

    // 关键：fn 必须同步执行，不得 await，否则 slot 可能被其他调用覆盖
    return fn(slot)
  } catch (e) {
    console.error('[useAstroEvents] withStarSlot failed', { raHours, decDeg, error: e })
    return null
  }
}

// ─── 核心：计算恒星升落 / 中天 ────────────────────────────────────────

/**
 * 计算恒星升落与中天时刻
 *
 * @param raHours  赤经（恒星时小时，[0, 24)）
 * @param decDeg   赤纬（度，[-90, +90]）
 * @param observer 观测者（纬度/经度，度）
 * @param dateStart 起算时刻，默认 now
 */
export function computeStarEvents(
  raHours: number,
  decDeg: number,
  observer: { lat: number; lon: number },
  dateStart: Date = new Date(),
): StarEventInfo | null {
  return withStarSlot(raHours, decDeg, (body) => {
    const obs = new A.Observer(observer.lat, observer.lon, 0)

    // limitDays 选择：
    // - 恒星日 23h56m，常规纬度 1 天内必有升/落（若发生）
    // - 极区（|lat| > 66.6°）部分恒星永不下落/升起，需扩大窗口以判定 null
    // - 文档建议极区用 365 天（astronomy.d.ts:1653）
    const isPolar = Math.abs(observer.lat) > 66.6
    const limitDays = isPolar ? 365 : 2

    // 升起：direction = +1
    const riseTime = A.SearchRiseSet(body, obs, +1, dateStart, limitDays)
    // 落下：direction = -1
    const setTime = A.SearchRiseSet(body, obs, -1, dateStart, limitDays)

    // 上中天：hourAngle = 0，永远存在
    const transitEvent = A.SearchHourAngle(body, obs, 0, dateStart)
    // 下中天：hourAngle = 12，永远存在（但可能在地面以下）
    const antiTransitEvent = A.SearchHourAngle(body, obs, 12, dateStart)

    // 当前地平坐标：直接调 Horizon() 计算当前时刻的 alt/az
    // 不用 SearchHourAngle（它返回下一次到达 hourAngle=0 的时刻，非当前时刻）
    const currentHor = A.Horizon(dateStart, obs, raHours, decDeg, 'normal')
    const currentAltitude = currentHor.altitude
    const currentAzimuth = currentHor.azimuth

    return {
      rise: riseTime ? riseTime.date : null,
      set: setTime ? setTime.date : null,
      transit: transitEvent.time.date,
      transitAltitude: transitEvent.hor.altitude,
      antiTransit: antiTransitEvent.time.date,
      currentlyAboveHorizon: currentAltitude > 0,
      currentAltitude,
      currentAzimuth,
    }
  })
}

// ─── 月相 widget ──────────────────────────────────────────────────────

/**
 * 月相 8 段标签查找表
 *
 * 索引 = floor(((phaseAngle + 22.5) % 360) / 45)
 * - 0:  新月   (337.5° ~ 22.5°)
 * - 1:  蛾眉月 (22.5° ~ 67.5°)
 * - 2:  上弦月 (67.5° ~ 112.5°)
 * - 3:  盈凸月 (112.5° ~ 157.5°)
 * - 4:  满月   (157.5° ~ 202.5°)
 * - 5:  亏凸月 (202.5° ~ 247.5°)
 * - 6:  下弦月 (247.5° ~ 292.5°)
 * - 7:  残月   (292.5° ~ 337.5°)
 */
const MOON_PHASE_LABELS = [
  '新月', '蛾眉月', '上弦月', '盈凸月',
  '满月', '亏凸月', '下弦月', '残月',
] as const

/**
 * 计算月相 widget 数据
 *
 * - 用 Illumination(Body.Moon, date) 获取亮面比例（含月球黄纬修正）
 * - 用 MoonPhase(date) 获取月日黄经差（用于 8 段相位标签）
 * - 用 SearchMoonPhase 找下一次满月 / 新月
 */
export function computeMoonPhase(date: Date = new Date()): MoonPhaseInfo | null {
  try {
    const illum = A.Illumination(A.Body.Moon, date)
    const phaseAngle = A.MoonPhase(date)

    const idx = Math.floor(((phaseAngle + 22.5) % 360 + 360) % 360 / 45) % 8
    const phaseLabel = MOON_PHASE_LABELS[idx]

    // 找下一次满月（targetLon=180）和下一次新月（targetLon=0）
    // limitDays=35：月相周期 29.53 天 + 5.5 天余量，必含下一次任意相位
    const nextFullMoonTime = A.SearchMoonPhase(180, date, 35)
    const nextNewMoonTime = A.SearchMoonPhase(0, date, 35)

    return {
      illumination: illum.phase_fraction,
      phaseAngle,
      phaseLabel,
      phaseBrightness: Math.round(illum.phase_fraction * 100),
      nextFullMoon: nextFullMoonTime ? nextFullMoonTime.date : null,
      nextNewMoon: nextNewMoonTime ? nextNewMoonTime.date : null,
    }
  } catch (e) {
    console.error('[useAstroEvents] computeMoonPhase failed', e)
    return null
  }
}

// ─── Vue Composable ──────────────────────────────────────────────────

export interface UseAstroEventsOptions {
  /** 赤经（恒星时小时 [0, 24)）— 响应式源 */
  raHours: () => number | null
  /** 赤纬（度 [-90, +90]）— 响应式源 */
  decDeg: () => number | null
  /** 观测者纬度（度）— 响应式源 */
  observerLat: () => number | null
  /** 观测者经度（度）— 响应式源 */
  observerLon: () => number | null
  /** 是否启用（默认 true） */
  enabled?: () => boolean
}

/**
 * useAstroEvents — 响应式天文事件 composable
 *
 * 当 starInfo / observer 位置变化时自动重算，结果以 shallowRef 暴露，
 * 避免对 Date 对象做深响应式包装。
 *
 * 使用示例：
 * ```ts
 * const { data, loading, error, refresh } = useAstroEvents({
 *   raHours: () => props.starInfo?.ra ?? null,
 *   decDeg: () => props.starInfo?.dec ?? null,
 *   observerLat: () => userPosition.value?.lat ?? null,
 *   observerLon: () => userPosition.value?.lng ?? null,
 * })
 * ```
 */
export function useAstroEvents(opts: UseAstroEventsOptions) {
  const data = shallowRef<AstroEventsData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** 计算并刷新（同步，astronomy-engine 全部同步 API） */
  function refresh() {
    const enabled = opts.enabled?.() ?? true
    if (!enabled) {
      data.value = null
      return
    }

    const ra = opts.raHours()
    const dec = opts.decDeg()
    const lat = opts.observerLat()
    const lon = opts.observerLon()

    if (ra == null || dec == null || lat == null || lon == null) {
      data.value = null
      error.value = null
      return
    }

    loading.value = true
    try {
      const now = new Date()
      const star = computeStarEvents(ra, dec, { lat, lon }, now)
      const moon = computeMoonPhase(now)

      if (star == null && moon == null) {
        error.value = '天文事件计算失败'
        data.value = null
      } else {
        error.value = null
        data.value = {
          star,
          moon,
          observer: { lat, lon },
          computedAt: now,
        }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      data.value = null
    } finally {
      loading.value = false
    }
  }

  // 响应式依赖变化时自动重算
  // flush:'sync' 因为计算是同步且 <5ms，避免 'post' 导致的二次渲染闪烁
  watch(
    [opts.raHours, opts.decDeg, opts.observerLat, opts.observerLon, () => opts.enabled?.() ?? true],
    refresh,
    { immediate: true, flush: 'sync' },
  )

  // 组件销毁时清理（虽然数据是 shallowRef，但显式清理更稳妥）
  onScopeDispose(() => {
    data.value = null
  })

  return {
    data: computed(() => data.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    refresh,
  }
}

// ─── 格式化工具（供模板使用）────────────────────────────────────────

/** 将 Date 格式化为 "HH:MM" 本地时间 */
export function formatTime(date: Date | null): string {
  if (!date) return '—'
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

/** 将 Date 格式化为 "MM-DD HH:MM" 本地时间 */
export function formatDateTime(date: Date | null): string {
  if (!date) return '—'
  const mo = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${mo}-${d} ${formatTime(date)}`
}

/** 高度角格式化：保留 1 位小数 */
export function formatAltitude(altDeg: number): string {
  return `${altDeg.toFixed(1)}°`
}

/** 方位角转中文方向 */
export function azimuthToDirection(azDeg: number): string {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  const idx = Math.round(azDeg / 45) % 8
  return dirs[idx]
}
