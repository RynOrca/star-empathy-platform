<template>
  <div class="overlay" @click.self="onCloseRequest">
    <div class="form-panel">
      <!-- ══ Header：主标题 + 诗意副标题 + 关闭 ══ -->
      <div class="form-header">
        <div class="header-title-group">
          <h2 class="form-heading">
            <component :is="mode === 'auto-match' ? Sparkles : PenSquare" :size="16" class="heading-icon" />
            {{ mode === 'auto-match' ? '记录此刻心事' : '写我的故事' }}
          </h2>
          <p class="form-subheading">
            <template v-if="mode === 'auto-match'">让心事在夜空中寻找最契合的那颗星</template>
            <template v-else>在星光下写下此刻的回忆</template>
          </p>
        </div>
        <button class="close-icon" @click="onCloseRequest"><X :size="15" /></button>
      </div>

      <!-- ══ Body：4 张 panel-wrapper 卡片化布局 ══ -->
      <div class="form-body">
        <!-- ── ① 主卡：标题 + 故事（金色顶线） ── -->
        <section class="panel-wrapper pw-gold pw-main">
          <div class="panel-head">
            <PenSquare :size="10" class="pw-icon pw-icon-gold" />
            <span class="pw-title">故事内容</span>
            <span class="pw-count">必填</span>
          </div>
          <div class="panel-body">
            <div class="field">
              <label class="field-label">标题</label>
              <input
                v-model="title"
                class="field-input"
                placeholder="给你的故事起个名字…"
                maxlength="60"
              />
            </div>

            <div class="field field-textarea-wrap">
              <label class="field-label">故事</label>
              <textarea
                v-model="content"
                class="field-textarea"
                :placeholder="mode === 'auto-match'
                  ? '此刻你想起了什么？写下你的心事，我们会为它寻找夜空中最契合的星辰…'
                  : '此刻你在这颗星下想起了什么？写下你的心事吧…'"
                maxlength="300"
                rows="7"
                ref="textareaRef"
              ></textarea>
              <div class="char-count" :class="{ warn: content.length >= 280 }">
                {{ content.length }} / 300
              </div>
            </div>
          </div>
        </section>

        <!-- ── ② 关联星卡（仅 bind-star 模式显示，紫色顶线） ── -->
        <section v-if="mode === 'bind-star' && starName" class="panel-wrapper pw-purple">
          <div class="panel-head">
            <Star :size="10" class="pw-icon pw-icon-purple" />
            <span class="pw-title">关联星辰</span>
            <span class="pw-count">自动</span>
          </div>
          <div class="panel-body">
            <div class="star-name-badge">
              <Sparkle :size="12" />
              {{ starName }}
            </div>
          </div>
        </section>

        <!-- ── ③ 装饰卡：情绪标签 + 图片上传（紫色顶线） ── -->
        <section class="panel-wrapper pw-purple">
          <div class="panel-head">
            <Palette :size="10" class="pw-icon pw-icon-purple" />
            <span class="pw-title">装饰细节</span>
            <span class="pw-count">可选</span>
          </div>
          <div class="panel-body">
            <!-- 情绪标签 -->
            <div class="field">
              <label class="field-label">情绪标签</label>
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

            <!-- 图片上传 -->
            <div class="field field-image">
              <label class="field-label">图片</label>
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
                  <span class="upload-hint">支持 JPG / PNG / WebP / GIF · 最大 5MB</span>
                </template>
                <template v-else>
                  <img :src="imagePreview" class="upload-preview" />
                  <button class="upload-remove" @click.stop="removeImage" type="button">
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
          </div>
        </section>

        <!-- ── ④ 选项卡：匿名 + 错误 + 提交按钮（金色顶线） ── -->
        <section class="panel-wrapper pw-gold pw-actions">
          <div class="panel-head">
            <Lock :size="10" class="pw-icon pw-icon-gold" />
            <span class="pw-title">投递选项</span>
            <span class="pw-count">可选</span>
          </div>
          <div class="panel-body">
            <label class="field-checkbox">
              <input type="checkbox" v-model="isAnonymous" />
              <span>匿名投递（故事属于你，但不显示你的名字）</span>
            </label>

            <Transition name="error-fade">
              <p v-if="error" class="form-error">{{ error }}</p>
            </Transition>

            <button
              class="submit-btn"
              :class="{ 'is-match-btn': mode === 'auto-match' }"
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
        </section>
      </div>

      <!-- ═══ auto-match 模式：匹配中遮罩 ═══ -->
      <Transition name="match-mask">
        <div v-if="mode === 'auto-match' && matching" class="match-mask">
          <div class="match-mask-inner">
            <div class="match-stars" aria-hidden="true">
              <span v-for="i in 6" :key="i" class="match-star-particle" :style="particleStyle(i)"></span>
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
            <Transition name="error-fade">
              <div v-if="matchError" class="match-error">{{ matchError }}，请稍后再试</div>
            </Transition>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, defineExpose } from 'vue'
