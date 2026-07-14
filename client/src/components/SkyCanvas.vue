<template>
  <div class="sky-wrapper">
    <div class="sky-glow"></div>
    <canvas ref="canvasRef" class="sky-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount } from 'vue'
import { useSky, type SkyAPI } from '../composables/useSky'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const sky = shallowRef<SkyAPI | null>(null)

const emit = defineEmits<{
  starClick: [starId: number]
  starHover: [starId: number | null]
}>()

onMounted(() => {
  sky.value = useSky(canvasRef.value!, {
    onStarClick: (starId) => emit('starClick', starId),
    onStarHover: (starId) => emit('starHover', starId),
  })
})

onBeforeUnmount(() => {
  sky.value?.dispose()
})

defineExpose({ sky })
</script>

<style scoped>
.sky-wrapper {
  position: fixed;
  inset: 0;
}
.sky-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 45%, rgba(88, 60, 140, 0.08) 0%, rgba(40, 30, 80, 0.04) 40%, transparent 70%);
  pointer-events: none;
  z-index: 1;
}
.sky-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
  z-index: 0;
}
.sky-canvas:active {
  cursor: grabbing;
}
</style>
