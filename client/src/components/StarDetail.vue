<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="star-detail" ref="cardRef">
    <button class="close-btn" @click="$emit('close')">&times;</button>

    <!-- 恒星信息 -->
    <div v-if="starInfo" class="star-header">
      <div class="star-name">{{ displayName }}</div>
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
    </div><!-- /star-detail -->
  </div><!-- /overlay -->
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch } from 'vue'

const props = defineProps<{
  stories: Array<{ id: number; title: string | null; content: string; resonanceCount: number }>
  activeIndex: number
  starInfo: { name: string | null; con: string; mag: number; ra: number; dec: number } | null
  resonating: boolean
}>()

const emit = defineEmits<{
  switch: [index: number]
  resonate: [id: number]
  close: []
}>()

// 恒星显示名：有名字用名字，没有则用天球坐标
const displayName = computed(() => {
  if (props.starInfo?.name) return props.starInfo.name
  if (!props.starInfo) return ''
  const { ra, dec } = props.starInfo
  const rh = Math.floor(ra)
  const rm = Math.floor((ra - rh) * 60)
  const ds = dec >= 0 ? '+' : '-'
  const dd = Math.floor(Math.abs(dec))
  const dm = Math.floor((Math.abs(dec) - dd) * 60)
  return `${rh}h${rm.toString().padStart(2,'0')}m · ${ds}${dd}°${dm.toString().padStart(2,'0')}′`
})

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

const justResonated = ref(false)
const cardRef = ref<HTMLElement | null>(null)

function onResonate() {
  if (!currentReal.value) return
  emit('resonate', currentReal.value.id)
  justResonated.value = true
  setTimeout(() => { justResonated.value = false }, 2000)
}
</script>

<style scoped>
/* 半透明背景遮罩 */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 8, 22, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: overlayIn 0.25s ease;
}
@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.star-detail {
  width: 360px;
  max-width: 90vw;
  max-height: 80vh;
  padding: 1.5rem 1.6rem;
  background: color-mix(in srgb, var(--bg2) 92%, transparent);
  border: 1px solid var(--rule);
  border-radius: 24px;
  backdrop-filter: blur(20px);
  box-shadow: 0 24px 64px var(--shadow);
  animation: cardIn 0.3s ease;
  overflow-y: auto;
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(16px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
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
