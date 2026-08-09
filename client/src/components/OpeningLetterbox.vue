<template>
  <div ref="topRef" class="letterbox top" :class="{ exit, in: entered }" />
  <div ref="bottomRef" class="letterbox bottom" :class="{ exit, in: entered }" />
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

/**
 * 电影遮幅：上下 2.35:1 黑色遮幅 + 金色内阴影
 * - 默认展开（height 14.24vh），挂载后加 .in 触发「从 0 拉高」入场动画
 * - exit=true 时 transition 平滑收缩至 0（880ms），像电影帷幕拉开
 */
defineProps<{ exit: boolean }>()

const topRef = ref<HTMLElement | null>(null)
const bottomRef = ref<HTMLElement | null>(null)
const entered = ref(false)

onMounted(async () => {
  await nextTick()
  requestAnimationFrame(() => {
    entered.value = true
  })
})
</script>

<style scoped>
.letterbox {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 12;
  background: #020210;
  height: 14.24vh; /* 默认展开，哪怕动画不跑也能遮住 */
  /* 退出用 transition 平滑收缩，比 keyframes 更可控 */
  transition:
    height 0.88s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.88s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}
.letterbox.top {
  top: 0;
  box-shadow: 0 1px 0 rgba(255, 217, 138, 0.18) inset;
}
.letterbox.bottom {
  bottom: 0;
  box-shadow: 0 -1px 0 rgba(255, 217, 138, 0.18) inset;
}
/* 入场增强：从 0 拉高到 14.24vh（1.1s，早于用户点击结束，不与退出 transition 冲突） */
.letterbox.top.in,
.letterbox.bottom.in {
  animation: lbIn 1.1s cubic-bezier(0.2, 0.8, 0.2, 1);
}
@keyframes lbIn {
  from {
    height: 0;
  }
}
/* 退出：帷幕向上下两侧拉开，金色内阴影同时收进幕布 */
.letterbox.top.exit {
  height: 0;
  box-shadow: 0 1px 0 rgba(255, 217, 138, 0) inset;
}
.letterbox.bottom.exit {
  height: 0;
  box-shadow: 0 -1px 0 rgba(255, 217, 138, 0) inset;
}
</style>
