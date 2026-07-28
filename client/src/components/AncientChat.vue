<template>
  <Teleport to="body">
    <Transition name="drawer-slide">
      <div v-if="visible" class="chat-drawer-overlay" @click.self="$emit('close')">
        <div class="chat-drawer">
          <!-- 移动端拖拽手柄 -->
          <div class="mobile-drag-handle" @click="$emit('close')"></div>
          <!-- 头部 -->
          <div class="chat-drawer-header">
            <span class="chat-drawer-title">与古人共赏</span>
            <button class="chat-drawer-close" @click="$emit('close')">
              <X :size="15" />
            </button>
          </div>

          <!-- 角色选择 -->
          <div v-if="stage === 'figureSelect'" class="chat-figure-select">
            <p class="chat-select-hint">
              <template v-if="figures.length > 0">
                选择一位古人，共赴星河旧梦
              </template>
              <template v-else>
                此星尚无古人留墨，静待来者与之对望
              </template>
            </p>
            <div class="chat-figure-grid">
              <button
                v-for="f in figures"
                :key="f.id"
                class="chat-figure-card"
                :class="{ selected: selectedFigureId === f.id }"
                @click="selectFigure(f)"
              >
                <span class="chat-figure-avatar">{{ f.avatar }}</span>
                <div class="chat-figure-info">
                  <span class="chat-figure-name">{{ f.name }}</span>
                  <span class="chat-figure-dynasty">{{ f.dynasty }} · {{ f.style }}</span>
                </div>
                <span class="chat-figure-intro">{{ f.intro }}</span>
              </button>
            </div>
          </div>

          <!-- 聊天中 -->
          <div v-else-if="stage === 'chatting'" class="chat-chatting">
            <!-- 角色信息条 -->
            <div class="chat-role-bar">
              <span class="chat-role-avatar">{{ selectedFigure?.avatar }}</span>
              <span class="chat-role-name">{{ selectedFigure?.name }}</span>
              <span class="chat-role-dynasty">{{ selectedFigure?.dynasty }}</span>
              <span class="chat-role-star">· {{ starName }}</span>
            </div>

            <!-- 消息列表 -->
            <div class="chat-messages" ref="messagesRef">
              <div
                v-for="(msg, i) in messages"
                :key="i"
                class="chat-message"
                :class="msg.role"
              >
                <div class="chat-bubble">
                  <template v-if="msg.role === 'assistant'">
                    <span class="chat-bubble-avatar">{{ selectedFigure?.avatar }}</span>
                    <span class="chat-bubble-text chat-bubble-markdown" v-html="renderMarkdown(msg.content)"></span>
                  </template>
                  <template v-else>
                    <span class="chat-bubble-text">{{ msg.content }}</span>
                  </template>
                </div>
              </div>

              <!-- 流式输出中 -->
              <div v-if="streaming" class="chat-message assistant">
                <div class="chat-bubble">
                  <span class="chat-bubble-avatar">{{ selectedFigure?.avatar }}</span>
                  <span class="chat-bubble-text chat-bubble-markdown" v-html="renderMarkdown(streamingContent)"></span>
                  <span class="chat-cursor">|</span>
                </div>
              </div>
            </div>

            <!-- 输入区 -->
            <div class="chat-input-area">
              <input
                v-model="inputText"
                class="chat-input"
                placeholder="说点什么..."
                :disabled="streaming"
                maxlength="500"
                @keydown.enter="sendMessage"
              />
              <button
                class="chat-send-btn"
                :disabled="!inputText.trim() || streaming"
                @click="sendMessage"
              >
                <Send :size="14" />
              </button>
            </div>
          </div>

          <!-- 加载中 -->
          <div v-else-if="stage === 'loading'" class="chat-loading">
            <div class="chat-loading-dot"></div>
            <span>正在连接星穹...</span>
          </div>

          <!-- 错误 -->
          <div v-else-if="stage === 'error'" class="chat-error">
            <span class="chat-error-text">{{ errorMessage }}</span>
            <button class="chat-retry-btn" @click="reset()">重试</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { X, Send } from 'lucide-vue-next'
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

