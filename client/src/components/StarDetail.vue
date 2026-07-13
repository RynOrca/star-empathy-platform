<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="detail-wrap">
      <!-- 左：故事面板 -->
      <div class="panel panel-stories">
        <!-- 列表标题 -->
        <div class="panel-header" v-if="!detailStory">
          <span class="panel-title">故事</span>
          <span class="panel-count" v-if="hasRealStory">{{ realStories.length }} 条</span>
        </div>
        <!-- 详情标题 -->
        <div class="panel-header" v-else>
          <button class="back-btn" @click="detailStoryId = null">
            <ArrowLeft :size="16" />
            <span>所有故事</span>
          </button>
        </div>

        <!-- ─── 列表视图 ─── -->
        <template v-if="!detailStoryId">
          <div v-if="hasRealStory" class="story-list">
            <div
              v-for="story in realStories"
              :key="story.id"
              class="story-card"
              @click="detailStoryId = story.id"
            >
              <div class="story-head">
                <h4 class="story-title">{{ story.title || '匿名心事' }}</h4>
                <button
                  class="resonate-btn"
                  :class="{ done: justResonatedId === story.id }"
                  :disabled="resonating"
                  @click.stop="onResonate(story)"
                >
                  <component :is="justResonatedId === story.id ? Check : Lightbulb" :size="14" />
                  <span>{{ justResonatedId === story.id ? '已共鸣' : '共鸣' }}</span>
                </button>
              </div>
              <p class="story-excerpt">{{ story.content }}</p>
              <div class="story-meta">
                <MessageSquare :size="13" /> <span>{{ story.resonanceCount }} 次共鸣</span>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <Star :size="22" class="empty-icon" />
            <p>这颗星还在等待它的故事...</p>
          </div>
        </template>

        <!-- ─── 详情视图 ─── -->
        <div v-else-if="detailStory" class="detail-view">
          <h2 class="detail-title">{{ detailStory.title || '匿名心事' }}</h2>
          <div class="detail-body">{{ detailStory.content }}</div>
          <div class="detail-footer">
            <button
              class="resonate-btn detail-resonate"
              :class="{ done: justResonatedId === detailStory.id }"
              :disabled="resonating"
              @click.stop="onResonate(detailStory)"
            >
              <component :is="justResonatedId === detailStory.id ? Check : Lightbulb" :size="16" />
              <span>{{ justResonatedId === detailStory.id ? '已共鸣' : '共鸣' }}</span>
              <span class="resonate-count">{{ detailStory.resonanceCount }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 右：恒星信息 -->
      <div class="panel panel-info">
        <div class="star-name">{{ starInfo?.displayName }}</div>
        <div class="star-meta" v-if="starInfo">{{ starInfo.con }} · {{ starInfo.mag.toFixed(1) }} 等星</div>

        <div class="info-section">
          <div class="info-label">标签</div>
          <div class="info-tags">
            <span class="tag" v-for="tag in generatedTags" :key="tag">{{ tag }}</span>
            <span v-if="generatedTags.length === 0" class="tag is-empty">暂无标签</span>
          </div>
        </div>

        <button class="write-btn" @click="onWriteStory"><PenSquare :size="15" /> 写我的故事</button>
        <button class="close-btn" @click="$emit('close')"><X :size="14" /></button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Star, Lightbulb, Check, MessageSquare, PenSquare, X, ArrowLeft } from 'lucide-vue-next'

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

const detailStoryId = ref<number | null>(null)
const detailStory = computed(() => {
  if (detailStoryId.value === null) return null
  return realStories.value.find(s => s.id === detailStoryId.value) ?? null
})
const justResonatedId = ref<number | null>(null)

function onResonate(story: { id: number; resonanceCount: number }) {
  emit('resonate', story.id)
  justResonatedId.value = story.id
  setTimeout(() => { justResonatedId.value = null }, 2000)
}

function onWriteStory() { emit('writeStory') }

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
/* ─── 遮罩 ─── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 8, 22, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.2s;
}
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

/* ─── 容器 ─── */
.detail-wrap {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  width: 80vw;
  max-width: 1160px;
  animation: slideUp 0.25s ease;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── 面板通用 ─── */
.panel {
  background: color-mix(in srgb, var(--bg2) 94%, transparent);
  border: 1px solid var(--rule);
  border-radius: 16px;
  backdrop-filter: blur(24px);
  box-shadow: 0 8px 32px var(--shadow);
}

/* ─── 左：故事面板 ─── */
.panel-stories {
  flex: 1;
  min-width: 0;
  height: 80vh;
  display: flex;
  flex-direction: column;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--rule);
  flex-shrink: 0;
}
.panel-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.panel-count {
  font-size: 0.75rem;
  color: var(--muted);
}
.story-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* ─── 返回按钮 ─── */
.back-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-family: var(--font);
  font-size: 0.82rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0;
  transition: opacity 0.15s;
}
.back-btn:hover { opacity: 0.7; }

/* 故事卡片 */
.story-card {
  padding: 1rem 1rem;
  border-radius: 12px;
  border: 1px solid transparent;
  background: color-mix(in srgb, var(--bg2) 50%, transparent);
  transition: border-color 0.2s, background 0.15s;
  cursor: pointer;
}
.story-card:hover {
  border-color: color-mix(in srgb, var(--accent) 25%, transparent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.story-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}
.story-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.4;
}
.resonate-btn {
  flex-shrink: 0;
  padding: 0.3rem 0.7rem;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  color: var(--accent);
  font-size: 0.78rem;
  font-family: var(--font);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.resonate-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
}
.resonate-btn.done {
  border-color: var(--star-green);
  color: var(--star-green);
}
.story-excerpt {
  margin: 0.25rem 0 0.5rem;
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.story-meta {
  font-size: 0.78rem;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

/* ─── 详情视图 ─── */
.detail-view {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
}
.detail-title {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.5;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--rule);
}
.detail-body {
  flex: 1;
  color: var(--muted);
  font-size: 0.92rem;
  line-height: 1.8;
  white-space: pre-wrap;
}
.detail-footer {
  flex-shrink: 0;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--rule);
}
.detail-resonate {
  padding: 0.5rem 1rem;
  font-size: 0.88rem;
  gap: 0.4rem;
}
.resonate-count {
  margin-left: 0.15rem;
  opacity: 0.65;
  font-weight: 400;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--muted);
  font-style: italic;
  font-size: 0.88rem;
}
.empty-icon { opacity: 0.3; }

/* ─── 右：信息面板 ─── */
.panel-info {
  width: 18rem;
  flex-shrink: 0;
  padding: 1.25rem;
  position: relative;
}
.star-name {
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 0.02em;
}
.star-meta {
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 0.2rem;
}
.info-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--rule);
}
.info-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin-bottom: 0.5rem;
}
.info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.tag {
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-size: 0.72rem;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: color-mix(in srgb, var(--accent) 70%, white);
  border: 1px solid color-mix(in srgb, var(--accent) 12%, transparent);
}
.tag.is-empty {
  opacity: 0.35;
  font-style: italic;
}

.write-btn {
  margin-top: 1rem;
  width: 100%;
  padding: 0.55rem 0;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
  color: var(--accent);
  font-family: var(--font);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}
.write-btn:hover {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
}

.close-btn {
  position: absolute;
  top: 0.6rem; right: 0.7rem;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 0.9rem;
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.15s;
  padding: 2px;
  line-height: 1;
}
.close-btn:hover { opacity: 0.8; }
</style>
