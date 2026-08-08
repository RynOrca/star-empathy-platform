<template>
  <div class="mobile-camera-hud">
    <div class="mch-row mch-row-top">
      <!-- 左：明确的退出按钮（与 PC 端语义一致） -->
      <button class="mch-exit" @click="$emit('exit')">
        <ChevronLeftIcon />
        <span>退出</span>
      </button>
      <!-- 中：居中「天镜览星」标题 -->
      <span class="mch-title">天镜览星</span>
      <!-- 右：区域信息 -->
      <span class="mch-region">{{ region }}</span>
    </div>
    <div class="mch-row mch-row-bottom">
      <div class="mch-mode-toggles">
        <button
          class="mch-mode-btn"
          :class="{ active: filters.mode === 'listening' }"
          :aria-pressed="filters.mode === 'listening'"
          @click="$emit('setMode', 'listening')"
          title="听语：收录星友心声，未看过+共鸣热度优先"
        >
          <MessageCircleIcon /><span>听语</span>
        </button>
        <button
          class="mch-mode-btn"
          :class="{ active: filters.mode === 'gazing' }"
          :aria-pressed="filters.mode === 'gazing'"
          @click="$emit('setMode', 'gazing')"
          title="观星：品读星辰神话与千年历史故事"
        >
          <TelescopeIcon /><span>观星</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeftIcon, TelescopeIcon, MessageCircleIcon } from './icons/CameraIcons'
import type { CameraFilters, CameraFilterMode } from '../../composables/useCameraMode'

defineProps<{
  region: string
  filters: CameraFilters
}>()

defineEmits<{
  exit: []
  setMode: [mode: CameraFilterMode]
}>()
</script>

<style scoped>
.mobile-camera-hud {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  background: var(--hud-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-family: var(--font-display);
  color: var(--hud-text);
  animation: mch-enter 0.4s var(--ease-in-out) both;
  pointer-events: auto;
}

@keyframes mch-enter {
  from { opacity: 0; transform: translateY(-100%); }
  to { opacity: 1; transform: translateY(0); }
}

.mch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}
.mch-row-top {
  height: 44px;
  font-size: 0.8rem;
  position: relative;
}
.mch-row-bottom {
  height: 36px;
  justify-content: flex-end;
}
/* 左：退出按钮 */
.mch-exit {
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(255, 107, 107, 0.08);
  border: 1px solid rgba(255, 107, 107, 0.25);
  color: #ff6b6b;
  cursor: pointer;
  font-family: var(--font-display);
  font-weight: 600;
  padding: 5px 10px;
  border-radius: var(--radius-full);
  transition: all 0.25s var(--ease-in-out);
  z-index: 2;
}
.mch-exit:active {
  transform: scale(0.96);
  background: rgba(255, 107, 107, 0.16);
}
.mch-exit svg { color: #ff6b6b; }
/* 中：居中标题（绝对定位保证真正居中，不被左右挤压） */
.mch-title {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  background: linear-gradient(90deg, #86a8ff, #caa7ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  z-index: 1;
  white-space: nowrap;
}
/* 右：区域信息 */
.mch-region {
  font-size: 0.7rem;
  opacity: 0.7;
  letter-spacing: 0.05em;
  z-index: 2;
  max-width: 30%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}
.mch-mode-toggles {
  display: flex;
  gap: 6px;
}
.mch-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: transparent;
  border: 1px solid rgba(202, 167, 255, 0.2);
  color: var(--hud-text);
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.72rem;
  font-family: var(--font-display);
  transition: all 0.25s var(--ease-in-out);
}
.mch-mode-btn.active {
  background: rgba(202, 167, 255, 0.15);
  border-color: var(--accent-purple);
  color: var(--hud-accent);
}
.mch-mode-btn:hover {
  border-color: var(--accent-purple);
}
</style>
