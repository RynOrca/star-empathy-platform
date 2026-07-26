<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="detail-wrap">
      <!-- 左：叙事 + 故事面板 -->
      <div class="panel panel-stories">
        <!-- 叙事视图（默认） -->
        <template v-if="viewMode === 'narrative'">
          <!-- 古今共望叙事 -->
          <StarNarrative
            :content="narrative.content.value"
            :loading="narrative.loading.value"
            :error="narrative.error.value"
            :cached="narrative.cached.value"
            @retry="narrative.fetchNarrative(catalogStarId)"
          />

          <!-- 关于这颗星星的故事... 按钮入口 -->
          <button class="stories-entry-btn" @click="viewMode = 'stories'">
            <span class="stories-entry-text">
              关于{{ starInfo?.displayName || '这颗星星' }}的故事...
            </span>
            <span class="stories-entry-badge" v-if="realStories.length > 0">{{ realStories.length }}条</span>
            <ChevronDown :size="16" class="stories-entry-arrow" />
          </button>
        </template>

        <!-- 故事列表视图 -->
        <template v-else>
          <!-- 详情视图 -->
          <template v-if="detailStory">
            <div class="panel-header">
              <button class="back-btn" @click="detailStoryId = null">
                <ArrowLeft :size="15" />
                <span>所有故事</span>
              </button>
              <button class="back-btn" @click="viewMode = 'narrative'; detailStoryId = null">
                <span>返回叙事</span>
              </button>
            </div>
            <Transition name="detail" mode="out-in">
              <div :key="detailStory.id" class="detail-view">
                <h2 class="detail-title">{{ detailStory.title || '匿名心事' }}</h2>
                <div class="detail-info-bar">
                  <span v-if="detailStory.type === 'history'" class="meta-history">
                    来自星河
                    <template v-if="detailStory.origin"> · {{ detailStory.origin }}</template>
                  </span>
                  <template v-else>
                    <span v-if="formatTime(detailStory.createdAt)">{{ formatTime(detailStory.createdAt) }}</span>
                    <span v-if="formatTime(detailStory.createdAt) && formatDistance(detailStory.locationLat, detailStory.locationLng).text">·</span>
                    <span v-if="formatDistance(detailStory.locationLat, detailStory.locationLng).text" class="detail-dist" :class="{ 'meta-near': formatDistance(detailStory.locationLat, detailStory.locationLng).near }">{{ formatDistance(detailStory.locationLat, detailStory.locationLng).text }}</span>
                  </template>
                </div>
                <div class="detail-body">{{ detailStory.content }}</div>
                <div class="detail-footer">
                  <button
                    class="resonate-btn detail-resonate"
                    :class="{ done: justResonatedId === detailStory.id }"
                    :disabled="resonating"
                    @click.stop="onResonate(detailStory)"
                  >
                    <component :is="justResonatedId === detailStory.id ? Check : Sparkles" :size="16" />
                    <span>{{ justResonatedId === detailStory.id ? '已共鸣' : '共鸣' }}</span>
                    <span class="resonate-count">{{ detailStory.resonanceCount }}</span>
                  </button>
                </div>
              </div>
            </Transition>
          </template>

          <!-- 列表视图 -->
          <template v-else>
            <div class="panel-header">
              <button class="back-btn" @click="viewMode = 'narrative'">
                <ArrowLeft :size="15" />
                <span>返回叙事</span>
              </button>
            </div>
            <!-- 搜索 + 排序 -->
            <div class="list-toolbar" v-if="hasRealStory">
              <div class="search-box">
                <Search :size="13" class="search-icon" />
                <input
                  v-model="searchQuery"
                  class="search-input"
                  placeholder="搜索故事..."
                  @input="onSearchInput"
                />
                <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''"><X :size="12" /></button>
              </div>
              <div class="sort-group" ref="sortGroupRef">
                <ArrowUpDown :size="13" class="sort-icon" />
                <button class="sort-btn" @click="sortOpen = !sortOpen">
                  <span>{{ sortLabels[sortKey] }}</span>
                  <ChevronDown :size="12" class="sort-chevron" :class="{ open: sortOpen }" />
                </button>
                <Transition name="dropdown">
                  <ul v-if="sortOpen" class="sort-dropdown">
                    <li
                      v-for="(label, key) in sortLabels"
                      :key="key"
                      class="sort-option"
                      :class="{ active: sortKey === key }"
                      @click="sortKey = key as SortKey; sortOpen = false; onSortChange()"
                    >
                      <Check v-if="sortKey === key" :size="12" />
                      <span>{{ label }}</span>
                    </li>
                  </ul>
                </Transition>
              </div>
            </div>

            <div v-if="hasRealStory" class="story-list">
              <div
                v-for="(story, index) in displayedStories"
                :key="story.id"
                class="story-card"
                :style="{ animationDelay: `${index * 30}ms` }"
                  @click="openStoryDetail(story)"
              >
                <div class="story-head">
                  <h4 class="story-title">{{ story.title || '匿名心事' }}</h4>
                  <span v-if="story.username" class="story-sender">by {{ story.username }}</span>
                  <span v-else class="story-sender is-anon">匿名星语</span>
                  <span v-if="story.tag" class="story-tag" :class="'tag-' + story.tag">{{ story.tag }}</span>
                  <button
                    class="resonate-btn"
                    :class="{ done: justResonatedId === story.id }"
                    :disabled="resonating"
                    @click.stop="onResonate(story)"
                  >
                    <component :is="justResonatedId === story.id ? Check : Sparkles" :size="13" />
                    <span>{{ justResonatedId === story.id ? '已共鸣' : '共鸣' }}</span>
                  </button>
                </div>
                <p class="story-excerpt">{{ story.content }}</p>
                <div class="story-meta">
                  <span v-if="story.type === 'history'" class="meta-history">
                    来自星河
                    <template v-if="story.origin"> · {{ story.origin }}</template>
                  </span>
                  <template v-else>
                    <span v-if="formatTime(story.createdAt)" class="meta-time">{{ formatTime(story.createdAt) }}</span>
                    <span v-if="formatTime(story.createdAt) && formatDistance(story.locationLat, story.locationLng).text" class="meta-sep">·</span>
                    <span v-if="formatDistance(story.locationLat, story.locationLng).text" class="meta-dist" :class="{ 'meta-near': formatDistance(story.locationLat, story.locationLng).near }">{{ formatDistance(story.locationLat, story.locationLng).text }}</span>
                  </template>
                  <span class="meta-sep" v-if="(story.type === 'history' || formatTime(story.createdAt) || formatDistance(story.locationLat, story.locationLng).text)">·</span>
                  <Sparkles :size="12" /> <span>{{ story.resonanceCount }}</span>
                  <span class="meta-sep">·</span>
                  <Eye :size="11" /> <span>{{ getStoryViewCount(story.id) }}</span>
                </div>
              </div>
            </div>

            <!-- 搜索无结果 -->
            <div v-else-if="searchQuery && hasRealStory" class="empty-state">
              <Search :size="20" class="empty-icon" />
              <p class="empty-text">没有匹配的故事</p>
            </div>

            <div v-else class="empty-state">
              <Star :size="20" class="empty-icon" />
              <p>这颗星还在等待它的故事</p>
            </div>
          </template>
        </template>
      </div>

      <!-- 右：恒星信息 -->
      <div class="panel panel-info">
        <button class="close-btn" @click="$emit('close')"><X :size="15" /></button>

        <!-- 星名 -->
        <div class="star-header">
          <div class="star-color-dot" :style="{ background: starInfo?.color || '#fff6e8' }"></div>
          <div>
            <div class="star-name">{{ starInfo?.displayName }}</div>
            <div class="star-subtitle" v-if="starInfo">{{ starInfo.conName }}</div>
          </div>
        </div>

        <!-- 详细信息行 -->
        <div class="info-rows" v-if="starInfo">
          <div class="info-row">
            <Sun :size="14" class="info-icon" />
            <div class="info-row-content">
              <span class="info-row-label">视星等</span>
              <span class="info-row-value">{{ starInfo.mag.toFixed(1) }} 等</span>
            </div>
          </div>

          <div class="info-row" v-if="starInfo.distance">
            <Navigation :size="14" class="info-icon" />
            <div class="info-row-content">
              <span class="info-row-label">距离</span>
              <span class="info-row-value">{{ starInfo.distance }} 光年</span>
            </div>
          </div>

          <div class="info-row">
            <Thermometer :size="14" class="info-icon" />
            <div class="info-row-content">
              <span class="info-row-label">色温</span>
              <span class="info-row-value">{{ getStarTemperature(starInfo.color) }}</span>
            </div>
          </div>

          <div class="info-row">
            <Sparkles :size="14" class="info-icon" />
            <div class="info-row-content">
              <span class="info-row-label">亮度</span>
              <span class="info-row-value">{{ getBrightnessLabel(starInfo.mag) }}</span>
            </div>
          </div>
        </div>

        <!-- 统计行 -->
        <div class="stats-row" v-if="catalogStats">
          <div class="stat-item">
            <BookOpen :size="13" class="stat-icon" />
            <span class="stat-num">{{ catalogStats.storyCount }}</span>
            <span class="stat-label">故事</span>
          </div>
          <div class="stat-item">
            <Heart :size="13" class="stat-icon" />
            <span class="stat-num">{{ catalogStats.totalResonance }}</span>
            <span class="stat-label">共鸣</span>
          </div>
          <div class="stat-item">
            <Eye :size="13" class="stat-icon" />
            <span class="stat-num">{{ catalogStats.starViews }}</span>
            <span class="stat-label">访问</span>
          </div>
          <div class="stat-item">
            <Star :size="13" class="stat-icon" :class="{ 'is-favorited': isFavorited }" />
            <span class="stat-num">{{ catalogStats.favoriteCount }}</span>
            <span class="stat-label">收藏</span>
          </div>
        </div>

        <!-- 标签 -->
        <div class="info-section">
          <div class="info-label">
            标签
            <span v-if="kernel.loading.value" class="tag-loading">AI 分析中...</span>
            <span v-else-if="hasAiTags" class="tag-badge-ai">AI</span>
            <button
              v-if="!editingTags"
              class="tag-edit-btn"
              title="编辑标签"
              @click="startEditTags"
            >
              <PenSquare :size="11" />
            </button>
          </div>

          <!-- 编辑模式 -->
          <div v-if="editingTags" class="tag-editor">
            <div class="tag-editor-tags">
              <span
                v-for="(t, i) in customTags"
                :key="i"
                class="tag tag-editable"
                @click="removeCustomTag(i)"
              >
                {{ t }}
                <X :size="10" class="tag-remove-x" />
              </span>
              <span v-if="customTags.length === 0" class="tag-editor-hint">点击下方标签添加，或输入自定义标签</span>
            </div>
            <div class="tag-editor-input-row">
              <input
                v-model="newTagInput"
                class="tag-editor-input"
                placeholder="输入自定义标签..."
                @keydown.enter="addCustomTag"
              />
              <button class="tag-editor-add" @click="addCustomTag" :disabled="!newTagInput.trim()">添加</button>
            </div>
            <div class="tag-editor-suggestions" v-if="displayTags.length > 0">
              <span class="tag-editor-suggest-label">AI 建议：</span>
              <span
                v-for="t in displayTags"
                :key="t.tag"
                class="tag tag-suggestion"
                :class="{ 'tag-emotion': t.type === 'emotion', 'tag-theme': t.type === 'theme' }"
                @click="addCustomTagFromSuggestion(t.tag)"
              >
                {{ t.tag }}
              </span>
            </div>
            <div class="tag-editor-actions">
              <button class="tag-editor-save" @click="saveTags">保存</button>
              <button class="tag-editor-cancel" @click="cancelEditTags">取消</button>
            </div>
          </div>

          <!-- 展示模式 -->
          <div v-else class="info-tags">
            <span
              v-for="t in mergedTags"
              :key="t.tag"
              class="tag"
              :class="{
                'tag-emotion': t.type === 'emotion',
                'tag-theme': t.type === 'theme',
                'tag-custom': t.custom,
              }"
            >
              {{ t.tag }}
              <span v-if="t.count > 0" class="tag-count">{{ t.count }}</span>
            </span>
            <span v-if="mergedTags.length === 0 && !kernel.loading.value" class="tag is-empty">暂无标签</span>
          </div>
        </div>

        <div class="action-buttons">
          <button class="write-btn" @click="onWriteStory"><PenSquare :size="14" /> 写我的故事</button>
          <button
            class="fav-btn"
            :class="{ favorited: isFavorited }"
            @click="toggleFavorite"
          >
            <Star :size="14" :fill="isFavorited ? 'currentColor' : 'none'" />
            <span>{{ isFavorited ? '已收藏' : '收藏' }}</span>
          </button>
        </div>
        <div class="action-buttons-secondary">
          <button class="chat-btn" @click="openChat">
            <MessagesSquare :size="14" />
            <span>与古人共赏</span>
          </button>
        </div>

        <!-- 相似星星 -->
        <div class="info-section" v-if="similarStars.similarStars.value.length > 0">
          <div class="info-label">内核相似的星星</div>
          <div class="similar-list">
            <div
              v-for="s in similarStars.similarStars.value.slice(0, 5)"
              :key="s.catalogStarId"
              class="similar-item"
              @click="onSimilarStarClick(s.catalogStarId)"
            >
              <div class="similar-info">
                <span class="similar-name">{{ getStarName(s.catalogStarId) }}</span>
                <span class="similar-score">{{ Math.round(s.score * 100) }}%</span>
              </div>
              <div class="similar-tags">
                <span v-for="tag in s.sharedEmotions.slice(0, 3)" :key="tag" class="similar-tag-emotion">{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 天区故事精选 -->
        <div class="info-section" v-if="areaHighlightsData.length > 0">
          <div class="info-label">
            天区故事精选
            <span v-if="areaLoading" class="tag-loading">凝练中...</span>
          </div>
          <div class="highlight-list">
            <div
              v-for="(h, hi) in areaHighlightsData"
              :key="h.catalogStarId"
              class="highlight-card"
              :class="{ 'is-target': hi === 0 && h.score === 0 }"
              @click="h.catalogStarId !== catalogStarId && onSimilarStarClick(h.catalogStarId)"
            >
              <div class="highlight-head">
                <span class="highlight-star-name">
                  <span class="highlight-dot" :class="{ 'dot-target': hi === 0 && h.score === 0 }"></span>
                  {{ getStarName(h.catalogStarId) }}
                </span>
                <span v-if="h.score > 0" class="highlight-score">{{ Math.round(h.score * 100) }}%</span>
                <span v-else class="highlight-badge-target">当前</span>
              </div>
              <div class="highlight-emotions" v-if="h.sharedEmotions.length > 0">
                <span v-for="tag in h.sharedEmotions.slice(0, 3)" :key="tag" class="similar-tag-emotion">{{ tag }}</span>
              </div>
              <div class="highlight-essences">
                <p v-for="(essence, ei) in h.essences" :key="ei" class="highlight-essence">
                  "{{ essence }}"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 古人陪看聊天抽屉 -->
    <AncientChat
      :visible="showChat"
      :catalogStarId="catalogStarId"
      :starName="starInfo?.displayName || ''"
      :constellation="starInfo?.conName || ''"
      @close="showChat = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { Star, Sparkles, Check, PenSquare, X, ArrowLeft, Sun, Navigation, Thermometer, BookOpen, Heart, Eye, Search, ArrowUpDown, ChevronDown, MessagesSquare } from 'lucide-vue-next'
import StarNarrative from './StarNarrative.vue'
import AncientChat from './AncientChat.vue'
import { useNarrative } from '../composables/useNarrative'
import { useKernel } from '../composables/useKernel'
import { useSimilarStars } from '../composables/useSimilarStars'
import { useAreaHighlights } from '../composables/useAreaHighlights'
import catalogData from '../data/stars.json'

const props = defineProps<{
  stories: Array<{
    id: number
    title: string | null
    content: string
    resonanceCount: number
    createdAt: string
    locationLat: number | null
    locationLng: number | null
    type: string
    viewCount: number
    origin: string | null
    username: string | null
    tag: string | null
  }>
  activeIndex: number
  starInfo: { displayName: string; con: string; mag: number; conName: string; distance: number | null; ra: number; dec: number; color: string } | null
  catalogStats: { storyCount: number; totalResonance: number; totalViews: number; starViews: number; favoriteCount: number } | null
  catalogStarId: number
  resonating: boolean
  favoriteStarIds: number[]
}>()

const emit = defineEmits<{
  switch: [index: number]
  resonate: [id: number]
  refreshStories: []
  incrementViews: []
  incrementFavorites: []
  decrementFavorites: []
  updateFavoriteList: [data: { catalogStarId: number; favorited: boolean }]
  updateStats: [data: { storyCount: number; totalResonance: number; totalViews: number; starViews: number; favoriteCount: number }]
  close: []
  writeStory: []
  updateSimilarStars: [ids: number[]]
}>()

const realStories = computed(() => props.stories.filter(s => s.id > 0))
const hasRealStory = computed(() => realStories.value.length > 0)

// ─── 搜索 ───
const searchQuery = ref('')
const filteredStories = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return realStories.value
  return realStories.value.filter(s =>
    (s.title || '').toLowerCase().includes(q) ||
    s.content.toLowerCase().includes(q)
  )
})

