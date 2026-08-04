<template>
  <div class="cd-page">
    <canvas ref="canvasRef" class="cd-canvas" aria-hidden="true"></canvas>

    <!-- Topbar -->
    <header class="cd-topbar">
      <button class="cd-back-btn" type="button" @click="goBack" aria-label="返回">
        ← 返回
      </button>
      <div class="cd-brand">✦ 合集详情 ✦</div>
      <div class="cd-actions">
        <button v-if="isOwner && !collection?.isDefault" class="cd-action-btn" type="button" @click="startEdit">
          编辑
        </button>
      </div>
    </header>

    <!-- Hero 封面 -->
    <section class="cd-hero" v-if="collection || heroLoading">
      <div class="cd-hero-glow" :style="heroGlowStyle"></div>
      <div v-if="heroLoading" class="cd-hero-placeholder">加载中…</div>
      <template v-else-if="collection && statsOk">
        <div class="cd-hero-ribbon" v-if="!isOwner && collection.isPublic" aria-label="公开合集"><Globe :size="12" /> 公开合集</div>
        <div class="cd-hero-ribbon cd-ribbon-draft" v-else-if="isOwner && !collection.isPublic" aria-label="私密合集"><Lock :size="12" /> 仅限自己可见</div>
        <p class="cd-hero-eyebrow" v-if="collection?.isDefault">· DEFAULT · COLLECTION ·</p>
        <p class="cd-hero-eyebrow" v-else>· COLLECTION ·</p>
        <h1 class="cd-hero-title">{{ collection.name }}</h1>
        <p v-if="collection.description" class="cd-hero-desc">{{ collection.description }}</p>

        <div class="cd-hero-stats">
          <div class="cd-stat">
            <div class="cd-stat-num">{{ collection.storyCount }}</div>
            <div class="cd-stat-label">Stories</div>
          </div>
          <div class="cd-stat">
            <div class="cd-stat-num">{{ collection.totalResonance }}</div>
            <div class="cd-stat-label">Resonance</div>
          </div>
          <div class="cd-stat">
            <div class="cd-stat-num">{{ collection.totalViews }}</div>
            <div class="cd-stat-label">Views</div>
          </div>
          <div class="cd-stat">
            <div class="cd-stat-num">{{ collectionAgeDays }}</div>
            <div class="cd-stat-label">Days</div>
          </div>
        </div>

        <!-- Top Tags -->
        <div v-if="stats?.topTags && stats.topTags.length" class="cd-top-tags" aria-label="高频标签">
          <span v-for="t in stats.topTags.slice(0, 6)" :key="t.tag" class="cd-top-tag" :style="tagStyle(t.tag)">
            #{{ t.tag }} · {{ t.count }}
          </span>
        </div>

        <!-- Top Catalogs -->
        <div v-if="stats?.catalogs && stats.catalogs.length" class="cd-top-catalogs" aria-label="高频星座">
          <div v-for="c in stats.catalogs.slice(0, 5)" :key="String(c.catalogStarId ?? c.name ?? 'u')" class="cd-catalog-chip">
            <span class="cd-catalog-dot" :style="{ background: c.color || '#ffd98a' }"></span>
            {{ c.name || '自由星星' }}
            <em>{{ c.count }} 则</em>
          </div>
        </div>
      </template>
      <template v-else-if="heroError">
        <div class="cd-hero-error">
          <div class="pd-empty-orb" aria-hidden="true">!</div>
          <h3>{{ heroError }}</h3>
          <button class="cd-back-btn" @click="goBack">返回星空</button>
        </div>
      </template>
    </section>

    <!-- Story list -->
    <section class="cd-stories" aria-label="故事列表">
      <div class="cd-stories-head">
        <h2>· STORIES · 故事册 ·</h2>
        <p v-if="isOwner">—— 共 {{ pager.total }} 则心事，随时可「移动到合集」——</p>
        <p v-else>—— 共 {{ pager.total }} 则心事 ——</p>
      </div>

      <template v-if="listLoading && stories.length === 0">
        <div class="pd-empty"><div class="pd-empty-orb" aria-hidden="true">…</div></div>
      </template>
      <template v-else-if="stories.length === 0">
        <div class="pd-empty">
          <div class="pd-empty-orb" aria-hidden="true">✧</div>
          <h4 class="pd-empty-title">合集里还没有故事，</h4>
          <p class="pd-empty-sub" v-if="isOwner">在详情页「移动到合集」或者写新故事时选择这个合集吧。</p>
          <p class="pd-empty-sub" v-else>作者还没有在这个合集里写下心事。</p>
          <button v-if="isOwner" class="cd-back-btn" @click="goWrite">去写故事</button>
        </div>
      </template>
      <template v-else>
        <nav class="cd-story-list">
          <article
            v-for="(s, i) in stories"
            :key="s.id"
            class="cd-story-card"
            :style="{ animationDelay: Math.min(i * 25, 200) + 'ms' }"
            @click="openStory(s)"
            @mouseenter="onCardEnter" @mouseleave="onCardLeave"
            tabindex="0" role="button"
            :aria-label="`故事：${s.title || '未命名故事'}，共鸣 ${s.resonanceCount}，按 Enter 打开`"
            @keyup.enter="openStory(s)"
          >
            <div class="cd-story-left" :style="{ '--cd-dot': s.catalogStarColor || '#ffd98a' }">
              <span class="cd-story-dot"></span>
              <span class="cd-story-catalog">
                {{ s.catalogStarName || '自由星星' }}
              </span>
            </div>
            <div class="cd-story-body">
              <h3 class="cd-story-title">{{ s.title || '未命名故事' }}</h3>
              <p class="cd-story-content">{{ s.content }}</p>
              <div class="cd-story-foot">
                <div class="cd-story-foot-left">
                  <span v-if="collection" class="cd-story-coll" :title="`所属合集：${collection.name}`">
                    <span class="cd-story-coll-dot" :style="{ background: collection.coverColor || '#caa7ff' }"></span>
                    <span class="cd-story-coll-name">{{ shortCollName(collection.name) }}</span>
                  </span>
                  <span v-if="s.tags && s.tags.length" class="cd-story-tags">
                    <span v-for="t in s.tags.slice(0,4)" :key="t" class="cd-story-tag" :style="tagStyle(t)">#{{ t }}</span>
                  </span>
                </div>
                <span class="cd-story-meta">
                  <em><Sparkles :size="10" class="cd-story-meta-icon" /> {{ s.resonanceCount }}</em>
                  <em><Eye :size="10" class="cd-story-meta-icon" /> {{ s.viewCount }}</em>
                  <em>{{ formatMD(s.createdAt) }}</em>
                </span>
              </div>
            </div>
            <button
              v-if="isOwner"
              type="button"
              class="cd-move-btn"
              @click.stop="openMovePicker(s)"
              :disabled="movingId === s.id"
              title="移动到其他合集"
              aria-label="移动到其他合集"
            >
              {{ movingId === s.id ? '移动中…' : '' }}
              <template v-if="movingId !== s.id">
                <FolderKanban :size="12" /> <span>移动</span>
              </template>
            </button>
          </article>
        </nav>

        <div v-if="listLoading" class="pd-bottom-hint">加载中...</div>
        <div v-else-if="!pager.hasMore && stories.length > 0" class="pd-bottom-hint">✦ ✦ ✦ 已经到底了</div>
        <div class="cd-loadmore" v-if="pager.hasMore && !listLoading">
          <button type="button" class="cd-back-btn" @click="loadNextPage">加载更多</button>
        </div>
      </template>
    </section>

    <!-- 移动合集 picker Modal -->
    <Transition name="pd-modal">
    <div v-if="showMovePicker && movingTarget" class="pd-modal-mask" @click.self="closeMovePicker">
      <div class="pd-modal-panel pd-modal-sm">
        <header class="pd-modal-head">
          <h3>· MOVE · TO · COLLECTION ·</h3>
          <button type="button" class="pd-modal-close" aria-label="关闭" @click="closeMovePicker">×</button>
        </header>
        <main class="pd-modal-body">
          <div class="cd-picker-hint">
            正在移动《{{ movingTarget.title || '未命名故事' }}》至：
          </div>
          <div class="cd-picker-list" role="radiogroup">
            <button
              v-for="c in collections.list.value"
              :key="c.id"
              type="button"
              class="cd-picker-item"
              :class="{ active: c.id === movingTargetCollectionId }"
              :style="{ '--pd-coll-color': c.coverColor }"
              @click="doMove(c.id)"
            >
              <span class="cd-picker-dot"></span>
              <span class="cd-picker-name">
                <Bookmark v-if="c.isDefault" :size="10" />
                {{ c.name }}
              </span>
              <span class="cd-picker-count">{{ c.storyCount }} 则</span>
            </button>
          </div>
        </main>
      </div>
    </div>
    </Transition>

    <!-- 故事详情 Modal：复用 StarDetail 不方便，做一个轻量的只读卡片 -->
    <Transition name="pd-modal">
    <div v-if="activeStory" class="pd-modal-mask" @click.self="activeStory = null">
      <div class="pd-modal-panel pd-story-panel">
        <header class="pd-modal-head">
          <div class="pd-story-head-title">
            <h3>{{ activeStory.title || '未命名故事' }}</h3>
            <span class="pd-story-catalog-badge" :style="tagStyle(activeStory.catalogStarName || '星')">
              ✦ {{ activeStory.catalogStarName || '自由星星' }}
            </span>
          </div>
          <button type="button" class="pd-modal-close" aria-label="关闭" @click="activeStory = null">×</button>
        </header>
        <main class="pd-modal-body">
          <div class="pd-story-meta-row">
            <span class="pd-story-meta-author">作者：{{ activeStory.username || '匿名旅人' }}</span>
            <span class="pd-story-meta-date">{{ formatDateTime(activeStory.createdAt) }}</span>
          </div>
          <div class="pd-story-content">
            <p v-for="(p, idx) in splitParagraphs(activeStory.content)" :key="idx">{{ p }}</p>
          </div>
          <div class="pd-story-tags-row" v-if="activeStory.tags && activeStory.tags.length">
            <span v-for="t in activeStory.tags" :key="t" class="pd-t-tag" :style="tagStyle(t)">#{{ t }}</span>
          </div>
          <div class="pd-story-metrics">
            <span><Sparkles :size="12" class="cd-metric-icon" /> 共鸣 {{ activeStory.resonanceCount }}</span>
            <span><Eye :size="11" class="cd-metric-icon" /> 浏览 {{ activeStory.viewCount }}</span>
          </div>
        </main>
        <footer class="pd-modal-foot">
          <button type="button" class="cd-back-btn" @click="openStoryOnStar(activeStory)">去星星页面查看</button>
          <button
            v-if="isOwner"
            type="button"
            class="cd-action-btn cd-primary"
            :disabled="movingId === activeStory.id"
            @click="openMovePicker(activeStory); activeStory = null"
          >
            {{ movingId === activeStory.id ? '移动中…' : '' }}
            <template v-if="movingId !== activeStory.id">
              <FolderKanban :size="12" /> <span>移动到合集</span>
            </template>
          </button>
        </footer>
      </div>
    </div>
    </Transition>

    <!-- 编辑合集 Modal（MVP 只允许改名 + 描述，先不做封面色 UI，未来扩展） -->
    <Transition name="pd-modal">
    <div v-if="showEdit" class="pd-modal-mask" @click.self="showEdit = false">
      <div class="pd-modal-panel pd-modal-sm">
        <header class="pd-modal-head">
          <h3>· EDIT · COLLECTION · 编辑合集 ·</h3>
          <button type="button" class="pd-modal-close" aria-label="关闭" @click="showEdit = false">×</button>
        </header>
        <main class="pd-modal-body">
          <div class="pd-modal-form-row">
            <label class="pd-modal-label">合集名称</label>
            <input v-model="editForm.name" maxlength="30" class="pd-modal-input" placeholder="新的名字…" />
          </div>
          <div class="pd-modal-form-row">
            <label class="pd-modal-label">描述</label>
            <input v-model="editForm.description" maxlength="200" class="pd-modal-input" placeholder="可留空" />
          </div>
          <p v-if="editError" class="pwd-error">{{ editError }}</p>
        </main>
        <footer class="pd-modal-foot">
          <button type="button" class="cd-back-btn" :disabled="editLoading" @click="showEdit = false">取消</button>
          <button type="button" class="cd-action-btn cd-primary"
            :disabled="editLoading || !editForm.name.trim()"
            @click="doEdit">
            {{ editLoading ? '保存中…' : '保存修改' }}
          </button>
        </footer>
      </div>
    </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Sparkles, Eye, FolderKanban, Bookmark, Globe, Lock } from 'lucide-vue-next'
