<template>
  <div class="folios-page" :class="{ entered: isEntered, leaving: isLeaving }">
    <!-- 背景：银河渐变（同 SkyPage 夜色，不耦合 Three.js） -->
    <div class="fs-bg" aria-hidden="true">
      <div class="fs-bg-milky"></div>
      <div class="fs-bg-stars"></div>
    </div>

    <!-- ═══════ 顶部 Sticky 导航栏 ═══════ -->
    <header class="fs-top">
      <div class="fs-top-left">
        <!-- 左上角：醒目退出按钮（直接回天际，取代原右上"回天际"功能） -->
        <button class="fs-exit" @click="exitToSky" aria-label="退出穹庭书局 · 回天际">
          <X :size="14" />
          <span>退出</span>
        </button>
        <div class="fs-brand">
          <span class="pw-icon-wrap pw-icon-gold" aria-hidden="true"><Sparkles :size="14" /></span>
          <div class="fs-brand-text">
            <span class="fs-brand-title">穹庭书局</span>
            <span class="fs-brand-sub">· FOLIO SQUARE ·</span>
          </div>
        </div>
      </div>
      <div class="fs-top-mid">
        <div class="fs-search-wrap">
          <div class="fs-search" :class="{ 'fs-search-active': searchQuery.trim() }">
            <Search :size="12" class="fs-search-icon" />
            <input
              v-model="searchQuery"
              class="fs-search-input"
              type="search"
              placeholder="搜索星笺 / 故事正文 / 标签…"
              aria-label="搜索星笺或故事"
              @focus="openSearchDropdown"
              @blur="onSearchBlur"
              @keydown.enter.prevent="openFirstSearchResult"
            />
            <!-- 搜索中 spinner / 清除按钮 -->
            <span v-if="searchLoading && searchQuery.trim()" class="fs-search-spinner" aria-label="搜索中"></span>
            <button v-else-if="searchQuery.trim()" class="fs-search-clear" @click="searchQuery = ''" aria-label="清除搜索">
              <X :size="12" />
            </button>
          </div>
          <!-- 搜索下拉结果（即时反馈，不再整页跳转到书架） -->
          <div v-if="searchDropdownOpen" class="fs-search-dropdown" @mousedown.prevent>
            <div v-if="searchLoading" class="fs-sd-loading">正在检索星笺…</div>
            <template v-else>
              <button
                v-for="r in searchResults"
                :key="r.id"
                type="button"
                class="fs-sd-item"
                @click="openSearchResult(r)"
              >
                <span class="fs-sd-name">{{ r.name }}</span>
                <span class="fs-sd-meta">{{ r.storyCount ?? 0 }} 则</span>
                <span class="fs-sd-go">开卷 →</span>
              </button>
              <div v-if="!searchResults.length" class="fs-sd-empty">未找到匹配的星笺</div>
            </template>
          </div>
        </div>
      </div>
      <div class="fs-top-right">
        <!-- 移动端隐藏"写星笺"按钮，让刷新按钮独占右上角；PC 端两个按钮都显示 -->
        <button v-if="canCreate" class="fs-btn fs-btn-warm fs-btn-create" type="button" @click="goProfileNewFolio">
          <Plus :size="12" />
          <span>写星笺</span>
        </button>
        <button class="fs-btn fs-btn-glass fs-btn-refresh" type="button" @click="reloadAll">
          <RotateCcw :size="12" />
          <span>刷新</span>
        </button>
      </div>
    </header>

    <!-- ═══════ 引导条（ca-hero-strip 同款风格） ═══════ -->
    <div class="fs-hero-strip">
      <div class="fhs-left">
        <Library class="fhs-icon" :size="14" />
        <span class="fhs-label">穹庭书局</span>
        <span class="fhs-sub">· 星笺书架，收纳观星者们整理的心事合集，漫步翻阅寻找共鸣</span>
      </div>
    </div>

    <main class="fs-main">
      <!-- ═══════ ① 官方星河·八卷轴（横滑） ═══════ -->
      <section v-if="galaxyReels.length || galaxyLoading" class="fs-reels-section" aria-label="官方星河八卷">
        <header class="fs-section-head">
          <div class="fs-head-left">
            <span class="fs-head-icon-wrap gold" aria-hidden="true"><Landmark :size="14" /></span>
            <h2 class="fs-head-title">官方星河·八卷轴</h2>
            <span class="fs-head-sub">官方整理·历朝历代的星语心事</span>
          </div>
          <!-- 翻页按钮放 section-head 右侧（不盖卡片，操作集中） -->
          <div class="fs-head-actions">
            <div class="fs-reels-nav-group" role="group" aria-label="翻卷">
              <button
                type="button"
                class="fs-reels-nav"
                :disabled="!canScrollLeft"
                @click="scrollReels(-1)"
                aria-label="向左翻卷"
              >
                <ChevronLeft :size="16" />
              </button>
              <button
                type="button"
                class="fs-reels-nav"
                :disabled="!canScrollRight"
                @click="scrollReels(1)"
                aria-label="向右翻卷"
              >
                <ChevronRight :size="16" />
              </button>
            </div>
          </div>
        </header>
        <div v-if="galaxyLoading" class="fs-reels fs-reels-loading">
          <div v-for="i in 6" :key="i" class="fs-reel fs-reel-skel"></div>
        </div>
        <div v-else class="fs-reels" ref="reelsScrollerRef">
          <div class="fs-reels-track">
            <article
              v-for="g in galaxyReels"
              :key="g.id"
              class="fs-reel panel-wrapper"
              :style="{ '--r-color': g.coverColor || '#E8B86D' }"
              @click="openDetail(g)"
            >
              <div class="fs-reel-inner">
                <div class="fs-reel-banner">
                  <span class="fs-reel-num">卷 {{ reelOrderLabel(g) }}</span>
                  <span class="fs-reel-count">{{ g.storyCount ?? 0 }} 则</span>
                </div>
                <div class="fs-reel-body">
                  <div class="fs-reel-lib-wrap">
                    <Library :size="16" class="fs-reel-lib-icon" />
                  </div>
                  <h3 class="fs-reel-name">{{ g.name }}</h3>
                  <p v-if="g.description" class="fs-reel-desc">{{ g.description }}</p>
                  <p v-else class="fs-reel-desc is-empty">官方藏卷，待开卷细读…</p>
                </div>
                <div class="fs-reel-foot">
                  <span class="fs-reel-tag">
                    <Sparkles :size="9" />
                    <span>星河卷</span>
                  </span>
                  <span class="fs-reel-read">开卷 →</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- ═══════ ② 本周推荐（P1：先接 /picks 前 6 条，以后接 AI 荐语） ═══════ -->
      <section v-if="picks.length || picksLoading" class="fs-picks-section" aria-label="本周推荐星笺">
        <header class="fs-section-head">
          <div class="fs-head-left">
            <span class="fs-head-icon-wrap spark" aria-hidden="true"><Sparkles :size="14" /></span>
            <h2 class="fs-head-title">本周推荐·夜读星笺</h2>
            <span class="fs-head-sub">最适合今夜开卷的星笺精选</span>
          </div>
          <span class="fs-head-hint">每 7 日更新 · Picks</span>
        </header>
        <div v-if="picksLoading" class="fs-picks fs-picks-loading">
          <div v-for="i in 6" :key="i" class="fs-pick fs-pick-skel"></div>
        </div>
        <div v-else class="fs-picks">
          <article
            v-for="(p, i) in picks"
            :key="p.id"
            class="fs-pick panel-wrapper"
            :class="{ anonymous: p.visibility === 'anonymous', galaxy: p.visibility === 'galaxy' }"
            :style="{ '--p-color': p.coverColor || pickCoverColor(i) }"
            @click="openDetail(p)"
          >
            <div class="fs-pick-body">
              <div class="fs-pick-head">
                <span class="fs-pick-pickchip" :class="`fs-pick-pickchip-${i + 1}`">
                  <Sparkles :size="10" />
                  <span>推荐 {{ ['壹','贰','叁','肆','伍','陆'][i] || String(i + 1) }}</span>
                </span>
                <span v-if="p.visibility === 'galaxy'" class="fs-pick-tag fs-pick-tag-galaxy"><Sparkles :size="9" />星河</span>
                <span v-else-if="p.visibility === 'anonymous'" class="fs-pick-tag fs-pick-tag-anonymous"><Ghost :size="9" />匿名</span>
                <span v-else class="fs-pick-tag fs-pick-tag-public"><Globe :size="9" />公开</span>
              </div>
              <div class="fs-pick-title-block">
                <BookOpen :size="16" class="fs-pick-open" />
                <h3 class="fs-pick-name">{{ p.name }}</h3>
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
            <span class="fs-head-icon-wrap blue" aria-hidden="true"><BookMarked :size="14" /></span>
            <h2 class="fs-head-title">{{ volumeTabLabel }}</h2>
            <span class="fs-head-sub">{{ volumeTotalLabel }}</span>
          </div>
          <span class="fs-head-hint">
            <template v-if="searchQuery.trim()">
              {{ shelfLoading ? '搜索中…' : `找到 ${shelfList.length} 册` }}
            </template>
            <template v-else>{{ shelfList.length }} 册已加载</template>
          </span>
        </header>

        <!-- 卷目 Tab：全部卷 / 官方星河 / 星友新作 / 匿名手记，移到「全部卷」下方；筛选只针对书架生效 -->
        <div class="fs-shelf-volumes" role="tablist" aria-label="卷目分类">
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

        <div v-if="rateLimited" class="fs-rate-hint">
          请求太频繁，已静默暂停加载，稍候自动重试…
        </div>
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
        <span class="fs-foot-chip">
          <Library :size="10" />
          共 <b>{{ totalFolios }}</b> 册星笺
        </span>
        <span class="fs-foot-chip">
          <Sparkles :size="10" />
          共 <b>{{ totalStories }}</b> 则故事
        </span>
        <span class="fs-foot-chip">
          <Landmark :size="10" />
          官方星河 <b>{{ galaxyCount }}</b> 卷
        </span>
      </footer>
    </main>

    <!-- 任务2：回顶部悬浮按钮（顶部栏滚出可视区域时显示，点击平滑回顶部） -->
    <Transition name="fs-backtop">
      <button
        v-if="showBackTop"
        type="button"
        class="fs-back-top"
        @click="scrollToTop"
        aria-label="回顶部"
        title="回顶部"
      >
        <ArrowUp :size="17" />
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronLeft, ChevronRight, Sparkles, Search, Plus, RotateCcw, Orbit, X,
  Landmark, Library, BookOpen, BookMarked, Heart, Globe, Ghost, User, ArrowUp,
} from 'lucide-vue-next'
import FolioGrid, { type FolioLike } from '../components/FolioGrid.vue'
import { authFetch, authHeaders, useAuth } from '../stores/auth'
import type { Collection } from '../composables/useCollections'
import { normalizeCollection } from '../composables/useCollections'

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