import {
  PenSquare,
  X,
  Send,
  Image as ImageIcon,
  Sparkles,
  Sparkle,
  Star,
  Palette,
  Lock,
} from 'lucide-vue-next'
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
  const left = 10 + i * 14 + Math.random() * 8
  const delay = (i - 1) * 0.35
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

// 外部切换 mode 等场景：没内容则重新聚焦
watch(() => [props.mode, props.starName] as const, () => {
  if (!title.value && !content.value) {
    Promise.resolve().then(() => textareaRef.value?.focus())
  }
})

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
  background: rgba(7, 8, 22, 0.52);
  backdrop-filter: blur(8px) saturate(120%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: fadeIn 0.18s ease-out;
  padding: 32px 16px;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ─── Form Panel ─── */
.form-panel {
  width: 560px;
  max-width: 100%;
  max-height: calc(100vh - 64px);
  background:
    radial-gradient(1200px 400px at 0% -10%, rgba(255,217,138,0.04), transparent 60%),
    radial-gradient(900px 300px at 100% 0%, rgba(202,167,255,0.04), transparent 60%),
    var(--surface);
  border: 1px solid var(--rule);
  border-radius: 14px;
  box-shadow:
    0 30px 80px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.02) inset;
  animation: slideUp 0.22s cubic-bezier(.2,.8,.2,1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}
.form-panel::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,217,138,0.3), rgba(202,167,255,0.3), transparent);
  pointer-events: none;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(14px) scale(.99); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* ─── Header ─── */
.form-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 22px 16px;
  border-bottom: 1px solid var(--rule);
  background: rgba(255, 255, 255, 0.012);
}
.header-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.form-heading {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.01em;
}
.heading-icon {
  color: #ffd98a;
  filter: drop-shadow(0 0 4px rgba(255,217,138,0.4));
  flex-shrink: 0;
}
.form-subheading {
  margin: 0;
  font-size: 0.75rem;
  color: var(--muted);
  letter-spacing: 0.03em;
  line-height: 1.4;
}
.close-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--rule);
  border-radius: 9px;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
  flex-shrink: 0;
}
.close-icon:hover {
  color: var(--ink);
  border-color: var(--rule-hover);
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-1px);
}

/* ─── Body ─── */
.form-body {
  padding: 18px 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.08) transparent;
}
.form-body::-webkit-scrollbar { width: 6px; }
.form-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }

/* ─── Panel Wrapper（对齐 StarDetail 设计语言） ─── */
.panel-wrapper {
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s;
}
.panel-wrapper::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
}
.pw-gold::before {
  background: linear-gradient(90deg, transparent, rgba(255,217,138,0.45), transparent);
}
.pw-purple::before {
  background: linear-gradient(90deg, transparent, rgba(202,167,255,0.45), transparent);
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.pw-icon {
  opacity: 0.9;
  flex-shrink: 0;
}
.pw-icon-gold { color: #ffd98a; filter: drop-shadow(0 0 3px rgba(255,217,138,0.3)); }
.pw-icon-purple { color: #caa7ff; filter: drop-shadow(0 0 3px rgba(202,167,255,0.3)); }
.pw-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.82);
  flex: 1;
  letter-spacing: 0.02em;
}
.pw-count {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.24);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.panel-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 主卡内字段 gap 稍大 */
.pw-main .panel-body { gap: 14px; }

/* ─── Field ─── */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.58);
  letter-spacing: 0.02em;
}

