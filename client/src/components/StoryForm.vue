<template>
  <div class="overlay" @click.self="onCloseRequest">
    <div class="form-panel">
      <div class="form-header">
        <h2 class="form-heading"><PenSquare :size="16" /> {{ mode === 'auto-match' ? '记录此刻心事' : '写我的故事' }}</h2>
        <button class="close-icon" @click="onCloseRequest"><X :size="15" /></button>
      </div>

      <div class="form-body">
        <template v-if="step === 1">
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
              :placeholder="mode === 'auto-match' ? '此刻你想起了什么？写下你的心事，我们会为它寻找夜空中最契合的星辰...' : '此刻你在这颗星下想起了什么？写下你的心事吧...'"
              maxlength="300"
              rows="6"
              ref="textareaRef"
            ></textarea>
            <div class="char-count" :class="{ warn: content.length >= 280 }">
              {{ content.length }} / 300
            </div>
          </div>

          <button class="submit-btn" :disabled="!title.trim() || !content.trim()" @click="step = 2">
            <span>下一页</span>
            <ChevronRight :size="14" />
          </button>
        </template>

        <template v-else>
          <button class="back-btn" @click="step = 1">
            <ArrowLeft :size="14" />
            <span>返回</span>
          </button>

          <!-- 预关联星星（bind-star 模式显示，auto-match 模式隐藏） -->
          <div v-if="mode === 'bind-star' && starName" class="field">
            <label class="field-label">
              <Star :size="13" class="inline-icon" />
              关联星辰
            </label>
            <div class="star-name-badge">{{ starName }}</div>
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

          <!-- 图片上传 -->
          <div class="field">
            <label class="field-label">图片 <span class="optional">- 可选</span></label>
            <div
              class="image-upload-zone"
              :class="{ 'has-image': imagePreview }"
              @click="triggerFileInput"
              @dragover.prevent
              @drop.prevent="onDrop"
            >
              <template v-if="!imagePreview">
                <ImageIcon :size="24" class="upload-icon" />
                <span class="upload-text">点击或拖拽上传图片</span>
                <span class="upload-hint">支持 JPG/PNG/WebP/GIF，最大 5MB</span>
              </template>
              <template v-else>
                <img :src="imagePreview" class="upload-preview" />
                <button class="upload-remove" @click.stop="removeImage">
                  <X :size="14" />
                </button>
              </template>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="file-input-hidden"
              @change="onFileChange"
            />
            <p v-if="uploadError" class="upload-error">{{ uploadError }}</p>
          </div>

          <!-- 匿名投递 -->
          <div class="field">
            <label class="field-checkbox">
              <input type="checkbox" v-model="isAnonymous" />
              <span>匿名投递（故事属于你，但不显示你的名字）</span>
            </label>
          </div>

          <p v-if="error" class="form-error">{{ error }}</p>

          <button
            class="submit-btn"
            :class="{ 'is-match-btn': mode === 'auto-match' }"
            :disabled="(submitting || matching) || !title.trim() || !content.trim()"
            @click="onPrimaryClick"
          >
            <template v-if="mode === 'auto-match'">
              <Sparkles :size="14" />
              <span>{{ matching ? '寻找归属星辰中...' : '寻找归属星辰' }}</span>
            </template>
            <template v-else>
              <Send :size="14" />
              <span>{{ submitting ? '化作星光中...' : '挂上星星' }}</span>
            </template>
          </button>
        </template>
      </div>

      <!-- ═══ auto-match 模式：匹配中遮罩 ═══ -->
      <Transition name="match-mask">
        <div v-if="mode === 'auto-match' && matching" class="match-mask">
          <div class="match-mask-inner">
            <div class="match-stars" aria-hidden="true">
              <span v-for="i in 5" :key="i" class="match-star-particle" :style="particleStyle(i)"></span>
            </div>
            <div class="match-step-row">
              <div class="match-step" :class="{ done: stepProgress >= 1, active: stepProgress === 1 }">
                <div class="step-dot">{{ stepProgress > 1 ? '✓' : 1 }}</div>
                <div class="step-label">提取故事内核</div>
              </div>
              <div class="match-step-line" :class="{ fill: stepProgress >= 2 }"></div>
              <div class="match-step" :class="{ done: stepProgress >= 2, active: stepProgress === 2 }">
                <div class="step-dot">{{ stepProgress > 2 ? '✓' : 2 }}</div>
                <div class="step-label">夜空寻星</div>
              </div>
              <div class="match-step-line" :class="{ fill: stepProgress >= 3 }"></div>
              <div class="match-step" :class="{ done: stepProgress >= 3, active: stepProgress === 3 }">
                <div class="step-dot">{{ stepProgress > 3 ? '✓' : 3 }}</div>
                <div class="step-label">判断缘分</div>
              </div>
            </div>
            <p class="match-tip">
              <template v-if="stepProgress === 1">📜 正在从你的文字里提取情绪与主题…</template>
              <template v-else-if="stepProgress === 2">🌌 正在浩瀚星空中扫描相似的故事…</template>
              <template v-else-if="stepProgress === 3">⭐ AI 正在判断每颗星与你的缘分…</template>
              <template v-else>✨ 请稍候…</template>
            </p>
            <div class="match-error" v-if="matchError">{{ matchError }}，请稍后再试</div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, defineExpose } from 'vue'
