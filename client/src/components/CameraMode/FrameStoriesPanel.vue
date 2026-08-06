<template>
  <div class="frame-stories-panel">
    <div class="fsp-header">
      <BookOpenIcon />
      <span class="fsp-title">STORIES IN FRAME</span>
      <span class="fsp-count">{{ stories.length }}</span>
    </div>
    <div v-if="stories.length === 0" class="fsp-empty">
      无符合条件的故事，请调整过滤器
    </div>
    <div v-else ref="listRef" class="fsp-list">
      <div
        v-for="item in stories"
        :key="item.star.id"
        class="fsp-item"
        :class="{ 'is-active': item.star.id === activeStarId }"
        :data-star-id="item.star.id"
        :style="{ '--item-color': getStarColor(item.star) }"
        @click="$emit('clickStory', item.star)"
      >
        <div class="fsp-item-header">
          <span class="fsp-star-dot" />
          <span class="fsp-star-name">{{ getStarName(item.star) }}</span>
          <SparklesIcon v-if="item.star.isNew" class="fsp-tag-new" />
          <FlameIcon v-if="item.star.isHot" class="fsp-tag-hot" />
          <span class="fsp-time">{{ formatTime(item.star.createdAt) }}</span>
        </div>
        <div v-if="item.star.title" class="fsp-title-text">{{ item.star.title }}</div>
        <div class="fsp-excerpt">{{ item.star.content }}</div>
        <div class="fsp-meta">
          <span class="fsp-meta-item"><HeartIcon />{{ item.star.resonanceCount }}</span>
          <span class="fsp-meta-item"><EyeIcon />{{ item.star.viewCount }}</span>
          <span class="fsp-meta-item"><CompassIcon />{{ item.inFrame.ra }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BookOpenIcon, SparklesIcon, FlameIcon, HeartIcon, EyeIcon, CompassIcon } from './icons/CameraIcons'
import type { StoryListItem } from '../../composables/useCameraMode'
import type { StarData } from '../../composables/useStars'

defineProps<{
  stories: StoryListItem[]
  activeStarId: number | null
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
  return star.title || `星 #${star.id}`
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

defineExpose({ scrollToCardCenter, isCardCentered })
</script>

<style scoped>
.frame-stories-panel {
  position: fixed;
  bottom: 60px;
  right: 32px;
  z-index: 15;
  width: 380px;
  max-height: 62vh;
  background: var(--story-list-bg);
  border: 1px solid var(--vf-border);
  border-radius: 6px;
  font-family: var(--font-display);
  color: var(--hud-text);
  pointer-events: auto;
  display: flex;
  flex-direction: column;
}
.fsp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(202, 167, 255, 0.2);
  font-size: var(--text-xxs);
  letter-spacing: 0.15em;
}
.fsp-title { flex: 1; }
.fsp-count {
  background: var(--accent-purple);
  color: #07081a;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
}
.fsp-empty {
  padding: 32px 16px;
  text-align: center;
  opacity: 0.5;
  font-size: 0.8rem;
}
.fsp-list {
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(202, 167, 255, 0.25) transparent;
}
.fsp-list::-webkit-scrollbar { width: 6px; }
.fsp-list::-webkit-scrollbar-thumb { background: rgba(202, 167, 255, 0.25); border-radius: 3px; }
.fsp-item {
  position: relative;
  padding: 10px 14px;
  margin-bottom: 6px;
  border: 1px solid rgba(202, 167, 255, 0.1);
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.25s var(--ease-in-out), background 0.25s, border-color 0.25s;
}
.fsp-item::before {
  content: '';
  position: absolute;
  left: 0; top: 8px; bottom: 8px;
  width: 2px;
  background: var(--item-color);
  transform: scaleY(0);
  transition: transform 0.25s var(--ease-in-out);
}
.fsp-item:hover {
  transform: translateX(-2px);
  background: var(--story-item-hover);
}
.fsp-item:hover::before,
.fsp-item.is-active::before { transform: scaleY(1); }
.fsp-item.is-active {
  background: var(--story-item-active);
  border-color: rgba(202, 167, 255, 0.3);
}
.fsp-item-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.fsp-star-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--item-color);
}
.fsp-star-name {
  font-size: 0.8rem;
  color: var(--hud-accent);
}
.fsp-tag-new, .fsp-tag-hot {
  width: 12px; height: 12px;
  color: var(--hud-accent);
}
.fsp-time {
  margin-left: auto;
  font-size: var(--text-xxs);
  opacity: 0.5;
}
.fsp-title-text {
  font-size: 0.85rem;
  color: var(--hud-accent);
  background: rgba(255, 217, 138, 0.08);
  padding: 2px 6px;
  border-radius: 2px;
  margin-bottom: 4px;
}
.fsp-excerpt {
  font-size: 0.75rem;
  opacity: 0.8;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}
.fsp-item:hover .fsp-excerpt { -webkit-line-clamp: 3; }
.fsp-meta {
  display: flex;
  gap: 12px;
  font-size: var(--text-xxs);
  opacity: 0.6;
}
.fsp-meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ═══ 级联进入动画 ═══ */
.frame-stories-panel { animation: fsp-enter 0.5s var(--ease-in-out) both; animation-delay: 320ms; }

@keyframes fsp-enter { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
