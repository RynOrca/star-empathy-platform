<template>
  <div class="mobile-gallery-panel">
    <!-- header：标题 + 翻页按钮 -->
    <div class="mgp-header">
      <div class="mgp-title-block">
        <GalleryIcon />
        <span class="mgp-title">{{ mode === 'gazing' ? 'STARS IN FRAME' : 'VOICES IN FRAME' }}</span>
        <span class="mgp-count">{{ pagedStories.length }}</span>
      </div>
      <div v-if="stories.length > 0" class="mgp-nav">
        <!-- 换一批：刷新图标按钮，位于 count 与左箭头之间，样式与 nav-btn 一致 -->
        <button
          class="mgp-nav-btn mgp-refresh-btn"
          :disabled="stories.length === 0"
          @click="nextBatch"
          aria-label="换一批"
          title="换一批"
        >
          <RefreshIcon />
        </button>
        <button class="mgp-nav-btn" :disabled="activeIdx === 0" @click="goPrev" aria-label="上一张">
          <ChevronLeftIcon />
        </button>
        <span class="mgp-pager"><b>{{ activeIdx + 1 }}</b> / {{ pagedStories.length }}</span>
        <button class="mgp-nav-btn" :disabled="activeIdx >= pagedStories.length - 1" @click="goNext" aria-label="下一张">
          <ChevronRightIcon />
        </button>
      </div>
    </div>

    <!-- 空态 -->
    <div v-if="stories.length === 0" class="mgp-empty">
      {{ mode === 'gazing' ? '深空区域 · 转动视角探索更多星辰' : '取景框内暂无情感故事' }}
    </div>

    <!-- 单卡片轮播 -->
    <div
      v-else
      class="mgp-gallery"
      @touchstart.passive="onTouchStart"
      @touchend="onTouchEnd"
    >
      <div class="mgp-track" :style="{ transform: `translateX(-${trackOffset}px)` }">
        <div
          v-for="(item, idx) in pagedStories"
          :key="item.star.id"
          class="mgp-card"
          :class="{ 'is-active': idx === activeIdx }"
          :style="{ '--bc': getStarColor(item.star) }"
          @click="onCardClick(item.star)"
        >
          <div class="mgp-head">
            <div class="mgp-star">
              <span class="mgp-dot" />
              <span class="mgp-star-name">{{ getStarName(item.star) }}</span>
              <span v-if="mode === 'listening' && item.star.type === 'user'" class="mgp-badge-user">心声</span>
              <SparklesIcon v-if="mode === 'listening' && item.star.isNew" class="mgp-tag-new" />
              <FlameIcon v-if="mode === 'listening' && item.star.isHot" class="mgp-tag-hot" />
            </div>
            <span v-if="mode === 'listening' && item.star.type !== 'history'" class="mgp-time">{{ formatTime(item.star.createdAt) }}</span>
          </div>
          <!-- 听语模式：故事标题（与星名不同时才显示，避免重复） -->
          <div v-if="mode === 'listening' && storyTitleToShow(item.star)" class="mgp-title-text">{{ storyTitleToShow(item.star) }}</div>
          <!-- 卡片正文：观星=星星介绍；听语=情感故事 -->
          <div class="mgp-excerpt">{{ item.star.content }}</div>
          <div class="mgp-meta">
            <span class="mgp-meta-item"><HeartIcon />{{ item.star.resonanceCount }}</span>
            <span v-if="mode === 'listening'" class="mgp-meta-item"><EyeIcon />{{ item.star.viewCount }}</span>
            <span class="mgp-meta-item"><CompassIcon />{{ item.inFrame.ra }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 小圆点分页器 -->
    <div v-if="pagedStories.length > 1" class="mgp-dots">
      <div
        v-for="(item, idx) in pagedStories"
        :key="`dot-${item.star.id}`"
        class="mgp-dot"
        :class="{ 'is-active': idx === activeIdx }"
        @click="goTo(idx)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import {
  GalleryIcon, ChevronLeftIcon, ChevronRightIcon, RefreshIcon,
  SparklesIcon, FlameIcon, HeartIcon, EyeIcon, CompassIcon,
} from './icons/CameraIcons'
import { getStarDisplayName } from '../../utils/starName'
import type { StoryListItem, CameraFilterMode } from '../../composables/useCameraMode'
import type { StarData } from '../../composables/useStars'

