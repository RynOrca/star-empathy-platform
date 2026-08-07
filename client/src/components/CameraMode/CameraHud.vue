<template>
  <div class="camera-hud">
    <!-- 顶部 HUD：胶囊式独立 panel，不再是整屏渐变条 -->
    <div class="hud-top">
      <!-- 左：退出按钮（采用主 UI 的 panel-wrapper 语义：图标 + 标题 + 胶囊） -->
      <button class="hud-pill hud-exit" @click="$emit('exit')">
        <span class="pill-icon-wrap pill-icon-gold">
          <ApertureIcon />
        </span>
        <span class="pill-label">天镜览星</span>
      </button>

      <!-- 中：模式标签（柔和胶囊，避免"录像红点"过强） -->
      <div class="hud-pill hud-mode">
        <span class="pill-dot" />
        <span class="pill-mode-text">PHOTO · 取景中</span>
      </div>

      <!-- 右：RA / DEC / FOV chip 组（紧凑、圆角、柔和 border） -->
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

/* ═══ 顶部 HUD ═══ */
.hud-top {
  position: absolute;
  top: 20px;
  left: 36px;
  right: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  pointer-events: none;
}

/* 通用胶囊：主 UI 的 panel 风格（背景、圆角、边框、阴影统一） */
.hud-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--hud-bg);
  border: 1px solid var(--hud-border);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(16px) saturate(1.2);
  pointer-events: auto;
}

/* 左：退出按钮（点击放大 + 金色强调） */
.hud-exit {
  cursor: pointer;
  font-family: var(--font);
  transition: all var(--transition-normal);
}
.hud-exit:hover {
  border-color: var(--accent-border);
  background: var(--accent-subtle);
  transform: translateY(-1px);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--accent-border);
}
.pill-icon-wrap {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pill-icon-gold {
  background: var(--accent-subtle);
  color: var(--accent);
  border: 0.5px solid var(--accent-border);
}
.pill-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--ink);
  letter-spacing: 0.02em;
}

/* 中：模式标签（柔和呼吸动画，不再闪烁红点） */
.hud-mode {
  gap: 6px;
}
.pill-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
  animation: pill-breathe 2.4s ease-in-out infinite;
}
@keyframes pill-breathe {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.55; transform: scale(0.85); }
}
.pill-mode-text {
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--ink-secondary);
  text-transform: uppercase;
}

/* 右：RA / DEC / FOV chips */
.hud-chips {
  display: flex;
  gap: 8px;
}
.hud-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 5px 11px 5px 13px;
  background: var(--hud-bg);
  border: 1px solid var(--hud-border);
  border-radius: var(--radius-md);
  backdrop-filter: blur(14px) saturate(1.1);
  min-width: 72px;
  box-shadow: var(--shadow-sm);
  transition: border-color var(--transition-fast);
}
.hud-chip:hover { border-color: var(--rule-hover); }
.hud-chip.chip-accent {
  border-color: var(--accent-border);
  background: linear-gradient(135deg, var(--accent-subtle) 0%, var(--hud-bg) 60%);
}
.chip-label {
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.14em;
  color: var(--muted);
  margin-bottom: 2px;
  text-transform: uppercase;
}
.chip-value {
  font-size: 13px;
  line-height: 1.1;
  font-weight: 500;
  color: var(--hud-accent);
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
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font);
  font-size: var(--text-xs);
}

.param, .meta-item {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
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
.meta-fps {
  color: var(--accent);
}
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
