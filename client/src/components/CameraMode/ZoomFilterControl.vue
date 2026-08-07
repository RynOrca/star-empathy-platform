<template>
  <div class="zoom-filter-control panel-wrapper">
    <!-- 模式切换（section: 听语在上 / 观星在下） -->
    <section class="zfc-section">
      <header class="panel-head">
        <span class="pw-icon-wrap pw-icon-gold">
          <EyeIcon />
        </span>
        <div class="pw-title-group">
          <span class="pw-title">览星模式</span>
          <span class="pw-subtitle">两种视角，一样的温柔星夜</span>
        </div>
      </header>

      <div class="mode-hint">
        把心事挂上星空，或走入银河聆听前人低语。
      </div>

      <div class="zfc-mode-toggles">
        <!-- 听语（默认激活 · 上） -->
        <button
          class="zfc-mode-btn"
          :class="{ active: filters.mode === 'listening' }"
          @click="$emit('setMode', 'listening')"
          :aria-pressed="filters.mode === 'listening'"
          title="听语：收录此刻共鸣的星友心事，优先展示未看过且共鸣数高的故事"
        >
          <div class="mode-icon">
            <MessageCircleIcon />
          </div>
          <div class="mode-text">
            <div class="mode-title-row">
              <span class="mode-label">听&nbsp;语</span>
              <span class="mode-tag">星友心声</span>
            </div>
            <p class="mode-desc">
              收录此刻共鸣的星友心事。<br />
              未看过的故事优先，按共鸣热度排序，<br />
              让银河替你接住每一份情绪。
            </p>
          </div>
        </button>

        <!-- 观星（· 下） -->
        <button
          class="zfc-mode-btn"
          :class="{ active: filters.mode === 'gazing' }"
          @click="$emit('setMode', 'gazing')"
          :aria-pressed="filters.mode === 'gazing'"
          title="观星：品读星辰的神话与千年传说，只展示星星本身的介绍与星座故事"
        >
          <div class="mode-icon">
            <TelescopeIcon />
          </div>
          <div class="mode-text">
            <div class="mode-title-row">
              <span class="mode-label">观&nbsp;星</span>
              <span class="mode-tag mode-tag-blue">神话典籍</span>
            </div>
            <p class="mode-desc">
              品读星辰的神话与千年传说。<br />
              只展示每颗星本身的历史故事与星座溯源，<br />
              适合安静地仰望银河、独自漫游。
            </p>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { TelescopeIcon, MessageCircleIcon, EyeIcon } from './icons/CameraIcons'
import type { CameraFilters, CameraFilterMode } from '../../composables/useCameraMode'

defineProps<{
  filters: CameraFilters
}>()

defineEmits<{
  setMode: [mode: CameraFilterMode]
}>()
</script>

<style scoped>
.zoom-filter-control {
  position: fixed;
  bottom: 80px;
  left: 36px;
  z-index: 15;
  width: 288px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(18px) saturate(1.2);
  padding: 16px 16px 14px;
  font-family: var(--font);
  pointer-events: auto;
  color: var(--ink);
}

/* ═══ 通用 section 与 panel-head ═══ */
.panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
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
.pw-icon-gold {
  background: var(--accent-subtle);
  color: var(--accent);
  border: 0.5px solid var(--accent-border);
}
.pw-title-group {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  flex: 1;
}
.pw-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.02em;
}
.pw-subtitle {
  font-size: 10.5px;
  color: var(--muted);
  margin-top: 2px;
  letter-spacing: 0.02em;
  opacity: 0.92;
}

.mode-hint {
  font-size: 11px;
  color: var(--muted);
  opacity: 0.9;
  line-height: 1.55;
  margin: 0 2px 12px;
  padding-left: 1px;
  letter-spacing: 0.01em;
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
  align-items: flex-start;
  gap: 12px;
  padding: 12px 12px 12px 12px;
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

.mode-icon {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  margin-top: 2px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.035);
  border: 0.5px solid var(--rule);
  color: inherit;
  opacity: 0.9;
}
.zfc-mode-btn.active .mode-icon {
  background: rgba(255, 217, 138, 0.08);
  border-color: var(--accent-border);
}
.mode-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  line-height: 1.25;
  min-width: 0;
}
.mode-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mode-label {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.mode-tag {
  display: inline-block;
  font-size: 9.5px;
  padding: 2px 7px;
  border-radius: 10px;
  background: rgba(255, 217, 138, 0.1);
  color: var(--accent);
  border: 0.5px solid var(--accent-border);
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1.4;
}
.mode-tag.mode-tag-blue {
  background: rgba(134, 168, 255, 0.1);
  color: var(--star-blue);
  border-color: rgba(134, 168, 255, 0.25);
}
.mode-desc {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.62;
  color: inherit;
  opacity: 0.82;
  letter-spacing: 0.005em;
  white-space: pre-line;
}
.zfc-mode-btn.active .mode-desc {
  opacity: 0.92;
}

/* ═══ 进入动画（柔和淡入上移） ═══ */
.zoom-filter-control {
  animation: zfc-enter 0.6s var(--ease-out) both;
  animation-delay: 260ms;
}
.zfc-mode-btn {
  animation: mode-stagger 0.5s var(--ease-out) both;
}
.zfc-mode-btn:nth-child(1) { animation-delay: 320ms; }
.zfc-mode-btn:nth-child(2) { animation-delay: 390ms; }

@keyframes zfc-enter {
  from { opacity: 0; transform: translateY(16px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
}
@keyframes mode-stagger {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