// ─── 排序 ───
type SortKey = 'time' | 'distance' | 'resonance' | 'views' | 'random'
const sortKey = ref<SortKey>('time')
const sortOpen = ref(false)
const sortGroupRef = ref<HTMLElement | null>(null)
const sortLabels: Record<SortKey, string> = {
  time: '发布时间',
  distance: '发布距离',
  resonance: '共鸣数',
  views: '浏览数',
  random: '随机排序',
}
const randomSeed = ref(Date.now())

function onSortChange() {
  if (sortKey.value === 'random') randomSeed.value = Date.now()
}
function onSearchInput() { /* reactive */ }

// 稳定随机排序（同一 seed 不变）
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// 排序后的列表：来自星河始终置顶
const displayedStories = computed(() => {
  const history = filteredStories.value.filter(s => s.type === 'history')
  const user = filteredStories.value.filter(s => s.type !== 'history')

  const sortFn = getSortFn(sortKey.value)
  return [...history, ...user.sort(sortFn)]
})

function getSortFn(key: SortKey): (a: typeof filteredStories.value[0], b: typeof filteredStories.value[0]) => number {
  switch (key) {
    case 'time':
      return (a, b) => b.createdAt.localeCompare(a.createdAt)
    case 'distance': {
      return (a, b) => {
        const da = formatDistance(a.locationLat, a.locationLng)
        const db2 = formatDistance(b.locationLat, b.locationLng)
        // 有距离的排前面，无距离的排后面
        if (da.text && !db2.text) return -1
        if (!da.text && db2.text) return 1
        if (!da.text && !db2.text) return 0
        // 解析距离数值比较（简化：用 text 里的数字）
        const na = parseFloat(da.text) || 0
        const nb = parseFloat(db2.text) || 0
        return na - nb
      }
    }
    case 'resonance':
      return (a, b) => b.resonanceCount - a.resonanceCount
    case 'views':
      return (a, b) => getStoryViewCount(b.id) - getStoryViewCount(a.id)
    case 'random': {
      const rng = seededRandom(randomSeed.value)
      return () => rng() - 0.5
    }
  }
}

