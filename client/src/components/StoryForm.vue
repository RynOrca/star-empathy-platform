<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="form-panel">
      <div class="form-header">
        <h2 class="form-heading"><PenSquare :size="16" /> 写我的故事</h2>
        <button class="close-icon" @click="$emit('close')"><X :size="15" /></button>
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
              placeholder="此刻你在这颗星下想起了什么？写下你的心事吧..."
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

          <button class="submit-btn" :disabled="submitting || !title.trim() || !content.trim()" @click="onSubmit">
            <Send :size="14" />
            <span>{{ submitting ? '化作星光中...' : '挂上星星' }}</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { PenSquare, X, Send, Image as ImageIcon, ChevronRight, ArrowLeft } from 'lucide-vue-next'
import { useLocation } from '../composables/useLocation'

const props = defineProps<{
  starName: string
  catalogStarId: number
}>()

const emit = defineEmits<{
  close: []
  submitted: [story: { id: number; title: string | null; content: string; resonanceCount: number; catalogStarId: number; createdAt: string; locationLat: number | null; locationLng: number | null; type: string; viewCount: number; origin: string | null; username: string | null; tag: string | null; userId: number | null; imageUrl: string | null }]
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

async function onSubmit() {
  const trimmedTitle = title.value.trim()
  const trimmed = content.value.trim()
  if (!trimmedTitle || !trimmed || submitting.value) return

  submitting.value = true
  error.value = ''

  try {
    // 如果有图片，先上传
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
        error.value = uploadJson.message || '图片上传失败'
        submitting.value = false
        return
      }
      imageUrl.value = uploadJson.data.imageUrl
    }

    const token = localStorage.getItem('token')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const body: Record<string, unknown> = {
      catalogStarId: props.catalogStarId,
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
      emit('submitted', {
        id: json.data.id,
        title: json.data.title,
        content: json.data.content,
        resonanceCount: json.data.resonanceCount,
        catalogStarId: json.data.catalogStarId,
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
</style>
