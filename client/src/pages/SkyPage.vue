﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <div class="sky-page">
    <!-- 导航栏 -->
    <nav class="sky-nav">
      <div class="nav-center">
        <div class="search-box">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="searchQuery" placeholder="搜索星星..." class="search-input" @input="onSearchInput" @focus="searchOpen = true" style="padding-left: 2rem" />
          <div v-if="searchOpen && searchResults.length" class="search-dropdown">
            <div v-for="r in searchResults" :key="r.id" class="search-item" @click="flyToStar(r.id); searchOpen = false; searchQuery = ''">
              <span class="sr-name">{{ r.name || r.conName }}</span>
              <span class="sr-con">{{ r.conName }}</span>
              <span class="sr-mag">{{ r.mag.toFixed(1) }} mag</span>
              <button class="sr-locate" title="定位到这颗星" @click.stop="locateStar(r.id); searchOpen = false; searchQuery = ''">
                <Crosshair :size="14" />
              </button>
            </div>
          </div>
          <div v-if="searchOpen && searchQuery && !searching && searchResults.length === 0" class="search-dropdown">
            <div class="search-item muted">未找到匹配的星星</div>
          </div>
        </div>
      </div>
      <div class="nav-right">
        <span v-if="solarTerm" class="solar-term" :title="`节气：${solarTerm.termName}（距${solarTerm.nextTermName}还有 ${solarTerm.daysToNext} 天）`">
          <span class="term-text">{{ solarTerm.termName }}</span>
          <span class="term-next">{{ solarTerm.daysToNext }}天后{{ solarTerm.nextTermName }}</span>
        </span>
        <span v-if="moonPhase" class="moon-phase" :title="`月相：${moonPhase.phaseName}（照明 ${Math.round(moonPhase.illumination * 100)}%）`">
          <span class="moon-icon" :style="{ background: moonIconStyle }"></span>
          <span class="moon-text">{{ moonPhase.phaseName }}</span>
        </span>
        <button v-if="username" class="nav-btn nav-my-toggle" :class="{ active: showMyStoriesOnly }" @click="toggleMyStories" title="只看我的故事">
          {{ showMyStoriesOnly ? '🌐 全部' : '⭐ 我的' }}
        </button>
        <button v-if="locationReady" class="nav-btn nav-loc-btn" @click="refreshLocation" title="更改定位">
          📍 定位
        </button>
        <span v-if="username" class="nav-user" @click.stop.prevent="$router.push('/profile')">
          👤 {{ username }}
        </span>
        <button v-if="username" class="nav-btn" @click="doLogout">退出</button>
        <button v-if="!username" class="nav-btn nav-login-btn" @click="goLogin">登录</button>
      </div>
    </nav>

    <!-- 切换反馈提示 -->
    <Transition name="toast-fade">
      <div v-if="myToggleFeedback" class="toggle-toast">{{ myToggleFeedback }}</div>
    </Transition>

    <!-- 定位城市提示 -->
    <Transition name="toast-fade">
      <div v-if="locationCityToast" class="location-toast">📍 {{ locationCityToast }}</div>
    </Transition>

    <SkyCanvas v-if="locationReady" ref="skyRef" :observer-lat="userLat" :observer-lng="userLng" @star-click="onStarClick" @star-hover-long="onStarHoverLong" @planet-click="onPlanetClick" />

    <!-- 定位加载/失败 -->
    <div v-if="!locationReady" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p class="loading-text">正在获取你的位置...</p>
    </div>
    <div v-if="locationFailed" class="location-fallback-backdrop">
      <div class="location-fallback-panel">
        <p class="fallback-title">无法获取你的位置</p>
        <p class="fallback-desc">请在浏览器地址栏允许位置权限，或手动选择一个城市：</p>
        <div class="city-grid">
          <button v-for="c in cities" :key="c.name" class="city-btn" @click="selectCity(c)">
            {{ c.name }}
          </button>
        </div>
        <button class="refresh-loc-btn" @click="refreshLocation">🔄 重新获取定位</button>
      </div>
    </div>

    <!-- 三张叙事引导牌 -->
    <div v-if="locationReady" class="guide-cards">
      <div class="guide-card">
        <div class="guide-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </div>
        <p class="guide-title">历史里的星</p>
        <p class="guide-desc">织女、牛郎、传说留在夜空。点击一颗星，听听它从前的故事。</p>
      </div>
      <div class="guide-card">
        <div class="guide-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </div>
        <p class="guide-title">路过别人的星光</p>
        <p class="guide-desc">发现相似的等待、离别和愿望。每一次共鸣，都是两颗心的相遇。</p>
      </div>
      <div class="guide-card">
        <div class="guide-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
        </div>
        <p class="guide-title">挂上我的故事</p>
        <p class="guide-desc">把今天的心事放到某颗星旁，成为一束新光。</p>
      </div>
      <div class="guide-card guide-action-card">
        <div class="guide-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/></svg>
        </div>
        <p class="guide-title">点开一颗星</p>
        <p class="guide-desc">看看它从前的故事，读读别人留下的心事，或者写一段你自己的。</p>
      </div>
    </div>

    <div v-if="locationReady" class="zoom-controls">
      <button class="zoom-btn" @click="zoomIn">+</button>
      <button class="zoom-btn" @click="zoomOut">−</button>
      <div class="zoom-divider"></div>
      <button class="zoom-btn settings-entry" @click="showSettings = true" title="设置">
        <Settings :size="16" />
      </button>
    </div>
    <div v-if="locationReady" class="hint">
      <p>拖拽旋转 <span>·</span> 滚轮缩放 <span>·</span> 点击星星</p>
    </div>

      <StarDetail
        v-if="selectedStarInfo"
        :stories="selectedStories"
        :active-index="activeStoryIndex"
        :star-info="selectedStarInfo"
        :catalog-stats="catalogStats"
        :catalog-star-id="selectedCatalogStarId"
        :resonating="resonating"
        :favorite-star-ids="favoriteStarIds"
        :current-user-id="currentUserId"
        @switch="onSwitchStory"
        @resonate="onResonate"
        @refresh-stories="fetchStories"
        @increment-views="onIncrementViews"
        @increment-favorites="onIncrementFavorites"
        @decrement-favorites="onDecrementFavorites"
        @update-favorite-list="onUpdateFavoriteList"
        @update-stats="catalogStats = $event"
        @update-similar-stars="onUpdateSimilarStars"
        @close="onCloseDetail"
        @write-story="onWriteStory"
        @delete-story="onDeleteStory"
      />

      <StoryForm
        v-if="showForm"
        :star-name="selectedStarInfo?.displayName ?? ''"
        :catalog-star-id="selectedCatalogStarId"
        @submitted="onStorySubmitted"
        @close="showForm = false"
      />

      <SettingsModal
        :visible="showSettings"
        @close="showSettings = false"
      />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Settings, Crosshair } from 'lucide-vue-next'
