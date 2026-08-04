<template>
  <div>
    <div class="detail-toolbar">
      <button class="back-btn" @click="$emit('back')">
        <ArrowLeftIcon :size="15" />
        <span>{{ backLabel }}</span>
      </button>
      <div class="detail-actions">
        <button
          class="resonate-btn detail-resonate"
          :class="{ done: isResonated }"
          :disabled="resonating"
          @click.stop="$emit('resonate')"
        >
          <component :is="isResonated ? CheckIcon : SparklesIcon" :size="16" />
          <span>{{ isResonated ? '已共鸣' : '共鸣' }}</span>
          <span class="resonate-count">{{ displayResonance }}</span>
        </button>
        <button
          v-if="story.userId != null && story.userId === currentUserId"
          class="delete-story-btn"
          @click.stop="$emit('delete')"
          :disabled="deleting"
        >
          <Trash2Icon :size="14" />
          <span>删除</span>
        </button>
      </div>
    </div>
    <Transition name="detail" mode="out-in">
      <div :key="story.id" class="detail-view">
        <h2 class="detail-title">{{ story.title || '匿名心事' }}</h2>
        <div class="detail-info-bar">
          <span v-if="formattedTime">{{ formattedTime }}</span>
          <span v-if="formattedTime && formattedDistance?.text">·</span>
          <span v-if="formattedDistance?.text" class="detail-dist" :class="{ 'meta-near': formattedDistance.near }">{{ formattedDistance.text }}</span>
          <template v-if="story.username">
            <span class="meta-sep">·</span>
            <span class="detail-sender">by {{ story.username }}</span>
          </template>
          <template v-else-if="story.userId == null || (currentUserId != null && story.userId !== currentUserId)">
            <span class="meta-sep">·</span>
            <span class="detail-sender is-anon">匿名星语</span>
          </template>
        </div>
        <div class="detail-body">
          <div class="detail-content" v-html="renderedContent"></div>
          <img v-if="story.imageUrl" :src="story.imageUrl" class="detail-image" @click.stop />
        </div>
        <!-- 归属行：正文下方、标签行上方 -->
        <div v-if="(showStarBelonging && starBelonging) || story.collectionName" class="detail-collection-row">
          <!-- 星星归属（合集上下文：显示挂在哪颗星上） -->
          <span
            v-if="showStarBelonging && starBelonging"
            class="detail-star-belong"
            :style="{ '--dsb-c': starBelonging.color } as Record<string, string>"
          >
            <StarIcon :size="13" class="dsb-icon" />
            <span class="dsb-name">{{ starBelonging.name }}</span>
            <span v-if="starBelonging.con" class="dsb-con">· {{ starBelonging.con }}</span>
          </span>
          <!-- 合集徽章（非合集上下文） -->
          <CollectionBadge
            v-else-if="story.collectionName"
            :collection-name="story.collectionName"
            :cover-color="story.collectionCoverColor ?? null"
            :collection-visibility="story.collectionVisibility ?? null"
            :collection-story-count="story.collectionStoryCount ?? null"
            :clickable="!!story.collectionId && !!collectionClickable"
            size="md"
            @click="collectionClickable && $emit('collection-click', story)"
          />
        </div>
        <!-- 标签行：正文下方、统一视觉结构，空时隐藏 -->
        <div v-if="displayTags.length" class="detail-tags">
          <span
            v-for="t in displayTags"
            :key="'d-' + story.id + '-' + t"
            class="detail-tag"
            :style="tagStyle(t)"
          >#{{ t }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Sparkles, Check, Trash2, Star } from 'lucide-vue-next'
import { computed } from 'vue'
import CollectionBadge from '../CollectionBadge.vue'
import { getStarNameInfo } from '../../utils/starName'

const ArrowLeftIcon = ArrowLeft
const SparklesIcon = Sparkles
const CheckIcon = Check
const Trash2Icon = Trash2
const StarIcon = Star

const props = defineProps<{
  story: {
    id: number
    title: string | null
    imageUrl: string | null
    userId: number | null
    username: string | null
    tag: string | null
    tags?: string[] | null
    collectionId?: number | null
    collectionName?: string | null
    collectionCoverColor?: string | null
    collectionVisibility?: string | null
    collectionStoryCount?: number | null
    catalogStarId?: number | null
    catalogStarIds?: number[]
  }
  backLabel: string
  renderedContent: string
  displayResonance: number
  isResonated: boolean
  resonating: boolean
  deleting: boolean
  currentUserId: number | null
  formattedTime: string
  formattedDistance: { text: string; near: boolean } | null
  /** 合集 Badge 是否可点击打开合集详情；默认 false（仅展示） */
  collectionClickable?: boolean
  /** 合集上下文：显示星星归属（挂在哪颗星上）而非合集徽章 */
  showStarBelonging?: boolean
}>()

defineEmits<{
  back: []
  resonate: []
  delete: []
  'collection-click': [story: any]
}>()

/** 标签展示：优先 tags[]，空时退回 tag 单列（老数据兼容） */
const displayTags = computed<string[]>(() => {
  const arr = Array.isArray(props.story.tags) ? props.story.tags.filter((t) => !!t && typeof t === 'string') : []
  if (arr.length) return Array.from(new Set(arr)).slice(0, 5)
  return props.story.tag ? [props.story.tag] : []
})

/** 星星归属：取主星 catalogStarId，否则 catalogStarIds[0]；查 stars.json/planets 取名+星座+颜色 */
const starBelonging = computed(() => {
  const id = props.story.catalogStarId ?? props.story.catalogStarIds?.[0]
  if (id == null) return null
  return getStarNameInfo(id) ?? null
})

