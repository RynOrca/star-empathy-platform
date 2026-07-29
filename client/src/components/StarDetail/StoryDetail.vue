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
        </div>
        <div class="detail-body">
          <div class="detail-content" v-html="renderedContent"></div>
          <img v-if="story.imageUrl" :src="story.imageUrl" class="detail-image" @click.stop />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Sparkles, Check, Trash2 } from 'lucide-vue-next'

const ArrowLeftIcon = ArrowLeft
const SparklesIcon = Sparkles
const CheckIcon = Check
const Trash2Icon = Trash2

defineProps<{
  story: {
    id: number
    title: string | null
    imageUrl: string | null
    userId: number | null
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
}>()

defineEmits<{
  back: []
  resonate: []
  delete: []
}>()
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
.detail-dist { color: var(--star-blue); }
.meta-near { color: var(--accent); font-weight: 500; }
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