import { useAuth } from '../stores/auth'
import type { SkyAPI } from '../composables/useSky'
import SkyCanvas from '../components/SkyCanvas.vue'
import StarDetail from '../components/StarDetail.vue'
import StoryForm from '../components/StoryForm.vue'
import SettingsModal from '../components/SettingsModal.vue'
import catalogData from '../data/stars.json'
import { constellationNames, starDistances } from '../data/starInfo'
import { getMoonPhase, getSolarTerm } from '../data/planets'


const router = useRouter()
const route = useRoute()
const { startRefreshTimer, stopRefreshTimer } = useAuth()
const username = ref('')
const currentUserId = ref<number | null>(null)
const showMyStoriesOnly = ref(false)
const myToggleFeedback = ref('')
const locationCityToast = ref('')

function toggleMyStories() {
  showMyStoriesOnly.value = !showMyStoriesOnly.value
  myToggleFeedback.value = showMyStoriesOnly.value ? '已切换：只看我的故事' : '已切换：查看全部故事'
  setTimeout(() => { myToggleFeedback.value = '' }, 2000)
}
const favoriteStarIds = ref<number[]>([])
const userLat = ref<number | undefined>(undefined)
const userLng = ref<number | undefined>(undefined)
const locationReady = ref(false)
const locationFailed = ref(false)

// ─── 阶段 3 P0-1：月相显示（14-C §1 地月系） ───
const moonPhase = ref<{ phaseFraction: number; phaseName: string; illumination: number } | null>(null)
// CSS 绘制月相图标：用 radial-gradient 模拟月相阴影
// 上半月（phase<0.5）：右边亮；下半月（phase>0.5）：左边亮
const moonIconStyle = computed(() => {
  if (!moonPhase.value) return ''
  const f = moonPhase.value.phaseFraction
  // 0=新月（全黑），0.5=满月（全亮），0.25=上弦（右半亮），0.75=下弦（左半亮）
  // 用 conic-gradient 或 linear-gradient 简化：左右半圆 + 中间过渡
  if (f < 0.5) {
    // 上半月：从全黑到全亮，亮的部分在右
    const lit = f * 2 * 100 // 0~100%
    return `linear-gradient(90deg, #1a1a2e ${100 - lit}%, #f0e6c8 ${100 - lit}%)`
  } else {
    // 下半月：从全亮到全黑，亮的部分在左
    const lit = (1 - f) * 2 * 100 // 100~0%
    return `linear-gradient(90deg, #f0e6c8 ${100 - lit}%, #1a1a2e ${100 - lit}%)`
  }
})

async function refreshMoonPhase() {
  moonPhase.value = await getMoonPhase()
}

// ─── 阶段 3 P1-1：节气显示（14-B §3 黄道与节气） ───
const solarTerm = ref<{ termName: string; nextTermName: string; daysToNext: number } | null>(null)
async function refreshSolarTerm() {
  solarTerm.value = await getSolarTerm()
}

// 月相 + 节气 定时刷新
let astroTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  refreshMoonPhase()
  refreshSolarTerm()
  astroTimer = setInterval(() => {
    refreshMoonPhase()
    refreshSolarTerm()
  }, 30 * 60 * 1000)
})
onBeforeUnmount(() => {
  if (astroTimer) { clearInterval(astroTimer); astroTimer = null }
})

const cities = [
  { name: '北京', lat: 39.9, lng: 116.4 },
  { name: '上海', lat: 31.2, lng: 121.5 },
  { name: '广州', lat: 23.1, lng: 113.3 },
  { name: '深圳', lat: 22.5, lng: 114.1 },
  { name: '成都', lat: 30.6, lng: 104.1 },
  { name: '杭州', lat: 30.3, lng: 120.2 },
  { name: '武汉', lat: 30.6, lng: 114.3 },
  { name: '西安', lat: 34.3, lng: 108.9 },
  { name: '南京', lat: 32.1, lng: 118.8 },
  { name: '重庆', lat: 29.6, lng: 106.5 },
  { name: '长沙', lat: 28.2, lng: 113.0 },
  { name: '哈尔滨', lat: 45.8, lng: 126.7 },
]

function selectCity(c: { name: string; lat: number; lng: number }) {
  userLat.value = c.lat
  userLng.value = c.lng
  locationFailed.value = false
  locationReady.value = true
  showLocationToast(c.name)
}

// 获取用户地理位置（带 2 小时缓存）
const LOCATION_CACHE_KEY = 'star_location_cache'
const LOCATION_CACHE_TTL = 2 * 60 * 60 * 1000 // 2 小时

function getCachedLocation(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY)
    if (!raw) return null
    const { lat, lng, ts } = JSON.parse(raw)
    if (Date.now() - ts > LOCATION_CACHE_TTL) return null
    return { lat, lng }
  } catch { return null }
}

function setCachedLocation(lat: number, lng: number) {
  localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({ lat, lng, ts: Date.now() }))
}

