<template>
  <div class="folios-page">
    <!-- 背景：银河渐变（同 SkyPage 夜色，不耦合 Three.js） -->
    <div class="fs-bg" aria-hidden="true">
      <div class="fs-bg-milky"></div>
      <div class="fs-bg-stars"></div>
    </div>

    <!-- ═══════ 顶部 Sticky 导航栏 ═══════ -->
    <header class="fs-top">
      <div class="fs-top-left">
        <button class="fs-back" @click="goBack" aria-label="返回上一页">
          <ChevronLeft :size="16" />
        </button>
        <div class="fs-brand">
          <Sparkles :size="14" class="fs-brand-icon" />
          <span class="fs-brand-title">穹庭书局</span>
          <span class="fs-brand-sub">· FOLIO SQUARE ·</span>
        </div>
      </div>
      <div class="fs-top-mid">
        <div class="fs-search">
          <Search :size="12" class="fs-search-icon" />
          <input
            v-model="searchQuery"
            class="fs-search-input"
            type="search"
            placeholder="搜索星笺 / 故事 / 作者…（P2 启用）"
            disabled
          />
        </div>
      </div>
      <div class="fs-top-right">
        <button v-if="canCreate" class="fs-btn fs-btn-warm" type="button" @click="goProfileNewFolio">
          <Plus :size="12" />
          <span>写星笺</span>
        </button>
        <button class="fs-btn fs-btn-glass" type="button" @click="reloadAll">
          <RotateCcw :size="12" />
          <span>刷新</span>
        </button>
        <button class="fs-btn fs-btn-glass" type="button" @click="goSky">
          <Orbit :size="12" />
          <span>回天际</span>
        </button>
      </div>
    </header>

    <main class="fs-main">
      <!-- ═══════ 卷目筛选条（sticky 第二排） ═══════ -->
      <section class="fs-filters" aria-label="星笺筛选">
        <div class="fs-volumes" role="tablist">
          <button
            v-for="v in VOLUME_TABS"
            :key="v.key"
            type="button"
            class="fs-volume-btn"
            :class="{ active: activeVolume === v.key }"
            @click="setVolume(v.key)"
          >
            <component :is="v.icon" :size="11" />
            <span>{{ v.label }}</span>
            <span v-if="v.count != null" class="fs-volume-count">{{ v.count }}</span>
          </button>
        </div>
        <div class="fs-sorts">
          <label class="fs-sort-label">
            <ArrowUpDown :size="10" />
            <span>排序</span>
          </label>
          <select v-model="activeSort" class="fs-sort-select" aria-label="排序方式">
            <option v-for="s in SORTS" :key="s.key" :value="s.key">{{ s.label }}</option>
          </select>
        </div>
      </section>

      <!-- ═══════ ① 官方星河·八卷轴（横滑） ═══════ -->
      <section v-if="galaxyReels.length || galaxyLoading" class="fs-reels-section" aria-label="官方星河八卷">
        <header class="fs-section-head">
          <div class="fs-head-left">
            <Landmark :size="14" class="fs-head-icon fs-head-gold" />
            <h2 class="fs-head-title">官方星河·八卷轴</h2>
            <span class="fs-head-sub">官方整理·历朝历代的星语心事</span>
          </div>
          <button type="button" class="fs-head-link" @click="setVolume('galaxy')">
            查看全部星河卷 →
          </button>
        </header>
        <div v-if="galaxyLoading" class="fs-reels fs-reels-loading">
          <div v-for="i in 6" :key="i" class="fs-reel fs-reel-skel"></div>
        </div>
        <div v-else class="fs-reels" ref="reelsScrollerRef">
          <button
            type="button"
            class="fs-reels-nav fs-reels-nav-left"
            :disabled="!canScrollLeft"
            @click="scrollReels(-1)"
            aria-label="向左翻卷"
          >
            <ChevronLeft :size="16" />
          </button>
          <div class="fs-reels-track">
            <article
              v-for="g in galaxyReels"
              :key="g.id"
              class="fs-reel"
              :style="{ '--r-color': g.coverColor || '#E8B86D' }"
              @click="openDetail(g)"
            >
              <div class="fs-reel-banner">
                <span class="fs-reel-num">卷 {{ reelOrderLabel(g) }}</span>
                <span class="fs-reel-count">{{ g.storyCount ?? 0 }} 则</span>
              </div>
              <div class="fs-reel-body">
                <Library :size="18" class="fs-reel-lib-icon" />
                <h3 class="fs-reel-name">{{ g.name }}</h3>
                <p v-if="g.description" class="fs-reel-desc">{{ g.description }}</p>
                <p v-else class="fs-reel-desc is-empty">官方藏卷，待开卷细读…</p>
              </div>
              <div class="fs-reel-foot">
                <span class="fs-reel-tag">🌌 星河卷</span>
                <span class="fs-reel-read">开卷 →</span>
              </div>
            </article>
          </div>
          <button
            type="button"
            class="fs-reels-nav fs-reels-nav-right"
            :disabled="!canScrollRight"
            @click="scrollReels(1)"
            aria-label="向右翻卷"
          >
            <ChevronRight :size="16" />
          </button>
        </div>
      </section>

      <!-- ═══════ ② 本周推荐·三笺（P1：先接 /picks 前 3 条，以后接 AI 荐语） ═══════ -->
      <section v-if="picks.length || picksLoading" class="fs-picks-section" aria-label="本周推荐星笺">
        <header class="fs-section-head">
          <div class="fs-head-left">
            <Sparkles :size="14" class="fs-head-icon fs-head-spark" />
            <h2 class="fs-head-title">本周推荐·三笺</h2>
            <span class="fs-head-sub">三册最适合今夜开卷的星笺</span>
          </div>
          <span class="fs-head-hint">每 7 日更新 · Picks</span>
        </header>
        <div v-if="picksLoading" class="fs-picks fs-picks-loading">
          <div v-for="i in 3" :key="i" class="fs-pick fs-pick-skel"></div>
        </div>
        <div v-else class="fs-picks">
          <article
            v-for="(p, i) in picks"
            :key="p.id"
            class="fs-pick"
            :class="{ anonymous: p.visibility === 'anonymous', galaxy: p.visibility === 'galaxy' }"
            :style="{ '--p-color': p.coverColor || pickCoverColor(i) }"
            @click="openDetail(p)"
          >
            <div class="fs-pick-cover">
              <span class="fs-pick-ribbon">Top·{{ i + 1 }}</span>
              <BookOpen :size="26" class="fs-pick-open" />
            </div>
            <div class="fs-pick-body">
              <div class="fs-pick-title-row">
                <h3 class="fs-pick-name">{{ p.name }}</h3>
                <span
                  v-if="p.visibility === 'galaxy'" class="fs-pick-tag fs-pick-tag-galaxy"><Sparkles :size="9" />星河</span>
                <span
                  v-else-if="p.visibility === 'anonymous'" class="fs-pick-tag fs-pick-tag-anonymous"><Ghost :size="9" />匿名</span>
                <span
                  v-else class="fs-pick-tag fs-pick-tag-public"><Globe :size="9" />公开</span>
              </div>
              <div class="fs-pick-author">
                <template v-if="p.visibility === 'anonymous'">
                  <Ghost :size="9" />匿名观星者
                </template>
                <template v-else-if="p.userId === 0">
                  <Landmark :size="9" />星穹守护
                </template>
                <template v-else>
                  <User :size="9" />
                  观星者 <code>#{{ p.userId }}</code>
                </template>
              </div>
              <p v-if="p.description" class="fs-pick-desc">{{ p.description }}</p>
              <p v-else class="fs-pick-desc is-empty">作者未填描述，开卷见真意…</p>
              <div class="fs-pick-meta">
                <span class="fs-pick-meta-item"><Library :size="10" /> {{ p.storyCount ?? 0 }} 则</span>
                <span v-if="typeof (p as any).resonanceTotal === 'number' && (p as any).resonanceTotal > 0" class="fs-pick-meta-item fs-pick-meta-res">
                  <Heart :size="10" /> {{ (p as any).resonanceTotal }} 共鸣
                </span>
                <span class="fs-pick-open-btn">开卷细读 →</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- ═══════ ③ 星笺书架（栅格 + 无限滚动） ═══════ -->
      <section class="fs-shelf-section" aria-label="星笺书架">
        <header class="fs-section-head">
          <div class="fs-head-left">
            <BookMarked :size="14" class="fs-head-icon fs-head-blue" />
            <h2 class="fs-head-title">{{ volumeTabLabel }}</h2>
            <span class="fs-head-sub">{{ volumeTotalLabel }}</span>
          </div>
          <span class="fs-head-hint">{{ shelfList.length }} 册已加载</span>
        </header>

        <FolioGrid
          :collections="shelfListWithOwner"
          :loading="shelfLoading && shelfList.length === 0"
          :error="shelfError"
          :editable="false"
          :show-action-bar="false"
          :show-owner="true"
          density="cozy"
          @open="openDetail"
        >
          <template #empty>
            <div class="fs-shelf-empty">
              <Library :size="22" class="fg-empty-icon" />
              <p class="cg-empty-title">这一卷还没有星笺…</p>
              <p class="cg-empty-sub">
                {{ activeVolume === 'all' ? '切换其他卷类看看，或先回天际写下第一则故事吧。' : '切换回全部，或过些日子再来逛逛。' }}
              </p>
              <button type="button" class="fs-btn fs-btn-warm" style="margin-top: 10px" @click="setVolume('all')">
                ← 回到全部星笺
              </button>
            </div>
          </template>
        </FolioGrid>

        <!-- 加载更多（触底自动 loadMore，同时给手动按钮兜底） -->
        <div v-if="shelfLoading && shelfList.length > 0" class="fs-loadmore">
          <RotateCcw :size="12" class="spin-slow" />加载下一卷匣…
        </div>
        <div v-else-if="shelfHasMore" class="fs-loadmore-hint">
          <button type="button" class="fs-btn fs-btn-glass" @click="loadNextPage">点此加载更多 →</button>
          <span class="fs-loadmore-auto">· 滚动到底自动续取</span>
        </div>
        <div v-else-if="!shelfLoading && shelfList.length > 0" class="fs-end-reach">
          — 已经是最后一卷了 · END —
        </div>
      </section>

      <!-- ═══════ 页脚·数据总览胶囊 ═══════ -->
      <footer class="fs-foot">
        <span class="fs-foot-chip">📚 共 <b>{{ totalFolios }}</b> 册星笺</span>
        <span class="fs-foot-chip">✨ 共 <b>{{ totalStories }}</b> 则故事</span>
        <span class="fs-foot-chip">🌌 官方星河 <b>{{ galaxyCount }}</b> 卷</span>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronLeft, ChevronRight, Sparkles, Search, Plus, RotateCcw, Orbit,
  Landmark, Library, BookOpen, BookMarked, Heart, Globe, Ghost, User,
  ArrowUpDown, Flame, Clock, Hash,
} from 'lucide-vue-next'
import FolioGrid, { type FolioLike } from '../components/FolioGrid.vue'
import { authFetch, authHeaders, useAuth } from '../stores/auth'
import type { Collection } from '../composables/useCollections'

