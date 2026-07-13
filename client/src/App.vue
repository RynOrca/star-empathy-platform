<template>
  <div class="app">
    <SkyCanvas />
    <button class="fab" @click="showForm = true">
      <span class="fab-icon">+</span>
      <span class="fab-text">挂上我的故事</span>
    </button>
    <Transition name="fade">
      <StarDetail
        v-if="selectedStar"
        :star="selectedStar"
        :screen-pos="detailPos"
        @resonate="onResonate"
        @close="selectedStar = null"
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
    <Transition name="fade">
      <LoadingScreen v-if="loading" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, provide } from 'vue'
import SkyCanvas from './components/SkyCanvas.vue'
import StarDetail from './components/StarDetail.vue'
import StoryForm from './components/StoryForm.vue'
import LegendToggle from './components/LegendToggle.vue'
import LoadingScreen from './components/LoadingScreen.vue'

interface Star {
  id: number
  type: 'history' | 'user'
  title: string | null
  content: string
  resonanceCount: number
  position: { x: number; y: number; z: number }
  createdAt: string
}

const loading = ref(true)
const selectedStar = ref<Star | null>(null)
const detailPos = ref({ x: 0, y: 0 })
const showForm = ref(false)

const filters = reactive({
  history: true,
  user: true,
  highlightResonance: false,
})

function onHover(star: Star | null, screenX: number, screenY: number) {
  // hover 时更新 cursor，SkyCanvas 内部处理
}

function onSelect(star: Star, screenX: number, screenY: number) {
  selectedStar.value = star
  detailPos.value = { x: screenX, y: screenY }
}

function onDeselect() {
  selectedStar.value = null
}

async function onResonate(id: number) {
  // 由 StarDetail 内部调用 useResonate
}

function onSubmitStory(content: string) {
  showForm.value = false
  // SkyCanvas 内部监听添加新星
}

function onFilterChange(newFilters: typeof filters) {
  Object.assign(filters, newFilters)
}

// Provide for child components
provide('filters', filters)
provide('onStarSelect', onSelect)
provide('onStarHover', onHover)
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
