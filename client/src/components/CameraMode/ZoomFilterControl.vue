<template>
  <div class="zoom-filter-control panel-wrapper">
    <!-- 视场控制（section: 滑杆 + 罗马刻度） -->
    <section class="zfc-section">
      <header class="panel-head">
        <span class="pw-icon-wrap pw-icon-blue">
          <ZoomIcon />
        </span>
        <span class="pw-title">视场</span>
        <span class="pw-count">{{ currentFovDeg }}°</span>
      </header>

      <div class="zfc-zoom">
        <!-- 自定义滑杆：轨道 + 填充 + 圆形滑块（与主 UI 一致的柔和交互） -->
        <div class="zfc-slider-wrap">
          <div class="zfc-track" />
          <div class="zfc-fill" :style="{ width: `${(zoomLevel - 1) / 3 * 100}%` }" />
          <div class="zfc-thumb" :style="{ left: `${(zoomLevel - 1) / 3 * 100}%` }" />
        </div>
        <!-- 4 级罗马刻度按钮 -->
        <div class="zfc-ticks">
          <button
            v-for="n in 4"
            :key="n"
            class="zfc-tick"
            :class="{ active: zoomLevel === n }"
            :title="`视场 ${CAMERA_FOV_BY_STAGE[n]}°（${['广角', '标准', '中焦', '长焦'][n - 1]}）`"
            @click="$emit('setZoom', n)"
          >
            <span class="tick-num">{{ ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][n - 1] }}</span>
            <span class="tick-name">{{ ['广角', '标准', '中焦', '长焦'][n - 1] }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 分隔线（淡色，与主 UI section 间的 divider 一致） -->
    <div class="zfc-divider" />

    <!-- 模式切换（section: 观星 / 听语） -->
    <section class="zfc-section">
      <header class="panel-head">
        <span class="pw-icon-wrap pw-icon-gold">
          <EyeIcon />
        </span>
        <span class="pw-title">模式</span>
      </header>
      <div class="zfc-mode-toggles">
        <button
          class="zfc-mode-btn"
          :class="{ active: filters.mode === 'gazing' }"
          @click="$emit('setMode', 'gazing')"
          :aria-pressed="filters.mode === 'gazing'"
          title="观星：仅展示星星本身的介绍"
        >
          <TelescopeIcon />
          <div class="mode-text">
            <span class="mode-label">观星</span>
            <span class="mode-desc">星图叙事</span>
          </div>
        </button>
        <button
          class="zfc-mode-btn"
          :class="{ active: filters.mode === 'listening' }"
          @click="$emit('setMode', 'listening')"
          :aria-pressed="filters.mode === 'listening'"
          title="听语：展示星星的情感故事（共鸣高优先）"
        >
          <MessageCircleIcon />
          <div class="mode-text">
            <span class="mode-label">听语</span>
            <span class="mode-desc">情感共鸣</span>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TelescopeIcon, MessageCircleIcon, ZoomIcon, EyeIcon } from './icons/CameraIcons'
import { CAMERA_FOV_BY_STAGE } from '../../utils/constants'
import type { CameraFilters, CameraFilterMode } from '../../composables/useCameraMode'

const props = defineProps<{
  zoomLevel: number
  filters: CameraFilters
  /** 实时 FOV（滚轮缩放时会变化），优先用这个显示精确度数 */
  currentFov?: number
}>()

defineEmits<{
  setZoom: [level: number]
  setMode: [mode: CameraFilterMode]
}>()

const CAMERA_FOV_BY_STAGE_REF = CAMERA_FOV_BY_STAGE
const currentFovDeg = computed(() => {
  if (typeof props.currentFov === 'number') {
    return Math.round(props.currentFov * 10) / 10  // 保留一位小数
  }
  return CAMERA_FOV_BY_STAGE_REF[props.zoomLevel] ?? 75
})
</script>

<style scoped>
.zoom-filter-control {
  position: fixed;
  bottom: 80px;
  left: 36px;
  z-index: 15;
  width: 272px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(18px) saturate(1.2);
  padding: 16px;
  font-family: var(--font);
  pointer-events: auto;
  color: var(--ink);
}

