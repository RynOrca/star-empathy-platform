<template>
  <div
    class="bubble"
    :class="[`size-${sizeClass}`, { 'is-active': isActive, 'is-new': star.isNew }]"
    :style="{ left: `${screenX}px`, top: `${screenY}px` }"
    @click.stop="$emit('click', star)"
  >
    <div class="bubble-body">
      <div class="bubble-star">
        <span class="star-dot" :style="{ background: starColor }" />
        <span class="star-name">{{ starName }}</span>
        <span v-if="star.isNew" class="new-tag">NEW</span>
      </div>
      <div class="bubble-text">{{ text }}</div>
      <div v-if="sizeClass === 'l'" class="bubble-meta">
        <span><HeartIcon />{{ star.resonanceCount }}</span>
        <span><ClockIcon />{{ formatTime }}</span>
      </div>
    </div>
    <svg class="bubble-tail" width="10" height="6" viewBox="0 0 10 6">
      <path d="M5 6L0 0H10L5 6Z" fill="var(--bubble-bg)" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { HeartIcon, ClockIcon } from './icons/CameraIcons'
import type { StarData } from '../../composables/useStars'

const props = defineProps<{
  star: StarData
  screenX: number
  screenY: number
  zoomStage: 1 | 2 | 3 | 4
  isActive: boolean
}>()

defineEmits<{ click: [star: StarData] }>()

const sizeClass = computed<'s' | 'm' | 'l'>(() => {
  if (props.zoomStage <= 1) return 's'
  if (props.zoomStage === 2) return 'm'
  return 'l'
})

const starColor = computed(() => props.star.catalogStarId ? '#ffd98a' : '#caa7ff')

const starName = computed(() => props.star.title || `星 #${props.star.id}`)

const text = computed(() => {
  const c = props.star.content
  if (sizeClass.value === 's') return c.slice(0, 6) + (c.length > 6 ? '…' : '')
  if (sizeClass.value === 'm') return c.slice(0, 20) + (c.length > 20 ? '…' : '')
  return c.slice(0, 60) + (c.length > 60 ? '…' : '')
})

const formatTime = computed(() => {
  const diff = Date.now() - new Date(props.star.createdAt).getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}时前`
  return `${Math.floor(diff / 86400000)}天前`
})
</script>

<style scoped>
.bubble {
  position: absolute;
  transform: translate(-50%, -120%);
  background: var(--bubble-bg);
  border: 1px solid var(--bubble-border);
  border-radius: 8px;
  color: #f0ecf6;
  pointer-events: auto;
  cursor: pointer;
  transition: opacity 0.5s var(--ease-in-out), transform 0.5s var(--ease-in-out), border-color 0.25s, box-shadow 0.25s;
  backdrop-filter: blur(8px);
  z-index: 20;
}
.bubble.size-s { max-width: 90px; padding: 6px 10px; }
.bubble.size-m { max-width: 160px; padding: 8px 14px; }
.bubble.size-l { max-width: 220px; padding: 12px 16px; }
.bubble.is-active {
  border-color: var(--bubble-active-border);
  box-shadow: var(--bubble-active-glow), 0 12px 40px rgba(0,0,0,0.5);
  transform: translate(-50%, -122%) scale(1.04);
}
.bubble.is-new {
  border-color: var(--bubble-active-border);
}
.bubble-body { display: flex; flex-direction: column; gap: 4px; }
.bubble-star {
  display: flex;
  align-items: center;
  gap: 4px;
}
.star-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
}
.star-name {
  font-size: 0.7rem;
  font-family: var(--font-display);
  color: var(--hud-accent);
}
.new-tag {
  font-size: 0.55rem;
  background: var(--hud-accent);
  color: #07081a;
  padding: 1px 4px;
  border-radius: 2px;
  font-weight: 600;
}
.bubble-text {
  font-size: 0.7rem;
  line-height: 1.3;
  opacity: 0.9;
}
.size-s .bubble-text { font-size: 0.65rem; }
.size-l .bubble-text { font-size: 0.75rem; }
.bubble-meta {
  display: flex;
  gap: 10px;
  font-size: 0.6rem;
  opacity: 0.7;
  margin-top: 2px;
}
.bubble-meta span {
  display: flex;
  align-items: center;
  gap: 3px;
}
.bubble-tail {
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
}
</style>
