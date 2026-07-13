<template>
  <canvas ref="canvasRef" class="sky-canvas" />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useSky } from '../composables/useSky'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let sky: ReturnType<typeof useSky> | null = null

onMounted(() => {
  sky = useSky(canvasRef.value!)
})

onBeforeUnmount(() => {
  sky?.dispose()
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