const route = useRoute()
const router = useRouter()
const { user: authUser } = useAuth()

/* ─── 筛选 / 排序 tab 定义 ─── */
type VolumeKey = 'all' | 'galaxy' | 'public' | 'anonymous'
type SortKey = 'hot' | 'new' | 'resonance' | 'stories_desc' | 'name_asc'

const VOLUME_TABS: { key: VolumeKey; label: string; icon: any; count: number | null }[] = [
  { key: 'all',       label: '全部卷',   icon: Library,  count: null },
  { key: 'galaxy',    label: '官方星河', icon: Landmark, count: null },
  { key: 'public',    label: '星友新作', icon: Globe,    count: null },
  { key: 'anonymous', label: '匿名手记', icon: Ghost,    count: null },
]
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'hot',            label: '综合热度' },
  { key: 'resonance',      label: '共鸣次数' },
  { key: 'stories_desc',   label: '故事最多' },
  { key: 'new',            label: '最近创建' },
  { key: 'name_asc',       label: '名称 A→Z' },
]

const activeVolume = ref<VolumeKey>(
  (route.query.volume as VolumeKey) && VOLUME_TABS.find(v => v.key === route.query.volume)
    ? (route.query.volume as VolumeKey)
    : 'all'
)
const activeSort = ref<SortKey>(
  (route.query.sort as SortKey) && SORTS.find(s => s.key === route.query.sort)
    ? (route.query.sort as SortKey)
    : 'hot'
)
function setVolume(v: VolumeKey) {
  activeVolume.value = v
  resetShelf()
  fetchShelfPage(1)
}