/* ─── 搜索：防抖 250ms。
     类型即搜：拉取下拉结果（即时反馈，悬浮在搜索框下，不再整页跳到书架），同时同步过滤书架 ─── */
const searchQuery = ref('')
const searchLoading = ref(false)
const searchResults = ref<Collection[]>([])
const searchDropdownOpen = ref(false)
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

function openSearchDropdown() {
  if (searchQuery.value.trim()) searchDropdownOpen.value = true
}
function onSearchBlur() {
  // 延迟关闭，让下拉项 click 先触发
  setTimeout(() => { searchDropdownOpen.value = false }, 150)
}

async function fetchSearchResults() {
  const kw = searchQuery.value.trim()
  if (!kw) {
    searchResults.value = []
    searchDropdownOpen.value = false
    return
  }
  searchLoading.value = true
  searchDropdownOpen.value = true
  try {
    const params = new URLSearchParams()
    params.set('search', kw)
    params.set('limit', '20')
    params.set('sort', 'hot')
    const res = await authFetch('/api/collections/public?' + params.toString(), { headers: authHeaders() })
    const json = await res.json()
    searchResults.value = res.ok
      ? ((json.data?.items ?? []) as any[]).map((r: any) => normalizeCollection(r, { withStories: false }))
      : []
  } catch {
    searchResults.value = []
  } finally {
    searchLoading.value = false
  }
}

