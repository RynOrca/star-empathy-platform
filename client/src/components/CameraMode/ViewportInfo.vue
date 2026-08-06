<template>
  <div class="viewport-info">
    <div class="vp-title">{{ title }}</div>
    <div class="vp-subtitle">取景框覆盖 {{ starCount }} 颗亮星，共收录 {{ storyCount }} 则故事</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StarInFrame } from '../../composables/useSky'

const props = defineProps<{
  starsInFrame: StarInFrame[]
  storyCount: number
}>()

const starCount = computed(() => props.starsInFrame.length)

const title = computed(() => {
  if (starCount.value === 0) return '深空区域'
  if (starCount.value <= 3) {
    return `${starCount.value} 颗亮星区域`
  }
  return '夏季银河大三角区域'
})
</script>

<style scoped>
.viewport-info {
  position: fixed;
  top: 72px;
  left: 32px;
  z-index: 15;
  border-left: 3px solid var(--accent-purple);
  background: var(--hud-bg);
  padding: 12px 16px;
  border-radius: 0 4px 4px 0;
  font-family: var(--font-display);
  color: var(--hud-text);
  pointer-events: none;
  max-width: 280px;
}
.vp-title {
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}
.vp-subtitle {
  font-size: var(--text-xxs);
  opacity: 0.7;
  letter-spacing: 0.05em;
}

/* ═══ 级联进入动画 ═══ */
.viewport-info { animation: vp-enter 0.5s var(--ease-in-out) both; animation-delay: 160ms; }

@keyframes vp-enter { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
</style>
