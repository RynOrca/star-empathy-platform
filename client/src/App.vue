<template>
  <div class="app">
    <SkyCanvas ref="skyRef" @star-click="onStarClick" @star-hover="onStarHover" />
    <div class="zoom-controls">
      <button class="zoom-btn" @click="zoomIn">+</button>
      <button class="zoom-btn" @click="zoomOut">−</button>
    </div>
    <div class="hint">
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
        @switch="onSwitchStory"
        @resonate="onResonate"
        @refresh-stories="fetchStories"
        @increment-views="onIncrementViews"
        @increment-favorites="onIncrementFavorites"
        @decrement-favorites="onDecrementFavorites"
        @update-stats="catalogStats = $event"
        @close="onCloseDetail"
        @write-story="onWriteStory"
      />

      <StoryForm
        v-if="showForm"
        :star-name="selectedStarInfo?.displayName ?? ''"
        :catalog-star-id="selectedCatalogStarId"
        @submitted="onStorySubmitted"
        @close="showForm = false"
      />
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, watch } from 'vue'
import type { SkyAPI } from './composables/useSky'
import SkyCanvas from './components/SkyCanvas.vue'
import StarDetail from './components/StarDetail.vue'
import StoryForm from './components/StoryForm.vue'
import catalogData from './data/stars.json'
import { constellationNames, starDistances } from './data/starInfo'

// ─── 星表查询 ───
interface CatalogStar {
  id: number
  name: string | null
  con: string
  mag: number
  ra: number
  dec: number
  x: number; y: number; z: number
  color: string
}
const catalogStarLookup = new Map<number, CatalogStar>()
for (const s of catalogData.stars) {
  catalogStarLookup.set(s.id, { id: s.id, name: s.name, con: s.con, mag: s.mag, ra: s.ra, dec: s.dec, x: s.x, y: s.y, z: s.z, color: s.color })
}

// ─── 无故事时的占位 ───
const NO_STORY: StoryData = { id: -1, title: null, content: '这颗星还在等待它的故事...', resonanceCount: 0, catalog_star_id: -1, created_at: '', location_lat: null, location_lng: null, type: '', view_count: 0, origin: null }

// ─── 故事查询 ───
interface StoryData {
  id: number
  title: string | null
  content: string
  resonanceCount: number
  catalog_star_id: number
  created_at: string
  location_lat: number | null
  location_lng: number | null
  type: string
  view_count: number
  origin: string | null
}
const storiesByStarId = shallowRef(new Map<number, StoryData[]>())

async function fetchStories() {
  try {
    const res = await fetch('/api/stars')
    const json = await res.json()
    const map = new Map<number, StoryData[]>()
    for (const s of json.data ?? []) {
      const cid = s.catalog_star_id
      if (cid != null) {
        if (!map.has(cid)) map.set(cid, [])
        map.get(cid)!.push({
          id: s.id,
          title: s.title,
          content: s.content,
          resonanceCount: s.resonance_count,
          catalog_star_id: cid,
          created_at: s.created_at || '',
          location_lat: s.location_lat ?? null,
          location_lng: s.location_lng ?? null,
          type: s.type || 'user',
          view_count: s.view_count ?? 0,
          origin: s.origin ?? null,
        })
      }
    }
    storiesByStarId.value = map
  } catch (e) {
    console.error('获取故事失败:', e)
  }
}

onMounted(() => { fetchStories() })

// ─── 点击处理 ───
const skyRef = ref<{ sky: SkyAPI | null } | null>(null)

// stories 加载完成后注入统计缓存到星空
let _statsInjected = false
function tryInjectStats() {
  const map = storiesByStarId.value
  if (!map.size || !skyRef.value?.sky) return
  const cache = new Map<number, { stories: number; resonance: number; views: number; favorites: number }>()
  map.forEach((stories, starId) => {
    cache.set(starId, {
      stories: stories.length,
      resonance: stories.reduce((s, st) => s + st.resonanceCount, 0),
      views: stories.reduce((s, st) => s + st.view_count, 0),
      favorites: 0,
    })
  })
  skyRef.value.sky.setStarStatsCache(cache)
  _statsInjected = true
}
watch(storiesByStarId, () => { _statsInjected = false; tryInjectStats() }, { immediate: true })
watch(() => skyRef.value?.sky, (sky) => {
  if (sky && !_statsInjected) tryInjectStats()
}, { immediate: true })

