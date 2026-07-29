<template>
  <Transition name="action-sheet">
    <div v-if="visible" class="action-sheet-overlay" @click.self="$emit('cancel')">
      <div class="action-sheet">
        <div class="action-sheet-handle"></div>
        <div class="action-sheet-body">
          <div class="action-sheet-icon">
            <AlertTriangle :size="28" />
          </div>
          <h3 class="action-sheet-title">确认删除</h3>
          <p class="action-sheet-desc">删除后不可恢复，确定要删除这个故事吗？</p>
          <div class="action-sheet-actions">
            <button
              class="action-sheet-btn action-sheet-btn-danger"
              :class="{ 'countdown': countdown > 0 }"
              :disabled="loading"
              @click="handleConfirm"
            >
              <template v-if="countdown > 0 && !loading">
                确认删除 ({{ countdown }}s)
              </template>
              <template v-else-if="loading">
                删除中...
              </template>
              <template v-else>
                确认删除
              </template>
            </button>
            <button
              class="action-sheet-btn action-sheet-btn-cancel"
              :disabled="loading"
              @click="$emit('cancel')"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const countdown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

watch(() => props.visible, (v) => {
  if (v) {
    countdown.value = 3
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer!)
        timer = null
        emit('cancel')
      }
    }, 1000)
  } else {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    countdown.value = 0
  }
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

function handleConfirm() {
  if (countdown.value > 0 || props.loading) return
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  emit('confirm')
}
</script>

<style scoped>
.action-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(4, 4, 18, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.action-sheet {
  width: 100%;
  max-width: 500px;
  background: rgba(16, 20, 43, 0.98);
  border: 1px solid rgba(48, 55, 87, 0.5);
  border-radius: 20px 20px 0 0;
  padding: 12px 20px 28px;
}

.action-sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 auto 20px;
}

.action-sheet-body {
  text-align: center;
}

.action-sheet-icon {
  color: #ff6b8a;
  margin-bottom: 12px;
  display: flex;
  justify-content: center;
}

.action-sheet-title {
  color: #ff6b8a;
  font-size: 1rem;
  margin: 0 0 8px;
  font-weight: 600;
}

.action-sheet-desc {
  color: #b9b4d6;
  font-size: 0.85rem;
  margin: 0 0 24px;
  line-height: 1.6;
}

.action-sheet-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-sheet-btn {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  font-family: var(--font);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  border: none;
}

.action-sheet-btn-danger {
  background: #ff6b8a;
  color: #1a1438;
}
.action-sheet-btn-danger:hover:not(:disabled) {
  background: #ff8a9e;
}
.action-sheet-btn-danger.countdown {
  background: rgba(255, 107, 138, 0.3);
  color: #ff6b8a;
}
.action-sheet-btn-danger:disabled {
  opacity: 0.5;
  cursor: wait;
}

.action-sheet-btn-cancel {
  background: rgba(255, 255, 255, 0.05);
  color: #7a759c;
  border: 1px solid rgba(48, 55, 87, 0.5);
}
.action-sheet-btn-cancel:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.15);
  color: #f6f1ff;
}
.action-sheet-btn-cancel:disabled {
  opacity: 0.5;
  cursor: wait;
}

/* ─── Transition ─── */
.action-sheet-enter-active,
.action-sheet-leave-active {
  transition: opacity 0.25s ease;
}
.action-sheet-enter-active .action-sheet,
.action-sheet-leave-active .action-sheet {
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}
.action-sheet-enter-from,
.action-sheet-leave-to {
  opacity: 0;
}
.action-sheet-enter-from .action-sheet,
.action-sheet-leave-to .action-sheet {
  transform: translateY(100%);
}
</style>