/* ─── 计数/标签辅助 ─── */
const galaxyCount = ref(0)
const totalFolios = ref(0)
const totalStories = ref(0)
const volumeTabLabel = computed(() => VOLUME_TABS.find(v => v.key === activeVolume.value)?.label ?? '星笺书架')
const volumeTotalLabel = computed(() => {
  if (activeVolume.value === 'galaxy') return `共 ${galaxyCount.value} 卷官方藏卷`
  if (activeVolume.value === 'public') return '所有公开的星友星笺'
  if (activeVolume.value === 'anonymous') return '匿名观星者们写下的手记'
  return `共 ${totalFolios.value} 册公开星笺 · ${totalStories.value} 则故事`
})

/* ─── 搜索（P2 预留） ─── */
const searchQuery = ref('')

/* ─── 权限：登录且非访客才能新建 ─── */
const canCreate = computed(() => authUser.value && authUser.value.username !== '星穹访客')

/* ─── 官方星河八卷轴（横滑） ─── */
const galaxyReels = ref<Collection[]>([])
const galaxyLoading = ref(false)
const reelsScrollerRef = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function reelOrderLabel(g: any) {
  const sort = Number(g.sortOrder)
  if (!isNaN(sort) && sort >= 0 && sort < 8) {
    return ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌'][sort]
  }
  return String(sort + 1)
}

function scrollReels(dir: -1 | 1) {
  const track = reelsScrollerRef.value?.querySelector<HTMLElement>('.fs-reels-track')
  if (!track) return
  const delta = Math.round(track.clientWidth * 0.7) * dir
  track.scrollBy({ left: delta, behavior: 'smooth' })
}

function updateReelButtons() {
  const track = reelsScrollerRef.value?.querySelector<HTMLElement>('.fs-reels-track')
  if (!track) return
  canScrollLeft.value = track.scrollLeft > 4
  canScrollRight.value = track.scrollLeft < (track.scrollWidth - track.clientWidth - 4)
}

async function fetchGalaxyReels() {
  galaxyLoading.value = true
  try {
    const res = await authFetch('/api/collections/public?visibility=galaxy&page=1&limit=12&sort=stories_desc')
    const json = await res.json()
    if (res.ok) {
      const list = (json.data?.items ?? []) as Collection[]
      galaxyReels.value = list
      galaxyCount.value = json.data?.total ?? list.length
      totalStories.value += list.reduce((s, x) => s + (x.storyCount ?? 0), 0)
    }
  } finally {
    galaxyLoading.value = false
    requestAnimationFrame(updateReelButtons)
  }
}