interface Figure {
  id: string
  name: string
  dynasty: string
  style: string
  avatar: string
  intro: string
  tags: string[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const props = defineProps<{
  visible: boolean
  catalogStarId: number
  starName: string
  constellation: string
}>()

const emit = defineEmits<{
  close: []
}>()

type Stage = 'figureSelect' | 'loading' | 'chatting' | 'error'
const stage = ref<Stage>('figureSelect')
const figures = ref<Figure[]>([])
const selectedFigureId = ref<string | null>(null)
const selectedFigure = computed(() => figures.value.find(f => f.id === selectedFigureId.value) || null)
const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const streaming = ref(false)
const streamingContent = ref('')
const errorMessage = ref('')
const messagesRef = ref<HTMLElement | null>(null)

// 监听 visible 变化，打开时加载古人列表
watch(() => props.visible, async (v) => {
  if (v) {
    reset()
    await fetchFigures()
  }
})

async function fetchFigures() {
  stage.value = 'loading'
  try {
    const res = await fetch(`/api/catalog/stars/${props.catalogStarId}/chat/figures`)
    const json = await res.json()
    if (res.ok) {
      figures.value = json.data.figures || []
      stage.value = 'figureSelect'
    } else {
      errorMessage.value = json.message || '获取古人列表失败'
      stage.value = 'error'
    }
  } catch {
    errorMessage.value = '网络连接失败'
    stage.value = 'error'
  }
}

async function selectFigure(f: Figure) {
  selectedFigureId.value = f.id
  stage.value = 'chatting'

  // 获取诗人主动开场白
  await fetchOpening(f.id)
}

async function fetchOpening(figureId: string) {
  streaming.value = true
  streamingContent.value = ''

  try {
    const res = await fetch(`/api/catalog/stars/${props.catalogStarId}/chat/opening`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ figureId }),
    })

