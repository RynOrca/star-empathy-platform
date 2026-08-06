<template>
  <Teleport to="body">
    <Transition :name="isMobile ? 'story-card-mobile' : 'story-card-pc'">
      <div v-if="star" class="story-card-mask" :class="{ 'is-mobile': isMobile }" @click.self="$emit('close')">
        <div class="story-card" :class="{ 'is-mobile': isMobile }">
          <button class="sc-close" @click="$emit('close')">
            <CloseIcon />
          </button>
          <div class="sc-header">
            <span class="sc-star-dot" :style="{ background: starColor }" />
            <span class="sc-star-name">{{ starName }}</span>
            <SparklesIcon v-if="star.isNew" class="sc-tag" />
            <FlameIcon v-if="star.isHot" class="sc-tag" />
            <ScrollIcon v-if="star.isAncient" class="sc-tag" />
          </div>
          <div v-if="storyTitle" class="sc-title">{{ storyTitle }}</div>
          <div class="sc-content">{{ star.content }}</div>
          <div class="sc-meta">
            <span class="sc-meta-item"><HeartIcon />{{ star.resonanceCount }}</span>
            <span class="sc-meta-item"><EyeIcon />{{ star.viewCount }}</span>
            <span class="sc-meta-item"><ClockIcon />{{ formatTime }}</span>
            <span v-for="tag in displayTags" :key="tag" class="sc-tag-pill">{{ tag }}</span>
          </div>
          <div class="sc-actions">
            <button class="sc-resonate" :disabled="resonating" @click="onResonate">
              <HeartIcon />
              <span>{{ resonating ? '共鸣中…' : '共鸣' }}</span>
            </button>
          </div>
          <p v-if="guestHint" class="sc-guest-hint">{{ guestHint }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CloseIcon, SparklesIcon, FlameIcon, ScrollIcon, HeartIcon, EyeIcon, ClockIcon } from './icons/CameraIcons'
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
  // 优先用星表真实星名，避免与故事标题重复
  if (props.star.catalogStarId) return getStarDisplayName(props.star.catalogStarId)
  return props.star.title || `星 #${props.star.id}`
})
/** 故事标题：仅当与星名不同时才显示，避免重复 */
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
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
})

async function onResonate() {
  if (!props.star || localResonanceAdded.value) return
  // 访客拦截：清 token 跳登录页（与 StarDetail guestGuard 一致）
  if (props.isGuest) {
    guestHint.value = '请先登录后再共鸣'
    localStorage.removeItem('token')
    router.push('/')
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
.story-card-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(7, 8, 22, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.4s var(--ease-in-out);
}
.story-card-mask.is-mobile {
  align-items: flex-end;
}
.story-card {
  position: relative;
  background: var(--story-card-bg);
  border: 1px solid var(--vf-border);
  border-radius: 8px;
  padding: 24px;
  width: min(560px, 90vw);
  max-height: 80vh;
  overflow-y: auto;
  color: #f0ecf6;
  font-family: 'Inter', 'PingFang SC', sans-serif;
}
.story-card.is-mobile {
  width: 100%;
  max-height: 85vh;
  border-radius: 18px 18px 0 0;
  border-bottom: none;
}
.sc-close {
  position: absolute;
  top: 12px; right: 12px;
  background: transparent;
  border: none;
  color: var(--hud-text);
  cursor: pointer;
  padding: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}
.sc-close:hover { opacity: 1; }
.sc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.sc-star-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
}
.sc-star-name {
  font-family: var(--font-display);
  font-size: 1rem;
  color: var(--hud-accent);
}
.sc-tag {
  width: 14px; height: 14px;
  color: var(--hud-accent);
}
.sc-title {
  font-size: 1.1rem;
  color: var(--hud-accent);
  margin-bottom: 12px;
  font-family: var(--font-display);
}
.sc-content {
  font-size: 0.9rem;
  line-height: 1.7;
  opacity: 0.9;
  margin-bottom: 16px;
  white-space: pre-wrap;
}
.sc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.75rem;
  opacity: 0.7;
  margin-bottom: 16px;
}
.sc-meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.sc-tag-pill {
  background: rgba(202, 167, 255, 0.15);
  color: var(--accent-purple);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
}
.sc-actions {
  display: flex;
  justify-content: center;
}
.sc-resonate {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(202, 167, 255, 0.15);
  border: 1px solid var(--accent-purple);
  color: var(--hud-accent);
  padding: 10px 32px;
  border-radius: 24px;
  cursor: pointer;
  font-family: var(--font-display);
  font-size: 0.9rem;
  transition: all 0.25s var(--ease-in-out);
}
.sc-resonate:hover:not(:disabled) {
  background: rgba(202, 167, 255, 0.25);
  transform: scale(1.03);
}
.sc-resonate:disabled { opacity: 0.5; cursor: not-allowed; }
.sc-guest-hint {
  margin: 8px 0 0;
  font-size: 0.75rem;
  color: var(--rec-color, #ff5b5b);
  text-align: center;
}

/* PC 端过渡 */
.story-card-pc-enter-from, .story-card-pc-leave-to {
  opacity: 0;
}
.story-card-pc-enter-from .story-card, .story-card-pc-leave-to .story-card {
  transform: translate(0, 24px) scale(0.96);
}
.story-card-pc-enter-active, .story-card-pc-leave-active {
  transition: opacity 0.5s var(--ease-in-out);
}
.story-card-pc-enter-active .story-card, .story-card-pc-leave-active .story-card {
  transition: transform 0.5s var(--ease-in-out);
}

/* 移动端过渡 */
.story-card-mobile-enter-from, .story-card-mobile-leave-to {
  opacity: 0;
}
.story-card-mobile-enter-from .story-card, .story-card-mobile-leave-to .story-card {
  transform: translateY(100%);
}
.story-card-mobile-enter-active, .story-card-mobile-leave-active {
  transition: opacity 0.4s var(--ease-in-out);
}
.story-card-mobile-enter-active .story-card, .story-card-mobile-leave-active .story-card {
  transition: transform 0.45s var(--ease-in-out);
}
</style>