function debounceSearch() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    fetchSearchResults()
    // 书架同步按当前搜索词过滤（保留全量结果面板，用作"查看全部"）
    resetShelf()
    fetchShelfPage(1)
  }, 250)
}
watch(searchQuery, () => {
  debounceSearch()
})

function openSearchResult(c: { id: number; name: string }) {
  searchDropdownOpen.value = false
  openDetail(c)
}
function openFirstSearchResult() {
  if (searchResults.value.length > 0) {
    openSearchResult(searchResults.value[0])
  }
}
/* 排序切换：立即刷新书架列表 */
watch(activeSort, () => {
  resetShelf()
  fetchShelfPage(1)
})

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
    if (res.status === 429) {
      rateLimited.value = true
      scheduleRateRetry()
      return
    }
    if (res.ok) {
      rateLimited.value = false
      const rawItems = (json.data?.items ?? []) as any[]
      const list = rawItems.map((r) => normalizeCollection(r, { withStories: false })) as Collection[]
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
    if (res.status === 429) {
      rateLimited.value = true
      scheduleRateRetry()
      return
    }
    if (res.ok) {
      rateLimited.value = false
      const raw = Array.isArray(json.data) ? json.data : []
      picks.value = raw.map((r: any) => normalizeCollection(r, { withStories: false })) as Collection[]
    }
  } finally {
    picksLoading.value = false
  }
}

/* ─── 星笺书架（分页 + 无限滚动） ─── */
const shelfList = ref<Collection[]>([])
const shelfLoading = ref(false)
const shelfError = ref<string | null>(null)
/** 429 降噪：限流时静默降级 + 轻提示，8 秒后自动重试一次 */
const rateLimited = ref(false)
let rateRetryTimer: ReturnType<typeof setTimeout> | null = null
function scheduleRateRetry() {
  if (rateRetryTimer) return
  rateRetryTimer = setTimeout(() => {
    rateRetryTimer = null
    rateLimited.value = false
    if (!shelfLoading.value && !searchLoading.value) {
      fetchShelfPage(shelfPage.value || 1)
    }
  }, 8000)
}
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
    const kw = searchQuery.value.trim()
    if (kw) params.set('search', kw)
    const res = await authFetch('/api/collections/public?' + params.toString(), { headers: authHeaders() })
    const json = await res.json()
    // 限流降噪：429 不弹红色错误条，轻提示 + 稍后自动重试
    if (res.status === 429) {
      shelfError.value = null
      rateLimited.value = true
      scheduleRateRetry()
      return
    }
    rateLimited.value = false
    if (!res.ok) throw new Error(json.message || '加载失败')
    const d = json.data || {}
    shelfTotalPages.value = d.totalPages ?? Math.ceil((d.total ?? 0) / shelfPageSize)
    const rawItems: any[] = d.items ?? []
    const items: Collection[] = rawItems.map((r) => normalizeCollection(r, { withStories: false })) as Collection[]
    if (page === 1) {
      shelfList.value = items
      totalFolios.value = d.total ?? items.length
      // 全部卷无搜索词时累计一下故事数（其他卷或搜索态就不重复加了，避免 double count）
      if (activeVolume.value === 'all' && !kw && galaxyReels.value.length === 0) {
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
  rateLimited.value = false
  resetShelf()
  galaxyReels.value = []
  picks.value = []
  totalFolios.value = 0
  totalStories.value = 0
  await Promise.all([fetchGalaxyReels(), fetchPicks()])
  await fetchShelfPage(1)
}

/* ─── 页面进出动画状态 ⭐ 全用 transition 控制，禁止 animation+forwards 抢优先级 ─── */
const isEntered = ref(false)
const isLeaving = ref(false)
// 进入动画：挂载后双 rAF 触发（确保浏览器先渲染 opacity=0 初始态，然后再切换到 1 才能正确过渡）
onMounted(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { isEntered.value = true })
  })
})

