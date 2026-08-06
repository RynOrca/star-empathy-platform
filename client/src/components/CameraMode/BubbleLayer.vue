<template>
  <div class="bubble-layer">
    <StarBubble
      v-for="item in visibleBubbles"
      :key="item.star.id"
      :star="item.star"
      :screen-x="item.inFrame.screenX"
      :screen-y="item.inFrame.screenY"
      :zoom-stage="item.inFrame.zoomStage"
      :is-active="item.star.id === activeStarId"
      @click="onBubbleClick"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StarBubble from './StarBubble.vue'
import type { StarData } from '../../composables/useStars'
import type { StoryListItem } from '../../composables/useCameraMode'

const props = defineProps<{
  stories: StoryListItem[]
  activeStarId: number | null
}>()

const emit = defineEmits<{
  click: [star: StarData]
}>()

/** 视口剔除：仅渲染屏幕坐标在视口 ±10% 内的气泡 */
const visibleBubbles = computed(() => {
  const w = window.innerWidth
  const h = window.innerHeight
  return props.stories.filter(item => {
    const x = item.inFrame.screenX
    const y = item.inFrame.screenY
    return x > -w * 0.1 && x < w * 1.1 && y > -h * 0.1 && y < h * 1.1
  })
})

function onBubbleClick(star: StarData) {
  emit('click', star)
}
</script>

<style scoped>
.bubble-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 20;
}
</style>
