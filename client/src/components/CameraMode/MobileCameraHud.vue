<template>
  <div class="mobile-camera-hud">
    <button class="mch-exit" @click="$emit('exit')">
      <ChevronLeftIcon />
      <span>天镜览星</span>
    </button>
    <span class="mch-region">{{ region }}</span>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeftIcon } from './icons/CameraIcons'

defineProps<{
  region: string
}>()

defineEmits<{ exit: [] }>()
</script>

<style scoped>
.mobile-camera-hud {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 38px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--hud-bg);
  backdrop-filter: blur(12px);
  font-family: var(--font-display);
  color: var(--hud-text);
  font-size: 0.8rem;
}
.mch-exit {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--hud-text);
  cursor: pointer;
  font-family: var(--font-display);
}
.mch-region {
  font-size: 0.7rem;
  opacity: 0.7;
  letter-spacing: 0.05em;
}

/* ═══ 级联进入动画 ═══ */
.mobile-camera-hud { animation: mch-enter 0.4s var(--ease-in-out) both; }

@keyframes mch-enter { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: translateY(0); } }
</style>
