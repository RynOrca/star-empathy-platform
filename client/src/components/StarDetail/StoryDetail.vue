<template>
  <div class="story-detail-root">
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
          <!-- 历史故事：不显示无意义的入库时间和随机地点 -->
          <template v-if="story.type !== 'history'">
            <span v-if="formattedTime" :title="preciseTime">{{ formattedTime }}</span>
            <span v-if="formattedTime && (formattedDistance?.text || origin)">·</span>
            <span v-if="formattedDistance?.text" class="detail-dist" :class="{ 'meta-near': formattedDistance.near }">{{ formattedDistance.text }}</span>
          </template>
          <span v-if="(story.type === 'history' ? !!origin : (formattedTime || formattedDistance?.text)) && origin" class="detail-origin">
            <BookOpenIcon :size="11" />
            <span>{{ origin }}</span>
          </span>
          <template v-if="story.type === 'history'">
            <!-- 历史故事统一作者：古人 -->
            <span v-if="origin" class="meta-sep">·</span>
            <span class="detail-sender is-ancient">古人</span>
          </template>
          <template v-else-if="story.authorHidden">
            <span class="meta-sep">·</span>
            <span class="detail-sender is-anon">匿名观星者</span>
          </template>
          <template v-else-if="story.username">
            <span class="meta-sep">·</span>
            <span class="detail-sender">by {{ story.username }}</span>
          </template>
          <template v-else-if="story.userId == null || (currentUserId != null && story.userId !== currentUserId)">
            <span class="meta-sep">·</span>
            <span class="detail-sender is-anon">匿名星语</span>
          </template>
        </div>

        <!-- 标题与正文之间：一行简洁的文字meta（字数·阅读·浏览·共鸣数） -->
        <div class="detail-meta-text">
          <span class="dmt-item">
            <PenLineIcon :size="11" />
            <span>共 <em class="tabular">{{ stats.wordCount }}</em> 字</span>
          </span>
          <span class="dmt-sep">·</span>
          <span class="dmt-item">
            <ClockMiniIcon :size="11" />
            <span>约 <em class="tabular">{{ stats.readingTime }}</em> 分钟阅读</span>
          </span>
          <span class="dmt-sep">·</span>
          <span class="dmt-item">
            <EyeIcon :size="11" />
            <span><em class="tabular">{{ viewCount }}</em> 次浏览</span>
          </span>
          <span class="dmt-sep">·</span>
          <span class="dmt-item">
            <SparklesIcon :size="11" />
            <span><em class="tabular">{{ displayResonance }}</em> 次共鸣</span>
          </span>
        </div>

        <div class="detail-body">
          <div class="detail-content" v-html="renderedContent"></div>
          <img v-if="story.imageUrl" :src="story.imageUrl" class="detail-image" @click.stop />
        </div>

        <!-- 归属行：正文下方、标签行上方 -->
        <div v-if="(showStarBelonging && starBelonging) || story.collectionName" class="detail-collection-row">
          <!-- 星星归属（合集上下文：显示挂在哪颗星上） → 点击跳转 /sky?star=xxx -->
          <span
            v-if="showStarBelonging && starBelonging && mainStarCatalogId != null"
            class="detail-star-belong dsb-clickable"
            :style="{ '--dsb-c': starBelonging.color } as Record<string, string>"
            :title="`前往该星星：${starBelonging.name}`"
            @click.stop="goToStar(mainStarCatalogId)"
          >
            <StarIcon :size="13" class="dsb-icon" />
            <span class="dsb-name">{{ starBelonging.name }}</span>
            <span v-if="starBelonging.con" class="dsb-con">· {{ starBelonging.con }}</span>
            <span v-if="starBelonging.mag != null" class="dsb-mag">m<sub>{{ starBelonging.mag.toFixed(1) }}</sub></span>
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

        <!-- ═══ 同星其他故事推荐（空时隐藏） ═══ -->
        <div v-if="siblingStories?.length" class="detail-siblings">
          <header class="dsib-head">
            <span class="dsib-dot" />
            <span class="dsib-title">挂在同颗星的心事</span>
            <span class="dsib-count">{{ siblingStories.length }} 则</span>
          </header>
          <div class="dsib-list">
            <button
              v-for="s in siblingStories"
              :key="'sb-' + s.id"
              class="dsib-card"
              :title="s.contentPreview"
              @click.stop="$emit('open-story', s.id)"
            >
              <div class="dsib-card-head">
                <span v-if="s.type === 'history'" class="dsib-tag dsib-tag-old">古籍</span>
                <span v-else-if="s.isNew" class="dsib-tag dsib-tag-new">新</span>
                <span v-else class="dsib-tag" />
                <h5 class="dsib-card-title">{{ s.title || '匿名心事' }}</h5>
              </div>
              <p class="dsib-card-preview">{{ s.contentPreview }}</p>
              <footer class="dsib-card-foot">
                <span class="dsib-meta"><SparklesIcon :size="10" /> {{ s.resonanceCount }}</span>
                <span class="dsib-meta"><EyeIcon :size="10" /> {{ s.viewCount }}</span>
              </footer>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Sparkles, Check, Trash2, Star, BookOpen, Eye, PenLine, Clock } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import CollectionBadge from '../CollectionBadge.vue'
