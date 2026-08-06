<template>
  <div class="camera-hud">
    <div class="hud-top">
      <button class="hud-exit" @click="$emit('exit')">
        <ApertureIcon />
        <span class="hud-exit-label">天镜览星</span>
      </button>
      <div class="hud-mode">
        <span class="rec-dot" />
        <span class="hud-mode-text">PHOTO MODE</span>
      </div>
      <div class="hud-coords">
        <div class="hud-chip">
          <span class="hud-chip-label">RA</span>
          <span class="hud-chip-value">{{ ra }}</span>
        </div>
        <div class="hud-chip">
          <span class="hud-chip-label">DEC</span>
          <span class="hud-chip-value">{{ dec }}</span>
        </div>
        <div class="hud-chip">
          <span class="hud-chip-label">FOV</span>
          <span class="hud-chip-value">{{ fov }}°</span>
        </div>
      </div>
    </div>
    <div class="hud-bottom">
      <div class="hud-params">
        <span>ISO 800</span>
        <span>SHUTTER 1/60s</span>
        <span>APERTURE f/2.8</span>
      </div>
      <div class="hud-meta">
        <span>{{ date }}</span>
        <span>{{ time }}</span>
        <span>FPS {{ fps }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ApertureIcon } from './icons/CameraIcons'

defineProps<{
  ra: string
  dec: string
  fov: number
}>()

defineEmits<{ exit: [] }>()

const date = ref('')
const time = ref('')
const fps = ref(60)
let timer: number | null = null
let frameCount = 0
let lastFpsTime = performance.now()

function updateDateTime() {
  const now = new Date()
  date.value = now.toLocaleDateString('zh-CN')
  time.value = now.toLocaleTimeString('zh-CN', { hour12: false })
}

function tick() {
  frameCount++
  const now = performance.now()
  if (now - lastFpsTime >= 1000) {
    fps.value = Math.round(frameCount * 1000 / (now - lastFpsTime))
    frameCount = 0
    lastFpsTime = now
  }
  updateDateTime()
  timer = requestAnimationFrame(tick)
}

onMounted(() => {
  updateDateTime()
  timer = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (timer) cancelAnimationFrame(timer)
})
</script>

<style scoped>
.camera-hud {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 20;
  font-family: var(--font-display);
  color: var(--hud-text);
}
.hud-top, .hud-bottom {
  position: absolute;
  left: 0; right: 0;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: linear-gradient(to bottom, var(--hud-bg), transparent);
  pointer-events: none;
}
.hud-top { top: 0; }
.hud-bottom {
  bottom: 0;
  height: 48px;
  background: linear-gradient(to top, var(--hud-bg), transparent);
  font-size: var(--text-xxs);
  letter-spacing: 0.1em;
}
.hud-exit {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: 1px solid var(--vf-border);
  color: var(--hud-text);
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  pointer-events: auto;
  font-family: var(--font-display);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  transition: all 0.25s var(--ease-in-out);
}
.hud-exit:hover {
  background: rgba(202, 167, 255, 0.1);
  color: var(--hud-accent);
}
.hud-mode {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
}
.rec-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--rec-color);
  animation: rec-blink 1.2s infinite steps(1);
}
@keyframes rec-blink {
  0%, 55% { opacity: 1; }
  56%, 100% { opacity: 0.2; }
}
.hud-coords {
  display: flex;
  gap: 16px;
}
.hud-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: var(--text-xxs);
}
.hud-chip-label {
  opacity: 0.5;
  letter-spacing: 0.1em;
}
.hud-chip-value {
  font-size: 0.75rem;
  color: var(--hud-accent);
  transition: opacity 0.2s;
}
.hud-params, .hud-meta {
  display: flex;
  gap: 24px;
}

/* ═══ 级联进入动画（纯 opacity，避免 transform 残留导致拖动时抖动） ═══ */
.hud-top { animation: hud-top-enter 0.4s var(--ease-in-out) both; animation-delay: 80ms; }
.hud-bottom { animation: hud-bottom-enter 0.4s var(--ease-in-out) both; animation-delay: 160ms; }
.hud-coords { animation: hud-coords-enter 0.4s var(--ease-in-out) both; animation-delay: 240ms; }

@keyframes hud-top-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes hud-bottom-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes hud-coords-enter { from { opacity: 0; } to { opacity: 1; } }
</style>
