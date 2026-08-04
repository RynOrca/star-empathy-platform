<template>
  <span
    v-if="collectionName"
    class="cb-badge"
    :class="[sizeClass, { clickable }]"
    :title="`合集：${collectionName}${isPrivate ? '（私有）' : ''}${storyCount != null ? ` · ${storyCount} 篇` : ''}`"
    @click.stop="clickable && emit('click')"
  >
    <span class="cb-dot" :style="{ background: dotColor }"></span>
    <component :is="iconComp" :size="iconSize" class="cb-icon" />
    <span class="cb-text">
      <span class="cb-name">{{ collectionName }}</span>
      <span v-if="storyCount != null && storyCount >= 0" class="cb-count">{{ storyCount }} 篇</span>
    </span>
    <Lock v-if="isPrivate" :size="lockSize" class="cb-lock" />
    <ChevronRight v-if="clickable" :size="chevronSize" class="cb-chevron" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BookMarked, Lock, ChevronRight } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  collectionName: string | null
  coverColor?: string | null
  collectionVisibility?: string | null
  collectionStoryCount?: number | null
  clickable?: boolean
  size?: 'sm' | 'md'
}>(), {
  coverColor: null,
  collectionVisibility: null,
  collectionStoryCount: null,
  clickable: false,
  size: 'sm',
})

const emit = defineEmits<{ click: [] }>()

const isPrivate = computed(() => props.collectionVisibility === 'private')
const dotColor = computed(() => props.coverColor || '#E8B86D')
const iconComp = BookMarked
const storyCount = computed(() => props.collectionStoryCount)

const sizeClass = computed(() => `cb-${props.size}`)
const iconSize = computed(() => props.size === 'md' ? 17 : 11)
const lockSize = computed(() => props.size === 'md' ? 13 : 9)
const chevronSize = computed(() => props.size === 'md' ? 16 : 12)
</script>

<style scoped>
/* ── 基础（sm 尺寸，用于 StoryCard 标签行内） ── */
.cb-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px 3px 8px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.035);
  border: 0.5px solid rgba(255, 255, 255, 0.07);
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.72);
  letter-spacing: 0.01em;
  line-height: 1;
  white-space: nowrap;
  vertical-align: middle;
  transition: background .15s ease, border-color .15s ease, transform .15s ease;
}
.cb-badge.clickable {
  cursor: pointer;
}
.cb-badge.clickable:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.14);
  transform: translateY(-0.5px);
}
.cb-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 5px currentColor;
  opacity: 0.9;
}
.cb-icon {
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}
.cb-text {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  overflow: hidden;
}
.cb-name {
  overflow: hidden;
  text-overflow: ellipsis;
}
.cb-count {
  font-size: 0.85em;
  font-weight: 400;
  opacity: 0.5;
  margin-left: -1px;
}
.cb-lock {
  color: rgba(255, 255, 255, 0.34);
  flex-shrink: 0;
}
.cb-chevron {
  color: rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
  transition: transform .18s ease, color .18s ease;
}

/* ── md 尺寸（用于 StoryDetail 详情页，更大更醒目） ── */
.cb-md {
  gap: 9px;
  padding: 9px 16px 9px 14px;
  border-radius: 100px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.86);
  letter-spacing: 0.02em;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.12);
}
.cb-md .cb-dot {
  width: 9px;
  height: 9px;
  box-shadow: 0 0 8px currentColor;
}
.cb-md .cb-icon {
  color: rgba(232, 184, 109, 0.72);
}
.cb-md .cb-name {
  font-weight: 600;
}
.cb-md .cb-count {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.07);
  border: 0.5px solid rgba(255, 255, 255, 0.06);
  opacity: 0.85;
  margin-left: 2px;
}
.cb-md .cb-lock {
  color: rgba(255, 255, 255, 0.4);
}
.cb-md.clickable {
  border-color: rgba(232, 184, 109, 0.22);
}
.cb-md.clickable .cb-chevron {
  color: rgba(232, 184, 109, 0.5);
}
.cb-md.clickable:hover {
  background: linear-gradient(135deg, rgba(232, 184, 109, 0.1), rgba(255, 255, 255, 0.04));
  border-color: rgba(232, 184, 109, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.18);
}
.cb-md.clickable:hover .cb-icon {
  color: rgba(232, 184, 109, 0.9);
}
.cb-md.clickable:hover .cb-chevron {
  color: rgba(232, 184, 109, 0.85);
  transform: translateX(2px);
}
</style>
