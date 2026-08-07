<template>
  <div class="camera-hud">
    <!--
      ═══ 顶部 HUD：严格盒模型对齐 ═══
      1. .hud-top: 外层 flex row, 子元素统一 display:inline-flex, align-items:center
      2. 每一个胶囊/chip 都是 height:36px, box-sizing:border-box, border:1px 统一
      3. backdrop-filter blur 移入 ::before 伪元素独立图层，
         避免 blur 像素外扩影响内容盒边框的几何对齐。
      4. 子元素统一 vertical-align:middle / line-height:1 / flex-center 内对齐，
         保证三项外边缘（上边框 / 下边框）y 坐标完全一致。
    -->
    <div class="hud-top">
      <!-- 左：退出按钮 -->
      <button class="hud-pill hud-exit" @click="$emit('exit')">
        <span class="pill-icon-wrap pill-icon-gold">
          <ApertureIcon />
        </span>
        <span class="pill-label">天镜览星</span>
      </button>

      <!-- 中：模式标签 PHOTO·取景中 -->
      <div class="hud-pill hud-mode">
        <span class="pill-dot" />
        <span class="pill-mode-text">PHOTO · 取景中</span>
      </div>

      <!-- 右：RA / DEC / FOV chip 组（组本身不设外框，内部单个 chip 有） -->
      <div class="hud-chips">
        <div class="hud-chip">
          <span class="chip-label">RA</span>
          <span class="chip-value tabular">{{ ra }}</span>
        </div>
        <div class="hud-chip">
          <span class="chip-label">DEC</span>
          <span class="chip-value tabular">{{ dec }}</span>
        </div>
        <div class="hud-chip chip-accent">
          <span class="chip-label">FOV</span>
          <span class="chip-value tabular">{{ fov }}°</span>
        </div>
      </div>
    </div>

    <!-- 底部 HUD：参数 + 时间/帧率，浮动胶囊组 -->
    <div class="hud-bottom">
      <div class="hud-pill hud-params">
        <span class="param"><span class="param-label">ISO</span><span class="param-val tabular">800</span></span>
        <span class="param-sep" />
        <span class="param"><span class="param-label">S</span><span class="param-val tabular">1/60s</span></span>
        <span class="param-sep" />
        <span class="param"><span class="param-label">f</span><span class="param-val tabular">2.8</span></span>
      </div>

      <div class="hud-pill hud-meta">
        <span class="meta-item"><span class="meta-val tabular">{{ date }}</span></span>
        <span class="param-sep" />
        <span class="meta-item"><span class="meta-val tabular">{{ time }}</span></span>
        <span class="param-sep" />
        <span class="meta-item"><span class="meta-label">FPS</span><span class="meta-val tabular meta-fps">{{ fps }}</span></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ApertureIcon } from './icons/CameraIcons'

defineProps<{
  ra: string
  dec: string
  fov: number
}>()

defineEmits<{ exit: [] }>()

const date = ref('')
const time = ref('')
const fps = ref(60)
let timer: number | null = null
let frameCount = 0
let lastFpsTime = performance.now()

function updateDateTime() {
  const now = new Date()
  date.value = now.toLocaleDateString('zh-CN')
  time.value = now.toLocaleTimeString('zh-CN', { hour12: false })
}

function tick() {
  frameCount++
  const now = performance.now()
  if (now - lastFpsTime >= 1000) {
    fps.value = Math.round(frameCount * 1000 / (now - lastFpsTime))
    frameCount = 0
    lastFpsTime = now
  }
  updateDateTime()
  timer = requestAnimationFrame(tick)
}

onMounted(() => {
  updateDateTime()
  timer = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (timer) cancelAnimationFrame(timer)
})
</script>

<style scoped>
.camera-hud {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 20;
  font-family: var(--font);
  color: var(--hud-text-strong);
}

/* ═══ 顶部 HUD：外层 row，3 项两端对齐 ═══ */
.hud-top {
  position: absolute;
  top: 20px;
  left: 36px;
  right: 36px;
  display: flex;
  align-items: center;              /* 关键：子元素垂直中心线对齐 */
  justify-content: space-between;
  gap: 16px;
  pointer-events: none;
}

/* ════════════════════════════════════════════════════════════════
   通用 HUD 胶囊盒子 —— 严格盒模型保证：
   • 总高度 = 36px （content + padding + border 三者之和）
   • 上边框 y 坐标、下边框 y 坐标 在三个胶囊之间完全一致
   • 所有视觉装饰（blur / shadow）放到 ::before 伪元素，
     不参与内容盒尺寸计算，避免 blur 渲染扩张导致对齐偏差
   ════════════════════════════════════════════════════════════════ */
.hud-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;                   /* 固定盒子高度 */
  padding: 0 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--hud-border);
  background: var(--hud-bg);
  color: var(--ink);
  box-sizing: border-box;         /* 高度包含 1px 上下边框 → content=34px */
  line-height: 1;                 /* 禁止行高干扰 */
  pointer-events: auto;
  overflow: visible;
  isolation: isolate;             /* 保证 ::before 在独立层 */
}
/* 视觉装饰独立层：blur + 阴影，不影响几何盒尺寸 */
.hud-pill::before {
  content: '';
  position: absolute;
  inset: -1px;                    /* 覆盖边框外 1px，让 blur 均匀 */
  border-radius: inherit;
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  box-shadow: var(--shadow-md);
  z-index: -1;
  pointer-events: none;
}

