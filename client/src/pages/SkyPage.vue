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
        <span v-if="username" class="nav-user" @click="$router.push('/profile')">
          👤 {{ username }}
        </span>
        <button v-if="username" class="nav-btn" @click="doLogout">退出</button>
      </div>
    </nav>

    <SkyCanvas ref="skyRef" @star-click="onStarClick" />
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
import { ref, shallowRef, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { SkyAPI } from '../composables/useSky'
import SkyCanvas from '../components/SkyCanvas.vue'
import StarDetail from '../components/StarDetail.vue'
import StoryForm from '../components/StoryForm.vue'
import catalogData from '../data/stars.json'
import { constellationNames, starDistances } from '../data/starInfo'

const router = useRouter()
const username = ref('')

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
    for (const s of json.data ?? []) {
      const cid = s.catalog_star_id
      if (cid != null) {
        if (!map.has(cid)) map.set(cid, [])
        map.get(cid)!.push({ id: s.id, title: s.title, content: s.content, resonanceCount: s.resonance_count, catalog_star_id: cid, created_at: s.created_at || '', location_lat: s.location_lat ?? null, location_lng: s.location_lng ?? null, type: s.type || 'user', view_count: s.view_count ?? 0, origin: s.origin ?? null, username: s.username ?? null, tag: s.tag ?? null })
      }
    }
    storiesByStarId.value = map
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
</style>