const props = defineProps<{
  stories: StoryListItem[]
  activeStarId: number | null
  mode: CameraFilterMode
}>()

const emit = defineEmits<{
  clickStory: [star: StarData]
  activeChange: [starId: number]
}>()

/** 单卡片宽度（CSS 中 mgp-card flex: 0 0 calc(100vw - 24px)，外层 padding 12px*2） */
const cardWidth = ref(typeof window !== 'undefined' ? window.innerWidth - 24 : 360)
const gap = 12

function updateCardWidth(): void {
  if (typeof window !== 'undefined') {
    cardWidth.value = window.innerWidth - 24
  }
}

onMounted(() => {
  window.addEventListener('resize', updateCardWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateCardWidth)
})

/** 分页：一次只展示 15 个，"换一批"洗牌并尽量排除当前批的故事 */
const PAGE_SIZE = 15
/** 展示池：洗牌后的故事顺序，换一批时重新洗牌 */
const shuffledStories = ref<StoryListItem[]>([])
/** 当前已展示过的星 id 集合（用于换一批时排除，避免重复） */
const shownIds = ref<Set<number>>(new Set())

const pagedStories = computed<StoryListItem[]>(() => shuffledStories.value.slice(0, PAGE_SIZE))

/** Fisher-Yates 洗牌 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 重新洗牌并选出下一批故事：优先排除已展示过的，除非池子不够大 */
function reshuffle(): void {
  if (props.stories.length === 0) {
    shuffledStories.value = []
    return
  }
  // 池子不够大（≤PAGE_SIZE）→ 无法排除，直接洗牌
  if (props.stories.length <= PAGE_SIZE) {
    shuffledStories.value = shuffle(props.stories)
    return
  }
  // 优先选未展示过的
  const remaining = props.stories.filter(s => !shownIds.value.has(s.star.id))
  // 剩余不够一页 → 重置已展示集合，重新洗牌全部
  if (remaining.length < PAGE_SIZE) {
    shownIds.value = new Set()
    shuffledStories.value = shuffle(props.stories).slice(0, PAGE_SIZE)
  } else {
    shuffledStories.value = shuffle(remaining).slice(0, PAGE_SIZE)
  }
  // 标记本批为已展示
  for (const s of shuffledStories.value) {
    shownIds.value.add(s.star.id)
  }
}

const activeIdx = ref(0)

/** 轨道偏移量：activeIdx × (cardWidth + gap)，响应 resize/rotate */
const trackOffset = computed(() => activeIdx.value * (cardWidth.value + gap))

/** 触摸滑动起点 + 是否发生了滑动 */
let touchStartX = 0
let touchStartY = 0
let didSwipe = false

/** 星标识（catalogStarId 优先，无则用故事 id） */
function storyKey(s: StoryListItem): string {
  const st = s.star
  return st.catalogStarId !== null && st.catalogStarId !== undefined ? `c${st.catalogStarId}` : `s${st.id}`
}

/** 上次已处理的故事集合签名（排序后的 key 串），仅当内容真正变化时才重新洗牌 */
let lastStoryKeys: string | null = null

/** stories 变化时重新洗牌并选出第一批。
 *  父组件每 400ms 会为 frameStories 生成新的数组引用，即便内容没变也会触发本 watch。
 *  若内容（星集合）未变则跳过洗牌，避免卡片无缘无故自己跳动。 */
