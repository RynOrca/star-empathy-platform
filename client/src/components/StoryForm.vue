<template>
  <div class="overlay" @click.self="onCloseRequest">
    <div class="form-panel">
      <!-- ═══ Header：panel-wrapper 风格 ═══ -->
      <div class="form-header panel-wrapper pw-head">
        <div class="panel-head">
          <component :is="mode === 'auto-match' ? Sparkles : PenSquare" :size="10" class="pw-icon pw-gold" />
          <span class="pw-title">{{ mode === 'auto-match' ? '记录此刻心事' : '写我的故事' }}</span>
          <span class="pw-count">{{ mode === 'auto-match' ? 'AI 将为你寻找最契合的星辰' : step === 1 ? '第 1 / 2 步 · 写下内容' : '第 2 / 2 步 · 补充细节' }}</span>
        </div>
        <button class="close-icon" @click="onCloseRequest"><X :size="14" /></button>
      </div>

      <!-- ═══ Body ═══ -->
      <div class="form-body">

        <!-- ═══════ Step 1：标题 + 故事（金主题主卡） ═══════ -->
        <template v-if="step === 1">
          <div class="panel-wrapper pw-gold-card form-main-card">
            <div class="panel-head">
              <PenSquare :size="10" class="pw-icon pw-gold" />
              <span class="pw-title">故事内容</span>
              <span class="pw-count">标题必填 · 故事 1~300 字</span>
            </div>
            <div class="card-body">
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
            </div>
          </div>

          <button class="submit-btn next-btn" :class="{ gold: true }" :disabled="!title.trim() || !content.trim()" @click="step = 2">
            <span>继续补充细节</span>
            <ChevronRight :size="14" />
          </button>
        </template>

        <!-- ═══════ Step 2：细节 4 张卡 ═══════ -->
        <template v-else>
          <button class="back-btn" @click="step = 1">
            <ArrowLeft :size="14" />
            <span>返回修改内容</span>
          </button>

          <!-- 卡1：关联星辰（紫卡，仅 bind-star 模式） -->
          <div v-if="mode === 'bind-star' && starName" class="panel-wrapper pw-purple-card">
            <div class="panel-head">
              <Star :size="10" class="pw-icon pw-purple" />
              <span class="pw-title">关联星辰</span>
              <span class="pw-count">预绑定 · 无法更改</span>
            </div>
            <div class="card-body">
              <div class="star-name-badge">
                <Star :size="13" class="badge-star" />
                <span>{{ starName }}</span>
              </div>
            </div>
          </div>

          <!-- 卡2：情绪标签（紫卡） -->
          <div class="panel-wrapper pw-purple-card">
            <div class="panel-head">
              <Sparkles :size="10" class="pw-icon pw-purple" />
              <span class="pw-title">情绪标签</span>
              <span class="pw-count">可选 · 最多选 1 个</span>
            </div>
            <div class="card-body">
              <div class="tag-picker">
                <button
                  v-for="t in tagOptions"
                  :key="t"
                  class="tag-btn"
                  :class="{ active: selectedTag === t, ['tag-' + t]: true }"
                  @click="selectedTag = selectedTag === t ? null : t"
                  type="button"
                >{{ t }}</button>
              </div>
            </div>
          </div>

          <!-- 卡3：图片上传（紫卡） -->
          <div class="panel-wrapper pw-purple-card">
            <div class="panel-head">
              <ImageIcon :size="10" class="pw-icon pw-purple" />
              <span class="pw-title">配图</span>
              <span class="pw-count">可选 · 5MB 以内</span>
            </div>
            <div class="card-body">
              <div
                class="image-upload-zone"
                :class="{ 'has-image': imagePreview }"
                @click="triggerFileInput"
                @dragover.prevent
                @drop.prevent="onDrop"
              >
                <template v-if="!imagePreview">
                  <ImageIcon :size="20" class="upload-icon" />
                  <span class="upload-text">点击或拖拽上传图片</span>
                  <span class="upload-hint">支持 JPG / PNG / WebP / GIF</span>
                </template>
                <template v-else>
                  <img :src="imagePreview" class="upload-preview" />
                  <button class="upload-remove" @click.stop="removeImage" type="button">
                    <X :size="13" />
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
          </div>

          <!-- 卡4：匿名选项 + 提交按钮（金卡） -->
          <div class="panel-wrapper pw-gold-card">
            <div class="panel-head">
              <Send :size="10" class="pw-icon pw-gold" />
              <span class="pw-title">投递设置</span>
              <span class="pw-count">{{ mode === 'auto-match' ? '下一步：匹配星辰' : '下一步：挂上星星' }}</span>
            </div>
            <div class="card-body">
              <label class="field-checkbox">
                <input type="checkbox" v-model="isAnonymous" />
                <span class="checkbox-label">匿名投递（故事属于你，但不显示你的名字）</span>
              </label>

              <p v-if="error" class="form-error">{{ error }}</p>

              <button
                class="submit-btn"
                :class="{ gold: true, 'is-match-btn': mode === 'auto-match' }"
                :disabled="(submitting || matching) || !title.trim() || !content.trim()"
                @click="onPrimaryClick"
                type="button"
              >
                <template v-if="mode === 'auto-match'">
                  <Sparkles :size="14" />
                  <span>{{ matching ? '寻找归属星辰中…' : '寻找归属星辰' }}</span>
                </template>
                <template v-else>
                  <Send :size="14" />
                  <span>{{ submitting ? '化作星光中…' : '挂上星星' }}</span>
                </template>
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- ═══ auto-match 匹配中遮罩：AI 生成中风格，无粒子无 3 步条！ ═══ -->
      <Transition name="match-mask">
        <div v-if="mode === 'auto-match' && matching" class="match-mask">
          <div class="match-mask-inner panel-wrapper pw-match-mask">
            <div class="match-icon-wrap">
              <Sparkles :size="22" class="match-spin-icon" />
            </div>
            <div class="match-title">
              {{ matchStepLabel(stepProgress) }}
            </div>
            <div class="match-desc">
              <template v-if="stepProgress <= 1">正在从你的文字里提取情绪与主题，构建故事内核…</template>
              <template v-else-if="stepProgress === 2">正在浩瀚星海中扫描相似的故事，丈量每颗星与你的距离…</template>
              <template v-else-if="stepProgress >= 3">AI 正在判断每颗星与你的缘分，为你挑选最契合的归属…</template>
              <template v-else>✨ 请稍候…</template>
            </div>
            <!-- skeleton lines（AI 卡片生成中风格） -->
            <div class="match-skeleton">
              <span class="sk-line sk-1"></span>
              <span class="sk-line sk-2"></span>
              <span class="sk-line sk-3"></span>
            </div>
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

