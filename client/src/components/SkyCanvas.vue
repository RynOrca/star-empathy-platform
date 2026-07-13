<template>
  <canvas ref="canvasRef" class="sky-canvas" />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Vector3, Points, type BufferGeometry } from 'three'
import { useSky } from '../composables/useSky'
import type { SkyAPI } from '../composables/useSky'
import { cubeToSphere } from '../utils/sphereMapping'
import { NEARBY_LINE_COUNT, STAR_COLORS, STAR_SIZES, HIGH_RESONANCE_THRESHOLD } from '../utils/constants'

export interface StarData {
  id: number
  type: 'history' | 'user'
  title: string | null
  content: string
  resonanceCount: number
  posX: number
  posY: number
  posZ: number
  createdAt: string
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
let sky: SkyAPI | null = null
let starPoints: Points | null = null
// 索引 → StarData 映射表
let starIndexMap: Map<number, StarData> = new Map()

const emit = defineEmits<{
  'star-hover': [star: StarData | null, screenX: number, screenY: number]
  'star-select': [star: StarData, screenX: number, screenY: number]
  'star-deselect': []
  'stars-loaded': [count: number]
}>()

function buildDataPoints(stars: StarData[]) {
  if (!sky) return
  if (starPoints) {
    sky.removeDataStars(starPoints)
  }

  if (stars.length === 0) return

  starIndexMap.clear()
  const count = stars.length
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const star = stars[i]
    starIndexMap.set(i, star)

    // 坐标 → 球面映射
    const pos = cubeToSphere(star.posX, star.posY, star.posZ)
    positions[i * 3] = pos.x
    positions[i * 3 + 1] = pos.y
    positions[i * 3 + 2] = pos.z

    // 颜色
    let colorHex: string
    if (star.type === 'history') {
      colorHex = star.resonanceCount >= HIGH_RESONANCE_THRESHOLD
        ? STAR_COLORS.highResonanceHistory
        : STAR_COLORS.history
    } else {
      colorHex = star.resonanceCount >= HIGH_RESONANCE_THRESHOLD
        ? STAR_COLORS.highResonance
        : STAR_COLORS.user
    }
    const r = parseInt(colorHex.slice(1, 3), 16) / 255
    const g = parseInt(colorHex.slice(3, 5), 16) / 255
    const b = parseInt(colorHex.slice(5, 7), 16) / 255
    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b

    // 大小
    if (star.type === 'history') {
      sizes[i] = star.resonanceCount >= HIGH_RESONANCE_THRESHOLD
        ? STAR_SIZES.highResonanceHistory
        : STAR_SIZES.history
    } else {
      sizes[i] = star.resonanceCount >= HIGH_RESONANCE_THRESHOLD
        ? STAR_SIZES.highResonance
        : STAR_SIZES.user
    }
  }

  starPoints = sky.addDataStars(positions, colors, sizes)
  emit('stars-loaded', count)
}

// 父组件调用此方法设置星星数据
function setStars(stars: StarData[]) {
  buildDataPoints(stars)
}

// 添加单颗新星（投递后动态追加）
function addStar(star: StarData) {
  if (!sky || !starPoints) {
    // 如果还没有数据星，创建新的
    buildDataPoints([star])
    return
  }

  // 读出现有数据
  const oldPositions = starPoints.geometry.attributes.position.array as Float32Array
  const oldColors = starPoints.geometry.attributes.color.array as Float32Array
  const oldSizes = (starPoints.geometry.attributes as any).size?.array as Float32Array | undefined
  const oldCount = oldPositions.length / 3
  const newCount = oldCount + 1

  const newPositions = new Float32Array(newCount * 3)
  const newColors = new Float32Array(newCount * 3)
  const newSizes = new Float32Array(newCount)

  newPositions.set(oldPositions)
  newColors.set(oldColors)
  if (oldSizes) newSizes.set(oldSizes)

  const pos = cubeToSphere(star.posX, star.posY, star.posZ)
  newPositions[oldCount * 3] = pos.x
  newPositions[oldCount * 3 + 1] = pos.y
  newPositions[oldCount * 3 + 2] = pos.z

  const colorHex = STAR_COLORS.user
  const r = parseInt(colorHex.slice(1, 3), 16) / 255
  const g = parseInt(colorHex.slice(3, 5), 16) / 255
  const b = parseInt(colorHex.slice(5, 7), 16) / 255
  newColors[oldCount * 3] = r
  newColors[oldCount * 3 + 1] = g
  newColors[oldCount * 3 + 2] = b

  newSizes[oldCount] = STAR_SIZES.user
  starIndexMap.set(oldCount, star)

  sky.updateDataStars(starPoints, newPositions, newColors, newSizes)
}

