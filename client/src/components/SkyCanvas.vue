<template>
  <div class="sky-wrapper">
    <!-- CSS radial-glow layers -->
    <div class="sky-glow"></div>

    <!-- drifting nebula blobs -->
    <div class="nebula nebula-a"></div>
    <div class="nebula nebula-b"></div>
    <div class="nebula nebula-c"></div>

    <canvas ref="canvasRef" class="sky-canvas" />

    <!-- three-layer story labels -->
    <div class="sky-labels">
      <div class="sky-label sl-history">
        <strong>历史里的星</strong>
        织女、牛郎、天狼，把古老传说留在夜空。
      </div>
      <div class="sky-label sl-mine">
        <strong>挂上我的故事</strong>
        把今天的心事放到某颗星旁，成为一束新光。
      </div>
      <div class="sky-label sl-others">
        <strong>看见大家</strong>
        经过别人的星光，发现相似的等待、离别和愿望。
      </div>
    </div>
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
  background:
    radial-gradient(circle at 20% 10%, #10142b 0, transparent 28rem),
    radial-gradient(circle at 80% 0%, rgba(139, 185, 255, 0.10) 0, transparent 18rem),
    linear-gradient(180deg, #070816, #10142b);
  overflow: hidden;
}

/* ── central radial glow (galaxy core) ── */
.sky-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 50% 45%, #10142b 0, #070816 72%);
  z-index: 0;
}

/* ── nebula blobs (drifting, low-opacity) ── */
.nebula {
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.45;
  z-index: 0;
  animation: drift 60s ease-in-out infinite alternate;
}
.nebula-a {
  width: 36rem; height: 28rem;
  left: 6%; top: 12%;
  background: radial-gradient(circle, #caa7ff 0%, transparent 70%);
}
.nebula-b {
  width: 30rem; height: 22rem;
  right: 4%; top: 8%;
  background: radial-gradient(circle, #8bb9ff 0%, transparent 70%);
  animation-delay: -20s;
}
.nebula-c {
  width: 40rem; height: 26rem;
  left: 25%; bottom: 6%;
  background: radial-gradient(circle, #ffd98a 0%, transparent 70%);
  opacity: 0.18;
  animation-delay: -40s;
}
@keyframes drift {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, 18px) scale(1.06); }
}

.sky-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
  z-index: 1;
}
.sky-canvas:active { cursor: grabbing; }

/* ── three-layer story labels (matching HTML mockup .sky-label) ── */
.sky-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.sky-label {
  position: absolute;
  max-width: 10.2rem;
  padding: 0.62rem 0.72rem;
  border-radius: 16px;
  background: rgba(7, 8, 22, 0.66);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #f6f1ff;
  font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif;
  font-size: 0.72rem;
  line-height: 1.48;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.32);
}
.sky-label strong {
  display: block;
  margin-bottom: 0.2rem;
  font-size: 0.86rem;
  font-weight: 700;
}

/* history — warm gold border */
.sl-history {
  left: 5%; top: 7%;
  border: 1px solid rgba(255, 217, 138, 0.44);
}
.sl-history strong { color: #ffd98a; }

/* mine — blue border */
.sl-mine {
  right: 5%; top: 18%;
  border: 1px solid rgba(139, 185, 255, 0.52);
}
.sl-mine strong { color: #8bb9ff; }

/* others — green border */
.sl-others {
  left: 7%; bottom: 25%;
  border: 1px solid rgba(149, 240, 192, 0.48);
}
.sl-others strong { color: #95f0c0; }

@media (max-width: 900px) {
  .sky-label { max-width: 9.4rem; font-size: 0.7rem; padding: 0.5rem 0.6rem; }
  .sl-mine   { right: 3%; top: 14%; }
  .nebula    { opacity: 0.3; filter: blur(40px); }
}
</style>
