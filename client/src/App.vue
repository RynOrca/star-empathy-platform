<template>
  <div class="app">
    <Transition name="fade">
      <LoadingScreen v-if="loading && !error" />
    </Transition>
    <Transition name="fade">
      <div v-if="error && !loading" class="error-overlay">
        <div class="error-card">
          <p>😔 星空连接失败</p>
          <span class="error-detail">{{ error }}</span>
          <button class="retry-btn" @click="retryFetch">重新连接</button>
        </div>
      </div>
    </Transition>
    <div class="canvas-wrap" :class="{ invisible: loading && !error }">
      <SkyCanvas
        ref="skyCanvasRef"
        @star-hover="onHover"
        @star-select="onSelect"
        @star-deselect="onDeselect"
        @stars-loaded="loading = false"
      />
    </div>
    <Transition name="fade">
      <StarDetail
        v-if="selectedStar"
        :star="selectedStar"
        :screen-pos="detailPos"
        :resonating="resonatingId === selectedStar.id"
        :star-name="selectedStarName"
        @resonate="onResonate"
        @close="onDeselect"
      />
    </Transition>
    <Transition name="fade">
      <StoryForm
        v-if="showForm"
        @submit="onSubmitStory"
        @close="showForm = false"
      />
    </Transition>
    <LegendToggle
      :filters="filters"
      @update="onFilterChange"
    />
    <button class="fab" @click="showForm = true">
      <span class="fab-icon">+</span>
      <span class="fab-text">挂上我的故事</span>
    </button>
    <Transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import SkyCanvas from './components/SkyCanvas.vue'
import StarDetail from './components/StarDetail.vue'
import StoryForm from './components/StoryForm.vue'
import LegendToggle from './components/LegendToggle.vue'
import LoadingScreen from './components/LoadingScreen.vue'
import { useStars } from './composables/useStars'
import { useResonate } from './composables/useResonate'
import { getSeedStarId, assignUserStar } from './utils/storyMappings'
import type { StoryAttachment } from './composables/useSky'

const skyCanvasRef = ref<InstanceType<typeof SkyCanvas> | null>(null)
const { stars: apiStars, loading, error, filters, fetchStars, addLocalStar, updateResonanceLocally } = useStars()
const { resonate, resonatingId } = useResonate()

const selectedStar = ref<StoryAttachment | null>(null)
const selectedStarName = ref<string | null>(null)
const detailPos = ref({ x: 0, y: 0 })
const showForm = ref(false)
const toast = ref('')

// ─── API 数据 → 恒星映射 → SkyCanvas ────────
function buildAttachments(): StoryAttachment[] {
  return apiStars.value.map(s => {
    let catalogId: number | null = null

    if (s.type === 'history' && s.title) {
      catalogId = getSeedStarId(s.title)
    }

    // 如果映射失败，分配未命名暗星
    if (catalogId === null) {
      catalogId = assignUserStar().id
    }

    return {
      storyId: s.id,
      catalogStarId: catalogId,
      type: s.type,
      title: s.title,
      content: s.content,
      resonanceCount: s.resonanceCount,
    }
  })
}

watch(apiStars, (stars) => {
  if (stars.length > 0 && skyCanvasRef.value) {
    const attachments = buildAttachments()
    skyCanvasRef.value.setStoryAttachments(attachments)
  }
})

watch(skyCanvasRef, (ref) => {
  if (ref && apiStars.value.length > 0) {
    ref.setStoryAttachments(buildAttachments())
  }
})

watch(error, (msg) => { if (msg) showToast(msg) })

// ─── 交互 ───────────────────────────────────
function onHover(_att: StoryAttachment | null, _x: number, _y: number) {}

function onSelect(attachment: StoryAttachment, catalogName: string | null, screenX: number, screenY: number) {
  selectedStar.value = attachment
  selectedStarName.value = catalogName
  detailPos.value = { x: screenX, y: screenY }
}

