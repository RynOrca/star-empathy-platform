<template>
  <div class="zoom-filter-control">
    <div class="zfc-zoom" title="视场角：Ⅰ广角(75°) ~ Ⅳ长焦(35°)，点击罗马数字切换">
      <div class="zfc-label">
        <span>视场</span>
        <span class="zfc-fov-value">{{ currentFovDeg }}°</span>
      </div>
      <div class="zfc-slider-wrap">
        <div class="zfc-track" />
        <div class="zfc-fill" :style="{ width: `${(zoomLevel - 1) / 3 * 100}%` }" />
        <div class="zfc-thumb" :style="{ left: `${(zoomLevel - 1) / 3 * 100}%` }" />
      </div>
      <div class="zfc-ticks">
        <button v-for="n in 4" :key="n" class="zfc-tick" :class="{ active: zoomLevel === n }" :title="`视场 ${CAMERA_FOV_BY_STAGE[n]}°（${['广角', '标准', '中焦', '长焦'][n - 1]}）`" @click="$emit('setZoom', n)">
          {{ ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][n - 1] }}
        </button>
      </div>
    </div>
    <div class="zfc-filter">
      <div class="zfc-label">模式</div>
      <div class="zfc-mode-toggles">
        <button
          class="zfc-mode-btn"
          :class="{ active: filters.mode === 'gazing' }"
          @click="$emit('setMode', 'gazing')"
          :aria-pressed="filters.mode === 'gazing'"
          title="观星：仅展示星星本身的介绍"
        >
          <TelescopeIcon /><span>观星</span>
        </button>
        <button
          class="zfc-mode-btn"
          :class="{ active: filters.mode === 'listening' }"
          @click="$emit('setMode', 'listening')"
          :aria-pressed="filters.mode === 'listening'"
          title="听语：展示星星的情感故事（共鸣高且未看过优先）"
        >
          <MessageCircleIcon /><span>听语</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TelescopeIcon, MessageCircleIcon } from './icons/CameraIcons'
import { CAMERA_FOV_BY_STAGE } from '../../utils/constants'
import type { CameraFilters, CameraFilterMode } from '../../composables/useCameraMode'

const props = defineProps<{
  zoomLevel: number
  filters: CameraFilters
}>()

defineEmits<{
  setZoom: [level: number]
  setMode: [mode: CameraFilterMode]
}>()

const CAMERA_FOV_BY_STAGE_REF = CAMERA_FOV_BY_STAGE
const currentFovDeg = computed(() => CAMERA_FOV_BY_STAGE_REF[props.zoomLevel] ?? 75)
</script>

<style scoped>
.zoom-filter-control {
  position: fixed;
  bottom: 60px;
  left: 32px;
  z-index: 15;
  width: 220px;
  background: var(--hud-bg);
  border: 1px solid var(--vf-border);
  border-radius: 6px;
  padding: 14px;
  font-family: var(--font-display);
  color: var(--hud-text);
  pointer-events: auto;
}
.zfc-label {
  font-size: var(--text-xxs);
  letter-spacing: 0.15em;
  opacity: 0.6;
  margin-bottom: 8px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.zfc-fov-value {
  color: var(--hud-accent);
  opacity: 0.9;
  font-variant-numeric: tabular-nums;
}
.zfc-zoom { margin-bottom: 16px; }
.zfc-slider-wrap {
  position: relative;
  height: 4px;
  margin: 8px 0;
}
.zfc-track {
  position: absolute;
  inset: 0;
  background: rgba(202, 167, 255, 0.2);
  border-radius: 2px;
}
.zfc-fill {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  background: var(--accent-purple);
  border-radius: 2px;
  transition: width 0.3s var(--ease-in-out);
}
.zfc-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: var(--hud-accent);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: left 0.3s var(--ease-in-out);
}
.zfc-ticks {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}
.zfc-tick {
  background: transparent;
  border: none;
  color: var(--hud-text);
  font-family: var(--font-display);
  font-size: 0.75rem;
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.2s, transform 0.2s;
  padding: 2px 6px;
}
.zfc-tick.active {
  opacity: 1;
  color: var(--hud-accent);
  transform: scale(1.1);
}
.zfc-mode-toggles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.zfc-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: transparent;
  border: 1px solid rgba(202, 167, 255, 0.2);
  color: var(--hud-text);
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-family: var(--font-display);
  transition: all 0.25s var(--ease-in-out);
}
.zfc-mode-btn.active {
  background: rgba(202, 167, 255, 0.15);
  border-color: var(--accent-purple);
  color: var(--hud-accent);
}
.zfc-mode-btn:hover {
  border-color: var(--accent-purple);
}

/* ═══ 级联进入动画 ═══ */
.zoom-filter-control { animation: zfc-enter 0.5s var(--ease-in-out) both; animation-delay: 240ms; }

@keyframes zfc-enter { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
