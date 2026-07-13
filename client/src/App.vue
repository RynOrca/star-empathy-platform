<template>
  <div class="app">
    <Transition name="fade">
      <LoadingScreen v-if="loading" />
    </Transition>
    <SkyCanvas
      v-show="!loading"
      ref="skyCanvasRef"
      @star-hover="onHover"
      @star-select="onSelect"
      @star-deselect="onDeselect"
      @stars-loaded="loading = false"
    />
    <Transition name="fade">
      <StarDetail
        v-if="selectedStar"
        :star="selectedStar"
        :screen-pos="detailPos"
        :resonating="resonatingId === selectedStar.id"
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
import { ref, watch, nextTick } from 'vue'
import SkyCanvas from './components/SkyCanvas.vue'
import type { StarData } from './components/SkyCanvas.vue'
import StarDetail from './components/StarDetail.vue'
import StoryForm from './components/StoryForm.vue'
import LegendToggle from './components/LegendToggle.vue'
import LoadingScreen from './components/LoadingScreen.vue'
import { useStars } from './composables/useStars'
import { useResonate } from './composables/useResonate'

const skyCanvasRef = ref<InstanceType<typeof SkyCanvas> | null>(null)
const { loading, error, filters, filteredStars, fetchStars, addLocalStar, updateResonanceLocally } = useStars()
const { resonate, resonatingId } = useResonate()

const selectedStar = ref<StarData | null>(null)
const detailPos = ref({ x: 0, y: 0 })
const showForm = ref(false)
const toast = ref('')

// 数据加载后推送到 SkyCanvas
watch(filteredStars, (stars) => {
  if (skyCanvasRef.value) {
    skyCanvasRef.value.setStars(stars)
  }
})

// 初始加载
watch(skyCanvasRef, (ref) => {
  if (ref && filteredStars.value.length > 0) {
    ref.setStars(filteredStars.value)
  }
})

// 错误 toast
watch(error, (msg) => {
  if (msg) showToast(msg)
})

function onHover(star: StarData | null, _x: number, _y: number) {
  // hover 反馈由 SkyCanvas 内部处理（光环 sprite）
}

function onSelect(star: StarData, screenX: number, screenY: number) {
  selectedStar.value = star
  detailPos.value = { x: screenX, y: screenY }
}

function onDeselect() {
  selectedStar.value = null
  skyCanvasRef.value?.getSky()?.resumeBreathing()
}

async function onResonate(id: number) {
  const ok = await resonate(id)
  if (ok) {
    updateResonanceLocally(id)
    // 更新 StarDetail 中显示的星
    if (selectedStar.value && selectedStar.value.id === id) {
      selectedStar.value = {
        ...selectedStar.value,
        resonanceCount: selectedStar.value.resonanceCount + 1,
      }
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
      const newStar: StarData = {
        id: raw.id,
        type: 'user',
        title: raw.title ?? null,
        content: raw.content,
        resonanceCount: raw.resonance_count ?? 0,
        posX: raw.pos_x ?? raw.position?.x ?? 0,
        posY: raw.pos_y ?? raw.position?.y ?? 0,
        posZ: raw.pos_z ?? raw.position?.z ?? 0,
        createdAt: raw.created_at ?? new Date().toISOString(),
      }
      addLocalStar(newStar)
      skyCanvasRef.value?.addStar(newStar)
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
}

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => {
    toast.value = ''
  }, 2500)
}
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

.fab:hover {
  border-color: var(--accent);
  box-shadow: 0 8px 40px var(--glow);
}

.fab-icon {
  font-size: 1.2rem;
  color: var(--accent);
}

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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