import { PenSquare, X, Send, Image as ImageIcon, ChevronRight, ArrowLeft, Sparkles, Star } from 'lucide-vue-next'
import { useLocation } from '../composables/useLocation'
import type { MatchCandidate } from '../composables/useStarMatching'

const props = withDefaults(defineProps<{
  starName: string
  catalogStarId: number
  catalogStarIds?: number[]
  /**
   * - bind-star: 绑定了具体星星（原行为）→ 点「挂上星星」直接提交
   * - auto-match: 未选星（新记录功能）→ 点「寻找归属星辰」调匹配 API，emit requestMatch 给父组件
   */
  mode?: 'bind-star' | 'auto-match'
  /** auto-match 模式下由父组件传入的匹配进度 1~3 */
  matchingStep?: 0 | 1 | 2 | 3
  /** auto-match 模式下是否正在匹配中 */
  matching?: boolean
  /** auto-match 模式下匹配错误信息 */
  matchError?: string
}>(), {
  mode: 'bind-star',
  matchingStep: 0,
  matching: false,
  matchError: '',
})

const emit = defineEmits<{
  close: []
  submitted: [story: { id: number; title: string | null; content: string; resonanceCount: number; catalogStarId: number; catalogStarIds?: number[]; createdAt: string; locationLat: number | null; locationLng: number | null; type: string; viewCount: number; origin: string | null; username: string | null; tag: string | null; userId: number | null; imageUrl: string | null }]
  /** auto-match 模式：用户点了寻找归属星辰，把当前表单数据抛给父调 API */
  requestMatch: [payload: {
    title: string
    content: string
    tag: string | null
    imageFile: File | null
    imageUrl: string | null
    isAnonymous: boolean
  }]
}>()

const title = ref('')
const content = ref('')
const step = ref<1 | 2>(1)
const submitting = ref(false)
const error = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
// 使用全局统一位置，不再独立请求浏览器
const loc = useLocation()
const userLocation = computed(() => {
  const la = loc.lat.value, ln = loc.lng.value
  return la != null && ln != null ? { lat: la, lng: ln } : null
})
const selectedTag = ref<string | null>(null)
const isAnonymous = ref(false)
const tagOptions = ['思念', '等待', '离别', '愿望', '孤独']
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const imageUrl = ref<string | null>(null)
const uploadError = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

// ── 匹配进度：取 props.matchingStep 供模板用
const stepProgress = computed(() => props.matchingStep || 0)

function particleStyle(i: number) {
  const size = 4 + (i % 3) * 2
  const left = 15 + i * 18 + Math.random() * 10
  const delay = (i - 1) * 0.4
  return {
    width: size + 'px',
    height: size + 'px',
    left: left + '%',
    animationDelay: delay + 's',
  }
}

