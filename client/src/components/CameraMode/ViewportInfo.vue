<template>
  <!-- 采用主 UI 的 panel-wrapper 结构：pw-icon + pw-title + pw-count -->
  <div class="viewport-info panel-wrapper">
    <div class="panel-head">
      <span class="pw-icon-wrap pw-icon-purple">
        <CompassIcon />
      </span>
      <span class="pw-title">{{ title }}</span>
      <span class="pw-count">{{ starCount }} 星 · {{ storyCount }} 事</span>
    </div>
    <div class="vp-body">
      <p class="vp-desc">取景框覆盖 {{ starCount }} 颗亮星，共收录 {{ storyCount }} 则情感故事</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CompassIcon } from './icons/CameraIcons'
import type { StarInFrame } from '../../composables/useSky'

const props = defineProps<{
  starsInFrame: StarInFrame[]
  storyCount: number
  /** 动态天区名（由父组件根据 RA/DEC 计算） */
  region?: string
}>()

const starCount = computed(() => props.starsInFrame.length)

const title = computed(() => {
  // 优先用父组件传入的动态天区名（随相机位置变化）
  if (props.region) return props.region
  if (starCount.value === 0) return '深空天区'
  if (starCount.value <= 3) return `${starCount.value} 星小天区`
  return '繁星天区'
})
</script>

<style scoped>
.viewport-info {
  position: fixed;
  top: 92px;
  left: 36px;
  z-index: 15;
  width: 288px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(18px) saturate(1.15);
  pointer-events: none;
  overflow: hidden;
  padding: 14px 16px 14px;
  font-family: var(--font);
}

/* ═══ 头部：pw-icon + pw-title + pw-count（对齐 StarDetail/CollectionDetail） ═══ */
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
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
.pw-icon-purple {
  background: rgba(202, 167, 255, 0.1);
  color: var(--star-purple);
  border: 0.5px solid rgba(202, 167, 255, 0.2);
}
.pw-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.02em;
  flex: 1;
}
.pw-count {
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--overlay-04);
  border: 0.5px solid var(--rule);
}

/* ═══ 正文区 ═══ */
.vp-body {
  padding: 0 2px;
}
.vp-desc {
  margin: 0;
  font-size: var(--text-xs);
  line-height: 1.55;
  color: var(--ink-secondary);
}

/* ═══ 进入动画（与主 panel 一致的柔和淡入上移） ═══ */
.viewport-info {
  animation: vp-enter 0.6s var(--ease-out) both;
  animation-delay: 180ms;
}
@keyframes vp-enter {
  from { opacity: 0; transform: translateY(12px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
}
</style>
