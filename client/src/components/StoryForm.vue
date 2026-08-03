<template>
  <div class="sf-overlay" @click.self="onCloseRequest">
    <div class="sf-sheet" role="dialog" aria-modal="true" aria-labelledby="sf-title">
      <!-- ══════════════════════════════════════
           SHEET HEADER · 纯苹果 sheet 极简
           ══════════════════════════════════════ -->
      <header class="sf-header">
        <button class="sf-close" @click="onCloseRequest" aria-label="关闭">
          <X :size="12" />
        </button>
        <div class="sf-title-group">
          <h1 id="sf-title" class="sf-title">
            {{ mode === 'auto-match' ? '记录此刻心事' : '写我的故事' }}
          </h1>
          <p class="sf-subtitle">
            {{ mode === 'auto-match' ? 'AI 将为你寻找夜空中最契合的星辰' : (step === 1 ? '写下你的心事，挂上这颗星' : '补充一些细节吧') }}
          </p>
        </div>
      </header>

      <!-- ══════════════════════════════════════
           SHEET BODY · section 分组 + 极轻分隔
           ══════════════════════════════════════ -->
      <div class="sf-body">

        <!-- STEP 1 -->
        <template v-if="step === 1">
          <div class="sf-group">
            <!-- 标题 -->
            <div class="sf-field">
              <label class="sf-label">标题</label>
              <input
                v-model="title"
                class="sf-input sf-input-title"
                placeholder="给你的故事起个名字…"
                maxlength="60"
              />
            </div>

            <!-- 分隔：极淡 1px -->
            <div class="sf-sep"></div>

            <!-- 故事正文 -->
            <div class="sf-field">
              <div class="sf-label-row">
                <label class="sf-label">故事</label>
                <span class="sf-count" :class="{ warn: content.length >= 280 }">{{ content.length }}/300</span>
              </div>
              <textarea
                v-model="content"
                class="sf-input sf-textarea"
                :placeholder="mode === 'auto-match'
                  ? '此刻你想起了什么？写下你的心事…'
                  : '此刻你在这颗星下想起了什么？写下你的心事吧…'"
                maxlength="300"
                rows="6"
                ref="textareaRef"
              ></textarea>
            </div>
          </div>

          <button
            class="sf-primary"
            :disabled="!title.trim() || !content.trim()"
            @click="step = 2"
          >
            <span>继续</span>
            <ChevronRight :size="14" />
          </button>
        </template>

        <!-- STEP 2 -->
        <template v-else>
          <button class="sf-back" @click="step = 1">
            <ArrowLeft :size="12" />
            <span>返回修改</span>
          </button>

          <div class="sf-group">
            <!-- 预关联星 -->
            <template v-if="mode === 'bind-star' && starName">
              <div class="sf-field">
                <label class="sf-label">关联星辰</label>
                <div class="sf-star-pill">
                  <Star :size="11" />
                  <span>{{ starName }}</span>
                </div>
              </div>
              <div class="sf-sep"></div>
            </template>

            <!-- 情绪：iOS Segmented -->
            <div class="sf-field">
              <div class="sf-label-row">
                <label class="sf-label">情绪标签</label>
                <span class="sf-label-sub">可选</span>
              </div>
              <div class="sf-seg">
                <button
                  v-for="t in tagOptions"
                  :key="t"
                  class="sf-seg-btn"
                  :class="{ active: selectedTag === t }"
                  type="button"
                  @click="selectedTag = selectedTag === t ? null : t"
                >{{ t }}</button>
              </div>
            </div>

            <div class="sf-sep"></div>

            <!-- 匿名 -->
            <div class="sf-field">
              <label class="sf-check">
                <span class="sf-check-box" :class="{ on: isAnonymous }">
                  <Check :size="10" class="sf-check-mark" />
                </span>
                <span class="sf-check-text">
                  匿名投递
                  <span class="sf-check-sub">故事属于你，但不显示你的名字</span>
                </span>
              </label>
            </div>
          </div>

          <p v-if="error" class="sf-error">
            <AlertCircle :size="12" />
            {{ error }}
          </p>

          <button
            class="sf-primary"
            :class="{ match: mode === 'auto-match' }"
            :disabled="(submitting || matching) || !title.trim() || !content.trim()"
            @click="onPrimaryClick"
            type="button"
          >
            <template v-if="mode === 'auto-match'">
              <Sparkles :size="13" />
              <span>{{ matching ? '寻找归属星辰中…' : '寻找归属星辰' }}</span>
            </template>
            <template v-else>
              <Send :size="13" />
              <span>{{ submitting ? '化作星光中…' : '挂上星星' }}</span>
            </template>
          </button>
        </template>
      </div>

      <!-- 匹配遮罩：苹果 Progress Ring -->
      <Transition name="sf-fade">
        <div v-if="mode === 'auto-match' && matching" class="sf-mask">
          <div class="sf-match">
            <div class="sf-ring">
              <svg viewBox="0 0 64 64" class="sf-ring-svg">
                <circle cx="32" cy="32" r="27" class="sf-ring-track" />
                <circle cx="32" cy="32" r="27" class="sf-ring-fill" />
              </svg>
              <Sparkles :size="16" class="sf-ring-icon" />
            </div>
            <div class="sf-match-title">{{ matchStepLabel(stepProgress) }}</div>
            <div class="sf-match-desc">
              <template v-if="stepProgress <= 1">正在从你的文字里提取情绪与主题…</template>
              <template v-else-if="stepProgress === 2">正在浩瀚星海中扫描相似的故事…</template>
              <template v-else-if="stepProgress >= 3">AI 正在判断每颗星与你的缘分…</template>
              <template v-else>请稍候…</template>
            </div>
            <div v-if="matchError" class="sf-match-error">{{ matchError }}，请稍后再试</div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, defineExpose, nextTick } from 'vue'
