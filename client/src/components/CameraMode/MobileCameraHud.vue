<template>
  <div class="mobile-camera-hud">
    <!-- 顶部包装容器：原背景模糊+进入动画（范围仅限顶部两行，不遮星空） -->
    <div class="mch-top-wrapper">
      <div class="mch-row mch-row-top">
        <!-- 左：明确的退出按钮（与 PC 端语义一致） -->
        <button class="mch-exit" @click="$emit('exit')">
          <ChevronLeftIcon />
          <span>退出</span>
        </button>
        <!-- 中：居中「天镜览星」标题 -->
        <span class="mch-title">天镜览星</span>
        <!-- 右：区域信息 -->
        <span class="mch-region">{{ region }}</span>
      </div>
      <div class="mch-row mch-row-bottom">
        <div class="mch-mode-toggles">
          <button
            class="mch-mode-btn"
            :class="{ active: filters.mode === 'listening' }"
            :aria-pressed="filters.mode === 'listening'"
            @click="$emit('setMode', 'listening')"
            title="听语：收录星友心声，未看过+共鸣热度优先"
          >
            <MessageCircleIcon /><span>听语</span>
          </button>
          <button
            class="mch-mode-btn"
            :class="{ active: filters.mode === 'gazing' }"
            :aria-pressed="filters.mode === 'gazing'"
            @click="$emit('setMode', 'gazing')"
            title="观星：品读星辰神话与千年历史故事"
          >
            <TelescopeIcon /><span>观星</span>
          </button>
        </div>
      </div>
    </div>
    <!-- 中下方：品红色星图例 + 引导说明（移动端精简版） -->
    <div class="mch-guide">
      <svg class="mch-dot" viewBox="0 0 14 14" aria-hidden="true">
        <defs>
          <radialGradient id="mchGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ff4d8a" stop-opacity="0.95"/>
            <stop offset="55%" stop-color="#ff4d8a" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#ff4d8a" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="7" cy="7" r="6.2" fill="url(#mchGlow)"/>
        <circle cx="7" cy="7" r="2.8" fill="#ff6aa1" stroke="#ff96bb" stroke-width="0.5"/>
      </svg>
      <span class="mch-g-label">品红之星</span>
      <span class="mch-g-sub">· 有心事的星</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeftIcon, TelescopeIcon, MessageCircleIcon } from './icons/CameraIcons'
import type { CameraFilters, CameraFilterMode } from '../../composables/useCameraMode'

defineProps<{
  region: string
  filters: CameraFilters
}>()

defineEmits<{
  exit: []
  setMode: [mode: CameraFilterMode]
}>()
</script>

<style scoped>
.mobile-camera-hud {
  position: fixed;
  inset: 0;                 /* ⭐ 铺满全屏，允许在中下方放引导框 */
  z-index: 20;
  font-family: var(--font-display);
  color: var(--hud-text);
  pointer-events: none;     /* ⭐ 全屏容器不抢交互，子元素单独开 pointer-events */
}
/* 顶部两行：用包装容器做原来的顶部背景+模糊（只占顶部，不遮星空） */
.mch-top-wrapper {
  position: relative;
  background: var(--hud-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: mch-top-enter 0.4s var(--ease-in-out) both;
  pointer-events: auto;      /* ⭐ 只有顶部区域能点 */
}
@keyframes mch-top-enter {
  from { opacity: 0; transform: translateY(-100%); }
  to   { opacity: 1; transform: translateY(0); }
}

.mch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}
.mch-row-top {
  height: 44px;
  font-size: 0.8rem;
  position: relative;
}
.mch-row-bottom {
  height: 36px;
  justify-content: flex-end;
}
/* 左：退出按钮 */
.mch-exit {
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(255, 107, 107, 0.08);
  border: 1px solid rgba(255, 107, 107, 0.25);
  color: #ff6b6b;
  cursor: pointer;
  font-family: var(--font-display);
  font-weight: 600;
  padding: 5px 10px;
  border-radius: var(--radius-full);
  transition: all 0.25s var(--ease-in-out);
  z-index: 2;
}
.mch-exit:active {
  transform: scale(0.96);
  background: rgba(255, 107, 107, 0.16);
}
.mch-exit svg { color: #ff6b6b; }
/* 中：居中标题（绝对定位保证真正居中，不被左右挤压） */
.mch-title {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  background: linear-gradient(90deg, #86a8ff, #caa7ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  z-index: 1;
  white-space: nowrap;
}
/* 右：区域信息 */
.mch-region {
  font-size: 0.7rem;
  opacity: 0.7;
  letter-spacing: 0.05em;
  z-index: 2;
  max-width: 30%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}
.mch-mode-toggles {
  display: flex;
  gap: 6px;
}
.mch-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: transparent;
  border: 1px solid rgba(202, 167, 255, 0.2);
  color: var(--hud-text);
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.72rem;
  font-family: var(--font-display);
  transition: all 0.25s var(--ease-in-out);
}
.mch-mode-btn.active {
  background: rgba(202, 167, 255, 0.15);
  border-color: var(--accent-purple);
  color: var(--hud-accent);
}
.mch-mode-btn:hover {
  border-color: var(--accent-purple);
}

/* ═══════════════════ 中下方：品红之星图例 + 引导说明（移动端） ═══════════════════ */
.mch-guide {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 36px;               /* 避开底部 Home Indicator + 手指触控区 */
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 14px;
  background: var(--surface);
  border: 1px solid rgba(255, 77, 138, 0.28);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm), 0 0 0 1px rgba(255, 77, 138, 0.06) inset;
  backdrop-filter: blur(12px) saturate(1.1);
  -webkit-backdrop-filter: blur(12px) saturate(1.1);
  box-sizing: border-box;
  line-height: 1;
  background-image: linear-gradient(135deg, rgba(255, 77, 138, 0.06), rgba(255, 154, 188, 0.02));
  pointer-events: none;
  animation: mch-guide-in 0.4s var(--ease-out) both;
  animation-delay: 220ms;
}
.mch-dot {
  width: 14px; height: 14px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(255, 77, 138, 0.5));
}
.mch-g-label {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #ff7aaf;
}
.mch-g-sub {
  font-size: 0.68rem;
  color: var(--ink-secondary);
  opacity: 0.85;
}
@keyframes mch-guide-in {
  from { opacity: 0; transform: translate(-50%, 8px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
</style>
