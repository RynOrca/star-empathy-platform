<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="form-panel">
      <!-- 移动端拖拽手柄 -->
      <div class="mobile-drag-handle" @click="$emit('close')"></div>
      <div class="form-header">
        <h2 class="form-heading"><PenSquare :size="16" /> 写我的故事</h2>
        <button class="close-icon" @click="$emit('close')"><X :size="15" /></button>
      </div>

      <div class="form-body">
        <div class="field">
          <label class="field-label">标题</label>
          <input
            v-model="title"
            class="field-input"
            placeholder="给你的故事起个名字..."
            maxlength="60"
          />
        </div>

        <div class="field">
          <label class="field-label">故事</label>
          <textarea
            v-model="content"
            class="field-textarea"
            placeholder="此刻你在这颗星下想起了什么？写下你的心事吧..."
            maxlength="300"
            rows="6"
            ref="textareaRef"
          ></textarea>
          <div class="char-count" :class="{ warn: content.length >= 280 }">
            {{ content.length }} / 300
          </div>
        </div>

        <!-- 情绪标签 -->
        <div class="field">
          <label class="field-label">情绪标签 <span class="optional">- 可选</span></label>
          <div class="tag-picker">
            <button
              v-for="t in tagOptions"
              :key="t"
              class="tag-btn"
              :class="{ active: selectedTag === t, ['tag-' + t]: true }"
              @click="selectedTag = selectedTag === t ? null : t"
            >{{ t }}</button>
          </div>
        </div>

        <!-- 匿名投递 -->
        <div class="field">
          <label class="field-checkbox">
            <input type="checkbox" v-model="isAnonymous" />
            <span>匿名投递（故事属于你，但不显示你的名字）</span>
          </label>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button class="submit-btn" :disabled="submitting || !title.trim() || !content.trim()" @click="onSubmit">
          <Send :size="14" />
          <span>{{ submitting ? '化作星光中...' : '挂上星星' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PenSquare, X, Send } from 'lucide-vue-next'

const props = defineProps<{
  starName: string
  catalogStarId: number
}>()

const emit = defineEmits<{
  close: []
  submitted: [story: { id: number; title: string | null; content: string; resonanceCount: number; catalogStarId: number; createdAt: string; locationLat: number | null; locationLng: number | null; type: string; viewCount: number; origin: string | null; username: string | null; tag: string | null; userId: number | null }]
}>()

const title = ref('')
const content = ref('')
const submitting = ref(false)
const error = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const userLocation = ref<{ lat: number; lng: number } | null>(null)
const selectedTag = ref<string | null>(null)
const isAnonymous = ref(false)
const tagOptions = ['思念', '等待', '离别', '愿望', '孤独']

onMounted(() => {
  textareaRef.value?.focus()
  // 尝试获取用户位置
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocation.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      },
      () => { /* 用户拒绝或不可用，静默忽略 */ },
      { timeout: 5000 },
    )
  }
})

async function onSubmit() {
  const trimmedTitle = title.value.trim()
  const trimmed = content.value.trim()
  if (!trimmedTitle || !trimmed || submitting.value) return

  submitting.value = true
  error.value = ''

  try {
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        catalogStarId: props.catalogStarId,
        title: trimmedTitle,
        content: trimmed,
        location: userLocation.value,
        tag: selectedTag.value,
        isAnonymous: isAnonymous.value,
      }),
    })
    const json = await res.json()
    if (res.ok) {
      emit('submitted', {
        id: json.data.id,
        title: json.data.title,
        content: json.data.content,
        resonanceCount: json.data.resonanceCount,
        catalogStarId: json.data.catalogStarId,
        createdAt: json.data.createdAt || '',
        locationLat: json.data.locationLat ?? null,
        locationLng: json.data.locationLng ?? null,
        type: 'user',
        viewCount: 0,
        origin: null,
        username: json.data.username ?? null,
        tag: json.data.tag ?? selectedTag.value,
        userId: json.data.userId ?? null,
      })
    } else {
      error.value = json.message || '提交失败，再试一次吧'
    }
  } catch (e) {
    error.value = '网络开小差了，稍后再试'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* ─── Overlay ─── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 8, 22, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: fadeIn 0.15s ease-out;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ─── Form Panel ─── */
.form-panel {
  width: 540px;
  max-width: 92vw;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.2s ease-out;
  overflow: hidden;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Header ─── */
.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--rule);
}
.form-heading {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 8px;
}
.close-icon {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  color: var(--muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  padding: 0;
}
.close-icon:hover {
  color: var(--ink);
  border-color: var(--rule-hover);
}

/* ─── Body ─── */
.form-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 0.82rem;
  font-weight: 400;
  color: var(--ink-secondary);
}

/* ─── Inputs (PrimeVue form field style) ─── */
.field-input {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--rule);
  background: var(--surface-ground);
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.15s;
}
.field-input:focus {
  border-color: var(--accent);
}
.field-input::placeholder {
  color: var(--muted-light);
}

