<template>
  <div class="cp-wrap">
    <!-- 选择行：下拉 + 当前选中态 -->
    <div class="cp-select" :class="{ active: open }" @click="toggleOpen">
      <span v-if="!hasSelection" class="cp-placeholder">请选择合集…</span>
      <template v-else-if="mode === 'existing' && selectedId">
        <span class="cp-dot" :style="{ background: selectedColor }"></span>
        <Library :size="11" class="cp-icon" />
        <span class="cp-cur-name">{{ selectedName }}</span>
      </template>
      <template v-else-if="mode === 'new'">
        <Plus :size="11" class="cp-icon" />
        <span class="cp-cur-name">新建：{{ newName || '未命名' }}</span>
      </template>
      <ChevronDown :size="12" class="cp-arrow" />
    </div>

    <!-- 下拉面板 -->
    <Transition name="cp-drop">
      <div v-if="open" class="cp-panel">
        <!-- 已有合集列表 -->
        <div v-if="collections.length" class="cp-group">
          <div class="cp-group-title">我的合集</div>
          <button
            v-for="c in collections"
            :key="c.id"
            type="button"
            class="cp-opt"
            :class="{ on: mode === 'existing' && selectedId === c.id }"
            @click="chooseExisting(c.id)"
          >
            <span class="cp-dot" :style="{ background: c.coverColor || '#E8B86D' }"></span>
            <Library :size="11" class="cp-icon" />
            <span class="cp-opt-name">{{ c.name }}</span>
            <Lock v-if="c.visibility === 'private'" :size="9" class="cp-opt-lock" />
            <span class="cp-opt-count">{{ c.storyCount }}</span>
          </button>
        </div>

        <!-- 新建合集 -->
        <div class="cp-group cp-new-group">
          <button
            type="button"
            class="cp-opt"
            :class="{ on: mode === 'new' }"
            @click="mode = 'new'"
          >
            <Plus :size="11" class="cp-icon" />
            <span class="cp-opt-name">新建合集</span>
          </button>
          <Transition name="cp-expand">
            <div v-if="mode === 'new'" class="cp-new-form">
              <input
                v-model="newName"
                class="cp-new-input"
                placeholder="合集名称（如：夏夜独白）"
                maxlength="40"
                @keydown.enter.prevent
              />
              <div class="cp-visi">
                <button
                  type="button"
                  class="cp-visi-btn"
                  :class="{ on: newVisibility === 'public' }"
                  @click="newVisibility = 'public'"
                >
                  <Globe :size="10" />
                  <span>公开</span>
                </button>
                <button
                  type="button"
                  class="cp-visi-btn"
                  :class="{ on: newVisibility === 'private' }"
                  @click="newVisibility = 'private'"
                >
                  <Lock :size="10" />
                  <span>私有</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Library, Lock, Plus, ChevronDown, Globe } from 'lucide-vue-next'
import { useCollections, type Collection } from '../composables/useCollections'

type Mode = 'none' | 'existing' | 'new'

const props = defineProps<{
  modelValue: { collectionId?: number; collectionName?: string; visibility?: 'public' | 'private' } | null
}>()
const emit = defineEmits<{ 'update:modelValue': [v: { collectionId?: number; collectionName?: string; visibility?: 'public' | 'private' } | null] }>()

const { list, fetchList } = useCollections()
const collections = computed<Collection[]>(() => list.value)

const open = ref(false)
const mode = ref<Mode>('none')
const selectedId = ref<number | null>(null)
const newName = ref('')
const newVisibility = ref<'public' | 'private'>('public')

onMounted(() => { fetchList().catch(() => {}) })

const selectedCollection = computed(() => collections.value.find((c) => c.id === selectedId.value) || null)
const selectedName = computed(() => selectedCollection.value?.name || '')
const selectedColor = computed(() => selectedCollection.value?.coverColor || '#E8B86D')
const hasSelection = computed(() => mode.value !== 'none')

function toggleOpen() { open.value = !open.value }

