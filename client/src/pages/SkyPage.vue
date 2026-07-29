<template>
  <div class="sky-page">
    <!-- 导航栏 -->
    <nav class="sky-nav">
      <div class="nav-left">
        <!-- 节气（桌面端） -->
        <span v-if="solarTerm" class="solar-term" :title="`节气：${solarTerm.termName}（距${solarTerm.nextTermName}还有 ${solarTerm.daysToNext} 天）`">
          <span class="term-text">{{ solarTerm.termName }}</span>
          <span class="term-next">{{ solarTerm.daysToNext }}天后{{ solarTerm.nextTermName }}</span>
        </span>
        <button
          v-if="moonPhase"
          class="moon-phase"
          :title="`月相：${moonPhase.phaseName}（照明 ${Math.round(moonPhase.illumination * 100)}%）点击查看详情`"
          @click="openMoonPanel"
        >
          <span class="moon-icon" :style="{ background: moonIconStyle }"></span>
          <span class="moon-text">{{ moonPhase.phaseName }}</span>
        </button>
      </div>
      <!-- PC 端搜索框 -->
      <div v-if="!isMobile" class="nav-center">
        <div class="search-box">
          <Search :size="14" class="search-box-icon" />
          <input
            v-model="searchQuery"
            placeholder="搜索星星..."
            class="search-box-input"
            @input="onSearchInput"
            @focus="searchOpen = true"
            @blur="closeSearchDropdown"
          />
          <div v-if="searchOpen && searchResults.length" class="search-dropdown">
            <div
              v-for="r in searchResults"
              :key="r.id"
              class="search-item"
              @click="onSearchSelect(r.id)"
            >
              <div class="sr-info">
                <span class="sr-name">{{ r.name || r.conName }}</span>
                <span class="sr-con">{{ r.conName }}</span>
              </div>
              <div class="sr-meta">
                <span class="sr-mag">{{ r.mag.toFixed(1) }} mag</span>
                <button class="sr-locate" title="定位但不打开" @click.stop="locateStar(r.id); searchOpen = false">
                  <Crosshair :size="14" />
                </button>
              </div>
            </div>
          </div>
          <div v-if="searchOpen && searchQuery && !searching && searchResults.length === 0" class="search-dropdown">
            <div class="search-item search-item-empty">未找到匹配的星星</div>
          </div>
        </div>
      </div>
      <div class="nav-right">
        <!-- 搜索按钮（移动端） -->
        <button v-if="isMobile" class="nav-icon-btn" @click="showSearch = true" title="搜索星星">
          <Search :size="18" />
        </button>
        <!-- 我的/全部切换 -->
        <button v-if="username" class="nav-icon-btn" :class="{ active: showMyStoriesOnly }" @click="toggleMyStories" :title="showMyStoriesOnly ? '查看全部故事' : '只看我的故事'">
          <component :is="showMyStoriesOnly ? Globe : Star" :size="18" />
        </button>
        <!-- 定位 -->
        <button v-if="locationReady" class="nav-icon-btn" @click="refreshLocation" @mouseenter="startHoverTimer" @mouseleave="clearHoverTimer" title="更改定位">
          <MapPin :size="18" />
        </button>
        <!-- 设置 -->
        <button v-if="locationReady" class="nav-icon-btn" @click="showSettings = true" title="设置">
          <Settings :size="18" />
        </button>
        <!-- 用户 -->
        <button v-if="username" class="nav-icon-btn nav-user-btn" @click.stop.prevent="$router.push('/profile')" title="个人中心">
          <User :size="18" />
        </button>
        <button v-if="!username" class="nav-icon-btn nav-login-btn" @click="goLogin" title="登录">
          <User :size="18" />
        </button>
      </div>
    </nav>

    <!-- 搜索底部弹窗 -->
    <Transition name="sheet-fade">
      <div v-if="showSearch" class="search-sheet-overlay" @click.self="showSearch = false">
        <div class="search-sheet">
          <div class="sheet-handle" @click="showSearch = false"></div>
          <div class="search-sheet-header">
            <h3 class="search-sheet-title">搜索星星</h3>
            <button class="search-sheet-close" @click="showSearch = false"><X :size="18" /></button>
          </div>
          <div class="search-sheet-input-wrap">
            <Search :size="18" class="search-sheet-icon" />
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              placeholder="输入星名、星座..."
              class="search-sheet-input"
              @input="onSearchInput"
              @keydown.escape="showSearch = false"
            />
            <button v-if="searchQuery" class="search-sheet-clear" @click="clearSearch"><X :size="16" /></button>
          </div>
          <div v-if="searching" class="search-loading">搜索中...</div>
          <div v-else-if="searchQuery && searchResults.length === 0" class="search-empty">未找到匹配的星星</div>
          <div v-else-if="searchResults.length > 0" class="search-results">
            <div
              v-for="r in searchResults"
              :key="r.id"
              class="search-result-item"
              @click="onSearchSelect(r.id)"
            >
              <div class="sr-info">
                <span class="sr-name">{{ r.name || r.conName }}</span>
                <span class="sr-con">{{ r.conName }}</span>
              </div>
              <div class="sr-meta">
                <span class="sr-mag">{{ r.mag.toFixed(1) }} mag</span>
                <button class="sr-locate" title="定位但不打开" @click.stop="locateStar(r.id); showSearch = false">
                  <Crosshair :size="16" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 切换反馈提示 -->
    <Transition name="toast-fade">
      <div v-if="myToggleFeedback" class="toggle-toast">{{ myToggleFeedback }}</div>
    </Transition>

    <!-- 定位城市提示 -->
    <Transition name="toast-fade">
      <div v-if="locationCityToast" class="location-toast"><MapPin :size="13" /> {{ locationCityToast }}</div>
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
          <button v-for="c in allCities" :key="c.name" class="city-btn" @click="selectCity(c)">
            {{ c.name }}
          </button>
        </div>
        <button class="refresh-loc-btn" @click="refreshLocation"><RefreshCw :size="14" /> 重新获取定位</button>
      </div>
    </div>

    <!-- 城市选择浮动面板（悬停 2s 或未获取到城市名时弹出） -->
    <Transition name="panel-fade">
      <div v-if="showCityPanel" class="city-panel-backdrop" @click="showCityPanel = false">
        <div class="city-panel" @click.stop>
          <!-- 面板头部 -->
          <div class="city-panel-header">
            <div class="city-panel-title-row">
              <span class="city-panel-dot"></span>
              <h3 class="city-panel-title">选择观测城市</h3>
            </div>
            <button class="city-panel-close" @click="showCityPanel = false" title="关闭">
              <X :size="16" />
            </button>
          </div>

          <!-- 中国城市 -->
          <div class="city-group">
            <h4 class="city-group-title">
              <span class="city-group-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </span>
              中国
            </h4>
            <div class="city-grid">
              <button
                v-for="c in cities"
                :key="c.name"
                class="city-btn"
                :class="{ active: selectedCity?.name === c.name }"
                @click="handleCitySelect(c)"
              >
                {{ c.name }}
              </button>
            </div>
          </div>

          <!-- 分隔线 -->
          <div class="city-group-divider"></div>

          <!-- 国际城市 -->
          <div class="city-group">
            <h4 class="city-group-title">
              <span class="city-group-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="22"/><path d="M2 12h20"/></svg>
              </span>
              国际
            </h4>
            <div class="city-grid">
              <button
                v-for="c in intlCities"
                :key="c.name"
                class="city-btn"
                :class="{ active: selectedCity?.name === c.name }"
                @click="handleCitySelect(c)"
              >
                {{ c.name }}
              </button>
            </div>
          </div>

          <!-- 底部操作 -->
          <div class="city-panel-footer">
            <button class="city-panel-locate-btn" @click="goToCurrentLocation">
              <Crosshair :size="14" />
              <span>回到当前定位</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

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
        :observer-lat="userLat"
        :observer-lng="userLng"
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

      <MoonPanel
        :visible="showMoonPanel"
        :data="moonPanelData"
        :loading="moonPanelLoading"
        :error="moonPanelError"
        :insight="moonInsight"
        :insight-loading="moonInsightLoading"
        @close="showMoonPanel = false"
        @regen-insight="regenMoonInsight"
        @rotate-poem="rotateMoonPoem"
      />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Settings, Crosshair, Globe, Star, MapPin, User, RefreshCw, X, Search } from 'lucide-vue-next'