import { X, Send, Check, ChevronRight, ArrowLeft, Sparkles, Star, AlertCircle } from 'lucide-vue-next'
import { useLocation } from '../composables/useLocation'

const props = withDefaults(defineProps<{
  starName: string
  catalogStarId: number
  catalogStarIds?: number[]
  mode?: 'bind-star' | 'auto-match'
  matchingStep?: 0 | 1 | 2 | 3
  matching?: boolean
  matchError?: string
}>(), {
  mode: 'bind-star',
  matchingStep: 0,
  matching: false,
  matchError: '',
})

const emit = defineEmits<{
  close: []
  submitted: [story: {
    id: number; title: string | null; content: string; resonanceCount: number
    catalogStarId: number; catalogStarIds?: number[]; createdAt: string
    locationLat: number | null; locationLng: number | null; type: string
    viewCount: number; origin: string | null; username: string | null
    tag: string | null; userId: number | null; imageUrl: string | null
  }]
  requestMatch: [payload: {
    title: string; content: string; tag: string | null
    isAnonymous: boolean
  }]
}>()

const title = ref('')
const content = ref('')
const step = ref<1 | 2>(1)
const submitting = ref(false)
const error = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const loc = useLocation()
const userLocation = computed(() => {
  const la = loc.lat.value, ln = loc.lng.value
  return la != null && ln != null ? { lat: la, lng: ln } : null
})
const selectedTag = ref<string | null>(null)
const isAnonymous = ref(false)
const tagOptions = ['思念', '等待', '离别', '愿望', '孤独']

const stepProgress = computed(() => props.matchingStep || 0)

function matchStepLabel(p: number): string {
  if (p <= 1) return '提取故事内核'
  if (p === 2) return '扫描夜空星辰'
  if (p >= 3) return '判断契合缘分'
  return 'AI 正在分析…'
}

function onCloseRequest() {
  if (submitting.value || props.matching) return
  emit('close')
}

function onPrimaryClick() {
  const trimmedTitle = title.value.trim()
  const trimmed = content.value.trim()
  if (!trimmedTitle || !trimmed || submitting.value || props.matching) return

  if (props.mode === 'auto-match') {
    emit('requestMatch', {
      title: trimmedTitle,
      content: trimmed,
      tag: selectedTag.value,
      isAnonymous: isAnonymous.value,
    })
  } else {
    doSubmit(props.catalogStarId, props.catalogStarIds ?? [props.catalogStarId])
  }
}

onMounted(() => {
  textareaRef.value?.focus()
})

watch(() => [props.mode, props.starName] as const, () => {
  step.value = 1
  if (!title.value && !content.value) {
    nextTick(() => textareaRef.value?.focus())
  }
})