// ─── 邻星查找 ────────────────────────────
function findNeighbors(starIndex: number): Vector3[] {
  if (!starPoints) return []
  const positions = starPoints.geometry.attributes.position.array as Float32Array
  const total = positions.length / 3
  const cx = positions[starIndex * 3]
  const cy = positions[starIndex * 3 + 1]
  const cz = positions[starIndex * 3 + 2]
  const targetStar = starIndexMap.get(starIndex)
  if (!targetStar) return []

  // 计算所有同类型星的距离
  const distances: { index: number; dist: number }[] = []
  for (let i = 0; i < total; i++) {
    if (i === starIndex) continue
    const star = starIndexMap.get(i)
    if (!star || star.type !== targetStar.type) continue
    const dx = positions[i * 3] - cx
    const dy = positions[i * 3 + 1] - cy
    const dz = positions[i * 3 + 2] - cz
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    distances.push({ index: i, dist })
  }

  distances.sort((a, b) => a.dist - b.dist)
  const neighbors = distances.slice(0, NEARBY_LINE_COUNT)
  return neighbors.map((n) => {
    return new Vector3(
      positions[n.index * 3],
      positions[n.index * 3 + 1],
      positions[n.index * 3 + 2],
    )
  })
}

// ─── Hover / Click 事件 ────────────────────
function onMouseMove(e: MouseEvent) {
  if (!sky || !starPoints) return
  const index = sky.getHoveredIndex(e, starPoints)
  if (index >= 0) {
    const pos = new Vector3()
    const positions = starPoints.geometry.attributes.position.array
    pos.set(positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2])
    sky.highlightPosition(pos)
    const star = starIndexMap.get(index) ?? null
    emit('star-hover', star, e.clientX, e.clientY)
    canvasRef.value!.style.cursor = 'pointer'
  } else {
    sky.clearHighlight()
    emit('star-hover', null, 0, 0)
    canvasRef.value!.style.cursor = 'grab'
  }
}

function onClick(e: MouseEvent) {
  if (!sky || !starPoints) return
  const index = sky.getHoveredIndex(e, starPoints)
  if (index >= 0) {
    const pos = new Vector3()
    const positions = starPoints.geometry.attributes.position.array
    pos.set(positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2])
    const screenPos = sky.getScreenPos(pos)
    const star = starIndexMap.get(index)
    if (star) {
      // 邻星连线
      const neighbors = findNeighbors(index)
      if (neighbors.length > 0) {
        sky.showConstellationLines(pos, neighbors)
      }
      emit('star-select', star, screenPos.x, screenPos.y)
      sky.pauseBreathing()
    }
  }
}

function clearSelection() {
  if (sky) {
    sky.clearConstellationLines()
    sky.clearHighlight()
    sky.resumeBreathing()
  }
  emit('star-deselect')
}

// ─── 触屏缩放 ──────────────────────────────
let lastPinchDist = 0

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    lastPinchDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    )
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 2 && sky) {
    e.preventDefault()
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    )
    const delta = lastPinchDist - dist
    if (Math.abs(delta) > 2) {
      sky.camera.fov = Math.max(25, Math.min(75, sky.camera.fov + delta * 0.05))
      sky.camera.updateProjectionMatrix()
    }
    lastPinchDist = dist
  }
}

onMounted(() => {
  sky = useSky({ value: canvasRef.value! })
  const el = canvasRef.value!
  el.addEventListener('mousemove', onMouseMove)
  el.addEventListener('click', onClick)
  el.addEventListener('touchstart', onTouchStart, { passive: false })
  el.addEventListener('touchmove', onTouchMove, { passive: false })
  // 防止双击缩放
  el.addEventListener('dblclick', (e) => e.preventDefault())
})

onBeforeUnmount(() => {
  if (sky) sky.dispose()
})

defineExpose({ setStars, addStar, clearSelection, getSky: () => sky })
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