import { getStarNameInfo } from '../../utils/starName'

const ArrowLeftIcon = ArrowLeft
const SparklesIcon = Sparkles
const CheckIcon = Check
const Trash2Icon = Trash2
const StarIcon = Star
const BookOpenIcon = BookOpen
const EyeIcon = Eye
const PenLineIcon = PenLine
const ClockMiniIcon = Clock
const router = useRouter()
const route = useRoute()

export interface SiblingStoryPreview {
  id: number
  title: string | null
  type: 'history' | 'user'
  isNew?: boolean
  resonanceCount: number
  viewCount: number
  contentPreview: string
}

const props = defineProps<{
  story: {
    id: number
    type?: 'history' | 'user' | string | null
    title: string | null
    imageUrl: string | null
    userId: number | null
    username: string | null
    /** 合集级匿名 or 单篇 is_anonymous：对外隐藏作者，作者本人/管理员可见 true 时不显示真实作者名 */
    authorHidden?: boolean
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
  /** 浏览量（新增） */
  viewCount?: number
  /** 故事来源，如「全唐诗」「史记」等（新增） */
  origin?: string | null
  /** 原始创建时间 ISO，用于精确时间 tooltip（新增） */
  createdAtIso?: string | null
  /** 同星其他故事推荐（新增） */
  siblingStories?: SiblingStoryPreview[]
}>()

defineEmits<{
  back: []
  resonate: []
  delete: []
  'collection-click': [story: any]
  /** 打开同星其他故事详情（新增） */
  'open-story': [id: number]
}>()

/** 标签展示：优先 tags[]，空时退回 tag 单列（老数据兼容） */
const displayTags = computed<string[]>(() => {
  const arr = Array.isArray(props.story.tags) ? props.story.tags.filter((t) => !!t && typeof t === 'string') : []
  if (arr.length) return Array.from(new Set(arr)).slice(0, 5)
  return props.story.tag ? [props.story.tag] : []
})

/** 星星归属：取主星 catalogStarId，否则 catalogStarIds[0]；查 stars.json/planets 取名+星座+颜色+星等 */
const mainStarCatalogId = computed<number | null>(() => props.story.catalogStarId ?? props.story.catalogStarIds?.[0] ?? null)
const starBelonging = computed(() => {
  const id = mainStarCatalogId.value
  if (id == null) return null
  return getStarNameInfo(id) ?? null
})

/** 精确时间（hover tooltip） */
const preciseTime = computed<string>(() => {
  const iso = props.createdAtIso
  if (!iso) return props.formattedTime
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return props.formattedTime
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return props.formattedTime
  }
})