// 反向地理编码：获取城市名称
// 优先通过后端代理（服务端网络更可靠），再回退到直接调 Nominatim
async function fetchCityName(lat: number, lng: number): Promise<string> {
  // 1. 通过后端代理
  try {
    const res = await fetch(`/api/location/reverse?lat=${lat}&lng=${lng}`)
    const json = await res.json()
    if (res.ok && json.data?.city) {
      console.log('[SkyPage] fetchCityName via backend:', json.data.city)
      return json.data.city
    }
  } catch (e) {
    console.warn('[SkyPage] fetchCityName via backend failed:', e)
  }
  // 2. 回退到直接调 Nominatim（带 User-Agent）
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=zh`,
      { headers: { 'User-Agent': 'StarLanguageDome/1.0' } },
    )
    const data = await res.json()
    const addr = data.address || {}
    const city = addr.city || addr.town || addr.county || addr.state || addr.province || ''
    console.log('[SkyPage] fetchCityName direct:', city)
    return city
  } catch (e) {
    console.error('[SkyPage] fetchCityName all failed:', e)
    return ''
  }
}

function showLocationToast(city: string) {
  const text = city ? `当前定位：${city}` : '📍 定位成功'
  console.log('[SkyPage] showLocationToast:', text)
  locationCityToast.value = text
  setTimeout(() => { locationCityToast.value = '' }, 10000)
}

// IP 坐标兜底：浏览器定位失败时用（大致位置，总比没有好）
// 返回 true=成功设置坐标, false=完全失败
async function fallbackToIP(): Promise<boolean> {
  try {
    const res = await fetch('/api/location/ip')
    const json = await res.json()
    if (res.ok && json.data?.lat != null && json.data?.lng != null) {
      userLat.value = json.data.lat
      userLng.value = json.data.lng
      setCachedLocation(json.data.lat, json.data.lng)
      console.log('[SkyPage] IP fallback coords:', json.data.lat, json.data.lng)
      return true
    }
  } catch (e) {
    console.error('[SkyPage] IP fallback failed:', e)
  }
  return false
}

function fetchLocation() {
  if (!navigator.geolocation) {
    // 浏览器不支持 → IP 坐标兜底 + 显示城市选择面板让用户纠正
    fallbackToIP().then(ok => {
      locationReady.value = true
      locationFailed.value = true  // 显示城市面板
      if (!ok) showLocationToast('')
    })
    return
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      // ✅ 浏览器定位坐标（精确）设置天球
      userLat.value = pos.coords.latitude
      userLng.value = pos.coords.longitude
      setCachedLocation(pos.coords.latitude, pos.coords.longitude)
      locationReady.value = true
      locationFailed.value = false
      // 用反向地理编码获取真实城市名（仅供参考）
      const city = await fetchCityName(pos.coords.latitude, pos.coords.longitude)
      showLocationToast(city)
    },
    async (err) => {
      console.warn('Geolocation failed:', err.message)
      // 浏览器定位失败 → IP 坐标兜底（大致位置）
      await fallbackToIP()
      locationReady.value = true
      locationFailed.value = true  // 显示城市选择面板，让用户手动校正
    },
    { timeout: 5000, enableHighAccuracy: false },
  )
}

// 手动刷新定位（不隐藏天空，静默更新）
function refreshLocation() {
  if (!navigator.geolocation) {
    fallbackToIP().then(ok => {
      if (!ok) showLocationToast('')
    })
    return
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      userLat.value = pos.coords.latitude
      userLng.value = pos.coords.longitude
      setCachedLocation(pos.coords.latitude, pos.coords.longitude)
      locationFailed.value = false
      const city = await fetchCityName(pos.coords.latitude, pos.coords.longitude)
      showLocationToast(city)
    },
    async () => {
      await fallbackToIP()
    },
    { timeout: 5000, enableHighAccuracy: false },
  )
}

// 优先使用缓存定位
const cached = getCachedLocation()
if (cached) {
  userLat.value = cached.lat
  userLng.value = cached.lng
  locationReady.value = true
  locationFailed.value = false
  // 异步获取城市名并显示 toast
  fetchCityName(cached.lat, cached.lng).then(city => showLocationToast(city))
} else {
  fetchLocation()
}

onMounted(async () => {
  fetchStories()
  const token = localStorage.getItem('token')
  if (token) {
    startRefreshTimer()
    try {
      const [meRes, favRes] = await Promise.all([
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/profile/favorites', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const meJson = await meRes.json()
      if (meRes.ok) {
        const meData = meJson.data
        username.value = meData.username
        currentUserId.value = meData.id ?? null
      }
      const favJson = await favRes.json()
      if (favRes.ok) favoriteStarIds.value = favJson.data
    } catch {}
  }
  // 监听相似星星点击事件
  window.addEventListener('fly-to-star', ((e: CustomEvent) => {
    onStarClick(e.detail.catalogStarId)
  }) as EventListener)

  // 从个人主页收藏点击跳转过来：定位到指定星星
  focusOnQueryStar()
})

// 提取定位逻辑为独立函数，供 onMounted 和 watch 共用
function focusOnQueryStar() {
  const targetStarId = route.query.star
  if (!targetStarId) return
  const starId = parseInt(targetStarId as string, 10)
  if (isNaN(starId)) return
  const tryFocus = () => {
    const star = catalogStarLookup.get(starId)
    if (star && skyRef.value?.sky) {
      skyRef.value.sky.focusOnStar(star.x, star.y, star.z)
      setTimeout(() => skyRef.value?.sky?.highlightStar(star.x, star.y, star.z), 1200)
    } else {
      setTimeout(tryFocus, 300)
    }
  }
  setTimeout(tryFocus, 500)
}

// 监听路由 query 变化（从个人主页多次点击收藏时触发）
watch(() => route.query.star, () => {
  focusOnQueryStar()
})

async function doLogout() {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch { /* 即使 API 失败也清除本地状态 */ }
  }
  stopRefreshTimer()
  localStorage.removeItem('token')
  router.push('/')
}

function goLogin() {
  stopRefreshTimer()
  localStorage.removeItem('token')
  router.push('/')
}

// ─── 搜索星星 ───
const searchQuery = ref('')
const searchOpen = ref(false)
const searching = ref(false)
const searchResults = ref<any[]>([])

async function onSearchInput() {
  const q = searchQuery.value.trim()
  if (!q) { searchResults.value = []; return }
  searching.value = true
  try {
    const res = await fetch(`/api/catalog/stars/search?q=${encodeURIComponent(q)}`)
    const json = await res.json()
    if (res.ok) searchResults.value = json.data
  } catch { searchResults.value = [] }
  finally { searching.value = false }
}

async function flyToStar(starId: number) {
  const star = catalogStarLookup.get(starId)
  if (!star) return
  // 模拟点击该星
  onStarClick(starId)
}

function locateStar(starId: number) {
  const star = catalogStarLookup.get(starId)
  if (!star || !skyRef.value?.sky) return
  // 平滑转动相机，以该星为中心（不打开详情面板）
  skyRef.value.sky.focusOnStar(star.x, star.y, star.z)
  // 动画结束后高亮该星 2s
  setTimeout(() => {
    skyRef.value?.sky?.highlightStar(star.x, star.y, star.z)
  }, 1200)
}

// ─── 长悬浮显示内核连线 ───
let hoverLinesAbort: AbortController | null = null
let clearLinesTimer: ReturnType<typeof setTimeout> | null = null
async function onStarHoverLong(starId: number | null) {
  // 取消上一次请求和清除计时器
  if (hoverLinesAbort) { hoverLinesAbort.abort(); hoverLinesAbort = null }
  if (clearLinesTimer) { clearTimeout(clearLinesTimer); clearLinesTimer = null }

  if (starId === null) {
    // 鼠标离开：2s 后再清除连线（给用户时间看清）
    clearLinesTimer = setTimeout(() => {
      skyRef.value?.sky?.setKernelLines([])
    }, 2000)
    return
  }
  // 详情面板打开时不重复显示连线
  if (selectedStarInfo.value) return
  const controller = new AbortController()
  hoverLinesAbort = controller
  try {
    const res = await fetch(`/api/catalog/stars/${starId}/similar`, { signal: controller.signal })
    const json = await res.json()
    if (!res.ok || !json.data?.length) {
      skyRef.value?.sky?.setKernelLines([])
      return
    }
    const sourceStar = catalogStarLookup.get(starId)
    if (!sourceStar) return
    const lines = (json.data as { catalogStarId: number }[]).map(s => {
      const target = catalogStarLookup.get(s.catalogStarId)
      return target ? { from: { x: sourceStar.x, y: sourceStar.y, z: sourceStar.z }, to: { x: target.x, y: target.y, z: target.z } } : null
    }).filter(Boolean) as { from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } }[]
    skyRef.value?.sky?.setKernelLines(lines)
  } catch {
    if (!controller.signal.aborted) skyRef.value?.sky?.setKernelLines([])
  }
}

interface CatalogStar {
  id: number; name: string | null; con: string; mag: number
  ra: number; dec: number; x: number; y: number; z: number; color: string
}
const catalogStarLookup = new Map<number, CatalogStar>()
for (const s of catalogData.stars) {
  catalogStarLookup.set(s.id, { id: s.id, name: s.name, con: s.con, mag: s.mag, ra: s.ra, dec: s.dec, x: s.x, y: s.y, z: s.z, color: s.color })
}

interface StoryData {
  id: number; title: string | null; content: string; resonanceCount: number
  catalogStarId: number; createdAt: string; locationLat: number | null
  locationLng: number | null; type: string; viewCount: number; origin: string | null
  username: string | null; tag: string | null; userId: number | null
}
const NO_STORY: StoryData = { id: -1, title: null, content: '这颗星还在等待它的故事...', resonanceCount: 0, catalogStarId: -1, createdAt: '', locationLat: null, locationLng: null, type: '', viewCount: 0, origin: null, username: null, tag: null, userId: null }
const storiesByStarId = ref(new Map<number, StoryData[]>())
const fetchingStories = ref(false)
let fetchAbort: AbortController | null = null

const PAGE_SIZE = 50

function mergeStoriesIntoMap(
  items: any[],
  map: Map<number, StoryData[]>,
  statsMap: Map<number, { stories: number; resonance: number; views: number; favorites: number }>,
) {
  for (const s of items) {
    const cid = s.catalogStarId
    if (cid == null) continue
    if (!map.has(cid)) map.set(cid, [])
    map.get(cid)!.push({
      id: s.id, title: s.title, content: s.content, resonanceCount: s.resonanceCount,
      catalogStarId: cid, createdAt: s.createdAt || '',
      locationLat: s.locationLat ?? null, locationLng: s.locationLng ?? null,
      type: s.type || 'user', viewCount: s.viewCount ?? 0, origin: s.origin ?? null,
      username: s.username ?? null, tag: s.tag ?? null, userId: s.userId ?? null,
    })
    const cur = statsMap.get(cid) || { stories: 0, resonance: 0, views: 0, favorites: 0 }
    cur.stories++; cur.resonance += s.resonanceCount || 0; cur.views += s.viewCount || 0
    statsMap.set(cid, cur)
  }
}

function publishStories(
  map: Map<number, StoryData[]>,
  statsMap: Map<number, { stories: number; resonance: number; views: number; favorites: number }>,
) {
  storiesByStarId.value = map
  pendingStatsMap.value = statsMap
  skyRef.value?.sky?.setStarStatsCache(statsMap)
}

async function fetchStories() {
  if (fetchingStories.value) return
  fetchingStories.value = true
  fetchAbort?.abort()
  fetchAbort = new AbortController()
  const signal = fetchAbort.signal

  try {
    const res = await fetch('/api/stories')
    const json = await res.json()
    const map = new Map<number, StoryData[]>()
    const statsMap = new Map<number, { stories: number; resonance: number; views: number; favorites: number }>()

    // 加载第一页，立即显示
    const first = await fetch(`/api/stories?page=1&limit=${PAGE_SIZE}`, { signal })
    const firstJson = await first.json()
    const firstData = firstJson.data?.items ?? firstJson.data ?? []
    const totalPages = firstJson.data?.totalPages ?? 1
    mergeStoriesIntoMap(firstData, map, statsMap)
    publishStories(map, statsMap)

    // 后台继续加载剩余页
    for (let page = 2; page <= totalPages; page++) {
      if (signal.aborted) break
      const res = await fetch(`/api/stories?page=${page}&limit=${PAGE_SIZE}`, { signal })
      const json = await res.json()
      const items = json.data?.items ?? json.data ?? []
      mergeStoriesIntoMap(items, map, statsMap)
      publishStories(map, statsMap)
    }
  } catch (e: any) {
    if (e.name !== 'AbortError') console.error('获取故事失败:', e)
  } finally {
    fetchingStories.value = false
  }
  // 如果"只看我的"已开启，重新计算过滤后的天空统计
  if (showMyStoriesOnly.value) recalcFilteredStats()
}
onMounted(() => { fetchStories() })

// 根据"只看我的"切换，重新计算天空中的星星统计数据
function recalcFilteredStats() {
  const fullMap = storiesByStarId.value
  if (!fullMap) return
  const statsMap = new Map<number, { stories: number; resonance: number; views: number; favorites: number }>()
  for (const [cid, stories] of fullMap) {
    const filtered = showMyStoriesOnly.value
      ? stories.filter(s => s.userId === currentUserId.value)
      : stories
    if (filtered.length === 0) continue
    statsMap.set(cid, {
      stories: filtered.length,
      resonance: filtered.reduce((sum, s) => sum + s.resonanceCount, 0),
      views: filtered.reduce((sum, s) => sum + s.viewCount, 0),
      favorites: 0,
    })
  }
  pendingStatsMap.value = statsMap
  skyRef.value?.sky?.setStarStatsCache(statsMap)
}

// 监听"只看我的"切换，更新天空统计和私有连线
watch(showMyStoriesOnly, async () => {
  recalcFilteredStats()
  if (showMyStoriesOnly.value) {
    // 开启"只看我的"：加载私有连线
    await fetchMyKernelLines()
  } else {
    // 关闭"只看我的"：清除连线
    skyRef.value?.sky?.setKernelLines([])
  }
  // 如果详情面板打开且当前星没有过滤后的故事，关闭面板
  if (selectedStarInfo.value && selectedCatalogStarId.value) {
    const filtered = getFilteredStories(selectedCatalogStarId.value)
    if (filtered.length === 0) {
      selectedStories.value = []
      selectedStarInfo.value = null
      catalogStats.value = null
    } else {
      selectedStories.value = filtered
      catalogStats.value = {
        storyCount: filtered.length,
        totalResonance: filtered.reduce((s, x) => s + x.resonanceCount, 0),
        totalViews: 0, starViews: 0, favoriteCount: 0,
      }
    }
  }
})

// 获取过滤后的故事（考虑"只看我的"开关）
function getFilteredStories(starId: number): StoryData[] {
  const stories = storiesByStarId.value.get(starId)
  if (!stories) return []
  if (!showMyStoriesOnly.value) return stories
  return stories.filter(s => s.userId === currentUserId.value)
}

// 获取用户私有内核连线
async function fetchMyKernelLines() {
  const token = localStorage.getItem('token')
  if (!token) return
  try {
    const res = await fetch('/api/profile/kernel-lines', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (!res.ok || !json.data?.length) {
      skyRef.value?.sky?.setKernelLines([])
      return
    }
    const lines = (json.data as {
      from: { catalogStarId: number; x: number; y: number; z: number }
      to: { catalogStarId: number; x: number; y: number; z: number }
    }[]).map(l => ({
      from: { x: l.from.x, y: l.from.y, z: l.from.z },
      to: { x: l.to.x, y: l.to.y, z: l.to.z },
    }))
    skyRef.value?.sky?.setKernelLines(lines)
  } catch {
    skyRef.value?.sky?.setKernelLines([])
  }
}

function formatStarName(s: CatalogStar): string {
  if (s.name) return s.name
  if (s.ra != null && s.dec != null && isFinite(s.ra) && isFinite(s.dec)) {
    return `${Math.floor(s.ra)}h${Math.floor((s.ra - Math.floor(s.ra)) * 60).toString().padStart(2,'0')}m · ${s.dec>=0?'+':''}${Math.floor(Math.abs(s.dec))}°${Math.floor((Math.abs(s.dec) - Math.floor(Math.abs(s.dec))) * 60).toString().padStart(2,'0')}′`
  }
  return `恒星 · ${s.con || '未知'}`
}

const skyRef = ref<{ sky: SkyAPI | null } | null>(null)
const pendingStatsMap = ref<Map<number, { stories: number; resonance: number; views: number; favorites: number }> | null>(null)

// 当 SkyCanvas 渲染完成后，传入等待的统计数据
watch([() => skyRef.value, pendingStatsMap], ([sRef, statsMap]) => {
  if (sRef?.sky && statsMap) {
    sRef.sky.setStarStatsCache(statsMap)
  }
})

// ═══════════════════════════════════════════
// 天球旋转 + 实时自转
// ═══════════════════════════════════════════
let debugTimer: ReturnType<typeof setInterval> | null = null

function applySkyRotation() {
  const sky = skyRef.value?.sky
  if (!sky) return false

  const lat = userLat.value
  const lng = userLng.value
  if (lat == null || lng == null) return false

  sky.applyAstroRotation(lat, lng, new Date())
  return true
}

// 立即尝试(可能 skyRef 已就绪) + watch 兜底
const rotationApplied = ref(false)
watch(skyRef, () => {
  if (!rotationApplied.value) {
    rotationApplied.value = applySkyRotation()
  }
}, { immediate: true })

// 兜底: 用轮询确保 sky 就绪后一定会应用
let retryCount = 0
const retryInterval = setInterval(() => {
  if (rotationApplied.value) {
    clearInterval(retryInterval)
    return
  }
  if (applySkyRotation()) {
    clearInterval(retryInterval)
  } else if (++retryCount > 30) {
    clearInterval(retryInterval)
  }
}, 100)

// 实时天球自转更新（每秒刷新 LST）
debugTimer = setInterval(() => {
  const now = new Date()
  if (skyRef.value?.sky && userLat.value != null && userLng.value != null) {
    skyRef.value.sky.applyAstroRotation(userLat.value, userLng.value, now)
  }
}, 1000)

onBeforeUnmount(() => {
  if (debugTimer) clearInterval(debugTimer)
  clearInterval(retryInterval)
})
const selectedStories = ref<StoryData[]>([])
const activeStoryIndex = ref(0)
const selectedStarInfo = ref<{ displayName: string; con: string; mag: number; conName: string; distance: number | null; ra: number; dec: number; color: string } | null>(null)
const selectedCatalogStarId = ref(0)
const resonating = ref(false)
const catalogStats = ref<{ storyCount: number; totalResonance: number; totalViews: number; starViews: number; favoriteCount: number } | null>(null)
const showForm = ref(false)
const showSettings = ref(false)

function onStarClick(starId: number) {
  const star = catalogStarLookup.get(starId); if (!star) return
  const stories = getFilteredStories(starId)
  selectedStories.value = stories?.length ? stories : [NO_STORY]; activeStoryIndex.value = 0
  selectedStarInfo.value = { displayName: formatStarName(star), con: star.con, mag: star.mag, conName: constellationNames[star.con] || star.con || '未知星座', distance: starDistances[star.id] ?? null, ra: star.ra, dec: star.dec, color: star.color || '#fff6e8' }
  selectedCatalogStarId.value = starId
  const realStories = (stories || []).filter((s: StoryData) => s.id > 0)
  catalogStats.value = { storyCount: realStories.length, totalResonance: realStories.reduce((sum: number, s: StoryData) => sum + s.resonanceCount, 0), totalViews: 0, starViews: 0, favoriteCount: 0 }
  fetchCatalogStats(starId)
  fetch(`/api/catalog/stars/${starId}/visit`, { method: 'POST' }).catch(() => {})
}

// 行星数据映射（用于故事详情展示）
const PLANET_INFO: Record<string, { color: string; conName: string }> = {
  'Sun':     { color: '#ffdd88', conName: '太阳' },
  'Moon':    { color: '#cccccc', conName: '月球' },
  'Venus':   { color: '#e8cda0', conName: '金星' },
  'Mars':    { color: '#dd6644', conName: '火星' },
  'Jupiter': { color: '#ddaa77', conName: '木星' },
  'Saturn':  { color: '#ddcc99', conName: '土星' },
}
const PLANET_ID_MAP: Record<string, number> = {
  'Sun': -100, 'Moon': -101, 'Venus': -102, 'Mars': -103, 'Jupiter': -104, 'Saturn': -105,
}

function onPlanetClick(name: string, nameCN: string) {
  const planetId = PLANET_ID_MAP[name]
  if (planetId == null) return
  const info = PLANET_INFO[name]
  const stories = getFilteredStories(planetId)
  selectedStories.value = stories?.length ? stories : [NO_STORY]
  activeStoryIndex.value = 0
  selectedStarInfo.value = {
    displayName: nameCN,
    con: '',
    mag: 0,
    conName: nameCN,
    distance: null,
    ra: 0,
    dec: 0,
    color: info?.color || '#ffdd88',
  }
  selectedCatalogStarId.value = planetId
  const realStories = (stories || []).filter((s: StoryData) => s.id > 0)
  catalogStats.value = { storyCount: realStories.length, totalResonance: realStories.reduce((sum: number, s: StoryData) => sum + s.resonanceCount, 0), totalViews: 0, starViews: 0, favoriteCount: 0 }
}
async function fetchCatalogStats(starId: number) {
  try { const res = await fetch(`/api/catalog/stars/${starId}/stats`); const json = await res.json(); if (res.ok) { catalogStats.value = { storyCount: json.data.storyCount ?? 0, totalResonance: json.data.totalResonance ?? 0, totalViews: json.data.totalViews ?? 0, starViews: json.data.starViews ?? 0, favoriteCount: json.data.favoriteCount ?? 0 } } } catch {}
}
function onCloseDetail() { selectedStories.value = []; selectedStarInfo.value = null; catalogStats.value = null; skyRef.value?.sky?.setKernelLines([]) }
function onWriteStory() { if (selectedStarInfo.value) showForm.value = true }
function onUpdateSimilarStars(ids: number[]) {
  // 查找源星和相似星的 3D 坐标
  const sourceStar = catalogStarLookup.get(selectedCatalogStarId.value)
  if (!sourceStar) return
  const lines: { from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } }[] = []
  for (const id of ids) {
    const target = catalogStarLookup.get(id)
    if (target) {
      lines.push({ from: { x: sourceStar.x, y: sourceStar.y, z: sourceStar.z }, to: { x: target.x, y: target.y, z: target.z } })
    }
  }
  skyRef.value?.sky?.setKernelLines(lines)
}
function onStorySubmitted(story: StoryData) {
  const cid = story.catalogStarId
  const map = new Map(storiesByStarId.value)
  const existing = [...(map.get(cid) ?? []), story]
  map.set(cid, existing)
  storiesByStarId.value = map
  // 更新天空统计（无论是否"只看我的"模式）
  recalcFilteredStats()
  if (cid === selectedCatalogStarId.value && selectedStarInfo.value) {
    selectedStories.value = existing
    // 从后端拉取权威统计数据，确保数据准确
    fetchCatalogStats(cid)
  }
  showForm.value = false
}
function onSwitchStory(index: number) { activeStoryIndex.value = index }
function onIncrementViews() { if (catalogStats.value) catalogStats.value = { ...catalogStats.value, totalViews: catalogStats.value.totalViews + 1 } }
function onIncrementFavorites() { if (catalogStats.value) catalogStats.value = { ...catalogStats.value, favoriteCount: catalogStats.value.favoriteCount + 1 } }
function onDecrementFavorites() { if (catalogStats.value && catalogStats.value.favoriteCount > 0) catalogStats.value = { ...catalogStats.value, favoriteCount: catalogStats.value.favoriteCount - 1 } }
function onUpdateFavoriteList(data: { catalogStarId: number; favorited: boolean }) {
  if (data.favorited) {
    if (!favoriteStarIds.value.includes(data.catalogStarId))
      favoriteStarIds.value = [...favoriteStarIds.value, data.catalogStarId]
  } else {
    favoriteStarIds.value = favoriteStarIds.value.filter(id => id !== data.catalogStarId)
  }
}
function onDeleteStory(storyId: number) {
  // 从 selectedStories 中移除
  selectedStories.value = selectedStories.value.filter(s => s.id !== storyId)
  // 从 storiesByStarId 中移除
  const map = new Map(storiesByStarId.value)
  const cid = selectedCatalogStarId.value
  const existing = map.get(cid)
  if (existing) {
    map.set(cid, existing.filter(s => s.id !== storyId))
    storiesByStarId.value = map
  }
  // 更新统计
  recalcFilteredStats()
  fetchCatalogStats(cid)
  // 如果当前星没有故事了，关闭面板
  if (selectedStories.value.length === 0) {
    onCloseDetail()
  }
}
async function onResonate(storyId: number) {
  resonating.value = true
  try {
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`/api/stories/${storyId}/resonate`, { method: 'POST', headers })
    const json = await res.json()
    if (res.ok) {
      // 如果已共鸣，不更新计数
      if (json.data?.already) {
        resonating.value = false
        return
      }
      // 更新当前选中故事列表
      const stories = selectedStories.value
      const idx = stories.findIndex(s => s.id === storyId)
      if (idx >= 0) {
        selectedStories.value = stories.map((s, i) =>
          i === idx ? { ...s, resonanceCount: json.data.resonanceCount } : s,
        )
      }
      // 更新主数据源 storiesByStarId
      const map = new Map(storiesByStarId.value)
      for (const [cid, starStories] of map) {
        const sIdx = starStories.findIndex(s => s.id === storyId)
        if (sIdx >= 0) {
          map.set(cid, starStories.map((s, i) =>
            i === sIdx ? { ...s, resonanceCount: json.data.resonanceCount } : s,
          ))
          storiesByStarId.value = map
          break
        }
      }
      // 从后端拉取权威 stats，确保数据准确
      fetchCatalogStats(selectedCatalogStarId.value)
      // 刷新天空统计
      recalcFilteredStats()
    }
  } catch (e) {
    console.error('共鸣失败:', e)
  } finally {
    resonating.value = false
  }
}
function zoomIn()  { skyRef.value?.sky?.zoomIn() }
function zoomOut() { skyRef.value?.sky?.zoomOut() }
</script>

<style scoped>
.sky-page {
  width: 100vw; height: 100vh; position: relative; overflow: hidden;
  background: var(--bg); font-family: var(--font); color: var(--ink);
  -webkit-font-smoothing: antialiased;
}
.sky-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 20;
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.6rem 1.5rem;
  background: transparent;
  border-bottom: none;
}
.nav-logo { color: #ffd98a; font-weight: 600; font-size: 0.95rem; }
.nav-right { display: flex; align-items: center; gap: 0.75rem; }
.solar-term {
  display: inline-flex; align-items: baseline; gap: 0.4rem;
  padding: 0.3rem 0.7rem; border-radius: 14px;
  border: 1px solid rgba(255, 217, 138, 0.18);
  background: rgba(40, 35, 18, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: default;
  transition: border-color 0.2s;
}
.solar-term:hover { border-color: rgba(255, 217, 138, 0.35); }
.term-text {
  font-size: 0.82rem; color: #ffd98a;
  font-weight: 500; letter-spacing: 0.04em;
}
.term-next {
  font-size: 0.68rem; color: #8a849e;
  letter-spacing: 0.02em;
}
.moon-phase {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.3rem 0.7rem; border-radius: 14px;
  border: 1px solid rgba(240, 230, 200, 0.18);
  background: rgba(16, 20, 43, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: default;
  transition: border-color 0.2s;
}
.moon-phase:hover { border-color: rgba(240, 230, 200, 0.35); }
.moon-icon {
  width: 14px; height: 14px; border-radius: 50%;
  box-shadow: 0 0 6px rgba(240, 230, 200, 0.3);
  display: inline-block;
}
.moon-text {
  font-size: 0.78rem; color: #c8c2d8;
  letter-spacing: 0.04em;
}
.nav-user { color: #b9b4d6; font-size: 0.85rem; cursor: pointer; }
.nav-user:hover { color: #f6f1ff; }
.nav-btn {
  padding: 0.3rem 0.8rem; border-radius: 8px;
  border: 1px solid rgba(48,55,87,0.5); background: rgba(255,255,255,0.05);
  color: #7a759c; font-size: 0.8rem; cursor: pointer;
}
.nav-btn:hover { color: #b9b4d6; border-color: rgba(48,55,87,0.8); }
.nav-login-btn {
  color: #ffd98a; border-color: rgba(255, 217, 138, 0.3);
  background: rgba(40, 35, 18, 0.35);
}
.nav-login-btn:hover { color: #ffe6b0; border-color: rgba(255, 217, 138, 0.5); background: rgba(40, 35, 18, 0.5); }
.nav-my-toggle {
  color: #ffd98a; border-color: rgba(255, 217, 138, 0.25);
  background: rgba(40, 35, 18, 0.3); transition: all 0.25s;
}
.nav-my-toggle:hover { border-color: rgba(255, 217, 138, 0.5); background: rgba(40, 35, 18, 0.5); }
.nav-my-toggle.active {
  color: #7a759c; border-color: rgba(48, 55, 87, 0.5);
  background: rgba(255, 255, 255, 0.05);
}
.nav-my-toggle.active:hover { color: #b9b4d6; }
.nav-center { flex: 1; display: flex; justify-content: center; }
.search-box { position: relative; width: 260px; }
.search-icon {
  position: absolute; left: 0.7rem; top: 50%; transform: translateY(-50%);
  color: var(--muted-light); pointer-events: none; z-index: 1;
}
.search-input {
  width: 100%; padding: 0.45rem 0.9rem; border-radius: var(--radius-lg);
  border: 1px solid var(--rule); background: rgba(255,255,255,0.05);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  color: var(--ink); font-size: 0.82rem; outline: none;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}
.search-input:focus {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow);
  background: rgba(255,255,255,0.08);
}
.search-input::placeholder { color: var(--muted-light); }
.search-dropdown {
  position: absolute; top: 110%; left: 0; right: 0;
  background: rgba(16,20,43,0.95); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--rule); border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg); max-height: 240px; overflow-y: auto; z-index: 30;
}
.search-dropdown::-webkit-scrollbar { width: 4px; }
.search-dropdown::-webkit-scrollbar-track { background: transparent; }
.search-dropdown::-webkit-scrollbar-thumb { background: rgba(255,217,138,0.2); border-radius: 4px; }
.search-dropdown::-webkit-scrollbar-thumb:hover { background: rgba(255,217,138,0.4); }
.search-item {
  padding: 0.5rem 0.8rem 0.5rem 1.6rem; display: flex; justify-content: space-between;
  align-items: center; cursor: pointer; font-size: 0.8rem;
  border-bottom: 1px solid rgba(48,55,87,0.2);
  position: relative;
}
.search-item::before {
  content: ''; position: absolute; left: 0.7rem; top: 50%; transform: translateY(-50%);
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--muted-light); transition: background 0.15s ease;
}
.search-item:last-child { border-bottom: none; }
.search-item:hover { background: var(--accent-subtle); }
.search-item:hover::before { background: var(--accent); }
.search-item.muted { color: var(--muted-light); cursor: default; padding: 0.6rem 0.8rem 0.6rem 1.6rem; }
.search-item.muted::before { display: none; }
.sr-name { color: var(--accent); font-weight: 500; }
.sr-con { color: var(--ink-secondary); }
.sr-mag { color: var(--muted-light); font-size: 0.7rem; }
.sr-locate {
  background: none; border: 1px solid transparent; border-radius: 4px;
  color: var(--muted-light); cursor: pointer; padding: 3px 5px;
  display: flex; align-items: center; transition: color 0.15s, border-color 0.15s, background 0.15s;
  flex-shrink: 0; margin-left: 4px;
}
.sr-locate:hover {
  color: var(--accent); border-color: var(--accent-border);
  background: rgba(255, 217, 138, 0.08);
}
.zoom-controls {
  position: fixed; right: 1.25rem; bottom: 4.5rem; display: flex;
  flex-direction: column; gap: 4px; z-index: 10;
  background: var(--bg2); border: 1px solid var(--rule);
  border-radius: var(--radius-md); padding: 4px; box-shadow: var(--shadow-sm);
}
.zoom-btn {
  width: 34px; height: 34px; border-radius: var(--radius-sm);
  background: transparent; border: none; color: var(--ink-secondary);
  font-size: 1.15rem; cursor: pointer; display: flex;
  align-items: center; justify-content: center;
}
.zoom-btn:hover { background: var(--surface-hover); color: var(--ink); }
.zoom-divider {
  width: 22px; height: 1px;
  background: var(--rule);
  margin: 2px auto;
}
.settings-entry {
  font-size: 0.85rem;
}
.hint {
  position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
  color: var(--muted-light); font-size: 0.78rem; z-index: 5;
  pointer-events: none; opacity: 0.5;
}
.hint p { margin: 0; }
.hint p span { opacity: 0.6; }

/* ─── 定位加载 ─── */
.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-deep, #070816);
  gap: 1.2rem;
}
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 2.5px solid rgba(255, 217, 138, 0.15);
  border-top-color: var(--accent, #ffd98a);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text {
  color: var(--muted-light, #7a759c);
  font-size: 0.85rem;
  margin: 0;
}

/* ─── 城市选择浮动面板 ─── */
.location-fallback-backdrop {
  position: fixed;
  inset: 0;
  z-index: 18;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(7, 8, 22, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  pointer-events: none;
}
.location-fallback-panel {
  pointer-events: auto;
  background: rgba(16, 20, 43, 0.95);
  border: 1px solid rgba(48, 55, 87, 0.5);
  border-radius: var(--radius-lg, 12px);
  padding: 1.5rem 2rem;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}
.fallback-title {
  color: var(--ink, #f6f1ff);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}
.fallback-desc {
  color: var(--muted-light, #7a759c);
  font-size: 0.8rem;
  margin: 0;
  text-align: center;
  max-width: 320px;
}
.city-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  max-width: 360px;
}
.city-btn {
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  border: 1px solid rgba(48, 55, 87, 0.4);
  background: rgba(16, 20, 43, 0.6);
  color: var(--ink, #f6f1ff);
  font-size: 0.82rem;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.city-btn:hover {
  border-color: rgba(255, 217, 138, 0.4);
  background: rgba(40, 35, 18, 0.5);
}
.refresh-loc-btn {
  margin-top: 0.5rem;
  padding: 0.45rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 217, 138, 0.3);
  background: rgba(40, 35, 18, 0.4);
  color: #ffd98a;
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.refresh-loc-btn:hover {
  border-color: rgba(255, 217, 138, 0.5);
  background: rgba(40, 35, 18, 0.6);
}

/* ─── 叙事引导牌（大号黄色悬浮卡片） ─── */
.guide-cards {
  position: fixed;
  bottom: 3.2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.75rem;
  z-index: 15;
  pointer-events: none;
}
.guide-card {
  width: 220px;
  padding: 0.65rem 0.9rem 0.55rem;
  border-radius: var(--radius-lg, 12px);
  background: rgba(40, 35, 18, 0.55);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 217, 138, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), 0 0 24px rgba(255, 200, 80, 0.06);
  text-align: left;
}
.guide-icon {
  color: var(--accent, #ffd98a);
  margin-bottom: 0.35rem;
  opacity: 0.85;
}
.guide-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent, #ffd98a);
  margin: 0 0 0.2rem;
  letter-spacing: 0.02em;
}
.guide-desc {
  font-size: 0.7rem;
  line-height: 1.55;
  color: rgba(246, 241, 255, 0.6);
  margin: 0;
}
.guide-action-card {
  background: rgba(60, 50, 15, 0.6);
  border-color: rgba(255, 217, 138, 0.35);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), 0 0 32px rgba(255, 200, 80, 0.1);
}

/* ─── 切换反馈 Toast ─── */
.toggle-toast {
  position: fixed; top: 3.5rem; left: 50%; transform: translateX(-50%);
  z-index: 25; padding: 0.5rem 1.2rem; border-radius: 20px;
  background: rgba(255, 217, 138, 0.15); border: 1px solid rgba(255, 217, 138, 0.3);
  color: #ffd98a; font-size: 0.82rem; backdrop-filter: blur(8px);
  pointer-events: none;
}
.toast-fade-enter-active { transition: opacity 0.2s, transform 0.2s; }
.toast-fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.toast-fade-enter-from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
.toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(-4px); }

/* ─── 定位城市 Toast ─── */
.location-toast {
  position: fixed; top: 6rem; left: 50%; transform: translateX(-50%);
  z-index: 100; padding: 0.6rem 1.5rem; border-radius: 20px;
  background: rgba(20, 30, 50, 0.9); border: 1px solid rgba(100, 200, 150, 0.4);
  color: #95f0c0; font-size: 0.85rem; font-weight: 500;
  backdrop-filter: blur(12px);
  pointer-events: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

/* ─── 定位刷新按钮 ─── */
.nav-loc-btn {
  color: #8a84a0; border-color: rgba(48, 55, 87, 0.5);
  font-size: 0.75rem;
}
.nav-loc-btn:hover { color: #ffd98a; border-color: rgba(255, 217, 138, 0.3); }

@media (max-width: 640px) {
  .guide-cards { flex-direction: column; bottom: 3rem; left: auto; right: 0.75rem; transform: none; gap: 0.4rem; }
  .guide-card { width: 180px; padding: 0.5rem 0.7rem 0.45rem; }
  .guide-card svg { width: 16px; height: 16px; }
}
</style>
