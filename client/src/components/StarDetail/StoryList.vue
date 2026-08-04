<template>
  <div class="story-list-container">
    <!-- 搜索 + 排序 -->
    <div v-if="showToolbar && stories.length > 0" class="list-toolbar">
      <div class="search-box">
        <SearchIcon :size="13" class="search-icon" />
        <input
          :value="searchQuery"
          class="search-input"
          placeholder="搜索故事..."
          @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        />
        <button v-if="searchQuery" class="search-clear" @click="$emit('update:searchQuery', '')"><XIcon :size="12" /></button>
      </div>
      <div class="sort-group" ref="sortGroupRef">
        <ArrowUpDownIcon :size="13" class="sort-icon" />
        <button class="sort-btn" @click="sortOpen = !sortOpen">
          <span>{{ sortLabels[sortKey ?? 'time'] }}</span>
          <ChevronDownIcon :size="12" class="sort-chevron" :class="{ open: sortOpen }" />
        </button>
        <Transition name="dropdown">
          <ul v-if="sortOpen" class="sort-dropdown">
            <li
              v-for="(label, key) in sortLabels"
              :key="key"
              class="sort-option"
              :class="{ active: sortKey === key }"
              @click="onSortSelect(key)"
            >
              <CheckIcon v-if="sortKey === key" :size="12" />
              <span>{{ label }}</span>
            </li>
          </ul>
        </Transition>
      </div>
    </div>

    <!-- 故事卡片列表 -->
    <div v-if="stories.length > 0" class="story-list">
      <StoryCard
        v-for="(story, index) in stories"
        :key="story.id"
        :story="story"
        :variant="variant"
        :renderedContent="renderedContent(story)"
        :displayResonance="displayResonance(story)"
        :displayViews="displayViews(story)"
        :isResonated="isResonated(story)"
        :resonating="resonating"
        :formattedTime="variant !== 'history' && formattedTime ? formattedTime(story) : undefined"
        :formattedDistance="variant !== 'history' && formattedDistance ? formattedDistance(story) : undefined"
        :collectionName="getStoryCollection(story)?.name || null"
        :collectionCoverColor="getStoryCollection(story)?.coverColor || null"
        :index="index"
        @click="$emit('story-click', story)"
        @resonate="$emit('resonate', story)"
      />
    </div>

    <!-- 搜索无结果 -->
    <div v-else-if="searchQuery && showToolbar" class="empty-state">
      <SearchIcon :size="20" class="empty-icon" />
      <p class="empty-text">没有匹配的故事</p>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <component :is="emptyIcon" :size="20" class="empty-icon" />
      <p>{{ emptyMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted, computed, type Component } from 'vue'
import { Search, X, ArrowUpDown, ChevronDown, Check } from 'lucide-vue-next'
import StoryCard from './StoryCard.vue'
import { useCollections, type Collection } from '../../composables/useCollections'
import { useAuth } from '../../stores/auth'

const SearchIcon = Search
const XIcon = X
const ArrowUpDownIcon = ArrowUpDown
const ChevronDownIcon = ChevronDown
const CheckIcon = Check

type SortKey = 'time' | 'distance' | 'resonance' | 'views' | 'random'

const auth = useAuth()
const userId = computed(() => auth.user.value?.id ?? null)
const collections = useCollections(userId)

const props = defineProps<{
  stories: Array<{
    id: number
    title: string | null
    content: string
    imageUrl: string | null
    origin: string | null
    username: string | null
    tag: string | null
    tags?: string[] | null
    collectionId?: number | null
  }>
  variant: 'history' | 'all' | 'mine'
  searchQuery?: string
  sortKey?: SortKey
  resonating: boolean
  showToolbar?: boolean
  emptyIcon: Component
  emptyMessage: string
  renderedContent: (story: any) => string
  displayResonance: (story: any) => number
  displayViews: (story: any) => number
  isResonated: (story: any) => boolean
  formattedTime?: (story: any) => string
  formattedDistance?: (story: any) => { text: string; near: boolean } | null
}>()

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  'update:sortKey': [value: SortKey]
  'story-click': [story: any]
  'resonate': [story: any]
}>()

/**
 * 找故事所属合集：100% 优先用后端 LEFT JOIN 直接返回的 story.collectionName / story.collectionCoverColor
 * （这样无论当前登录用户是不是故事作者，都能正确显示合集归属）
 * 只有在后端字段为空（极旧数据）时，才 fallback 到「当前用户自己的合集列表」匹配（兜底，兼容旧数据）
 *
 * 注意：函数开头主动读一次 collections.list.value，强制 Vue 收集响应式依赖
 */
function getStoryCollection(story: {
  collectionId?: number | null; collection_id?: number | null;
  collectionName?: string | null; collectionCoverColor?: string | null;
}): { name: string; coverColor: string } | null {
  // 1. 先主动读一次，强制依赖收集（兜底fallback场景需要）
  const list = collections.list.value
  // 2. 100% 优先用后端 JOIN 直接返回的字段（解决「别人的故事我匹配不到合集」的致命问题）
  if (story.collectionName) {
    return {
      name: story.collectionName,
      coverColor: story.collectionCoverColor || '#caa7ff',
    }
  }
  // 3. Fallback：兼容旧数据，用双命名 + Number 宽松匹配自己的合集列表
  const cidRaw = (story as any).collectionId ?? (story as any).collection_id
  if (cidRaw == null) return null
  const cid = Number(cidRaw)
  if (!cid || !Array.isArray(list) || list.length === 0) return null
  const hit = list.find((c: Collection) => Number(c.id) === cid)
  if (!hit) return null
  return { name: hit.name || '未命名合集', coverColor: hit.coverColor || '#caa7ff' }
}

const sortLabels: Record<SortKey, string> = {
  time: '发布时间',
  distance: '发布距离',
  resonance: '共鸣数',
  views: '浏览数',
  random: '随机排序',
}

const sortOpen = ref(false)
const sortGroupRef = ref<HTMLElement | null>(null)

function onSortSelect(key: SortKey) {
  emit('update:sortKey', key)
  sortOpen.value = false
}

function onDocumentClick(e: MouseEvent) {
  if (sortOpen.value && sortGroupRef.value && !sortGroupRef.value.contains(e.target as Node)) {
    sortOpen.value = false
  }
}

// 生命周期
onMounted(() => {
  collections.fetchList()
})
if (typeof document !== 'undefined') {
  document.addEventListener('click', onDocumentClick)
  onBeforeUnmount(() => {
    document.removeEventListener('click', onDocumentClick)
  })
}
</script>

<style scoped>
/* ─── Story List Container ─── */
.story-list-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
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
  position: relative;
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
.sort-option:hover { background: var(--overlay-04); }
.sort-option.active { color: var(--accent); }

/* ─── Dropdown Transition ─── */
.dropdown-enter-active { transition: opacity 0.15s, transform 0.15s; }
.dropdown-leave-active { transition: opacity 0.1s, transform 0.1s; }
.dropdown-enter-from { opacity: 0; transform: translateY(-6px); }
.dropdown-leave-to { opacity: 0; transform: translateY(-4px); }

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
.story-list::-webkit-scrollbar { width: 5px; }
.story-list::-webkit-scrollbar-track { background: transparent; }
.story-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.story-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.18);
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
</style>