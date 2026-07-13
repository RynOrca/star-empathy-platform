<template>
  <div class="legend">
    <button
      class="legend-item"
      :class="{ active: filters.history }"
      @click="toggle('history')"
    >
      <span class="dot history-dot" />
      <span>历史里的星</span>
    </button>
    <button
      class="legend-item"
      :class="{ active: filters.user }"
      @click="toggle('user')"
    >
      <span class="dot user-dot" />
      <span>看见大家</span>
    </button>
    <button
      class="legend-item"
      :class="{ active: filters.highlightResonance }"
      @click="toggle('highlightResonance')"
    >
      <span class="dot resonance-dot" />
      <span>高亮共鸣</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const props = defineProps<{
  filters: { history: boolean; user: boolean; highlightResonance: boolean }
}>()

const emit = defineEmits<{
  update: [filters: typeof props.filters]
}>()

function toggle(key: 'history' | 'user' | 'highlightResonance') {
  const updated = { ...props.filters, [key]: !props.filters[key] }
  emit('update', updated)
}
</script>

<style scoped>
.legend {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 10;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.9rem;
  background: color-mix(in srgb, var(--bg2) 80%, transparent);
  border: 1px solid var(--rule);
  border-radius: 18px;
  color: var(--muted);
  font-family: var(--font);
  font-size: 0.82rem;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: border-color 0.3s, color 0.3s;
}
.legend-item.active {
  border-color: var(--accent);
  color: var(--ink);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.history-dot { background: var(--accent); }
.user-dot { background: var(--star-blue); }
.resonance-dot { background: var(--star-green); }
</style>