/* 内部文字统一基线 */
.hud-pill > * {
  display: inline-flex;
  align-items: center;
  line-height: 1;
  vertical-align: middle;
  margin: 0;
  padding: 0;
}

/* 左：退出按钮 hover 金色强调 */
.hud-exit {
  cursor: pointer;
  font-family: var(--font);
  transition: border-color var(--transition-normal), transform var(--transition-normal), background var(--transition-normal);
}
.hud-exit:hover {
  border-color: var(--accent-border);
  background: var(--accent-subtle);
  transform: translateY(-1px);
}
.hud-exit:hover::before {
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--accent-border);
}

/* 退出胶囊内：金色图标容器 22×22 */
.pill-icon-wrap {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pill-icon-gold {
  background: var(--accent-subtle);
  color: var(--accent);
  border: 0.5px solid var(--accent-border);
}
.pill-label {
  font-size: var(--text-sm);     /* 13px */
  font-weight: 500;
  color: var(--ink);
  letter-spacing: 0.02em;
}

/* 中：PHOTO·取景中 模式胶囊 */
.hud-mode { gap: 6px; }
.pill-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
  animation: pill-breathe 2.4s ease-in-out infinite;
}
@keyframes pill-breathe {
  0%, 100% { opacity: 1;    transform: scale(1); }
  50%      { opacity: 0.55; transform: scale(0.85); }
}
.pill-mode-text {
  font-size: var(--text-xs);     /* 11/12px */
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--ink-secondary);
  text-transform: uppercase;
}

/* 右：Chip 组 —— 组本身不设框，仅作为容器 */
.hud-chips {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;                  /* 关键：与胶囊同高，保证垂直中心对齐 */
}

/* 单个 Chip —— 同样 36px 高，box-sizing:border-box，1px border */
.hud-chip {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;        /* 内部两行（label + value）垂直居中 */
  gap: 2px;
  height: 36px;
  padding: 0 11px 0 13px;
  min-width: 72px;
  border-radius: var(--radius-md);
  border: 1px solid var(--hud-border);
  background: var(--hud-bg);
  box-sizing: border-box;
  line-height: 1;
  overflow: visible;
  isolation: isolate;
  transition: border-color var(--transition-fast);
}
.hud-chip::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  backdrop-filter: blur(14px) saturate(1.1);
  -webkit-backdrop-filter: blur(14px) saturate(1.1);
  box-shadow: var(--shadow-sm);
  z-index: -1;
  pointer-events: none;
}
.hud-chip:hover { border-color: var(--rule-hover); }
.hud-chip.chip-accent {
  border-color: var(--accent-border);
  background: linear-gradient(135deg, var(--accent-subtle) 0%, var(--hud-bg) 60%);
}
.chip-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.14em;
  color: var(--muted);
  text-transform: uppercase;
  line-height: 1;
}
.chip-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--hud-accent);
  line-height: 1.1;
}
.tabular { font-variant-numeric: tabular-nums; }

/* ═══ 底部 HUD ═══ */
.hud-bottom {
  position: absolute;
  bottom: 20px;
  left: 36px;
  right: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}
.hud-params, .hud-meta {
  gap: 12px;
  font-size: var(--text-xs);
}
.param, .meta-item {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  line-height: 1;
}
.param-label, .meta-label {
  color: var(--muted);
  font-weight: 500;
  letter-spacing: 0.04em;
  font-size: 11px;
}
.param-val, .meta-val {
  color: var(--ink-secondary);
  font-weight: 500;
}
.meta-fps { color: var(--accent); }
.param-sep {
  width: 1px;
  height: 14px;
  background: var(--hud-border);
}

/* ═══ 级联进入动画（柔和、错落） ═══ */
.hud-exit    { animation: hud-pill-in 0.55s var(--ease-out) both; animation-delay: 80ms;  transform-origin: left center; }
.hud-mode    { animation: hud-pill-in 0.55s var(--ease-out) both; animation-delay: 160ms; }
.hud-chips   { animation: hud-pill-in 0.55s var(--ease-out) both; animation-delay: 220ms; transform-origin: right center; }
.hud-params  { animation: hud-pill-in 0.55s var(--ease-out) both; animation-delay: 280ms; transform-origin: left center; }
.hud-meta    { animation: hud-pill-in 0.55s var(--ease-out) both; animation-delay: 340ms; transform-origin: right center; }
.hud-chip    { animation: hud-chip-in 0.45s var(--ease-out) both; }
.hud-chip:nth-child(1) { animation-delay: 250ms; }
.hud-chip:nth-child(2) { animation-delay: 290ms; }
.hud-chip:nth-child(3) { animation-delay: 330ms; }

@keyframes hud-pill-in {
  from { opacity: 0; transform: translateY(10px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
}
@keyframes hud-chip-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
