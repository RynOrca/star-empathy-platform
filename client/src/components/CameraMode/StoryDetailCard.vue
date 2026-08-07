<template>
  <Teleport to="body">
    <Transition :name="isMobile ? 'story-card-mobile' : 'story-card-pc'">
      <div v-if="star" class="story-card-mask" :class="{ 'is-mobile': isMobile }" @click.self="$emit('close')">
        <!-- 左色条：根据星类型指示 -->
        <div class="sc-color-bar" :style="{ background: starColor }" />

        <div class="story-card panel-wrapper" :class="{ 'is-mobile': isMobile }">
          <!-- 关闭按钮：独立胶囊按钮 -->
          <button class="sc-close" @click="$emit('close')" aria-label="关闭">
            <CloseIcon />
          </button>

          <!-- 头部：星点 + 星名 + 徽章 + 类型标签 -->
          <header class="sc-header panel-head">
            <span class="pw-icon-wrap" :class="star?.catalogStarId ? 'pw-icon-gold' : 'pw-icon-purple'">
              <StarMiniIcon />
            </span>
            <div class="sc-head-main">
              <h3 class="sc-star-name">{{ starName }}</h3>
              <div class="sc-head-sub">
                <span v-if="star.catalogStarId" class="sc-type-chip sc-type-catalog">
                  <TelescopeMiniIcon />
                  <span>星表恒星</span>
                </span>
                <span v-else class="sc-type-chip sc-type-user">
                  <UserMiniIcon />
                  <span>用户心声</span>
                </span>
                <span v-if="star.isNew" class="sc-tag sc-tag-new" title="24小时内新增">
                  <SparklesIcon />
                </span>
                <span v-if="star.isHot" class="sc-tag sc-tag-hot" title="高共鸣">
                  <FlameIcon />
                </span>
                <span v-if="star.isAncient" class="sc-tag sc-tag-ancient" title="历史故事">
                  <ScrollIcon />
                </span>
              </div>
            </div>
            <span class="sc-star-color-dot" :style="{ background: starColor }" />
          </header>

          <!-- 故事标题：仅当与星名不同时才显示 -->
          <div v-if="storyTitle" class="sc-title-block">
            <div class="sc-title-tag">故事标题</div>
            <h2 class="sc-title">{{ storyTitle }}</h2>
          </div>

          <!-- 正文内容 -->
          <div class="sc-content-wrap">
            <div class="sc-content-quote-mark">"</div>
            <p class="sc-content">{{ star.content }}</p>
          </div>

          <!-- meta 行：共鸣/浏览/时间 -->
          <div class="sc-meta-row">
            <span class="sc-meta-item">
              <HeartIcon />
              <span class="meta-num tabular">{{ star.resonanceCount }}</span>
              <span class="meta-label">共鸣</span>
            </span>
            <span class="sc-meta-divider" />
            <span class="sc-meta-item">
              <EyeIcon />
              <span class="meta-num tabular">{{ star.viewCount }}</span>
              <span class="meta-label">浏览</span>
            </span>
            <span class="sc-meta-divider" />
            <span class="sc-meta-item">
              <ClockIcon />
              <span class="meta-time">{{ formatTime }}</span>
            </span>
          </div>

          <!-- 标签 -->
          <div v-if="displayTags.length" class="sc-tags-wrap">
            <span v-for="tag in displayTags" :key="tag" class="sc-tag-pill" :style="tagStyle(tag)">
              #{{ tag }}
            </span>
          </div>

          <!-- 分隔线 -->
          <div class="sc-divider" />

          <!-- 操作区 -->
          <div class="sc-actions">
            <button
              class="sc-resonate-btn"
              :disabled="resonating || localResonanceAdded"
              :class="{ done: localResonanceAdded }"
              @click="onResonate"
            >
              <span class="resonate-icon-wrap">
                <HeartIcon :class="{ 'is-filled': localResonanceAdded }" />
              </span>
              <span class="resonate-text">
                {{ localResonanceAdded ? '已共鸣' : (resonating ? '共鸣中…' : '共鸣这颗心') }}
              </span>
              <span v-if="localResonanceAdded" class="resonate-plus">+1</span>
            </button>
          </div>

          <!-- 访客提示 -->
          <Transition name="hint-fade">
            <p v-if="guestHint" class="sc-guest-hint">
              <AlertMiniIcon />
              <span>{{ guestHint }}</span>
            </p>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, h } from 'vue'
