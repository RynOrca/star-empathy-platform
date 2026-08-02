<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-card">
          <!-- 移动端拖拽手柄 -->
          <div class="mobile-drag-handle" @click="$emit('close')"></div>
          <div class="modal-header">
            <span class="modal-title">设置</span>
            <button class="modal-close" @click="$emit('close')">
              <X :size="15" />
            </button>
          </div>

          <div class="modal-body">
            <!-- DeepSeek API Key（只读状态） -->
            <div class="form-group">
              <div class="status-header">
                <label class="form-label">DeepSeek AI 服务</label>
                <span :class="['status-chip', hasExistingKey ? 'ok' : 'missing']">
                  <Check v-if="hasExistingKey" :size="12" />
                  <CircleAlert v-else :size="12" />
                  {{ hasExistingKey ? '已连接' : '未配置' }}
                </span>
              </div>
              <p class="form-hint">
                用于生成「古今共望」叙事、「与古人共赏」对话、AI 星格画像/情感解构/主题森林
                等所有 AI 功能。
              </p>
              <div class="server-config-box">
                <FileCode :size="14" />
                <div class="scb-text">
                  通过服务器环境变量
                  <code>DEEPSEEK_API_KEY</code>
                  或写入
                  <code>server/.runtime-key</code>
                  文件配置。
                </div>
              </div>
            </div>

            <div class="divider"></div>

            <!-- 高德地图 API Key（只读状态） -->
            <div class="form-group">
              <div class="status-header">
                <label class="form-label">高德地图定位</label>
                <span :class="['status-chip', hasAmapKey ? 'ok' : 'warn']">
                  <Check v-if="hasAmapKey" :size="12" />
                  <CircleAlert v-else :size="12" />
                  {{ hasAmapKey ? '已连接' : '未配置（使用浏览器定位）' }}
                </span>
              </div>
              <p class="form-hint">
                用于把 GPS 坐标反向解析成城市名显示。
                <a
                  href="https://console.amap.com/dev/key/app"
                  target="_blank"
                  class="form-link"
                >申请 Key</a>
              </p>
              <div class="server-config-box">
                <FileCode :size="14" />
                <div class="scb-text">
                  通过服务器环境变量
                  <code>AMAP_API_KEY</code>
                  或写入
                  <code>server/.runtime-amap-key</code>
                  文件配置。
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <div class="modal-status">
              <span v-if="statusText" class="status-text" :class="statusType">
                {{ statusText }}
              </span>
              <span v-else class="status-text muted">
                出于安全考虑，Key 只在服务器端保存，前端不提供写入通道。
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Check, CircleAlert, FileCode } from 'lucide-vue-next'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const hasExistingKey = ref(false)
const hasAmapKey = ref(false)

const statusText = ref('')
const statusType = ref<'success' | 'error'>('success')

watch(
  () => props.visible,
  async (v) => {
    if (!v) return
    statusText.value = ''
    hasExistingKey.value = false
    hasAmapKey.value = false
    try {
      const [dkRes, akRes] = await Promise.all([
        fetch('/api/settings/api-key'),
        fetch('/api/settings/amap-key'),
      ])
      const dkJson = await dkRes.json().catch(() => ({}))
      if (dkRes.ok && dkJson.data?.hasKey) hasExistingKey.value = true
      const akJson = await akRes.json().catch(() => ({}))
      if (akRes.ok && akJson.data?.hasKey) hasAmapKey.value = true
    } catch {
      statusText.value = '无法读取服务器设置状态'
      statusType.value = 'error'
    }
  },
)
</script>

<style scoped>
/* ═══ 沿用原 SettingsModal 布局结构（overlay / card / header / body / footer） ═══ */
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
.modal-card {
  width: 420px;
  max-width: 90vw;
  background: var(--surface, #1a1b2e);
  border: 1px solid var(--rule, rgba(255, 255, 255, 0.08));
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.mobile-drag-handle {
  display: none;
}
@media (max-width: 600px) {
  .mobile-drag-handle {
    display: block;
    height: 5px;
    width: 40px;
    margin: 10px auto 0;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 22px;
  border-bottom: 1px solid var(--rule, rgba(255, 255, 255, 0.08));
}
.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: #e8eaf6;
}
.modal-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: transparent;
  color: #c8cae0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.modal-close:hover { background: rgba(255, 255, 255, 0.05); }

.modal-body {
  padding: 18px 22px 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #e4e6f5;
  margin: 0;
}
.form-hint {
  font-size: 12px;
  color: #8a8db0;
  line-height: 1.6;
  margin: 0;
}
.form-link {
  color: #9caaff;
  text-decoration: none;
  margin-left: 6px;
}
.form-link:hover { text-decoration: underline; }

.divider {
  height: 1px;
  background: var(--rule, rgba(255, 255, 255, 0.06));
  margin: 4px 0;
}

.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid transparent;
}
.status-chip.ok {
  color: #9ae6b4;
  background: rgba(154, 230, 180, 0.08);
  border-color: rgba(154, 230, 180, 0.25);
}
.status-chip.warn {
  color: #fde68a;
  background: rgba(253, 230, 138, 0.08);
  border-color: rgba(253, 230, 138, 0.25);
}
.status-chip.missing {
  color: #fca5a5;
  background: rgba(252, 165, 165, 0.08);
  border-color: rgba(252, 165, 165, 0.25);
}

.server-config-box {
  margin-top: 4px;
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(122, 138, 255, 0.06);
  border: 1px dashed rgba(122, 138, 255, 0.25);
  color: #a5b0ff;
  align-items: flex-start;
}
.scb-text {
  font-size: 12px;
  line-height: 1.7;
  flex: 1;
}
.scb-text code {
  display: inline-block;
  padding: 1px 6px;
  margin: 0 2px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: #c6d0ff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
}

.modal-footer {
  padding: 12px 22px 18px;
  margin-top: 6px;
}
.modal-status {
  min-height: 18px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.status-text { font-size: 12px; }
.status-text.success { color: #9ae6b4; }
.status-text.error   { color: #fca5a5; }
.status-text.muted   { color: #6b6f92; }
</style>