import { useAuth } from '../stores/auth'
import type { SkyAPI } from '../composables/useSky'
import SkyCanvas from '../components/SkyCanvas.vue'
import StarDetail from '../components/StarDetail/index.vue'
import StoryForm from '../components/StoryForm.vue'
import SettingsModal from '../components/SettingsModal.vue'
import MoonPanel from '../components/MoonPanel.vue'
import { useMoon } from '../composables/useMoon'
import { useLocation } from '../composables/useLocation'
import catalogData from '../data/stars.json'
import { constellationNames, starDistances } from '../data/starInfo'
import { getMoonPhase, getSolarTerm, getBodyPosition } from '../data/planets'
import { useMediaQuery } from '../composables/useMediaQuery'

const { isMobile } = useMediaQuery()

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

// ─── 统一位置管理（快速缓存+低精度优先+后台高精度更新） ───
const location = useLocation()
const userLat = ref<number | undefined>(undefined)
const userLng = ref<number | undefined>(undefined)
const locationReady = ref(false)
const locationFailed = ref(false)

// 双向同步：useLocation → 本地ref
watch([() => location.lat.value, () => location.lng.value, () => location.ready.value, () => location.failed.value],
  ([la, ln, rd, fl]) => {
    const wasReady = locationReady.value
    userLat.value = la ?? undefined
    userLng.value = ln ?? undefined
    locationReady.value = rd
    locationFailed.value = fl
    // 定位成功后显示简短提示（不调用反向地理编码，省去额外网络请求）
    if (rd && !wasReady && la != null && ln != null) {
      locationCityToast.value = '定位成功'
      setTimeout(() => { locationCityToast.value = '' }, 2000)
    }
  }, { immediate: true }
)