/* ─── 跳转 ─── */
// 左上角：退出穹庭书局，先播放退出动画再跳转（延时匹配 CSS transition 0.3s）
function exitToSky() {
  isLeaving.value = true
  setTimeout(() => { router.push('/sky') }, 320)
}
function goSky() { exitToSky() }
function goProfileNewFolio() { router.push({ path: '/profile', hash: '#pd-collections' }) }
function openDetail(c: { id: number }) {
  // 进入详情页也先淡出
  isLeaving.value = true
  setTimeout(() => { router.push(`/folios/${c.id}`) }, 300)
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

/* ─── 任务2：回顶部悬浮按钮（放弃“下滑隐藏/上滑弹出顶部栏”方案，改为曲线救国） ───
 * 顶部栏（.fs-top）滚出可视区域时显示，回到顶部附近时隐藏；点击平滑滚动回顶部。
 * 仅移动端展示（隐藏方案原本也只服务移动端，PC 端顶部栏常驻）。 */
const showBackTop = ref(false)
let backTopRaf = 0
/* 移动端顶部栏两行高约 91px，滚动超过 120px 即视为“已滚出可视区域” */
const BACK_TOP_SHOW_Y = 120

function onWindowScrollForBackTop() {
  if (backTopRaf) cancelAnimationFrame(backTopRaf)
  backTopRaf = requestAnimationFrame(() => {
    const y = window.scrollY || window.pageYOffset || 0
    const show = y > BACK_TOP_SHOW_Y
    if (showBackTop.value !== show) showBackTop.value = show
  })
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  reloadAll().finally(attachInfiniteScroll)
  setTimeout(() => {
    const track = reelsScrollerRef.value?.querySelector<HTMLElement>('.fs-reels-track')
    track?.addEventListener('scroll', onReelsTrackScroll, { passive: true })
  }, 200)
  // 顶部栏滚动监听（passive + rAF 节流）→ 任务2：仅用于控制回顶部按钮显隐
  window.addEventListener('scroll', onWindowScrollForBackTop, { passive: true })
})
onBeforeUnmount(() => {
  if (rateRetryTimer) { clearTimeout(rateRetryTimer); rateRetryTimer = null }
  io?.disconnect()
  io = null
  const track = reelsScrollerRef.value?.querySelector<HTMLElement>('.fs-reels-track')
  track?.removeEventListener('scroll', onReelsTrackScroll)
  window.removeEventListener('scroll', onWindowScrollForBackTop)
  if (backTopRaf) cancelAnimationFrame(backTopRaf)
})

/* 暴露一个只读的计数 state 辅助（以后可以放 store） */
updateVolumeCountsQuick()
</script>

<style scoped>
/* ═══ 背景：银河夜色（扁平不堆渐变，仅两层柔色） ═══ */
.folios-page {
  position: relative;
  min-height: 100vh;
  width: 100%;
  background:
    radial-gradient(1200px 600px at 15% -10%, rgba(82, 88, 150, 0.18), transparent 60%),
    radial-gradient(900px 520px at 95% 5%, rgba(183, 136, 98, 0.09), transparent 60%),
    linear-gradient(180deg, #0b0b1a 0%, #0a0b1c 40%, #0b0b1a 100%);
  color: var(--ink);
  overflow-x: hidden;
  font-family: var(--font);
  padding: 0 0 80px;
  /* ⭐ 初始态：未进入前的状态（opacity:0 / 下浮 10px） */
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.32s ease-out, transform 0.32s ease-out;
  will-change: opacity, transform;
}
/* ⭐ 进入态：onMounted 双 rAF 后触发 entered class，transition 让它从 0→1 平滑过渡 */
.folios-page.entered {
  opacity: 1;
  transform: translateY(0);
}
/* ⭐ 退出态：覆盖层脱离文档流淡出（leaving 写在 entered 后面，同级优先级覆盖生效） */
.folios-page.leaving {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 100vh;
  z-index: 9999;
  pointer-events: none;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.3s ease-in, transform 0.3s ease-in;
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
    radial-gradient(400px 300px at 60% 40%, rgba(255, 234, 184, 0.04), transparent 60%),
    radial-gradient(500px 300px at 25% 80%, rgba(138, 127, 206, 0.04), transparent 60%);
  filter: blur(20px);
}
.fs-bg-stars {
  position: absolute; inset: 0;
  background-image:
    radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.5), transparent 50%),
    radial-gradient(1px 1px at 120px 80px, rgba(255,255,255,0.4), transparent 50%),
    radial-gradient(1.5px 1.5px at 260px 200px, rgba(255, 229, 168, 0.6), transparent 50%),
    radial-gradient(1px 1px at 380px 120px, rgba(255,255,255,0.35), transparent 50%),
    radial-gradient(1px 1px at 520px 280px, rgba(189, 208, 255, 0.5), transparent 50%),
    radial-gradient(1.2px 1.2px at 680px 40px, rgba(255,255,255,0.45), transparent 50%);
  background-repeat: repeat;
  background-size: 800px 320px;
  opacity: 0.4;
  animation: fsTwinkle 9s ease-in-out infinite alternate;
}
@keyframes fsTwinkle {
  0% { opacity: 0.3; } 100% { opacity: 0.55; }
}

/* ═══ 共享：panel-wrapper 内 icon 盒（对齐 StoryDetailCard.pw-icon-wrap） ═══ */
.pw-icon-wrap {
  width: 30px; height: 30px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pw-icon-gold {
  background: var(--accent-subtle);
  color: var(--accent);
}
.pw-icon-purple {
  background: rgba(202, 167, 255, 0.1);
  color: var(--star-purple);
}
.pw-icon-blue {
  background: rgba(158, 198, 255, 0.1);
  color: var(--star-blue);
}

/* ═══════ 引导条（ca-hero-strip 同款风格） ═══════ */
.fs-hero-strip {
  position: relative;
  z-index: 2;
  width: min(1180px, calc(100% - 40px));
  margin: 68px auto 0;    /* 顶栏高 56px + 12px 间距 */
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 217, 138, 0.12);
  background: linear-gradient(135deg, rgba(255, 217, 138, 0.07), rgba(202, 167, 255, 0.035));
  box-sizing: border-box;
}
.fhs-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.fhs-icon {
  color: #ffd98a;
  flex-shrink: 0;
}
.fhs-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.fhs-sub {
  font-size: 0.7rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  opacity: 0.85;
}

