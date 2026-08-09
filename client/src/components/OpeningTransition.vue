<template>
  <!-- 黑幕：0.12s 延迟后淡入至全黑（1.22s 到顶） -->
  <div class="fader" :class="{ go: trigger }" />
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'

/**
 * 开场切页过渡层：黑幕淡入
 * trigger=true 时启动黑幕；完全覆盖后 emit('after')，
 * 由父组件在那一刻执行 router.push（用户看不见切页，感觉是「一黑一亮就是现实场景」）。
 * 注：原型 a1 的圆形闪光灯（flashGo）已移除——白闪破坏体验。
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
