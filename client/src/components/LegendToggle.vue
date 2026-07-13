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
  top: 1.25rem;
  right: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 10;
  background: var(--bg2);
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  padding: 4px;
  box-shadow: var(--shadow-sm);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-family: var(--font);
  font-size: 0.8rem;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  width: 100%;
  text-align: left;
}
.legend-item:hover {
  color: var(--ink-secondary);
  background: rgba(255, 255, 255, 0.03);
}
.legend-item.active {
  color: var(--ink);
  background: rgba(255, 255, 255, 0.05);
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.history-dot { background: var(--accent); }
.user-dot { background: var(--star-blue); }
.resonance-dot { background: var(--star-green); }
</style>
