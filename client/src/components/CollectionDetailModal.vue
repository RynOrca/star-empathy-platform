<template>
  <Transition name="cdm-fade">
    <div v-if="show" class="cdm-mask" @click.self="onCloseRequest">
      <div class="cdm-panel" role="dialog" aria-modal="true">
        <header class="cdm-head">
          <div class="cdm-head-info">
            <div class="cdm-head-line">
              <span class="cdm-dot" :style="{ background: detail?.coverColor || '#E8B86D' }"></span>
              <h3 class="cdm-title">{{ detail?.name || '加载中…' }}</h3>
              <span v-if="detail?.visibility === 'private'" class="cdm-tag cdm-tag-private">
                <Lock :size="9" /><span>私有</span>
              </span>
              <span v-else-if="detail" class="cdm-tag cdm-tag-public">
                <Globe :size="9" /><span>公开</span>
              </span>
            </div>
            <p v-if="detail?.description" class="cdm-desc">{{ detail.description }}</p>
            <p v-else-if="detail" class="cdm-desc is-empty">尚无描述</p>
          </div>
          <button type="button" class="cdm-close" aria-label="关闭" @click="onCloseRequest">
            <X :size="14" />
          </button>
        </header>

        <main class="cdm-body">
          <!-- 加载态 -->
          <div v-if="loading" class="cdm-state">加载中…</div>
          <!-- 错误 -->
          <div v-else-if="error" class="cdm-state cdm-state-error">
            <AlertCircle :size="14" />
            <span>{{ error }}</span>
          </div>
          <!-- 空合集 -->
          <div v-else-if="!detail || detail.stories.length === 0" class="cdm-empty">
            <Library :size="20" class="cdm-empty-icon" />
            <p class="cdm-empty-text">这个星笺里还没有故事</p>
            <p class="cdm-empty-sub">投递心事时选择此合集，故事就会自动归入。</p>
          </div>
          <!-- 故事列表 -->
          <div v-else class="cdm-list">
            <article
              v-for="s in detail.stories"
              :key="s.id"
              class="cdm-story"
              @click="$emit('story-click', s)"
            >
              <div class="cdm-story-head">
                <h4 class="cdm-story-title">{{ s.title || '匿名心事' }}</h4>
                <span class="cdm-story-date">{{ formatDate(s.createdAt) }}</span>
              </div>
              <p class="cdm-story-excerpt">{{ s.content }}</p>
              <div class="cdm-story-foot">
                <span v-if="s.username" class="cdm-story-sender">by {{ s.username }}</span>
                <span v-else class="cdm-story-sender is-anon">匿名星语</span>
                <span class="cdm-story-sep">·</span>
                <Sparkles :size="11" />
                <span>{{ s.resonanceCount || 0 }}</span>
                <span v-if="displayStoryTags(s).length" class="cdm-story-sep">·</span>
                <span
                  v-for="t in displayStoryTags(s)"
                  :key="'ctag-' + s.id + '-' + t"
                  class="cdm-story-tag"
                >#{{ t }}</span>
              </div>
            </article>
          </div>
        </main>

        <footer v-if="detail && isOwner" class="cdm-foot">
          <button type="button" class="cdm-foot-btn" @click="$emit('edit', detail)">
            <Pencil :size="12" />
            <span>编辑星笺</span>
          </button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Lock, Globe, Library, Sparkles, Pencil, AlertCircle } from 'lucide-vue-next'
import { useAuth } from '../stores/auth'
import { useCollections, type CollectionDetail } from '../composables/useCollections'

const props = defineProps<{
  show: boolean
  /** 传入合集 id 即拉取详情；null 则关闭 */
  collectionId: number | null
  /** 是否为当前用户所有（控制编辑按钮显隐） */
  isOwner?: boolean
}>()

const emit = defineEmits<{
  close: []
  'story-click': [story: any]
  edit: [collection: CollectionDetail]
}>()

const { fetchDetail } = useCollections()
const { user } = useAuth()

const detail = ref<CollectionDetail | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