async function doSubmit(
  targetCatalogStarId: number,
  targetCatalogStarIds?: number[],
): Promise<{ ok: boolean; story?: any; errorMsg?: string }> {
  const trimmedTitle = title.value.trim()
  const trimmed = content.value.trim()
  if (!trimmedTitle || !trimmed || submitting.value) {
    return { ok: false, errorMsg: '请填写标题和故事内容' }
  }
  submitting.value = true
  error.value = ''
  try {
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const body: Record<string, unknown> = {
      catalogStarId: targetCatalogStarId,
      catalogStarIds: targetCatalogStarIds ?? [targetCatalogStarId],
      title: trimmedTitle,
      content: trimmed,
      location: userLocation.value,
      tag: selectedTag.value,
      isAnonymous: isAnonymous.value,
    }
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (res.ok) {
      const submittedStory = {
        id: json.data.id,
        title: json.data.title,
        content: json.data.content,
        resonanceCount: json.data.resonanceCount,
        catalogStarId: json.data.catalogStarId,
        catalogStarIds: json.data.catalogStarIds ?? (targetCatalogStarIds ?? [targetCatalogStarId]).filter((id: number) => id != null),
        createdAt: json.data.createdAt || '',
        locationLat: json.data.locationLat ?? null,
        locationLng: json.data.locationLng ?? null,
        type: 'user',
        viewCount: 0,
        origin: null,
        username: json.data.username ?? null,
        tag: json.data.tag ?? selectedTag.value,
        userId: json.data.userId ?? null,
        imageUrl: null,
      }
      emit('submitted', submittedStory)
      submitting.value = false
      return { ok: true, story: submittedStory }
    } else {
      const msg = json.message || '提交失败，再试一次吧'
      error.value = msg
      submitting.value = false
      return { ok: false, errorMsg: msg }
    }
  } catch (e) {
    const msg = '网络开小差了，稍后再试'
    error.value = msg
    submitting.value = false
    return { ok: false, errorMsg: msg }
  }
}

function resetForm() {
  title.value = ''
  content.value = ''
  step.value = 1
  selectedTag.value = null
  isAnonymous.value = false
  error.value = ''
  submitting.value = false
}

defineExpose({ doSubmit, resetForm })
</script>

<style scoped>
/* ═══════════════════════════════════════════════
   StoryForm · 纯苹果 macOS sheet
   零多余装饰 · 极致留白 · 严格层级
   ═══════════════════════════════════════════════ */

/* ── Overlay ── */
.sf-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 5, 16, 0.58);
  backdrop-filter: blur(9px) saturate(160%);
  -webkit-backdrop-filter: blur(9px) saturate(160%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: sf-fadein .2s ease-out;
  padding: 20px;
}
@keyframes sf-fadein { from { opacity: 0 } to { opacity: 1 } }

/* ── Sheet：苹果毛玻璃，22px 圆角，极细 0.5px 边 ── */
.sf-sheet {
  position: relative;
  width: 500px;
  max-width: 100%;
  max-height: calc(100vh - 40px);
  background: rgba(28, 29, 44, 0.82);
  backdrop-filter: blur(38px) saturate(200%);
  -webkit-backdrop-filter: blur(38px) saturate(200%);
  border: 0.5px solid rgba(255, 255, 255, 0.11);
  border-radius: 22px;
  box-shadow:
    0 32px 88px rgba(0, 0, 0, 0.58),
    0 0 0 0.5px rgba(255,255,255,0.03) inset;
  animation: sf-sheetin .3s cubic-bezier(.22, 1, .36, 1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
@keyframes sf-sheetin {
  from { opacity: 0; transform: translateY(14px) scale(0.986) }
  to   { opacity: 1; transform: translateY(0) scale(1) }
}

/* ═══════ HEADER：纯居中，无分隔线 ═══════ */
.sf-header {
  position: relative;
  padding: 22px 36px 10px;
  text-align: center;
  flex-shrink: 0;
}
.sf-close {
  position: absolute;
  top: 16px;
  left: 18px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.055);
  border: none;
  color: rgba(255, 255, 255, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all .15s ease;
  padding: 0;
}
.sf-close:hover {
  background: rgba(255, 85, 85, 0.18);
  color: #ffd5cf;
  transform: translateY(-0.5px);
}
.sf-title-group {
  padding: 4px 0 0;
}
/* 大标题：21px / 700 */
.sf-title {
  margin: 0 0 5px;
  font-size: 21px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.005em;
}
/* 副标题：11.5px / 400 / 45% 白 */
.sf-subtitle {
  margin: 0;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.015em;
}

/* ═══════ BODY · group 包裹字段组 ═══════ */
.sf-body {
  padding: 12px 36px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,217,138,0.12) transparent;
  flex: 1;
  min-height: 0;
}
.sf-body::-webkit-scrollbar { width: 4px }
.sf-body::-webkit-scrollbar-thumb {
  background: rgba(255, 217, 138, 0.12);
  border-radius: 10px;
}

/* 字段组卡片：纯苹果 inset grouped table 风 */
.sf-group {
  background: rgba(255, 255, 255, 0.032);
  border: 0.5px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  overflow: hidden;
}
.sf-field {
  padding: 13px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
/* 极细分隔：field 之间，仅 0.5px，左右 16px 缩进 */
.sf-sep {
  height: 0.5px;
  background: rgba(255, 255, 255, 0.055);
  margin-left: 16px;
}

/* 字段标签：10.5px / uppercase / 40% 白 —— 绝对层级差 */
.sf-label {
  font-size: 10.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.40);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  line-height: 1;
}
.sf-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sf-label-sub {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.26);
  letter-spacing: 0;
  text-transform: none;
  font-weight: 400;
}
.sf-count {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.26);
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
}
.sf-count.warn { color: rgba(232, 168, 76, 0.82) }

