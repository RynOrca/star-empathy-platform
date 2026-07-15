<template>
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
            </div>
          </div>
          <div v-if="searchOpen && searchQuery && !searching && searchResults.length === 0" class="search-dropdown">
            <div class="search-item muted">未找到匹配的星星</div>
          </div>
        </div>
      </div>
      <div class="nav-right">
        <span v-if="username" class="nav-user" @click.stop.prevent="$router.push('/profile')">
          👤 {{ username }}
        </span>
        <button v-if="username" class="nav-btn" @click="doLogout">退出</button>
      </div>
    </nav>

    <SkyCanvas v-if="locationReady" ref="skyRef" :observer-lat="userLat" :observer-lng="userLng" @star-click="onStarClick; guidesVisible=false" @planet-click="onPlanetClick; guidesVisible=false" />

    <!-- 三张叙事引导牌 -->
    <Transition name="guides">
      <div v-if="locationReady && guidesVisible" class="guide-cards">
        <div class="guide-card" @click="guidesVisible=false">
          <div class="guide-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <p class="guide-title">历史里的星</p>
          <p class="guide-desc">织女、牛郎、传说留在夜空。点击一颗星，听听它从前的故事。</p>
        </div>
        <div class="guide-card" @click="guidesVisible=false">
          <div class="guide-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </div>
          <p class="guide-title">路过别人的星光</p>
          <p class="guide-desc">发现相似的等待、离别和愿望。每一次共鸣，都是两颗心的相遇。</p>
        </div>
        <div class="guide-card" @click="guidesVisible=false">
          <div class="guide-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
          </div>
          <p class="guide-title">挂上我的故事</p>
          <p class="guide-desc">把今天的心事放到某颗星旁，成为一束新光。</p>
        </div>
      </div>
    </Transition>

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
import { useRouter } from 'vue-router'
import type { SkyAPI } from '../composables/useSky'
import SkyCanvas from '../components/SkyCanvas.vue'
import StarDetail from '../components/StarDetail.vue'
import StoryForm from '../components/StoryForm.vue'
import catalogData from '../data/stars.json'
import { constellationNames, starDistances } from '../data/starInfo'

const router = useRouter()
const username = ref('')
const userLat = ref<number | undefined>(undefined)
const userLng = ref<number | undefined>(undefined)
const locationReady = ref(false)
const guidesVisible = ref(true)

// 获取用户地理位置用于天球朝向
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => { userLat.value = pos.coords.latitude; userLng.value = pos.coords.longitude; locationReady.value = true },
    () => { locationReady.value = true }, // 定位失败也继续
    { timeout: 5000 },
  )
} else {
  locationReady.value = true
}

onMounted(async () => {
  fetchStories()
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (json.code === 200) username.value = json.data.username
    } catch {}
  }
})

function doLogout() {
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
    const res = await fetch(`/api/stars/search?q=${encodeURIComponent(q)}`)
    const json = await res.json()
    if (json.code === 200) searchResults.value = json.data
  } catch { searchResults.value = [] }
  finally { searching.value = false }
}

async function flyToStar(starId: number) {
  const star = catalogStarLookup.get(starId)
  if (!star) return
  // 模拟点击该星
  onStarClick(starId)
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
  catalog_star_id: number; created_at: string; location_lat: number | null
  location_lng: number | null; type: string; view_count: number; origin: string | null
  username: string | null; tag: string | null
}
const NO_STORY: StoryData = { id: -1, title: null, content: '这颗星还在等待它的故事...', resonanceCount: 0, catalog_star_id: -1, created_at: '', location_lat: null, location_lng: null, type: '', view_count: 0, origin: null, username: null, tag: null }
const storiesByStarId = shallowRef(new Map<number, StoryData[]>())

async function fetchStories() {
  try {
    const res = await fetch('/api/stars')
    const json = await res.json()
    const map = new Map<number, StoryData[]>()
    const statsMap = new Map<number, { stories: number; resonance: number; views: number; favorites: number }>()
    for (const s of json.data ?? []) {
      const cid = s.catalog_star_id
      if (cid != null) {
        if (!map.has(cid)) map.set(cid, [])
        map.get(cid)!.push({ id: s.id, title: s.title, content: s.content, resonanceCount: s.resonance_count, catalog_star_id: cid, created_at: s.created_at || '', location_lat: s.location_lat ?? null, location_lng: s.location_lng ?? null, type: s.type || 'user', view_count: s.view_count ?? 0, origin: s.origin ?? null, username: s.username ?? null, tag: s.tag ?? null })
        const cur = statsMap.get(cid) || { stories: 0, resonance: 0, views: 0, favorites: 0 }
        cur.stories++; cur.resonance += s.resonance_count || 0; cur.views += s.view_count || 0
        statsMap.set(cid, cur)
      }
    }
    storiesByStarId.value = map
    pendingStatsMap.value = statsMap
    skyRef.value?.sky?.setStarStatsCache(statsMap)
  } catch (e) { console.error('获取故事失败:', e) }
}
onMounted(() => { fetchStories() })

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
const selectedStories = shallowRef<StoryData[]>([])
const activeStoryIndex = ref(0)
const selectedStarInfo = ref<{ displayName: string; con: string; mag: number; conName: string; distance: number | null; ra: number; dec: number; color: string } | null>(null)
const selectedCatalogStarId = ref(0)
const resonating = ref(false)
const catalogStats = ref<{ storyCount: number; totalResonance: number; totalViews: number; starViews: number; favoriteCount: number } | null>(null)
const showForm = ref(false)

