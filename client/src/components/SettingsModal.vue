<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-card">
          <div class="modal-header">
            <span class="modal-title">设置</span>
            <button class="modal-close" @click="$emit('close')">
              <X :size="15" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">DeepSeek API Key</label>
              <div class="input-wrap">
                <input
                  ref="inputRef"
                  v-model="apiKey"
                  :type="showKey ? 'text' : 'password'"
                  class="form-input"
                  placeholder="sk-..."
                  :disabled="saving"
                  @keydown.enter="save"
                />
                <div class="input-actions">
                  <button
                    class="input-action-btn"
                    type="button"
                    :disabled="testing"
                    @click="testKey"
                    title="测试连通性"
                  >
                    <Loader2 v-if="testing" :size="15" class="spin" />
                    <Zap v-else :size="15" />
                  </button>
                  <button
                    class="input-action-btn"
                    type="button"
                    @click="showKey = !showKey"
                    :title="showKey ? '隐藏' : '显示'"
                  >
                    <EyeOff v-if="showKey" :size="15" />
                    <Eye v-else :size="15" />
                  </button>
                </div>
              </div>
              <p class="form-hint">
                用于生成"古今共望"叙事和"与古人共赏"对话。Key 仅保存在当前会话中，不会上传到服务器存储。
              </p>
            </div>
          </div>

          <div class="modal-footer">
            <div class="modal-status">
              <span v-if="statusText" class="status-text" :class="statusType">{{ statusText }}</span>
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" @click="clear" :disabled="saving">清除</button>
              <button class="btn btn-primary" @click="save" :disabled="saving">
                {{ saving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { X, Eye, EyeOff, Zap, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const apiKey = ref('')
const showKey = ref(false)
const saving = ref(false)
const testing = ref(false)
const statusText = ref('')
const statusType = ref<'success' | 'error'>('success')
const inputRef = ref<HTMLInputElement | null>(null)

// 打开时读取已有 key 状态
watch(() => props.visible, async (v) => {
  if (v) {
    statusText.value = ''
    apiKey.value = ''
    await nextTick()
    inputRef.value?.focus()
    // 检查后端是否有 key
    try {
      const res = await fetch('/api/settings/api-key')
      const json = await res.json()
      if (res.ok && json.data?.hasKey) {
        apiKey.value = '(已设置，输入新值覆盖)'
      }
    } catch {}
  }
})

function showStatus(text: string, type: 'success' | 'error') {
  statusText.value = text
  statusType.value = type
  setTimeout(() => { statusText.value = '' }, 3000)
}

async function save() {
  const key = apiKey.value.trim()
  // 如果是占位文本，不操作
  if (key === '(已设置，输入新值覆盖)') {
    emit('close')
    return
  }

  if (!key) {
    showStatus('请输入 API Key', 'error')
    return
  }

  saving.value = true
  try {
    const res = await fetch('/api/settings/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key }),
    })
    if (res.ok) {
      showStatus('API Key 已保存', 'success')
      setTimeout(() => emit('close'), 800)
    } else {
      const json = await res.json()
      showStatus(json.message || '保存失败', 'error')
    }
  } catch {
    showStatus('网络错误，请重试', 'error')
  } finally {
    saving.value = false
  }
}

async function testKey() {
  const key = apiKey.value.trim()
  if (key === '(已设置，输入新值覆盖)') {
    showStatus('正在测试已保存的 Key...', 'success')
    // 测试已保存的 key 不需要传新值
  } else if (!key) {
    showStatus('请先输入 API Key', 'error')
    return
  }

  testing.value = true
  try {
    const body = (key && key !== '(已设置，输入新值覆盖)') ? { apiKey: key } : {}
    const res = await fetch('/api/settings/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (res.ok) {
      showStatus('星河已连通', 'success')
    } else {
      showStatus(json.message || '未能连通', 'error')
    }
  } catch {
    showStatus('网络错误', 'error')
  } finally {
    testing.value = false
  }
}

async function clear() {
  saving.value = true
  try {
    const res = await fetch('/api/settings/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: '' }),
    })
    if (res.ok) {
      apiKey.value = ''
      showStatus('已清除', 'success')
    }
  } catch {
    showStatus('清除失败', 'error')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* ─── Overlay ─── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 8, 22, 0.6);
  backdrop-filter: blur(4px);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ─── Card ─── */
.modal-card {
  width: 420px;
  max-width: 90vw;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Header ─── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--rule);
}
.modal-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink);
}
.modal-close {
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
.modal-close:hover {
  color: var(--ink);
  border-color: var(--rule-hover);
}

/* ─── Body ─── */
.modal-body {
  padding: 22px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-label {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--ink-secondary);
}
.input-wrap {
  position: relative;
  display: flex;
}
.form-input {
  flex: 1;
  padding: 10px 80px 10px 14px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.84rem;
  outline: none;
  transition: border-color 0.15s;
}
.form-input::placeholder {
  color: var(--muted-light);
  opacity: 0.5;
}
.form-input:focus {
  border-color: var(--accent-border);
}
.form-input:disabled {
  opacity: 0.5;
}
.input-actions {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 2px;
}
.input-action-btn {
  background: none;
  border: none;
  color: var(--muted-light);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.input-action-btn:hover:not(:disabled) {
  color: var(--ink-secondary);
  background: rgba(255, 255, 255, 0.05);
}
.input-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.form-hint {
  font-size: 0.72rem;
  color: var(--muted-light);
  line-height: 1.5;
  margin: 0;
  opacity: 0.7;
}

/* ─── Footer ─── */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 22px;
  border-top: 1px solid var(--rule);
  background: rgba(0, 0, 0, 0.1);
}
.modal-status {
  flex: 1;
  min-width: 0;
}
.status-text {
  font-size: 0.78rem;
}
.status-text.success {
  color: var(--star-green);
}
.status-text.error {
  color: var(--star-red);
}
.modal-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.btn {
  padding: 8px 18px;
  border-radius: var(--radius-sm);
  font-family: var(--font);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  border: none;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-secondary {
  background: transparent;
  border: 1px solid var(--rule);
  color: var(--ink-secondary);
}
.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.04);
}
.btn-primary {
  background: var(--accent);
  color: rgba(0, 0, 0, 0.75);
  font-weight: 500;
}
.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

/* ─── Transition ─── */
.modal-fade-enter-active { transition: opacity 0.2s ease-out; }
.modal-fade-leave-active { transition: opacity 0.15s ease-in; }
.modal-fade-enter-from { opacity: 0; }
.modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .modal-card { transform: scale(0.96) translateY(8px); }
.modal-fade-leave-to .modal-card { transform: scale(0.96); }
</style>