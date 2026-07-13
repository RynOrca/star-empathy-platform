<template>
  <div class="app">
    <SkyCanvas ref="skyRef" @star-click="onStarClick" />
    <div class="zoom-controls">
      <button class="zoom-btn" @click="zoomIn">+</button>
      <button class="zoom-btn" @click="zoomOut">−</button>
    </div>
    <div class="hint">
      <p>拖拽旋转 &nbsp;|&nbsp; 滚轮缩放 &nbsp;|&nbsp; 点击星星</p>
    </div>

    <Transition name="fade">
      <StarDetail
        v-if="selectedStories.length > 0"
        :stories="selectedStories"
        :active-index="activeStoryIndex"
        :star-name="selectedStarName"
        :screen-pos="selectedStarScreenPos"
        :resonating="resonating"
        @switch="onSwitchStory"
        @resonate="onResonate"
        @close="selectedStories = []"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue'
import { Vector3 } from 'three'
import type { SkyAPI } from './composables/useSky'
import SkyCanvas from './components/SkyCanvas.vue'
import StarDetail from './components/StarDetail.vue'
import catalogData from './data/stars.json'

// ─── 星表查询 ───
interface CatalogStar {
  id: number
  name: string | null
  x: number; y: number; z: number
}
const catalogStarLookup = new Map<number, CatalogStar>()
for (const s of catalogData.stars) {
  catalogStarLookup.set(s.id, { id: s.id, name: s.name, x: s.x, y: s.y, z: s.z })
}

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

// ─── 点击处理 ───
const skyRef = ref<{ sky: SkyAPI | null } | null>(null)
const selectedStories = shallowRef<StoryData[]>([])
const activeStoryIndex = ref(0)
const selectedStarName = ref<string | null>(null)
const selectedStarScreenPos = ref({ x: 0, y: 0 })
const resonating = ref(false)

function onStarClick(starId: number) {
  const star = catalogStarLookup.get(starId)
  if (!star) return

  const stories = storiesByStarId.value.get(starId)
  if (!stories || stories.length === 0) {
    // 无故事的星 — 短暂闪烁提示
    return
  }

  // 投影到屏幕坐标
  const camera = skyRef.value?.sky?.camera
  if (!camera) return
  const pos = new Vector3(star.x, star.y, star.z)
  pos.project(camera)
  const sx = (pos.x * 0.5 + 0.5) * window.innerWidth
  const sy = (-pos.y * 0.5 + 0.5) * window.innerHeight

  selectedStories.value = stories
  activeStoryIndex.value = 0
  selectedStarName.value = star.name
  selectedStarScreenPos.value = { x: sx, y: sy }
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

.app {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: var(--bg);
  font-family: var(--font);
  color: var(--ink);
}

.zoom-controls {
  position: fixed;
  right: 1.5rem;
  bottom: 5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 10;
}
.zoom-btn {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--bg2) 80%, transparent);
  border: 1px solid var(--rule);
  color: var(--ink);
  font-size: 1.2rem;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: border-color 0.3s;
  display: flex; align-items: center; justify-content: center;
}
.zoom-btn:hover { border-color: var(--accent); }

.hint {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  color: var(--muted);
  font-size: 0.82rem;
  opacity: 0.6;
  z-index: 5;
  pointer-events: none;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