/* ═══ 主内容：相对定位，盖在背景上 ═══ */
.fs-main {
  position: relative;
  z-index: 1;
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 20px 20px 40px;      /* 引导条已经占了上方空间，这里顶间距缩小 */
}

/* ═══ 顶部 Sticky Bar（极简扁平：纯色背景，无玻璃模糊/渐变/光辉） ═══ */
.fs-top {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 50;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 10px 20px;
  background: rgba(10, 11, 28, 0.9);
}
.fs-top-left { display: flex; align-items: center; gap: 10px; min-width: 0; }

/* 左上角：醒目退出按钮（红橙渐变 · 同 CameraHud 退出风格） */
.fs-exit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 34px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 107, 107, 0.28);
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.12), rgba(255, 168, 96, 0.05));
  color: #ff6b6b;
  cursor: pointer;
  font-family: var(--font);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  transition: all 0.2s ease;
}
.fs-exit:hover {
  border-color: rgba(255, 107, 107, 0.45);
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.18), rgba(255, 168, 96, 0.08));
  transform: translateY(-1px);
}
.fs-brand { display: flex; align-items: center; gap: 10px; }
.fs-brand-text { display: flex; flex-direction: column; line-height: 1.1; }
.fs-brand-title {
  font-size: 16px; font-weight: 600; letter-spacing: 0.06em;
  color: var(--ink);
}
.fs-brand-sub {
  font-size: 0.66rem; letter-spacing: 0.2em;
  color: var(--muted);
  padding-left: 1px;
  margin-top: 2px;
}

.fs-top-mid { display: flex; align-items: center; justify-content: center; }
.fs-search-wrap { position: relative; width: min(520px, 100%); }
.fs-search {
  display: inline-flex; align-items: center; gap: 8px;
  width: 100%;
  padding: 7px 12px;
  border-radius: var(--radius-full);
  background: var(--overlay-04);
  transition: background var(--transition-normal);
}
.fs-search:hover { background: var(--overlay-08); }
.fs-search-icon { color: var(--muted); flex-shrink: 0; }
.fs-search-input {
  flex: 1; min-width: 0;
  border: none; outline: none; background: transparent;
  font-family: var(--font);
  font-size: 0.82rem;
  color: var(--ink);
}
.fs-search-input::placeholder { color: var(--muted); opacity: 0.6; }
.fs-search-input:disabled { cursor: not-allowed; opacity: 0.6; }
/* 搜索激活态：边框高亮 */
.fs-search-active { background: var(--overlay-08); box-shadow: 0 0 0 1px rgba(255, 217, 138, 0.25); }
/* 搜索中 spinner */
.fs-search-spinner {
  width: 14px; height: 14px; flex-shrink: 0;
  border: 1.5px solid var(--muted);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: fs-spin 0.6s linear infinite;
}
@keyframes fs-spin { to { transform: rotate(360deg); } }
/* 清除搜索按钮 */
.fs-search-clear {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; flex-shrink: 0;
  border: none; border-radius: 50%;
  background: var(--overlay-08);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s ease;
}
.fs-search-clear:hover { background: var(--overlay-16); color: var(--ink); }
/* 隐藏 input type=search 原生清除按钮，避免与自定义清除按钮重复出现两个叉叉 */
.fs-search-input::-webkit-search-cancel-button,
.fs-search-input::-webkit-search-decoration { -webkit-appearance: none; appearance: none; display: none; }

/* ═══ 搜索下拉结果面板（类型即搜，悬浮于搜索框之下） ═══ */
.fs-search-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0; right: 0;
  z-index: 60;
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 217, 138, 0.22) transparent;
  background: rgba(16, 18, 40, 0.98);
  border: 1px solid rgba(255, 217, 138, 0.18);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  padding: 6px;
  -webkit-overflow-scrolling: touch;
}
.fs-search-dropdown::-webkit-scrollbar { width: 6px; background: transparent; }
.fs-search-dropdown::-webkit-scrollbar-thumb {
  background: rgba(255, 217, 138, 0.22);
  border-radius: 8px;
}
.fs-search-dropdown::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 217, 138, 0.38);
}
.fs-sd-loading, .fs-sd-empty {
  padding: 14px 12px;
  font-size: 0.78rem;
  color: var(--muted);
  text-align: center;
}
.fs-sd-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.82rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}
.fs-sd-item:hover { background: var(--overlay-08); }
.fs-sd-name {
  flex: 1; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-weight: 500;
}
.fs-sd-meta { font-size: 0.68rem; color: var(--muted); flex-shrink: 0; }
.fs-sd-go { font-size: 0.7rem; color: var(--accent); flex-shrink: 0; font-weight: 500; }

