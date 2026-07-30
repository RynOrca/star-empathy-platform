<template>
  <div class="mobile-tab-select">
    <button class="tab-select-trigger" @click="open = !open">
      <component :is="currentTab.icon" :size="14" />
      <span>{{ currentTab.label }}</span>
      <ChevronDown :size="14" class="tab-select-arrow" :class="{ open }" />
    </button>
    <Transition name="tab-dropdown">
      <div v-if="open" class="tab-select-dropdown">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-select-option"
          :class="{ active: modelValue === tab.id }"
          @click="select(tab.id)"
        >
          <component :is="tab.icon" :size="14" />
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </Transition>
    <!-- 点击外部关闭 -->
    <div v-if="open" class="tab-select-backdrop" @click="open = false"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type Component } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

type TabId = string

const props = defineProps<{
  tabs: { id: TabId; label: string; icon: Component }[]
  modelValue: TabId
}>()

const emit = defineEmits<{
  'update:modelValue': [id: TabId]
}>()

const open = ref(false)

const currentTab = computed(() => {
  return props.tabs.find(t => t.id === props.modelValue) ?? props.tabs[0]
})

function select(id: TabId) {
  emit('update:modelValue', id)
  open.value = false
}
</script>

<style scoped>
.mobile-tab-select {
  position: relative;
  z-index: 10;
}

.tab-select-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.82rem;
  cursor: pointer;
  width: 100%;
  transition: border-color 0.15s;
}
.tab-select-trigger:hover {
  border-color: var(--rule-hover);
}

.tab-select-arrow {
  margin-left: auto;
  color: var(--muted);
  transition: transform 0.2s ease;
}
.tab-select-arrow.open {
  transform: rotate(180deg);
}

.tab-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: rgba(16, 20, 43, 0.98);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(48, 55, 87, 0.5);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: 20;
}

.tab-select-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: none;
  color: var(--ink-secondary);
  font-family: var(--font);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.tab-select-option:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--ink);
}
.tab-select-option.active {
  color: var(--accent);
  background: rgba(255, 217, 138, 0.06);
}

.tab-select-backdrop {
  position: fixed;
  inset: 0;
  z-index: 15;
}

/* ─── Transition ─── */
.tab-dropdown-enter-active,
.tab-dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tab-dropdown-enter-from,
.tab-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>