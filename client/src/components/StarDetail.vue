<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="star-detail-wrap">
    <!-- 左：故事列表 -->
    <div class="card card-stories">
      <div v-if="hasRealStory" class="story-list">
        <div
          v-for="(story, i) in realStories"
          :key="story.id"
          class="story-item"
          :class="{ active: localIndex === i }"
          @click="goTo(i)"
        >
          <div class="story-head">
            <span class="story-title">{{ story.title || '匿名心事' }}</span>
            <button
              class="resonate-btn"
              :class="{ done: justResonatedId === story.id }"
              :disabled="resonating"
              @click.stop="onResonate(story)"
            >
              {{ justResonatedId === story.id ? '✓' : '💡' }}
            </button>
          </div>
          <p class="story-content">{{ story.content }}</p>
          <div class="story-meta">
            <span class="resonance">💬 {{ story.resonanceCount }}</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>✦ 这颗星还在等待它的故事...</p>
      </div>
    </div>

    <!-- 右：恒星信息 -->
    <div class="card card-info">
      <div class="star-name">{{ starInfo?.displayName }}</div>
      <div class="star-meta" v-if="starInfo">
        {{ starInfo.con }} · {{ starInfo.mag.toFixed(1) }} 等星
      </div>
      <div class="divider"></div>
      <div class="section-label">标签</div>
      <div class="tag-list">
        <span class="tag" v-for="tag in generatedTags" :key="tag">{{ tag }}</span>
        <span v-if="generatedTags.length === 0" class="tag dim">暂无</span>
      </div>
      <div class="divider"></div>
      <button class="write-btn" @click="onWriteStory">✎ 写我的故事</button>
      <button class="close-card" @click="$emit('close')">✕</button>
    </div>
    </div><!-- /star-detail-wrap -->
  </div><!-- /overlay -->
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  stories: Array<{ id: number; title: string | null; content: string; resonanceCount: number }>
  activeIndex: number
  starInfo: { displayName: string; con: string; mag: number } | null
  resonating: boolean
}>()

const emit = defineEmits<{
  switch: [index: number]
  resonate: [id: number]
  close: []
  writeStory: []
}>()

const realStories = computed(() => props.stories.filter(s => s.id > 0))
const hasRealStory = computed(() => realStories.value.length > 0)

const localIndex = ref(0)
const justResonatedId = ref<number | null>(null)

function goTo(i: number) {
  localIndex.value = i
  emit('switch', i)
}

function onResonate(story: { id: number }) {
  emit('resonate', story.id)
  justResonatedId.value = story.id
  setTimeout(() => { justResonatedId.value = null }, 2000)
}

function onWriteStory() {
  emit('writeStory')
}

// 点遮罩关闭（模板中 @click.self 处理）

// 自动标签
const generatedTags = computed<string[]>(() => {
  if (!hasRealStory.value) return []
  const all = realStories.value.map(s => (s.title || '') + ' ' + s.content).join(' ')
  const tags: string[] = []
  if (/月|嫦娥|广寒/.test(all)) tags.push('月亮')
  if (/星|天狼|织女|银河/.test(all)) tags.push('星辰')
  if (/爱|恋|相思/.test(all)) tags.push('思念')
  if (/独|孤|寂|一人/.test(all)) tags.push('孤独')
  if (/梦|想/.test(all)) tags.push('梦想')
  if (/家|乡|故/.test(all)) tags.push('思乡')
  if (/毕业|青春/.test(all)) tags.push('青春')
  if (tags.length === 0) tags.push('星空')
  return [...new Set(tags)].slice(0, 5)
})
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 8, 22, 0.5);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: overlayIn 0.2s ease;
}
@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.star-detail-wrap {
  display: flex;
  gap: 0.6rem;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

/* ─── 卡片通用 ─── */
.card {
  background: color-mix(in srgb, var(--bg2) 92%, transparent);
  border: 1px solid var(--rule);
  border-radius: 16px;
  backdrop-filter: blur(20px);
  box-shadow: 0 16px 48px var(--shadow);
  overflow: hidden;
}

/* ─── 左：故事卡片 ─── */
.card-stories {
  width: 340px;
  max-height: 420px;
  overflow-y: auto;
  padding: 0.6rem;
}
.story-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.story-item {
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.story-item:hover,
.story-item.active {
  border-color: color-mix(in srgb, var(--accent) 25%, transparent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.story-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.2rem;
}
.story-title {
  color: var(--ink);
  font-size: 0.85rem;
  font-weight: 500;
}
.resonate-btn {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  color: var(--accent);
  cursor: pointer;
  font-size: 0.8rem;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
}
.resonate-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
}
.resonate-btn.done {
  border-color: var(--star-green);
  color: var(--star-green);
}
.story-content {
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0 0 0.3rem;
}
.story-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.resonance {
  color: var(--muted);
  font-size: 0.72rem;
}

/* ─── 空状态 ─── */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
  color: var(--muted);
  font-style: italic;
  font-size: 0.82rem;
}

/* ─── 右：信息卡片 ─── */
.card-info {
  width: 200px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  position: relative;
}
.star-name {
  color: var(--accent);
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}
.star-meta {
  font-size: 0.75rem;
  color: var(--muted);
  margin-top: 0.15rem;
}
.divider {
  height: 1px;
  background: var(--rule);
  margin: 0.7rem 0;
}
.section-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin-bottom: 0.4rem;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.tag {
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: color-mix(in srgb, var(--accent) 75%, white);
  border: 1px solid color-mix(in srgb, var(--accent) 12%, transparent);
}
.tag.dim { opacity: 0.35; font-style: italic; }

.write-btn {
  margin-top: auto;
  padding: 0.5rem 0;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  color: var(--accent);
  font-family: var(--font);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.2s;
  text-align: center;
}
.write-btn:hover {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
}

.close-card {
  position: absolute;
  top: 0.5rem; right: 0.6rem;
  background: none; border: none;
  color: var(--muted);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 2px;
  line-height: 1;
  opacity: 0.5;
  transition: opacity 0.2s;
}
.close-card:hover { opacity: 1; }
</style>
