<template>
  <div class="star-detail" :style="cardStyle" ref="cardRef">
    <button class="close-btn" @click="$emit('close')">&times;</button>
    <h3 v-if="star.title">{{ star.title }}</h3>
    <h3 v-else class="anonymous">匿名心事</h3>
    <p class="content">{{ star.content }}</p>
    <div class="footer">
      <span class="resonance-count">{{ star.resonanceCount }} 次共鸣</span>
      <button
        class="resonate-btn"
        :class="{ resonating: resonating, done: justResonated }"
        :disabled="resonating"
        @click="onResonate"
      >
        <span v-if="resonating">点亮中...</span>
        <span v-else-if="justResonated">✓ 已共鸣</span>
        <span v-else>我也感同身受</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  star: {
    id: number
    type: string
    title: string | null
    content: string
    resonanceCount: number
  }
  screenPos: { x: number; y: number }
  resonating: boolean
}>()

const emit = defineEmits<{
  resonate: [id: number]
  close: []
}>()

const justResonated = ref(false)
const cardRef = ref<HTMLElement | null>(null)

const cardStyle = computed(() => {
  let left = props.screenPos.x
  let top = props.screenPos.y

  // 边界检测在 mounted 后做，这里先用近似值
  // transform: translate(-50%, -120%) 把卡片放在星星上方
  // 如果卡超出视口，做翻转
  return {
    left: `${left}px`,
    top: `${top}px`,
  }
})

function onResonate() {
  emit('resonate', props.star.id)
  justResonated.value = true
  setTimeout(() => {
    justResonated.value = false
  }, 2000)
}
</script>

<style scoped>
.star-detail {
  position: fixed;
  transform: translate(-50%, -120%);
  max-width: 320px;
  min-width: 220px;
  padding: 1.2rem 1.4rem;
  background: color-mix(in srgb, var(--bg2) 85%, transparent);
  border: 1px solid var(--rule);
  border-radius: 22px;
  backdrop-filter: blur(14px);
  box-shadow: 0 16px 48px var(--shadow);
  z-index: 20;
  animation: floatIn 0.3s ease;
}
@keyframes floatIn {
  from { opacity: 0; transform: translate(-50%, -110%); }
  to { opacity: 1; transform: translate(-50%, -120%); }
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
  line-height: 1;
  transition: color 0.2s;
}
.close-btn:hover { color: var(--ink); }
h3 { color: var(--accent); margin-bottom: 0.4rem; font-size: 1.1rem; }
.anonymous { color: var(--star-blue); }
.content {
  color: var(--muted);
  line-height: 1.6;
  margin-bottom: 0.8rem;
  font-size: 0.93rem;
  max-height: 160px;
  overflow-y: auto;
}
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
  transition: background 0.3s, border-color 0.3s, color 0.3s;
  white-space: nowrap;
}
.resonate-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 30%, transparent);
}
.resonate-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.resonate-btn.resonating { border-color: var(--accent2); color: var(--accent2); }
.resonate-btn.done {
  border-color: var(--star-green);
  color: var(--star-green);
  background: color-mix(in srgb, var(--star-green) 15%, transparent);
}
</style>