// 当 detail 面板获取到最新统计时，同步到 tooltip 缓存
function syncStatToCache(starId: number, stats: { storyCount: number; totalResonance: number; totalViews: number; starViews: number; favoriteCount: number }) {
  if (!skyRef.value?.sky) return
  const cache = new Map<number, { stories: number; resonance: number; views: number; favorites: number }>()
  cache.set(starId, {
    stories: stats.storyCount,
    resonance: stats.totalResonance,
    views: stats.totalViews,
    favorites: stats.favoriteCount,
  })
  skyRef.value.sky.setStarStatsCache(cache)
}

// hover 时如果该星没有缓存数据，主动获取
async function fetchStarStatsForTooltip(starId: number) {
  try {
    const res = await fetch(`/api/stars/${starId}/stats`)
    const json = await res.json()
    if (json.code === 200) {
      syncStatToCache(starId, json.data)
    }
  } catch { /* 静默 */ }
}

function onStarHover(starId: number | null) {
  if (starId !== null && skyRef.value?.sky) {
    // 检查是否已有缓存，没有则主动获取
    // statsCache 在 useSky 内部，我们无法直接读取
    // 用一个 Set 记录已请求过的 id 避免重复请求
    if (!_fetchedStats.has(starId)) {
      _fetchedStats.add(starId)
      fetchStarStatsForTooltip(starId)
    }
  }
}
const _fetchedStats = new Set<number>()

// 格式化恒星显示名
function formatStarName(s: CatalogStar): string {
  if (s.name) return s.name
  if (s.ra != null && s.dec != null && isFinite(s.ra) && isFinite(s.dec)) {
    const rh = Math.floor(s.ra)
    const rm = Math.floor((s.ra - rh) * 60)
    const ds = s.dec >= 0 ? '+' : '-'
    const dd = Math.floor(Math.abs(s.dec))
    const dm = Math.floor((Math.abs(s.dec) - dd) * 60)
    return `${rh}h${rm.toString().padStart(2,'0')}m · ${ds}${dd}°${dm.toString().padStart(2,'0')}′`
  }
  return `恒星 · ${s.con || '未知'}`
}

// ─── 点击处理 ───
const selectedStories = shallowRef<StoryData[]>([])
const activeStoryIndex = ref(0)
const selectedStarInfo = ref<{ displayName: string; con: string; mag: number; conName: string; distance: number | null; ra: number; dec: number; color: string } | null>(null)
const selectedCatalogStarId = ref(0)
const resonating = ref(false)

// 星星统计数据
const catalogStats = ref<{ storyCount: number; totalResonance: number; totalViews: number; starViews: number; favoriteCount: number } | null>(null)

// 写故事表单
const showForm = ref(false)

function onStarClick(starId: number) {
  const star = catalogStarLookup.get(starId)
  if (!star) return

  const stories = storiesByStarId.value.get(starId)
  selectedStories.value = stories?.length ? stories : [NO_STORY]
  activeStoryIndex.value = 0
  selectedStarInfo.value = {
    displayName: formatStarName(star),
    con: star.con,
    mag: star.mag,
    conName: constellationNames[star.con] || star.con || '未知星座',
    distance: starDistances[star.id] ?? null,
    ra: star.ra,
    dec: star.dec,
    color: star.color || '#fff6e8',
  }
  selectedCatalogStarId.value = starId

  // 前端降级：从已有故事数据计算统计（确保统计行始终显示）
  const realStories = (stories || []).filter((s: StoryData) => s.id > 0)
  catalogStats.value = {
    storyCount: realStories.length,
    totalResonance: realStories.reduce((sum: number, s: StoryData) => sum + s.resonanceCount, 0),
    totalViews: 0,
    starViews: 0,
    favoriteCount: 0,
  }

  // 异步获取真实统计（覆盖降级值）
  fetchCatalogStats(starId)
  fetch(`/api/stars/${starId}/visit`, { method: 'POST' }).catch(() => {})

  // 乐观更新访问数
  if (catalogStats.value) {
    catalogStats.value = { ...catalogStats.value, starViews: catalogStats.value.starViews + 1 }
  }
}

