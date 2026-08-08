<template>
  <div class="camera-hud">
    <div class="hud-top">
      <!-- 左上：退出按钮（醒目：关闭图标 + 退出文字 + 红橙强调色） -->
      <button class="hud-pill hud-exit hud-left" @click="$emit('exit')">
        <CloseIcon />
        <span class="hud-exit-label">退出</span>
      </button>
      <!-- 中上：「天镜览星」极简标题（小胶囊 + 光圈ICON + 4字标题） -->
      <div class="hud-pill hud-title">
        <ApertureIcon class="ht-icon" />
        <span class="ht-cn">天镜览星</span>
      </div>
      <!-- 右上：RA / DEC / FOV chip 组 -->
      <div class="hud-coords">
        <div class="hud-chip">
          <span class="hud-chip-label">RA</span>
          <span class="hud-chip-value">{{ ra }}</span>
        </div>
        <div class="hud-chip">
          <span class="hud-chip-label">DEC</span>
          <span class="hud-chip-value">{{ dec }}</span>
        </div>
        <div class="hud-chip">
          <span class="hud-chip-label">FOV</span>
          <span class="hud-chip-value">{{ fov }}°</span>
        </div>
      </div>
    </div>
    <div class="hud-bottom">
      <div class="hud-params">
        <span>ISO 800</span>
        <span>SHUTTER 1/60s</span>
        <span>APERTURE f/2.8</span>
      </div>
      <div class="hud-meta">
        <span>{{ date }}</span>
        <span>{{ time }}</span>
        <span>FPS {{ fps }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { CloseIcon, ApertureIcon } from './icons/CameraIcons'

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
/* ════════════════════════════════════════════════════════════════
   相机 HUD 现代化 UI
   仅修改 CSS 样式：DOM 结构 / 定位层次 / flex 布局 完全保留 56480b5
   复用主设计系统 token：--surface / --rule / --radius-full / --shadow-md
   去掉整屏渐变条：改为每个数值组件独立 panel 胶囊，统一 box-sizing
   ════════════════════════════════════════════════════════════════ */
.camera-hud {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 20;
  font-family: var(--font);
  color: var(--hud-text-strong);
}

/* 顶部 / 底部外层容器：纯布局用，去掉整屏渐变条，改成透明 */
.hud-top, .hud-bottom {
  position: absolute;
  left: 0; right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: transparent;     /* 去掉原来的 linear-gradient 整屏遮罩 */
  pointer-events: none;
  box-sizing: border-box;
}
.hud-top {
  top: 16px;                  /* 略往下压 16px，避免贴边 */
  height: 36px;               /* ⭐ 固定高度，保证标题 translate 居中基准 */
  /* ⭐ 注意：仍继承共享规则中的 position: absolute（相对于 camera-hud 容器）
     absolute 元素本身即可作为子元素绝对定位的参照，不需要再加 position: relative */
}
/* 左右两栏：防压缩 + 层级高于居中标题，避免被遮挡 */
.hud-left, .hud-coords {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
}
.hud-bottom {
  bottom: 16px;
  font-size: var(--text-xxs);
  letter-spacing: 0.1em;
}

/* ─── 通用胶囊面板：与主 UI panel-wrapper 语义对齐 ─── */
.hud-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 14px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(14px) saturate(1.1);
  -webkit-backdrop-filter: blur(14px) saturate(1.1);
  box-sizing: border-box;
  line-height: 1;
  isolation: isolate;
}

/* 左上：退出按钮（醒目的红橙强调色 — 退出/危险语义） */
.hud-exit {
  cursor: pointer;
  pointer-events: auto;
  font-family: var(--font);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--ink);
  /* 红橙 135° 渐变底 + 红边框，视觉上一眼识别为「退出操作」 */
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.09), rgba(255, 168, 96, 0.04));
  border-color: rgba(255, 107, 107, 0.28);
  transition: border-color var(--transition-normal), transform var(--transition-normal), background var(--transition-normal), box-shadow var(--transition-normal);
}
.hud-exit svg {
  width: 16px; height: 16px;
  color: #ff6b6b;
  flex-shrink: 0;
}
.hud-exit:hover {
  border-color: rgba(255, 107, 107, 0.5);
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.16), rgba(255, 168, 96, 0.08));
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(255, 107, 107, 0.4);
}
.hud-exit-label {
  color: inherit;
}

