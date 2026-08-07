<template>
  <Transition name="cem-fade">
    <div v-if="show" class="cem-mask" @click.self="onCloseRequest">
      <div class="cem-panel" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <header class="cem-head">
          <h3 :id="titleId" class="cem-title">{{ isEdit ? '编辑星笺' : '新建星笺' }}</h3>
          <button type="button" class="cem-close" aria-label="关闭" @click="onCloseRequest">
            <X :size="14" />
          </button>
        </header>

        <main class="cem-body">
          <!-- 名称 -->
          <div class="cem-field">
            <label class="cem-label">名称 <span class="cem-req">*</span></label>
            <input
              ref="nameInputRef"
              v-model="form.name"
              class="cem-input"
              placeholder="给这组故事起个名字…（如：夏夜独白）"
              maxlength="40"
            />
          </div>

          <!-- 描述 -->
          <div class="cem-field">
            <label class="cem-label">描述 <span class="cem-opt">可选</span></label>
            <textarea
              v-model="form.description"
              class="cem-textarea"
              placeholder="这组故事讲了什么？"
              maxlength="200"
              rows="3"
            ></textarea>
            <span class="cem-count" :class="{ warn: (form.description || '').length >= 180 }">
              {{ (form.description || '').length }}/200
            </span>
          </div>

          <!-- 封面色 -->
          <div class="cem-field">
            <label class="cem-label">封面色</label>
            <div class="cem-colors">
              <button
                v-for="c in PRESET_COLORS"
                :key="c"
                type="button"
                class="cem-color-dot"
                :class="{ on: (form.coverColor || DEFAULT_COLOR) === c }"
                :style="{ background: c }"
                :aria-label="`选择颜色 ${c}`"
                @click="form.coverColor = c"
              ></button>
            </div>
          </div>

          <!-- 可见性 -->
          <div class="cem-field">
            <label class="cem-label">可见性</label>
            <div class="cem-visi">
              <button
                type="button"
                class="cem-visi-btn"
                :class="{ on: form.visibility === 'public' }"
                @click="form.visibility = 'public'"
              >
                <Globe :size="12" />
                <div class="cem-visi-text">
                  <span class="cem-visi-name">公开</span>
                  <span class="cem-visi-desc">所有人可见合集内故事</span>
                </div>
              </button>
              <button
                type="button"
                class="cem-visi-btn"
                :class="{ on: form.visibility === 'anonymous' }"
                @click="form.visibility = 'anonymous'"
              >
                <Ghost :size="12" />
                <div class="cem-visi-text">
                  <span class="cem-visi-name">匿名</span>
                  <span class="cem-visi-desc">公开展示，对外隐藏作者名</span>
                </div>
              </button>
              <button
                type="button"
                class="cem-visi-btn"
                :class="{ on: form.visibility === 'private' }"
                @click="form.visibility = 'private'"
              >
                <Lock :size="12" />
                <div class="cem-visi-text">
                  <span class="cem-visi-name">私有</span>
                  <span class="cem-visi-desc">仅你自己可见合集内故事</span>
                </div>
              </button>
            </div>
          </div>

          <p v-if="error" class="cem-error">
            <AlertCircle :size="12" />
            <span>{{ error }}</span>
          </p>
        </main>

        <footer class="cem-foot">
          <button type="button" class="cem-btn cem-btn-ghost" @click="onCloseRequest" :disabled="submitting">
            取消
          </button>
          <button
            type="button"
            class="cem-btn cem-btn-primary"
            :disabled="submitting || !canSubmit"
            @click="onSubmit"
          >
            {{ submitting ? '保存中…' : (isEdit ? '保存修改' : '创建星笺') }}
          </button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, nextTick } from 'vue'
import { X, Globe, Lock, AlertCircle, Ghost } from 'lucide-vue-next'
import type { Collection, CreateCollectionInput, UpdateCollectionInput } from '../composables/useCollections'
import { useAuth } from '../stores/auth'

const { user } = useAuth()

const props = defineProps<{
  show: boolean
  /** 传入合集对象则进入编辑模式；null/undefined 为新建 */
  collection?: Collection | null
  submitting?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: { isEdit: boolean; id?: number; data: CreateCollectionInput | UpdateCollectionInput }]
}>()

const DEFAULT_COLOR = '#E8B86D'
const PRESET_COLORS = [
  '#E8B86D', // 暖金（默认）
  '#95E0C0', // 青绿
  '#CAA7FF', // 紫
  '#7AB8F0', // 蓝
  '#FF9CB8', // 樱粉
  '#FFD98A', // 月光黄
  '#A8E89C', // 嫩绿
  '#F4A8B8', // 玫瑰
]

const titleId = 'cem-title-' + Math.random().toString(36).slice(2, 8)
const nameInputRef = ref<HTMLInputElement | null>(null)

const form = reactive({
  name: '',
  description: '',
  coverColor: DEFAULT_COLOR as string | null,
  visibility: 'public' as 'public' | 'private' | 'anonymous' | 'galaxy',
})

const isEdit = computed(() => !!props.collection)

const canSubmit = computed(() => form.name.trim().length > 0 && form.name.trim().length <= 40)

