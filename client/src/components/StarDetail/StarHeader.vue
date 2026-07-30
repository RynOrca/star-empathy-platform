<template>
  <div class="star-header">
    <div class="star-color-dot" :style="{ background: starInfo?.color || '#fff6e8' }"></div>
    <div>
      <div class="star-name">{{ starInfo?.displayName }}</div>
      <div class="star-subtitle" v-if="starInfo">{{ starInfo.conName }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  starInfo: { displayName: string; conName: string; color: string } | null
}>()
</script>

<style scoped>
.star-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.star-color-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.08);
}
.star-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.02em;
  line-height: 1.3;
}
.star-subtitle {
  font-size: 0.78rem;
  color: var(--muted);
  margin-top: 2px;
}
</style>