/* 输入：无边框纯透明底，14.5px，无聚焦光晕 */
.sf-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.94);
  font-family: inherit;
  font-size: 14.5px;
  line-height: 1.55;
  outline: none;
}
.sf-input::placeholder {
  color: rgba(255, 255, 255, 0.22);
}
.sf-input-title {
  font-weight: 600;
  font-size: 15.5px;
  letter-spacing: 0.005em;
}
.sf-textarea {
  resize: vertical;
  min-height: 138px;
  line-height: 1.7;
  letter-spacing: 0.004em;
}

/* 星名徽章：小胶囊 */
.sf-star-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: rgba(202, 167, 255, 0.085);
  border-radius: 100px;
  width: fit-content;
  font-size: 12.5px;
  font-weight: 600;
  color: #e5d6ff;
  letter-spacing: 0.01em;
}

/* iOS Segmented Control */
.sf-seg {
  padding: 2.5px;
  background: rgba(255, 255, 255, 0.03);
  border: 0.5px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  display: flex;
  gap: 0;
}
.sf-seg-btn {
  flex: 1;
  padding: 7px 2px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.5);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all .18s cubic-bezier(.22, 1, .36, 1);
  letter-spacing: 0.005em;
}
.sf-seg-btn:hover { color: rgba(255, 255, 255, 0.8) }
.sf-seg-btn.active {
  background: rgba(255, 255, 255, 0.09);
  color: #ffe5a8;
  font-weight: 600;
  box-shadow:
    0 0.5px 1.5px rgba(0, 0, 0, 0.28),
    0 0 0 0.5px rgba(255, 217, 138, 0.30);
}

/* Checkbox：极简方角 */
.sf-check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}
.sf-check-box {
  width: 17px;
  height: 17px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.045);
  border: 0.5px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .18s ease;
  flex-shrink: 0;
  margin-top: 1px;
}
.sf-check-box.on {
  background: linear-gradient(180deg, #ffd98a, #e9c378);
  border-color: transparent;
  box-shadow: 0 0.5px 2px rgba(255, 217, 138, 0.22);
}
.sf-check-mark { color: transparent; stroke-width: 4; transition: color .18s ease }
.sf-check-box.on .sf-check-mark { color: #2a1f0c }
.sf-check-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.86);
  line-height: 1.45;
  letter-spacing: 0.004em;
}
.sf-check-sub {
  display: block;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.36);
  margin-top: 1px;
  letter-spacing: 0;
  font-weight: 400;
}

/* 返回按钮 */
.sf-back {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  padding: 1px 3px;
  color: rgba(255, 217, 138, 0.78);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  align-self: flex-start;
  transition: all .15s ease;
}
.sf-back:hover {
  color: #ffe5a8;
  transform: translateX(-1px);
}

/* 错误提示：极简 */
.sf-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 9px 14px;
  font-size: 12px;
  line-height: 1.5;
  color: #ff9e90;
  background: rgba(255, 139, 125, 0.07);
  border: 0.5px solid rgba(255, 139, 125, 0.20);
  border-radius: 10px;
}

