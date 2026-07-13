<template>
  <canvas ref="canvasRef" class="sky-canvas" />
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)

const emit = defineEmits<{
  'star-hover': [star: any, screenX: number, screenY: number]
  'star-select': [star: any, screenX: number, screenY: number]
  'star-deselect': []
  'stars-loaded': []
}>()

onMounted(() => {
  // Phase 2 实现 Three.js 场景
  console.log('SkyCanvas mounted')
})

defineExpose({
  addStar: (star: any) => {},
  refreshStars: () => {},
})
</script>

<style scoped>
.sky-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
</style>