async function fetchCatalogStats(starId: number) {
  try {
    const res = await fetch(`/api/stars/${starId}/stats`)
    const json = await res.json()
    if (json.code === 200) {
      catalogStats.value = {
        storyCount: json.data.storyCount ?? 0,
        totalResonance: json.data.totalResonance ?? 0,
        totalViews: json.data.totalViews ?? 0,
        starViews: json.data.starViews ?? 0,
        favoriteCount: json.data.favoriteCount ?? 0,
      }
      // 同步到 tooltip 缓存
      syncStatToCache(starId, catalogStats.value)
    }
  } catch { /* 静默 */ }
}

function onCloseDetail() {
  selectedStories.value = []
  selectedStarInfo.value = null
  catalogStats.value = null
}

function onWriteStory() {
  if (!selectedStarInfo.value) return
  showForm.value = true
}

function onStorySubmitted(story: StoryData) {
  // 添加到本地 stories 映射
  const cid = story.catalog_star_id
  const map = storiesByStarId.value
  const existing = map.get(cid) ?? []
  existing.push(story)
  map.set(cid, existing)
  storiesByStarId.value = new Map(map)

  // 如果当前正在查看这颗星，同步更新 selectedStories
  if (cid === selectedCatalogStarId.value && selectedStarInfo.value) {
    selectedStories.value = [...existing]
  }

  showForm.value = false
}

function onSwitchStory(index: number) {
  activeStoryIndex.value = index
}

function onIncrementViews() {
  if (catalogStats.value) {
    catalogStats.value = { ...catalogStats.value, totalViews: catalogStats.value.totalViews + 1 }
  }
}
function onIncrementFavorites() {
  if (catalogStats.value) {
    catalogStats.value = { ...catalogStats.value, favoriteCount: catalogStats.value.favoriteCount + 1 }
  }
}
function onDecrementFavorites() {
  if (catalogStats.value && catalogStats.value.favoriteCount > 0) {
    catalogStats.value = { ...catalogStats.value, favoriteCount: catalogStats.value.favoriteCount - 1 }
  }
}

async function onResonate(storyId: number) {
  resonating.value = true
  try {
    const res = await fetch(`/api/stars/${storyId}/resonate`, { method: 'POST' })
    const json = await res.json()
    if (json.code === 200) {
      const stories = selectedStories.value
      const idx = stories.findIndex(s => s.id === storyId)
      if (idx >= 0) {
        stories[idx].resonanceCount = json.data.resonance_count
        selectedStories.value = [...stories] // trigger reactivity
      }
      // 乐观更新统计行
      if (catalogStats.value) {
        catalogStats.value = { ...catalogStats.value, totalResonance: catalogStats.value.totalResonance + 1 }
      }
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

<style>
@import './styles/variables.css';

/* ─── Global Reset ─── */
*, *::before, *::after {
  box-sizing: border-box;
}

.app {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: var(--bg);
  font-family: var(--font);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ─── Zoom Controls ─── */
.zoom-controls {
  position: fixed;
  right: 1.25rem;
  bottom: 4.5rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
  background: var(--bg2);
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  padding: 4px;
  box-shadow: var(--shadow-sm);
}
.zoom-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  color: var(--ink-secondary);
  font-size: 1.15rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}
.zoom-btn:hover {
  background: var(--surface-hover);
  color: var(--ink);
}
.zoom-btn:active {
  transform: scale(0.92);
}

/* ─── Bottom Hint ─── */
.hint {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  color: var(--muted-light);
  font-size: 0.78rem;
  z-index: 5;
  pointer-events: none;
  opacity: 0.5;
}
.hint p {
  margin: 0;
}
.hint p span {
  opacity: 0.6;
}
</style>
