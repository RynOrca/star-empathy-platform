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
/* 暗角：柔和自然的边缘晕染，不再像黑框，更像"景深" */
.vf-vignette {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 180px 40px var(--vf-vignette);
  border-radius: 0;
}
/* 九宫格网格：更淡、更细腻，仅作构图参考 */
.vf-grid {
  position: absolute;
  inset: 16px;  /* 缩进，避免贴死边角 */
}
.vf-grid-line {
  position: absolute;
  background: var(--vf-grid);
  backdrop-filter: blur(1px);
}
.vf-grid-h1, .vf-grid-h2 {
  left: 0; right: 0; height: 1px;
  border-radius: 1px;
}
.vf-grid-h1 { top: 33.33%; }
.vf-grid-h2 { top: 66.66%; }
.vf-grid-v1, .vf-grid-v2 {
  top: 0; bottom: 0; width: 1px;
  border-radius: 1px;
}
.vf-grid-v1 { left: 33.33%; }
.vf-grid-v2 { left: 66.66%; }
/* 外边框：极淡、圆角，和主 panel 一致的 10px 圆角语义 */
.vf-border {
  position: absolute;
  inset: 10px;
  border: 1px solid var(--vf-border);
  border-radius: var(--radius-lg);
  box-sizing: border-box;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.015) inset,
    0 0 30px rgba(202, 167, 255, 0.04);
}
/* 四角标记：更精致、L 形短边、渐变柔和色 */
.vf-corner {
  position: absolute;
  width: 28px;
  height: 28px;
  border-color: var(--accent);
  border-style: solid;
  border-width: 0;
  opacity: 0.55;
  filter: drop-shadow(0 0 3px rgba(255, 217, 138, 0.15));
}
.vf-corner-tl { top: 18px; left: 18px; border-top-width: 2px; border-left-width: 2px; border-top-left-radius: 6px; }
.vf-corner-tr { top: 18px; right: 18px; border-top-width: 2px; border-right-width: 2px; border-top-right-radius: 6px; }
.vf-corner-bl { bottom: 18px; left: 18px; border-bottom-width: 2px; border-left-width: 2px; border-bottom-left-radius: 6px; }
.vf-corner-br { bottom: 18px; right: 18px; border-bottom-width: 2px; border-right-width: 2px; border-bottom-right-radius: 6px; }

/* ═══ 相机十字准星：更明显的金色调，加粗，让用户一眼看到相机模式 ═══ */
.vf-crosshair-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.78;
  animation: vf-crosshair-enter 0.5s var(--ease-in-out) both;
  animation-delay: 260ms;
}
.vf-ch-h, .vf-ch-v {
  stroke: var(--accent);
  stroke-width: 1;
  stroke-dasharray: 10 14;   /* 拉长虚线间距，更有"取景器"识别度 */
  filter: drop-shadow(0 0 4px rgba(255, 217, 138, 0.25));
}
.vf-ch-center-group {
  transform: translate(calc(50vw - 14px), calc(50vh - 14px));
}
.vf-ch-center-line {
  stroke: var(--accent);
  stroke-width: 2;
  stroke-linecap: round;
  opacity: 1;
  filter: drop-shadow(0 0 3px rgba(255, 217, 138, 0.45));
}

/* ═══ 级联进入动画（更柔和、时间略拉长，避免"一下子全出来"） ═══ */
.vf-border { animation: vf-border-enter 0.7s var(--ease-in-out) both; }
.vf-vignette { animation: vf-vignette-enter 0.9s var(--ease-in-out) both; animation-delay: 60ms; }
.vf-corner-tl, .vf-corner-tr, .vf-corner-bl, .vf-corner-br {
  animation: vf-corner-enter 0.55s var(--ease-out) both;
}
.vf-corner-tl { animation-delay: 100ms; }
.vf-corner-tr { animation-delay: 180ms; }
.vf-corner-bl { animation-delay: 260ms; }
.vf-corner-br { animation-delay: 340ms; }

@keyframes vf-border-enter { from { opacity: 0; transform: scale(1.008); } to { opacity: 1; transform: scale(1); } }
@keyframes vf-vignette-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes vf-corner-enter { from { opacity: 0; transform: scale(0.6); } to { opacity: 0.55; transform: scale(1); } }
@keyframes vf-crosshair-enter { from { opacity: 0; transform: scale(1.02); } to { opacity: 0.3; transform: scale(1); } }
</style>
