<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="form-panel">
      <div class="form-header">
        <h2 class="form-heading"><PenSquare :size="18" /> 写我的故事</h2>
        <button class="close-icon" @click="$emit('close')"><X :size="16" /></button>
      </div>

      <div class="form-body">
        <div class="field">
          <label class="field-label">标题 <span class="optional">（选填）</span></label>
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

        <p v-if="error" class="form-error">{{ error }}</p>

        <button class="submit-btn" :disabled="submitting || !content.trim()" @click="onSubmit">
          <Send :size="15" />
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
  submitted: [story: { id: number; title: string | null; content: string; resonanceCount: number; catalog_star_id: number }]
}>()

const title = ref('')
const content = ref('')
const submitting = ref(false)
const error = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

onMounted(() => {
  textareaRef.value?.focus()
})

async function onSubmit() {
  const trimmed = content.value.trim()
  if (!trimmed || submitting.value) return

  submitting.value = true
  error.value = ''

  try {
    const res = await fetch('/api/stars/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        catalog_star_id: props.catalogStarId,
        title: title.value.trim() || null,
        content: trimmed,
      }),
    })
    const json = await res.json()
    if (json.code === 200) {
      emit('submitted', {
        id: json.data.id,
        title: json.data.title,
        content: json.data.content,
        resonanceCount: json.data.resonance_count,
        catalog_star_id: json.data.catalog_star_id,
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
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 8, 22, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: fadeIn 0.2s;
}
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

.form-panel {
  width: 520px;
  max-width: 90vw;
  background: color-mix(in srgb, var(--bg2) 94%, transparent);
  border: 1px solid var(--rule);
  border-radius: 16px;
  backdrop-filter: blur(24px);
  box-shadow: 0 8px 32px var(--shadow);
  animation: slideUp 0.25s ease;
  overflow: hidden;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--rule);
}
.form-heading {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.close-icon {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 2px;
  opacity: 0.4;
  transition: opacity 0.15s;
}
.close-icon:hover { opacity: 0.8; }

.form-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.field-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--muted);
}
.optional {
  font-weight: 400;
  opacity: 0.6;
}
.field-input {
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--rule);
  background: color-mix(in srgb, var(--bg) 60%, transparent);
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.2s;
}
.field-input:focus {
  border-color: var(--accent);
}
.field-input::placeholder {
  color: color-mix(in srgb, var(--muted) 50%, transparent);
}
.field-textarea {
  resize: vertical;
  min-height: 120px;
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--rule);
  background: color-mix(in srgb, var(--bg) 60%, transparent);
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.88rem;
  line-height: 1.65;
  outline: none;
  transition: border-color 0.2s;
}
.field-textarea:focus {
  border-color: var(--accent);
}
.field-textarea::placeholder {
  color: color-mix(in srgb, var(--muted) 50%, transparent);
}
.char-count {
  text-align: right;
  font-size: 0.72rem;
  color: var(--muted);
  margin-top: 0.15rem;
}
.char-count.warn {
  color: #e8a84c;
}

.form-error {
  margin: 0;
  font-size: 0.82rem;
  color: #e85a5a;
}

.submit-btn {
  width: 100%;
  padding: 0.65rem 0;
  border-radius: 10px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-family: var(--font);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}
.submit-btn:hover:not(:disabled) {
  opacity: 0.85;
}
.submit-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