/* ─── Inputs（focus 时外发光） ─── */
.field-input,
.field-textarea {
  padding: 10px 13px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005)),
    var(--surface-ground);
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.86rem;
  line-height: 1.6;
  outline: none;
  transition: all 0.18s ease;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}
.field-textarea { resize: vertical; min-height: 150px; line-height: 1.72; }
.field-input::placeholder,
.field-textarea::placeholder {
  color: rgba(255, 255, 255, 0.22);
  font-size: 0.82rem;
}
.field-input:focus,
.field-textarea:focus {
  border-color: rgba(255, 217, 138, 0.45);
  background:
    linear-gradient(180deg, rgba(255,217,138,0.025), rgba(255,255,255,0.008)),
    var(--surface-ground);
  box-shadow:
    0 0 0 3px rgba(255, 217, 138, 0.08),
    0 0 18px rgba(255, 217, 138, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

/* ─── Char Count ─── */
.char-count {
  align-self: flex-end;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.26);
  margin: -4px 2px 0;
  letter-spacing: 0.04em;
}
.char-count.warn {
  color: #e8a84c;
}

/* ─── Tag Picker（升级：hover 微光，active 发光） ─── */
.tag-picker {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}
.tag-btn {
  padding: 5px 13px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.025);
  color: rgba(255, 255, 255, 0.52);
  font-size: 0.78rem;
  font-family: var(--font);
  cursor: pointer;
  transition: all 0.18s;
  letter-spacing: 0.02em;
}
.tag-btn:hover {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.75);
  transform: translateY(-1px);
}
.tag-btn.active {
  border-color: transparent;
  font-weight: 500;
  box-shadow: 0 2px 10px var(--tag-shadow);
  animation: tagPop 0.2s ease-out;
}
@keyframes tagPop {
  0% { transform: scale(.96); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
}
.tag-btn.tag-思念.active {
  background: rgba(255,139,125,0.18);
  color: #ff9b8d;
  --tag-shadow: rgba(255,139,125,0.3);
}
.tag-btn.tag-等待.active {
  background: rgba(134,168,255,0.18);
  color: #96b2ff;
  --tag-shadow: rgba(134,168,255,0.3);
}
.tag-btn.tag-离别.active {
  background: rgba(202,167,255,0.18);
  color: #d0b9ff;
  --tag-shadow: rgba(202,167,255,0.3);
}
.tag-btn.tag-愿望.active {
  background: rgba(255,217,138,0.2);
  color: #ffe5a8;
  --tag-shadow: rgba(255,217,138,0.32);
}
.tag-btn.tag-孤独.active {
  background: rgba(149,240,192,0.18);
  color: #a8f5cb;
  --tag-shadow: rgba(149,240,192,0.3);
}

/* ─── Image Upload（毛玻璃虚线框） ─── */
.field-image { margin-top: 2px; }
.image-upload-zone {
  border: 1.5px dashed rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.18s;
  position: relative;
  min-height: 110px;
  justify-content: center;
  background:
    repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.008) 10px, rgba(255,255,255,0.008) 20px);
}
.image-upload-zone:hover {
  border-color: rgba(255, 217, 138, 0.32);
  background:
    repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,217,138,0.02) 10px, rgba(255,217,138,0.02) 20px);
  color: #ffe5a8;
}
.image-upload-zone.has-image {
  padding: 0;
  border-style: solid;
  border-color: rgba(255,255,255,0.08);
  background: none;
}
.upload-icon {
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 4px;
}
.upload-text {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.46);
}
.image-upload-zone:hover .upload-text { color: rgba(255, 255, 255, 0.72); }
.upload-hint {
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.22);
  letter-spacing: 0.04em;
}
.upload-preview {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  border-radius: 10px;
  display: block;
}
.upload-remove {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.upload-remove:hover {
  background: rgba(255, 90, 90, 0.8);
  transform: scale(1.06);
}
.upload-error {
  margin: 6px 2px 0;
  font-size: 0.76rem;
  color: #ff8b7d;
}
.file-input-hidden { display: none; }

/* ─── Checkbox ─── */
.field-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  user-select: none;
  line-height: 1.4;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.15s;
}
.field-checkbox:hover {
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.78);
  border-color: rgba(255, 255, 255, 0.08);
}
.field-checkbox input[type="checkbox"] {
  accent-color: #ffd98a;
  width: 16px;
  height: 16px;
  cursor: pointer;
  flex-shrink: 0;
  margin: 0;
}

