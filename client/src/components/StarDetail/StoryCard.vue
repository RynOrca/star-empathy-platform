<template>
  <div
    class="story-card"
    :style="{ animationDelay: `${index * 30}ms` }"
    @click="$emit('click')"
  >
    <div class="story-head">
      <h4 class="story-title">{{ story.title || '匿名心事' }}</h4>

      <!-- 历史故事：来源标签 -->
      <span v-if="variant === 'history' && story.origin" class="story-origin">{{ story.origin }}</span>

      <!-- 所有故事：发送者 + 情绪标签 + 共鸣按钮 -->
      <template v-if="variant === 'all'">
        <span v-if="story.username" class="story-sender">by {{ story.username }}</span>
        <span v-else class="story-sender is-anon">匿名星语</span>
        <span v-if="story.tag" class="story-tag" :style="tagStyle(story.tag)">{{ story.tag }}</span>
        <button
          class="resonate-btn"
          :class="{ done: isResonated }"
          :disabled="resonating"
          @click.stop="$emit('resonate')"
        >
          <component :is="isResonated ? CheckIcon : SparklesIcon" :size="13" />
          <span>{{ isResonated ? '已共鸣' : '共鸣' }}</span>
        </button>
      </template>

      <!-- 我的故事：共鸣按钮 -->
      <button
        v-if="variant === 'mine'"
        class="resonate-btn"
        :class="{ done: isResonated }"
        :disabled="resonating"
        @click.stop="$emit('resonate')"
      >
        <component :is="isResonated ? CheckIcon : SparklesIcon" :size="13" />
        <span>{{ isResonated ? '已共鸣' : '共鸣' }}</span>
      </button>
    </div>

    <div class="story-body">
      <div class="story-excerpt" v-html="renderedContent"></div>
      <img v-if="story.imageUrl" :src="story.imageUrl" class="story-image" @click.stop />
    </div>

    <div class="story-meta">
      <!-- 历史故事元信息 -->
      <template v-if="variant === 'history'">
        <span class="meta-history">来自星河</span>
        <span class="meta-sep">·</span>
        <SparklesIcon :size="12" /> <span>{{ displayResonance }}</span>
        <span class="meta-sep">·</span>
        <EyeIcon :size="11" /> <span>{{ displayViews }}</span>
      </template>

      <!-- 所有故事 / 我的故事元信息 -->
      <template v-else>
        <span v-if="formattedTime" class="meta-time">{{ formattedTime }}</span>
        <span v-if="formattedTime && formattedDistance?.text" class="meta-sep">·</span>
        <span v-if="formattedDistance?.text" class="meta-dist" :class="{ 'meta-near': formattedDistance.near }">{{ formattedDistance.text }}</span>
        <span class="meta-sep">·</span>
        <SparklesIcon :size="12" /> <span>{{ displayResonance }}</span>
        <span class="meta-sep">·</span>
        <EyeIcon :size="11" /> <span>{{ displayViews }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkles, Check, Eye } from 'lucide-vue-next'

const SparklesIcon = Sparkles
const CheckIcon = Check
const EyeIcon = Eye

defineProps<{
  story: {
    id: number
    title: string | null
    imageUrl: string | null
    origin: string | null
    username: string | null
    tag: string | null
  }
  variant: 'history' | 'all' | 'mine'
  renderedContent: string
  displayResonance: number
  displayViews: number
  isResonated: boolean
  resonating: boolean
  formattedTime?: string
  formattedDistance?: { text: string; near: boolean } | null
  index: number
}>()

defineEmits<{
  click: []
  resonate: []
}>()

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
  const bg = `hsla(${h}, 62%, 74%, 0.07)`
  return { color, borderColor: border, backgroundColor: bg, border: '0.5px solid ' + border }
}
</script>

<style scoped>
/* ─── Story Card ─── */
.story-card {
  padding: 16px 20px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
  cursor: pointer;
  animation: cardIn 0.25s ease-out both;
}
.story-card:hover {
  border-color: var(--rule);
  background: var(--overlay-02);
}
.story-card:active {
  transform: scale(0.99);
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
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
  word-break: break-word;
  overflow-wrap: break-word;
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

.story-excerpt {
  margin: 0 0 8px;
  color: var(--ink-secondary);
  font-size: 0.85rem;
  line-height: 1.6;
  word-break: break-word;
  overflow-wrap: break-word;
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
.meta-time { color: var(--muted-light); }
.meta-dist { color: var(--star-blue); }
.meta-near { color: var(--accent); font-weight: 500; }
.meta-sep { opacity: 0.4; }
.meta-history {
  font-size: 0.72rem;
  padding: 1px 7px;
  border-radius: 4px;
  background: rgba(202, 167, 255, 0.1);
  border: 1px solid var(--border-default);
  color: var(--star-purple);
}

.story-origin {
  font-size: 0.7rem;
  color: var(--star-purple);
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(202, 167, 255, 0.08);
  flex-shrink: 0;
}

/* ── 发送者 ── */
.story-sender {
  display: inline-block; font-size: 0.72rem; color: #7a8cc0;
  margin-left: auto; opacity: 0.7;
}
.story-sender.is-anon { color: #5a5580; }

/* ── 开放标签通用样式（旧 5 色保留向后兼容，但不再单独写 class） ── */
.story-tag {
  display: inline-block; padding: 2px 8px; border-radius: 10px;
  font-size: 0.7rem; font-weight: 500; margin-left: 4px;
  line-height: 1.4;
  transition: all .15s ease;
}

/* ─── Story Image ─── */
.story-image {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  margin-top: 10px;
}

/* ─── Markdown 渲染样式 ─── */
.story-excerpt :deep(p) {
  margin: 0 0 0.5em;
  line-height: 1.6;
  color: var(--ink-secondary);
  font-size: 0.84rem;
}
.story-excerpt :deep(p:last-child) {
  margin-bottom: 0;
}
.story-excerpt :deep(em) {
  color: #c9b8e8;
}
.story-excerpt :deep(strong) {
  color: var(--ink);
}
.story-excerpt :deep(blockquote) {
  border-left: 2px solid rgba(255,255,255,0.15);
  padding-left: 12px;
  margin: 0.5em 0;
  color: var(--muted);
  font-style: italic;
}
.story-excerpt :deep(code) {
  background: rgba(255,255,255,0.06);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.8rem;
}
.story-excerpt :deep(a) {
  color: var(--accent);
  text-decoration: underline;
}
</style>