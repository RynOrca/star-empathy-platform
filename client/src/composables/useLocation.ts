import { ref, readonly } from 'vue'

export interface LatLng {
  lat: number
  lng: number
}

const LOCATION_CACHE_KEY = 'star_location_cache'
const LOCATION_CACHE_TTL = 2 * 60 * 60 * 1000 // 2小时
const QUICK_TIMEOUT = 3000  // 快速定位3秒超时
const HIGH_ACC_TIMEOUT = 8000 // 高精度8秒超时
const MAX_AGE = 5 * 60 * 1000 // 允许使用5分钟内的缓存位置

const lat = ref<number | null>(null)
const lng = ref<number | null>(null)
const ready = ref(false)
const failed = ref(false)
const loading = ref(false)
let requested = false
let highAccInProgress = false

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
 * 快速定位策略：
 * 1. 先读 localStorage 缓存 → 立即返回（0ms）
 * 2. 用 enableHighAccuracy: false + 3s 超时 → IP/WiFi定位（通常<2秒）
 * 3. 快速定位成功后，后台静默尝试高精度更新（不阻塞UI）
 * 4. 快速定位失败/超时 → 标记failed，但不阻塞UI
 */
async function doRequest() {
  if (loading.value || requested) return
  requested = true
  loading.value = true

  // Step 1: 缓存立即命中
  const cached = getCache()
  if (cached) {
    applyLocation(cached.lat, cached.lng)
    loading.value = false
    // 后台静默刷新
    silentHighAccUpdate()
    return
  }

  // Step 2: 快速低精度定位（IP/WiFi，城市级精度足够天文观测）
  if (!('geolocation' in navigator)) {
    ready.value = true
    failed.value = true
    loading.value = false
    return
  }

  const quickPromise = new Promise<LatLng | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: QUICK_TIMEOUT, maximumAge: MAX_AGE },
    )
  })

  const quickResult = await quickPromise
  if (quickResult) {
    applyLocation(quickResult.lat, quickResult.lng)
    // 后台静默尝试高精度
    silentHighAccUpdate()
  } else {
    // 快速定位失败，标记完成（不阻塞），标记失败
    ready.value = true
    failed.value = true
  }
  loading.value = false
}

/** 后台静默尝试高精度更新，不阻塞UI，失败不影响已有位置 */
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

/** 手动刷新定位（静默，不隐藏已有天空） */
function refresh(): Promise<void> {
  requested = false
  failed.value = false
  loading.value = true
  return doRequest()
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
