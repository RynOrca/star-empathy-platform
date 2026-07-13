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
            <ArrowLeft :size="15" />
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
                  <component :is="justResonatedId === story.id ? Check : Sparkles" :size="13" />
                  <span>{{ justResonatedId === story.id ? '已共鸣' : '共鸣' }}</span>
                </button>
              </div>
              <p class="story-excerpt">{{ story.content }}</p>
              <div class="story-meta">
                <Sparkles :size="12" /> <span>{{ story.resonanceCount }}</span>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <Star :size="20" class="empty-icon" />
            <p>这颗星还在等待它的故事</p>
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
              <component :is="justResonatedId === detailStory.id ? Check : Sparkles" :size="16" />
              <span>{{ justResonatedId === detailStory.id ? '已共鸣' : '共鸣' }}</span>
              <span class="resonate-count">{{ detailStory.resonanceCount }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 右：恒星信息 -->
      <div class="panel panel-info">
        <button class="close-btn" @click="$emit('close')"><X :size="15" /></button>
        <div class="star-name">{{ starInfo?.displayName }}</div>
        <div class="star-meta" v-if="starInfo">{{ starInfo.con }} · {{ starInfo.mag.toFixed(1) }} 等星</div>

        <div class="info-section">
          <div class="info-label">标签</div>
          <div class="info-tags">
            <span class="tag" v-for="tag in generatedTags" :key="tag">{{ tag }}</span>
            <span v-if="generatedTags.length === 0" class="tag is-empty">暂无标签</span>
          </div>
        </div>

        <button class="write-btn" @click="onWriteStory"><PenSquare :size="14" /> 写我的故事</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Star, Sparkles, Check, PenSquare, X, ArrowLeft } from 'lucide-vue-next'

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
/* ─── Overlay ─── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 8, 22, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.15s ease-out;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ─── Container ─── */
.detail-wrap {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  width: 88vw;
  max-width: 1300px;
  animation: slideUp 0.2s ease-out;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Panel Base ─── */
.panel {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

/* ─── Left: Stories Panel (fixed height, scrollable) ─── */
.panel-stories {
  flex: 1;
  min-width: 0;
  height: 70vh;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--rule);
  flex-shrink: 0;
}
.panel-title {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--ink-secondary);
}
.panel-count {
  font-size: 0.75rem;
  color: var(--muted-light);
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 10px;
  border-radius: 10px;
  border: 1px solid var(--rule);
}

/* ─── Back Button ─── */
.back-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-family: var(--font);
  font-size: 0.82rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  transition: opacity 0.15s;
}
.back-btn:hover { opacity: 0.7; }

/* ─── Story List ─── */
.story-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.story-list::-webkit-scrollbar {
  width: 5px;
}
.story-list::-webkit-scrollbar-track {
  background: transparent;
}
.story-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.story-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.18);
}

/* ─── Story Card ─── */
.story-card {
  padding: 16px 20px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  transition: background 0.15s, border-color 0.15s;
  cursor: pointer;
}
.story-card:hover {
  border-color: var(--rule);
  background: rgba(255, 255, 255, 0.02);
}

.story-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 4px;
}
.story-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.4;
}

/* ─── Resonate Button ─── */
.resonate-btn {
  flex-shrink: 0;
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  background: var(--accent-subtle);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-size: 0.78rem;
  font-family: var(--font);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  gap: 5px;
}
.resonate-btn:hover:not(:disabled) {
  background: rgba(255, 217, 138, 0.15);
}
.resonate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.resonate-btn.done {
  border-color: rgba(149, 240, 192, 0.25);
  background: rgba(149, 240, 192, 0.08);
  color: var(--star-green);
}

.story-excerpt {
  margin: 0 0 8px;
  color: var(--ink-secondary);
  font-size: 0.85rem;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.story-meta {
  font-size: 0.75rem;
  color: var(--muted-light);
  display: flex;
  align-items: center;
  gap: 5px;
}

/* ─── Detail View ─── */
.detail-view {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.detail-view::-webkit-scrollbar {
  width: 5px;
}
.detail-view::-webkit-scrollbar-track {
  background: transparent;
}
.detail-view::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.detail-view::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.18);
}
.detail-title {
  margin: 0 0 16px;
  font-size: 1.08rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.5;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--rule);
}
.detail-body {
  flex: 1;
  color: var(--ink-secondary);
  font-size: 0.9rem;
  line-height: 1.85;
  white-space: pre-wrap;
}
.detail-footer {
  flex-shrink: 0;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--rule);
}
.detail-resonate {
  padding: 8px 16px;
  font-size: 0.85rem;
  gap: 6px;
}
.resonate-count {
  margin-left: 4px;
  opacity: 0.6;
  font-weight: 400;
}

/* ─── Empty State ─── */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--muted-light);
  font-size: 0.85rem;
}
.empty-icon { opacity: 0.2; }

/* ─── Right: Info Panel ─── */
.panel-info {
  width: 320px;
  flex-shrink: 0;
  padding: 24px;
  position: relative;
}
.star-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.02em;
  line-height: 1.3;
}
.star-meta {
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 2px;
}
.info-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--rule);
}
.info-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--muted);
  margin-bottom: 10px;
}
.info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag {
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--ink-secondary);
  border: 1px solid var(--rule);
}
.tag.is-empty {
  opacity: 0.3;
  font-style: italic;
}

/* ─── Write Button ─── */
.write-btn {
  margin-top: 20px;
  width: 100%;
  padding: 10px 0;
  border-radius: var(--radius-md);
  background: var(--accent);
  border: none;
  color: rgba(0, 0, 0, 0.75);
  font-family: var(--font);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.write-btn:hover {
  background: var(--accent-hover);
}
.write-btn:active {
  transform: scale(0.98);
}

/* ─── Close Button ─── */
.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  color: var(--muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  padding: 0;
}
.close-btn:hover {
  color: var(--ink);
  border-color: var(--rule-hover);
}
</style>