function onCloseRequest() {
  // 匹配/提交进行中禁止点击遮罩关闭
  if (submitting.value || props.matching) return
  emit('close')
}

/** 主按钮点击：根据 mode 分流 */
function onPrimaryClick() {
  const trimmedTitle = title.value.trim()
  const trimmed = content.value.trim()
  if (!trimmedTitle || !trimmed || submitting.value || props.matching) return

  if (props.mode === 'auto-match') {
    // 抛给父组件去调匹配 API
    emit('requestMatch', {
      title: trimmedTitle,
      content: trimmed,
      tag: selectedTag.value,
      imageFile: imageFile.value,
      imageUrl: imageUrl.value,
      isAnonymous: isAnonymous.value,
    })
  } else {
    // bind-star 原有逻辑：直接提交
    doSubmit(props.catalogStarId, props.catalogStarIds ?? [props.catalogStarId])
  }
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) processFile(file)
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

function processFile(file: File) {
  uploadError.value = ''
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    uploadError.value = '仅支持 JPG/PNG/WebP/GIF 格式'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    uploadError.value = '图片大小不能超过 5MB'
    return
  }
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

function removeImage() {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imageFile.value = null
  imagePreview.value = null
  imageUrl.value = null
  uploadError.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

onBeforeUnmount(() => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
})

onMounted(() => {
  textareaRef.value?.focus()
})

// 打开表单时自动回 Step1（外部切换 mode 等场景）
watch(() => [props.mode, props.starName] as const, () => {
  step.value = 1
  if (!title.value && !content.value) {
    nextTick_mine(() => textareaRef.value?.focus())
  }
})

// 兼容：vue 3.2 没 nextTick 导入就自建一个
function nextTick_mine(fn: () => void) {
  Promise.resolve().then(() => fn())
}

/**
 * 真正提交入库。
 * - bind-star 模式：原 onSubmit 逻辑，内部直接调用。
 * - auto-match 模式：父组件（SkyPage）等用户选完候选星后，通过 ref 调用本方法，
 *   传入选定的 catalogStarId / [catalogStarId]，才真正走 POST /api/stories。
 */
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
    // 如果有图片但还没上传，先上传
    if (imageFile.value && !imageUrl.value) {
      const formData = new FormData()
      formData.append('image', imageFile.value)
      const token = localStorage.getItem('token')
      const uploadHeaders: Record<string, string> = {}
      if (token) uploadHeaders['Authorization'] = `Bearer ${token}`
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
      })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok) {
        const msg = uploadJson.message || '图片上传失败'
        error.value = msg
        submitting.value = false
        return { ok: false, errorMsg: msg }
      }
      imageUrl.value = uploadJson.data.imageUrl
    }

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
    if (imageUrl.value) body.imageUrl = imageUrl.value

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
        imageUrl: json.data.imageUrl ?? null,
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

/** 外部（父组件）清空表单 */
function resetForm() {
  title.value = ''
  content.value = ''
  step.value = 1
  selectedTag.value = null
  isAnonymous.value = false
  removeImage()
  error.value = ''
  submitting.value = false
}

defineExpose({
  doSubmit,
  resetForm,
})
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

/* ─── Back Button ─── */
.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--muted);
  font-family: var(--font);
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
  align-self: flex-start;
}
.back-btn:hover {
  color: var(--ink);
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

/* ─── Image Upload ─── */
.image-upload-zone {
  border: 2px dashed rgba(255,255,255,0.12);
  border-radius: var(--radius-md);
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  position: relative;
  min-height: 100px;
  justify-content: center;
}
.image-upload-zone:hover {
  border-color: rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.02);
}
.image-upload-zone.has-image {
  padding: 0;
  border-style: solid;
  border-color: rgba(255,255,255,0.08);
}
.upload-icon {
  color: var(--muted);
}
.upload-text {
  font-size: 0.82rem;
  color: var(--muted);
}
.upload-hint {
  font-size: 0.7rem;
  color: var(--muted-light);
}
.upload-preview {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: var(--radius-md);
}
.upload-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0,0,0,0.6);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.upload-remove:hover {
  background: rgba(255, 90, 90, 0.8);
}
.upload-error {
  margin: 4px 0 0;
  font-size: 0.78rem;
  color: var(--star-red);
}
.file-input-hidden {
  display: none;
}

