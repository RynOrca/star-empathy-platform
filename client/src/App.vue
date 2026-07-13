<template>
  <div class="app">
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
        :resonating="resonating"
        @switch="onSwitchStory"
        @resonate="onResonate"
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
import type { SkyAPI } from './composables/useSky'
import SkyCanvas from './components/SkyCanvas.vue'
import StarDetail from './components/StarDetail.vue'
import StoryForm from './components/StoryForm.vue'
import catalogData from './data/stars.json'

// ─── 星表查询 ───
interface CatalogStar {
  id: number
  name: string | null
  con: string
  mag: number
  ra: number
  dec: number
  x: number; y: number; z: number
}
const catalogStarLookup = new Map<number, CatalogStar>()
for (const s of catalogData.stars) {
  catalogStarLookup.set(s.id, { id: s.id, name: s.name, con: s.con, mag: s.mag, ra: s.ra, dec: s.dec, x: s.x, y: s.y, z: s.z })
}

// ─── 无故事时的占位 ───
const NO_STORY: StoryData = { id: -1, title: null, content: '这颗星还在等待它的故事...', resonanceCount: 0, catalog_star_id: -1 }

// ─── 故事查询 ───
interface StoryData {
  id: number
  title: string | null
  content: string
  resonanceCount: number
  catalog_star_id: number
}
const storiesByStarId = shallowRef(new Map<number, StoryData[]>())

onMounted(async () => {
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
        })
      }
    }
    storiesByStarId.value = map
  } catch (e) {
    console.error('获取故事失败:', e)
  }
})

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
const skyRef = ref<{ sky: SkyAPI | null } | null>(null)
const selectedStories = shallowRef<StoryData[]>([])
const activeStoryIndex = ref(0)
const selectedStarInfo = ref<{ displayName: string; con: string; mag: number } | null>(null)
const selectedCatalogStarId = ref(0)
const resonating = ref(false)

// 写故事表单
const showForm = ref(false)

function onStarClick(starId: number) {
  const star = catalogStarLookup.get(starId)
  if (!star) return

  const stories = storiesByStarId.value.get(starId)
  selectedStories.value = stories?.length ? stories : [NO_STORY]
  activeStoryIndex.value = 0
  selectedStarInfo.value = { displayName: formatStarName(star), con: star.con, mag: star.mag }
  selectedCatalogStarId.value = starId
}

function onCloseDetail() {
  selectedStories.value = []
  selectedStarInfo.value = null
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
