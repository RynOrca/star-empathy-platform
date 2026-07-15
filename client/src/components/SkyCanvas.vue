<template>
  <canvas ref="canvasRef" class="sky-canvas" />
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, watch } from 'vue'
import { useSky, type SkyAPI } from '../composables/useSky'

const props = defineProps<{
  observerLat?: number
  observerLng?: number
}>()

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
    observerLat: props.observerLat,
    observerLng: props.observerLng,
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