/** 开放标签 hash 染色：字符串 → 稳定 HSL 柔和色 */
function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return h
}
function tagStyle(tag: string): Record<string, string> {
  const h = Math.abs(hashCode(tag)) % 360
  const color = `hsl(${h} 62% 74%)`
  const border = `hsla(${h}, 62%, 74%, 0.24)`
  const bg = `hsla(${h}, 62%, 74%, 0.09)`
  return { color, borderColor: border, backgroundColor: bg, border: '0.5px solid ' + border }
}
</script>

<style scoped>
/* ─── Detail Toolbar ─── */
.detail-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--rule);
}
.detail-actions {
  display: flex;
  gap: 8px;
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

/* ─── Resonate Button (detail) ─── */
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
  transition: background var(--transition-fast), opacity var(--transition-fast), transform var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 5px;
}
.resonate-btn:hover:not(:disabled) {
  background: var(--accent-bg);
}
.resonate-btn:active:not(:disabled) {
  transform: scale(0.95);
}
.resonate-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
.resonate-btn.done {
  border-color: rgba(149, 240, 192, 0.25);
  background: rgba(149, 240, 192, 0.08);
  color: var(--star-green);
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

/* ─── Delete Story Button ─── */
.delete-story-btn {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: 1px solid rgba(255, 107, 138, 0.25);
  color: #ff6b8a;
  font-family: var(--font);
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background 0.15s, border-color 0.15s;
}
.delete-story-btn:hover:not(:disabled) {
  background: rgba(255, 107, 138, 0.08);
  border-color: rgba(255, 107, 138, 0.4);
}
.delete-story-btn:disabled {
  opacity: 0.5;
  cursor: wait;
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
  margin: 0 0 4px;
  font-size: 1.08rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.5;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--rule);
  word-break: break-word;
  overflow-wrap: break-word;
}
.detail-info-bar {
  font-size: 0.78rem;
  color: var(--muted-light);
  padding-top: 10px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.detail-info-bar span:nth-child(1n+3) { color: var(--star-blue); }
.detail-sender { color: #7a8cc0; opacity: 0.8; }
.detail-sender.is-anon { color: #5a5580; }
.detail-dist { color: var(--star-blue); }
.meta-near { color: var(--accent); font-weight: 500; }
.meta-sep { opacity: 0.4; }

/* ─── 详情标签行（正文下方，结构与 StoryCard 一致） ─── */
.detail-tags {
  display: flex; flex-wrap: wrap;
  align-items: center;
  gap: 4px 7px;
  margin-top: 12px;
  margin-bottom: 0;
  padding: 6px 2px;
  border-top: 0.5px dashed var(--rule);
  border-bottom: 0.5px dashed var(--rule);
}

/* ── 详情合集归属行（正文下方、标签行上方） ── */
.detail-collection-row {
  display: flex;
  align-items: center;
  margin-top: 10px;
  margin-bottom: 2px;
}

/* ── 详情星星归属（合集上下文） ── */
.detail-star-belong {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  padding: 4px 12px;
  border-radius: 100px;
  background: color-mix(in srgb, var(--dsb-c, #fff) 8%, transparent);
  border: 0.5px solid color-mix(in srgb, var(--dsb-c, #fff) 24%, transparent);
  color: var(--dsb-c, var(--ink-secondary));
  line-height: 1.5;
}
.dsb-icon { opacity: 0.85; flex-shrink: 0; }
.dsb-name { font-weight: 500; }
.dsb-con { opacity: 0.6; font-size: 0.7rem; }
.detail-tag {
  display: inline-block; padding: 2px 9px; border-radius: 11px;
  font-size: 0.68rem; font-weight: 500;
  line-height: 1.45; letter-spacing: 0.01em;
  transition: transform .15s ease, filter .15s ease, opacity .15s ease;
}
.detail-tag:hover { filter: brightness(1.08); transform: translateY(-0.3px); }

.detail-body {
  flex: 1;
  color: var(--ink-secondary);
  font-size: 0.9rem;
  line-height: 1.85;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
}

/* ─── Detail Image ─── */
.detail-image {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  border-radius: var(--radius-md);
  margin-top: 16px;
}

/* ─── Detail View Transition ─── */
.detail-enter-active { transition: opacity 0.2s ease-out, transform 0.2s ease-out; }
.detail-leave-active { transition: opacity 0.12s ease-in, transform 0.12s ease-in; }
.detail-enter-from { opacity: 0; transform: translateX(12px); }
.detail-leave-to { opacity: 0; transform: translateX(-8px); }

/* ─── Markdown 渲染样式 ─── */
.detail-content :deep(p) {
  margin: 0 0 0.8em;
  line-height: 1.75;
  color: var(--ink-secondary);
  font-size: 0.9rem;
}
.detail-content :deep(p:last-child) {
  margin-bottom: 0;
}
.detail-content :deep(em) {
  color: #c9b8e8;
}
.detail-content :deep(strong) {
  color: var(--ink);
}
.detail-content :deep(blockquote) {
  border-left: 2px solid rgba(255,255,255,0.15);
  padding-left: 14px;
  margin: 0.8em 0;
  color: var(--muted);
  font-style: italic;
}
.detail-content :deep(code) {
  background: rgba(255,255,255,0.06);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.82rem;
}
.detail-content :deep(a) {
  color: var(--accent);
  text-decoration: underline;
}
</style>