/** 打开时同步表单：编辑模式回填，新建模式重置。星河合集不开放前端编辑，被强推回 public。 */
watch(() => props.show, async (v) => {
  if (!v) return
  if (props.collection) {
    form.name = props.collection.name
    form.description = props.collection.description || ''
    form.coverColor = props.collection.coverColor || DEFAULT_COLOR
    form.visibility = props.collection.visibility === 'galaxy' ? 'public' : props.collection.visibility
  } else {
    form.name = ''
    form.description = ''
    form.coverColor = DEFAULT_COLOR
    form.visibility = 'public'
  }
  await nextTick()
  nameInputRef.value?.focus()
})

function onCloseRequest() {
  if (props.submitting) return
  emit('close')
}

function onSubmit() {
  if (!canSubmit.value || props.submitting) return
  const data: CreateCollectionInput | UpdateCollectionInput = {
    name: form.name.trim(),
    description: form.description.trim() || null,
    coverColor: form.coverColor,
    visibility: form.visibility,
  }
  emit('submit', {
    isEdit: isEdit.value,
    id: props.collection?.id,
    data,
  })
}
</script>

<style scoped>
.cem-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(8, 8, 16, 0.66);
  backdrop-filter: blur(8px) saturate(140%);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.cem-panel {
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: rgba(28, 29, 44, 0.96);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}

.cem-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.06);
}
.cem-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: 0.02em;
}
.cem-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.cem-close:hover { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.85); }

.cem-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cem-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}
.cem-label {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.cem-req { color: #ff6b8a; font-size: 0.7rem; }
.cem-opt { color: rgba(255, 255, 255, 0.3); font-size: 0.66rem; font-weight: 400; }

.cem-input, .cem-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.035);
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.92);
  font-family: inherit;
  font-size: 0.86rem;
  outline: none;
  transition: border-color .15s ease, background .15s ease;
}
.cem-input:focus, .cem-textarea:focus {
  border-color: rgba(255, 217, 138, 0.32);
  background: rgba(255, 217, 138, 0.04);
}
.cem-input::placeholder, .cem-textarea::placeholder { color: rgba(255, 255, 255, 0.28); }
.cem-textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.55;
}
.cem-count {
  position: absolute;
  right: 4px;
  bottom: -16px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  font-variant-numeric: tabular-nums;
}
.cem-count.warn { color: #ffb38a; }

/* ── 封面色 ── */
.cem-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cem-color-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 0.5px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
  padding: 0;
  transition: transform .15s ease, box-shadow .15s ease;
}
.cem-color-dot:hover { transform: scale(1.1); }
.cem-color-dot.on {
  box-shadow: 0 0 0 2px rgba(28, 29, 44, 1), 0 0 0 3.5px currentColor;
  transform: scale(1.08);
}

/* ── 可见性 ── */
.cem-visi {
  display: flex;
  gap: 8px;
}
.cem-visi-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.028);
  border: 0.5px solid rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.62);
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: all .15s ease;
}
.cem-visi-btn:hover { background: rgba(255, 255, 255, 0.05); }
.cem-visi-btn.on {
  background: rgba(255, 217, 138, 0.10);
  border-color: rgba(255, 217, 138, 0.28);
  color: #ffe5a8;
}
.cem-visi-text { display: flex; flex-direction: column; gap: 1px; }
.cem-visi-name { font-size: 0.82rem; font-weight: 500; }
.cem-visi-desc { font-size: 10.5px; color: rgba(255, 255, 255, 0.38); }
.cem-visi-btn.on .cem-visi-desc { color: rgba(255, 229, 168, 0.6); }

/* ── 错误 ── */
.cem-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 107, 138, 0.08);
  border: 0.5px solid rgba(255, 107, 138, 0.22);
  color: #ff8aa6;
  font-size: 0.78rem;
}

/* ── footer ── */
.cem-foot {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-top: 0.5px solid rgba(255, 255, 255, 0.06);
}
.cem-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.84rem;
  cursor: pointer;
  transition: background .15s ease, opacity .15s ease;
  border: 0.5px solid transparent;
}
.cem-btn:disabled { opacity: 0.5; cursor: wait; }
.cem-btn-ghost {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
}
.cem-btn-ghost:hover:not(:disabled) { background: rgba(255, 255, 255, 0.08); }
.cem-btn-primary {
  background: rgba(255, 217, 138, 0.14);
  border-color: rgba(255, 217, 138, 0.32);
  color: #ffe5a8;
  font-weight: 500;
}
.cem-btn-primary:hover:not(:disabled) { background: rgba(255, 217, 138, 0.22); }

/* ── 过渡 ── */
.cem-fade-enter-active, .cem-fade-leave-active {
  transition: opacity .18s ease;
}
.cem-fade-enter-active .cem-panel, .cem-fade-leave-active .cem-panel {
  transition: opacity .18s ease, transform .18s ease;
}
.cem-fade-enter-from, .cem-fade-leave-to { opacity: 0; }
.cem-fade-enter-from .cem-panel, .cem-fade-leave-to .cem-panel {
  transform: translateY(10px) scale(0.97);
}

/* ── 移动端 ── */
@media (max-width: 480px) {
  .cem-mask { padding: 0; align-items: flex-end; }
  .cem-panel {
    max-width: 100%;
    max-height: 92vh;
    border-radius: 16px 16px 0 0;
  }
  .cem-visi { flex-direction: column; }
}
</style>
