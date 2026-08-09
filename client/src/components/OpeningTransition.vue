<template>
  <!-- 闪光灯：点击瞬间爆闪后消散（0.9s） -->
  <div class="flash" :class="{ fire: trigger }" />
  <!-- 黑幕：0.12s 延迟后淡入至全黑（1.22s 到顶） -->
  <div class="fader" :class="{ go: trigger }" />
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'

/**
 * 开场切页过渡层：闪光灯 + 黑幕淡入
 * trigger=true 时同时启动两层；黑幕完全覆盖后 emit('after')，
 * 由父组件在那一刻执行 router.push（用户看不见切页，感觉是「一黑一亮就是现实场景」）。
 */
const props = defineProps<{ trigger: boolean }>()
const emit = defineEmits<{ after: [] }>()

let afterTimer: ReturnType<typeof setTimeout> | null = null
let fired = false

watch(
  () => props.trigger,
  (v) => {
    if (!v || fired) return
    fired = true
    // fader: 120ms delay + 1100ms duration → 1220ms 到顶；再缓冲 120ms 确保覆盖
    afterTimer = setTimeout(() => emit('after'), 1340)
  },
)

onBeforeUnmount(() => {
  if (afterTimer) clearTimeout(afterTimer)
})
</script>

<style scoped>
.flash {
  position: fixed;
  inset: 0;
  z-index: 20;
  pointer-events: none;
  opacity: 0;
}
.flash.fire {
  animation: flashGo 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
@keyframes flashGo {
  0% {
    background: radial-gradient(
      circle at 50% 50%,
      rgba(255, 240, 210, 0) 0%,
      rgba(255, 240, 210, 0) 25%,
      rgba(0, 0, 0, 0) 100%
    );
    opacity: 0;
  }
  18% {
    background: radial-gradient(
      circle at 50% 50%,
      rgba(255, 240, 210, 0.95) 0%,
      rgba(255, 220, 170, 0.55) 32%,
      rgba(0, 0, 0, 0) 100%
    );
    opacity: 1;
  }
  100% {
    background: radial-gradient(
      circle at 50% 50%,
      rgba(255, 240, 210, 0) 0%,
      rgba(255, 240, 210, 0) 60%,
      rgba(0, 0, 0, 0) 100%
    );
    opacity: 0;
  }
}
.fader {
  position: fixed;
  inset: 0;
  z-index: 19;
  pointer-events: none;
  background: #020210;
  opacity: 0;
}
.fader.go {
  animation: fadeOut 1.1s 0.12s ease forwards;
}
@keyframes fadeOut {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