/* ─── 本周推荐三笺（/picks） ─── */
const picks = ref<Collection[]>([])
const picksLoading = ref(false)

function pickCoverColor(i: number) {
  return ['#E8B86D', '#CAA7FF', '#F4A8B8', '#7AB8F0', '#95E0C0', '#FFD98A'][i % 6]
}

async function fetchPicks() {
  picksLoading.value = true
  try {
    const res = await authFetch('/api/collections/picks?wanted=6&galaxyN=3')
    const json = await res.json()
    if (res.ok) picks.value = (json.data ?? []) as Collection[]
  } finally {
    picksLoading.value = false
  }
}

/* ─── 星笺书架（分页 + 无限滚动） ─── */
const shelfList = ref<Collection[]>([])
const shelfLoading = ref(false)
const shelfError = ref<string | null>(null)
const shelfPage = ref(1)
const shelfTotalPages = ref(0)
const shelfPageSize = 24
const shelfHasMore = computed(() => shelfPage.value < shelfTotalPages.value)

const shelfListWithOwner = computed<FolioLike[]>(() => shelfList.value.map(c => ({
  ...c,
  id: c.id, name: c.name, description: c.description,
  coverColor: c.coverColor, visibility: c.visibility,
  storyCount: c.storyCount, resonanceTotal: (c as any).resonanceTotal ?? null,
  updatedAt: c.updatedAt, createdAt: c.createdAt,
  userId: c.userId, owner: null,
})))

function resetShelf() {
  shelfList.value = []
  shelfPage.value = 1
  shelfTotalPages.value = 0
  shelfError.value = null
}

async function fetchShelfPage(page: number) {
  shelfLoading.value = true
  shelfError.value = null
  try {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(shelfPageSize))
    params.set('sort', activeSort.value)
    if (activeVolume.value !== 'all') params.set('visibility', activeVolume.value)
    const res = await authFetch('/api/collections/public?' + params.toString(), { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message || '加载失败')
    const d = json.data || {}
    shelfTotalPages.value = d.totalPages ?? Math.ceil((d.total ?? 0) / shelfPageSize)
    const items: Collection[] = d.items ?? []
    if (page === 1) {
      shelfList.value = items
      totalFolios.value = d.total ?? items.length
      // 全部卷时累计一下故事数（其他卷就不重复加了，避免重复 double count）
      if (activeVolume.value === 'all' && galaxyReels.value.length === 0) {
        totalStories.value = items.reduce((s, x) => s + (x.storyCount ?? 0), 0)
      }
    } else {
      const seen = new Set(shelfList.value.map(x => x.id))
      shelfList.value.push(...items.filter(x => !seen.has(x.id)))
    }
    shelfPage.value = page
  } catch (e: any) {
    shelfError.value = e.message || '加载失败，请稍后再试'
  } finally {
    shelfLoading.value = false
  }
}

function loadNextPage() {
  if (shelfLoading.value || !shelfHasMore.value) return
  fetchShelfPage(shelfPage.value + 1)
}

/* ─── 总览数据 + 初次拉取 ─── */
async function reloadAll() {
  resetShelf()
  galaxyReels.value = []
  picks.value = []
  totalFolios.value = 0
  totalStories.value = 0
  await Promise.all([fetchGalaxyReels(), fetchPicks()])
  await fetchShelfPage(1)
}

/* ─── 跳转 ─── */
function goBack() {
  // 优先走 history.back；如果栈浅（直接进来的）则回 /sky
  if (window.history.length > 1) router.back()
  else router.push('/sky')
}
function goSky() { router.push('/sky') }
function goProfileNewFolio() { router.push({ path: '/profile', hash: '#pd-collections' }) }
function openDetail(c: { id: number }) {
  router.push(`/folios/${c.id}`)
}

/* ─── 无限滚动监听（IntersectionObserver） ─── */
const sentinel = ref<HTMLElement | null>(null)
let io: IntersectionObserver | null = null

function attachInfiniteScroll() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
  if (!document) return
  // sentinel：用 .fs-loadmore-hint 做目标，找不到就在末尾创建个空 div
  setTimeout(() => {
    const el = document.querySelector('.fs-shelf-section') as HTMLElement | null
    if (!el) return
    let target = el.querySelector<HTMLElement>('.fs-loadmore-hint, .fs-loadmore')
    if (!target) {
      target = document.createElement('div')
      target.className = 'fs-infinite-sentinel'
      target.style.height = '1px'
      el.appendChild(target)
    }
    sentinel.value = target
    io = new IntersectionObserver((entries) => {
      const e = entries[0]
      if (e.isIntersecting && shelfHasMore.value && !shelfLoading.value) {
        loadNextPage()
      }
    }, { rootMargin: '240px 0px 240px 0px' })
    io.observe(target)
  }, 100)
}

function updateVolumeCountsQuick() {
  // 简单估算：从 /picks?wanted=1&galaxyN=0 不拿了，改为复用已加载的 shelf/galaxy 数据
  VOLUME_TABS[1].count = galaxyCount.value || null
}