// 反向地理编码已禁用：获取城市名需要额外网络请求，对核心功能无影响
// 如需恢复，取消下面注释即可
// let lastCityFetchKey = ''
// watch([() => location.lat.value, () => location.lng.value], async ([la, ln]) => {
//   if (la == null || ln == null) return
//   const key = `${la.toFixed(2)},${ln.toFixed(2)}`
//   if (key === lastCityFetchKey) return
//   lastCityFetchKey = key
//   const city = await fetchCityName(la, ln)
//   if (!locationCityToast.value) showLocationToast(city)
// }, { immediate: true })

// ─── 城市选择面板 ───
const showCityPanel = ref(false)
const selectedCity = ref<{ name: string; lat: number; lng: number } | null>(null)
const hoverTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// ─── 阶段 3 P0-1：月相显示（14-C §1 地月系） ───
const moonPhase = ref<{ phaseFraction: number; phaseName: string; illumination: number } | null>(null)
// CSS 绘制月相图标：用 radial-gradient 模拟月相阴影
// 上半月（phase<0.5）：右边亮；下半月（phase>0.5）：左边亮
const moonIconStyle = computed(() => {
  if (!moonPhase.value) return ''
  const f = moonPhase.value.phaseFraction
  if (f < 0.5) {
    const lit = f * 2 * 100
    return `linear-gradient(90deg, #1a1a2e ${100 - lit}%, #f0e6c8 ${100 - lit}%)`
  } else {
    const lit = (1 - f) * 2 * 100
    return `linear-gradient(90deg, #f0e6c8 ${100 - lit}%, #1a1a2e ${100 - lit}%)`
  }
})

// ─── 月相居中预览窗（MoonPanel） ───
const showMoonPanel = ref(false)
const {
  data: moonPanelData,
  loading: moonPanelLoading,
  error: moonPanelError,
  insight: moonInsight,
  insightLoading: moonInsightLoading,
  refresh: refreshMoon,
  loadInsight: loadMoonInsight,
  regenInsight: regenMoonInsight,
  rotatePoem: rotateMoonPoem,
} = useMoon({
  observerLat: () => userLat.value ?? null,
  observerLon: () => userLng.value ?? null,
})

/** 打开月相预览窗 */
function openMoonPanel() {
  if (!locationReady.value) return
  refreshMoon()
  showMoonPanel.value = true
  // 异步加载 AI 解读（不阻塞）
  loadMoonInsight()
}