// 本地浏览数覆盖（乐观更新）
const viewCountOverrides = reactive(new Map<number, number>())
function getStoryViewCount(storyId: number): number {
  if (viewCountOverrides.has(storyId)) return viewCountOverrides.get(storyId)!
  const s = props.stories.find(s => s.id === storyId)
  return s?.viewCount ?? 0
}

const detailStoryId = ref<number | null>(null)
const detailStory = computed(() => {
  if (detailStoryId.value === null) return null
  return realStories.value.find(s => s.id === detailStoryId.value) ?? null
})
const justResonatedId = ref<number | null>(null)
const viewMode = ref<'narrative' | 'stories'>('narrative')

// ─── 古今共望叙事 ───
const narrative = useNarrative()
watch(() => props.catalogStarId, (id) => {
  if (id) {
    narrative.reset()
    narrative.fetchNarrative(id)
  }
}, { immediate: true })

// ─── AI 故事内核标签 ───
const kernel = useKernel()
watch(() => props.catalogStarId, (id) => {
  if (id) {
    kernel.reset()
    kernel.fetchAggregatedTags(id)
  }
}, { immediate: true })

// ─── 相似星星 ───
const similarStars = useSimilarStars(() => props.catalogStarId)
watch(() => similarStars.similarStars.value, (stars) => {
  emit('updateSimilarStars', stars.map(s => s.catalogStarId))
})

