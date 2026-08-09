<template>
  <!-- ═══════════════ PC 布局 ═══════════════ -->
  <Transition name="pc-detail-fade" @after-leave="emit('close')">
    <div v-if="!isMobile && show" class="overlay" @click.self="handleClose">
      <div class="detail-wrap">
        <!-- ─── 左栏：故事列表 / 合集列表 ─── -->
        <div class="panel panel-stories">
          <!-- Tab 栏 -->
          <div class="tab-bar">
            <button
              v-for="tab in pcTabs"
              :key="tab.id"
              class="tab-btn"
              :class="{ active: activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              <component :is="tab.icon" :size="14" />
              <span>{{ tab.label }}</span>
            </button>
          </div>

          <!-- Tab 内容 -->
          <div class="tab-content">
            <!-- 加载态 -->
            <div v-if="loading" class="empty-state">
              <component :is="BookMarked" :size="22" class="empty-icon" />
              <p>加载中…</p>
            </div>
            <!-- 错误 -->
            <div v-else-if="error" class="empty-state">
              <AlertCircle :size="22" class="empty-icon" />
              <p>{{ error }}</p>
            </div>
            <template v-else-if="detail">
              <!-- ═══ 故事列表 Tab ═══ -->
              <template v-if="activeTab === 'stories'">
                <!-- 内联故事详情 -->
                <StoryDetail
                  v-if="detailStory"
                  :story="detailStory"
                  :backLabel="'故事列表'"
                  :renderedContent="renderMarkdown(detailStory.content)"
                  :displayResonance="getDisplayResonance(detailStory)"
                  :isResonated="justResonatedId === detailStory.id"
                  :resonating="resonating"
                  :deleting="deleting"
                  :currentUserId="currentUserId"
                  :formattedTime="formatTime(detailStory.createdAt)"
                  :formattedDistance="formatDistance(detailStory.locationLat, detailStory.locationLng)"
                  :collection-clickable="false"
                  :show-star-belonging="true"
                  @back="detailStoryId = null"
                  @resonate="onResonate(detailStory)"
                  @delete="confirmDelete(detailStory.id)"
                />
                <!-- 故事列表 -->
                <StoryList
                  v-else
                  :stories="displayStories"
                  variant="all"
                  :searchQuery="searchQuery"
                  :sortKey="sortKey"
                  :resonating="resonating"
                  :showToolbar="true"
                  :emptyIcon="BookOpen"
                  emptyMessage="这个星笺里还没有故事"
                  :renderedContent="(s: any) => renderMarkdown(s.content)"
                  :displayResonance="(s: any) => getDisplayResonance(s)"
                  :displayViews="(s: any) => s.viewCount ?? 0"
                  :isResonated="(s: any) => justResonatedId === s.id"
                  :formattedTime="(s: any) => formatTime(s.createdAt)"
                  :formattedDistance="(s: any) => formatDistance(s.locationLat, s.locationLng)"
                  :collectionClickable="false"
                  :showStarBelonging="true"
                  @update:searchQuery="searchQuery = $event"
                  @update:sortKey="onSortKeyChange"
                  @story-click="onStoryClick"
                @resonate="onResonate"
              />
              </template>

              <!-- ═══ AI 解读 Tab ═══ -->
              <template v-else-if="activeTab === 'analysis'">
                <CollectionAnalysis
                  :collection-id="props.collectionId"
                  :collection-name="detail.name"
                  :story-count="detail.storyCount"
                  :stories="detail.stories"
                  :resonance-total="totalResonance"
                  @story-click="onStoryClick"
                />
              </template>

              <!-- ═══ 合集列表 Tab（仅 owner，不限高 + 懒加载） ═══ -->
              <template v-else-if="activeTab === 'collections'">
                <div class="collections-tab">
                  <div class="collections-tab-bar">
                    <span class="collections-tab-count">共 {{ collections.length }} 个星笺</span>
                  </div>
                  <div v-if="collections.length === 0" class="empty-state">
                    <component :is="BookMarked" :size="22" class="empty-icon" />
                    <p>你还没有创建星笺</p>
                  </div>
                  <div v-else class="collections-tab-list">
                    <article
                      v-for="c in collections"
                      :key="c.id"
                      class="collection-row"
                      :class="{ active: c.id === collectionId }"
                      @click="onCollectionSwitch(c)"
                    >
                      <span class="collection-row-dot" :style="{ background: c.coverColor || '#E8B86D' }"></span>
                      <div class="collection-row-info">
                        <div class="collection-row-name">
                          {{ c.name }}
                          <span v-if="c.visibility === 'private'" class="collection-row-private">
                            <Lock :size="9" />
                          </span>
                        </div>
                        <div class="collection-row-meta">{{ c.storyCount ?? 0 }} 则故事 · {{ formatDate(c.updatedAt || c.createdAt) }}</div>
                      </div>
                      <ChevronRight v-if="c.id === collectionId" :size="14" class="collection-row-arrow" />
                    </article>
                  </div>
                </div>
              </template>
            </template>
          </div>
        </div>

        <!-- ─── 右栏：合集信息 ─── -->
        <div class="panel panel-info">
          <div class="info-header">
            <button class="close-btn" @click="handleClose"><X :size="15" /></button>
            <div class="collection-header">
              <span class="info-dot" :style="{ background: detail?.coverColor || '#E8B86D' }"></span>
              <h3 class="info-title">{{ detail?.name || '加载中…' }}</h3>
              <span v-if="detail?.visibility === 'private'" class="visi-tag visi-private">
                <Lock :size="9" /><span>私有</span>
              </span>
              <span v-else-if="detail?.visibility === 'galaxy'" class="visi-tag visi-galaxy">
                <Galaxy :size="9" /><span>星河</span>
              </span>
              <span v-else-if="detail?.visibility === 'anonymous'" class="visi-tag visi-anonymous">
                <Ghost :size="9" /><span>匿名</span>
              </span>
              <span v-else-if="detail" class="visi-tag visi-public">
                <Globe :size="9" /><span>公开</span>
              </span>
            </div>
          </div>

          <div class="info-body">
            <!-- 描述 -->
            <div v-if="detail" class="info-section">
              <div class="info-label">描述</div>
              <p v-if="detail.description" class="info-desc">{{ detail.description }}</p>
              <p v-else class="info-desc is-empty">尚无描述</p>
            </div>

            <!-- 统计（4 列：故事 / 共鸣 / 浏览 / 收藏，复用 StarInfoPanel 风格） -->
            <div v-if="detail" class="info-section">
              <div class="info-label">
                <BarChart3 :size="11" class="info-label-icon" />
                <span>统计</span>
              </div>
              <div class="stats-row">
                <div class="stat-item">
                  <BookOpen :size="13" class="stat-icon" />
                  <span class="stat-num">{{ detail.storyCount }}</span>
                  <span class="stat-label">故事</span>
                </div>
                <div class="stat-item">
                  <Heart :size="13" class="stat-icon" />
                  <span class="stat-num">{{ totalResonance }}</span>
                  <span class="stat-label">共鸣</span>
                </div>
                <div class="stat-item">
                  <Eye :size="13" class="stat-icon" />
                  <span class="stat-num">{{ totalViews }}</span>
                  <span class="stat-label">浏览</span>
                </div>
                <div class="stat-item">
                  <Star :size="13" class="stat-icon" />
                  <span class="stat-num">{{ totalFavorites }}</span>
                  <span class="stat-label">收藏</span>
                </div>
              </div>
              <div class="stat-times">
                <span><Clock :size="10" /> 创建 {{ formatDateTime(detail.createdAt) }}</span>
                <span><Clock :size="10" /> 更新 {{ formatDateTime(detail.updatedAt) }}</span>
              </div>
            </div>

            <!-- 活跃时辰热力（真实数据派生） -->
            <div v-if="detail && detail.storyCount > 0" class="info-section">
              <div class="info-label">
                <Activity :size="11" class="info-label-icon" />
                <span>活跃时辰</span>
                <span class="info-label-sub">高峰 {{ String(peakActivityHour).padStart(2, '0') }}:00</span>
              </div>
              <div class="hour-heatmap">
                <span
                  v-for="(v, h) in hourlyActivity"
                  :key="h"
                  class="hh-cell"
                  :class="hhCellClass(v)"
                  :style="{ height: hhHeight(v) + 'px' }"
                  :title="`${h}:00 — ${v} 则`"
                ></span>
              </div>
              <div class="hh-axis">
                <span>0</span><span>6</span><span>12</span><span>18</span><span>23</span>
              </div>
            </div>

            <!-- 故事时间轴（真实数据派生） -->
            <div v-if="detail && storyTimeline.length > 0" class="info-section">
              <div class="info-label">
                <Clock :size="11" class="info-label-icon" />
                <span>故事时间轴</span>
                <span class="info-label-sub">{{ storyTimeline.length }} 则</span>
              </div>
              <div class="info-timeline">
                <div class="tl-line"></div>
                <div
                  v-for="t in storyTimeline.slice(0, 12)"
                  :key="t.id"
                  class="tl-node"
                  @click="onStoryClick({ id: t.id } as any)"
                >
                  <span class="tl-dot"></span>
                  <span class="tl-date">{{ t.date }}</span>
                  <span class="tl-title">{{ t.title }}</span>
                  <span v-if="t.resonance > 0" class="tl-res">{{ t.resonance }}</span>
                </div>
                <div v-if="storyTimeline.length > 12" class="tl-more">
                  +{{ storyTimeline.length - 12 }} 则…
                </div>
              </div>
            </div>

            <!-- 高频标签（真实数据派生） -->
            <div v-if="detail && topTags.length > 0" class="info-section">
              <div class="info-label">
                <Hash :size="11" class="info-label-icon" />
                <span>高频标签</span>
              </div>
              <div class="info-tags">
                <span
                  v-for="t in topTags"
                  :key="t.tag"
                  class="info-tag"
                  :style="infoTagStyle(t.tag)"
                >#{{ t.tag }}<em>{{ t.count }}</em></span>
              </div>
            </div>
          </div>

          <!-- 底部操作（仅 owner） -->
          <div v-if="isOwner && detail" class="info-footer">
            <button class="footer-btn footer-edit" @click="emit('edit', detail)">
              <Pencil :size="12" /><span>编辑星笺</span>
            </button>
            <button class="footer-btn footer-delete" @click="emit('delete', detail)">
              <Trash2 :size="12" /><span>删除</span>
            </button>
          </div>
        </div>
      </div>

      <!-- PC 删除故事确认 -->
      <Transition name="pc-detail-fade">
        <div v-if="showDeleteConfirm" class="delete-confirm-overlay" @click.self="cancelDelete">
          <div class="delete-confirm-card">
            <h3>删除这则故事？</h3>
            <p>故事将从星笺中移除，此操作不可撤销。</p>
            <div class="delete-confirm-actions">
              <button class="delete-cancel-btn" :disabled="deleting" @click="cancelDelete">取消</button>
              <button class="delete-confirm-btn" :disabled="deleting" @click="doDeleteStory">
                {{ deleting ? '删除中…' : '确认删除' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>

  <!-- ═══════════════ 移动端布局 ═══════════════ -->
  <Transition name="mobile-sheet-fade" @after-leave="emit('close')">
    <div v-if="isMobile && show" class="mobile-overlay" @click.self="handleClose">
      <div
        class="mobile-sheet"
        :class="{ dragging: isDragging }"
        :style="{ height: sheetHeight }"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend="onTouchEnd"
      >
        <!-- 拖拽条 -->
        <div class="mobile-handle" @click="handleClose"></div>

        <!-- 顶部栏 -->
        <div class="mobile-top-bar">
          <button class="mobile-close-btn" @click="handleClose">
            <X :size="18" />
          </button>
          <div class="mobile-tab-select-wrap">
            <MobileTabSelect v-model="activeTab" :tabs="mobileTabs" />
          </div>
        </div>

        <!-- 滚动内容区 -->
        <div class="mobile-content">
          <!-- 加载态 -->
          <div v-if="loading" class="empty-state">
            <component :is="BookMarked" :size="22" class="empty-icon" />
            <p>加载中…</p>
          </div>
          <!-- 错误 -->
          <div v-else-if="error" class="empty-state">
            <AlertCircle :size="22" class="empty-icon" />
            <p>{{ error }}</p>
          </div>
          <template v-else-if="detail">
            <!-- ═══ 星笺信息 Tab ═══ -->
            <template v-if="activeTab === 'info'">
              <div class="mobile-info-section">
                <div class="collection-header mobile-collection-header">
                  <span class="info-dot" :style="{ background: detail.coverColor || '#E8B86D' }"></span>
                  <h3 class="info-title">{{ detail.name }}</h3>
                  <span v-if="detail.visibility === 'private'" class="visi-tag visi-private">
                    <Lock :size="9" /><span>私有</span>
                  </span>
                  <span v-else-if="detail.visibility === 'galaxy'" class="visi-tag visi-galaxy">
                    <Galaxy :size="9" /><span>星河</span>
                  </span>
                  <span v-else-if="detail.visibility === 'anonymous'" class="visi-tag visi-anonymous">
                    <Ghost :size="9" /><span>匿名</span>
                  </span>
                  <span v-else class="visi-tag visi-public">
                    <Globe :size="9" /><span>公开</span>
                  </span>
                </div>
                <p v-if="detail.description" class="info-desc">{{ detail.description }}</p>
                <p v-else class="info-desc is-empty">尚无描述</p>

                <!-- 统计（4 列） -->
                <div class="info-section">
                  <div class="info-label">
                    <BarChart3 :size="11" class="info-label-icon" />
                    <span>统计</span>
                  </div>
                  <div class="stats-row">
                    <div class="stat-item">
                      <BookOpen :size="13" class="stat-icon" />
                      <span class="stat-num">{{ detail.storyCount }}</span>
                      <span class="stat-label">故事</span>
                    </div>
                    <div class="stat-item">
                      <Heart :size="13" class="stat-icon" />
                      <span class="stat-num">{{ totalResonance }}</span>
                      <span class="stat-label">共鸣</span>
                    </div>
                    <div class="stat-item">
                      <Eye :size="13" class="stat-icon" />
                      <span class="stat-num">{{ totalViews }}</span>
                      <span class="stat-label">浏览</span>
                    </div>
                    <div class="stat-item">
                      <Star :size="13" class="stat-icon" />
                      <span class="stat-num">{{ totalFavorites }}</span>
                      <span class="stat-label">收藏</span>
                    </div>
                  </div>
                  <div class="stat-times">
                    <span><Clock :size="10" /> 创建 {{ formatDateTime(detail.createdAt) }}</span>
                    <span><Clock :size="10" /> 更新 {{ formatDateTime(detail.updatedAt) }}</span>
                  </div>
                </div>

                <!-- 活跃时辰热力 -->
                <div v-if="detail.storyCount > 0" class="info-section">
                  <div class="info-label">
                    <Activity :size="11" class="info-label-icon" />
                    <span>活跃时辰</span>
                    <span class="info-label-sub">高峰 {{ String(peakActivityHour).padStart(2, '0') }}:00</span>
                  </div>
                  <div class="hour-heatmap">
                    <span
                      v-for="(v, h) in hourlyActivity"
                      :key="h"
                      class="hh-cell"
                      :class="hhCellClass(v)"
                      :style="{ height: hhHeight(v) + 'px' }"
                      :title="`${h}:00 — ${v} 则`"
                    ></span>
                  </div>
                  <div class="hh-axis">
                    <span>0</span><span>6</span><span>12</span><span>18</span><span>23</span>
                  </div>
                </div>

                <!-- 故事时间轴 -->
                <div v-if="storyTimeline.length > 0" class="info-section">
                  <div class="info-label">
                    <Clock :size="11" class="info-label-icon" />
                    <span>故事时间轴</span>
                    <span class="info-label-sub">{{ storyTimeline.length }} 则</span>
                  </div>
                  <div class="info-timeline">
                    <div class="tl-line"></div>
                    <div
                      v-for="t in storyTimeline.slice(0, 12)"
                      :key="t.id"
                      class="tl-node"
                      @click="onStoryClick({ id: t.id } as any)"
                    >
                      <span class="tl-dot"></span>
                      <span class="tl-date">{{ t.date }}</span>
                      <span class="tl-title">{{ t.title }}</span>
                      <span v-if="t.resonance > 0" class="tl-res">{{ t.resonance }}</span>
                    </div>
                    <div v-if="storyTimeline.length > 12" class="tl-more">
                      +{{ storyTimeline.length - 12 }} 则…
                    </div>
                  </div>
                </div>

                <!-- 高频标签 -->
                <div v-if="topTags.length > 0" class="info-section">
                  <div class="info-label">
                    <Hash :size="11" class="info-label-icon" />
                    <span>高频标签</span>
                  </div>
                  <div class="info-tags">
                    <span
                      v-for="t in topTags"
                      :key="t.tag"
                      class="info-tag"
                      :style="infoTagStyle(t.tag)"
                    >#{{ t.tag }}<em>{{ t.count }}</em></span>
                  </div>
                </div>
              </div>
            </template>

            <!-- ═══ 故事列表 Tab ═══ -->
            <template v-else-if="activeTab === 'stories'">
              <StoryList
                :stories="displayStories"
                variant="all"
                :searchQuery="searchQuery"
                :sortKey="sortKey"
                :resonating="resonating"
                :showToolbar="true"
                :emptyIcon="BookOpen"
                emptyMessage="这个星笺里还没有故事"
                :renderedContent="(s: any) => renderMarkdown(s.content)"
                :displayResonance="(s: any) => getDisplayResonance(s)"
                :displayViews="(s: any) => s.viewCount ?? 0"
                :isResonated="(s: any) => justResonatedId === s.id"
                :formattedTime="(s: any) => formatTime(s.createdAt)"
                :formattedDistance="(s: any) => formatDistance(s.locationLat, s.locationLng)"
                :collectionClickable="false"
                :showStarBelonging="true"
                @update:searchQuery="searchQuery = $event"
                @update:sortKey="onSortKeyChange"
                @story-click="onStoryClick"
                @resonate="onResonate"
              />
            </template>

            <!-- ═══ AI 解读 Tab ═══ -->
            <template v-else-if="activeTab === 'analysis'">
              <CollectionAnalysis
                :collection-id="props.collectionId"
                :collection-name="detail.name"
                :story-count="detail.storyCount"
                :stories="detail.stories"
                :resonance-total="totalResonance"
                @story-click="onStoryClick"
              />
            </template>

            <!-- ═══ 合集列表 Tab（仅 owner） ═══ -->
            <template v-else-if="activeTab === 'collections'">
              <div class="collections-tab">
                <div class="collections-tab-bar">
                  <span class="collections-tab-count">共 {{ collections.length }} 个星笺</span>
                </div>
                <div v-if="collections.length === 0" class="empty-state">
                  <component :is="BookMarked" :size="22" class="empty-icon" />
                  <p>你还没有创建星笺</p>
                </div>
                <div v-else class="collections-tab-list">
                  <article
                    v-for="c in collections"
                    :key="c.id"
                    class="collection-row"
                    :class="{ active: c.id === collectionId }"
                    @click="onCollectionSwitch(c)"
                  >
                    <span class="collection-row-dot" :style="{ background: c.coverColor || '#E8B86D' }"></span>
                    <div class="collection-row-info">
                      <div class="collection-row-name">
                        {{ c.name }}
                        <span v-if="c.visibility === 'private'" class="collection-row-private">
                          <Lock :size="9" />
                        </span>
                      </div>
                      <div class="collection-row-meta">{{ c.storyCount ?? 0 }} 则 · {{ formatDate(c.updatedAt || c.createdAt) }}</div>
                    </div>
                    <ChevronRight v-if="c.id === collectionId" :size="14" class="collection-row-arrow" />
                  </article>
                </div>
              </div>
            </template>
          </template>
        </div>

        <!-- 移动端底部操作栏（仅 owner） -->
        <div v-if="isOwner && detail && activeTab === 'info'" class="mobile-bottom-bar">
          <button class="footer-btn footer-edit" @click="emit('edit', detail)">
            <Pencil :size="12" /><span>编辑</span>
          </button>
          <button class="footer-btn footer-delete" @click="emit('delete', detail)">
            <Trash2 :size="12" /><span>删除</span>
          </button>
        </div>

        <!-- 移动端故事详情全屏 -->
        <Transition name="mobile-story-slide">
          <div v-if="detailStory" class="mobile-story-detail">
            <div class="mobile-story-detail-top">
              <button class="mobile-story-back" @click="detailStoryId = null">
                <ChevronDown :size="20" style="transform: rotate(90deg)" />
              </button>
              <span class="mobile-story-back-label">故事列表</span>
              <div style="width: 20px"></div>
            </div>
            <div class="mobile-story-detail-body">
              <StoryDetail
                :story="detailStory"
                :backLabel="'故事列表'"
                :renderedContent="renderMarkdown(detailStory.content)"
                :displayResonance="getDisplayResonance(detailStory)"
                :isResonated="justResonatedId === detailStory.id"
                :resonating="resonating"
                :deleting="deleting"
                :currentUserId="currentUserId"
                :formattedTime="formatTime(detailStory.createdAt)"
                :formattedDistance="formatDistance(detailStory.locationLat, detailStory.locationLng)"
                :collection-clickable="false"
                :show-star-belonging="true"
                @back="detailStoryId = null"
                @resonate="onResonate(detailStory)"
                @delete="confirmDelete(detailStory.id)"
              />
            </div>
          </div>
        </Transition>

        <!-- 移动端删除 Action Sheet -->
        <MobileActionSheet
          :visible="showDeleteConfirm"
          :loading="deleting"
          @confirm="doDeleteStory"
          @cancel="cancelDelete"
        />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, onBeforeUnmount, watch, nextTick, type Component } from 'vue'
import { useRoute } from 'vue-router'
import {
  X, Lock, Globe, BookOpen, BookMarked, Heart, Eye, Clock, Pencil, Trash2,
  ChevronRight, ChevronDown, AlertCircle, Library, List, Sparkles, Sparkles as Galaxy, Ghost, Activity, Tag, Hash,
  BarChart3, Star,
} from 'lucide-vue-next'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import StoryList from '../StarDetail/StoryList.vue'
import StoryDetail from '../StarDetail/StoryDetail.vue'
import MobileTabSelect from '../StarDetail/MobileTabSelect.vue'
import MobileActionSheet from '../StarDetail/MobileActionSheet.vue'
import CollectionAnalysis from './CollectionAnalysis.vue'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { useCollections, type CollectionDetail, type Collection } from '../../composables/useCollections'

marked.setOptions({ breaks: true, gfm: true })

const { isMobile } = useMediaQuery()
const { fetchDetail } = useCollections()
const route = useRoute()

/** 点击星星小框跳转 /sky?star=xxx 或任何路由变化 → 自动关闭合集详情弹窗 */
watch(
  () => route.fullPath,
  () => { if (show.value) emit('close') },
  { flush: 'post' }
)

// ─── Props ───
const props = defineProps<{
  collectionId: number | null
  collections: Collection[]
  currentUserId: number | null
  isOwner: boolean
  /** 刷新令牌：自增时强制重新拉取详情（编辑后刷新用） */
  refreshNonce?: number
}>()

// ─── Emits ───
const emit = defineEmits<{
  close: []
  'story-click': [story: any]
  edit: [collection: CollectionDetail]
  delete: [collection: CollectionDetail]
  'collection-switch': [collectionId: number]
}>()

// ─── 内部 show 标志（控制 enter/leave 动画，镜像 StarDetail 模式）───
const show = ref(false)
onMounted(() => {
  nextTick(() => { show.value = true })
  // 兜底：点击了当前 URL 对应的星星（Vue Router 不会重复导航），也关闭合集详情弹窗
  window.addEventListener('star-identity-click', onStarIdentityClick)
})
onBeforeUnmount(() => {
  window.removeEventListener('star-identity-click', onStarIdentityClick)
})
function onStarIdentityClick() {
  if (show.value) handleClose()
}
function handleClose() { show.value = false }

// ─── 数据状态 ───
const detail = ref<CollectionDetail | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// ─── Tab 状态 ───
type TabId = 'info' | 'stories' | 'analysis' | 'collections'
const isMobileInit = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
// AI 解读放最左，打开默认就是它（与星星界面 AI 叙事一致）
const activeTab = ref<TabId>('analysis')

const pcTabs = computed<{ id: TabId; label: string; icon: Component }[]>(() => {
  const tabs: { id: TabId; label: string; icon: Component }[] = [
    { id: 'analysis', label: 'AI 解读', icon: Sparkles },
    { id: 'stories', label: '故事列表', icon: BookOpen },
  ]
  if (props.isOwner) {
    tabs.push({ id: 'collections', label: '合集列表', icon: List })
  }
  return tabs
})

const mobileTabs = computed(() => {
  const tabs: { id: string; label: string; roman: string; icon: Component }[] = [
    { id: 'analysis', label: 'AI 解读', roman: 'Ⅰ', icon: Sparkles },
    { id: 'stories', label: '故事列表', roman: 'Ⅱ', icon: BookOpen },
    { id: 'info', label: '星笺信息', roman: 'Ⅲ', icon: Library },
  ]
  if (props.isOwner) {
    tabs.push({ id: 'collections', label: '合集列表', roman: 'Ⅳ', icon: List })
  }
  return tabs
})

// ─── 故事详情（内联）───
const detailStoryId = ref<number | null>(null)
const detailStory = computed(() => {
  if (detailStoryId.value === null || !detail.value) return null
  return detail.value.stories.find(s => s.id === detailStoryId.value) ?? null
})

// ─── 搜索 + 排序 ───
const searchQuery = ref('')
type SortKey = 'time' | 'distance' | 'resonance' | 'views' | 'random'
const sortKey = ref<SortKey>('time')

function onSortKeyChange(key: SortKey) { sortKey.value = key }

// ─── 共鸣乐观更新 ───
const resonanceOverrides = reactive(new Map<number, number>())
function getDisplayResonance(story: { id: number; resonanceCount: number }): number {
  return resonanceOverrides.get(story.id) ?? story.resonanceCount
}
const justResonatedId = ref<number | null>(null)
const resonating = ref(false)

// ─── 删除故事 ───
const showDeleteConfirm = ref(false)
const deletingStoryId = ref<number | null>(null)
const deleting = ref(false)

// ─── 移动端抽屉拖拽 ───
const sheetHeight = ref('60vh')
const touchStartY = ref(0)
const touchStartHeight = ref(0)
const isDragging = ref(false)

function onTouchStart(e: TouchEvent) {
  touchStartY.value = e.touches[0].clientY
  const sheet = (e.target as HTMLElement).closest('.mobile-sheet') as HTMLElement
  touchStartHeight.value = sheet?.offsetHeight || window.innerHeight * 0.6
  isDragging.value = true
}
function onTouchMove(e: TouchEvent) {
  const delta = touchStartY.value - e.touches[0].clientY
  const newH = touchStartHeight.value + delta
  const maxH = window.innerHeight * 0.9
  const minH = window.innerHeight * 0.15
  sheetHeight.value = `${Math.max(minH, Math.min(maxH, newH))}px`
}
function onTouchEnd() {
  const sheet = document.querySelector('.mobile-sheet') as HTMLElement
  const currentH = sheet?.offsetHeight || window.innerHeight * 0.6
  const vh = window.innerHeight
  isDragging.value = false
  if (currentH < vh * 0.3) {
    handleClose()
  } else if (currentH < vh * 0.75) {
    sheetHeight.value = '60vh'
  } else {
    sheetHeight.value = '90vh'
  }
}

// ─── Computed ───
const totalResonance = computed(() =>
  detail.value?.stories.reduce((sum, s) => sum + getDisplayResonance(s), 0) ?? 0
)

const totalViews = computed(() =>
  detail.value?.stories.reduce((sum, s) => sum + (s.viewCount ?? 0), 0) ?? 0
)
const totalFavorites = computed(() => detail.value?.favoriteCount ?? 0)

/** 搜索过滤 + 排序后的故事列表 */
const displayStories = computed(() => {
  if (!detail.value) return []
  let stories = [...detail.value.stories]
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    stories = stories.filter(s =>
      (s.title?.toLowerCase().includes(q) || s.content.toLowerCase().includes(q))
    )
  }
  switch (sortKey.value) {
    case 'resonance':
      stories.sort((a, b) => getDisplayResonance(b) - getDisplayResonance(a))
      break
    case 'views':
      stories.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
      break
    case 'time':
    default:
      stories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
  }
  return stories
})