// 月相面板与 StarDetail 互斥
watch(showMoonPanel, (v) => {
  if (v && selectedStarInfo.value) {
    onCloseDetail()
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
  { name: '昆明', lat: 25.0, lng: 102.7 },
  { name: '拉萨', lat: 29.7, lng: 91.1 },
  { name: '乌鲁木齐', lat: 43.8, lng: 87.6 },
  { name: '香港', lat: 22.3, lng: 114.2 },
  { name: '台北', lat: 25.0, lng: 121.5 },
]

const intlCities = [
  { name: '东京', lat: 35.68, lng: 139.76 },
  { name: '首尔', lat: 37.57, lng: 126.98 },
  { name: '新加坡', lat: 1.35, lng: 103.82 },
  { name: '曼谷', lat: 13.75, lng: 100.50 },
  { name: '迪拜', lat: 25.20, lng: 55.27 },
  { name: '莫斯科', lat: 55.75, lng: 37.62 },
  { name: '伦敦', lat: 51.51, lng: -0.13 },
  { name: '巴黎', lat: 48.86, lng: 2.35 },
  { name: '纽约', lat: 40.71, lng: -74.01 },
  { name: '洛杉矶', lat: 34.05, lng: -118.24 },
  { name: '悉尼', lat: -33.87, lng: 151.21 },
  { name: '开罗', lat: 30.04, lng: 31.24 },
]

const allCities = [...cities, ...intlCities]

function selectCity(c: { name: string; lat: number; lng: number }) {
  location.setManual(c.lat, c.lng)
  selectedCity.value = c
  showLocationToast(c.name)
}

// ─── 城市选择面板：悬停触发 & 选择逻辑 ───
function startHoverTimer() {
  clearHoverTimer()
  hoverTimer.value = setTimeout(() => {
    showCityPanel.value = true
  }, 2000)
}

function clearHoverTimer() {
  if (hoverTimer.value) {
    clearTimeout(hoverTimer.value)
    hoverTimer.value = null
  }
}

function handleCitySelect(c: { name: string; lat: number; lng: number }) {
  selectCity(c)
  showCityPanel.value = false
}

function goToCurrentLocation() {
  selectedCity.value = null
  showCityPanel.value = false
  locationCityToast.value = '正在获取定位...'
  location.refresh().then(() => {
    if (location.failed.value) {
      locationCityToast.value = ''
    }
  })
}

// 模板中使用的 refreshLocation（重新获取定位按钮）
function refreshLocation() {
  locationCityToast.value = '正在获取定位...'
  location.refresh().then(() => {
    if (location.failed.value) {
      locationCityToast.value = ''
    }
  })
}

// 反向地理编码：通过后端代理获取城市名称（BigDataCloud 主 + Nominatim 备，5s 超时）
async function fetchCityName(lat: number, lng: number): Promise<string> {
  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(`/api/location/reverse?lat=${lat}&lng=${lng}`, { signal: ctrl.signal })
    clearTimeout(timeout)
    const json = await res.json()
    const city = json?.data?.city || ''
    console.log('[SkyPage] fetchCityName result:', city, 'from', { lat, lng })
    return city
  } catch (e) {
    console.error('[SkyPage] fetchCityName failed:', e)
    return ''
  }
}

function showLocationToast(city: string) {
  const text = city ? `当前定位：${city}` : '定位成功（未获取到城市名）'
  console.log('[SkyPage] showLocationToast:', text)
  locationCityToast.value = text
  setTimeout(() => { locationCityToast.value = '' }, 3000)
  // 未获取到城市名时，自动弹出城市选择面板
  if (!city) {
    setTimeout(() => { showCityPanel.value = true }, 800)
  }
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
const showSearch = ref(false)
const searchOpen = ref(false)
const searchQuery = ref('')
const searching = ref(false)
const searchResults = ref<any[]>([])
const searchInputRef = ref<HTMLInputElement | null>(null)

// 打开搜索弹窗时自动聚焦
watch(showSearch, async (val) => {
  if (val) {
    await nextTick()
    searchInputRef.value?.focus()
  } else {
    // 关闭时清空
    searchQuery.value = ''
    searchResults.value = []
  }
})

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  searchInputRef.value?.focus()
}

function onSearchSelect(starId: number) {
  showSearch.value = false
  searchOpen.value = false
  searchQuery.value = ''
  flyToStar(starId)
}

function closeSearchDropdown() {
  setTimeout(() => { searchOpen.value = false }, 150)
}

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
  imageUrl: string | null
}
const NO_STORY: StoryData = { id: -1, title: null, content: '这颗星还在等待它的故事...', resonanceCount: 0, catalogStarId: -1, createdAt: '', locationLat: null, locationLng: null, type: '', viewCount: 0, origin: null, username: null, tag: null, userId: null, imageUrl: null }
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
      imageUrl: s.imageUrl ?? null,
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
  // 如果详情面板打开：仅当该星完全没有故事时关闭面板
  // 注意：showMyStoriesOnly 只影响 3D 天空，不影响详情面板数据
  if (selectedStarInfo.value && selectedCatalogStarId.value) {
    const allStories = storiesByStarId.value.get(selectedCatalogStarId.value)
    if (!allStories || allStories.length === 0) {
      selectedStories.value = []
      selectedStarInfo.value = null
      catalogStats.value = null
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
  clearHoverTimer()
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
  // 始终传递完整 stories 给 StarDetail，Tab 内部自行筛选
  // showMyStoriesOnly 只影响 3D 天空渲染，不影响详情面板
  const stories = storiesByStarId.value.get(starId)
  selectedStories.value = stories?.length ? stories : [NO_STORY]; activeStoryIndex.value = 0
  selectedStarInfo.value = { displayName: formatStarName(star), con: star.con, mag: star.mag, conName: constellationNames[star.con] || star.con || '未知星座', distance: starDistances[star.id] ?? null, ra: star.ra, dec: star.dec, color: star.color || '#fff6e8' }
  selectedCatalogStarId.value = starId
  const realStories = (stories || []).filter((s: StoryData) => s.id > 0)
  catalogStats.value = { storyCount: realStories.length, totalResonance: realStories.reduce((sum: number, s: StoryData) => sum + s.resonanceCount, 0), totalViews: 0, starViews: 0, favoriteCount: 0 }
  fetchCatalogStats(starId)
  fetch(`/api/catalog/stars/${starId}/visit`, { method: 'POST' }).catch(() => {})
}

// 行星数据映射（用于故事详情展示）
// planetId 由 useSky.ts 直接从 mesh.userData 传出，无需前端硬编码映射表
const PLANET_INFO: Record<string, { color: string; conName: string }> = {
  'Sun':     { color: '#ffdd88', conName: '太阳' },
  'Moon':    { color: '#cccccc', conName: '月球' },
  'Mercury': { color: '#999999', conName: '水星' },
  'Venus':   { color: '#e8cda0', conName: '金星' },
  'Mars':    { color: '#dd6644', conName: '火星' },
  'Jupiter': { color: '#ddaa77', conName: '木星' },
  'Saturn':  { color: '#ddcc99', conName: '土星' },
  'Uranus':  { color: '#88ccdd', conName: '天王星' },
  'Neptune': { color: '#3366cc', conName: '海王星' },
  // 伽利略卫星（木卫 1-4）
  'Io':       { color: '#fff5d8', conName: '木卫一' },
  'Europa':   { color: '#e8e0d0', conName: '木卫二' },
  'Ganymede': { color: '#d8c8a8', conName: '木卫三' },
  'Callisto': { color: '#a89888', conName: '木卫四' },
  // [DISABLED 2026-07-28] 彗星系统已禁用，保留映射以备未来恢复
  // 'Halley':   { color: '#a8d8ff', conName: '哈雷彗星' },
  // 'Encke':    { color: '#c8e8ff', conName: '恩克彗星' },
  // '67P':      { color: '#b8d8b8', conName: '丘留莫夫-格拉西缅科彗星' },
  // 'HaleBopp': { color: '#d8e8f8', conName: '海尔-波普彗星' },
}

async function onPlanetClick(name: string, nameCN: string, planetId: number) {
  const info = PLANET_INFO[name]
  const stories = storiesByStarId.value.get(planetId)
  selectedStories.value = stories?.length ? stories : [NO_STORY]
  activeStoryIndex.value = 0

  // 计算行星当前 RA/Dec（用于后端判断地平线可见性）
  let ra = 0, dec = 0
  if (userLat.value !== undefined && userLng.value !== undefined) {
    const pos = await getBodyPosition(name, userLat.value, userLng.value)
    if (pos) { ra = pos.ra; dec = pos.dec }
  }

  selectedStarInfo.value = {
    displayName: nameCN,
    con: '',
    mag: 0,
    conName: nameCN,
    distance: null,
    ra,
    dec,
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
  padding: 0.6rem 1rem;
  background: transparent;
  border-bottom: none;
}
.nav-logo { color: #ffd98a; font-weight: 600; font-size: 0.95rem; }
.nav-left { display: flex; align-items: center; gap: 0.5rem; }
.nav-right { display: flex; align-items: center; gap: 0.4rem; }

/* ─── PC 端搜索框 ─── */
.nav-center {
  flex: 1;
  display: flex;
  justify-content: center;
}
.search-box {
  position: relative;
  width: 260px;
}
.search-box-icon {
  position: absolute;
  left: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted-light);
  pointer-events: none;
  z-index: 1;
}
.search-box-input {
  width: 100%;
  padding: 0.45rem 0.9rem 0.45rem 2rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--rule);
  background: rgba(255,255,255,0.05);
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.8rem;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}
.moon-phase {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.3rem 0.7rem; border-radius: 14px;
  border: 1px solid rgba(240, 230, 200, 0.18);
  background: rgba(16, 20, 43, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}
.moon-phase:hover {
  border-color: rgba(240, 230, 200, 0.35);
  background: rgba(24, 30, 60, 0.7);
}
.moon-phase:active { transform: scale(0.97); }
.moon-icon {
  width: 14px; height: 14px; border-radius: 50%;
  box-shadow: 0 0 6px rgba(240, 230, 200, 0.3);
  display: inline-block;
}
.moon-text {
  font-size: 0.78rem; color: #c8c2d8;
  letter-spacing: 0.04em;
}
.search-box-input:focus {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow);
  background: rgba(255,255,255,0.08);
}
.search-box-input::placeholder {
  color: var(--muted-light);
}
.search-dropdown {
  position: absolute;
  top: 110%;
  left: 0;
  right: 0;
  background: rgba(16,20,43,0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(48,55,87,0.5);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-height: 240px;
  overflow-y: auto;
  z-index: 30;
}
.search-dropdown::-webkit-scrollbar { width: 4px; }
.search-dropdown::-webkit-scrollbar-track { background: transparent; }
.search-dropdown::-webkit-scrollbar-thumb {
  background: rgba(255,217,138,0.2);
  border-radius: 4px;
}
.search-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;
}
.search-item:hover {
  background: rgba(255,217,138,0.08);
}
.search-item .sr-name { color: var(--accent); font-weight: 600; font-size: 0.85rem; }
.search-item .sr-con { color: var(--muted); font-size: 0.75rem; margin-left: 8px; }
.search-item .sr-mag { color: var(--muted-light); font-size: 0.72rem; }
.search-item .sr-locate {
  background: none;
  border: 1px solid var(--rule);
  border-radius: 6px;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: all 0.15s;
}
.search-item .sr-locate:hover {
  color: var(--accent);
  border-color: rgba(255,217,138,0.3);
}
.search-item-empty {
  color: var(--muted-light);
  font-size: 0.8rem;
  cursor: default;
  padding: 12px 14px;
}

/* ─── Icon-only nav buttons (modern glassmorphism) ─── */
.nav-icon-btn {
  width: 42px; height: 42px; border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.06);
  color: #b8b2cc; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.nav-icon-btn:hover {
  color: #ffd98a;
  border-color: rgba(255,217,138,0.3);
  background: rgba(255,217,138,0.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,217,138,0.1);
}
.nav-icon-btn:active {
  transform: scale(0.94) translateY(0);
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}
.nav-icon-btn.active {
  color: #ffd98a;
  border-color: rgba(255,217,138,0.35);
  background: rgba(255,217,138,0.12);
  box-shadow: 0 2px 10px rgba(255,217,138,0.1);
}
.nav-icon-btn.nav-login-btn {
  color: #ffd98a;
  border-color: rgba(255,217,138,0.25);
  background: linear-gradient(135deg, rgba(255,217,138,0.15), rgba(255,180,100,0.08));
  box-shadow: 0 2px 10px rgba(255,217,138,0.08);
}
.nav-icon-btn.nav-login-btn:hover {
  background: linear-gradient(135deg, rgba(255,217,138,0.25), rgba(255,180,100,0.15));
  box-shadow: 0 4px 15px rgba(255,217,138,0.15);
}