// ─── 天区故事精选 ───
const areaHighlights = useAreaHighlights(() => props.catalogStarId)
const { highlights: areaHighlightsData, loading: areaLoading } = areaHighlights
// 用 computed 别名保持模板简洁
const areaHighlightsList = computed(() => areaHighlightsData.value)

// 星表查找
const catalogLookup = new Map<number, { name: string | null; con: string }>()
for (const s of (catalogData as any).stars) {
  catalogLookup.set(s.id, { name: s.name, con: s.con })
}
function getStarName(catalogStarId: number): string {
  const s = catalogLookup.get(catalogStarId)
  return s?.name || s?.con || `恒星 #${catalogStarId}`
}
function onSimilarStarClick(catalogStarId: number) {
  emit('close')
  // 模拟点击该星：通过全局事件通知 SkyPage
  window.dispatchEvent(new CustomEvent('fly-to-star', { detail: { catalogStarId } }))
}

// ─── 用户当前位置（用于计算距离） ───
const userPosition = ref<{ lat: number; lng: number } | null>(null)

onMounted(() => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userPosition.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      },
      () => { /* 静默 */ },
      { timeout: 5000 },
    )
  }

  // 点击外部关闭排序下拉
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})

function onDocumentClick(e: MouseEvent) {
  if (sortOpen.value && sortGroupRef.value && !sortGroupRef.value.contains(e.target as Node)) {
    sortOpen.value = false
  }
}

function onResonate(story: { id: number; resonanceCount: number }) {
  emit('resonate', story.id)
  justResonatedId.value = story.id
  setTimeout(() => { justResonatedId.value = null }, 2000)
}

// ─── 收藏 ───
const isFavorited = computed(() => props.favoriteStarIds.includes(props.catalogStarId))

function getToken() { return localStorage.getItem('token') }