import { useParticleSky } from '../composables/useParticleSky'
import { useAuth } from '../stores/auth'
import {
  useCollections,
  type Collection,
  type CollectionStats,
  type CollectionStory,
  type PagedResult,
} from '../composables/useCollections'

// —— 暴露给 Template 调用：从 useAuth 解构出 currentUserId computed ——
const auth = useAuth()
const currentUserId = computed<number | null>(() => auth.user.value?.id ?? null)

function _hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return h
}
function tagStyle(tag: string | null | undefined): Record<string, string> {
  if (!tag) return {}
  const h = Math.abs(_hashCode(tag)) % 360
  const color = `hsl(${h} 62% 74%)`
  const border = `hsla(${h}, 62%, 74%, 0.30)`
  const bg = `hsla(${h}, 62%, 74%, 0.05)`
  return { color, borderColor: border, backgroundColor: bg, border: '1px solid ' + border }
}
function splitParagraphs(s: string | null | undefined): string[] {
  if (!s) return []
  return s.split(/\n\s*\n/).filter((p) => p && p.trim()).length
    ? s.split(/\n\s*\n/).filter((p) => p && p.trim())
    : s.split(/\n/).filter((p) => p && p.trim())
}
function pad2(n: number) { return n < 10 ? '0' + n : '' + n }
function formatMD(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`
}
function formatDateTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
function shortCollName(name: string | null | undefined, max = 8): string {
  if (!name) return ''
  const n = name.trim()
  if (n.length <= max) return n
  return n.slice(0, max) + '…'
}

const route = useRoute()
const router = useRouter()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const { pause: pauseSky, resume: resumeSky } = useParticleSky(canvasRef)
let hoverCount = 0
function onCardEnter() { if (hoverCount++ === 0) pauseSky() }
function onCardLeave() { if (--hoverCount <= 0) { hoverCount = 0; resumeSky() } }

// 解析路由参数
const collectionId = computed<number | null>(() => {
  const raw = route.params.id
  if (Array.isArray(raw)) {
    const n = parseInt(raw[0], 10)
    return Number.isFinite(n) ? n : null
  }
  if (!raw) return null
  const n = parseInt(String(raw), 10)
  return Number.isFinite(n) ? n : null
})

const userIdRef = computed<number | null>(() => currentUserId.value ?? null)
const collections = useCollections(userIdRef)

// 状态
const heroLoading = ref(true)
const heroError = ref('')
const collection = ref<Collection | null>(null)
const stats = ref<CollectionStats | null>(null)
const statsOk = ref(false)
const isOwner = computed(() => collection.value && currentUserId.value && collection.value.userId === currentUserId.value)
const collectionAgeDays = computed(() => {
  if (!collection.value?.createdAt) return 0
  const d = new Date(collection.value.createdAt).getTime()
  if (Number.isNaN(d)) return 0
  return Math.max(0, Math.floor((Date.now() - d) / 86400000))
})
const heroGlowStyle = computed<Record<string, string>>(() => {
  const c = collection.value?.coverColor || '#ffd98a'
  return {
    background: `radial-gradient(60% 60% at 50% 40%, ${c}55, transparent 70%), radial-gradient(40% 40% at 70% 30%, #caa7ff44, transparent 70%)`,
  }
})