/* ═══════════════════════════════════════════════════════════
   右侧信息面板：从真实故事派生的统计（活跃时辰 / 时间轴 / 标签）
   ═══════════════════════════════════════════════════════════ */

/** 24 小时活跃分布（基于故事 createdAt 的北京时区小时，UTC+8，与后端 computeHourlyAndThemes 口径对齐） */
const hourlyActivity = computed<number[]>(() => {
  const arr = new Array(24).fill(0)
  for (const s of detail.value?.stories ?? []) {
    const utcH = new Date(s.createdAt + 'Z').getUTCHours()
    const beijingH = (utcH + 8) % 24
    arr[beijingH]++
  }
  return arr
})
const maxHourly = computed(() => Math.max(1, ...hourlyActivity.value))
const peakActivityHour = computed(() => {
  let max = -1, idx = 0
  hourlyActivity.value.forEach((v, i) => { if (v > max) { max = v; idx = i } })
  return idx
})

/** 故事时间轴（按时间正序） */
const storyTimeline = computed(() => {
  const list = (detail.value?.stories ?? []).slice()
  list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  return list.map(s => ({
    id: s.id,
    title: s.title || '未命名故事',
    date: formatTimelineDate(s.createdAt),
    resonance: s.resonanceCount ?? 0,
  }))
})