/* Primary 按钮：纯苹果风格 */
.sf-primary {
  width: 100%;
  padding: 13.5px 0;
  border-radius: 13px;
  border: 0.5px solid rgba(255, 217, 138, 0.26);
  background: rgba(255, 217, 138, 0.12);
  color: #ffe5a8;
  font-family: inherit;
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: 0.008em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all .18s ease, transform .1s ease;
}
.sf-primary:hover:not(:disabled) {
  background: rgba(255, 217, 138, 0.20);
  border-color: rgba(255, 217, 138, 0.44);
  transform: translateY(-0.5px);
}
.sf-primary:active:not(:disabled) {
  transform: translateY(0) scale(0.996);
  filter: brightness(0.96);
}
.sf-primary:disabled {
  opacity: 0.30;
  cursor: not-allowed;
}
.sf-primary.match {
  background: rgba(255, 217, 138, 0.18);
  color: #fff3cd;
}

/* ══════════ 匹配遮罩 ══════════ */
.sf-fade-enter-active, .sf-fade-leave-active { transition: opacity .26s ease }
.sf-fade-enter-from, .sf-fade-leave-to { opacity: 0 }

.sf-mask {
  position: absolute;
  inset: 0;
  background: rgba(8, 7, 18, 0.70);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  padding: 24px;
}
.sf-match {
  width: 100%;
  max-width: 340px;
  padding: 26px 24px 24px;
  background: rgba(30, 31, 48, 0.90);
  backdrop-filter: blur(26px);
  -webkit-backdrop-filter: blur(26px);
  border: 0.5px solid rgba(255, 255, 255, 0.09);
  border-radius: 18px;
  text-align: center;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.5);
  animation: sf-matchin .32s cubic-bezier(.22, 1, .36, 1);
}
@keyframes sf-matchin {
  from { opacity: 0; transform: translateY(5px) scale(0.982) }
  to   { opacity: 1; transform: translateY(0) scale(1) }
}

/* Progress Ring */
.sf-ring {
  position: relative;
  width: 58px;
  height: 58px;
  margin: 2px auto 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sf-ring-svg { width: 100%; height: 100%; transform: rotate(-90deg) }
.sf-ring-track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.07);
  stroke-width: 2.8;
}
.sf-ring-fill {
  fill: none;
  stroke: #ffd98a;
  stroke-width: 2.8;
  stroke-linecap: round;
  stroke-dasharray: 170;
  stroke-dashoffset: 30;
  animation: sf-ring-rotate 2.4s cubic-bezier(.55, 0, .45, 1) infinite;
  filter: drop-shadow(0 0 6px rgba(255, 217, 138, 0.40));
  transform-origin: 50% 50%;
}
@keyframes sf-ring-rotate {
  0%   { stroke-dashoffset: 170; transform: rotate(0deg) }
  45%  { stroke-dashoffset: 30;  transform: rotate(180deg) }
  100% { stroke-dashoffset: 170; transform: rotate(540deg) }
}
.sf-ring-icon {
  position: absolute;
  color: #ffe5a8;
  animation: sf-spark-pulse 1.2s ease-in-out infinite;
}
@keyframes sf-spark-pulse {
  0%, 100% { opacity: 0.68; transform: scale(1) }
  50%      { opacity: 1;    transform: scale(1.1) }
}
.sf-match-title {
  font-size: 15.5px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 6px;
  letter-spacing: 0.008em;
}
.sf-match-desc {
  font-size: 12px;
  line-height: 1.72;
  color: rgba(255, 255, 255, 0.52);
  margin: 0;
  padding: 0 8px;
}
.sf-match-error {
  margin-top: 12px;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.5;
  color: #ff9e90;
  background: rgba(255, 139, 125, 0.07);
  border: 0.5px solid rgba(255, 139, 125, 0.20);
  border-radius: 9px;
}

/* 移动端 */
@media (max-width: 640px) {
  .sf-overlay { padding: 0; align-items: flex-end }
  .sf-sheet {
    max-height: 92vh;
    width: 100%;
    border-radius: 22px 22px 0 0;
    border-bottom: none;
    animation: sf-sheetin-mobile .35s cubic-bezier(.22, 1, .36, 1);
  }
  @keyframes sf-sheetin-mobile {
    from { opacity: 0; transform: translateY(28%) }
    to   { opacity: 1; transform: translateY(0) }
  }
  .sf-header { padding: 18px 24px 8px }
  .sf-title { font-size: 19px }
  .sf-close { left: 14px; top: 14px }
  .sf-body { padding: 10px 24px 26px; gap: 16px }
  .sf-seg-btn { font-size: 12px; padding: 7px 2px }
  .sf-primary { padding: 13px 0; font-size: 14px }
  .sf-match { padding: 22px 20px 22px }
}
</style>