watch(() => props.stories, (newStories) => {
  const keys = newStories.map(storyKey).sort().join(',')
  if (lastStoryKeys !== null && keys === lastStoryKeys) {
    // 内容未变化（只是父组件重建了数组引用）→ 保持当前顺序，不做任何操作
    return
  }
  lastStoryKeys = keys
  // 视角内故事真正变化（拖动相机）时，重置已展示集合并重新洗牌
  shownIds.value = new Set()
  reshuffle()
  if (newStories.length > 0) {
    // 保持当前活动星（如果还在新池子里）
    if (props.activeStarId !== null) {
      const idx = shuffledStories.value.findIndex(s => s.star.id === props.activeStarId)
      if (idx >= 0) {
        activeIdx.value = idx
        return
      }
    }
    activeIdx.value = 0
  } else {
    activeIdx.value = 0
  }
}, { immediate: true })

/** activeIdx 变化时同步 activeStarId 到父组件 */
watch(activeIdx, (newIdx) => {
  const item = pagedStories.value[newIdx]
  if (item) emit('activeChange', item.star.id)
})

/** activeStarId 外部变化时，跳到对应星位置 */
watch(() => props.activeStarId, (newId) => {
  if (newId === null) return
  const idx = shuffledStories.value.findIndex(s => s.star.id === newId)
  if (idx < 0) return
  if (activeIdx.value !== idx) activeIdx.value = idx
})

function goPrev(): void {
  if (activeIdx.value > 0) activeIdx.value--
}
function goNext(): void {
  if (activeIdx.value < pagedStories.value.length - 1) activeIdx.value++
}
function goTo(idx: number): void {
  if (idx >= 0 && idx < pagedStories.value.length) activeIdx.value = idx
}

/** 换一批：重新洗牌，尽量展示未看过的故事 */
function nextBatch(): void {
  if (props.stories.length === 0) return
  reshuffle()
  activeIdx.value = 0
}

function onCardClick(star: StarData): void {
  // 滑动后抑制点击，避免滑动结束后误触飞镜头
  if (didSwipe) {
    didSwipe = false
    return
  }
  emit('clickStory', star)
}

function onTouchStart(e: TouchEvent): void {
  if (e.touches.length !== 1) return
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  didSwipe = false
}

function onTouchEnd(e: TouchEvent): void {
  if (e.changedTouches.length !== 1) return
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  // 水平位移 > 40px 且大于垂直位移 → 判定为滑动
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) goNext()
    else goPrev()
    didSwipe = true
  }
}

function getStarColor(star: StarData): string {
  if (star.catalogStarId) return '#ffd98a'
  return '#caa7ff'
}

function getStarName(star: StarData): string {
  if (star.catalogStarId !== null && star.catalogStarId !== undefined) {
    return getStarDisplayName(star.catalogStarId)
  }
  return star.title || `星 #${star.id}`
}

function storyTitleToShow(star: StarData): string {
  if (!star.title) return ''
  if (star.catalogStarId !== null && star.catalogStarId !== undefined) {
    if (star.title === getStarDisplayName(star.catalogStarId)) return ''
  }
  return star.title
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}
</script>

<style scoped>
.mobile-gallery-panel {
  position: fixed;
  bottom: -13px; /* 原 7px（12px→7px），再向下移动 20px（任务3：卡片位置不够低） */
  left: 12px;
  right: 12px;
  z-index: 40;
  pointer-events: auto;
  font-family: var(--font-display);
  color: var(--hud-text);
  animation: mgp-enter 0.5s var(--ease-in-out) both;
  animation-delay: 120ms;
}

