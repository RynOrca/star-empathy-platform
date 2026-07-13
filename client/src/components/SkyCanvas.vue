<template>
  <canvas ref="canvasRef" class="sky-canvas" />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Vector3 } from 'three'
import { useSky } from '../composables/useSky'
import type { SkyAPI, StoryAttachment } from '../composables/useSky'
import catalogData from '../data/stars.json'
import { NEARBY_LINE_COUNT } from '../utils/constants'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let sky: SkyAPI | null = null
let allAttachments: StoryAttachment[] = []

const emit = defineEmits<{
  'star-hover': [attachment: StoryAttachment | null, screenX: number, screenY: number]
  'star-select': [attachment: StoryAttachment, catalogName: string | null, screenX: number, screenY: number]
  'star-deselect': []
  'stars-loaded': [count: number]
}>()

// ─── 主入口 ──────────────────────────────────
function setStoryAttachments(attachments: StoryAttachment[]) {
  if (!sky) return
  allAttachments = attachments
  sky.attachStories(attachments)
  emit('stars-loaded', attachments.length)
}

function addStoryAttachment(att: StoryAttachment) {
  if (!sky) return
  allAttachments.push(att)
  sky.attachOneStory(att)
}

// ─── 邻星查找 ──────────────────────────────
function findNearbyStars(centerIndex: number, count: number): Vector3[] {
  const centerStar = catalogData[centerIndex] as any
  if (!centerStar) return []
  const cx = centerStar.x, cy = centerStar.y, cz = centerStar.z

  const distances: { x: number; y: number; z: number; d: number }[] = []
  for (let i = 0; i < catalogData.length; i++) {
    if (i === centerIndex) continue
    const s = catalogData[i] as any
    const dx = s.x - cx, dy = s.y - cy, dz = s.z - cz
    distances.push({ x: s.x, y: s.y, z: s.z, d: Math.sqrt(dx * dx + dy * dy + dz * dz) })
  }
  distances.sort((a, b) => a.d - b.d)
  return distances.slice(0, count).map(t => new Vector3(t.x, t.y, t.z))
}

// ─── Hover / Click ───────────────────────────
function onMouseMove(e: MouseEvent) {
  if (!sky) return
  const index = sky.getHoveredIndex(e)
  if (index >= 0) {
    const { catalog, attachment } = sky.getStarAt(index)
    const pos = new Vector3(catalog.x, catalog.y, catalog.z)
    sky.highlightPosition(pos)
    emit('star-hover', attachment, e.clientX, e.clientY)
    canvasRef.value!.style.cursor = attachment ? 'pointer' : 'default'
  } else {
    sky.clearHighlight()
    emit('star-hover', null, 0, 0)
    canvasRef.value!.style.cursor = 'grab'
  }
}

function onClick(e: MouseEvent) {
  if (!sky) return
  const index = sky.getHoveredIndex(e)
  if (index >= 0) {
    const { catalog, attachment } = sky.getStarAt(index)
    const pos = new Vector3(catalog.x, catalog.y, catalog.z)
    const screenPos = sky.getScreenPos(pos)

    // 邻星连线
    const neighbors = findNearbyStars(index, NEARBY_LINE_COUNT)
    if (neighbors.length > 0) sky.showConstellationLines(pos, neighbors)

    if (attachment) {
      emit('star-select', attachment, catalog.name, screenPos.x, screenPos.y)
    } else if (catalog.name) {
      // 亮星但无故事 → 显示星名
      const emptyAtt: StoryAttachment = {
        storyId: -1, catalogStarId: index,
        type: 'history', title: catalog.name,
        content: '', resonanceCount: 0,
      }
      emit('star-select', emptyAtt, catalog.name, screenPos.x, screenPos.y)
    }
    sky.pauseBreathing()
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

// ─── 触屏 ────────────────────────────────────
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
    if (Math.abs(dist - lastPinchDist) > 2) {
      sky.camera.fov = Math.max(25, Math.min(75, sky.camera.fov + (lastPinchDist - dist) * 0.05))
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
  el.addEventListener('dblclick', (e) => e.preventDefault())
})

onBeforeUnmount(() => { if (sky) sky.dispose() })

defineExpose({ setStoryAttachments, addStoryAttachment, clearSelection, getSky: () => sky })
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
.sky-canvas:active { cursor: grabbing; }
</style>