/** 高频标签（聚合 stories.tags / tag，Top 8） */
const topTags = computed<{ tag: string; count: number }[]>(() => {
  const map = new Map<string, number>()
  for (const s of detail.value?.stories ?? []) {
    const tags = Array.isArray(s.tags) ? s.tags.filter(Boolean) : (s.tag ? [s.tag] : [])
    for (const t of tags) map.set(t, (map.get(t) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
})

function formatTimelineDate(s: string): string {
  if (!s) return ''
  const d = new Date(s + 'Z')
  if (isNaN(d.getTime())) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}/${m}/${day}`
}

// ─── Watchers ───
watch(() => [show.value, props.collectionId], async ([s, id]) => {
  if (!s || id == null) {
    detail.value = null
    error.value = null
    return
  }
  await loadDetail(id as number)
}, { immediate: true })

// 合集切换时重置状态
watch(() => props.collectionId, () => {
  detailStoryId.value = null
  searchQuery.value = ''
  activeTab.value = 'analysis'
})

// 编辑后刷新：refreshNonce 自增时重新拉取当前合集详情
watch(() => props.refreshNonce, (n, old) => {
  if (n == null || n === old) return
  if (show.value && props.collectionId != null) loadDetail(props.collectionId)
})

// Tab 切换时清除故事详情
watch(activeTab, () => { detailStoryId.value = null })

// ─── Functions ───
async function loadDetail(id: number) {
  loading.value = true
  error.value = null
  detail.value = null
  try {
    const d = await fetchDetail(id)
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
}

function onStoryClick(story: any) {
  detailStoryId.value = story.id
  emit('story-click', story)
  fetch(`/api/stories/${story.id}/view`, { method: 'POST' }).catch(() => {})
}

async function onResonate(story: any) {
  const token = localStorage.getItem('token')
  if (!token) return
  const current = getDisplayResonance(story)
  resonanceOverrides.set(story.id, current + 1)
  justResonatedId.value = story.id
  setTimeout(() => { justResonatedId.value = null }, 2000)
  try {
    const res = await fetch(`/api/stories/${story.id}/resonate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) resonanceOverrides.set(story.id, current)
  } catch {
    resonanceOverrides.set(story.id, current)
  }
}