@keyframes mgp-enter {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ═══ header ═══ */
.mgp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 8px;
}
.mgp-title-block {
  display: flex;
  align-items: center;
  gap: 6px;
}
.mgp-title {
  font-size: var(--text-xxs);
  letter-spacing: 0.15em;
  color: var(--hud-accent);
  opacity: 0.85;
}
.mgp-count {
  background: var(--accent-purple);
  color: #07081a;
  padding: 1px 7px;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 600;
}
.mgp-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mgp-nav-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(26, 30, 53, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(202, 167, 255, 0.2);
  color: var(--hud-accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.mgp-nav-btn:hover:not(:disabled) {
  background: rgba(202, 167, 255, 0.15);
  border-color: rgba(202, 167, 255, 0.45);
}
.mgp-nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.mgp-pager {
  font-size: 0.7rem;
  color: rgba(117, 112, 144, 1);
  font-family: 'Cinzel', monospace;
  min-width: 48px;
  text-align: center;
}
.mgp-pager b {
  color: var(--hud-text);
  font-weight: 500;
  font-size: 0.8rem;
}

/* ═══ 空态 ═══ */
.mgp-empty {
  padding: 28px 16px;
  text-align: center;
  background: rgba(26, 30, 53, 0.6);
  border: 1px solid rgba(202, 167, 255, 0.1);
  border-radius: 16px;
  font-size: 0.78rem;
  opacity: 0.7;
}

/* ═══ 画廊轨道 ═══ */
.mgp-gallery {
  overflow: hidden;
}
.mgp-track {
  display: flex;
  gap: 12px;
  transition: transform 0.55s cubic-bezier(0.32, 0.72, 0, 1);
}

/* ═══ 单卡片 ═══ */
.mgp-card {
  flex: 0 0 calc(100vw - 24px);
  min-width: 0;
  padding: 14px 16px 12px;
  background: linear-gradient(160deg, rgba(26, 30, 53, 0.95) 0%, rgba(16, 20, 43, 0.97) 100%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-top: 2px solid transparent;
  border-top-color: color-mix(in srgb, var(--bc) 35%, transparent);
  border-radius: 16px;
  cursor: pointer;
  position: relative;
  transition: all 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}
.mgp-card.is-active {
  border-color: var(--bc);
  border-top-color: var(--bc);
  transform: translateY(-4px);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(202, 167, 255, 0.08),
    0 0 32px color-mix(in srgb, var(--bc) 18%, transparent);
}
.mgp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.mgp-star {
  display: flex;
  align-items: center;
  gap: 6px;
}
.mgp-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bc);
  box-shadow: 0 0 8px var(--bc);
  flex-shrink: 0;
}
.mgp-star-name {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--bc);
  letter-spacing: 0.05em;
}
.mgp-badge-user {
  display: inline-block;
  padding: 1px 6px;
  background: rgba(255, 217, 138, 0.12);
  color: #ffd98a;
  border-radius: 4px;
  font-size: 0.55rem;
  letter-spacing: 0.05em;
  font-weight: 500;
}
.mgp-tag-new, .mgp-tag-hot {
  color: var(--hud-accent);
  opacity: 0.85;
}
.mgp-tag-hot { color: #ff8b7d; }
.mgp-time {
  font-size: 0.6rem;
  color: rgba(117, 112, 144, 1);
  font-family: 'Cinzel', monospace;
}
.mgp-title-text {
  font-size: 0.82rem;
  font-weight: 500;
  color: #ffd98a;
  margin-bottom: 6px;
  letter-spacing: 0.05em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mgp-excerpt {
  font-size: 0.75rem;
  color: #b8b2cc;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 10px;
  padding-left: 10px;
  border-left: 1px solid rgba(255, 255, 255, 0.05);
}
.mgp-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}
.mgp-meta-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.65rem;
  color: rgba(117, 112, 144, 1);
}
.mgp-card.is-active .mgp-meta-item { color: rgba(153, 148, 173, 1); }

/* ═══ 小圆点分页器 ═══ */
.mgp-dots {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
}
.mgp-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  transition: all 0.3s;
}
.mgp-dot.is-active {
  width: 22px;
  border-radius: 3px;
  background: linear-gradient(90deg, #caa7ff, #86a8ff);
}
.mgp-dot:hover:not(.is-active) {
  background: rgba(202, 167, 255, 0.4);
}
</style>