watch(() => [props.show, props.collectionId], async ([show, id]) => {
  if (!show || id == null) {
    detail.value = null
    error.value = null
    return
  }
  loading.value = true
  error.value = null
  detail.value = null
  try {
    const d = await fetchDetail(id as number)
    if (!d) {
      error.value = '合集不存在或不可见'
    } else {
      detail.value = d
    }
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}, { immediate: true })

function onCloseRequest() {
  emit('close')
}

function displayStoryTags(s: any): string[] {
  const arr = Array.isArray(s.tags) ? s.tags.filter((t: any) => !!t) : []
  if (arr.length) return arr.slice(0, 3)
  return s.tag ? [s.tag] : []
}

function formatDate(s: string | null | undefined): string {
  if (!s) return ''
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  return `${m[1]}/${m[2]}/${m[3]}`
}

// 兜底：当 isOwner 未显式传入时，用当前登录用户判断
const isOwner = ref(props.isOwner ?? false)
watch(() => [props.isOwner, detail.value, user.value], () => {
  if (props.isOwner != null) {
    isOwner.value = props.isOwner
  } else if (detail.value && user.value) {
    isOwner.value = (detail.value as any).userId === user.value.id
  } else {
    isOwner.value = false
  }
}, { immediate: true })
</script>

<style scoped>
.cdm-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(8, 8, 16, 0.66);
  backdrop-filter: blur(8px) saturate(140%);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.cdm-panel {
  width: 100%;
  max-width: 520px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: rgba(28, 29, 44, 0.96);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}

.cdm-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.06);
}
.cdm-head-info { flex: 1; min-width: 0; }
.cdm-head-line {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cdm-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
  opacity: 0.9;
}
.cdm-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cdm-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  border-radius: 100px;
  font-size: 9.5px;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.cdm-tag-private {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.42);
  border: 0.5px solid rgba(255, 255, 255, 0.07);
}
.cdm-tag-public {
  background: rgba(149, 240, 192, 0.07);
  color: #95f0c0;
  border: 0.5px solid rgba(149, 240, 192, 0.18);
}
.cdm-desc {
  margin: 6px 0 0;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.55;
}
.cdm-desc.is-empty { color: rgba(255, 255, 255, 0.26); font-style: italic; }

.cdm-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  flex-shrink: 0;
  transition: background .15s ease, color .15s ease;
}
.cdm-close:hover { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.85); }

.cdm-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px 16px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.cdm-body::-webkit-scrollbar { width: 5px; }
.cdm-body::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }

.cdm-state {
  padding: 40px 20px;
  text-align: center;
  font-size: 0.84rem;
  color: rgba(255, 255, 255, 0.42);
}
.cdm-state-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #ff8aa6;
}

.cdm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 40px 20px;
  text-align: center;
}
.cdm-empty-icon { color: rgba(255, 255, 255, 0.18); }
.cdm-empty-text {
  margin: 4px 0 0;
  font-size: 0.86rem;
  color: rgba(255, 255, 255, 0.6);
}
.cdm-empty-sub {
  margin: 0;
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.34);
}

.cdm-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cdm-story {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.022);
  border: 0.5px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease;
  animation: cdmIn .22s ease-out both;
}
.cdm-story:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
}
@keyframes cdmIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.cdm-story-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}
.cdm-story-title {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.cdm-story-date {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.32);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.cdm-story-excerpt {
  margin: 0 0 6px;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.58);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cdm-story-foot {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.4);
}
.cdm-story-sender { color: #7a8cc0; opacity: 0.8; }
.cdm-story-sender.is-anon { color: #5a5580; }
.cdm-story-sep { opacity: 0.4; }
.cdm-story-tag {
  color: #c9b8e8;
  font-size: 10px;
}

.cdm-foot {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 0.5px solid rgba(255, 255, 255, 0.06);
}
.cdm-foot-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.cdm-foot-btn:hover { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.92); }

/* ── 过渡 ── */
.cdm-fade-enter-active, .cdm-fade-leave-active { transition: opacity .18s ease; }
.cdm-fade-enter-active .cdm-panel, .cdm-fade-leave-active .cdm-panel {
  transition: opacity .18s ease, transform .18s ease;
}
.cdm-fade-enter-from, .cdm-fade-leave-to { opacity: 0; }
.cdm-fade-enter-from .cdm-panel, .cdm-fade-leave-to .cdm-panel {
  transform: translateY(10px) scale(0.97);
}

@media (max-width: 480px) {
  .cdm-mask { padding: 0; align-items: flex-end; }
  .cdm-panel {
    max-width: 100%;
    max-height: 92vh;
    border-radius: 16px 16px 0 0;
  }
}
</style>