function confirmDelete(storyId: number) {
  deletingStoryId.value = storyId
  showDeleteConfirm.value = true
}

async function doDeleteStory() {
  if (!deletingStoryId.value) return
  const token = localStorage.getItem('token')
  if (!token) return
  deleting.value = true
  try {
    const res = await fetch(`/api/stories/${deletingStoryId.value}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      if (detail.value) {
        detail.value.stories = detail.value.stories.filter(s => s.id !== deletingStoryId.value)
        detail.value.storyCount = Math.max(0, detail.value.storyCount - 1)
      }
      showDeleteConfirm.value = false
      detailStoryId.value = null
      deletingStoryId.value = null
    } else {
      const json = await res.json()
      alert(json.message || '删除失败')
    }
  } catch {
    alert('网络错误，请重试')
  } finally {
    deleting.value = false
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deletingStoryId.value = null
}

function onCollectionSwitch(c: Collection) {
  emit('collection-switch', c.id)
}

// ─── 工具函数 ───
function renderMarkdown(text: string): string {
  if (!text) return ''
  const raw = marked.parse(text) as string
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
  })
}

function formatTime(createdAt: string): string {
  if (!createdAt) return ''
  const date = new Date(createdAt + 'Z')
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

function formatDistance(_lat: number | null, _lng: number | null): { text: string; near: boolean } | null {
  return null
}

function formatDateTime(s: string | null | undefined): string {
  if (!s) return ''
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  return `${m[1]}/${m[2]}/${m[3]}`
}

function formatDate(s: string | null | undefined): string {
  if (!s) return ''
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  return `${m[2]}/${m[3]}`
}

/* ─── 右侧信息面板：热力 / 标签工具 ─── */
function hhCellClass(v: number) {
  const ratio = v / maxHourly.value
  if (ratio <= 0) return 'hh-empty'
  if (ratio < 0.25) return 'hh-low'
  if (ratio < 0.5) return 'hh-mid'
  if (ratio < 0.75) return 'hh-high'
  return 'hh-peak'
}
function hhHeight(v: number) {
  if (v <= 0) return 3
  return Math.max(3, Math.round(3 + (v / maxHourly.value) * 26))
}
function infoTagStyle(tag: string): Record<string, string> {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h << 5) - h + tag.charCodeAt(i)
  h = Math.abs(h) % 360
  return {
    color: `hsl(${h} 62% 74%)`,
    background: `hsla(${h}, 62%, 74%, 0.07)`,
    borderColor: `hsla(${h}, 62%, 74%, 0.18)`,
  }
}
</script>

<style scoped>
/* ─── Overlay ─── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 8, 22, 0.3);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
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

/* ─── Left: Stories Panel ─── */
.panel-stories {
  flex: 1;
  min-width: 0;
  height: 70vh;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Tab Bar ─── */
.tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--rule);
  flex-shrink: 0;
  padding: 0 12px;
}
.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 10px 6px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--muted);
  font-family: var(--font);
  font-size: 0.72rem;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  white-space: nowrap;
  position: relative;
}
.tab-btn:hover { color: var(--ink-secondary); }
.tab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent);
}
.tab-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  padding: 20px;
}
.empty-icon { opacity: 0.2; }

/* ─── Right: Info Panel ─── */
.panel-info {
  width: 340px;
  flex-shrink: 0;
  position: relative;
  height: 70vh;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.info-header {
  flex-shrink: 0;
  padding: 24px 24px 16px;
  position: relative;
  border-bottom: 1px solid var(--rule);
}
.info-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.info-body::-webkit-scrollbar { width: 5px; }
.info-body::-webkit-scrollbar-track { background: transparent; }
.info-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.info-footer {
  flex-shrink: 0;
  padding: 16px 24px 20px;
  border-top: 1px solid var(--rule);
  background: var(--surface);
  display: flex;
  gap: 10px;
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
.close-btn:hover {
  color: var(--ink);
  border-color: var(--rule-hover);
}

/* ─── Collection Header ─── */
.collection-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.info-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 8px currentColor;
  opacity: 0.9;
}
.info-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
}
.visi-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  border-radius: 100px;
  font-size: 9.5px;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.visi-private {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.42);
  border: 0.5px solid rgba(255, 255, 255, 0.07);
}
.visi-public {
  background: rgba(149, 240, 192, 0.07);
  color: #95f0c0;
  border: 0.5px solid rgba(149, 240, 192, 0.18);
}
.visi-anonymous {
  background: rgba(169, 189, 255, 0.08);
  color: rgba(169, 189, 255, 0.94);
  border: 0.5px solid rgba(169, 189, 255, 0.22);
}
.visi-galaxy {
  background: rgba(232, 184, 109, 0.10);
  color: rgba(255, 229, 168, 0.96);
  border: 0.5px solid rgba(232, 184, 109, 0.25);
}

/* ─── Info Section ─── */
.info-section {
  margin-bottom: 20px;
}
.info-section:last-child { margin-bottom: 0; }
.info-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--muted);
  margin-bottom: 10px;
}
.info-label-icon { opacity: 0.7; flex-shrink: 0; }
.info-label-sub {
  margin-left: auto;
  font-size: 0.66rem;
  font-weight: 400;
  color: var(--muted-light);
  letter-spacing: 0.02em;
}
.info-desc {
  margin: 0;
  font-size: 0.82rem;
  color: var(--ink-secondary);
  line-height: 1.6;
}
.info-desc.is-empty { color: var(--muted-light); font-style: italic; }

/* ─── Info Stats（4 列，复用 StarInfoPanel 风格） ─── */
.stats-row {
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
.stat-icon { color: var(--muted-light); }
.stat-num {
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.stat-item .stat-label {
  flex: none;
  font-size: 0.7rem;
  color: var(--muted-light);
}
.stat-times {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 0.64rem;
  color: var(--muted-light);
  font-variant-numeric: tabular-nums;
}
.stat-times span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.stat-times svg { opacity: 0.6; }

/* ─── 活跃时辰热力 ─── */
.hour-heatmap {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 32px;
  padding: 0 1px;
}
.hh-cell {
  flex: 1;
  min-width: 0;
  border-radius: 2px;
  transition: transform 0.15s, filter 0.15s;
  cursor: default;
}
.hh-cell:hover { transform: scaleY(1.15); filter: brightness(1.3); }
.hh-empty { background: rgba(255, 255, 255, 0.04); }
.hh-low { background: rgba(134, 168, 255, 0.35); }
.hh-mid { background: rgba(154, 230, 180, 0.45); }
.hh-high { background: rgba(202, 167, 255, 0.6); }
.hh-peak { background: rgba(255, 217, 138, 0.9); box-shadow: 0 0 6px rgba(255, 217, 138, 0.4); }
.hh-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 0.56rem;
  color: var(--muted-light);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

/* ─── 故事时间轴 ─── */
.info-timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding-left: 4px;
  max-height: 240px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.info-timeline::-webkit-scrollbar { width: 3px; }
.info-timeline::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
.tl-line {
  position: absolute;
  left: 3px;
  top: 4px;
  bottom: 4px;
  width: 1px;
  background: linear-gradient(180deg, rgba(255, 217, 138, 0.3), rgba(202, 167, 255, 0.15));
}
.tl-node {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  position: relative;
  padding: 2px 0;
}
.tl-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 5px rgba(255, 217, 138, 0.5);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}
.tl-date {
  font-size: 0.62rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  width: 64px;
}
.tl-title {
  font-size: 0.74rem;
  color: var(--ink-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  transition: color 0.15s;
}
.tl-node:hover .tl-title { color: var(--accent); }
.tl-res {
  font-size: 0.6rem;
  color: #ff8b7d;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.tl-more {
  font-size: 0.64rem;
  color: var(--muted-light);
  padding-left: 14px;
  font-style: italic;
}

/* ─── 高频标签 ─── */
.info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.info-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  padding: 2px 8px;
  border-radius: 100px;
  border: 0.5px solid;
  font-weight: 500;
}
.info-tag em {
  font-style: normal;
  font-size: 0.58rem;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}

/* ─── Footer Buttons ─── */
.footer-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  font-family: var(--font);
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.footer-edit {
  background: var(--accent-subtle);
  border: 1px solid var(--accent-border);
  color: var(--accent);
}
.footer-edit:hover { background: var(--accent-bg); }
.footer-delete {
  background: rgba(255, 107, 138, 0.06);
  border: 1px solid rgba(255, 107, 138, 0.2);
  color: #ff8aa6;
}
.footer-delete:hover { background: rgba(255, 107, 138, 0.12); }

/* ─── Collections Tab ─── */
.collections-tab {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.collections-tab::-webkit-scrollbar { width: 5px; }
.collections-tab::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
.collections-tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.collections-tab-count {
  font-size: 0.72rem;
  color: var(--muted);
  letter-spacing: 0.04em;
}
.collections-tab-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.collection-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
  animation: cgIn 0.22s ease-out both;
}
@keyframes cgIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.collection-row:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}
.collection-row.active {
  background: rgba(255, 217, 138, 0.06);
  border-color: rgba(255, 217, 138, 0.22);
}
.collection-row-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
  opacity: 0.9;
}
.collection-row-info {
  flex: 1;
  min-width: 0;
}
.collection-row-name {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.collection-row-private { color: var(--muted); display: inline-flex; }
.collection-row-meta {
  font-size: 0.72rem;
  color: var(--muted);
  margin-top: 2px;
}
.collection-row-arrow { color: var(--accent); flex-shrink: 0; }

/* ─── Delete Confirm Modal ─── */
.delete-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(4, 4, 18, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.delete-confirm-card {
  background: rgba(16, 20, 43, 0.95);
  border: 1px solid rgba(48, 55, 87, 0.5);
  border-radius: 16px;
  padding: 24px;
  max-width: 360px;
  width: 90%;
  text-align: center;
  animation: slideUp 0.2s ease-out;
}
.delete-confirm-card h3 {
  color: #ff6b8a;
  font-size: 1rem;
  margin: 0 0 12px;
}
.delete-confirm-card p {
  color: #b9b4d6;
  font-size: 0.85rem;
  margin: 0 0 20px;
  line-height: 1.6;
}
.delete-confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.delete-cancel-btn {
  padding: 8px 20px;
  border-radius: 10px;
  border: 1px solid rgba(48, 55, 87, 0.5);
  background: rgba(255, 255, 255, 0.05);
  color: #7a759c;
  font-family: var(--font);
  font-size: 0.82rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.delete-cancel-btn:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.15);
  color: #f6f1ff;
}
.delete-cancel-btn:disabled { opacity: 0.5; cursor: wait; }
.delete-confirm-btn {
  padding: 8px 20px;
  border-radius: 10px;
  border: none;
  background: #ff6b8a;
  color: #1a1438;
  font-family: var(--font);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.delete-confirm-btn:hover:not(:disabled) { background: #ff8a9e; }
.delete-confirm-btn:disabled { opacity: 0.5; cursor: wait; }

/* ═══════════════════════════════════════════
   Mobile Styles
   ═══════════════════════════════════════════ */
.mobile-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(7, 8, 22, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.mobile-sheet {
  width: 100%;
  max-width: 500px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-top: 5px solid var(--accent);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  box-shadow: 0 -16px 48px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font);
  color: var(--ink);
  position: relative;
}
.mobile-sheet.dragging {
  transition: height 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  will-change: height;
}
.mobile-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0 6px;
  flex-shrink: 0;
  cursor: pointer;
}
.mobile-handle::after {
  content: '';
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--accent-border);
  transition: background 0.2s;
}
.mobile-handle:active::after { background: var(--accent); }

.mobile-top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 18px 12px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--rule);
}
.mobile-close-btn {
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
  flex-shrink: 0;
  padding: 0;
  transition: color 0.15s, border-color 0.15s;
}
.mobile-close-btn:hover { color: var(--ink); border-color: var(--rule-hover); }
.mobile-tab-select-wrap { flex: 1; min-width: 0; }
.mobile-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding: 16px 18px;
}

/* ─── Mobile Info Section ─── */
.mobile-info-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.mobile-collection-header { flex-wrap: wrap; }
.mobile-info-section .info-section { margin-bottom: 0; }
.mobile-info-section .info-label { margin-bottom: 8px; }
.mobile-bottom-bar {
  display: flex;
  gap: 10px;
  padding: 12px 18px 16px;
  border-top: 1px solid var(--rule);
  flex-shrink: 0;
}
.mobile-bottom-bar .footer-btn { flex: 1; justify-content: center; }

/* ─── Mobile Story Detail (Full Screen) ─── */
.mobile-story-detail {
  position: absolute;
  inset: 0;
  background: rgba(12, 16, 36, 0.99);
  backdrop-filter: blur(16px);
  z-index: 50;
  display: flex;
  flex-direction: column;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
}
.mobile-story-detail-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--rule);
  flex-shrink: 0;
}
.mobile-story-back {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  color: var(--muted);
  cursor: pointer;
  padding: 0;
  transition: color 0.15s, border-color 0.15s;
}
.mobile-story-back:hover { color: var(--ink); border-color: var(--rule-hover); }
.mobile-story-back-label {
  font-size: 0.85rem;
  color: var(--ink-secondary);
  font-weight: 500;
}
.mobile-story-detail-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px;
}

/* ─── Transitions ─── */
.mobile-sheet-fade-enter-active { transition: opacity 0.25s ease; }
.mobile-sheet-fade-enter-active .mobile-sheet { transition: transform 0.36s cubic-bezier(0.32, 0.72, 0, 1); }
.mobile-sheet-fade-leave-active { transition: opacity 0.22s ease; }
.mobile-sheet-fade-leave-active .mobile-sheet { transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1); }
.mobile-sheet-fade-enter-from { opacity: 0; }
.mobile-sheet-fade-enter-from .mobile-sheet { transform: translateY(100%); }
.mobile-sheet-fade-leave-to { opacity: 0; }
.mobile-sheet-fade-leave-to .mobile-sheet { transform: translateY(100%); }

.pc-detail-fade-enter-active { transition: opacity 0.25s ease; }
.pc-detail-fade-enter-active .detail-wrap { transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
.pc-detail-fade-leave-active { transition: opacity 0.2s ease; }
.pc-detail-fade-leave-active .detail-wrap { transition: transform 0.2s ease-in; }
.pc-detail-fade-enter-from, .pc-detail-fade-leave-to { opacity: 0; }
.pc-detail-fade-enter-from .detail-wrap, .pc-detail-fade-leave-to .detail-wrap {
  transform: scale(0.95) translateY(16px);
}

.mobile-story-slide-enter-active { transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
.mobile-story-slide-leave-active { transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1); }
.mobile-story-slide-enter-from { transform: translateX(100%); }
.mobile-story-slide-leave-to { transform: translateX(100%); }
</style>