/** AI 匹配遮罩：当前步骤标题 */
function matchStepLabel(p: number): string {
  if (p <= 1) return '① 正在提取故事内核'
  if (p === 2) return '② 正在夜空扫描星辰'
  if (p >= 3) return '③ 正在判断契合缘分'
  return 'AI 正在分析…'
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
/* ════════════════════════════════════════════
   StoryForm · 对齐 StarDetail panel-wrapper
   ════════════════════════════════════════════ */

/* ── Overlay：星空氛围感，径向光斑（金左上 + 紫右上） ── */
.overlay {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 40% at 18% 22%, rgba(255,217,138,0.10), transparent 70%),
    radial-gradient(ellipse 55% 38% at 82% 20%, rgba(202,167,255,0.10), transparent 70%),
    rgba(7, 8, 22, 0.42);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: fadeIn 0.18s ease-out;
  padding: 16px;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ── Form Panel ── */
.form-panel {
  position: relative;
  width: 560px;
  max-width: 100%;
  max-height: calc(100vh - 32px);
  background:
    radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,217,138,0.05), transparent 70%),
    var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px) scale(0.99); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ═══ panel-wrapper 基础（与 StarDetail 保持一致） ═══ */
.panel-wrapper {
  position: relative;
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px 14px 14px;
  box-sizing: border-box;
}
.panel-wrapper::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(202,167,255,0.4), rgba(255,217,138,0.4), transparent);
}
/* 金卡：顶部渐变线 = 金色系 */
.panel-wrapper.pw-gold-card::before,
.panel-wrapper.pw-head::before {
  background: linear-gradient(90deg, transparent, rgba(255,217,138,0.42), rgba(255,176,96,0.32), transparent);
}
/* 紫卡：顶部渐变线 = 紫色系 */
.panel-wrapper.pw-purple-card::before {
  background: linear-gradient(90deg, transparent, rgba(160,196,255,0.42), rgba(202,167,255,0.4), transparent);
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.pw-icon { opacity: 0.85; flex-shrink: 0; }
.pw-gold   { color: #ffd98a; }
.pw-purple { color: #caa7ff; }
.pw-green  { color: #9ae6b4; }
.pw-blue   { color: #86a8ff; }
.pw-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
  letter-spacing: 0.01em;
}
.pw-count {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.32);
  letter-spacing: 0.03em;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.card-body {
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Form Header（最外层独立 panel） ── */
.form-header {
  position: relative;
  padding: 16px 18px;
  margin: 18px 20px 0;
  flex-shrink: 0;
}
.form-header .panel-head {
  padding-bottom: 10px;
}
.close-icon {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}
.close-icon:hover {
  color: #fff;
  background: rgba(255, 139, 125, 0.08);
  border-color: rgba(255, 139, 125, 0.25);
  transform: translateY(-1px);
}

/* ── Form Body：滚动区，卡片间距用 gap ── */
.form-body {
  padding: 18px 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 217, 138, 0.12) transparent;
  flex: 1;
  min-height: 0;
}
.form-body::-webkit-scrollbar { width: 5px; }
.form-body::-webkit-scrollbar-thumb {
  background: rgba(255, 217, 138, 0.14);
  border-radius: 10px;
}

/* ── Step1 主卡：占据视觉重心 ── */
.form-main-card { padding: 14px 16px 16px; }
.form-main-card .card-body { padding-top: 14px; gap: 14px; }

/* ═══ Field 与 Input（对齐 StarDetail 输入体系） ═══ */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 0.78rem;
  font-weight: 400;
  color: var(--muted);
  letter-spacing: 0.01em;
}
.field-input,
.field-textarea {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--rule);
  background: var(--surface-ground);
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.86rem;
  line-height: 1.6;
  outline: none;
  transition: all 0.15s ease;
  box-sizing: border-box;
  width: 100%;
}
.field-textarea {
  resize: vertical;
  min-height: 150px;
  line-height: 1.75;
}
.field-input::placeholder,
.field-textarea::placeholder {
  color: var(--muted-light);
}
.field-input:focus,
.field-textarea:focus {
  border-color: var(--accent-border);
  background:
    linear-gradient(180deg, rgba(255,217,138,0.02), transparent 50%),
    var(--surface-ground);
  box-shadow:
    0 0 0 3px rgba(255, 217, 138, 0.06),
    0 0 12px rgba(255, 217, 138, 0.08);
}

/* 字数计数 */
.char-count {
  align-self: flex-end;
  font-size: 0.7rem;
  color: var(--muted-light);
  margin: -4px 2px 0;
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
}
.char-count.warn { color: #e8a84c; }

/* 表单错误提示 */
.form-error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--star-red);
  padding: 8px 12px;
  background: rgba(255, 139, 125, 0.06);
  border: 1px solid rgba(255, 139, 125, 0.12);
  border-radius: var(--radius-sm);
  line-height: 1.5;
}

/* 返回按钮（Step2） */
.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--muted);
  font-family: var(--font);
  font-size: 0.78rem;
  cursor: pointer;
  padding: 2px 4px;
  transition: color 0.15s, transform 0.15s;
  align-self: flex-start;
  letter-spacing: 0.01em;
}
.back-btn:hover {
  color: var(--ink);
  transform: translateX(-1px);
}

