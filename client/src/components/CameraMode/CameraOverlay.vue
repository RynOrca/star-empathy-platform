<template>
  <div class="camera-overlay">
    <!-- PC 端 -->
    <template v-if="!isMobile">
      <Viewfinder />
      <CameraHud
        :ra="centerCelestial.ra"
        :dec="centerCelestial.dec"
        :fov="currentFov"
        @exit="$emit('exit')"
      />
      <ViewportInfo
        :stars-in-frame="starsInFrame"
        :story-count="frameStories.length"
      />
      <ZoomFilterControl
        :zoom-level="zoomLevel"
        :filters="filters"
        @set-zoom="onSetZoom"
        @set-mode="onSetMode"
      />
      <FrameStoriesPanel
        ref="panelRef"
        :stories="frameStories"
        :active-star-id="activeStarId"
        :mode="filters.mode"
        @click-story="onStoryClick"
      />
    </template>

    <!-- 移动端 -->
    <template v-else>
      <MobileCameraHud
        :region="region"
        @exit="$emit('exit')"
      />
      <BubbleLayer
        :stories="frameStories"
        :active-star-id="activeStarId"
        @click="onBubbleClick"
      />
      <ZoomStageIndicator
        :zoom-level="zoomLevel"
        @set-zoom="onSetZoom"
      />
    </template>

    <!-- 故事卡片（两端共用） -->
    <StoryDetailCard
      :star="activeCardStar"
      :is-mobile="isMobile"
      :is-guest="isGuest"
      @close="onCloseCard"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Viewfinder from './Viewfinder.vue'
import CameraHud from './CameraHud.vue'
import ViewportInfo from './ViewportInfo.vue'
import ZoomFilterControl from './ZoomFilterControl.vue'
import FrameStoriesPanel from './FrameStoriesPanel.vue'
import MobileCameraHud from './MobileCameraHud.vue'
import BubbleLayer from './BubbleLayer.vue'
import ZoomStageIndicator from './ZoomStageIndicator.vue'
import StoryDetailCard from './StoryDetailCard.vue'
import type { StarData } from '../../composables/useStars'
import type { StarInFrame } from '../../composables/useSky'
import type { CameraFilters, CameraFilterMode, StoryListItem } from '../../composables/useCameraMode'

const props = defineProps<{
  isMobile: boolean
  isGuest: boolean
  starsInFrame: StarInFrame[]
  frameStories: StoryListItem[]
  activeStarId: number | null
  activeCardStar: StarData | null
  filters: CameraFilters
  zoomLevel: number
  centerCelestial: { ra: string; dec: string }
  currentFov: number
  region: string
}>()

const emit = defineEmits<{
  exit: []
  storyClick: [star: StarData]
  bubbleClick: [star: StarData]
  closeCard: []
  setZoom: [level: number]
  setMode: [mode: CameraFilterMode]
}>()

const panelRef = ref<InstanceType<typeof FrameStoriesPanel> | null>(null)

function onStoryClick(star: StarData) {
  // 若卡片未居中，先滚动居中
  if (panelRef.value && !panelRef.value.isCardCentered(star.id)) {
    panelRef.value.scrollToCardCenter(star.id)
  }
  emit('storyClick', star)
}

function onBubbleClick(star: StarData) {
  emit('bubbleClick', star)
}

function onCloseCard() {
  emit('closeCard')
}

function onSetZoom(level: number) {
  emit('setZoom', level)
}

function onSetMode(mode: CameraFilterMode) {
  emit('setMode', mode)
}

defineExpose({ panelRef })
</script>

<style scoped>
.camera-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  pointer-events: none;
}
</style>
