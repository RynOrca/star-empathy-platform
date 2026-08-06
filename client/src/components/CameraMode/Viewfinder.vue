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
    <!-- 相机十字准星：贯穿中心的细十字线 -->
    <div class="vf-crosshair">
      <div class="vf-crosshair-h" />
      <div class="vf-crosshair-v" />
      <div class="vf-crosshair-center" />
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.viewfinder {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}
/* 暗角：贴近视口边缘，包含 HUD 区域 */
.vf-vignette {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 200px 60px var(--vf-vignette);
}
/* 九宫格网格 */
.vf-grid {
  position: absolute;
  inset: 0;
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
/* 紫色边框：贴近视口边缘，包含顶部 HUD 和底部参数栏 */
.vf-border {
  position: absolute;
  inset: 0;
  border: 2px solid var(--vf-border);
  box-sizing: border-box;
}
/* 四角标记 */
.vf-corner {
  position: absolute;
  width: 36px;
  height: 36px;
  border-color: var(--vf-border);
  border-style: solid;
  border-width: 0;
}
.vf-corner-tl { top: 4px; left: 4px; border-top-width: 3px; border-left-width: 3px; }
.vf-corner-tr { top: 4px; right: 4px; border-top-width: 3px; border-right-width: 3px; }
.vf-corner-bl { bottom: 4px; left: 4px; border-bottom-width: 3px; border-left-width: 3px; }
.vf-corner-br { bottom: 4px; right: 4px; border-bottom-width: 3px; border-right-width: 3px; }

/* ═══ 相机十字准星：贯穿中心的两条细线 + 中心点 ═══ */
.vf-crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
}
.vf-crosshair-h {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100vw;
  height: 1px;
  background: var(--vf-crosshair);
  opacity: 0.35;
  transform: translate(-50%, -50%);
}
.vf-crosshair-v {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1px;
  height: 100vh;
  background: var(--vf-crosshair);
  opacity: 0.35;
  transform: translate(-50%, -50%);
}
.vf-crosshair-center {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  transform: translate(-50%, -50%);
}
.vf-crosshair-center::before,
.vf-crosshair-center::after {
  content: '';
  position: absolute;
  background: var(--vf-crosshair);
  opacity: 0.9;
}
.vf-crosshair-center::before {
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  transform: translateY(-50%);
}
.vf-crosshair-center::after {
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  transform: translateX(-50%);
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

@keyframes vf-border-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes vf-vignette-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes vf-corner-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes vf-crosshair-enter { from { opacity: 0; } to { opacity: 1; } }
</style>
