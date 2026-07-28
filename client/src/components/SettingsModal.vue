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
            <!-- DeepSeek API Key -->
            <div class="form-group">
              <label class="form-label">DeepSeek API Key</label>
              <p v-if="hasExistingKey && !apiKey" class="form-existing-hint">
                <Check :size="14" /> API Key 已配置。如需更换，请在上方输入新 Key。
              </p>
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
                用于生成"古今共望"叙事和"与古人共赏"对话。Key 会安全保存在服务端，刷新不丢失。
              </p>
              <div class="form-actions">
                <button class="btn btn-sm btn-secondary" @click="clear" :disabled="saving">清除</button>
                <button class="btn btn-sm btn-primary" @click="save" :disabled="saving">
                  {{ saving ? '保存中...' : '保存' }}
                </button>
              </div>
            </div>

            <div class="divider"></div>

            <!-- 高德地图 API Key -->
            <div class="form-group">
              <label class="form-label">高德地图 API Key</label>
              <p v-if="hasAmapKey && !amapKey" class="form-existing-hint">
                <Check :size="14" /> 高德 Key 已配置。如需更换，请在上方输入新 Key。
              </p>
              <div class="input-wrap">
                <input
                  v-model="amapKey"
                  :type="showAmapKey ? 'text' : 'password'"
                  class="form-input"
                  placeholder="输入高德 Web 服务 Key..."
                  :disabled="savingAmap"
                  @keydown.enter="saveAmap"
                />
                <div class="input-actions">
                  <button
                    class="input-action-btn"
                    type="button"
                    :disabled="testingAmap"
                    @click="testAmapKey"
                    title="测试连通性"
                  >
                    <Loader2 v-if="testingAmap" :size="15" class="spin" />
                    <Zap v-else :size="15" />
                  </button>
                  <button
                    class="input-action-btn"
                    type="button"
                    @click="showAmapKey = !showAmapKey"
                    :title="showAmapKey ? '隐藏' : '显示'"
                  >
                    <EyeOff v-if="showAmapKey" :size="15" />
                    <Eye v-else :size="15" />
                  </button>
                </div>
              </div>
              <p class="form-hint">
                用于反向地理编码，将 GPS 坐标转为城市名显示。免费额度每日 5000 次。
                <a href="https://console.amap.com/dev/key/app" target="_blank" class="form-link">获取 Key</a>
              </p>
              <div class="form-actions">
                <button class="btn btn-sm btn-secondary" @click="clearAmap" :disabled="savingAmap">清除</button>
                <button class="btn btn-sm btn-primary" @click="saveAmap" :disabled="savingAmap">
                  {{ savingAmap ? '保存中...' : '保存' }}
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <div class="modal-status">
              <span v-if="statusText" class="status-text" :class="statusType">{{ statusText }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { X, Eye, EyeOff, Zap, Loader2, Check } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

// DeepSeek
const apiKey = ref('')
const showKey = ref(false)
const saving = ref(false)
const testing = ref(false)
const hasExistingKey = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

// 高德
const amapKey = ref('')
const showAmapKey = ref(false)
const savingAmap = ref(false)
const testingAmap = ref(false)
const hasAmapKey = ref(false)

// 状态
const statusText = ref('')
const statusType = ref<'success' | 'error'>('success')

// 打开时读取已有 key 状态
watch(() => props.visible, async (v) => {
  if (v) {
    statusText.value = ''
    apiKey.value = ''
    hasExistingKey.value = false
    amapKey.value = ''
    hasAmapKey.value = false
    await nextTick()
    inputRef.value?.focus()
    try {
      const [dkRes, akRes] = await Promise.all([
        fetch('/api/settings/api-key'),
        fetch('/api/settings/amap-key'),
      ])
      const dkJson = await dkRes.json()
      if (dkRes.ok && dkJson.data?.hasKey) hasExistingKey.value = true
      const akJson = await akRes.json()
      if (akRes.ok && akJson.data?.hasKey) hasAmapKey.value = true
    } catch {}
  }
})

function showStatus(text: string, type: 'success' | 'error') {
  statusText.value = text
  statusType.value = type
  setTimeout(() => { statusText.value = '' }, 3000)
}

// ─── DeepSeek ───
async function save() {
  const key = apiKey.value.trim()
  if (!key) { showStatus('请输入 API Key', 'error'); return }
  saving.value = true
  try {
    const res = await fetch('/api/settings/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key }),
    })
    if (res.ok) {
      hasExistingKey.value = true
      showStatus('DeepSeek Key 已保存', 'success')
    } else {
      const json = await res.json()
      showStatus(json.message || '保存失败', 'error')
    }
  } catch {
    showStatus('网络错误，请重试', 'error')
  } finally { saving.value = false }
}

async function testKey() {
  const key = apiKey.value.trim()
  if (!key && !hasExistingKey.value) { showStatus('请先输入 API Key', 'error'); return }
  testing.value = true
  try {
    const body = key ? { apiKey: key } : {}
    const res = await fetch('/api/settings/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (res.ok) showStatus('星河已连通', 'success')
    else showStatus(json.message || '未能连通', 'error')
  } catch {
    showStatus('网络错误', 'error')
  } finally { testing.value = false }
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
      hasExistingKey.value = false
      showStatus('DeepSeek Key 已清除', 'success')
    }
  } catch { showStatus('清除失败', 'error') }
  finally { saving.value = false }
}

// ─── 高德 ───
async function saveAmap() {
  const key = amapKey.value.trim()
  if (!key) { showStatus('请输入高德 API Key', 'error'); return }
  savingAmap.value = true
  try {
    const res = await fetch('/api/settings/amap-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key }),
    })
    if (res.ok) {
      hasAmapKey.value = true
      showStatus('高德 Key 已保存', 'success')
    } else {
      const json = await res.json()
      showStatus(json.message || '保存失败', 'error')
    }
  } catch {
    showStatus('网络错误，请重试', 'error')
  } finally { savingAmap.value = false }
}

async function testAmapKey() {
  const key = amapKey.value.trim()
  if (!key && !hasAmapKey.value) { showStatus('请先输入高德 API Key', 'error'); return }
  testingAmap.value = true
  try {
    const body = key ? { apiKey: key } : {}
    const res = await fetch('/api/settings/test-amap-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (res.ok) showStatus('高德地图已连通', 'success')
    else showStatus(json.message || '未能连通', 'error')
  } catch {
    showStatus('网络错误', 'error')
  } finally { testingAmap.value = false }
}

async function clearAmap() {
  savingAmap.value = true
  try {
    const res = await fetch('/api/settings/amap-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: '' }),
    })
    if (res.ok) {
      amapKey.value = ''
      hasAmapKey.value = false
      showStatus('高德 Key 已清除', 'success')
    }
  } catch { showStatus('清除失败', 'error') }
  finally { savingAmap.value = false }
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
  display: flex;
  flex-direction: column;
  gap: 0;
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
.form-existing-hint {
  font-size: 0.78rem;
  color: var(--star-green);
  line-height: 1.5;
  margin: 0 0 8px;
  opacity: 0.85;
}

.divider {
  height: 1px;
  background: var(--rule);
  margin: 18px 0;
}

.form-link {
  color: var(--accent);
  text-decoration: none;
  margin-left: 4px;
}
.form-link:hover {
  text-decoration: underline;
}

/* ─── Form actions ─── */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

/* ─── Footer ─── */
.modal-footer {
  display: flex;
  align-items: center;
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

/* ─── Buttons ─── */
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
.btn-sm {
  padding: 5px 14px;
  font-size: 0.76rem;
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