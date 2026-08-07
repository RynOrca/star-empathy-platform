<template>
  <!-- 采用主 UI 的 panel 结构：panel-head（图标 + 标题 + 计数） + 内容区 -->
  <div class="frame-stories-panel panel-wrapper">
    <header class="fsp-header panel-head">
      <span class="pw-icon-wrap" :class="mode === 'gazing' ? 'pw-icon-blue' : 'pw-icon-gold'">
        <component :is="mode === 'gazing' ? TelescopeIcon : BookOpenIcon" />
      </span>
      <span class="pw-title">{{ mode === 'gazing' ? '取景帧内' : '帧内心声' }}</span>
      <span class="pw-count-badge">{{ stories.length }}</span>
    </header>

    <div v-if="stories.length === 0" class="fsp-empty">
      <div class="empty-icon-wrap">
        <SparklesIcon />
      </div>
      <p class="empty-text">{{ mode === 'gazing' ? '取景框内暂无故事星，尝试移动镜头对准亮星区' : '取景框内暂无情感故事，切换广视角试试' }}</p>
    </div>

    <div v-else ref="listRef" class="fsp-list">
      <TransitionGroup name="fsp-item-anim" tag="div" class="fsp-list-inner">
        <article
          v-for="item in stories"
          :key="item.star.id"
          class="fsp-item story-card"
          :class="{
            'is-active': item.star.id === activeStarId,
            'is-gazing': mode === 'gazing',
            'is-user': mode === 'listening' && item.star.type === 'user'
          }"
          :data-star-id="item.star.id"
          :style="{ '--item-color': getStarColor(item.star) }"
          @click="$emit('clickStory', item.star)"
        >
          <!-- 左色条：指示星类型（catalog=金，user=紫） -->
          <div class="card-bar" />

          <div class="card-body">
            <!-- 头部：星点 + 星名 + 徽章 + 时间 -->
            <div class="card-head">
              <span class="card-star-dot" />
              <span class="card-star-name">{{ getStarName(item.star) }}</span>

              <!-- 听语模式徽章 -->
              <template v-if="mode === 'listening'">
                <span v-if="item.star.type === 'user'" class="badge badge-user">
                  <UserIcon />
                  <span>心声</span>
                </span>
                <span v-if="item.star.isNew" class="badge badge-new" title="24小时内新增">
                  <SparklesIcon />
                </span>
                <span v-if="item.star.isHot" class="badge badge-hot" title="高共鸣">
                  <FlameIcon />
                </span>
                <!-- 历史故事：不显示无意义的入库时间 -->
                <span v-if="item.star.type !== 'history'" class="card-time"><ClockIcon />{{ formatTime(item.star.createdAt) }}</span>
              </template>
              <!-- 观星模式徽章：星座/距离 -->
              <template v-else>
                <span class="card-fov">{{ item.inFrame.ra }}</span>
              </template>
            </div>

            <!-- 听语模式：独立的故事标题（≠星名时才显示） -->
            <div v-if="mode === 'listening' && storyTitleToShow(item.star)" class="card-title">
              {{ storyTitleToShow(item.star) }}
            </div>

            <!-- 卡片正文：2~3 行截断 -->
            <p class="card-excerpt">{{ item.star.content }}</p>

            <!-- 底部 meta：共鸣 / 浏览 / 星坐标 -->
            <div class="card-meta">
              <span class="meta-item"><HeartIcon />{{ item.star.resonanceCount }} 共鸣</span>
              <span v-if="mode === 'listening'" class="meta-item"><EyeIcon />{{ item.star.viewCount }} 浏览</span>
              <span v-if="item.star.tags && item.star.tags.length > 0" class="meta-item meta-tags">
                <span v-for="(t, i) in item.star.tags.slice(0, 2)" :key="i" class="tag-pill">#{{ t }}</span>
              </span>
            </div>
          </div>
        </article>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  BookOpenIcon, SparklesIcon, FlameIcon, HeartIcon, EyeIcon,
  ClockIcon, TelescopeIcon, UserIcon
} from './icons/CameraIcons'
import { getStarDisplayName } from '../../utils/starName'
import type { StoryListItem, CameraFilterMode } from '../../composables/useCameraMode'
import type { StarData } from '../../composables/useStars'

defineProps<{
  stories: StoryListItem[]
  activeStarId: number | null
  mode: CameraFilterMode
}>()

defineEmits<{
  clickStory: [star: StarData]
}>()

const listRef = ref<HTMLDivElement | null>(null)

/** 滚动卡片到列表中心 */
function scrollToCardCenter(starId: number): void {
  const el = listRef.value?.querySelector(`[data-star-id="${starId}"]`) as HTMLElement | null
  if (!el || !listRef.value) return
  const listCenter = listRef.value.clientHeight / 2
  const cardCenter = el.offsetTop + el.clientHeight / 2
  listRef.value.style.scrollBehavior = 'smooth'
  listRef.value.scrollTop = cardCenter - listCenter
}

