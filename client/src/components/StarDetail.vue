<template>
  <div class="star-detail" :class="{ flip: isFlipped }" :style="cardStyle" ref="cardRef">
    <button class="close-btn" @click="$emit('close')">&times;</button>

    <!-- 恒星信息 -->
    <div v-if="starInfo" class="star-header">
      <div class="star-name">{{ starInfo.name || '未命名恒星' }}</div>
      <div class="star-meta">{{ starInfo.con }} · {{ starInfo.mag.toFixed(1) }} 等星</div>
    </div>

    <!-- 有故事 -->
    <template v-if="hasRealStory">
      <div v-if="realStories.length > 1" class="story-counter">
        <button class="nav-btn" :disabled="localIndex <= 0" @click="goTo(localIndex - 1)">‹</button>
        <span>{{ localIndex + 1 }} / {{ realStories.length }}</span>
        <button class="nav-btn" :disabled="localIndex >= realStories.length - 1" @click="goTo(localIndex + 1)">›</button>
      </div>

      <template v-if="currentReal">
        <h3 v-if="currentReal.title">{{ currentReal.title }}</h3>
        <h3 v-else class="anonymous">匿名心事</h3>
        <p class="content">{{ currentReal.content }}</p>
      </template>

      <div class="footer">
        <span class="resonance-count">{{ currentReal?.resonanceCount ?? 0 }} 次共鸣</span>
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
    </template>

    <!-- 无故事等待中 -->
    <div v-else class="no-story">
      <span class="no-story-icon">✦</span>
      <p>这颗星还在等待它的故事...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch } from 'vue'

const props = defineProps<{
  stories: Array<{ id: number; title: string | null; content: string; resonanceCount: number }>
  activeIndex: number
  starInfo: { name: string | null; con: string; mag: number } | null
  screenPos: { x: number; y: number }
  resonating: boolean
}>()

const emit = defineEmits<{
  switch: [index: number]
  resonate: [id: number]
  close: []
}>()

// 过滤出真实故事（排除占位符 id=-1）
const realStories = computed(() => props.stories.filter(s => s.id > 0))
const hasRealStory = computed(() => realStories.value.length > 0)
const localIndex = ref(0)
const currentReal = computed(() => realStories.value[localIndex.value] ?? null)

watch(() => props.activeIndex, (v) => { localIndex.value = v })
watch(() => props.stories, () => { localIndex.value = 0 })

function goTo(i: number) {
  localIndex.value = i
  emit('switch', i)
}

const isFlipped = ref(false)
const justResonated = ref(false)
const cardRef = ref<HTMLElement | null>(null)

const cardStyle = computed(() => ({
  left: `${props.screenPos.x}px`,
  top: `${props.screenPos.y}px`,
}))

onMounted(() => {
  nextTick(() => {
    const card = cardRef.value
    if (!card) return
    const rect = card.getBoundingClientRect()
    if (rect.top < 10) isFlipped.value = true
    if (rect.left < 10) card.style.left = `${props.screenPos.x + (10 - rect.left)}px`
    if (rect.right > window.innerWidth - 10) {
      card.style.left = `${props.screenPos.x - (rect.right - window.innerWidth + 10)}px`
    }
  })
})

function onResonate() {
  if (!currentReal.value) return
  emit('resonate', currentReal.value.id)
  justResonated.value = true
  setTimeout(() => { justResonated.value = false }, 2000)
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
.star-detail.flip {
  transform: translate(-50%, 20%);
  animation: floatInDown 0.3s ease;
}
@keyframes floatInDown {
  from { opacity: 0; transform: translate(-50%, 30%); }
  to { opacity: 1; transform: translate(-50%, 20%); }
}
.close-btn {
  position: absolute;
  top: 0.5rem; right: 0.7rem;
  background: none; border: none;
  color: var(--muted); font-size: 1.3rem;
  cursor: pointer; line-height: 1;
  transition: color 0.2s;
}
.close-btn:hover { color: var(--ink); }

/* 恒星头部 */
.star-header {
  margin-bottom: 0.6rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--rule);
}
.star-name {
  color: var(--accent);
  font-size: 1.05rem;
  font-weight: 500;
  letter-spacing: 0.03em;
}
.star-meta {
  font-size: 0.75rem;
  color: var(--muted);
  margin-top: 0.15rem;
  letter-spacing: 0.05em;
}

/* 故事计数器 */
.story-counter {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  color: var(--muted);
}
.nav-btn {
  background: none; border: 1px solid var(--rule);
  color: var(--ink);
  width: 24px; height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex; align-items: center; justify-content: center;
  transition: border-color 0.2s;
}
.nav-btn:hover:not(:disabled) { border-color: var(--accent); }
.nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }

h3 { color: var(--accent); margin-bottom: 0.4rem; font-size: 1.1rem; }
.anonymous { color: var(--star-blue); }
.content {
  color: var(--muted); line-height: 1.6; margin-bottom: 0.8rem;
  font-size: 0.93rem; max-height: 160px; overflow-y: auto;
}

/* 无故事状态 */
.no-story {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.8rem 0;
  color: var(--muted);
  font-style: italic;
  font-size: 0.9rem;
}
.no-story-icon {
  font-size: 1.2rem;
  opacity: 0.5;
}

.footer { display: flex; align-items: center; justify-content: space-between; }
.resonance-count { color: var(--muted); font-size: 0.85rem; }
.resonate-btn {
  padding: 0.4rem 1rem;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border: 1px solid var(--accent); border-radius: 16px;
  color: var(--accent); font-family: var(--font); font-size: 0.85rem;
  cursor: pointer; transition: background 0.3s, border-color 0.3s, color 0.3s;
  white-space: nowrap;
}
.resonate-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--accent) 30%, transparent); }
.resonate-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.resonate-btn.resonating { border-color: var(--accent2); color: var(--accent2); }
.resonate-btn.done { border-color: var(--star-green); color: var(--star-green); background: color-mix(in srgb, var(--star-green) 15%, transparent); }
</style>