.fs-top-right { display: flex; align-items: center; gap: 8px; }
.fs-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 32px;
  padding: 0 14px;
  border-radius: var(--radius-full);
  border: none;
  font-family: var(--font);
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background var(--transition-normal), color var(--transition-normal);
  user-select: none;
}
/* 次按钮：纯 overlay 色块，无玻璃、无投影、无光辉 */
.fs-btn-glass {
  background: var(--overlay-04);
  color: var(--ink-secondary);
}
.fs-btn-glass:hover { background: var(--overlay-08); color: var(--ink); }
/* 主按钮：warm = accent 纯色块（无渐变），无阴影 */
.fs-btn-warm {
  background: var(--accent-subtle);
  color: var(--accent);
}
.fs-btn-warm:hover { background: color-mix(in srgb, var(--accent) 18%, transparent); }

/* ═══ 卷目筛选条（第 2 段 sticky）：纯背景色块右对齐，只保留排序；卷 Tab 移到书架下方 ═══ */
.fs-filters {
  position: sticky;
  top: 54px;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 8px 14px;
  margin: 0 0 18px;
  border-radius: var(--radius-md);
  background: var(--overlay-04);
}
/* 书架下的卷目 Tab（全部卷 / 官方星河 / 星友新作 / 匿名手记） */
.fs-shelf-volumes {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin: 0 2px 14px;
}
.fs-volumes { display: none; } /* 旧位置（filters 内）已弃用，留空避免样式冲突 */
.fs-volume-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  background: var(--overlay-04);
  color: var(--ink-secondary);
  border: none;
  font-family: var(--font); font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-normal);
}
.fs-volume-btn:hover { color: var(--ink); background: var(--overlay-08); }
.fs-volume-btn.active {
  background: var(--accent-subtle);
  color: var(--accent);
}
.fs-volume-count {
  font-size: 0.62rem;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--overlay-04);
  color: var(--muted);
  margin-left: 1px;
  font-variant-numeric: tabular-nums;
}
.fs-volume-btn.active .fs-volume-count {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: var(--accent);
}
.fs-sorts {
  display: inline-flex; align-items: center; gap: 8px;
  flex-shrink: 0;
}
.fs-sort-label {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.04em;
}
.fs-sort-select {
  appearance: none; -webkit-appearance: none;
  padding: 5px 24px 5px 10px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--overlay-04) url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>') no-repeat right 8px center;
  color: var(--ink-secondary);
  font-family: var(--font); font-size: 11.5px;
  cursor: pointer;
  font-weight: 500;
}
.fs-sort-select:hover { color: var(--accent); background-color: var(--overlay-08); }

/* ═══ section 通用头：对齐 StoryDetailCard 的标题节奏 ═══ */
.fs-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin: 24px 2px 12px;
}
.fs-head-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.fs-head-icon-wrap {
  width: 28px; height: 28px;
  border-radius: var(--radius-sm);
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.fs-head-icon-wrap.gold { background: var(--accent-subtle); color: var(--accent); }
.fs-head-icon-wrap.spark { background: rgba(255, 176, 122, 0.12); color: #ffb07a; }
.fs-head-icon-wrap.blue { background: rgba(158, 198, 255, 0.12); color: var(--star-blue); }
.fs-head-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--ink);
}
.fs-head-sub {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--muted);
  padding-left: 2px;
}
.fs-head-link, .fs-head-hint {
  font-size: 11.5px;
  letter-spacing: 0.04em;
  color: var(--accent);
  cursor: pointer;
  transition: color var(--transition-normal);
  font-weight: 500;
}
.fs-head-link:hover { filter: brightness(1.1); }
.fs-head-hint { cursor: default; color: var(--muted); font-weight: 500; }

/* section-head 右侧操作区（按钮组 + 链接）：横向排列 */
.fs-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
/* 八卷轴翻页按钮：放在标题行右侧，不悬浮卡片之上；accent-subtle 明显金色块背景，扁平无绝对定位 */
.fs-reels-nav-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.fs-reels-nav {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--accent-subtle);
  color: var(--accent);
  cursor: pointer;
  transition: background var(--transition-normal), color var(--transition-normal), opacity var(--transition-normal);
  padding: 0;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.16);
}
.fs-reels-nav:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 26%, transparent);
}
.fs-reels-nav:disabled { opacity: 0.3; cursor: default; }

/* ═══ ① 官方星河·八卷轴（横滑）═══════════════════════════════
   · 容器左右 padding=0，卷轴卡最左/最右与下方本周推荐边界对齐（一致）
   · 翻页按钮已上移到 section-head 右侧，不再悬浮在卡片区内
   · 全程扁平：无玻璃模糊、无渐变、无光辉投影 ═══════════════ */
.fs-reels-section { position: relative; }
.fs-reels {
  position: relative;
  padding: 10px 0;
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
  scrollbar-color: var(--rule) transparent;
  -webkit-overflow-scrolling: touch;
}
.fs-reels-track::-webkit-scrollbar { height: 4px; }
.fs-reels-track::-webkit-scrollbar-thumb {
  background: var(--rule);
  border-radius: 4px;
}

/* 单卷轴 card：极简扁平，纯 surface + 极轻阴影，无硬边框、无左色条、无浮起光辉 */
.fs-reel {
  --r-color: var(--accent);
  flex: 0 0 220px;
  min-height: 220px;
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-radius: var(--radius-xl);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.14);
  cursor: pointer;
  transition: background var(--transition-normal), box-shadow var(--transition-normal);
  overflow: hidden;
  color: var(--ink);
}
.fs-reel-inner {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 16px 14px;
  flex: 1;
}
.fs-reel:hover {
  background: var(--surface-hover);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}
