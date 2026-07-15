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
  planetClick: [name: string, nameCN: string]
}>()

onMounted(() => {
  sky.value = useSky(canvasRef.value!, {
    onStarClick: (starId) => emit('starClick', starId),
    onStarHover: (starId) => emit('starHover', starId),
    onPlanetClick: (name, nameCN) => emit('planetClick', name, nameCN),
    observerLat: props.observerLat,
    observerLng: props.observerLng,
  })
})

// 经纬度变化时重新计算天球旋转
watch(() => [props.observerLat, props.observerLng], () => {
  sky.value?.updateHorizonRotation(props.observerLat, props.observerLng)
})

onBeforeUnmount(() => {
  sky.value?.dispose()
})

defineExpose({ sky, setStarStatsCache: (cache: Map<number, { stories: number; resonance: number; views: number; favorites: number }>) => sky.value?.setStarStatsCache(cache) })
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