/* ─── reels track 滚动事件 ─── */
let reelsScrollRaf = 0
function onReelsTrackScroll() {
  if (reelsScrollRaf) cancelAnimationFrame(reelsScrollRaf)
  reelsScrollRaf = requestAnimationFrame(updateReelButtons)
}

onMounted(() => {
  reloadAll().finally(attachInfiniteScroll)
  // reels scroll 监听
  setTimeout(() => {
    const track = reelsScrollerRef.value?.querySelector<HTMLElement>('.fs-reels-track')
    track?.addEventListener('scroll', onReelsTrackScroll, { passive: true })
  }, 200)
})
onBeforeUnmount(() => {
  io?.disconnect()
  io = null
  const track = reelsScrollerRef.value?.querySelector<HTMLElement>('.fs-reels-track')
  track?.removeEventListener('scroll', onReelsTrackScroll)
})

/* 暴露一个只读的计数 state 辅助（以后可以放 store） */
updateVolumeCountsQuick()
</script>

<style scoped>
/* ═══ 背景：银河夜色 ═══ */
.folios-page {
  position: relative;
  min-height: 100vh;
  width: 100%;
  background:
    radial-gradient(1200px 600px at 15% -10%, rgba(82, 88, 150, 0.26), transparent 60%),
    radial-gradient(900px 520px at 95% 5%, rgba(183, 136, 98, 0.14), transparent 60%),
    linear-gradient(180deg, #0b0b1a 0%, #0a0b1c 40%, #0b0b1a 100%);
  color: #f0f0fa;
  overflow-x: hidden;
  font-family: inherit;
  padding: 0 0 80px;
}
.fs-bg {
  position: fixed; inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}
.fs-bg-milky {
  position: absolute;
  top: -10vh; left: -10vw;
  width: 120vw; height: 120vh;
  background:
    radial-gradient(400px 300px at 60% 40%, rgba(255, 234, 184, 0.05), transparent 60%),
    radial-gradient(500px 300px at 25% 80%, rgba(138, 127, 206, 0.05), transparent 60%);
  filter: blur(20px);
}
.fs-bg-stars {
  position: absolute; inset: 0;
  background-image:
    radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.6), transparent 50%),
    radial-gradient(1px 1px at 120px 80px, rgba(255,255,255,0.5), transparent 50%),
    radial-gradient(1.5px 1.5px at 260px 200px, rgba(255, 229, 168, 0.7), transparent 50%),
    radial-gradient(1px 1px at 380px 120px, rgba(255,255,255,0.4), transparent 50%),
    radial-gradient(1px 1px at 520px 280px, rgba(189, 208, 255, 0.6), transparent 50%),
    radial-gradient(1.2px 1.2px at 680px 40px, rgba(255,255,255,0.5), transparent 50%);
  background-repeat: repeat;
  background-size: 800px 320px;
  opacity: 0.55;
  animation: fsTwinkle 9s ease-in-out infinite alternate;
}
@keyframes fsTwinkle {
  0% { opacity: 0.4; } 100% { opacity: 0.72; }
}

/* ═══ 主内容：相对定位，盖在背景上 ═══ */
.fs-main {
  position: relative;
  z-index: 1;
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 76px 20px 40px;
}

/* ═══ 顶部 Sticky Bar ═══ */
.fs-top {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 50;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 10px 20px;
  backdrop-filter: blur(12px);
  background: linear-gradient(180deg, rgba(10,11,28,0.78) 0%, rgba(10,11,28,0.42) 80%, rgba(10,11,28,0) 100%);
  border-bottom: 0.5px solid rgba(255,255,255,0.05);
}
.fs-top-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.fs-back {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
  border: 0.5px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.78);
  cursor: pointer;
  transition: background .15s, transform .15s;
}
.fs-back:hover { background: rgba(255,217,138,0.12); color: #ffe5a8; transform: translateX(-1px); }
.fs-brand { display: flex; align-items: center; gap: 7px; }
.fs-brand-icon { color: #ffd98a; filter: drop-shadow(0 0 6px rgba(255, 217, 138, 0.4)); }
.fs-brand-title {
  font-size: 0.98rem; font-weight: 700; letter-spacing: 0.06em;
  color: #fff6dd;
}
.fs-brand-sub {
  font-size: 0.66rem; letter-spacing: 0.2em;
  color: rgba(255,255,255,0.32);
  padding-left: 4px;
}

.fs-top-mid { display: flex; align-items: center; justify-content: center; }
.fs-search {
  display: inline-flex; align-items: center; gap: 8px;
  width: min(520px, 100%);
  padding: 7px 12px;
  border-radius: 100px;
  background: rgba(255,255,255,0.04);
  border: 0.5px solid rgba(255,255,255,0.08);
  transition: border-color .15s, background .15s;
}
.fs-search:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,217,138,0.22); }
.fs-search-icon { color: rgba(255,255,255,0.4); flex-shrink: 0; }
.fs-search-input {
  flex: 1; min-width: 0;
  border: none; outline: none; background: transparent;
  font-family: inherit;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.84);
}
.fs-search-input::placeholder { color: rgba(255,255,255,0.24); }
.fs-search-input:disabled { cursor: not-allowed; opacity: 0.6; }

