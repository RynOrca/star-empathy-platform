<template>
  <div class="story-form-overlay" @click.self="$emit('close')">
    <div class="story-form-card">
      <h2>挂上我的故事</h2>
      <p class="hint">匿名写下你的心事，它会化作星光，留在夜空里。</p>
      <textarea
        v-model="content"
        maxlength="300"
        placeholder="今天发生了什么？你在想什么？..."
        rows="5"
      />
      <div class="form-footer">
        <span class="count" :class="{ warn: content.length > 280 }">
          {{ content.length }} / 300
        </span>
        <div class="buttons">
          <button class="cancel-btn" @click="$emit('close')">取消</button>
          <button
            class="submit-btn"
            :disabled="!valid || submitting"
            @click="onSubmit"
          >
            {{ submitting ? '投递中...' : '投向星空' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{
  submit: [content: string]
  close: []
}>()

const content = ref('')
const submitting = ref(false)

const valid = computed(() => {
  const trimmed = content.value.trim()
  return trimmed.length >= 1 && trimmed.length <= 300
})

async function onSubmit() {
  if (!valid.value || submitting.value) return
  submitting.value = true
  emit('submit', content.value.trim())
}
</script>

<style scoped>
.story-form-overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 8, 22, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}
.story-form-card {
  width: 90%;
  max-width: 420px;
  padding: 2rem;
  background: color-mix(in srgb, var(--bg2) 90%, transparent);
  border: 1px solid var(--rule);
  border-radius: 24px;
  box-shadow: 0 24px 64px var(--shadow);
}
h2 { color: var(--accent); margin-bottom: 0.3rem; }
.hint { color: var(--muted); font-size: 0.88rem; margin-bottom: 1rem; }
textarea {
  width: 100%;
  padding: 0.8rem;
  background: color-mix(in srgb, var(--bg) 70%, transparent);
  border: 1px solid var(--rule);
  border-radius: 14px;
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.95rem;
  resize: vertical;
  outline: none;
  transition: border-color 0.3s;
}
textarea:focus { border-color: var(--accent); }
.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.8rem;
}
.count { color: var(--muted); font-size: 0.82rem; }
.count.warn { color: var(--star-red); }
.buttons { display: flex; gap: 0.6rem; }
.cancel-btn {
  padding: 0.45rem 1.1rem;
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 16px;
  color: var(--muted);
  font-family: var(--font);
  cursor: pointer;
}
.submit-btn {
  padding: 0.45rem 1.1rem;
  background: color-mix(in srgb, var(--accent) 20%, transparent);
  border: 1px solid var(--accent);
  border-radius: 16px;
  color: var(--accent);
  font-family: var(--font);
  cursor: pointer;
  transition: background 0.3s;
}
.submit-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 38%, transparent);
}
.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
