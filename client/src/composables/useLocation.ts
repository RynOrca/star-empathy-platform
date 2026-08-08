import { ref, readonly } from 'vue'

export interface LatLng {
  lat: number
  lng: number
}

const LOCATION_CACHE_KEY = 'star_location_cache'
const LOCATION_CACHE_TTL = 2 * 60 * 60 * 1000 // 2小时
const QUICK_TIMEOUT = 3000   // 浏览器低精度定位 3s 超时
const HARD_TIMEOUT = 4000    // 硬超时 4s：Chrome 权限弹窗下 timeout 不计时，必须手动兜底
const HIGH_ACC_TIMEOUT = 8000
const MAX_AGE = 5 * 60 * 1000
const IP_API_TIMEOUT = 3000  // IP 兜底 API 超时

const lat = ref<number | null>(null)
const lng = ref<number | null>(null)
const ready = ref(false)
const failed = ref(false)
const loading = ref(false)
let requested = false
let highAccInProgress = false
let inFlight: Promise<void> | null = null

function getCache(): LatLng | null {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (Date.now() - data.ts > LOCATION_CACHE_TTL) return null
    return { lat: data.lat, lng: data.lng }
  } catch { return null }
}

function setCache(latVal: number, lngVal: number) {
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({ lat: latVal, lng: lngVal, ts: Date.now() }))
  } catch { /* 忽略存储错误 */ }
}

function applyLocation(latVal: number, lngVal: number) {
  lat.value = latVal
  lng.value = lngVal
  ready.value = true
  failed.value = false
  setCache(latVal, lngVal)
}

/**
 * 浏览器定位 + 硬超时
 * 关键：Chrome 等浏览器在权限弹窗显示时，options.timeout 不会开始倒计时，
 * 导致回调可能永不触发。这里用 Promise.race 加硬超时强制结束。
 */
function browserLocate(): Promise<LatLng | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise((resolve) => {
    let settled = false
    const done = (v: LatLng | null) => {
      if (!settled) { settled = true; resolve(v) }
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => done({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => done(null),
      { enableHighAccuracy: false, timeout: QUICK_TIMEOUT, maximumAge: MAX_AGE },
    )
    // 硬超时兜底：无论浏览器回调是否触发，HARD_TIMEOUT 后必出结果
    setTimeout(() => done(null), HARD_TIMEOUT)
  })
}

/**
 * IP 地理位置兜底（无需权限，城市级精度足够天文观测）
 *
 * 重要：生产 + 开发统一走同源后端代理 `/api/location/ip`，
 *      不再让浏览器直连 ipapi.co / ipwho.is（对方免费计划不发
 *      CORS 头，starsempathy.site 下会被浏览器拦掉）。
 * 后端 server 会做 server→server 请求，内部自带主 + fallback，
 * 1~2 小时级缓存，额度可控。
 *
 * Vite DEV 时 `/api` 代理到 http://localhost:3000（本已通），
 * 生产就是本站域名同 origin，零 CORS。
 */
async function ipLocate(): Promise<LatLng | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), IP_API_TIMEOUT)
    const res = await fetch('/api/location/ip', { signal: ctrl.signal })
    clearTimeout(t)
    if (res.ok) {
      const d = await res.json() as { code?: number; data?: { lat?: number; lng?: number } }
      const loc = d?.data
      if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        return { lat: loc.lat, lng: loc.lng }
      }
    }
  } catch { /* ignore */ }
  return null
}

/**
 * 统一定位流程：
 * 1. localStorage 缓存 → 立即命中（0ms）
 * 2. 浏览器低精度定位（带硬超时，避免权限弹窗卡死）
 * 3. IP 地理位置兜底（无需权限，城市级精度）
 * 4. 全部失败 → 标记 failed（除非 preserveOnFail）
 * 5. 成功后后台静默尝试高精度更新（不阻塞 UI）
 */
async function doRequest(opts: { force?: boolean; preserveOnFail?: boolean; skipCache?: boolean } = {}): Promise<void> {
  const { force = false, preserveOnFail = false, skipCache = false } = opts
  // 已有请求进行中：force 模式等待当前完成再继续，否则直接返回
  if (inFlight) {
    if (!force) return inFlight
    await inFlight.catch(() => {})
  }
  if (requested && !force) return
  requested = true

  inFlight = (async () => {
    loading.value = true
    try {
      // Step 1: 缓存命中（skipCache 时跳过，强制重新定位）
      if (!skipCache) {
        const cached = getCache()
        if (cached) {
          applyLocation(cached.lat, cached.lng)
          silentHighAccUpdate()
          return
        }
      }

      // Step 2: 浏览器定位（硬超时兜底）
      const browserResult = await browserLocate()
      if (browserResult) {
        applyLocation(browserResult.lat, browserResult.lng)
        silentHighAccUpdate()
        return
      }

      // Step 3: IP 兜底
      const ipResult = await ipLocate()
      if (ipResult) {
        applyLocation(ipResult.lat, ipResult.lng)
        // IP 定位已足够天文观测，不再触发高精度（避免再次权限弹窗）
        return
      }

      // Step 4: 全部失败
      if (preserveOnFail) return  // 已有位置时静默保留
      ready.value = true
      failed.value = true
    } finally {
      loading.value = false
      inFlight = null
    }
  })()
  return inFlight
}

/** 后台静默尝试高精度更新，不阻塞 UI，失败不影响已有位置 */
function silentHighAccUpdate() {
  if (highAccInProgress) return
  if (!('geolocation' in navigator)) return
  highAccInProgress = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      applyLocation(pos.coords.latitude, pos.coords.longitude)
      highAccInProgress = false
    },
    () => { highAccInProgress = false },
    { enableHighAccuracy: true, timeout: HIGH_ACC_TIMEOUT, maximumAge: 0 },
  )
}

/** 手动设置位置（城市选择面板使用） */
function setManual(latVal: number, lngVal: number) {
  applyLocation(latVal, lngVal)
}

/**
 * 手动刷新定位
 * - 已有位置时：静默重新定位，失败保留旧位置（不隐藏天空）
 * - 首次失败后：重新尝试，失败重新标记 failed
 */
function refresh(): Promise<void> {
  const hadLocation = lat.value != null && lng.value != null
  failed.value = false
  requested = false
  // skipCache: 强制重新定位，不走缓存（用户点击"重新获取定位"期望真正刷新）
  return doRequest({ force: true, preserveOnFail: hadLocation, skipCache: true })
}

/** 初始化：只执行一次 */
function init() {
  if (!requested) doRequest()
}

/** 等待位置就绪（用于需要位置后才能执行的逻辑） */
function waitForReady(): Promise<LatLng | null> {
  if (ready.value && lat.value != null && lng.value != null) {
    return Promise.resolve({ lat: lat.value, lng: lng.value })
  }
  if (ready.value && failed.value) {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    const check = () => {
      if (ready.value) {
        if (lat.value != null && lng.value != null) {
          resolve({ lat: lat.value, lng: lng.value })
        } else {
          resolve(null)
        }
      } else {
        setTimeout(check, 100)
      }
    }
    if (!requested) init()
    check()
  })
}

/**
 * 统一的位置管理 composable（单例模式，全局共享状态）
 * 调用 init() 或 waitForReady() 触发定位，多个组件共享结果，不会重复请求
 */
export function useLocation() {
  init()
  return {
    lat: readonly(lat),
    lng: readonly(lng),
    ready: readonly(ready),
    failed: readonly(failed),
    loading: readonly(loading),
    refresh,
    setManual,
    waitForReady,
  }
}
