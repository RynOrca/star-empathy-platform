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

      <!-- 所有故事：发送者 + 共鸣按钮 -->
      <template v-if="variant === 'all'">
        <span v-if="story.username" class="story-sender">by {{ story.username }}</span>
        <span v-else class="story-sender is-anon">匿名星语</span>
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

    <!-- 合集 / 星星归属 + 标签行：左侧归属、右侧标签，同一行；两者都空时隐藏 -->
    <div
      v-if="(effectiveShowStarBelonging && starBelonging) || story.collectionName || displayTags.length"
      class="story-tags-row"
    >
      <!-- 星星归属（合集上下文：显示挂在哪颗星上） → 点击跳转 /sky?star=xxx -->
      <span
        v-if="effectiveShowStarBelonging && starBelonging && mainStarCatalogId != null"
        class="story-star-belong ssb-clickable"
        :style="{ '--ssb-c': starBelonging.color } as Record<string, string>"
        :title="`前往该星星：${starBelonging.name}`"
        @click.stop="goToStar(mainStarCatalogId)"
      >
        <StarIcon :size="11" class="ssb-icon" />
        <span class="ssb-name">{{ starBelonging.name }}</span>
        <span v-if="starBelonging.con" class="ssb-con">· {{ starBelonging.con }}</span>
      </span>
      <!-- 合集徽章（非合集上下文） -->
      <CollectionBadge
        v-else-if="story.collectionName"
        :collection-name="story.collectionName"
        :cover-color="story.collectionCoverColor ?? null"
        :collection-visibility="story.collectionVisibility ?? null"
        :clickable="!!story.collectionId && !!collectionClickable"
        @click="collectionClickable && $emit('collection-click', story)"
      />
      <!-- 分隔点：归属/合集和标签同时存在时 -->
      <span v-if="(effectiveShowStarBelonging ? !!starBelonging : !!story.collectionName) && displayTags.length" class="story-tag-sep"></span>
      <!-- 标签（右侧） -->
      <span
        v-for="t in displayTags"
        :key="'tag-' + story.id + '-' + t"
        class="story-tag story-tag-inline"
        :style="tagStyle(t)"
      >#{{ t }}</span>
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
import { Sparkles, Check, Eye, Star } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import CollectionBadge from '../CollectionBadge.vue'
import { getStarNameInfo } from '../../utils/starName'

const SparklesIcon = Sparkles
const CheckIcon = Check
const EyeIcon = Eye
const StarIcon = Star
const router = useRouter()
const route = useRoute()

const props = defineProps<{
  story: {
    id: number
    type?: 'history' | 'user' | string | null
    title: string | null
    imageUrl: string | null
    origin: string | null
    username: string | null
    tag: string | null
    tags?: string[] | null
    collectionId?: number | null
    collectionName?: string | null
    collectionCoverColor?: string | null
    collectionVisibility?: string | null
    catalogStarId?: number | null
    catalogStarIds?: number[]
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
  /** 合集 Badge 是否可点击打开合集详情；默认 false（仅展示） */
  collectionClickable?: boolean
  /** 合集上下文：显示星星归属（挂在哪颗星上）而非合集徽章 */
  showStarBelonging?: boolean
}>()

defineEmits<{
  click: []
  resonate: []
  'collection-click': [story: any]
}>()

/** 标签展示：优先 tags[]，空时退回 tag 单列（老数据兼容） */
const displayTags = computed<string[]>(() => {
  const arr = Array.isArray(props.story.tags) ? props.story.tags.filter((t) => !!t) : []
  if (arr.length) return arr.slice(0, 5)
  return props.story.tag ? [props.story.tag] : []
})

/** 星星归属：取主星 catalogStarId，否则 catalogStarIds[0]；查 stars.json/planets 取名+星座+颜色 */
const mainStarCatalogId = computed<number | null>(() => props.story.catalogStarId ?? props.story.catalogStarIds?.[0] ?? null)
const starBelonging = computed(() => {
  const id = mainStarCatalogId.value
  if (id == null) return null
  return getStarNameInfo(id) ?? null
})

/**
 * 「星星归属 vs 合集徽章」决策：
 * - 历史故事(type==='history')且有有效合集名 → 不显示星星归属，优先显示合集徽章
 * - 其他情况：遵循 props.showStarBelonging 传参（默认 false 显示合集徽章；合集上下文传 true 显示星星归属）
 */
const effectiveShowStarBelonging = computed<boolean>(() => {
  if (props.story.type === 'history' && props.story.collectionName) return false
  return !!props.showStarBelonging
})

/** 跳转星空页面并打开该星星详情（防止冒泡触发卡片 click）
 *  关键兜底：当前 fullPath 与目标完全一致时 Vue Router 不会二次导航，
 *  改为派发自定义事件 star-identity-click，让合集详情等监听方知道"重复点击了同星 → 要关闭/重聚焦"
 */
function goToStar(starId: number) {
  const target = `/sky?star=${encodeURIComponent(String(starId))}`
  if (route.fullPath !== target) {
    router.push({ path: '/sky', query: { star: String(starId) } })
  } else {
    window.dispatchEvent(new CustomEvent('star-identity-click', { detail: { starId } }))
  }
}

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

/* ── 开放标签通用样式（正文下方、meta 上方，紧凑分隔带） ── */
.story-tag {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 11px;
  font-size: 0.68rem;
  font-weight: 500;
  line-height: 1.45;
  letter-spacing: 0.01em;
  transition: transform .15s ease, filter .15s ease, opacity .15s ease;
  border: 0.5px solid transparent;
}
.story-tag:hover {
  filter: brightness(1.06);
  transform: translateY(-0.3px);
}
.story-tag-inline:first-child { margin-left: 0; }
.story-tags-row {
  display: flex; flex-wrap: wrap;
  align-items: center;
  gap: 4px 7px;
  margin-top: 6px;
  margin-bottom: 6px;
  padding: 6px 2px;
  border-top: 0.5px dashed var(--rule);
  border-bottom: 0.5px dashed var(--rule);
}

/* 合集与标签之间的竖线分隔 */
.story-tag-sep {
  width: 1px;
  height: 10px;
  background: rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
  margin: 0 2px;
}

/* ── 星星归属（合集上下文） ── */
.story-star-belong {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  padding: 2px 9px;
  border-radius: 11px;
  background: color-mix(in srgb, var(--ssb-c, #fff) 8%, transparent);
  border: 0.5px solid color-mix(in srgb, var(--ssb-c, #fff) 22%, transparent);
  color: var(--ssb-c, var(--ink-secondary));
  flex-shrink: 0;
  line-height: 1.45;
  transition: background 0.15s, border-color 0.15s, transform 0.12s, box-shadow 0.15s;
}
/* 可点击的星星归属徽章：cursor + hover 高亮（冒泡已 @click.stop 阻止） */
.story-star-belong.ssb-clickable { cursor: pointer; user-select: none; }
.story-star-belong.ssb-clickable:hover {
  background: color-mix(in srgb, var(--ssb-c, #fff) 14%, transparent);
  border-color: color-mix(in srgb, var(--ssb-c, #fff) 36%, transparent);
  box-shadow: 0 0 7px color-mix(in srgb, var(--ssb-c, #fff) 26%, transparent);
  transform: translateY(-0.5px);
}
.ssb-icon { opacity: 0.85; flex-shrink: 0; }
.ssb-name { font-weight: 500; }
.ssb-con { opacity: 0.6; font-size: 0.64rem; }

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