.solar-term {
  display: inline-flex; align-items: baseline; gap: 0.4rem;
  padding: 0.4rem 0.85rem; border-radius: 100px;
  border: 1px solid rgba(255, 217, 138, 0.15);
  background: rgba(40, 35, 18, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: default;
  transition: border-color 0.2s, background 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.solar-term:hover { border-color: rgba(255, 217, 138, 0.3); background: rgba(40, 35, 18, 0.6); }
.term-text {
  font-size: 0.82rem; color: #ffd98a;
  font-weight: 600; letter-spacing: 0.04em;
}
.term-next {
  font-size: 0.68rem; color: #9994ad;
  letter-spacing: 0.02em;
}
.moon-phase {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.4rem 0.85rem; border-radius: 100px;
  border: 1px solid rgba(240, 230, 200, 0.15);
  background: rgba(16, 20, 43, 0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: default;
  transition: border-color 0.2s, background 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.moon-phase:hover { border-color: rgba(240, 230, 200, 0.3); background: rgba(16, 20, 43, 0.65); }
.moon-icon {
  width: 14px; height: 14px; border-radius: 50%;
  box-shadow: 0 0 8px rgba(240, 230, 200, 0.35);
  display: inline-block;
}
.moon-text {
  font-size: 0.78rem; color: #c8c2d8;
  letter-spacing: 0.04em; font-weight: 500;
}

/* ─── Search bottom sheet (modern) ─── */
.search-sheet-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(7,8,22,0.4);
  display: flex; align-items: flex-end; justify-content: center;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  animation: fadeIn 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.search-sheet {
  width: 100%; max-height: 85vh;
  background: linear-gradient(180deg, rgba(26,30,53,0.98) 0%, rgba(18,20,40,0.995) 100%);
  border-radius: 24px 24px 0 0;
  border-top: 0.5px solid rgba(255,255,255,0.1);
  display: flex; flex-direction: column;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom, 0);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  box-shadow: 0 -10px 40px rgba(0,0,0,0.5), 0 -1px 0 rgba(255,255,255,0.05) inset;
}
.sheet-handle {
  width: 38px; height: 4px; border-radius: 4px;
  background: rgba(255,255,255,0.15);
  margin: 10px auto 6px;
  cursor: pointer; flex-shrink: 0;
  transition: background 0.2s, width 0.2s;
}
.sheet-handle:hover, .sheet-handle:active { background: rgba(255,217,138,0.5); width: 44px; }
.search-sheet-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 20px 14px;
}
.search-sheet-title {
  font-size: 1.1rem; font-weight: 600; color: var(--ink, #f0ecf6);
  margin: 0; letter-spacing: 0.2px;
}
.search-sheet-close {
  width: 36px; height: 36px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.06);
  color: var(--muted, #9994ad); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
  -webkit-tap-highlight-color: transparent;
}
.search-sheet-close:hover { color: var(--ink); background: rgba(255,255,255,0.1); }
.search-sheet-close:active { transform: scale(0.92); }
.search-sheet-input-wrap {
  position: relative; margin: 0 20px 16px; flex-shrink: 0;
}
.search-sheet-icon {
  position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
  color: var(--muted, #9994ad);
}
.search-sheet-input {
  width: 100%; padding: 14px 48px 14px 46px;
  border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.06);
  color: var(--ink); font-size: 16px; outline: none;
  transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
  font-weight: 500;
}
.search-sheet-input:focus {
  border-color: rgba(255,217,138,0.4);
  background: rgba(255,255,255,0.09);
  box-shadow: 0 0 0 3px rgba(255,217,138,0.1);
}
.search-sheet-input::placeholder { color: var(--muted, #9994ad); font-weight: 400; }
.search-sheet-clear {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  width: 30px; height: 30px; border-radius: 50%;
  border: none; background: rgba(255,255,255,0.08);
  color: var(--muted, #9994ad); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.search-sheet-clear:hover { color: var(--ink); background: rgba(255,255,255,0.15); }
.search-sheet-clear:active { transform: scale(0.9); }
.search-loading, .search-empty {
  padding: 40px 20px; text-align: center;
  color: var(--muted, #9994ad); font-size: 0.88rem;
}
.search-results {
  flex: 1; overflow-y: auto; padding: 0 12px 16px;
  -webkit-overflow-scrolling: touch;
}
.search-results::-webkit-scrollbar { width: 4px; }
.search-results::-webkit-scrollbar-track { background: transparent; }
.search-results::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
.search-result-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-radius: 14px;
  cursor: pointer; transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
  border-bottom: none;
  margin-bottom: 4px;
  -webkit-tap-highlight-color: transparent;
}
.search-result-item:last-child { margin-bottom: 0; }
.search-result-item:hover { background: rgba(255,255,255,0.06); }
.search-result-item:active { background: rgba(255,217,138,0.08); transform: scale(0.985); }
.sr-info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.sr-info .sr-name { color: var(--accent, #ffd98a); font-weight: 600; font-size: 0.95rem; }
.sr-info .sr-con { color: var(--muted, #9994ad); font-size: 0.8rem; }
.sr-meta { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.sr-meta .sr-mag { color: var(--muted, #9994ad); font-size: 0.75rem; font-weight: 500; }
.sr-locate {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
  color: var(--muted, #9994ad); cursor: pointer; padding: 8px;
  display: flex; align-items: center; transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
}
.sr-locate:hover {
  color: var(--accent, #ffd98a); border-color: rgba(255,217,138,0.3);
  background: rgba(255,217,138,0.1);
}
.sr-locate:active { transform: scale(0.92); }

/* Sheet transition (modern easing) */
.sheet-fade-enter-active { transition: opacity 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
.sheet-fade-leave-active { transition: opacity 0.2s cubic-bezier(0.32, 0.72, 0, 1); }
.sheet-fade-enter-from, .sheet-fade-leave-to { opacity: 0; }
.sheet-fade-enter-active .search-sheet { animation: slideUpSheet 0.4s cubic-bezier(0.32, 0.72, 0, 1); }
.sheet-fade-leave-active .search-sheet { animation: slideDownSheet 0.25s cubic-bezier(0.32, 0.72, 0, 1); }
@keyframes slideUpSheet {
  from { transform: translateY(100%); opacity: 0.8; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes slideDownSheet {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(100%); opacity: 0.7; }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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
  display: inline-flex; align-items: center; gap: 5px;
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
  display: flex; align-items: center; gap: 5px;
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

/* ─── 城市选择浮动面板 ─── */
.city-panel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(7, 8, 22, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.city-panel {
  width: 420px;
  max-height: 72vh;
  overflow-y: auto;
  background: linear-gradient(160deg, rgba(18, 22, 48, 0.97) 0%, rgba(12, 15, 35, 0.98) 100%);
  border: 1px solid rgba(255, 217, 138, 0.15);
  border-radius: 16px;
  box-shadow:
    0 0 60px rgba(255, 200, 80, 0.06),
    0 20px 60px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.city-panel::-webkit-scrollbar { width: 4px; }
.city-panel::-webkit-scrollbar-track { background: transparent; }
.city-panel::-webkit-scrollbar-thumb { background: rgba(255, 217, 138, 0.15); border-radius: 4px; }
.city-panel::-webkit-scrollbar-thumb:hover { background: rgba(255, 217, 138, 0.3); }

/* 面板头部 */
.city-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 217, 138, 0.08);
}
.city-panel-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.city-panel-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ffd98a;
  box-shadow: 0 0 10px rgba(255, 217, 138, 0.5);
  animation: dot-pulse 2s ease-in-out infinite;
}
@keyframes dot-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}
.city-panel-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #f0e6c8;
  letter-spacing: 0.03em;
}
.city-panel-close {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(48, 55, 87, 0.4);
  background: rgba(255, 255, 255, 0.03);
  color: #7a759c;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.city-panel-close:hover {
  color: #f6f1ff;
  border-color: rgba(255, 217, 138, 0.3);
  background: rgba(255, 255, 255, 0.06);
}

/* 城市分组 */
.city-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.city-group-title {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 500;
  color: #8a84a0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.city-group-icon {
  color: #ffd98a;
  opacity: 0.6;
  display: flex;
  align-items: center;
}
.city-group-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 217, 138, 0.1), transparent);
}

/* 城市按钮网格 */
.city-panel .city-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.city-panel .city-btn {
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(48, 55, 87, 0.4);
  background: rgba(16, 20, 43, 0.5);
  color: #b9b4d6;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.city-panel .city-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255, 217, 138, 0.08) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.25s;
}
.city-panel .city-btn:hover {
  color: #ffd98a;
  border-color: rgba(255, 217, 138, 0.4);
  background: rgba(40, 35, 18, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.city-panel .city-btn:hover::before {
  opacity: 1;
}
.city-panel .city-btn.active {
  color: #1a1a2e;
  background: linear-gradient(135deg, #ffd98a 0%, #e8c56d 100%);
  border-color: transparent;
  font-weight: 600;
  box-shadow: 0 0 16px rgba(255, 217, 138, 0.25);
}
.city-panel .city-btn.active::before {
  display: none;
}

/* 底部操作 */
.city-panel-footer {
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 217, 138, 0.08);
  display: flex;
  justify-content: center;
}
.city-panel-locate-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1.4rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 217, 138, 0.25);
  background: rgba(40, 35, 18, 0.4);
  color: #ffd98a;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s;
  letter-spacing: 0.02em;
}
.city-panel-locate-btn:hover {
  background: rgba(40, 35, 18, 0.65);
  border-color: rgba(255, 217, 138, 0.5);
  box-shadow: 0 0 20px rgba(255, 217, 138, 0.12);
  transform: translateY(-1px);
}

/* 面板过渡动画 */
.panel-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-fade-leave-active {
  transition: all 0.2s ease-in;
}
.panel-fade-enter-from {
  opacity: 0;
}
.panel-fade-enter-from .city-panel {
  transform: scale(0.92) translateY(12px);
  opacity: 0;
}
.panel-fade-leave-to {
  opacity: 0;
}
.panel-fade-leave-to .city-panel {
  transform: scale(0.95);
  opacity: 0;
}

/* ─── Mobile Responsive (<=768px) ─── */
@media (max-width: 768px) {
  /* Navigation bar */
  .sky-nav {
    padding: 0.6rem 0.85rem;
    padding-top: max(0.6rem, env(safe-area-inset-top, 0.6rem));
  }

  .nav-left {
    display: none;
  }

  .nav-right {
    gap: 0.45rem;
    margin-left: auto;
  }

  .nav-icon-btn {
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }

  /* Search sheet */
  .search-sheet {
    max-height: 90vh;
    border-radius: 24px 24px 0 0;
  }

  .search-sheet-header {
    padding: 6px 20px 12px;
  }

  .search-sheet-input-wrap {
    margin: 0 20px 14px;
  }

  .search-sheet-input {
    padding: 13px 46px 13px 44px;
    font-size: 16px;
  }

  /* Guide cards */
  .guide-cards {
    display: none;
  }

  /* Zoom controls */
  .zoom-controls {
    right: 0.85rem;
    bottom: 6rem;
  }

  .zoom-btn {
    width: 38px;
    height: 38px;
    font-size: 1.2rem;
  }

  /* Hint text */
  .hint {
    display: none;
  }

  /* Toasts */
  .toggle-toast {
    top: auto;
    bottom: 1rem;
    font-size: 0.78rem;
    padding: 0.5rem 1rem;
  }

  .location-toast {
    top: auto;
    bottom: 4rem;
    font-size: 0.8rem;
    padding: 0.55rem 1.2rem;
  }

  /* City selection panel - bottom sheet */
  .city-panel-backdrop {
    align-items: flex-end;
    padding: 0;
  }

  .city-panel {
    width: 100%;
    max-width: 100%;
    max-height: 75vh;
    border-radius: 20px 20px 0 0;
    padding: 1.2rem 1rem 1.5rem;
    animation: slideUpCityPanel 0.28s ease-out;
    box-sizing: border-box;
  }

  @keyframes slideUpCityPanel {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  .panel-fade-enter-from .city-panel {
    transform: translateY(100%);
    opacity: 1;
  }

  .panel-fade-leave-to .city-panel {
    transform: translateY(100%);
    opacity: 1;
  }

  .panel-fade-enter-from {
    opacity: 1;
  }

  .panel-fade-leave-to {
    opacity: 1;
  }

  /* Location fallback panel */
  .location-fallback-backdrop {
    align-items: flex-end;
    justify-content: center;
    padding: 0;
  }

  .location-fallback-panel {
    width: 100%;
    max-width: 100%;
    padding: 1.2rem 1.2rem 1.5rem;
    padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 1.5rem));
    margin-bottom: 0;
    border-radius: 20px 20px 0 0;
    border: none;
    border-top: 1px solid rgba(255, 217, 138, 0.15);
    animation: slideUpCityPanel 0.28s ease-out;
    box-sizing: border-box;
  }

  .fallback-title {
    font-size: 0.95rem;
  }

  .fallback-desc {
    font-size: 0.78rem;
    text-align: center;
  }

  .city-grid {
    max-width: 100%;
    justify-content: flex-start;
  }

  .refresh-loc-btn {
    width: 100%;
    justify-content: center;
    padding: 0.55rem 1rem;
    font-size: 0.78rem;
  }
}

/* ─── Very small screens (<=380px) ─── */
@media (max-width: 380px) {
  .sky-nav {
    padding: 0.4rem 0.5rem;
  }

  .nav-left {
    display: none;
  }

  .nav-right {
    gap: 0.3rem;
  }

  .nav-icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }

  .zoom-controls {
    right: 0.5rem;
    bottom: 5rem;
  }
}
</style>
