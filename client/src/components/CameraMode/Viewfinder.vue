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
    <!-- 相机十字准星：用 SVG 绘制贯穿屏幕的十字线（单一合成层，避免大 div 卡顿） -->
    <svg class="vf-crosshair-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <line class="vf-ch-h" x1="0" y1="50%" x2="100%" y2="50%" />
      <line class="vf-ch-v" x1="50%" y1="0" x2="50%" y2="100%" />
      <!-- 中心 16x16 方框：用 4 条短线段绘制，通过 CSS transform 居中 -->
      <g class="vf-ch-center-group">
        <line class="vf-ch-center-line" x1="0" y1="0" x2="16" y2="0" />
        <line class="vf-ch-center-line" x1="0" y1="16" x2="16" y2="16" />
        <line class="vf-ch-center-line" x1="0" y1="0" x2="0" y2="16" />
        <line class="vf-ch-center-line" x1="16" y1="0" x2="16" y2="16" />
      </g>
    </svg>
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

/* ═══ 相机十字准星：SVG 单一合成层，避免大 div 每帧重绘卡顿 ═══ */
.vf-crosshair-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.58;              /* 稍微淡一点：0.7 → 0.58 */
  animation: vf-crosshair-enter 0.4s var(--ease-in-out) both;
  animation-delay: 240ms;
}
.vf-ch-h, .vf-ch-v {
  /* ⭐ 改为实线：去掉 stroke-dasharray，略调粗细保持现代精致感 */
  stroke: var(--accent);
  stroke-width: 1;
  filter: drop-shadow(0 0 2px rgba(255, 217, 138, 0.25));
}
.vf-ch-center-group {
  transform: translate(calc(50vw - 8px), calc(50vh - 8px));
}
.vf-ch-center-line {
  /* 方框保持金色 + 细一点（1.8 → 1.4），辉光降低 */
  stroke: var(--accent);
  stroke-width: 1.4;
  filter: drop-shadow(0 0 2px rgba(255, 217, 138, 0.45));
  opacity: 0.95;
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

@keyframes vf-border-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes vf-vignette-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes vf-corner-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes vf-crosshair-enter { from { opacity: 0; } to { opacity: 0.58; } }
</style>