.field-textarea {
  resize: vertical;
  min-height: 130px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--rule);
  background: var(--surface-ground);
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.88rem;
  line-height: 1.65;
  outline: none;
  transition: border-color 0.15s;
}
.field-textarea:focus {
  border-color: var(--accent);
}
.field-textarea::placeholder {
  color: var(--muted-light);
}

/* ─── Char Count ─── */
.char-count {
  text-align: right;
  font-size: 0.72rem;
  color: var(--muted-light);
  margin-top: 2px;
}
.char-count.warn {
  color: #e8a84c;
}

/* ─── Error ─── */
.form-error {
  margin: 0;
  font-size: 0.82rem;
  color: var(--star-red);
  padding: 8px 12px;
  background: rgba(255, 139, 125, 0.06);
  border: 1px solid rgba(255, 139, 125, 0.12);
  border-radius: var(--radius-sm);
}

/* ─── Submit Button ─── */
.submit-btn {
  width: 100%;
  padding: 11px 0;
  border-radius: var(--radius-md);
  border: none;
  background: var(--accent);
  color: rgba(0, 0, 0, 0.75);
  font-family: var(--font);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}
.submit-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}
.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.tag-picker { display: flex; gap: 6px; flex-wrap: wrap; }
.tag-btn {
  padding: 4px 12px; border-radius: 14px; border: 1px solid rgba(48,55,87,0.4);
  background: rgba(255,255,255,0.04); color: #7a759c; font-size: 0.78rem;
  cursor: pointer; transition: all 0.15s;
}
.tag-btn:hover { border-color: rgba(48,55,87,0.7); color: #b9b4d6; }
.tag-btn.active { border-color: transparent; }
.tag-btn.tag-思念.active { background: rgba(255,139,125,0.2); color: #ff8b7d; }
.tag-btn.tag-等待.active { background: rgba(134,168,255,0.2); color: #86a8ff; }
.tag-btn.tag-离别.active { background: rgba(202,167,255,0.2); color: #caa7ff; }
.tag-btn.tag-愿望.active { background: rgba(255,217,138,0.2); color: #ffd98a; }
.tag-btn.tag-孤独.active { background: rgba(149,240,192,0.2); color: #95f0c0; }
.optional { color: #5a5580; font-size: 0.75rem; font-weight: 400; }
.field-checkbox { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.8rem; color: #7a759c; }
.field-checkbox input[type="checkbox"] { accent-color: #ffd98a; width: 15px; height: 15px; cursor: pointer; }
.submit-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ─── Mobile Drag Handle (desktop hidden) ─── */
.mobile-drag-handle {
  display: none;
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  margin: 10px auto 0;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.2s;
}
.mobile-drag-handle:hover {
  background: rgba(255, 255, 255, 0.35);
}

/* ─── Mobile Responsive (<=768px) ─── */
@media (max-width: 768px) {
  .overlay {
    align-items: flex-end;
    padding: 0;
    background: rgba(7, 8, 22, 0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .mobile-drag-handle {
    display: block;
  }

  .form-panel {
    width: 100%;
    max-width: 100%;
    border-radius: 20px 20px 0 0;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: slideUpForm 0.28s ease-out;
  }

  @keyframes slideUpForm {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  .form-header {
    padding: 14px 18px;
    flex-shrink: 0;
  }

  .form-heading {
    font-size: 0.95rem;
  }

  .close-icon {
    width: 32px;
    height: 32px;
  }

  .form-body {
    padding: 16px 18px 20px;
    gap: 16px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    -webkit-overflow-scrolling: touch;
  }

  .field-label {
    font-size: 0.82rem;
  }

  .field-input {
    padding: 11px 14px;
    font-size: 0.88rem;
  }

  .field-textarea {
    min-height: 120px;
    padding: 12px 14px;
    font-size: 0.88rem;
    line-height: 1.7;
  }

  .char-count {
    font-size: 0.72rem;
  }

  .tag-picker {
    gap: 6px;
  }

  .tag-btn {
    padding: 6px 14px;
    font-size: 0.78rem;
    border-radius: 16px;
  }

  .field-checkbox {
    font-size: 0.78rem;
    line-height: 1.5;
  }

  .field-checkbox input[type="checkbox"] {
    width: 17px;
    height: 17px;
    flex-shrink: 0;
  }

  .form-error {
    font-size: 0.8rem;
    padding: 10px 12px;
  }

  .submit-btn {
    padding: 13px 0;
    font-size: 0.9rem;
    margin-top: 6px;
  }
}

/* ─── Very small screens (<=380px) ─── */
@media (max-width: 380px) {
  .form-panel {
    max-height: 94vh;
  }
  .form-header {
    padding: 12px 14px;
  }
  .form-body {
    padding: 14px 14px 18px;
  }
  .tag-btn {
    padding: 5px 12px;
    font-size: 0.75rem;
  }
}
</style>