.fs-top-right { display: flex; align-items: center; gap: 8px; }
.fs-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 32px;
  padding: 0 12px;
  border-radius: 100px;
  font-family: inherit;
  font-size: 0.74rem;
  cursor: pointer;
  transition: transform .12s ease, background .15s ease, border-color .15s ease, color .15s ease;
  user-select: none;
}
.fs-btn:active { transform: scale(0.97); }
.fs-btn-glass {
  background: rgba(255,255,255,0.04);
  border: 0.5px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
}
.fs-btn-glass:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9); }
.fs-btn-warm {
  background: rgba(255, 217, 138, 0.12);
  border: 0.5px solid rgba(255, 217, 138, 0.28);
  color: #ffe5a8;
}
.fs-btn-warm:hover { background: rgba(255, 217, 138, 0.2); }

/* ═══ 卷目筛选条（第 2 段 sticky） ═══ */
.fs-filters {
  position: sticky;
  top: 54px;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  margin: 0 0 18px;
  border-radius: 12px;
  background: rgba(255,255,255,0.025);
  border: 0.5px solid rgba(255,255,255,0.06);
  backdrop-filter: blur(10px);
}
.fs-volumes {
  display: inline-flex; align-items: center; gap: 6px;
  flex-wrap: wrap;
}
.fs-volume-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px;
  border-radius: 100px;
  background: rgba(255,255,255,0.03);
  border: 0.5px solid rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.6);
  font-family: inherit; font-size: 0.74rem;
  cursor: pointer;
  transition: all .15s ease;
}
.fs-volume-btn:hover { color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.06); }
.fs-volume-btn.active {
  background: rgba(255, 217, 138, 0.12);
  border-color: rgba(255, 217, 138, 0.28);
  color: #ffe5a8;
}
.fs-volume-count {
  font-size: 0.62rem;
  padding: 0 4px;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.48);
  margin-left: 1px;
}
.fs-volume-btn.active .fs-volume-count {
  background: rgba(255, 217, 138, 0.22);
  color: #ffe5a8;
}
.fs-sorts {
  display: inline-flex; align-items: center; gap: 8px;
  flex-shrink: 0;
}
.fs-sort-label {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.4);
  letter-spacing: 0.04em;
}
.fs-sort-select {
  appearance: none; -webkit-appearance: none;
  padding: 5px 24px 5px 10px;
  border-radius: 8px;
  background: rgba(255,255,255,0.04) url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-opacity="0.35" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>') no-repeat right 8px center;
  border: 0.5px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.74);
  font-family: inherit; font-size: 0.72rem;
  cursor: pointer;
}
.fs-sort-select:hover { border-color: rgba(255, 217, 138, 0.22); color: #ffe5a8; }

/* ═══ section 通用头 ═══ */
.fs-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin: 24px 2px 12px;
}
.fs-head-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.fs-head-icon { opacity: 0.95; filter: drop-shadow(0 0 4px currentColor); }
.fs-head-gold { color: #ffd98a; }
.fs-head-spark { color: #ffb07a; }
.fs-head-blue { color: #9ec6ff; }
.fs-head-title {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.92);
}
.fs-head-sub {
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.34);
  padding-left: 2px;
}
.fs-head-link, .fs-head-hint {
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  color: rgba(255, 217, 138, 0.72);
  cursor: pointer;
  transition: color .15s;
}
.fs-head-link:hover { color: #ffe5a8; }
.fs-head-hint { cursor: default; color: rgba(255,255,255,0.32); }

/* ═══ ① 官方星河·八卷轴（横滑） ═══ */
.fs-reels-section { position: relative; }
.fs-reels {
  position: relative;
  padding: 10px 40px;
  overflow: hidden;
}
.fs-reels-track {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 8px;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 217, 138, 0.25) transparent;
  -webkit-overflow-scrolling: touch;
}
.fs-reels-track::-webkit-scrollbar { height: 4px; }
.fs-reels-track::-webkit-scrollbar-thumb {
  background: rgba(255, 217, 138, 0.25);
  border-radius: 4px;
}
.fs-reels-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: rgba(10, 11, 28, 0.55);
  backdrop-filter: blur(6px);
  border: 0.5px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.72);
  cursor: pointer;
  z-index: 2;
  transition: all .15s;
}
.fs-reels-nav:hover:not(:disabled) { background: rgba(255, 217, 138, 0.14); color: #ffe5a8; }
.fs-reels-nav:disabled { opacity: 0.25; cursor: default; }
.fs-reels-nav-left { left: 0; }
.fs-reels-nav-right { right: 0; }

.fs-reel {
  --r-color: #E8B86D;
  flex: 0 0 220px;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 14px 12px;
  border-radius: 14px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--r-color) 12%, transparent) 0%, rgba(255,255,255,0.02) 55%, rgba(255,255,255,0.01) 100%);
  border: 0.75px solid color-mix(in srgb, var(--r-color) 26%, rgba(255,255,255,0.04));
  cursor: pointer;
  transition: transform .2s ease, border-color .2s ease, background .2s ease;
  position: relative;
  overflow: hidden;
}
.fs-reel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--r-color) 60%, transparent), transparent);
  opacity: 0.7;
}
.fs-reel:hover {
  transform: translateY(-2px);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--r-color) 20%, transparent) 0%, rgba(255,255,255,0.03) 100%);
  border-color: color-mix(in srgb, var(--r-color) 44%, rgba(255,255,255,0.06));
}
.fs-reel-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 6px;
  border-bottom: 0.5px dashed color-mix(in srgb, var(--r-color) 30%, transparent);
}
.fs-reel-num {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: var(--r-color);
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--r-color) 14%, transparent);
}
.fs-reel-count {
  font-size: 0.62rem;
  color: rgba(255,255,255,0.42);
  font-variant-numeric: tabular-nums;
}
.fs-reel-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.fs-reel-lib-icon {
  color: var(--r-color);
  margin-top: 2px;
  filter: drop-shadow(0 0 4px currentColor);
  opacity: 0.9;
}
.fs-reel-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.2;
  color: rgba(255,255,255,0.96);
  letter-spacing: 0.03em;
}
.fs-reel-desc {
  margin: 2px 0 0;
  font-size: 0.72rem;
  line-height: 1.6;
  color: rgba(255,255,255,0.5);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.fs-reel-desc.is-empty { color: rgba(255,255,255,0.26); font-style: italic; }
.fs-reel-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 0.5px solid rgba(255,255,255,0.04);
}
.fs-reel-tag {
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: rgba(255, 229, 168, 0.92);
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(232, 184, 109, 0.12);
  border: 0.5px solid rgba(232, 184, 109, 0.26);
}
.fs-reel-read {
  font-size: 0.64rem;
  letter-spacing: 0.05em;
  color: var(--r-color);
  font-weight: 600;
}
/* 骨架 */
.fs-reels-loading { opacity: 0.75; }
.fs-reel-skel {
  background: linear-gradient(120deg, rgba(255,255,255,0.02) 20%, rgba(255,255,255,0.045) 50%, rgba(255,255,255,0.02) 80%) !important;
  background-size: 200% 100% !important;
  border-color: rgba(255,255,255,0.06) !important;
  animation: fsShimmer 1.4s linear infinite;
  pointer-events: none;
}
@keyframes fsShimmer {
  0% { background-position: 200% 0; } 100% { background-position: -200% 0; }
}