/** 故事数据统计：字数 / 阅读时长 / 共鸣率 等 */
const stats = computed<{
  wordCount: number
  readingTime: number
  resonanceRate: string
  rateColor: string
}>(() => {
  // 从 renderedContent（HTML）剥离标签估字数；优先用纯文本 content 的长度（但这里拿不到，故用 renderedContent 估计）
  const text = (props.renderedContent ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, '')
  const wordCount = Math.max(1, text.length)
  // 平均中文阅读 450 字/分钟，最少 1 分钟向上取整
  const readingTime = Math.max(1, Math.ceil(wordCount / 450))
  // 共鸣率 = 共鸣数 / max(浏览数, 共鸣数+1)，避免无浏览时除以 0 或 >100%
  const v = Math.max(0, Number(props.viewCount) || 0)
  const r = Math.max(0, Number(props.displayResonance) || 0)
  const denom = Math.max(v, r + 1, 1)
  const rate = Math.min(100, (r / denom) * 100)
  let resonanceRate: string
  if (rate < 0.1) resonanceRate = '0.1'
  else if (rate >= 10) resonanceRate = rate.toFixed(0)
  else resonanceRate = rate.toFixed(1)
  // 颜色分级：<1% muted，1-3% 蓝色，3-8% 金色，>8% 珊瑚红（高共鸣）
  let rateColor = 'var(--muted)'
  if (rate >= 1) rateColor = 'var(--star-blue)'
  if (rate >= 3) rateColor = 'var(--accent)'
  if (rate >= 8) rateColor = 'var(--star-red)'
  return { wordCount, readingTime, resonanceRate, rateColor }
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
  const bg = `hsla(${h}, 62%, 74%, 0.09)`
  return { color, borderColor: border, backgroundColor: bg, border: '0.5px solid ' + border }
}
</script>

<style scoped>
/* ─── 根容器：填满父级 tab-content 的 flex 空间，内部再分 toolbar + 滚动区 ─── */
.story-detail-root {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

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
  min-height: 0;
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
.detail-sender.is-ancient { color: var(--star-purple); font-weight: 500; opacity: 0.95; }
.detail-dist { color: var(--star-blue); }
.meta-near { color: var(--accent); font-weight: 500; }
.meta-sep { opacity: 0.4; }

/* ─── 来源标签（古籍/典籍） ─── */
.detail-origin {
  display: inline-flex;
  align-items: center;
  gap: 3.5px;
  padding: 1.5px 7px;
  border-radius: 5px;
  background: rgba(202, 167, 255, 0.08);
  border: 0.5px solid rgba(202, 167, 255, 0.22);
  color: var(--star-purple);
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.5;
  opacity: 0.95;
}
.detail-origin span { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ─── tabular 数字字体（统计指标用） ─── */
.tabular { font-variant-numeric: tabular-nums; }

/* ─── 正文下方：简洁文字形式的 meta 行（字数·阅读·浏览·共鸣率） ─── */
.detail-meta-text {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 9px;
  margin-top: 14px;
  margin-bottom: 6px;
  padding: 8px 12px;
  font-size: 0.76rem;
  color: var(--muted-light);
  line-height: 1.7;
  background: var(--overlay-02);
  border: 0.5px solid var(--rule);
  border-radius: var(--radius-md);
}
.dmt-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dmt-item em {
  font-style: normal;
  font-weight: 600;
  color: var(--ink-secondary);
}
.dmt-sep {
  opacity: 0.35;
}

/* ── 详情星星归属 · 星等（新增） ── */
.dsb-mag {
  font-size: 0.62rem;
  opacity: 0.65;
  margin-left: 2px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.dsb-mag sub { bottom: -0.1em; font-size: 0.85em; margin-left: 1px; }

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
  transition: background 0.15s, border-color 0.15s, transform 0.12s, box-shadow 0.15s;
}
/* 可点击跳转：cursor + hover 发光 + 轻微上浮（冒泡已 @click.stop 阻止） */
.detail-star-belong.dsb-clickable { cursor: pointer; user-select: none; }
.detail-star-belong.dsb-clickable:hover {
  background: color-mix(in srgb, var(--dsb-c, #fff) 14%, transparent);
  border-color: color-mix(in srgb, var(--dsb-c, #fff) 36%, transparent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--dsb-c, #fff) 26%, transparent);
  transform: translateY(-0.5px);
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

/* ═══ 同星其他故事推荐 ═══ */
.detail-siblings {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--rule);
}
.dsib-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.dsib-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent) 0%, var(--star-purple) 100%);
  box-shadow: 0 0 6px rgba(255, 217, 138, 0.35);
  flex-shrink: 0;
}
.dsib-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.04em;
  flex: 1;
}
.dsib-count {
  font-size: 0.7rem;
  color: var(--muted-light);
  font-variant-numeric: tabular-nums;
  padding: 2px 8px;
  border-radius: 100px;
  background: var(--overlay-02);
  border: 0.5px solid var(--rule);
}
.dsib-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dsib-card {
  width: 100%;
  text-align: left;
  background: var(--overlay-02);
  border: 0.5px solid var(--rule);
  border-radius: var(--radius-md);
  padding: 9px 11px;
  color: var(--ink-secondary);
  font-family: var(--font);
  cursor: pointer;
  transition: all 0.22s var(--ease-out);
}
.dsib-card:hover {
  background: var(--overlay-04);
  border-color: var(--rule-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}
.dsib-card-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 4px;
}
.dsib-tag {
  width: 22px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--muted-light);
  background: var(--overlay-04);
}
.dsib-tag-old { background: rgba(202, 167, 255, 0.1); color: var(--star-purple); border: 0.5px solid rgba(202, 167, 255, 0.25); }
.dsib-tag-new { background: var(--accent-subtle); color: var(--accent); border: 0.5px solid var(--accent-border); }
.dsib-card-title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.3;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.dsib-card-preview {
  margin: 0 0 5px;
  font-size: 0.75rem;
  line-height: 1.55;
  color: var(--ink-secondary);
  opacity: 0.85;
  /* 2行截断 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dsib-card-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}
.dsib-meta {
  display: inline-flex;
  align-items: center;
  gap: 3.5px;
  font-size: 0.7rem;
  color: var(--muted-light);
  font-variant-numeric: tabular-nums;
  opacity: 0.95;
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