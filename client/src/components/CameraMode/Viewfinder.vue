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
    <!--
      相机十字准星 —— 严格的 SVG 统一坐标系：
      1. viewBox="0 0 100 100" + preserveAspectRatio="none"：
         所有元素都在 [0,100] × [0,100] 的虚拟坐标系内。
         屏幕中心严格对应坐标 (50, 50)。
      2. 水平线：y=50（贯穿左右），垂直线：x=50（贯穿上下），
         百分比直接映射到 viewBox，无 CSS 单位转换歧义。
      3. 中心 28×28 方框：
         SVG 原生 transform="translate(50, 50)" 把原点移到屏幕中心，
         四条边以 (-14,-14) 到 (+14,+14) 为边界绘制，
         与十字交叉点 (50,50) 保证数学上完全一致，零亚像素偏差。
      4. 不使用任何 CSS translate(50vw,50vh)、不混用 CSS 单位，
         所有几何元素都走 SVG 渲染引擎的同一坐标管线。
    -->
    <svg
      class="vf-crosshair-svg"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      shape-rendering="geometricPrecision"
      vector-effect="non-scaling-stroke"
    >
      <!-- 水平线：屏幕垂直方向 50% 位置（viewBox y = 50） -->
      <line class="vf-ch-h" x1="0" y1="50" x2="100" y2="50" />
      <!-- 垂直线：屏幕水平方向 50% 位置（viewBox x = 50） -->
      <line class="vf-ch-v" x1="50" y1="0" x2="50" y2="100" />
      <!--
        中心方框：先把 group 原点平移到 (50, 50)，再相对原点画框。
        方框宽高：28（viewBox 单位），中心在新原点(0,0)，
        所以四角坐标为：(-14,-14) / (14,-14) / (-14,14) / (14,14)
        => 四条边严格关于中心对称，与十字线交叉点完全重合，几何误差为 0。
      -->
      <g class="vf-ch-center-group" transform="translate(50 50)">
        <line class="vf-ch-center-line" x1="-14" y1="-14" x2="14" y2="-14" />
        <line class="vf-ch-center-line" x1="-14" y1="14"  x2="14" y2="14"  />
        <line class="vf-ch-center-line" x1="-14" y1="-14" x2="-14" y2="14" />
        <line class="vf-ch-center-line" x1="14"  y1="-14" x2="14"  y2="14" />
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
/* 暗角：柔和自然的边缘晕染 */
.vf-vignette {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 180px 40px var(--vf-vignette);
}
/* 九宫格网格：更淡、更细腻，仅作构图参考 */
.vf-grid {
  position: absolute;
  inset: 16px;
}
.vf-grid-line {
  position: absolute;
  background: var(--vf-grid);
  backdrop-filter: blur(1px);
}
.vf-grid-h1, .vf-grid-h2 {
  left: 0; right: 0; height: 1px;
}
.vf-grid-h1 { top: 33.3333%; }
.vf-grid-h2 { top: 66.6666%; }
.vf-grid-v1, .vf-grid-v2 {
  top: 0; bottom: 0; width: 1px;
}
.vf-grid-v1 { left: 33.3333%; }
.vf-grid-v2 { left: 66.6666%; }

/* 外边框：极淡、圆角 14px */
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
/* 四角标记：精致 L 形 */
.vf-corner {
  position: absolute;
  width: 28px;
  height: 28px;
  border-color: var(--accent);
  border-style: solid;
  border-width: 0;
  opacity: 0.55;
  filter: drop-shadow(0 0 3px rgba(255, 217, 138, 0.15));
  box-sizing: border-box;
}
.vf-corner-tl { top: 18px; left: 18px;  border-top-width: 2px; border-left-width: 2px;  border-top-left-radius: 6px; }
.vf-corner-tr { top: 18px; right: 18px; border-top-width: 2px; border-right-width: 2px; border-top-right-radius: 6px; }
.vf-corner-bl { bottom: 18px; left: 18px;  border-bottom-width: 2px; border-left-width: 2px;  border-bottom-left-radius: 6px; }
.vf-corner-br { bottom: 18px; right: 18px; border-bottom-width: 2px; border-right-width: 2px; border-bottom-right-radius: 6px; }

/* ════════════════════════════════════════════════════════════════
   十字准星（SVG 内部统一坐标系，零几何偏差）
   所有 stroke 都带 vector-effect="non-scaling-stroke"（见 SVG 属性），
   保证无论屏幕多大、DPR 多少，线宽恒定 1px / 2px。
   ════════════════════════════════════════════════════════════════ */
.vf-crosshair-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.78;
  animation: vf-crosshair-enter 0.5s var(--ease-in-out) both;
  animation-delay: 260ms;
  overflow: visible;
}
/* 贯穿十字线：金色、加粗、虚线拉长间距 */
.vf-ch-h, .vf-ch-v {
  stroke: var(--accent);
  stroke-width: 1;
  stroke-dasharray: 10 14;       /* 10 实线 + 14 间隙（屏幕像素） */
  stroke-linecap: butt;          /* 避免端点加帽导致错位 */
  filter: drop-shadow(0 0 4px rgba(255, 217, 138, 0.28));
  fill: none;
}
/* 中心方框边线：更粗，端点精确方头 */
.vf-ch-center-line {
  stroke: var(--accent);
  stroke-width: 2;
  stroke-linecap: square;        /* 方头：角落处线段外扩 1px 正好填满 28×28 边界 */
  stroke-linejoin: miter;
  fill: none;
  opacity: 1;
  filter: drop-shadow(0 0 3px rgba(255, 217, 138, 0.45));
}
/* 去掉 CSS translate 偏移 —— 所有定位由 SVG transform="translate(50 50)" 在内部完成 */
.vf-ch-center-group {
  transform: none;
}

/* 级联进入动画 */
.vf-border { animation: vf-border-enter 0.7s var(--ease-in-out) both; }
.vf-vignette { animation: vf-vignette-enter 0.9s var(--ease-in-out) both; animation-delay: 60ms; }
.vf-corner-tl, .vf-corner-tr, .vf-corner-bl, .vf-corner-br {
  animation: vf-corner-enter 0.55s var(--ease-out) both;
}
.vf-corner-tl { animation-delay: 100ms; }
.vf-corner-tr { animation-delay: 180ms; }
.vf-corner-bl { animation-delay: 260ms; }
.vf-corner-br { animation-delay: 340ms; }

@keyframes vf-border-enter    { from { opacity: 0; transform: scale(1.008); } to { opacity: 1; transform: scale(1); } }
@keyframes vf-vignette-enter  { from { opacity: 0; } to { opacity: 1; } }
@keyframes vf-corner-enter    { from { opacity: 0; transform: scale(0.6); } to { opacity: 0.55; transform: scale(1); } }
@keyframes vf-crosshair-enter { from { opacity: 0; } to { opacity: 0.78; } }
</style>