/* ═══ 通用 section 与 panel-head ═══ */
.zfc-section + .zfc-section { margin-top: 2px; }
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.pw-icon-wrap {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pw-icon-blue {
  background: rgba(134, 168, 255, 0.1);
  color: var(--star-blue);
  border: 0.5px solid rgba(134, 168, 255, 0.22);
}
.pw-icon-gold {
  background: var(--accent-subtle);
  color: var(--accent);
  border: 0.5px solid var(--accent-border);
}
.pw-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.02em;
  flex: 1;
}
.pw-count {
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

/* ═══ 视场滑杆 ═══ */
.zfc-zoom {
  padding: 0 2px;
}
.zfc-slider-wrap {
  position: relative;
  height: 6px;
  margin: 4px 0 10px;
}
.zfc-track {
  position: absolute;
  inset: 0;
  background: var(--overlay-06);
  border-radius: 3px;
}
.zfc-fill {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  background: linear-gradient(90deg, var(--star-blue), var(--accent));
  border-radius: 3px;
  transition: width var(--duration-slow) var(--ease-out);
}
.zfc-thumb {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  background: var(--ink);
  border: 2px solid var(--accent);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 8px rgba(0,0,0,.35), 0 0 0 3px var(--accent-subtle);
  transition: left var(--duration-slow) var(--ease-out);
  cursor: grab;
}
.zfc-thumb:hover {
  box-shadow: 0 2px 10px rgba(0,0,0,.45), 0 0 0 4px var(--accent-bg);
  transform: translate(-50%, -50%) scale(1.08);
}

/* 4 级刻度：卡片化，不只是罗马数字 */
.zfc-ticks {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.zfc-tick {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 7px 4px;
  background: transparent;
  border: 0.5px solid transparent;
  border-radius: var(--radius-md);
  color: var(--muted);
  cursor: pointer;
  font-family: var(--font);
  transition: all var(--transition-normal);
}
.tick-num {
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-display);
  color: inherit;
}
.tick-name {
  font-size: 10px;
  letter-spacing: 0.04em;
  color: inherit;
  opacity: 0.85;
}
.zfc-tick:hover {
  background: var(--overlay-04);
  color: var(--ink-secondary);
}
.zfc-tick.active {
  background: var(--accent-subtle);
  border-color: var(--accent-border);
  color: var(--accent);
  box-shadow: 0 1px 4px rgba(255, 217, 138, 0.08);
}

/* ═══ 分隔线 ═══ */
.zfc-divider {
  height: 1px;
  background: var(--rule);
  margin: 14px 4px;
  opacity: 0.8;
}

/* ═══ 模式切换（上下排列，听语在上默认激活） ═══ */
.zfc-mode-toggles {
  display: grid;
  grid-template-rows: 1fr 1fr;
  grid-template-columns: 1fr;
  gap: 8px;
}
.zfc-mode-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px;
  background: var(--overlay-02);
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  color: var(--ink-secondary);
  cursor: pointer;
  font-family: var(--font);
  transition: all var(--transition-normal);
  text-align: left;
}
.zfc-mode-btn:hover {
  border-color: var(--rule-hover);
  background: var(--overlay-04);
  transform: translateY(-1px);
}
.zfc-mode-btn.active {
  background: var(--accent-subtle);
  border-color: var(--accent-border);
  color: var(--accent);
  box-shadow: 0 2px 10px rgba(255, 217, 138, 0.06);
}
.zfc-mode-btn svg { flex-shrink: 0; color: inherit; opacity: 0.9; }
.mode-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1.15;
}
.mode-label {
  font-size: 13px;
  font-weight: 600;
}
.mode-desc {
  font-size: 10.5px;
  color: inherit;
  opacity: 0.7;
  letter-spacing: 0.02em;
}

/* ═══ 进入动画（柔和淡入上移） ═══ */
.zoom-filter-control {
  animation: zfc-enter 0.6s var(--ease-out) both;
  animation-delay: 260ms;
}
.zfc-tick { animation: tick-stagger 0.45s var(--ease-out) both; }
.zfc-tick:nth-child(1) { animation-delay: 310ms; }
.zfc-tick:nth-child(2) { animation-delay: 340ms; }
.zfc-tick:nth-child(3) { animation-delay: 370ms; }
.zfc-tick:nth-child(4) { animation-delay: 400ms; }

@keyframes zfc-enter {
  from { opacity: 0; transform: translateY(16px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
}
@keyframes tick-stagger {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