/** 判断卡片是否在列表中心 */
function isCardCentered(starId: number): boolean {
  const el = listRef.value?.querySelector(`[data-star-id="${starId}"]`) as HTMLElement | null
  if (!el || !listRef.value) return true
  const listCenter = listRef.value.clientHeight / 2
  const cardCenter = el.offsetTop + el.clientHeight / 2 - listRef.value.scrollTop
  return Math.abs(cardCenter - listCenter) < 20
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
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${Math.floor(diff / 86400000)} 天前`
}

defineExpose({ scrollToCardCenter, isCardCentered })
</script>

<style scoped>
.frame-stories-panel {
  position: fixed;
  bottom: 80px;
  right: 36px;
  z-index: 15;
  width: 408px;
  max-height: 62vh;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(18px) saturate(1.2);
  font-family: var(--font);
  color: var(--ink);
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ═══ header: 与 panel-head 语义一致 ═══ */
.fsp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--rule);
  background: linear-gradient(180deg, rgba(255,255,255,0.015) 0%, transparent 100%);
  flex-shrink: 0;
}
.panel-head { display: flex; align-items: center; gap: 8px; }
.pw-icon-wrap {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pw-icon-blue {
  background: rgba(134, 168, 255, 0.1);
  color: var(--star-blue);
  border: 0.5px solid rgba(134, 168, 255, 0.22);
}
.pw-icon-gold {
  background: var(--accent-subtle);
  color: var(--accent);
  border: 0.5px solid var(--accent-border);
}
.pw-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.02em;
  flex: 1;
}
.pw-count-badge {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ink);
  background: var(--overlay-06);
  border: 0.5px solid var(--rule-hover);
  padding: 2px 9px;
  border-radius: var(--radius-full);
  font-variant-numeric: tabular-nums;
}

/* ═══ 空态 ═══ */
.fsp-empty {
  padding: 36px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.empty-icon-wrap {
  width: 40px; height: 40px;
  border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  background: var(--overlay-04);
  color: var(--muted);
  margin-bottom: 4px;
}
.empty-text {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
  max-width: 260px;
}

/* ═══ 故事列表区 ═══ */
.fsp-list {
  overflow-y: auto;
  padding: 10px 12px 12px;
  flex: 1;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(202, 167, 255, 0.22) transparent;
}
.fsp-list::-webkit-scrollbar { width: 6px; }
.fsp-list::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(134, 168, 255, 0.28), rgba(202, 167, 255, 0.28));
  border-radius: 3px;
}
.fsp-list::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, rgba(134, 168, 255, 0.45), rgba(202, 167, 255, 0.45)); }
.fsp-list-inner { display: flex; flex-direction: column; }

/* ═══ TransitionGroup 动画 ═══ */
.fsp-item-anim-enter-active,
.fsp-item-anim-leave-active {
  transition: opacity 0.35s var(--ease-out), transform 0.35s var(--ease-out);
}
.fsp-item-anim-enter-from { opacity: 0; transform: translateX(14px); }
.fsp-item-anim-leave-to   { opacity: 0; transform: translateX(-10px); }
.fsp-item-anim-leave-active { position: absolute; left: 12px; right: 12px; }

/* ═══ 单张故事卡片（复用 StarDetail 故事卡语义：.story-card） ═══ */
.fsp-item {
  position: relative;
  border-radius: var(--radius-md);
  background: var(--overlay-02);
  border: 1px solid var(--rule);
  cursor: pointer;
  transition:
    transform var(--transition-normal),
    background var(--transition-normal),
    border-color var(--transition-normal),
    box-shadow var(--transition-normal);
  margin-bottom: 8px;
  overflow: hidden;
}
.fsp-item:last-child { margin-bottom: 0; }
.card-bar {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--item-color);
  transform: scaleY(0.2);
  transform-origin: center;
  transition: transform var(--transition-normal);
  border-radius: 0 2px 2px 0;
}
.fsp-item:hover {
  background: var(--story-item-hover);
  border-color: var(--rule-hover);
  transform: translateX(-2px);
  box-shadow: 0 4px 14px rgba(0,0,0,0.25);
}
.fsp-item:hover .card-bar,
.fsp-item.is-active .card-bar { transform: scaleY(1); }
.fsp-item.is-active {
  background: var(--story-item-active);
  border-color: var(--accent-border);
  box-shadow: 0 0 0 1px var(--accent-border), 0 4px 18px rgba(255, 217, 138, 0.06);
}
.fsp-item.is-user .card-bar { background: var(--star-purple); }

.card-body {
  padding: 11px 13px 11px 15px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 卡片头部 */
.card-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.card-star-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--item-color);
  box-shadow: 0 0 6px var(--item-color);
  flex-shrink: 0;
}
.card-star-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  font-family: var(--font);
  letter-spacing: 0.01em;
}
.card-fov {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
}
.card-time {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10.5px;
  color: var(--muted);
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
}

/* 徽章：心声 / 新 / 热 */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1.5px 6px;
  border-radius: var(--radius-sm);
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1.3;
}
.badge-user {
  background: rgba(202, 167, 255, 0.12);
  color: var(--star-purple);
  border: 0.5px solid rgba(202, 167, 255, 0.24);
}
.badge-new {
  color: var(--accent);
  padding: 0;
  background: transparent;
  border: none;
}
.badge-hot {
  color: var(--star-red);
  padding: 0;
  background: transparent;
  border: none;
}

/* 故事标题（听语模式） */
.card-title {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--accent);
  background: var(--accent-subtle);
  border: 0.5px solid var(--accent-border);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  line-height: 1.35;
}

/* 正文摘要 */
.card-excerpt {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--ink-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: -webkit-line-clamp var(--transition-fast);
}
.fsp-item:hover .card-excerpt { -webkit-line-clamp: 3; }

/* 底部 meta 行 */
.card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 10.5px;
  color: var(--muted);
  margin-top: 1px;
  padding-top: 1px;
  border-top: 1px dashed transparent;
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 3.5px;
  font-variant-numeric: tabular-nums;
}
.meta-tags {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.tag-pill {
  font-size: 9.5px;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--overlay-04);
  border: 0.5px solid var(--rule);
  color: var(--ink-secondary);
  letter-spacing: 0.01em;
}

/* ═══ 进入动画 ═══ */
.frame-stories-panel {
  animation: fsp-enter 0.65s var(--ease-out) both;
  animation-delay: 340ms;
}
@keyframes fsp-enter {
  from { opacity: 0; transform: translateY(20px); filter: blur(5px); }
  to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
}
</style>
