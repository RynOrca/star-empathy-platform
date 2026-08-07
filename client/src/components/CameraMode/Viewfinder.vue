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
    <!-- 十字准星全部用独立 div 定位：避免 SVG viewBox 缺失 + 百分比/vw混用造成的对齐偏差 -->
    <!-- 贯穿水平线：屏幕正中央 top:50% -->
    <div class="vf-crosshair vf-ch-h-line" />
    <!-- 贯穿垂直线：屏幕正中央 left:50% -->
    <div class="vf-crosshair vf-ch-v-line" />
    <!-- 中心方框：用一个定位容器包住 4 条边，统一 left:50%/top:50% translate(-50%,-50%) 精准居中 -->
    <div class="vf-ch-center-wrap">
      <span class="vf-ch-center-edge vf-ch-center-top" />
      <span class="vf-ch-center-edge vf-ch-center-bottom" />
      <span class="vf-ch-center-edge vf-ch-center-left" />
      <span class="vf-ch-center-edge vf-ch-center-right" />
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

/* ═══ 相机十字准星（DIV 实现，精确居中无 SVG viewBox 偏差问题） ═══ */
.vf-crosshair {
  position: absolute;
  z-index: 3;
  background: var(--accent);
  box-shadow: 0 0 4px rgba(255, 217, 138, 0.35);
  /* 虚线质感：用 repeating-linear-gradient 模拟，避免 border-style:dashed 端点对齐 */
  background-image: repeating-linear-gradient(
    to right,
    var(--accent) 0 10px,
    transparent 10px 24px
  );
  opacity: 0.78;
  animation: vf-crosshair-enter 0.5s var(--ease-in-out) both;
  animation-delay: 260ms;
}
.vf-ch-h-line {
  /* 贯穿水平线：屏幕正中央（高度方向） */
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
  /* 横向虚线 */
  background-image: repeating-linear-gradient(
    to right,
    var(--accent) 0 10px,
    transparent 10px 24px
  );
  transform: translateY(-50%);
}
.vf-ch-v-line {
  /* 贯穿垂直线：屏幕正中央（宽度方向） */
  left: 50%;
  top: 0;
  width: 1px;
  height: 100%;
  /* 纵向虚线：把渐变方向改成 to bottom */
  background-image: repeating-linear-gradient(
    to bottom,
    var(--accent) 0 10px,
    transparent 10px 24px
  );
  transform: translateX(-50%);
}

/* 中心方框容器：用 translate(-50%, -50%) 精准对齐十字交叉点 */
.vf-ch-center-wrap {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 28px;
  height: 28px;
  transform: translate(-50%, -50%);
  z-index: 4;
  opacity: 1;
  animation: vf-crosshair-enter 0.5s var(--ease-in-out) both;
  animation-delay: 280ms;
}
.vf-ch-center-edge {
  position: absolute;
  background: var(--accent);
  box-shadow: 0 0 4px rgba(255, 217, 138, 0.5);
  border-radius: 1px;
}
.vf-ch-center-top    { left: 0; top: 0;    width: 100%; height: 2px; }
.vf-ch-center-bottom { left: 0; bottom: 0; width: 100%; height: 2px; }
.vf-ch-center-left   { left: 0; top: 0;    width: 2px; height: 100%; }
.vf-ch-center-right  { right: 0; top: 0;   width: 2px; height: 100%; }

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
