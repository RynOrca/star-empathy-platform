<template>
  <canvas ref="canvasRef" class="sky-canvas" />
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount } from 'vue'
import { useSky, type SkyAPI } from '../composables/useSky'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const sky = shallowRef<SkyAPI | null>(null)

const emit = defineEmits<{
  starClick: [starId: number]
}>()

onMounted(() => {
  sky.value = useSky(canvasRef.value!, {
    onStarClick: (starId) => emit('starClick', starId),
  })
})

onBeforeUnmount(() => {
  sky.value?.dispose()
})

defineExpose({ sky })
</script>

<style scoped>
.sky-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
}
.sky-canvas:active {
  cursor: grabbing;
}
</style>