/* ═══════════════════ 中上：极简小胶囊标题（ICON + 4字） ═══════════════════ */
.hud-title {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  gap: 8px;
  padding: 0 16px;
  pointer-events: none;
  z-index: 1;
  /* 金系小胶囊：略深一点的金渐变底，和退出按钮红橙区分开 */
  background: linear-gradient(135deg, rgba(255, 217, 138, 0.09), rgba(255, 196, 100, 0.03));
  border-color: rgba(255, 217, 138, 0.22);
}
/* 光圈 ICON */
.ht-icon {
  width: 15px;
  height: 15px;
  color: #ffd98a;
  flex-shrink: 0;
}
/* 4字标题：正常字距，不要过度设计 */
.ht-cn {
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #ffd98a;
}

/* 右上：RA / DEC / FOV chip 组（外层只做间距，不包框） */
.hud-coords {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  height: 36px;            /* 与左侧胶囊同高，保证水平对齐基准 */
  box-sizing: border-box;
}

/* 单个 chip：稍小圆角的 panel，内部垂直两行 label/value */
.hud-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  min-width: 70px;
  height: 36px;
  padding: 0 12px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(12px) saturate(1.05);
  -webkit-backdrop-filter: blur(12px) saturate(1.05);
  box-sizing: border-box;
  line-height: 1;
  transition: border-color var(--transition-fast);
}
.hud-chip:hover { border-color: var(--rule-hover); }
/* 第三个 chip (FOV) 强调色：与左侧退出按钮配色呼应 */
.hud-chip:last-child {
  border-color: var(--accent-border);
  background: linear-gradient(135deg, var(--accent-subtle) 0%, var(--surface) 65%);
}
.hud-chip-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.14em;
  color: var(--muted);
  opacity: 1;
  text-transform: uppercase;
}
.hud-chip-value {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  transition: opacity 0.2s;
}
.hud-chip:last-child .hud-chip-value { color: var(--hud-accent); }

/* 底部参数 / 元数据：胶囊小面板 */
.hud-params, .hud-meta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: 32px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(12px) saturate(1.05);
  -webkit-backdrop-filter: blur(12px) saturate(1.05);
  box-sizing: border-box;
  line-height: 1;
}
.hud-params span, .hud-meta span {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--ink-secondary);
  letter-spacing: 0.06em;
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
}
.hud-params span::before, .hud-meta span:nth-child(n+2)::before {
  content: '·';
  color: var(--muted);
  opacity: 0.5;
  margin-right: 10px;
}
.hud-params span:first-child::before, .hud-meta span:first-child::before { display: none; }
.hud-meta span:last-child {
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

/* ═══ 级联进入动画（纯 opacity + 轻微纵向平移，无大 transform） ═══ */
.hud-top    { animation: hud-top-in    0.45s var(--ease-out) both; animation-delay: 80ms; }
.hud-bottom { animation: hud-bottom-in 0.45s var(--ease-out) both; animation-delay: 160ms; }
.hud-coords { animation: hud-chips-in  0.4s  var(--ease-out) both; animation-delay: 240ms; }
/* 给三个 chip 单独 stagger 错落 */
.hud-chip   { animation: hud-chip-in 0.4s var(--ease-out) both; }
.hud-chip:nth-child(1) { animation-delay: 250ms; }
.hud-chip:nth-child(2) { animation-delay: 290ms; }
.hud-chip:nth-child(3) { animation-delay: 330ms; }

@keyframes hud-top-in {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes hud-bottom-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes hud-chips-in {
  from { opacity: 0; } to { opacity: 1; }
}
@keyframes hud-chip-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