const pager = ref<{ page: number; limit: number; total: number; totalPages: number; hasMore: boolean }>({
  page: 0, limit: 20, total: 0, totalPages: 0, hasMore: false,
})
const stories = ref<CollectionStory[]>([])
const listLoading = ref(false)
const listError = ref('')

// UI state
const activeStory = ref<CollectionStory | null>(null)
const showMovePicker = ref(false)
const movingTarget = ref<CollectionStory | null>(null)
const movingId = ref<number | null>(null)
const movingTargetCollectionId = computed<number | null>(() => {
  if (!movingTarget.value || !collection.value) return null
  return collection.value.id
})

const showEdit = ref(false)
const editLoading = ref(false)
const editError = ref('')
const editForm = ref<{ name: string; description: string }>({ name: '', description: '' })

function goBack() {
  const referrer = String(route.query.from || '')
  if (referrer === 'profile') { router.push('/profile#pd-collections'); return }
  if (referrer === 'sky') { router.push('/sky'); return }
  router.push('/profile#pd-collections')
}
function goWrite() { router.push('/sky') }

async function loadHero() {
  const id = collectionId.value
  if (!id) { heroError.value = '合集不存在'; heroLoading.value = false; return }
  heroLoading.value = true
  heroError.value = ''
  statsOk.value = false
  // 合集详情从我的列表里找（只有自己的列表可写，但访问公开的就需要新的接口 → 用 stats 取基础元信息）
  // 优先从本地 collections.list 里找（自己的），找不到则请求 stats
  await collections.fetchList()
  const local = collections.list.value.find((c) => c.id === id)
  if (local) {
    collection.value = local
  }
  const st = await collections.getStats(id)
  if (!st.ok) {
    heroError.value = st.error
    heroLoading.value = false
    return
  }
  stats.value = st.data
  statsOk.value = true
  if (!collection.value) {
    // 不是自己的合集，但通过 stats 有基本元信息
    collection.value = {
      id: st.data.id,
      userId: userIdRef.value ?? 0,
      name: st.data.name,
      description: st.data.description,
      coverColor: st.data.coverColor,
      isDefault: st.data.isDefault,
      isPublic: st.data.isPublic,
      status: st.data.isPublic ? 'published' : 'draft',
      rejectReason: null,
      sortOrder: 0,
      storyCount: st.data.storyCount,
      totalResonance: st.data.totalResonance,
      totalViews: st.data.totalViews,
      createdAt: st.data.createdAt,
      updatedAt: st.data.updatedAt,
    }
  }
  heroLoading.value = false
}