/* ═══ Submit 按钮（对齐 StarDetail 金边浅底金字） ═══ */
.submit-btn {
  width: 100%;
  padding: 11px 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--accent-border);
  background: var(--accent-subtle);
  color: var(--accent);
  font-family: var(--font);
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: 0.01em;
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.submit-btn.gold:hover:not(:disabled) {
  background: var(--accent-bg);
  box-shadow: 0 6px 16px rgba(255, 217, 138, 0.15);
}
.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}
.submit-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
/* Step1 下一页按钮 → 金卡风格 */
.submit-btn.next-btn {
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), transparent 60%),
    var(--accent-subtle);
}
/* auto-match 模式的匹配按钮 */
.submit-btn.is-match-btn {
  background:
    linear-gradient(180deg, rgba(255,255,255,0.06), transparent 50%),
    var(--accent-bg);
  border-color: rgba(255, 217, 138, 0.32);
  color: #ffe5a8;
  box-shadow: 0 2px 10px rgba(255, 217, 138, 0.12);
}
.submit-btn.is-match-btn:hover:not(:disabled) {
  filter: brightness(1.05);
  box-shadow: 0 6px 18px rgba(255, 217, 138, 0.22);
}

/* ═══ 情绪标签 Picker（无发光阴影） ═══ */
.tag-picker {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.tag-btn {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--rule);
  background: rgba(255, 255, 255, 0.02);
  color: var(--muted);
  font-size: 0.78rem;
  font-family: var(--font);
  cursor: pointer;
  transition: all 0.15s ease;
  letter-spacing: 0.01em;
}
.tag-btn:hover {
  background: rgba(255, 255, 255, 0.045);
  border-color: var(--rule-hover);
  color: var(--ink-secondary);
  transform: translateY(-1px);
}
.tag-btn.active {
  border-color: transparent;
  font-weight: 500;
}
/* 5 色（仅底色 + 字色，无发光） */
.tag-btn.tag-思念.active { background: rgba(255,139,125,0.12); color: #ff9b8d; }
.tag-btn.tag-等待.active { background: rgba(134,168,255,0.12); color: #96b2ff; }
.tag-btn.tag-离别.active { background: rgba(202,167,255,0.12); color: #d0b9ff; }
.tag-btn.tag-愿望.active { background: rgba(255,217,138,0.14); color: #ffe5a8; }
.tag-btn.tag-孤独.active { background: rgba(149,240,192,0.12); color: #a8f5cb; }

/* ═══ Checkbox：匿名投递 ═══ */
.field-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--muted);
  user-select: none;
  line-height: 1.45;
  transition: color 0.15s;
  padding: 2px 0;
}
.field-checkbox:hover { color: var(--ink-secondary); }
.field-checkbox input[type="checkbox"] {
  accent-color: var(--accent);
  width: 15px;
  height: 15px;
  cursor: pointer;
  margin: 1px 0 0;
  flex-shrink: 0;
}
.checkbox-label { line-height: 1.5; }

/* ═══ 图片上传（实边 1px） ═══ */
.image-upload-zone {
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.18s ease;
  position: relative;
  min-height: 96px;
  justify-content: center;
  background: rgba(255, 255, 255, 0.01);
}
.image-upload-zone:hover {
  border-color: rgba(202,167,255,0.28);
  background: rgba(202,167,255,0.03);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(202,167,255,0.08);
}
.image-upload-zone.has-image {
  padding: 0;
  background: none;
}
.upload-icon {
  color: var(--muted);
  margin-bottom: 4px;
  opacity: 0.8;
}
.upload-text {
  font-size: 0.8rem;
  color: var(--muted);
}
.image-upload-zone:hover .upload-text { color: #dcd6ff; }
.upload-hint {
  font-size: 0.7rem;
  color: var(--muted-light);
  letter-spacing: 0.02em;
}
.upload-preview {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  border-radius: var(--radius-md);
  display: block;
}
.upload-remove {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0,0,0,0.62);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.upload-remove:hover {
  background: rgba(255, 90, 90, 0.82);
  transform: scale(1.06);
}
.upload-error {
  margin: 6px 2px 0;
  font-size: 0.78rem;
  color: var(--star-red);
  line-height: 1.4;
}
.file-input-hidden { display: none; }

/* ═══ 关联星辰徽章 ═══ */
.star-name-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  background: rgba(202, 167, 255, 0.10);
  border: 1px solid rgba(202, 167, 255, 0.26);
  border-radius: var(--radius-md);
  color: #e5d6ff;
  font-size: 0.84rem;
  font-weight: 500;
  width: fit-content;
  letter-spacing: 0.01em;
  transition: all 0.15s ease;
}
.star-name-badge:hover {
  background: rgba(202, 167, 255, 0.18);
  transform: translateY(-1px);
}
.badge-star {
  color: #caa7ff;
  opacity: 0.9;
}

/* ════════════════════════════════════════
   匹配遮罩：AI 生成中风格
   去掉粒子浮动动画，去掉 3 步进度条
   改用：旋转 Sparkles 图标 + 标题 + 描述 + skeleton lines
   ════════════════════════════════════════ */
.match-mask {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 50% 30%, rgba(255,217,138,0.10), transparent 70%),
    rgba(8, 7, 20, 0.82);
  backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  padding: 24px;
}
.match-mask-enter-active, .match-mask-leave-active {
  transition: opacity 0.3s ease;
}
.match-mask-enter-from, .match-mask-leave-to {
  opacity: 0;
}
.match-mask-inner {
  width: 100%;
  max-width: 420px;
  padding: 22px 22px 24px !important;
  text-align: center;
}
/* 匹配遮罩用金渐变顶线 */
.panel-wrapper.pw-match-mask::before {
  background: linear-gradient(90deg, transparent, rgba(255,217,138,0.5), rgba(202,167,255,0.5), transparent);
}
.match-icon-wrap {
  margin: 4px auto 14px;
  width: 56px; height: 56px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 217, 138, 0.12);
  border: 1px solid rgba(255, 217, 138, 0.28);
  box-shadow: 0 0 24px rgba(255, 217, 138, 0.18);
}
.match-spin-icon {
  color: #ffe5a8;
  opacity: 0.9;
  animation: spinSlow 3.5s linear infinite;
}
@keyframes spinSlow { to { transform: rotate(360deg); } }
.match-title {
  font-size: 0.98rem;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.01em;
  margin: 0 0 6px;
}
.match-desc {
  font-size: 0.82rem;
  color: rgba(255,255,255,0.68);
  line-height: 1.7;
  margin: 0 0 16px;
  padding: 0 6px;
}
/* skeleton 占位条（AI 卡片生成中同款） */
.match-skeleton {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 6px 4px 2px;
}
.sk-line {
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(255,217,138,0.06) 0%, rgba(255,217,138,0.16) 50%, rgba(255,217,138,0.06) 100%);
  background-size: 200% 100%;
  animation: skShine 1.6s linear infinite;
}
.sk-1 { width: 86%; }
.sk-2 { width: 70%; }
.sk-3 { width: 52%; }
@keyframes skShine {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
.match-error {
  margin-top: 14px;
  font-size: 0.8rem;
  color: #ff8b7d;
  line-height: 1.5;
}

/* ═══ 移动端适配 ═══ */
@media (max-width: 640px) {
  .overlay { padding: 8px; }
  .form-panel {
    max-height: calc(100vh - 16px);
    width: 96vw;
    border-radius: 14px;
  }
  .form-header {
    margin: 14px 14px 0;
    padding: 12px 14px;
  }
  .pw-head .pw-count { display: none; }
  .close-icon { top: 10px; right: 10px; }
  .form-body { padding: 16px 14px 18px; gap: 12px; }
  .tag-btn { padding: 5px 12px; font-size: 0.76rem; }
  .match-mask-inner { padding: 18px 18px 20px !important; }
  .match-title { font-size: 0.9rem; }
  .match-desc { font-size: 0.78rem; }
}
</style>