/* ═══ ② 本周推荐·三笺 ═══ */
.fs-picks-section {}
.fs-picks {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.fs-pick {
  --p-color: #E8B86D;
  display: grid;
  grid-template-columns: 130px 1fr;
  grid-template-rows: auto auto;
  min-height: 200px;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255,255,255,0.02);
  border: 0.75px solid rgba(255,255,255,0.07);
  cursor: pointer;
  transition: transform .2s ease, border-color .2s ease, background .2s ease;
  position: relative;
}
.fs-pick:hover {
  transform: translateY(-2px);
  background: rgba(255,255,255,0.035);
  border-color: color-mix(in srgb, var(--p-color) 32%, rgba(255,255,255,0.06));
}
.fs-pick.galaxy { border-color: rgba(232, 184, 109, 0.28); }
.fs-pick.anonymous { border-color: rgba(169, 189, 255, 0.22); }
.fs-pick-cover {
  grid-row: 1 / -1;
  grid-column: 1;
  position: relative;
  background:
    linear-gradient(160deg, color-mix(in srgb, var(--p-color) 36%, #0d0e21) 0%, color-mix(in srgb, var(--p-color) 10%, #0b0c1c) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.fs-pick-cover::before {
  content: '';
  position: absolute; inset: 10px;
  border-radius: 10px;
  border: 0.5px dashed color-mix(in srgb, var(--p-color) 46%, transparent);
  opacity: 0.6;
}
.fs-pick-ribbon {
  position: absolute;
  top: 8px; left: 8px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(10, 11, 28, 0.7);
  border: 0.5px solid color-mix(in srgb, var(--p-color) 40%, rgba(0,0,0,0.4));
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: #ffe5a8;
  font-weight: 700;
}
.fs-pick-open {
  color: color-mix(in srgb, var(--p-color) 92%, white);
  filter: drop-shadow(0 0 10px currentColor);
  opacity: 0.9;
}
.fs-pick-body {
  grid-column: 2;
  grid-row: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 12px 14px;
  min-width: 0;
}
.fs-pick-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.fs-pick-name {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.25;
  color: rgba(255,255,255,0.94);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.fs-pick-tag {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 1px 6px;
  border-radius: 100px;
  font-size: 0.56rem;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.fs-pick-tag-galaxy {
  background: rgba(232,184,109,0.12);
  color: rgba(255, 229, 168, 0.94);
  border: 0.5px solid rgba(232, 184, 109, 0.3);
}
.fs-pick-tag-anonymous {
  background: rgba(169,189,255,0.08);
  color: rgba(183, 199, 255, 0.92);
  border: 0.5px solid rgba(169, 189, 255, 0.22);
}
.fs-pick-tag-public {
  background: rgba(149, 240, 192, 0.07);
  color: rgba(149, 240, 192, 0.88);
  border: 0.5px solid rgba(149, 240, 192, 0.22);
}
.fs-pick-author {
  display: inline-flex; align-items: center; gap: 4px;
  align-self: flex-start;
  font-size: 0.64rem;
  color: rgba(255,255,255,0.42);
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(255,255,255,0.035);
  letter-spacing: 0.03em;
}
.fs-pick-author code {
  padding: 0 2px;
  background: rgba(255,255,255,0.05);
  border-radius: 3px;
  font-family: ui-monospace, Consolas, Menlo, monospace;
  font-size: 0.6rem;
  color: rgba(255,255,255,0.55);
}
.fs-pick-desc {
  margin: 2px 0 0;
  font-size: 0.74rem;
  line-height: 1.6;
  color: rgba(255,255,255,0.55);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}
.fs-pick-desc.is-empty { color: rgba(255,255,255,0.26); font-style: italic; }
.fs-pick-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 7px;
  border-top: 0.5px dashed rgba(255,255,255,0.06);
  font-size: 0.66rem;
  color: rgba(255,255,255,0.44);
  flex-wrap: wrap;
}
.fs-pick-meta-item {
  display: inline-flex; align-items: center; gap: 4px;
  font-variant-numeric: tabular-nums;
}
.fs-pick-meta-res { color: #ff8b7d; }
.fs-pick-open-btn {
  margin-left: auto;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--p-color);
}

/* picks loading 骨架 */
.fs-picks-loading { opacity: 0.85; }
.fs-pick-skel {
  border-color: rgba(255,255,255,0.05) !important;
  background: linear-gradient(120deg, rgba(255,255,255,0.02) 20%, rgba(255,255,255,0.045) 50%, rgba(255,255,255,0.02) 80%) !important;
  background-size: 200% 100% !important;
  animation: fsShimmer 1.4s linear infinite;
  pointer-events: none;
}
.fs-pick-skel > * { visibility: hidden; }

/* ═══ ③ 星笺书架 ═══ */
.fs-shelf-section { padding-bottom: 28px; }
.fs-shelf-empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 20px;
  color: rgba(255,255,255,0.6);
}
.fs-shelf-empty .cg-empty-title { margin: 8px 0 0; font-size: 0.9rem; }
.fs-shelf-empty .cg-empty-sub { margin: 2px 0 0; font-size: 0.76rem; color: rgba(255,255,255,0.34); }

.fs-loadmore, .fs-loadmore-hint, .fs-end-reach {
  margin: 22px 0 4px;
  text-align: center;
  font-size: 0.72rem;
  color: rgba(255,255,255,0.46);
  letter-spacing: 0.06em;
}
.fs-loadmore { display: inline-flex; justify-content: center; gap: 6px; width: 100%; }
.spin-slow { animation: spin 1.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.fs-loadmore-hint { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; }
.fs-loadmore-auto { font-size: 0.66rem; opacity: 0.6; }
.fs-end-reach { opacity: 0.6; font-style: italic; }

/* ═══ 页脚胶囊 ═══ */
.fs-foot {
  margin-top: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.02);
  border: 0.5px solid rgba(255,255,255,0.05);
  width: max-content;
  max-width: 100%;
  margin-inline: auto;
}
.fs-foot-chip {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  letter-spacing: 0.04em;
  padding: 2px 12px;
}
.fs-foot-chip b { color: #ffe5a8; font-weight: 700; }

/* ═══ 响应式：平板 / 手机 ═══ */
@media (max-width: 960px) {
  .fs-picks { grid-template-columns: 1fr 1fr; }
  .fs-pick:nth-child(3) { grid-column: 1 / -1; }
  .fs-pick:nth-child(3) .fs-pick-cover { grid-column: 1; }
  .fs-pick:nth-child(3) .fs-pick-body { grid-column: 2; }
}
@media (max-width: 720px) {
  .fs-top {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    row-gap: 8px;
    padding: 8px 12px;
  }
  .fs-top-mid { grid-column: 1 / -1; justify-content: stretch; }
  .fs-search { width: 100%; }
  .fs-top-right { justify-self: end; }
  .fs-main { padding: 110px 14px 30px; }
  .fs-picks { grid-template-columns: 1fr; }
  .fs-pick { grid-template-columns: 108px 1fr; min-height: 176px; }
  .fs-filters { flex-direction: column; align-items: stretch; }
  .fs-sorts { align-self: flex-end; }
  .fs-reels { padding: 8px 28px; }
  .fs-reel { flex-basis: 180px; min-height: 200px; }
}
@media (max-width: 420px) {
  .fs-brand-title { font-size: 0.88rem; }
  .fs-brand-sub { display: none; }
  .fs-pick { grid-template-columns: 1fr; min-height: auto; }
  .fs-pick-cover { grid-row: auto; grid-column: 1 / -1; height: 92px; }
  .fs-pick-body { grid-column: 1 / -1; grid-row: auto; padding: 10px 12px; }
}
</style>