async function loadFirstPage() {
  const id = collectionId.value
  if (!id) return
  listLoading.value = true
  listError.value = ''
  const r = await collections.getStoriesPaged(id, 1, pager.value.limit)
  listLoading.value = false
  if (!r.ok) {
    listError.value = r.error
    return
  }
  applyPage(r.data, true)
}
function applyPage(data: PagedResult, replace: boolean) {
  pager.value = {
    page: data.page,
    limit: data.limit,
    total: data.total,
    totalPages: data.totalPages,
    hasMore: data.page < data.totalPages,
  }
  if (replace) stories.value = data.items
  else stories.value = [...stories.value, ...data.items]
}
async function loadNextPage() {
  const id = collectionId.value
  if (!id || pager.value.hasMore === false) return
  listLoading.value = true
  const r = await collections.getStoriesPaged(id, pager.value.page + 1, pager.value.limit)
  listLoading.value = false
  if (!r.ok) {
    listError.value = r.error
    return
  }
  applyPage(r.data, false)
}

function openStory(s: CollectionStory) {
  activeStory.value = s
  // 记录故事浏览（复用 stories/:id/view）
  fetch(`/api/stars/story/${encodeURIComponent(s.id)}/view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => { /* ignore */ })
}

function openStoryOnStar(s: CollectionStory) {
  if (s.catalogStarId) {
    router.push({ path: '/sky', query: { star: String(s.catalogStarId), story: String(s.id) } })
  } else {
    router.push(`/sky`)
  }
}

function openMovePicker(s: CollectionStory) {
  if (!isOwner.value) return
  movingTarget.value = s
  showMovePicker.value = true
}
function closeMovePicker() {
  showMovePicker.value = false
  movingTarget.value = null
}
async function doMove(newCollId: number) {
  if (!movingTarget.value) return
  const sid = movingTarget.value.id
  movingId.value = sid
  const r = await collections.moveStory(sid, newCollId)
  movingId.value = null
  if (!r.ok) { alert(r.error); return }
  // 如果移动到当前合集之外 → 从列表中移除；否则刷新
  if (newCollId !== collectionId.value) {
    stories.value = stories.value.filter((x) => x.id !== sid)
    pager.value.total = Math.max(0, pager.value.total - 1)
  } else {
    loadFirstPage()
  }
  closeMovePicker()
  // 同步集合概览
  loadHero()
}

function startEdit() {
  if (!collection.value) return
  editForm.value = { name: collection.value.name, description: collection.value.description || '' }
  editError.value = ''
  showEdit.value = true
}
async function doEdit() {
  if (!collection.value) return
  const patch: { name: string; description?: string } = { name: editForm.value.name.trim() }
  if (editForm.value.description.trim()) patch.description = editForm.value.description.trim()
  else patch.description = ''
  editLoading.value = true
  editError.value = ''
  const r = await collections.patchCollection(collection.value.id, patch)
  editLoading.value = false
  if (!r.ok) { editError.value = r.error; return }
  showEdit.value = false
  loadHero()
}

// 路由变化 → 重载
watch(collectionId, () => {
  stories.value = []
  pager.value = { page: 0, limit: 20, total: 0, totalPages: 0, hasMore: false }
  loadHero()
  loadFirstPage()
})

onMounted(async () => {
  // 先拉一下 /me 拿到 userId，这样 collections 才知道加载谁的合集
  try { await auth.fetchMe() } catch { /* ignore */ }
  loadHero()
  loadFirstPage()
})
</script>

<style scoped>
.cd-page {
  min-height: 100vh;
  background: radial-gradient(1200px 600px at 50% -10%, rgba(80,60,140,0.45), transparent 60%),
              linear-gradient(180deg, #0b0d20 0%, #060714 60%, #030410 100%);
  color: #f2ecff;
  position: relative;
  overflow-x: hidden;
}
.cd-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.cd-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  background: rgba(6, 8, 22, 0.55);
  border-bottom: 1px solid rgba(255, 217, 138, 0.12);
}
.cd-back-btn {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 217, 138, 0.28);
  background: rgba(255, 217, 138, 0.06);
  color: #f6f1ff;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.3s;
}
.cd-back-btn:hover { background: rgba(255, 217, 138, 0.14); border-color: rgba(255, 217, 138, 0.55); }
.cd-brand {
  font-family: 'Cormorant Garamond', 'Songti SC', serif;
  font-size: 1.1rem;
  letter-spacing: 0.35em;
  color: rgba(255, 217, 138, 0.9);
}
.cd-actions { display: flex; gap: 10px; }
.cd-action-btn {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(202, 167, 255, 0.35);
  background: rgba(202, 167, 255, 0.06);
  color: #f6f1ff;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.3s;
}
.cd-action-btn:hover { border-color: rgba(202, 167, 255, 0.75); background: rgba(202, 167, 255, 0.15); }
.cd-action-btn.cd-primary { background: rgba(255, 217, 138, 0.14); border-color: rgba(255, 217, 138, 0.55); color: #fff4d6; }
.cd-action-btn:disabled, .cd-back-btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* Hero */
.cd-hero {
  position: relative;
  max-width: 1100px;
  margin: 0 auto;
  padding: 64px 32px 56px;
  text-align: center;
  z-index: 1;
}
.cd-hero-glow {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  mask-image: radial-gradient(80% 70% at 50% 35%, black 0%, transparent 70%);
  -webkit-mask-image: radial-gradient(80% 70% at 50% 35%, black 0%, transparent 70%);
}
.cd-hero > * { position: relative; z-index: 1; }

.cd-hero-placeholder, .cd-hero-error { padding: 60px 20px; color: rgba(202,167,255,0.6); letter-spacing: 0.15em; }
.cd-hero-error h3 { margin: 20px 0 30px; font-size: 1.05rem; color: #ff6b8a; letter-spacing: 0.2em; }

.cd-hero-ribbon {
  display: inline-flex;
  align-items: center;
  padding: 6px 16px;
  border-radius: 999px;
  background: rgba(149, 240, 192, 0.12);
  border: 1px solid rgba(149, 240, 192, 0.35);
  color: #95f0c0;
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  margin-bottom: 24px;
}
.cd-hero-ribbon.cd-ribbon-draft {
  background: rgba(255, 217, 138, 0.08);
  border-color: rgba(255, 217, 138, 0.35);
  color: #ffd98a;
}
.cd-hero-eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.4em;
  color: rgba(202, 167, 255, 0.6);
  margin: 0 0 14px;
}
.cd-hero-title {
  margin: 0;
  font-family: 'Cormorant Garamond', 'Songti SC', serif;
  font-size: 2.6rem;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0.08em;
  background: linear-gradient(180deg, #fff5d6 0%, #ffd98a 60%, #b99264 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 40px rgba(255, 217, 138, 0.15);
}
.cd-hero-desc {
  margin: 16px auto 28px;
  max-width: 720px;
  font-size: 0.88rem;
  line-height: 1.85;
  letter-spacing: 0.04em;
  color: rgba(202, 167, 255, 0.72);
}
.cd-hero-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  max-width: 680px;
  margin: 0 auto 30px;
}
.cd-stat {
  padding: 18px 10px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 217, 138, 0.16);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.cd-stat-num {
  font-family: 'Cormorant Garamond', 'Songti SC', serif;
  font-size: 2.2rem;
  line-height: 1;
  color: #fff5d6;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.cd-stat-label {
  font-size: 0.65rem;
  letter-spacing: 0.22em;
  color: rgba(202, 167, 255, 0.6);
}

.cd-top-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  max-width: 780px;
  margin: 0 auto 14px;
}
.cd-top-tag {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
}
.cd-top-catalogs {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  max-width: 820px;
  margin: 0 auto;
}
.cd-catalog-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(202, 167, 255, 0.07);
  border: 1px solid rgba(202, 167, 255, 0.2);
  font-size: 0.72rem;
  color: #f2ecff;
  letter-spacing: 0.08em;
}
.cd-catalog-dot { width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 10px currentColor; }
.cd-catalog-chip em { font-style: normal; opacity: 0.55; margin-left: 2px; }

/* Stories */
.cd-stories {
  position: relative;
  z-index: 1;
  max-width: 900px;
  margin: 0 auto;
  padding: 10px 32px 120px;
}
.cd-stories-head { text-align: center; margin-bottom: 32px; }
.cd-stories-head h2 {
  font-family: 'Cormorant Garamond', 'Songti SC', serif;
  font-size: 1.4rem;
  letter-spacing: 0.3em;
  color: #ffd98a;
  margin: 0 0 8px;
}
.cd-stories-head p { color: rgba(202, 167, 255, 0.55); font-size: 0.78rem; letter-spacing: 0.08em; margin: 0; }

.cd-story-list { display: flex; flex-direction: column; gap: 16px; }
.cd-story-card {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: start;
  padding: 22px 24px;
  border-radius: 18px;
  background: rgba(16, 18, 40, 0.7);
  border: 1px solid rgba(255, 217, 138, 0.18);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;
  transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s;
  outline: none;
  animation: cd-fade-up 0.5s both ease;
}
@keyframes cd-fade-up {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}
.cd-story-card:hover, .cd-story-card:focus-visible {
  transform: translateY(-4px);
  border-color: rgba(255, 217, 138, 0.5);
  box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 0 30px rgba(255,217,138,0.1);
}

.cd-story-left {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  width: fit-content;
}
.cd-story-dot {
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--cd-dot, #ffd98a);
  box-shadow: 0 0 12px var(--cd-dot, #ffd98a);
  flex-shrink: 0;
}
.cd-story-catalog {
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  color: rgba(202,167,255,0.72);
  font-family: 'Cormorant Garamond', 'Songti SC', serif;
}

.cd-story-title {
  margin: 0 0 8px;
  font-size: 1.08rem;
  color: #fff5d6;
  letter-spacing: 0.05em;
  font-family: 'Cormorant Garamond', 'Songti SC', serif;
  line-height: 1.4;
}
.cd-story-content {
  margin: 0 0 14px;
  font-size: 0.84rem;
  line-height: 1.85;
  color: rgba(242, 236, 255, 0.78);
  letter-spacing: 0.04em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cd-story-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.cd-story-tags { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.cd-story-tag {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.66rem;
  letter-spacing: 0.05em;
}
.cd-story-meta { display: inline-flex; gap: 14px; font-size: 0.7rem; color: rgba(202,167,255,0.55); letter-spacing: 0.08em; }
.cd-story-meta em { font-style: normal; display: inline-flex; align-items: center; gap: 4px; }
.cd-story-meta-icon { flex-shrink: 0; }
.cd-story-foot-left { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1; min-width: 0; }
.cd-story-coll {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(202, 167, 255, 0.08);
  border: 1px solid rgba(202, 167, 255, 0.22);
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  color: rgba(242, 236, 255, 0.82);
  max-width: 180px;
}
.cd-story-coll-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 8px rgba(255, 255, 255, 0.35); }
.cd-story-coll-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.cd-move-btn {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(202, 167, 255, 0.08);
  border: 1px solid rgba(202, 167, 255, 0.3);
  color: #f2ecff;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.3s;
  flex-shrink: 0;
}
.cd-move-btn:hover:not(:disabled) {
  border-color: rgba(202, 167, 255, 0.75);
  background: rgba(202, 167, 255, 0.18);
}
.cd-move-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.cd-loadmore { text-align: center; padding: 30px 0 0; }

/* Move picker */
.cd-picker-hint {
  font-size: 0.78rem;
  color: rgba(202,167,255,0.7);
  margin-bottom: 14px;
  letter-spacing: 0.05em;
}
.cd-picker-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 52vh;
  overflow-y: auto;
}
.cd-picker-item {
  display: grid;
  grid-template-columns: 16px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,217,138,0.15);
  cursor: pointer;
  transition: all 0.3s;
  color: #f2ecff;
  font-size: 0.8rem;
  text-align: left;
}
.cd-picker-item:hover { border-color: rgba(255,217,138,0.4); background: rgba(255,217,138,0.06); }
.cd-picker-item.active {
  border-color: color-mix(in srgb, var(--pd-coll-color, #ffd98a) 70%, var(--pd-gold, #ffd98a));
  background: color-mix(in srgb, var(--pd-coll-color, #ffd98a) 10%, transparent);
}
.cd-picker-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--pd-coll-color, #ffd98a);
  box-shadow: 0 0 10px var(--pd-coll-color, #ffd98a);
}
.cd-picker-name { display: inline-flex; align-items: center; gap: 6px; letter-spacing: 0.05em; }
.cd-picker-count { color: rgba(202,167,255,0.55); font-size: 0.72rem; }

/* 与 ProfilePage 共用的模态层：复用类名，但 scoped 需要重新覆盖部分细节 */
.pd-modal-mask { position: fixed; inset: 0; z-index: 200; background: rgba(5,6,15,0.72); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; }
.pd-modal-panel {
  background: rgba(16, 18, 40, 0.92);
  border: 1px solid rgba(255,217,138,0.25);
  border-radius: 18px;
  width: min(560px, 94vw);
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 30px 80px rgba(0,0,0,0.5);
}
.pd-modal-sm { width: min(480px, 92vw); }
.pd-story-panel { width: min(720px, 94vw); }
.pd-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(255,217,138,0.15);
}
.pd-modal-head h3 {
  margin: 0;
  font-family: 'Cormorant Garamond', 'Songti SC', serif;
  font-size: 1.0rem;
  letter-spacing: 0.25em;
  color: #ffd98a;
}
.pd-modal-close {
  width: 28px; height: 28px; border-radius: 50%;
  background: transparent; color: rgba(202,167,255,0.7);
  border: 1px solid rgba(202,167,255,0.3); font-size: 1.0rem; line-height: 1;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.pd-modal-close:hover { color: #ff6b8a; border-color: #ff6b8a; }

.pd-modal-body { padding: 22px; }
.pd-modal-form-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.pd-modal-label {
  font-size: 0.72rem; letter-spacing: 0.25em; color: rgba(202,167,255,0.7);
}
.pd-modal-input {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,217,138,0.2);
  border-radius: 10px;
  padding: 10px 14px;
  color: #f2ecff;
  font-size: 0.88rem;
  letter-spacing: 0.05em;
  outline: none;
  transition: all 0.3s;
}
.pd-modal-input:focus { border-color: rgba(255,217,138,0.65); background: rgba(255,217,138,0.05); }

.pd-story-head-title { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; flex: 1; }
.pd-story-head-title h3 { font-family: 'Cormorant Garamond', 'Songti SC', serif; color: #fff5d6; background: none; -webkit-text-fill-color: initial; font-size: 1.35rem; letter-spacing: 0.05em; }
.pd-story-catalog-badge {
  display: inline-flex; padding: 4px 10px; border-radius: 999px; font-size: 0.7rem; letter-spacing: 0.08em;
}
.pd-story-meta-row {
  display: flex; justify-content: space-between; gap: 10px;
  font-size: 0.72rem; letter-spacing: 0.15em; color: rgba(202,167,255,0.55);
  margin-bottom: 18px; flex-wrap: wrap;
}
.pd-story-content p {
  margin: 0 0 14px;
  font-size: 0.92rem; line-height: 1.95; letter-spacing: 0.05em; color: #f2ecff;
  white-space: pre-wrap;
}
.pd-story-tags-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.pd-t-tag { padding: 4px 12px; border-radius: 999px; font-size: 0.7rem; }
.pd-story-metrics {
  display: flex; gap: 22px; margin-top: 16px;
  padding-top: 16px; border-top: 1px dashed rgba(255,217,138,0.18);
  color: rgba(202,167,255,0.65); font-size: 0.78rem; letter-spacing: 0.1em;
}
.pd-modal-foot {
  display: flex; justify-content: flex-end; gap: 10px; padding: 0 22px 22px; flex-wrap: wrap;
}

.pd-empty-orb {
  width: 70px; height: 70px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 18px;
  font-family: 'Cormorant Garamond', 'Songti SC', serif; font-size: 1.8rem; color: #caa7ff;
  background: radial-gradient(circle, rgba(255,217,138,0.15), transparent 70%);
  border: 1px solid rgba(255,217,138,0.2);
  box-shadow: 0 0 30px rgba(255,217,138,0.08);
}
.pd-empty-title { font-size: 1.0rem; color: #fff5d6; margin: 0 0 8px; letter-spacing: 0.12em; }
.pd-empty-sub { font-size: 0.8rem; color: rgba(202,167,255,0.6); margin: 0 0 24px; letter-spacing: 0.06em; }
.pd-bottom-hint { text-align: center; padding: 30px 0 0; color: rgba(202,167,255,0.4); font-size: 0.7rem; letter-spacing: 0.2em; }
.pd-empty { padding: 40px 20px; text-align: center; }
.pwd-error { color: #ff6b8a; font-size: 0.8rem; letter-spacing: 0.05em; margin: 8px 0 0; }

.pd-modal-enter-active, .pd-modal-leave-active { transition: opacity 300ms ease; }
.pd-modal-enter-from, .pd-modal-leave-to { opacity: 0; }

/* 响应式 */
@media (max-width: 768px) {
  .cd-topbar { padding: 12px 16px; }
  .cd-brand { display: none; }
  .cd-hero { padding: 48px 18px 44px; }
  .cd-hero-title { font-size: 2.1rem; }
  .cd-hero-desc { font-size: 0.82rem; }
  .cd-hero-stats { grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; max-width: 520px; }
  .cd-stat-num { font-size: 1.7rem; }
  .cd-stories { padding: 6px 16px 100px; }
  .cd-story-card {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    padding: 18px 16px;
    gap: 12px;
  }
  .cd-story-left {
    flex-direction: row; align-items: center; gap: 8px;
    border: none;
    padding: 0;
    min-height: 0;
    margin-bottom: 8px;
  }
  .cd-move-btn { justify-self: flex-end; }
  .pd-modal-mask { align-items: flex-end; }
  .pd-modal-panel { border-radius: 18px 18px 0 0; width: 100vw !important; max-width: 100vw !important; }
  .pd-modal-enter-from .pd-modal-panel,
  .pd-modal-leave-to .pd-modal-panel { transform: translateY(100%); }
}

@media (max-width: 380px) {
  .cd-hero-title { font-size: 1.7rem; }
  .cd-story-title { font-size: 0.98rem; }
}
</style>
