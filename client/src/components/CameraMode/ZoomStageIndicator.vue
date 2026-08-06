<template>
  <div class="zoom-stage-indicator">
    <button
      v-for="n in 4"
      :key="n"
      class="zsi-stage"
      :class="{ active: zoomLevel === n }"
      @click="$emit('setZoom', n)"
    >
      {{ ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][n - 1] }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  zoomLevel: number
}>()

defineEmits<{
  setZoom: [level: number]
}>()
</script>

<style scoped>
.zoom-stage-indicator {
  position: fixed;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.zsi-stage {
  background: transparent;
  border: none;
  color: var(--hud-accent);
  font-family: var(--font-display);
  font-size: 1rem;
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.25s, transform 0.25s;
  padding: 4px;
}
.zsi-stage.active {
  opacity: 1;
  transform: scale(1.1);
}

/* ═══ 级联进入动画 ═══ */
.zoom-stage-indicator { animation: zsi-enter 0.4s var(--ease-in-out) both; animation-delay: 120ms; }

@keyframes zsi-enter { from { opacity: 0; transform: translateY(-50%) translateX(20px); } to { opacity: 1; transform: translateY(-50%) translateX(0); } }
</style>