function chooseNone() {
  mode.value = 'none'
  selectedId.value = null
  newName.value = ''
  emit('update:modelValue', null)
  open.value = false
}
function chooseExisting(id: number) {
  mode.value = 'existing'
  selectedId.value = id
  newName.value = ''
  emit('update:modelValue', { collectionId: id })
  open.value = false
}

// mode/newName/newVisibility 变化时同步 emit（新建模式）
watch([mode, newName, newVisibility], () => {
  if (mode.value === 'new') {
    const trimmed = newName.value.trim()
    emit('update:modelValue', trimmed ? { collectionName: trimmed, visibility: newVisibility.value } : null)
  }
})

// 外部重置（如表单 resetForm）
watch(() => props.modelValue, (v) => {
  if (!v) {
    if (mode.value !== 'none') {
      mode.value = 'none'
      selectedId.value = null
      newName.value = ''
    }
  } else if (v.collectionId && v.collectionId !== selectedId.value) {
    // 外部预设了 collectionId（如 StoryForm 自动预选默认合集）→ 同步内部状态
    mode.value = 'existing'
    selectedId.value = v.collectionId
    newName.value = ''
  }
}, { immediate: true })
</script>

<style scoped>
.cp-wrap { position: relative; width: 100%; }

.cp-select {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 14px;
  background: rgba(255, 255, 255, 0.028);
  border: 0.5px solid rgba(255, 255, 255, 0.05);
  border-radius: 11px;
  cursor: pointer;
  transition: all .18s ease;
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.88);
}
.cp-select:hover { border-color: rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.04); }
.cp-select.active { border-color: rgba(255, 217, 138, 0.28); background: rgba(255, 217, 138, 0.035); }
.cp-placeholder { color: rgba(255, 255, 255, 0.36); }
.cp-cur-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cp-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.cp-icon { color: rgba(255, 255, 255, 0.5); flex-shrink: 0; }
.cp-arrow { margin-left: auto; color: rgba(255, 255, 255, 0.34); transition: transform .18s ease; }
.cp-select.active .cp-arrow { transform: rotate(180deg); }

.cp-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 30;
  background: rgba(28, 29, 44, 0.96);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5);
  padding: 6px;
  max-height: 320px;
  overflow-y: auto;
}
.cp-group { padding: 4px 0; border-top: 0.5px solid rgba(255, 255, 255, 0.05); }
.cp-group:first-of-type { border-top: none; }
.cp-group-title {
  padding: 6px 12px 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.32);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.cp-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  background: none;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background .12s ease;
  text-align: left;
}
.cp-opt:hover { background: rgba(255, 255, 255, 0.05); }
.cp-opt.on { background: rgba(255, 217, 138, 0.10); color: #ffe5a8; }
.cp-opt-empty { color: rgba(255, 255, 255, 0.5); }
.cp-opt-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cp-opt-lock { color: rgba(255, 255, 255, 0.3); }
.cp-opt-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  font-variant-numeric: tabular-nums;
}

.cp-new-group { border-top: 0.5px solid rgba(255, 255, 255, 0.05); }
.cp-new-form {
  padding: 6px 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cp-new-input {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  color: rgba(255, 255, 255, 0.92);
  font-family: inherit;
  font-size: 13px;
  outline: none;
}
.cp-new-input:focus { border-color: rgba(255, 217, 138, 0.28); }
.cp-new-input::placeholder { color: rgba(255, 255, 255, 0.26); }
.cp-visi { display: flex; gap: 6px; }
.cp-visi-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 0;
  border-radius: 8px;
  border: 0.5px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.028);
  color: rgba(255, 255, 255, 0.62);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: all .15s ease;
}
.cp-visi-btn.on {
  background: rgba(255, 217, 138, 0.10);
  border-color: rgba(255, 217, 138, 0.28);
  color: #ffe5a8;
}

.cp-drop-enter-active, .cp-drop-leave-active { transition: opacity .16s ease, transform .16s ease; }
.cp-drop-enter-from, .cp-drop-leave-to { opacity: 0; transform: translateY(-4px); }
.cp-expand-enter-active, .cp-expand-leave-active { transition: opacity .16s ease; }
.cp-expand-enter-from, .cp-expand-leave-to { opacity: 0; }
</style>