    const json = await res.json()
    if (res.ok && json.data?.opening) {
      // 逐字显示开场白
      const opening = json.data.opening
      for (let i = 0; i < opening.length; i++) {
        streamingContent.value = opening.slice(0, i + 1)
        await nextTick()
        scrollToBottom()
        await new Promise(r => setTimeout(r, 20))
      }

      // 开场白完成，加入消息列表
      messages.value.push({ role: 'assistant', content: opening })
    } else {
      // 没有开场白，静默
      messages.value.push({
        role: 'assistant',
        content: `（${selectedFigure.value?.name || '古人'}望向星空，与你一同仰望）`,
      })
    }
  } catch {
    messages.value.push({
      role: 'assistant',
      content: `（${selectedFigure.value?.name || '古人'}望向星空，与你一同仰望）`,
    })
  } finally {
    streaming.value = false
    streamingContent.value = ''
    await nextTick()
    scrollToBottom()
  }
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || streaming.value || !selectedFigureId.value) return

  // 添加用户消息
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  streaming.value = true
  streamingContent.value = ''
  await nextTick()
  scrollToBottom()

  // 构建 history（不含当前用户消息，因为已包含在 messages 中）
  const history = messages.value.slice(0, -1).map(m => ({
    role: m.role,
    content: m.content,
  }))

  try {
    const res = await fetch(`/api/catalog/stars/${props.catalogStarId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        figureId: selectedFigureId.value,
        message: text,
        history,
      }),
    })

    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.message || '请求失败')
    }

    // 读取 SSE 流
    const reader = res.body?.getReader()
    if (!reader) throw new Error('无法读取响应流')

    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'chunk') {
            fullContent += parsed.content
            streamingContent.value = fullContent
            await nextTick()
            scrollToBottom()
          } else if (parsed.type === 'done') {
            // 完成
          } else if (parsed.type === 'error') {
            throw new Error(parsed.message || 'AI 响应失败')
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue
          throw e
        }
      }
    }

    // 流结束，添加 AI 消息
    messages.value.push({ role: 'assistant', content: fullContent })
  } catch (e: any) {
    messages.value.push({
      role: 'assistant',
      content: e.message || '连接中断，请重试',
    })
  } finally {
    streaming.value = false
    streamingContent.value = ''
    await nextTick()
    scrollToBottom()
  }
}

function scrollToBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

function reset() {
  stage.value = 'figureSelect'
  figures.value = []
  selectedFigureId.value = null
  messages.value = []
  inputText.value = ''
  streaming.value = false
  streamingContent.value = ''
  errorMessage.value = ''
}

function renderMarkdown(text: string): string {
  if (!text) return ''
  return marked.parse(text) as string
}
</script>

<style scoped>
/* ─── Overlay ─── */
.chat-drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 8, 22, 0.35);
  backdrop-filter: blur(2px);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

/* ─── Drawer ─── */
.chat-drawer {
  width: 380px;
  height: 100vh;
  background: var(--surface);
  border-left: 1px solid var(--rule);
  box-shadow: -4px 0 30px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Header ─── */
.chat-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--rule);
  flex-shrink: 0;
}
.chat-drawer-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.02em;
}
.chat-drawer-close {
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
.chat-drawer-close:hover {
  color: var(--ink);
  border-color: var(--rule-hover);
}

/* ─── Figure Select ─── */
.chat-figure-select {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
.chat-select-hint {
  font-size: 0.82rem;
  color: var(--muted);
  margin: 0 0 16px;
  text-align: center;
}
.chat-figure-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.chat-figure-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  text-align: left;
  font-family: var(--font);
}
.chat-figure-card:hover {
  border-color: var(--accent-border);
  background: rgba(255, 255, 255, 0.02);
}
.chat-figure-card.selected {
  border-color: var(--accent);
  background: var(--accent-subtle);
}
.chat-figure-avatar {
  font-size: 1.6rem;
  flex-shrink: 0;
  width: 40px;
  text-align: center;
}
.chat-figure-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.chat-figure-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink);
}
.chat-figure-dynasty {
  font-size: 0.72rem;
  color: var(--muted);
}
.chat-figure-intro {
  font-size: 0.72rem;
  color: var(--muted-light);
  flex-shrink: 0;
  max-width: 120px;
  text-align: right;
  line-height: 1.4;
}

/* ─── Chatting ─── */
.chat-chatting {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Role Bar ─── */
.chat-role-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--rule);
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.015);
}
.chat-role-avatar {
  font-size: 1.2rem;
}
.chat-role-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink);
}
.chat-role-dynasty {
  font-size: 0.72rem;
  color: var(--muted);
}
.chat-role-star {
  font-size: 0.72rem;
  color: var(--accent);
  margin-left: auto;
}

/* ─── Messages ─── */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.chat-messages::-webkit-scrollbar { width: 5px; }
.chat-messages::-webkit-scrollbar-track { background: transparent; }
.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.chat-message {
  display: flex;
}
.chat-message.user {
  justify-content: flex-end;
}
.chat-message.assistant {
  justify-content: flex-start;
}
.chat-bubble {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 85%;
}
.chat-message.user .chat-bubble {
  flex-direction: row-reverse;
}
.chat-bubble-avatar {
  font-size: 1.1rem;
  flex-shrink: 0;
  margin-top: 2px;
}
.chat-bubble-text {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.82rem;
  line-height: 1.6;
  word-break: break-word;
}
.chat-message.user .chat-bubble-text {
  background: var(--accent);
  color: rgba(0, 0, 0, 0.75);
  border-bottom-right-radius: 4px;
}
.chat-message.assistant .chat-bubble-text {
  background: rgba(255, 255, 255, 0.05);
  color: var(--ink-secondary);
  border: 1px solid var(--rule);
  border-bottom-left-radius: 4px;
}

/* ─── Markdown 渲染样式 ─── */
.chat-bubble-markdown :deep(p) {
  margin: 0 0 8px;
  line-height: 1.7;
}
.chat-bubble-markdown :deep(p:last-child) {
  margin-bottom: 0;
}
.chat-bubble-markdown :deep(em) {
  color: var(--muted-light);
  font-style: italic;
}
.chat-bubble-markdown :deep(strong) {
  color: var(--ink);
  font-weight: 600;
}
.chat-bubble-markdown :deep(blockquote) {
  margin: 8px 0;
  padding: 6px 12px;
  border-left: 2px solid var(--accent);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 0 4px 4px 0;
  font-style: italic;
  color: var(--accent);
}
.chat-bubble-markdown :deep(blockquote p) {
  margin: 0;
}
.chat-bubble-markdown :deep(br) {
  display: block;
  content: '';
  margin-bottom: 6px;
}

.chat-cursor {
  color: var(--accent);
  font-weight: 300;
  animation: blink 0.8s ease-in-out infinite;
  margin-left: 2px;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ─── Input Area ─── */
.chat-input-area {
  display: flex;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--rule);
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.1);
}
.chat-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.82rem;
  outline: none;
  transition: border-color 0.15s;
}
.chat-input::placeholder { color: var(--muted-light); opacity: 0.5; }
.chat-input:focus { border-color: var(--accent-border); }
.chat-input:disabled { opacity: 0.5; }
.chat-send-btn {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--accent);
  border: none;
  color: rgba(0, 0, 0, 0.75);
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  flex-shrink: 0;
}
.chat-send-btn:hover:not(:disabled) { background: var(--accent-hover); }
.chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ─── Loading ─── */
.chat-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--muted);
  font-size: 0.82rem;
}
.chat-loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* ─── Error ─── */
.chat-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
}
.chat-error-text {
  font-size: 0.82rem;
  color: var(--star-red);
  text-align: center;
}
.chat-retry-btn {
  padding: 8px 20px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--accent-border);
  background: transparent;
  color: var(--accent);
  font-family: var(--font);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.15s;
}
.chat-retry-btn:hover { background: var(--accent-subtle); }

/* ─── Slide Transition ─── */
.drawer-slide-enter-active { transition: all 0.25s ease-out; }
.drawer-slide-leave-active { transition: all 0.2s ease-in; }
.drawer-slide-enter-from .chat-drawer { transform: translateX(100%); }
.drawer-slide-enter-from { opacity: 0; }
.drawer-slide-leave-to .chat-drawer { transform: translateX(100%); }
.drawer-slide-leave-to { opacity: 0; }

/* ─── Mobile drag handle ─── */
.mobile-drag-handle {
  display: none;
}

/* ─── Mobile Responsive (<=768px) ─── */
@media (max-width: 768px) {
  .mobile-drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 0 4px;
    flex-shrink: 0;
    cursor: pointer;
  }

  .mobile-drag-handle::after {
    content: '';
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 217, 138, 0.3);
    transition: background 0.2s;
  }

  .mobile-drag-handle:active::after {
    background: var(--accent);
  }

  .chat-drawer-overlay {
    justify-content: center;
    align-items: flex-end;
    background: rgba(7, 8, 22, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .chat-drawer {
    width: 100%;
    height: 88vh;
    border-left: none;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.4);
    animation: slideUpChat 0.28s ease-out;
  }

  @keyframes slideUpChat {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  .drawer-slide-enter-from .chat-drawer { transform: translateY(100%); }
  .drawer-slide-leave-to .chat-drawer { transform: translateY(100%); }

  .chat-drawer-header {
    padding: 16px 18px;
  }

  .chat-drawer-title {
    font-size: 0.95rem;
  }

  .chat-drawer-close {
    width: 32px;
    height: 32px;
  }

  .chat-figure-select {
    padding: 16px;
  }

  .chat-select-hint {
    font-size: 0.82rem;
    margin-bottom: 14px;
  }

  .chat-figure-card {
    padding: 12px;
    gap: 10px;
  }

  .chat-figure-avatar {
    font-size: 1.5rem;
    width: 36px;
  }

  .chat-figure-name {
    font-size: 0.85rem;
  }

  .chat-figure-intro {
    max-width: 90px;
    font-size: 0.7rem;
  }

  .chat-role-bar {
    padding: 10px 16px;
    gap: 6px;
  }

  .chat-messages {
    padding: 14px 16px;
    gap: 10px;
  }

  .chat-bubble {
    max-width: 90%;
    gap: 6px;
  }

  .chat-bubble-text {
    padding: 9px 12px;
    font-size: 0.82rem;
    line-height: 1.65;
  }

  .chat-input-area {
    padding: 12px 14px;
    gap: 8px;
  }

  .chat-input {
    padding: 10px 14px;
    font-size: 0.84rem;
  }

  .chat-send-btn {
    width: 40px;
    height: 40px;
  }
}

/* ─── Very small screens (<=380px) ─── */
@media (max-width: 380px) {
  .chat-drawer {
    height: 92vh;
  }
  .chat-figure-intro {
    display: none;
  }
}
</style>