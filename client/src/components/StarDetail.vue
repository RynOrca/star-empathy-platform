<template>
  <div class="star-detail" :style="cardStyle">
    <button class="close-btn" @click="$emit('close')">&times;</button>
    <h3 v-if="star.title">{{ star.title }}</h3>
    <h3 v-else class="anonymous">匿名心事</h3>
    <p class="content">{{ star.content }}</p>
    <div class="footer">
      <span class="resonance-count">{{ star.resonanceCount }} 次共鸣</span>
      <button class="resonate-btn" @click="onResonate">
        我也感同身受
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  star: any
  screenPos: { x: number; y: number }
}>()

const emit = defineEmits<{
  resonate: [id: number]
  close: []
}>()

const cardStyle = computed(() => ({
  left: `${props.screenPos.x}px`,
  top: `${props.screenPos.y}px`,
}))

function onResonate() {
  emit('resonate', props.star.id)
}
</script>

<style scoped>
.star-detail {
  position: fixed;
  transform: translate(-50%, -120%);
  max-width: 320px;
  padding: 1.2rem 1.4rem;
  background: color-mix(in srgb, var(--bg2) 85%, transparent);
  border: 1px solid var(--rule);
  border-radius: 22px;
  backdrop-filter: blur(14px);
  box-shadow: 0 16px 48px var(--shadow);
  z-index: 20;
}
.close-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.7rem;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 1.3rem;
  cursor: pointer;
}
h3 { color: var(--accent); margin-bottom: 0.4rem; }
.anonymous { color: var(--star-blue); }
.content { color: var(--muted); line-height: 1.6; margin-bottom: 0.8rem; }
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.resonance-count { color: var(--muted); font-size: 0.85rem; }
.resonate-btn {
  padding: 0.4rem 1rem;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border: 1px solid var(--accent);
  border-radius: 16px;
  color: var(--accent);
  font-family: var(--font);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.3s;
}
.resonate-btn:hover {
  background: color-mix(in srgb, var(--accent) 30%, transparent);
}
</style>