function onStarClick(starId: number) {
  const star = catalogStarLookup.get(starId); if (!star) return
  const stories = storiesByStarId.value.get(starId)
  selectedStories.value = stories?.length ? stories : [NO_STORY]; activeStoryIndex.value = 0
  selectedStarInfo.value = { displayName: formatStarName(star), con: star.con, mag: star.mag, conName: constellationNames[star.con] || star.con || '未知星座', distance: starDistances[star.id] ?? null, ra: star.ra, dec: star.dec, color: star.color || '#fff6e8' }
  selectedCatalogStarId.value = starId
  const realStories = (stories || []).filter((s: StoryData) => s.id > 0)
  catalogStats.value = { storyCount: realStories.length, totalResonance: realStories.reduce((sum: number, s: StoryData) => sum + s.resonanceCount, 0), totalViews: 0, starViews: 0, favoriteCount: 0 }
  fetchCatalogStats(starId)
  fetch(`/api/stars/${starId}/visit`, { method: 'POST' }).catch(() => {})
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
  const stories = storiesByStarId.value.get(planetId)
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
  try { const res = await fetch(`/api/stars/${starId}/stats`); const json = await res.json(); if (json.code === 200) { catalogStats.value = { storyCount: json.data.storyCount ?? 0, totalResonance: json.data.totalResonance ?? 0, totalViews: json.data.totalViews ?? 0, starViews: json.data.starViews ?? 0, favoriteCount: json.data.favoriteCount ?? 0 } } } catch {}
}
function onCloseDetail() { selectedStories.value = []; selectedStarInfo.value = null; catalogStats.value = null }
function onWriteStory() { if (selectedStarInfo.value) showForm.value = true }
function onStorySubmitted(story: StoryData) { const cid = story.catalog_star_id; const map = storiesByStarId.value; const existing = map.get(cid) ?? []; existing.push(story); map.set(cid, existing); storiesByStarId.value = new Map(map); if (cid === selectedCatalogStarId.value && selectedStarInfo.value) selectedStories.value = [...existing]; showForm.value = false }
function onSwitchStory(index: number) { activeStoryIndex.value = index }
function onIncrementViews() { if (catalogStats.value) catalogStats.value = { ...catalogStats.value, totalViews: catalogStats.value.totalViews + 1 } }
function onIncrementFavorites() { if (catalogStats.value) catalogStats.value = { ...catalogStats.value, favoriteCount: catalogStats.value.favoriteCount + 1 } }
function onDecrementFavorites() { if (catalogStats.value && catalogStats.value.favoriteCount > 0) catalogStats.value = { ...catalogStats.value, favoriteCount: catalogStats.value.favoriteCount - 1 } }
async function onResonate(storyId: number) { resonating.value = true; try { const res = await fetch(`/api/stars/${storyId}/resonate`, { method: 'POST' }); const json = await res.json(); if (json.code === 200) { const stories = selectedStories.value; const idx = stories.findIndex(s => s.id === storyId); if (idx >= 0) { stories[idx].resonanceCount = json.data.resonance_count; selectedStories.value = [...stories] } if (catalogStats.value) catalogStats.value = { ...catalogStats.value, totalResonance: catalogStats.value.totalResonance + 1 } } } catch (e) { console.error('共鸣失败:', e) } finally { resonating.value = false } }
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
.nav-user { color: #b9b4d6; font-size: 0.85rem; cursor: pointer; }
.nav-user:hover { color: #f6f1ff; }
.nav-btn {
  padding: 0.3rem 0.8rem; border-radius: 8px;
  border: 1px solid rgba(48,55,87,0.5); background: rgba(255,255,255,0.05);
  color: #7a759c; font-size: 0.8rem; cursor: pointer;
}
.nav-btn:hover { color: #b9b4d6; border-color: rgba(48,55,87,0.8); }
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
.hint {
  position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
  color: var(--muted-light); font-size: 0.78rem; z-index: 5;
  pointer-events: none; opacity: 0.5;
}
.hint p { margin: 0; }
.hint p span { opacity: 0.6; }

/* ─── 叙事引导牌 ─── */
.guide-cards {
  position: fixed;
  bottom: 3.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.75rem;
  z-index: 15;
  pointer-events: auto;
}
.guide-card {
  width: 180px;
  padding: 1rem 1.1rem 0.85rem;
  border-radius: var(--radius-lg, 12px);
  background: rgba(16, 20, 43, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(48, 55, 87, 0.35);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  text-align: left;
}
.guide-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 217, 138, 0.25);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 217, 138, 0.06);
}
.guide-icon {
  color: var(--accent, #ffd98a);
  margin-bottom: 0.55rem;
  opacity: 0.85;
}
.guide-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink, #f6f1ff);
  margin: 0 0 0.35rem;
  letter-spacing: 0.02em;
}
.guide-desc {
  font-size: 0.76rem;
  line-height: 1.6;
  color: var(--muted-light, #7a759c);
  margin: 0;
}
.guides-enter-active { transition: opacity 0.6s ease, transform 0.6s ease; }
.guides-leave-active { transition: opacity 0.4s ease, transform 0.4s ease; }
.guides-enter-from { opacity: 0; transform: translateX(-50%) translateY(20px); }
.guides-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

@media (max-width: 640px) {
  .guide-cards { flex-direction: column; bottom: 3rem; left: auto; right: 0.75rem; transform: none; gap: 0.5rem; }
  .guide-card { width: 160px; padding: 0.75rem 0.85rem 0.65rem; }
  .guides-enter-from { transform: translateY(20px); }
  .guides-leave-to { transform: translateY(10px); }
}
</style>
