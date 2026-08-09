<template>
  <RouterView v-slot="{ Component }">
    <Transition name="page-fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<style>
/* 路由切换过渡：开场黑幕后目标页淡入（0.7s），离场快速淡出避免闪白 */
.page-fade-enter-active {
  transition: opacity 0.7s ease;
}
.page-fade-leave-active {
  transition: opacity 0.3s ease;
}
.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>
