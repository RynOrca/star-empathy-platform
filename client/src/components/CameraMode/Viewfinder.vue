<template>
  <div class="viewfinder">
    <div class="vf-vignette" />
    <div class="vf-grid">
      <div class="vf-grid-line vf-grid-h1" />
      <div class="vf-grid-line vf-grid-h2" />
      <div class="vf-grid-line vf-grid-v1" />
      <div class="vf-grid-line vf-grid-v2" />
    </div>
    <div class="vf-border" />
    <div class="vf-corner vf-corner-tl" />
    <div class="vf-corner vf-corner-tr" />
    <div class="vf-corner vf-corner-bl" />
    <div class="vf-corner vf-corner-br" />
    <div class="vf-crosshair">
      <CrosshairIcon />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CrosshairIcon } from './icons/CameraIcons'
</script>

<style scoped>
.viewfinder {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}
.vf-vignette {
  position: absolute;
  inset: 24px;
  border-radius: 4px;
  box-shadow: inset 0 0 200px 60px var(--vf-vignette);
}
.vf-grid {
  position: absolute;
  inset: 24px;
}
.vf-grid-line {
  position: absolute;
  background: var(--vf-grid);
}
.vf-grid-h1, .vf-grid-h2 {
  left: 0; right: 0; height: 1px;
}
.vf-grid-h1 { top: 33.33%; }
.vf-grid-h2 { top: 66.66%; }
.vf-grid-v1, .vf-grid-v2 {
  top: 0; bottom: 0; width: 1px;
}
.vf-grid-v1 { left: 33.33%; }
.vf-grid-v2 { left: 66.66%; }
.vf-border {
  position: absolute;
  inset: 24px;
  border: 2px solid var(--vf-border);
  border-radius: 4px;
}
.vf-corner {
  position: absolute;
  width: 32px;
  height: 32px;
  border-color: var(--vf-border);
  border-style: solid;
  border-width: 0;
}
.vf-corner-tl { top: 20px; left: 20px; border-top-width: 3px; border-left-width: 3px; }
.vf-corner-tr { top: 20px; right: 20px; border-top-width: 3px; border-right-width: 3px; }
.vf-corner-bl { bottom: 20px; left: 20px; border-bottom-width: 3px; border-left-width: 3px; }
.vf-corner-br { bottom: 20px; right: 20px; border-bottom-width: 3px; border-right-width: 3px; }
.vf-crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--vf-crosshair);
  opacity: 0.7;
}

/* ═══ 级联进入动画 ═══ */
.vf-border { animation: vf-border-enter 0.5s var(--ease-in-out) both; }
.vf-vignette { animation: vf-vignette-enter 0.6s var(--ease-in-out) both; animation-delay: 40ms; }
.vf-corner-tl, .vf-corner-tr, .vf-corner-bl, .vf-corner-br {
  animation: vf-corner-enter 0.4s var(--ease-in-out) both;
}
.vf-corner-tl { animation-delay: 80ms; }
.vf-corner-tr { animation-delay: 120ms; }
.vf-corner-bl { animation-delay: 160ms; }
.vf-corner-br { animation-delay: 200ms; }
.vf-crosshair { animation: vf-crosshair-enter 0.4s var(--ease-in-out) both; animation-delay: 240ms; }

@keyframes vf-border-enter { from { opacity: 0; transform: scale(1.04); } to { opacity: 1; transform: scale(1); } }
@keyframes vf-vignette-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes vf-corner-enter { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
@keyframes vf-crosshair-enter { from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } to { opacity: 0.7; transform: translate(-50%, -50%) scale(1); } }
</style>