.fs-reel-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  margin-bottom: 2px;
  background: var(--overlay-02);
}
.fs-reel-num {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--r-color);
  font-weight: 600;
  padding: 3px 9px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--r-color) 12%, transparent);
}
.fs-reel-count {
  font-size: 10.5px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.fs-reel-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.fs-reel-lib-wrap {
  width: 28px; height: 28px;
  border-radius: var(--radius-sm);
  display: inline-flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--r-color) 12%, transparent);
  color: var(--r-color);
  align-self: flex-start;
  flex-shrink: 0;
  margin-bottom: 2px;
}
.fs-reel-lib-icon {
  opacity: 1;
}
.fs-reel-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--ink);
  letter-spacing: 0.01em;
}
.fs-reel-desc {
  margin: 2px 0 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--ink-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.fs-reel-desc.is-empty { color: var(--muted); opacity: 0.7; font-style: italic; }
.fs-reel-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  margin-top: 2px;
}
.fs-reel-tag {
  display: inline-flex; align-items: center; gap: 3.5px;
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--accent);
  padding: 3px 10px;
  border-radius: var(--radius-full);
  background: var(--accent-subtle);
  font-weight: 500;
}
.fs-reel-read {
  font-size: 10.5px;
  letter-spacing: 0.03em;
  color: var(--r-color);
  font-weight: 600;
}
/* 骨架 */
.fs-reels-loading { opacity: 0.75; }
.fs-reel-skel {
  background: linear-gradient(120deg, var(--overlay-02) 20%, var(--overlay-04) 50%, var(--overlay-02) 80%) !important;
  background-size: 200% 100% !important;
  animation: fsShimmer 1.4s linear infinite;
  pointer-events: none;
}
.fs-reel-skel .fs-reel-inner > * { visibility: hidden; }
@keyframes fsShimmer {
  0% { background-position: 200% 0; } 100% { background-position: -200% 0; }
}

/* 本周推荐·三笺（极简扁平块面 + 轻阴影，无硬边框、无左色条、无渐变光辉） */
.fs-picks-section {}
.fs-picks {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.fs-pick {
  --p-color: var(--accent);
  position: relative;
  min-height: 200px;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: var(--surface);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.14);
  cursor: pointer;
  transition: background var(--transition-normal), box-shadow var(--transition-normal);
  color: var(--ink);
}
.fs-pick-body {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 18px 18px 16px;
  min-height: 100%;
  box-sizing: border-box;
}
.fs-pick:hover {
  background: var(--surface-hover);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}
.fs-pick.galaxy { background: color-mix(in srgb, var(--accent) 4%, var(--surface)); }
.fs-pick.anonymous { background: color-mix(in srgb, var(--star-purple) 4%, var(--surface)); }