import { useRouter } from 'vue-router'
import {
  CloseIcon, SparklesIcon, FlameIcon, ScrollIcon,
  HeartIcon, EyeIcon, ClockIcon, TelescopeIcon, UserIcon
} from './icons/CameraIcons'
import { useResonate } from '../../composables/useResonate'
import { getStarDisplayName } from '../../utils/starName'
import type { StarData } from '../../composables/useStars'

const props = defineProps<{
  star: StarData | null
  isMobile: boolean
  isGuest: boolean
}>()

const router = useRouter()
const guestHint = ref('')

defineEmits<{ close: [] }>()

const { resonate, resonatingId } = useResonate()
const localResonanceAdded = ref(false)

const resonating = computed(() => props.star ? resonatingId.value === props.star.id : false)

const starColor = computed(() => props.star?.catalogStarId ? '#ffd98a' : '#caa7ff')
const starName = computed(() => {
  if (!props.star) return ''
  if (props.star.catalogStarId) return getStarDisplayName(props.star.catalogStarId)
  return props.star.title || `星 #${props.star.id}`
})
const storyTitle = computed(() => {
  if (!props.star || !props.star.title) return ''
  if (props.star.catalogStarId && props.star.title === starName.value) return ''
  return props.star.title
})
const displayTags = computed(() => {
  if (!props.star) return []
  const tags = props.star.tags || (props.star.tag ? [props.star.tag] : [])
  return tags.slice(0, 5)
})
const formatTime = computed(() => {
  if (!props.star) return ''
  const diff = Date.now() - new Date(props.star.createdAt).getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${Math.floor(diff / 86400000)} 天前`
})

/* 迷你图标：直接用 SVG 函数式组件，避免 CameraIcons 里缺少的 icon */
const StarMiniIcon = () => h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('polygon', { points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' })
])
const TelescopeMiniIcon = () => h('svg', { width: 11, height: 11, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'm10 12 7.6-7.6a2 2 0 1 1 2.8 2.8L12.8 14.8' }),
  h('path', { d: 'M10 12 4.7 17.3c-1 1-1 2.5.2 3.7s2.7 1.2 3.7.2L14 14.4' }),
  h('path', { d: 'M10 12h5' })
])
const UserMiniIcon = () => h('svg', { width: 11, height: 11, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
  h('circle', { cx: 12, cy: 7, r: 4 })
])
const AlertMiniIcon = () => h('svg', { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('circle', { cx: 12, cy: 12, r: 10 }),
  h('line', { x1: 12, y1: 8, x2: 12, y2: 12 }),
  h('line', { x1: 12, y1: 16, x2: '12.01', y2: 16 })
])

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
  return { color, borderColor: border, backgroundColor: bg }
}

async function onResonate() {
  if (!props.star || localResonanceAdded.value) return
  if (props.isGuest) {
    guestHint.value = '请先登录后再共鸣'
    localStorage.removeItem('token')
    setTimeout(() => router.push('/'), 600)
    return
  }
  const ok = await resonate(props.star.id)
  if (ok) {
    localResonanceAdded.value = true
    props.star.resonanceCount++
  }
}
</script>

<style scoped>
/* ═══ 遮罩 ═══ */
.story-card-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(7, 8, 22, 0.58);
  backdrop-filter: blur(10px) saturate(1.3);
  -webkit-backdrop-filter: blur(10px) saturate(1.3);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  transition: opacity 0.4s var(--ease-in-out);
}
.story-card-mask.is-mobile {
  align-items: flex-end;
  padding: 0;
}

/* 左侧色条：指示星类型 */
.sc-color-bar {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  z-index: 1;
  opacity: 0.85;
  filter: blur(0.5px);
}

/* ═══ 主面板 ═══ */
.story-card {
  position: relative;
  width: min(580px, 92vw);
  max-height: 82vh;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-xl);
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.02) inset;
  padding: 22px 24px 20px;
  padding-left: 27px; /* 左侧留出色条空间 */
  color: var(--ink);
  font-family: var(--font);
  animation: sc-enter-inner 0.55s var(--ease-out) both;
  scrollbar-width: thin;
  scrollbar-color: rgba(202, 167, 255, 0.22) transparent;
}
.story-card::-webkit-scrollbar { width: 5px; }
.story-card::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(134, 168, 255, 0.28), rgba(202, 167, 255, 0.28));
  border-radius: 3px;
}
.story-card.is-mobile {
  width: 100%;
  max-height: 88vh;
  border-radius: 22px 22px 0 0;
  border-bottom: none;
  padding: 20px 18px 22px;
  padding-left: 21px;
  box-shadow: 0 -12px 60px rgba(0, 0, 0, 0.6);
}
@keyframes sc-enter-inner {
  from { box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
  to   { box-shadow: 0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02) inset; }
}

/* ═══ 关闭按钮 ═══ */
.sc-close {
  position: absolute;
  top: 14px; right: 14px;
  width: 30px; height: 30px;
  border-radius: var(--radius-sm);
  background: var(--overlay-04);
  border: 0.5px solid var(--rule);
  color: var(--ink-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all var(--transition-normal);
  z-index: 2;
}
.sc-close:hover {
  background: var(--overlay-08);
  color: var(--ink);
  border-color: var(--rule-hover);
  transform: rotate(90deg);
}

/* ═══ Header: 复用 panel-head 语义 ═══ */
.panel-head { display: flex; align-items: center; gap: 10px; }
.pw-icon-wrap {
  width: 30px; height: 30px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pw-icon-gold {
  background: var(--accent-subtle);
  color: var(--accent);
  border: 0.5px solid var(--accent-border);
}
.pw-icon-purple {
  background: rgba(202, 167, 255, 0.1);
  color: var(--star-purple);
  border: 0.5px solid rgba(202, 167, 255, 0.22);
}
.sc-header {
  padding-bottom: 14px;
  border-bottom: 1px solid var(--rule);
  margin-bottom: 14px;
  position: relative;
}
.sc-head-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.sc-star-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.01em;
  line-height: 1.3;
  font-family: var(--font);
}
.sc-head-sub {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}
.sc-star-color-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
  flex-shrink: 0;
}

/* 类型 chip */
.sc-type-chip {
  display: inline-flex;
  align-items: center;
  gap: 3.5px;
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1.4;
}
.sc-type-catalog {
  background: var(--accent-subtle);
  color: var(--accent);
  border: 0.5px solid var(--accent-border);
}
.sc-type-user {
  background: rgba(202, 167, 255, 0.1);
  color: var(--star-purple);
  border: 0.5px solid rgba(202, 167, 255, 0.22);
}
/* 标签徽章 */
.sc-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px; height: 16px;
  flex-shrink: 0;
}
.sc-tag-new { color: var(--accent); filter: drop-shadow(0 0 3px rgba(255,217,138,0.3)); }
.sc-tag-hot { color: var(--star-red); filter: drop-shadow(0 0 3px rgba(255,139,125,0.3)); }
.sc-tag-ancient { color: var(--star-purple); filter: drop-shadow(0 0 3px rgba(202,167,255,0.3)); }

/* ═══ 标题区 ═══ */
.sc-title-block {
  margin-bottom: 14px;
  padding: 10px 12px;
  background: linear-gradient(135deg, var(--accent-subtle) 0%, rgba(202, 167, 255, 0.06) 100%);
  border: 0.5px solid var(--accent-border);
  border-radius: var(--radius-md);
}
.sc-title-tag {
  font-size: 10px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 4px;
  opacity: 0.8;
}
.sc-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.45;
}

/* ═══ 正文 ═══ */
.sc-content-wrap {
  position: relative;
  padding: 4px 4px 12px 4px;
  margin-bottom: 10px;
}
.sc-content-quote-mark {
  position: absolute;
  top: -8px; left: -4px;
  font-size: 48px;
  font-family: Georgia, serif;
  line-height: 1;
  color: var(--accent);
  opacity: 0.08;
  user-select: none;
  pointer-events: none;
}
.sc-content {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--ink-secondary);
  white-space: pre-wrap;
  letter-spacing: 0.005em;
}

/* ═══ Meta 行 ═══ */
.sc-meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--overlay-02);
  border: 0.5px solid var(--rule);
  border-radius: var(--radius-md);
  margin-bottom: 10px;
}
.sc-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4.5px;
  color: var(--muted);
  font-size: 11.5px;
}
.meta-num {
  color: var(--ink);
  font-weight: 600;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.meta-label {
  font-size: 10.5px;
}
.meta-time {
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  color: var(--muted);
}
.sc-meta-divider {
  width: 1px;
  height: 14px;
  background: var(--rule);
  opacity: 0.8;
}

/* ═══ 标签区 ═══ */
.sc-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 14px;
}
.sc-tag-pill {
  display: inline-block;
  padding: 3px 9px;
  border-radius: var(--radius-full);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.01em;
  border: 0.5px solid transparent;
  transition: transform var(--transition-fast), filter var(--transition-fast);
}
.sc-tag-pill:hover {
  filter: brightness(1.1);
  transform: translateY(-0.5px);
}

/* ═══ 分隔线 ═══ */
.sc-divider {
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    var(--rule) 20%,
    var(--rule) 80%,
    transparent 100%
  );
  margin: 4px 0 14px;
}

/* ═══ 操作区：共鸣按钮 ═══ */
.sc-actions {
  display: flex;
  justify-content: center;
}
.sc-resonate-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 11px 28px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--accent-subtle) 0%, rgba(255, 217, 138, 0.14) 100%);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-family: var(--font);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-normal);
  overflow: hidden;
  letter-spacing: 0.02em;
}
.sc-resonate-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%);
  opacity: 0;
  transition: opacity var(--transition-normal);
}
.sc-resonate-btn:hover:not(:disabled)::before { opacity: 1; }
.sc-resonate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255, 217, 138, 0.15);
  border-color: rgba(255, 217, 138, 0.3);
}
.sc-resonate-btn:active:not(:disabled) {
  transform: translateY(0);
}
.sc-resonate-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.sc-resonate-btn.done {
  background: rgba(149, 240, 192, 0.1);
  border-color: rgba(149, 240, 192, 0.25);
  color: var(--star-green);
}
.sc-resonate-btn.done:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(149, 240, 192, 0.12);
}
.resonate-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-normal);
}
.sc-resonate-btn:hover:not(:disabled) .resonate-icon-wrap {
  transform: scale(1.12);
}
.sc-resonate-btn .is-filled {
  fill: currentColor;
}
.resonate-plus {
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: rgba(149, 240, 192, 0.15);
  font-size: 10px;
  font-weight: 700;
  color: var(--star-green);
  margin-left: 2px;
  animation: plus-pop 0.5s var(--ease-spring);
}
@keyframes plus-pop {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

/* ═══ 访客提示 ═══ */
.sc-guest-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 10px auto 0;
  padding: 7px 14px;
  font-size: 11.5px;
  color: var(--error);
  background: var(--error-subtle);
  border: 0.5px solid rgba(255, 139, 125, 0.2);
  border-radius: var(--radius-sm);
  text-align: center;
  justify-content: center;
}
.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: all 0.3s var(--ease-out);
}
.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ═══ PC 端过渡 ═══ */
.story-card-pc-enter-from,
.story-card-pc-leave-to {
  opacity: 0;
}
.story-card-pc-enter-from .story-card,
.story-card-pc-leave-to .story-card {
  transform: translateY(28px) scale(0.95);
  opacity: 0;
}
.story-card-pc-enter-active,
.story-card-pc-leave-active {
  transition: opacity 0.45s var(--ease-in-out);
}
.story-card-pc-enter-active .story-card,
.story-card-pc-leave-active .story-card {
  transition: transform 0.5s var(--ease-out), opacity 0.4s var(--ease-out);
}

/* ═══ 移动端过渡 ═══ */
.story-card-mobile-enter-from,
.story-card-mobile-leave-to {
  opacity: 0;
}
.story-card-mobile-enter-from .story-card,
.story-card-mobile-leave-to .story-card {
  transform: translateY(100%);
}
.story-card-mobile-enter-active,
.story-card-mobile-leave-active {
  transition: opacity 0.4s var(--ease-in-out);
}
.story-card-mobile-enter-active .story-card,
.story-card-mobile-leave-active .story-card {
  transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}
</style>