async function toggleFavorite() {
  const token = getToken()
  if (!token) {
    alert('请先登录后再收藏')
    return
  }
  const prev = isFavorited.value
  if (prev) { emit('decrementFavorites') } else { emit('incrementFavorites') }
  try {
    const method = prev ? 'DELETE' : 'POST'
    const res = await fetch(`/api/catalog/stars/${props.catalogStarId}/favorite`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('收藏失败')
    emit('updateFavoriteList', { catalogStarId: props.catalogStarId, favorited: !prev })
    fetchCatalogStatsFromFront()
  } catch {
    if (prev) { emit('incrementFavorites') } else { emit('decrementFavorites') }
    alert('收藏失败，请重试')
  }
}

async function fetchCatalogStatsFromFront() {
  try {
    const res = await fetch(`/api/catalog/stars/${props.catalogStarId}/stats`)
    const json = await res.json()
    if (res.ok) {
      // 通知父组件更新
      emit('updateStats', json.data)
    }
  } catch { /* 静默 */ }
}

function onWriteStory() { emit('writeStory') }

// ─── 古人陪看聊天 ───
const showChat = ref(false)
function openChat() { showChat.value = true }

// 打开故事详情 + 记录浏览（乐观更新）
function openStoryDetail(story: { id: number }) {
  detailStoryId.value = story.id
  // 乐观更新浏览数
  const current = getStoryViewCount(story.id)
  viewCountOverrides.set(story.id, current + 1)
  // 通知父组件更新统计行
  emit('incrementViews')
  // 后端记录 + 重新拉取
  fetch(`/api/stories/${story.id}/view`, { method: 'POST' })
    .then(() => emit('refreshStories'))
    .catch(() => {
      // 失败回滚
      viewCountOverrides.set(story.id, current)
    })
}

// ─── 时间格式化 ───
function formatTime(createdAt: string): string {
  if (!createdAt) return ''
  const date = new Date(createdAt + 'Z') // SQLite datetime is UTC
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} 个月前`
  return `${Math.floor(months / 12)} 年前`
}

// ─── 赤经格式化 ───
function formatRA(ra: number): string {
  const h = Math.floor(ra)
  const m = Math.floor((ra - h) * 60)
  const s = Math.floor(((ra - h) * 60 - m) * 60)
  return `${h}h ${m}m ${s}s`
}

// ─── 赤纬格式化 ───
function formatDEC(dec: number): string {
  const sign = dec >= 0 ? '+' : '-'
  const abs = Math.abs(dec)
  const d = Math.floor(abs)
  const m = Math.floor((abs - d) * 60)
  return `${sign}${d}° ${m}′`
}

// ─── 恒星色温（从颜色字段推导光谱类型） ───
function getStarTemperature(color: string): string {
  const map: Record<string, string> = {
    '#9bb0ff': 'O型 · 30000K+ · 蓝白巨星',
    '#aabfff': 'B型 · 10000~30000K · 蓝白',
    '#cad7ff': 'A型 · 7500~10000K · 白色',
    '#f8f7ff': 'F型 · 6000~7500K · 黄白',
    '#fff4ea': 'G型 · 5200~6000K · 黄色（类太阳）',
    '#ffd2a1': 'K型 · 3700~5200K · 橙色',
    '#ffcc6f': 'K型 · 3700~5200K · 橙色',
    '#ffb56c': 'K型 · 3700~5200K · 橙色',
    '#ffa64d': 'K型 · 3700~5200K · 橙色',
    '#ff8b3c': 'M型 · 2400~3700K · 红矮星',
    '#ff7124': 'M型 · 2400~3700K · 红矮星',
    '#ffc878': 'K型 · 3700~5200K · 橙色',
    '#ffe0b0': 'G/K型 · 5200K · 黄白',
    '#fff6e8': 'F/G型 · 6000K · 白黄',
    '#ffc470': 'K型 · 3700~5200K · 橙色',
    '#c8d8ff': 'A型 · 7500~10000K · 白色',
    '#ff8a60': 'M型 · 2400~3700K · 红矮星',
    '#f0f0ff': 'A型 · 7500~10000K · 白色',
    '#a0b8ff': 'B型 · 10000~30000K · 蓝白',
  }
  return map[color] || '未知光谱型'
}

// ─── 亮度等级描述 ───
function getBrightnessLabel(mag: number): string {
  if (mag < 0) return '极亮（负星等）'
  if (mag < 1) return '一等亮星'
  if (mag < 2) return '二等亮星'
  if (mag < 3) return '三等星'
  if (mag < 4) return '四等星（肉眼清晰）'
  if (mag < 5) return '五等星（肉眼可见）'
  if (mag < 6) return '六等星（肉眼极限）'
  return '暗星（需望远镜）'
}

// ─── 距离格式化（Haversine 公式） ───
interface DistanceResult { text: string; near: boolean }

function formatDistance(lat: number | null, lng: number | null): DistanceResult {
  if (lat == null || lng == null || !userPosition.value) return { text: '', near: false }
  return calcDistance(userPosition.value.lat, userPosition.value.lng, lat, lng)
}

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): DistanceResult {
  const R = 6371 // km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const km = R * c
  if (km < 1) return { text: '<1km', near: true }
  if (km < 100) return { text: `${km.toFixed(1)}km`, near: true }
  return { text: `${Math.round(km)}km`, near: false }
}

// ─── 标签：优先 AI 内核标签，回退到正则匹配 ───
const displayTags = computed<{ tag: string; count: number; type: 'emotion' | 'theme' }[]>(() => {
  const aiTags = kernel.aggregatedTags.value
  if (aiTags && (aiTags.emotionalTags.length > 0 || aiTags.themes.length > 0)) {
    return [
      ...aiTags.emotionalTags.map(t => ({ tag: t.tag, count: t.count, type: 'emotion' as const })),
      ...aiTags.themes.map(t => ({ tag: t.tag, count: t.count, type: 'theme' as const })),
    ].slice(0, 8)
  }

  // 回退到旧的正则匹配
  if (!hasRealStory.value) return []
  const all = realStories.value.map(s => (s.title || '') + ' ' + s.content).join(' ')
  const tags: { tag: string; count: number; type: 'emotion' | 'theme' }[] = []
  if (/月|嫦娥|广寒/.test(all)) tags.push({ tag: '月亮', count: 0, type: 'theme' })
  if (/星|天狼|织女|银河/.test(all)) tags.push({ tag: '星辰', count: 0, type: 'theme' })
  if (/爱|恋|相思/.test(all)) tags.push({ tag: '思念', count: 0, type: 'emotion' })
  if (/独|孤|寂|一人/.test(all)) tags.push({ tag: '孤独', count: 0, type: 'emotion' })
  if (/梦|想/.test(all)) tags.push({ tag: '梦想', count: 0, type: 'theme' })
  if (/家|乡|故/.test(all)) tags.push({ tag: '思乡', count: 0, type: 'emotion' })
  if (/毕业|青春/.test(all)) tags.push({ tag: '青春', count: 0, type: 'theme' })
  if (tags.length === 0) tags.push({ tag: '星空', count: 0, type: 'theme' })
  return tags
})

const hasAiTags = computed(() => {
  const ai = kernel.aggregatedTags.value
  return ai && (ai.emotionalTags.length > 0 || ai.themes.length > 0)
})

// ─── 标签编辑 ───
const editingTags = ref(false)
const customTags = ref<string[]>([])
const newTagInput = ref('')
const STORAGE_KEY_PREFIX = 'star-custom-tags-'

function loadCustomTags(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + props.catalogStarId)
    customTags.value = stored ? JSON.parse(stored) : []
  } catch {
    customTags.value = []
  }
}

function persistCustomTags(): void {
  localStorage.setItem(STORAGE_KEY_PREFIX + props.catalogStarId, JSON.stringify(customTags.value))
}

function startEditTags(): void {
  loadCustomTags()
  editingTags.value = true
}

function addCustomTag(): void {
  const tag = newTagInput.value.trim()
  if (!tag || customTags.value.includes(tag)) {
    newTagInput.value = ''
    return
  }
  customTags.value.push(tag)
  newTagInput.value = ''
}

function addCustomTagFromSuggestion(tag: string): void {
  if (customTags.value.includes(tag)) return
  customTags.value.push(tag)
}

function removeCustomTag(index: number): void {
  customTags.value.splice(index, 1)
}

function saveTags(): void {
  persistCustomTags()
  editingTags.value = false
}

function cancelEditTags(): void {
  customTags.value = []
  editingTags.value = false
}

// 合并 AI 标签和用户自定义标签
const mergedTags = computed<{ tag: string; count: number; type: 'emotion' | 'theme'; custom: boolean }[]>(() => {
  const aiTags = displayTags.value.map(t => ({ ...t, custom: false }))
  const custom = customTags.value.map(t => ({
    tag: t,
    count: 0,
    type: 'theme' as const,
    custom: true,
  }))
  // 自定义标签优先显示，去重
  const customNames = new Set(custom.map(t => t.tag))
  const filteredAi = aiTags.filter(t => !customNames.has(t.tag))
  return [...custom, ...filteredAi]
})

// 当切换恒星时，重新加载自定义标签
watch(() => props.catalogStarId, () => {
  loadCustomTags()
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
  z-index: 100;
  animation: fadeIn 0.15s ease-out;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ─── Container ─── */
.detail-wrap {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  width: 88vw;
  max-width: 1300px;
  animation: slideUp 0.2s ease-out;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Panel Base ─── */
.panel {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

/* ─── Left: Stories Panel (fixed height, scrollable) ─── */
.panel-stories {
  flex: 1;
  min-width: 0;
  height: 70vh;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Stories Entry Button ─── */
.stories-entry-btn {
  padding: 14px 28px;
  border: none;
  border-top: 1px solid var(--rule);
  background: rgba(255, 255, 255, 0.02);
  color: var(--ink-secondary);
  font-family: var(--font);
  font-size: 0.84rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
  margin-top: auto;
}
.stories-entry-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--ink);
}
.stories-entry-text {
  flex: 1;
  text-align: left;
  font-weight: 500;
}
.stories-entry-badge {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--muted-light);
}
.stories-entry-arrow {
  color: var(--muted-light);
  transition: transform 0.2s;
}

/* ─── Panel Header (back button) ─── */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--rule);
  flex-shrink: 0;
}
.panel-title {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--ink-secondary);
}
.panel-count {
  font-size: 0.75rem;
  color: var(--muted-light);
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 10px;
}

/* ─── List Toolbar (Search + Sort) ─── */
.list-toolbar {
  display: flex;
  gap: 8px;
  padding: 10px 24px;
  border-bottom: 1px solid var(--rule);
  flex-shrink: 0;
}
.search-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 10px;
  color: var(--muted-light);
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding: 7px 28px 7px 30px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.8rem;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.search-input::placeholder { color: var(--muted-light); opacity: 0.6; }
.search-input:focus { border-color: var(--accent-border); }
.search-clear {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  color: var(--muted-light);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
}
.sort-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.sort-icon { color: var(--muted-light); }
.sort-btn {
  padding: 7px 10px 7px 8px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink-secondary);
  font-family: var(--font);
  font-size: 0.78rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  transition: border-color 0.15s;
}
.sort-btn:hover { border-color: var(--accent-border); }
.sort-chevron {
  color: var(--muted-light);
  transition: transform 0.2s;
}
.sort-chevron.open { transform: rotate(180deg); }

/* ─── Sort Dropdown ─── */
.sort-group { position: relative; }
.sort-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 120px;
  list-style: none;
  margin: 0;
  padding: 4px;
  background: rgba(15, 15, 25, 0.95);
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  z-index: 50;
}
.sort-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 0.78rem;
  color: var(--ink-secondary);
  cursor: pointer;
  transition: background 0.1s;
}
.sort-option:hover { background: rgba(255, 255, 255, 0.04); }
.sort-option.active { color: var(--accent); }

/* ─── Dropdown Transition ─── */
.dropdown-enter-active { transition: opacity 0.15s, transform 0.15s; }
.dropdown-leave-active { transition: opacity 0.1s, transform 0.1s; }
.dropdown-enter-from { opacity: 0; transform: translateY(-6px); }
.dropdown-leave-to { opacity: 0; transform: translateY(-4px); }

/* ─── Detail View Transition ─── */
.detail-enter-active { transition: opacity 0.2s ease-out, transform 0.2s ease-out; }
.detail-leave-active { transition: opacity 0.12s ease-in, transform 0.12s ease-in; }
.detail-enter-from { opacity: 0; transform: translateX(12px); }
.detail-leave-to { opacity: 0; transform: translateX(-8px); }

/* ─── Back Button ─── */
.back-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-family: var(--font);
  font-size: 0.82rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  transition: opacity 0.15s;
}
.back-btn:hover { opacity: 0.7; }

/* ─── Story List ─── */
.story-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.story-list::-webkit-scrollbar {
  width: 5px;
}
.story-list::-webkit-scrollbar-track {
  background: transparent;
}
.story-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.story-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.18);
}

/* ─── Story Card ─── */
.story-card {
  padding: 16px 20px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
  cursor: pointer;
  animation: cardIn 0.25s ease-out both;
}
.story-card:hover {
  border-color: var(--rule);
  background: rgba(255, 255, 255, 0.02);
}
.story-card:active {
  transform: scale(0.99);
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.story-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 4px;
}
.story-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.4;
  word-break: break-word;
  overflow-wrap: break-word;
}

/* ─── Resonate Button ─── */
.resonate-btn {
  flex-shrink: 0;
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  background: var(--accent-subtle);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-size: 0.78rem;
  font-family: var(--font);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition-fast), opacity var(--transition-fast), transform var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 5px;
}
.resonate-btn:hover:not(:disabled) {
  background: rgba(255, 217, 138, 0.15);
}
.resonate-btn:active:not(:disabled) {
  transform: scale(0.95);
}
.resonate-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
.resonate-btn.done {
  border-color: rgba(149, 240, 192, 0.25);
  background: rgba(149, 240, 192, 0.08);
  color: var(--star-green);
}

.story-excerpt {
  margin: 0 0 8px;
  color: var(--ink-secondary);
  font-size: 0.85rem;
  line-height: 1.6;
  word-break: break-word;
  overflow-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.story-meta {
  font-size: 0.75rem;
  color: var(--muted-light);
  display: flex;
  align-items: center;
  gap: 5px;
}
.meta-time { color: var(--muted-light); }
.meta-dist { color: var(--star-blue); }
.meta-near { color: var(--accent); font-weight: 500; }
.meta-sep { opacity: 0.4; }
.meta-history {
  font-size: 0.72rem;
  padding: 1px 7px;
  border-radius: 4px;
  background: rgba(202, 167, 255, 0.1);
  border: 1px solid rgba(202, 167, 255, 0.15);
  color: var(--star-purple);
}

/* ─── Detail View ─── */
.detail-view {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.detail-view::-webkit-scrollbar {
  width: 5px;
}
.detail-view::-webkit-scrollbar-track {
  background: transparent;
}
.detail-view::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.detail-view::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.18);
}
.detail-title {
  margin: 0 0 4px;
  font-size: 1.08rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.5;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--rule);
  word-break: break-word;
  overflow-wrap: break-word;
}
.detail-info-bar {
  font-size: 0.78rem;
  color: var(--muted-light);
  padding-top: 10px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.detail-info-bar span:nth-child(1n+3) { color: var(--star-blue); }
.detail-body {
  flex: 1;
  color: var(--ink-secondary);
  font-size: 0.9rem;
  line-height: 1.85;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
}
.detail-footer {
  flex-shrink: 0;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--rule);
}
.detail-resonate {
  padding: 8px 16px;
  font-size: 0.85rem;
  gap: 6px;
}
.resonate-count {
  margin-left: 4px;
  opacity: 0.6;
  font-weight: 400;
}

/* ─── Empty State ─── */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--muted-light);
  font-size: 0.85rem;
}
.empty-icon { opacity: 0.2; }

/* ─── Right: Info Panel ─── */
.panel-info {
  width: 340px;
  flex-shrink: 0;
  padding: 24px;
  position: relative;
  height: 70vh;
  max-height: 600px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.panel-info::-webkit-scrollbar { width: 5px; }
.panel-info::-webkit-scrollbar-track { background: transparent; }
.panel-info::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

/* ─── Star Header ─── */
.star-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.star-color-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.08);
}
.star-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.02em;
  line-height: 1.3;
}
.star-subtitle {
  font-size: 0.78rem;
  color: var(--muted);
  margin-top: 2px;
}

/* ─── Info Rows ─── */
.info-rows {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--rule);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.info-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.info-icon {
  color: var(--muted-light);
  flex-shrink: 0;
  margin-top: 1px;
}
.info-row-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.info-row-label {
  font-size: 0.72rem;
  color: var(--muted-light);
  line-height: 1;
}
.info-row-value {
  font-size: 0.82rem;
  color: var(--ink-secondary);
  line-height: 1.4;
  word-break: break-word;
}

/* ─── Stats Row ─── */
.stats-row {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--rule);
  display: flex;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--rule);
}
.stat-item {
  flex: 1;
  padding: 10px 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: rgba(255, 255, 255, 0.015);
  border-right: 1px solid var(--rule);
}
.stat-item:last-child { border-right: none; }
.stat-icon {
  color: var(--muted-light);
}
.stat-num {
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent);
}
.stat-label {
  font-size: 0.7rem;
  color: var(--muted-light);
}

.info-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--rule);
}
.info-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--muted);
  margin-bottom: 10px;
}
.info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag {
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--ink-secondary);
  border: 1px solid var(--rule);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.tag-emotion {
  border-color: rgba(255, 139, 125, 0.25);
  background: rgba(255, 139, 125, 0.06);
  color: #ff8b7d;
}
.tag-theme {
  border-color: rgba(134, 168, 255, 0.25);
  background: rgba(134, 168, 255, 0.06);
  color: #86a8ff;
}
.tag-count {
  font-size: 0.65rem;
  opacity: 0.6;
  font-weight: 500;
}
.tag.is-empty {
  opacity: 0.3;
  font-style: italic;
}
.tag-loading {
  font-size: 0.7rem;
  color: var(--accent);
  opacity: 0.7;
  font-style: italic;
  animation: pulse 1.5s ease-in-out infinite;
}
.tag-badge-ai {
  font-size: 0.6rem;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(255, 217, 138, 0.15);
  color: var(--accent);
  font-weight: 600;
  letter-spacing: 0.05em;
}
@keyframes pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 0.3; }
}

/* ─── Tag Edit Button ─── */
.tag-edit-btn {
  background: none;
  border: none;
  color: var(--muted-light);
  cursor: pointer;
  padding: 2px;
  display: inline-flex;
  align-items: center;
  opacity: 0.5;
  transition: opacity 0.15s, color 0.15s;
  vertical-align: middle;
  margin-left: 2px;
}
.info-label:hover .tag-edit-btn,
.tag-edit-btn:hover {
  opacity: 1;
}
.tag-edit-btn:hover {
  color: var(--accent);
}

/* ─── Tag Editor ─── */
.tag-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
}
.tag-editor-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 24px;
}
.tag-editable {
  cursor: pointer;
  padding-right: 6px;
  transition: background 0.15s;
}
.tag-editable:hover {
  background: rgba(255, 100, 100, 0.1);
  border-color: rgba(255, 100, 100, 0.3);
}
.tag-remove-x {
  opacity: 0.5;
}
.tag-editable:hover .tag-remove-x {
  opacity: 1;
}
.tag-editor-hint {
  font-size: 0.72rem;
  color: var(--muted-light);
  font-style: italic;
}
.tag-editor-input-row {
  display: flex;
  gap: 6px;
}
.tag-editor-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.78rem;
  outline: none;
  transition: border-color 0.15s;
}
.tag-editor-input:focus {
  border-color: var(--accent-border);
}
.tag-editor-input::placeholder {
  color: var(--muted-light);
  opacity: 0.5;
}
.tag-editor-add {
  padding: 6px 12px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--accent-subtle);
  color: var(--accent);
  font-family: var(--font);
  font-size: 0.75rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.tag-editor-add:hover:not(:disabled) {
  background: rgba(255, 217, 138, 0.15);
}
.tag-editor-add:disabled {
  opacity: 0.4;
  cursor: default;
}
.tag-editor-suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.tag-editor-suggest-label {
  font-size: 0.7rem;
  color: var(--muted-light);
  margin-right: 2px;
}
.tag-suggestion {
  cursor: pointer;
  transition: opacity 0.15s;
  font-size: 0.7rem;
  padding: 2px 8px;
}
.tag-suggestion:hover {
  opacity: 0.7;
}
.tag-editor-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.tag-editor-save {
  padding: 5px 14px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: rgba(0, 0, 0, 0.75);
  font-family: var(--font);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.tag-editor-save:hover {
  background: var(--accent-hover);
}
.tag-editor-cancel {
  padding: 5px 14px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink-secondary);
  font-family: var(--font);
  font-size: 0.78rem;
  cursor: pointer;
  transition: border-color 0.15s;
}
.tag-editor-cancel:hover {
  border-color: var(--rule-hover);
}

/* ─── Custom Tag ─── */
.tag-custom {
  border-style: dashed;
  border-color: rgba(255, 217, 138, 0.3);
  color: var(--accent);
}

/* ─── Action Buttons ─── */
.action-buttons {
  margin-top: 20px;
  display: flex;
  gap: 8px;
}
.write-btn {
  flex: 1;
  padding: 10px 0;
  border-radius: var(--radius-md);
  background: var(--accent);
  border: none;
  color: rgba(0, 0, 0, 0.75);
  font-family: var(--font);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.write-btn:hover {
  background: var(--accent-hover);
}
.write-btn:active {
  transform: scale(0.98);
}

/* ─── Favorite Button ─── */
.fav-btn {
  padding: 10px 16px;
  border-radius: var(--radius-md);
  background: transparent;
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-family: var(--font);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.fav-btn:hover {
  background: var(--accent-subtle);
}
.fav-btn.favorited {
  border-color: var(--accent);
  background: var(--accent-subtle);
  color: var(--accent);
}
.fav-btn:active {
  transform: scale(0.98);
}
.fav-count {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-left: -2px;
}
.stat-icon.is-favorited {
  color: var(--accent);
}

/* ─── Close Button ─── */
.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
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

/* ── 发送者 ── */
.story-sender {
  display: inline-block; font-size: 0.72rem; color: #7a8cc0;
  margin-left: auto; opacity: 0.7;
}
.story-sender.is-anon { color: #5a5580; }

/* ── 情绪标签色 ── */
.story-tag {
  display: inline-block; padding: 2px 8px; border-radius: 10px;
  font-size: 0.7rem; font-weight: 500; margin-left: 4px;
  background: rgba(255,255,255,0.08); color: #7a759c;
}
.story-tag.tag-思念 { color: #ff8b7d; }
.story-tag.tag-等待 { color: #86a8ff; }
.story-tag.tag-离别 { color: #caa7ff; }
.story-tag.tag-愿望 { color: #ffd98a; }
.story-tag.tag-孤独 { color: #95f0c0; }
.close-btn:hover {
  color: var(--ink);
  border-color: var(--rule-hover);
}

/* ─── Chat Button ─── */
.action-buttons-secondary {
  margin-top: 10px;
}
.chat-btn {
  width: 100%;
  padding: 10px 0;
  border-radius: var(--radius-md);
  background: transparent;
  border: 1px solid var(--star-purple);
  color: var(--star-purple);
  font-family: var(--font);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.chat-btn:hover {
  background: rgba(202, 167, 255, 0.1);
}
.chat-btn:active {
  transform: scale(0.98);
}

/* ─── Similar Stars ─── */
.similar-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.similar-item {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.similar-item:hover {
  border-color: var(--accent-border);
  background: rgba(255, 217, 138, 0.04);
}
.similar-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.similar-name {
  font-size: 0.8rem;
  color: var(--ink);
  font-weight: 500;
}
.similar-score {
  font-size: 0.72rem;
  color: var(--accent);
  font-weight: 600;
}
.similar-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.similar-tag-emotion {
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(255, 139, 125, 0.1);
  color: #ff8b7d;
  border: 1px solid rgba(255, 139, 125, 0.15);
}

/* ─── 天区故事精选 ─── */
.highlight-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.highlight-card {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--rule);
  background: rgba(255, 255, 255, 0.015);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.highlight-card:hover {
  border-color: var(--accent-border);
  background: rgba(255, 217, 138, 0.03);
}
.highlight-card.is-target {
  border-color: rgba(255, 217, 138, 0.2);
  background: rgba(255, 217, 138, 0.04);
}
.highlight-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.highlight-star-name {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 6px;
}
.highlight-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  opacity: 0.5;
}
.highlight-dot.dot-target {
  opacity: 1;
  box-shadow: 0 0 4px var(--accent);
}
.highlight-score {
  font-size: 0.7rem;
  color: var(--accent);
  font-weight: 600;
}
.highlight-badge-target {
  font-size: 0.6rem;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(255, 217, 138, 0.12);
  color: var(--accent);
  font-weight: 500;
}
.highlight-emotions {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-bottom: 6px;
}
.highlight-essences {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.highlight-essence {
  margin: 0;
  font-size: 0.73rem;
  color: var(--ink-secondary);
  line-height: 1.6;
  font-style: italic;
  opacity: 0.75;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