/* ─── Inline Icon & Star Badge (bind-star 模式显示) ─── */
.inline-icon { vertical-align: -2px; margin-right: 4px; }
.star-name-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: linear-gradient(90deg, rgba(255, 217, 138, 0.08), rgba(255, 217, 138, 0.02));
  border: 1px solid rgba(255, 217, 138, 0.18);
  border-radius: 12px;
  color: #ffe5a8;
  font-size: 0.82rem;
  font-weight: 500;
  width: fit-content;
}
.submit-btn.is-match-btn {
  background: linear-gradient(90deg, #ffd98a, #f0b86a);
  box-shadow: 0 4px 16px rgba(255, 217, 138, 0.22);
}
.submit-btn.is-match-btn:hover:not(:disabled) {
  background: linear-gradient(90deg, #ffe5a8, #f5c47a);
}

/* ─── Matching Mask (遮罩) ─── */
.match-mask {
  position: absolute;
  inset: 0;
  background: rgba(10, 8, 22, 0.86);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  z-index: 5;
}
.match-mask-enter-active, .match-mask-leave-active {
  transition: opacity 0.25s ease;
}
.match-mask-enter-from, .match-mask-leave-to {
  opacity: 0;
}
.match-mask-inner {
  width: 88%;
  max-width: 420px;
  text-align: center;
}
.match-stars {
  position: relative;
  height: 70px;
  margin-bottom: 22px;
}
.match-star-particle {
  position: absolute;
  bottom: 0;
  border-radius: 50%;
  background: radial-gradient(circle, #fff5c0, #ffd98a 60%, transparent 80%);
  box-shadow: 0 0 12px rgba(255, 217, 138, 0.8);
  animation: floatStar 2.2s ease-in-out infinite;
}
@keyframes floatStar {
  0% { transform: translateY(0) scale(1); opacity: 0.3; }
  40% { transform: translateY(-26px) scale(1.2); opacity: 1; }
  80% { transform: translateY(-50px) scale(0.8); opacity: 0.4; }
  100% { transform: translateY(-60px) scale(0.3); opacity: 0; }
}
.match-step-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  margin-bottom: 18px;
}
.match-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 600;
  transition: all 0.3s ease;
}
.match-step.active .step-dot {
  border-color: #ffd98a;
  background: rgba(255, 217, 138, 0.12);
  color: #ffe5a8;
  box-shadow: 0 0 12px rgba(255, 217, 138, 0.35);
  animation: stepPulse 1.2s ease-in-out infinite;
}
.match-step.done .step-dot {
  border-color: rgba(149, 240, 192, 0.5);
  background: rgba(149, 240, 192, 0.1);
  color: #95f0c0;
}
@keyframes stepPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
.step-label {
  font-size: 0.72rem;
  color: rgba(255,255,255,0.45);
  white-space: nowrap;
  transition: color 0.3s;
}
.match-step.active .step-label { color: #ffe5a8; }
.match-step.done .step-label   { color: rgba(149, 240, 192, 0.85); }
.match-step-line {
  height: 1.5px;
  flex: 1;
  max-width: 42px;
  background: rgba(255,255,255,0.12);
  position: relative;
  overflow: hidden;
  margin: -18px 4px 0;
}
.match-step-line::after {
  content: '';
  position: absolute;
  inset: 0;
  width: 0%;
  background: linear-gradient(90deg, #ffd98a, rgba(149, 240, 192, 0.8));
  transition: width 0.35s ease;
}
.match-step-line.fill::after { width: 100%; }
.match-tip {
  font-size: 0.85rem;
  color: rgba(255,255,255,0.78);
  margin: 0;
  letter-spacing: 0.02em;
}
.match-error {
  margin-top: 12px;
  font-size: 0.8rem;
  color: #ff8b7d;
}
</style>