function onDeselect() {
  selectedStar.value = null
  selectedStarName.value = null
  skyCanvasRef.value?.clearSelection()
}

async function onResonate(id: number) {
  if (id < 0) return // 无故事的亮星不能共鸣
  const ok = await resonate(id)
  if (ok) {
    updateResonanceLocally(id)
    if (selectedStar.value && selectedStar.value.storyId === id) {
      selectedStar.value = { ...selectedStar.value, resonanceCount: selectedStar.value.resonanceCount + 1 }
    }
    showToast('共鸣已点亮 ✨')
  } else {
    showToast('共鸣失败，请重试')
  }
}

async function onSubmitStory(content: string) {
  try {
    const res = await fetch('/api/stars/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    const json = await res.json()
    if (json.code === 200) {
      const raw = json.data
      const catalogStar = assignUserStar()
      const newStar = {
        id: raw.id,
        type: 'user' as const,
        title: raw.title ?? null,
        content: raw.content,
        resonanceCount: raw.resonance_count ?? 0,
        posX: raw.pos_x ?? 0,
        posY: raw.pos_y ?? 0,
        posZ: raw.pos_z ?? 0,
        createdAt: raw.created_at ?? new Date().toISOString(),
      }
      addLocalStar(newStar)
      skyCanvasRef.value?.addStoryAttachment({
        storyId: newStar.id,
        catalogStarId: catalogStar.id,
        type: 'user',
        title: null,
        content: newStar.content,
        resonanceCount: 0,
      })
      showToast('故事已化作星光 🌟')
    } else {
      showToast(json.message || '投递失败')
    }
  } catch (e: any) {
    showToast('网络错误，请重试')
  }
}

function onFilterChange(newFilters: typeof filters) {
  Object.assign(filters, newFilters)
  // TODO: 按类型筛选 overlay 显示/隐藏
}

function retryFetch() { fetchStars() }
function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 2500)
}
</script>

<style>
@import './styles/variables.css';

.canvas-wrap {
  position: fixed;
  inset: 0;
}
/* visibility:hidden 保留下尺寸，避免 WebGL 0x0 */
.canvas-wrap.invisible {
  visibility: hidden;
}

.app {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: var(--bg);
  font-family: var(--font);
  color: var(--ink);
}

.fab {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: color-mix(in srgb, var(--bg2) 85%, transparent);
  border: 1px solid var(--rule);
  border-radius: 28px;
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.95rem;
  cursor: pointer;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px var(--shadow);
  transition: border-color 0.3s, box-shadow 0.3s;
  z-index: 10;
}
.fab:hover { border-color: var(--accent); box-shadow: 0 8px 40px var(--glow); }
.fab-icon { font-size: 1.2rem; color: var(--accent); }

.toast {
  position: fixed;
  bottom: 6rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.6rem 1.4rem;
  background: color-mix(in srgb, var(--bg2) 90%, transparent);
  border: 1px solid var(--accent);
  border-radius: 20px;
  color: var(--accent);
  font-size: 0.9rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px var(--shadow);
  z-index: 50;
  white-space: nowrap;
}

.error-overlay {
  position: fixed; inset: 0;
  background: var(--bg);
  display: flex; align-items: center; justify-content: center;
  z-index: 90;
}
.error-card { text-align: center; padding: 2rem; }
.error-card p { font-size: 1.3rem; color: var(--ink); margin-bottom: 0.5rem; }
.error-detail { display: block; color: var(--muted); font-size: 0.88rem; margin-bottom: 1.2rem; }
.retry-btn {
  padding: 0.55rem 1.5rem;
  background: color-mix(in srgb, var(--accent) 20%, transparent);
  border: 1px solid var(--accent); border-radius: 18px;
  color: var(--accent); font-family: var(--font); font-size: 0.9rem; cursor: pointer;
  transition: background 0.3s;
}
.retry-btn:hover { background: color-mix(in srgb, var(--accent) 35%, transparent); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