.fs-pick-head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
/* Picks chip：纯块面，无硬边 */
.fs-pick-pickchip {
  display: inline-flex; align-items: center; gap: 3.5px;
  padding: 3px 9px;
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.4;
  background: var(--accent-subtle);
  color: var(--accent);
}
.fs-pick-pickchip-2 { background: rgba(202, 167, 255, 0.12); color: var(--star-purple); }
.fs-pick-pickchip-3 { background: rgba(244, 168, 184, 0.12); color: #f4a8b8; }
.fs-pick-pickchip-4 { background: rgba(122, 184, 240, 0.12); color: #7ab8f0; }
.fs-pick-pickchip-5 { background: rgba(149, 224, 192, 0.12); color: #95e0c0; }
.fs-pick-pickchip-6 { background: rgba(255, 217, 138, 0.12); color: #ffd98a; }

.fs-pick-title-block {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 11px;
  background: color-mix(in srgb, var(--p-color) 8%, transparent);
  border-radius: var(--radius-md);
}
.fs-pick-open {
  color: var(--p-color);
  opacity: 0.92;
  flex-shrink: 0;
}
.fs-pick-name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  letter-spacing: 0.01em;
  flex: 1;
  min-width: 0;
}
.fs-pick-tag {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 3px 9px;
  border-radius: var(--radius-full);
  font-size: 10px;
  letter-spacing: 0.02em;
  font-weight: 500;
  flex-shrink: 0;
  background: transparent;
}
.fs-pick-tag-galaxy {
  background: var(--accent-subtle);
  color: var(--accent);
}
.fs-pick-tag-anonymous {
  background: rgba(202, 167, 255, 0.12);
  color: var(--star-purple);
}
.fs-pick-tag-public {
  background: rgba(149, 240, 192, 0.09);
  color: var(--star-green);
}
.fs-pick-author {
  display: inline-flex; align-items: center; gap: 4px;
  align-self: flex-start;
  font-size: 10.5px;
  color: var(--ink-secondary);
  padding: 3px 10px;
  border-radius: var(--radius-full);
  background: var(--overlay-04);
  letter-spacing: 0.01em;
  font-weight: 500;
}
.fs-pick-author code {
  padding: 0 2px;
  background: var(--overlay-04);
  border-radius: 3px;
  font-family: ui-monospace, Consolas, Menlo, monospace;
  font-size: 10px;
  color: var(--muted);
}
.fs-pick-desc {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ink-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}
.fs-pick-desc.is-empty { color: var(--muted); opacity: 0.7; font-style: italic; }
.fs-pick-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  background: var(--overlay-04);
  border-radius: var(--radius-md);
  font-size: 11px;
  color: var(--muted);
  flex-wrap: wrap;
  font-weight: 500;
}
.fs-pick-meta-item {
  display: inline-flex; align-items: center; gap: 4px;
  font-variant-numeric: tabular-nums;
}
.fs-pick-meta-res { color: var(--star-red); font-weight: 600; }
.fs-pick-open-btn {
  margin-left: auto;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--p-color);
}

/* picks loading 骨架 */
.fs-picks-loading { opacity: 0.85; }
.fs-pick-skel {
  background: linear-gradient(120deg, var(--overlay-02) 20%, var(--overlay-04) 50%, var(--overlay-02) 80%) !important;
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
  color: var(--ink-secondary);
}
.fs-shelf-empty .cg-empty-title { margin: 8px 0 0; font-size: 0.9rem; color: var(--ink); font-weight: 500; }
.fs-shelf-empty .cg-empty-sub { margin: 2px 0 0; font-size: 0.76rem; color: var(--muted); }

.fs-loadmore, .fs-loadmore-hint, .fs-end-reach {
  margin: 22px 0 4px;
  text-align: center;
  font-size: 11.5px;
  color: var(--muted);
  letter-spacing: 0.04em;
  font-weight: 500;
}
.fs-loadmore { display: inline-flex; justify-content: center; gap: 6px; width: 100%; }
.spin-slow { animation: spin 1.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.fs-loadmore-hint { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; }
.fs-loadmore-auto { font-size: 10.5px; opacity: 0.7; }
.fs-end-reach { opacity: 0.65; font-style: italic; }

/* ═══ 页脚胶囊（纯块面，无硬边框） ═══ */
.fs-foot {
  margin-top: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-radius: var(--radius-full);
  background: var(--overlay-04);
  width: max-content;
  max-width: 100%;
  margin-inline: auto;
  font-weight: 500;
}
.fs-foot-chip {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px;
  color: var(--ink-secondary);
  letter-spacing: 0.02em;
  padding: 2px 10px;
  border-radius: var(--radius-full);
}
.fs-foot-chip b { color: var(--accent); font-weight: 600; margin: 0 1px; }

/* ═══════ 限流轻提示 ═══════ */
.fs-rate-hint {
  margin: 10px auto 2px;
  max-width: 560px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--accent);
  background: rgba(255, 217, 138, 0.08);
  border: 1px solid rgba(255, 217, 138, 0.22);
  text-align: center;
}

/* ═══════ 回顶部悬浮按钮（任务2） ═══════ */
/* 圆形玻璃钮，右下角固定；PC/移动端都显示（PC 顶栏常驻但长页面同样需要快捷回顶） */
.fs-back-top {
  position: fixed;
  right: 16px;
  bottom: 28px;
  z-index: 45;               /* 低于 .fs-top(50)，不与顶栏打架 */
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 30, 53, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 217, 138, 0.28);
  color: var(--accent);
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 217, 138, 0.06);
  transition: background var(--transition-normal), border-color var(--transition-normal),
              transform var(--transition-fast), box-shadow var(--transition-normal);
}
.fs-back-top:hover {
  background: rgba(202, 167, 255, 0.14);
  border-color: rgba(255, 217, 138, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45), 0 0 16px rgba(255, 217, 138, 0.15);
}
.fs-back-top:active { transform: scale(0.94); }
/* 进出场：淡入 + 上浮 */
.fs-backtop-enter-active, .fs-backtop-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.fs-backtop-enter-from, .fs-backtop-leave-to { opacity: 0; transform: translateY(10px) scale(0.9); }

/* ═══════ 响应式：平板 / 手机 ═══════ */
@media (max-width: 960px) {
  .fs-picks { grid-template-columns: 1fr 1fr; }
  .fs-pick:nth-child(3) { grid-column: 1 / -1; }
}
@media (max-width: 720px) {
  .fs-top {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    row-gap: 8px;
    padding: 8px 12px;
  }
  /* 明确 grid 位置：DOM 顺序为 left→mid→right，但 mid 跨两列会导致 auto-placement 把 right 推到第3行，
     必须显式指定 left/right 在第1行、mid 在第2行 */
  .fs-top-left { grid-column: 1; grid-row: 1; }
  .fs-top-right { grid-column: 2; grid-row: 1; justify-self: end; }
  .fs-top-mid { grid-column: 1 / -1; grid-row: 2; justify-content: stretch; }
  .fs-search-wrap { width: 100%; }
  .fs-search { width: 100%; }
  /* 移动端隐藏"写星笺"按钮，刷新按钮独占右上角 */
  .fs-btn-create { display: none; }
  /* 移动端退出按钮：仅显示 X 图标，省空间 */
  .fs-exit { height: 32px; padding: 0 9px; font-size: 0; }
  .fs-exit span { display: none; }
  /* 引导条：移动端与顶部栏「穹庭书局」品牌重复，且会与搜索框重叠 → 隐藏 */
  .fs-hero-strip { display: none; }
  /* 预留 fixed 顶部栏空间（实测顶部栏两行高约 91px + 1px 间距），
     避免"官方星河"等内容跑到顶部栏背景层被遮挡 */
  .fs-main { padding: 92px 14px 30px; }
  /* 移动端缩小 section-head 顶部 margin，让"官方星河"紧接顶部栏 */
  .fs-section-head { margin-top: 12px; }
  .fs-picks { grid-template-columns: 1fr; }
  .fs-pick { min-height: auto; }
  .fs-filters { flex-direction: column; align-items: stretch; }
  .fs-sorts { align-self: flex-end; }
  .fs-reels { padding: 8px 0; }
  .fs-reel { flex-basis: 180px; min-height: 200px; }
}
@media (max-width: 420px) {
  .fs-brand-title { font-size: 14px; }
  .fs-brand-sub { display: none; }
  .fs-pick-body { padding: 14px 16px; }
}
</style>