/* ─── Error ─── */
.error-fade-enter-active, .error-fade-leave-active { transition: all 0.2s ease; }
.error-fade-enter-from, .error-fade-leave-to { opacity: 0; transform: translateY(-4px); }

.form-error {
  margin: 0;
  font-size: 0.8rem;
  color: #ff8b7d;
  padding: 9px 12px;
  background: rgba(255, 139, 125, 0.06);
  border: 1px solid rgba(255, 139, 125, 0.14);
  border-radius: 8px;
  line-height: 1.5;
}

/* ─── Submit Button（金渐变加强光 + hover 上浮） ─── */
.submit-btn {
  width: 100%;
  padding: 12px 0;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.08), transparent 50%),
    var(--accent);
  color: rgba(0, 0, 0, 0.72);
  font-family: var(--font);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 2px;
  letter-spacing: 0.02em;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    0 4px 16px rgba(255, 217, 138, 0.12);
}
.submit-btn:hover:not(:disabled) {
  background:
    linear-gradient(180deg, rgba(255,255,255,0.14), transparent 50%),
    var(--accent-hover);
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    0 8px 22px rgba(255, 217, 138, 0.2);
}
.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}
.submit-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.submit-btn.is-match-btn {
  background:
    linear-gradient(180deg, rgba(255,255,255,0.16), transparent 50%),
    linear-gradient(90deg, #ffd98a, #f0b86a 50%, #ffd98a);
  background-size: 200% 100%;
  color: rgba(30, 18, 0, 0.74);
  border-color: rgba(255, 217, 138, 0.3);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    0 4px 20px rgba(255, 217, 138, 0.25),
    0 0 0 1px rgba(255, 217, 138, 0.15) inset;
  animation: matchBtnShine 4s linear infinite;
}
.submit-btn.is-match-btn:hover:not(:disabled) {
  filter: brightness(1.05);
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    0 10px 28px rgba(255, 217, 138, 0.35),
    0 0 0 1px rgba(255, 217, 138, 0.2) inset;
}
@keyframes matchBtnShine {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ─── Star Name Badge（bind-star 模式） ─── */
.star-name-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background:
    radial-gradient(200px 60px at 0% 50%, rgba(255,217,138,0.1), transparent 60%),
    linear-gradient(90deg, rgba(255, 217, 138, 0.08), rgba(255, 217, 138, 0.02));
  border: 1px solid rgba(255, 217, 138, 0.22);
  border-radius: 10px;
  color: #ffe5a8;
  font-size: 0.86rem;
  font-weight: 500;
  width: fit-content;
  box-shadow: 0 0 20px rgba(255, 217, 138, 0.08);
  letter-spacing: 0.02em;
}

/* ─── Matching Mask（升级：玻璃毛玻璃 + 星光更强） ─── */
.match-mask {
  position: absolute;
  inset: 0;
  background: rgba(6, 4, 16, 0.88);
  backdrop-filter: blur(16px) saturate(140%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}
.match-mask-enter-active, .match-mask-leave-active {
  transition: opacity 0.28s ease;
}
.match-mask-enter-from, .match-mask-leave-to {
  opacity: 0;
}
.match-mask-inner {
  width: 88%;
  max-width: 440px;
  text-align: center;
}
.match-stars {
  position: relative;
  height: 90px;
  margin-bottom: 28px;
}
.match-star-particle {
  position: absolute;
  bottom: 0;
  border-radius: 50%;
  background: radial-gradient(circle, #fff5c0, #ffd98a 55%, transparent 85%);
  box-shadow: 0 0 14px rgba(255, 217, 138, 0.9);
  animation: floatStar 2.4s ease-in-out infinite;
}
@keyframes floatStar {
  0%   { transform: translateY(0) scale(1); opacity: 0.25; }
  35%  { transform: translateY(-30px) scale(1.25); opacity: 1; }
  70%  { transform: translateY(-62px) scale(0.85); opacity: 0.45; }
  100% { transform: translateY(-80px) scale(0.3); opacity: 0; }
}
.match-step-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px;
  margin-bottom: 22px;
}
.match-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.step-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.22);
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.32s ease;
}
.match-step.active .step-dot {
  border-color: #ffd98a;
  background: rgba(255, 217, 138, 0.14);
  color: #ffe5a8;
  box-shadow: 0 0 18px rgba(255, 217, 138, 0.45);
  animation: stepPulse 1.3s ease-in-out infinite;
}
.match-step.done .step-dot {
  border-color: rgba(149, 240, 192, 0.55);
  background: rgba(149, 240, 192, 0.12);
  color: #95f0c0;
}
@keyframes stepPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
.step-label {
  font-size: 0.73rem;
  color: rgba(255,255,255,0.48);
  white-space: nowrap;
  transition: color 0.3s;
  letter-spacing: 0.02em;
}
.match-step.active .step-label { color: #ffe5a8; }
.match-step.done .step-label   { color: rgba(149, 240, 192, 0.9); }
.match-step-line {
  height: 1.5px;
  flex: 1;
  max-width: 48px;
  background: rgba(255,255,255,0.12);
  position: relative;
  overflow: hidden;
  margin: -22px 4px 0;
}
.match-step-line::after {
  content: '';
  position: absolute;
  inset: 0;
  width: 0%;
  background: linear-gradient(90deg, #ffd98a, rgba(149, 240, 192, 0.85));
  transition: width 0.4s ease;
}
.match-step-line.fill::after { width: 100%; }
.match-tip {
  font-size: 0.86rem;
  color: rgba(255,255,255,0.82);
  margin: 0;
  letter-spacing: 0.02em;
  line-height: 1.6;
}
.match-error {
  margin-top: 14px;
  font-size: 0.8rem;
  color: #ff8b7d;
  line-height: 1.5;
}

/* ─── 移动端适配 ─── */
@media (max-width: 640px) {
  .overlay { padding: 12px 8px; }
  .form-panel {
    max-height: calc(100vh - 24px);
    border-radius: 12px;
  }
  .form-header { padding: 15px 16px 13px; }
  .form-heading { font-size: 0.9rem; }
  .form-subheading { font-size: 0.72rem; }
  .form-body { padding: 14px 14px 18px; gap: 10px; }
  .panel-wrapper { padding: 11px 12px 13px; border-radius: 9px; }
  .pw-main .panel-body { gap: 12px; }
  .field-textarea { min-height: 130px; }
  .tag-picker { gap: 6px; }
  .tag-btn { padding: 4px 11px; font-size: 0.76rem; }
  .submit-btn { padding: 11px 0; font-size: 0.85rem; }
  .star-name-badge { padding: 9px 13px; font-size: 0.82rem; }
  .image-upload-zone { padding: 18px 14px; min-height: 96px; }
}

@media (max-width: 420px) {
  .pw-title { font-size: 0.78rem; }
  .match-step-line { max-width: 28px; margin: -18px 2px 0; }
  .step-label { font-size: 0.66rem; }
}
</style>
