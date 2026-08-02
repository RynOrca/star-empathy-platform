<template>
  <!-- ═══ PC 端布局 ═══ -->
  <div v-if="!isMobile" class="overlay" @click.self="$emit('close')">
    <div class="detail-wrap">
      <!-- 左：叙事 + 故事面板 -->
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

        <!-- Tab 内容区 -->
        <div class="tab-content">
          <!-- Tab: AI 叙事 -->
          <template v-if="activeTab === 'narrative'">
            <div class="narrative-layout">
              <div class="narrative-top">
                <StarNarrative
                  :content="narrative.content.value"
                  :loading="narrative.loading.value"
                  :error="narrative.error.value"
                  :cached="narrative.cached.value"
                  @retry="narrative.fetchNarrative(catalogStarId)"
                />
              </div>
              <div class="narrative-bottom">
                <SimilarStarsPanel
                  :similarStars="similarStars.similarStars.value"
                  :getStarName="getStarName"
                  :onSimilarStarClick="onSimilarStarClick"
                />
                <AreaHighlightsPanel
                  :highlights="areaHighlightsData"
                  :loading="areaLoading"
                  :currentStarId="catalogStarId"
                  :getStarName="getStarName"
                  :onSimilarStarClick="onSimilarStarClick"
                />
              </div>
            </div>
          </template>

          <!-- Tab: 历史故事 -->
          <template v-else-if="activeTab === 'history'">
            <StoryDetail
              v-if="detailStory"
              :story="detailStory"
              :backLabel="detailBackLabel"
              :renderedContent="renderMarkdown(detailStory.content)"
              :displayResonance="getDisplayResonance(detailStory)"
              :isResonated="justResonatedId === detailStory.id"
              :resonating="resonating"
              :deleting="deleting"
              :currentUserId="currentUserId"
              :formattedTime="formatTime(detailStory.createdAt)"
              :formattedDistance="formatDistance(detailStory.locationLat, detailStory.locationLng)"
              @back="detailStoryId = null"
              @resonate="onResonate(detailStory)"
              @delete="confirmDelete(detailStory.id)"
            />
            <StoryList
              v-else
              :stories="historyStories"
              variant="history"
              :resonating="resonating"
              :showToolbar="false"
              :emptyIcon="BookOpen"
              emptyMessage="这颗星还没有历史故事"
              :renderedContent="(s: any) => renderMarkdown(s.content)"
              :displayResonance="(s: any) => getDisplayResonance(s)"
              :displayViews="(s: any) => getStoryViewCount(s.id)"
              :isResonated="(s: any) => justResonatedId === s.id"
              @story-click="openStoryDetail"
              @resonate="onResonate"
            />
          </template>

          <!-- Tab: 所有故事 -->
          <template v-else-if="activeTab === 'all'">
            <StoryDetail
              v-if="detailStory"
              :story="detailStory"
              :backLabel="detailBackLabel"
              :renderedContent="renderMarkdown(detailStory.content)"
              :displayResonance="getDisplayResonance(detailStory)"
              :isResonated="justResonatedId === detailStory.id"
              :resonating="resonating"
              :deleting="deleting"
              :currentUserId="currentUserId"
              :formattedTime="formatTime(detailStory.createdAt)"
              :formattedDistance="formatDistance(detailStory.locationLat, detailStory.locationLng)"
              @back="detailStoryId = null"
              @resonate="onResonate(detailStory)"
              @delete="confirmDelete(detailStory.id)"
            />
            <StoryList
              v-else
              :stories="displayedStories"
              variant="all"
              :searchQuery="searchQuery"
              :sortKey="sortKey"
              :resonating="resonating"
              :showToolbar="true"
              :emptyIcon="Star"
              :emptyMessage="userStories.length > 0 ? '' : '这颗星还在等待它的故事'"
              :renderedContent="(s: any) => renderMarkdown(s.content)"
              :displayResonance="(s: any) => getDisplayResonance(s)"
              :displayViews="(s: any) => getStoryViewCount(s.id)"
              :isResonated="(s: any) => justResonatedId === s.id"
              :formattedTime="(s: any) => formatTime(s.createdAt)"
              :formattedDistance="(s: any) => formatDistance(s.locationLat, s.locationLng)"
              @update:searchQuery="searchQuery = $event"
              @update:sortKey="onSortKeyChange"
              @story-click="openStoryDetail"
              @resonate="onResonate"
            />
          </template>

          <!-- Tab: 我的故事 -->
          <template v-else-if="activeTab === 'mine'">
            <div v-if="props.currentUserId == null" class="empty-state">
              <User :size="20" class="empty-icon" />
              <p>请先登录后查看我的故事</p>
              <button class="empty-login-btn" @click="$router.push('/')">去登录</button>
            </div>
            <StoryDetail
              v-else-if="detailStory"
              :story="detailStory"
              :backLabel="detailBackLabel"
              :renderedContent="renderMarkdown(detailStory.content)"
              :displayResonance="getDisplayResonance(detailStory)"
              :isResonated="justResonatedId === detailStory.id"
              :resonating="resonating"
              :deleting="deleting"
              :currentUserId="currentUserId"
              :formattedTime="formatTime(detailStory.createdAt)"
              :formattedDistance="formatDistance(detailStory.locationLat, detailStory.locationLng)"
              @back="detailStoryId = null"
              @resonate="onResonate(detailStory)"
              @delete="confirmDelete(detailStory.id)"
            />
            <StoryList
              v-else
              :stories="myStories"
              variant="mine"
              :resonating="resonating"
              :showToolbar="false"
              :emptyIcon="PenSquare"
              emptyMessage="你还没有在这颗星上写过故事"
              :renderedContent="(s: any) => renderMarkdown(s.content)"
              :displayResonance="(s: any) => getDisplayResonance(s)"
              :displayViews="(s: any) => getStoryViewCount(s.id)"
              :isResonated="(s: any) => justResonatedId === s.id"
              :formattedTime="(s: any) => formatTime(s.createdAt)"
              :formattedDistance="(s: any) => formatDistance(s.locationLat, s.locationLng)"
              @story-click="openStoryDetail"
              @resonate="onResonate"
            />
          </template>

          <!-- fallback：未知 Tab -->
          <template v-else>
            <div class="empty-state">
              <AlertTriangle :size="20" class="empty-icon" />
              <p>未知视图</p>
            </div>
          </template>
        </div>
      </div>

      <!-- 右：恒星信息 -->
      <div class="panel panel-info">
        <!-- 顶部固定：关闭按钮 + 星星名字 -->
        <div class="info-header">
          <button class="close-btn" @click="$emit('close')"><X :size="15" /></button>
          <StarHeader :starInfo="starInfo" />
        </div>

        <!-- 中间滚动：星信息 + 标签 -->
        <div class="info-body">
          <StarInfoPanel
            :starInfo="starInfo"
            :catalogStats="catalogStats"
            :astroData="astroData"
            :isFavorited="isFavorited"
            :catalogStarId="catalogStarId"
            :getStarTemperature="getStarTemperature"
            :getBrightnessLabel="getBrightnessLabel"
            :formatAltitude="formatAltitude"
            :azimuthToDirection="azimuthToDirection"
            :formatClockTime="formatClockTime"
            :formatDateTime="formatDateTime"
          />

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
        </div>

        <!-- 底部固定：操作按钮 -->
        <div class="info-footer">
          <BottomBar
            :isFavorited="isFavorited"
            @write-story="onWriteStory"
            @toggle-favorite="toggleFavorite"
            @open-chat="openChat"
          />
        </div>
      </div>
    </div>

    <!-- 古人陪看聊天抽屉 PC -->
    <AncientChat
      :visible="showChat"
      :catalogStarId="catalogStarId"
      :starName="starInfo?.displayName || ''"
      :constellation="starInfo?.conName || ''"
      @close="showChat = false"
    />

    <!-- 删除确认弹窗 PC -->
    <div v-if="showDeleteConfirm" class="delete-confirm-overlay" @click.self="cancelDelete">
      <div class="delete-confirm-card">
        <h3>确认删除</h3>
        <p>删除后不可恢复，确定要删除这个故事吗？</p>
        <div class="delete-confirm-actions">
          <button class="delete-cancel-btn" @click="cancelDelete" :disabled="deleting">取消</button>
          <button class="delete-confirm-btn" @click="doDeleteStory" :disabled="deleting">
            {{ deleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ 移动端布局：底部抽屉 ═══ -->
  <template v-else>
    <Transition name="mobile-sheet-fade">
      <div class="mobile-overlay" @click.self="$emit('close')">
        <div
          class="mobile-sheet"
          :class="{ dragging: isDragging }"
          :style="{ height: sheetHeight }"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend="onTouchEnd"
        >
          <!-- 拖拽条 -->
          <div class="mobile-handle"></div>

          <!-- 顶部栏：关闭 + Tab 下拉 -->
          <div class="mobile-top-bar">
            <button class="mobile-close-btn" @click="$emit('close')">
              <X :size="18" />
            </button>
            <div class="mobile-tab-select-wrap">
              <MobileTabSelect v-model="activeTab" :tabs="mobileTabs" />
            </div>
          </div>

          <!-- 滚动内容区 -->
          <div class="mobile-content">
            <!-- 古人共赏内联模式 -->
            <template v-if="showChat">
              <div class="mobile-chat-inline">
                <button class="mobile-chat-back" @click="showChat = false">
                  <ChevronDown :size="18" style="transform: rotate(90deg)" />
                  <span>返回</span>
                </button>
                <AncientChat
                  :visible="true"
                  :catalogStarId="catalogStarId"
                  :starName="starInfo?.displayName || ''"
                  :constellation="starInfo?.conName || ''"
                  @close="showChat = false"
                />
              </div>
            </template>

            <!-- Tab 内容：下拉框切换 -->
            <template v-else>
              <!-- 星信息 -->
              <template v-if="activeTab === 'info'">
                <StarHeader :starInfo="starInfo" />

                <StarInfoPanel
                  :starInfo="starInfo"
                  :catalogStats="catalogStats"
                  :astroData="astroData"
                  :isFavorited="isFavorited"
                  :catalogStarId="catalogStarId"
                  :getStarTemperature="getStarTemperature"
                  :getBrightnessLabel="getBrightnessLabel"
                  :formatAltitude="formatAltitude"
                  :azimuthToDirection="azimuthToDirection"
                  :formatClockTime="formatClockTime"
                  :formatDateTime="formatDateTime"
                />

                <!-- 相似星星 + 天区故事精选（移动端纵向堆叠） -->
                <div class="mobile-side-panels">
                  <SimilarStarsPanel
                    :similarStars="similarStars.similarStars.value"
                    :getStarName="getStarName"
                    :onSimilarStarClick="onSimilarStarClick"
                  />
                  <AreaHighlightsPanel
                    :highlights="areaHighlightsData"
                    :loading="areaLoading"
                    :currentStarId="catalogStarId"
                    :getStarName="getStarName"
                    :onSimilarStarClick="onSimilarStarClick"
                  />
                </div>

                <!-- 标签（内联编辑） -->
                <div class="info-section-mobile">
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
              </template>

              <!-- AI 叙事 -->
              <template v-else-if="activeTab === 'narrative'">
                <StarNarrative
                  :content="narrative.content.value"
                  :loading="narrative.loading.value"
                  :error="narrative.error.value"
                  :cached="narrative.cached.value"
                  @retry="narrative.fetchNarrative(catalogStarId)"
                />
              </template>

              <!-- 历史故事 -->
              <template v-else-if="activeTab === 'history'">
                <StoryList
                  :stories="historyStories"
                  variant="history"
                  :resonating="resonating"
                  :showToolbar="false"
                  :emptyIcon="BookOpen"
                  emptyMessage="这颗星还没有历史故事"
                  :renderedContent="(s: any) => renderMarkdown(s.content)"
                  :displayResonance="(s: any) => getDisplayResonance(s)"
                  :displayViews="(s: any) => getStoryViewCount(s.id)"
                  :isResonated="(s: any) => justResonatedId === s.id"
                  @story-click="openStoryDetail"
                  @resonate="onResonate"
                />
              </template>

              <!-- 所有故事 -->
              <template v-else-if="activeTab === 'all'">
                <StoryList
                  :stories="displayedStories"
                  variant="all"
                  :searchQuery="searchQuery"
                  :sortKey="sortKey"
                  :resonating="resonating"
                  :showToolbar="true"
                  :emptyIcon="Star"
                  :emptyMessage="userStories.length > 0 ? '' : '这颗星还在等待它的故事'"
                  :renderedContent="(s: any) => renderMarkdown(s.content)"
                  :displayResonance="(s: any) => getDisplayResonance(s)"
                  :displayViews="(s: any) => getStoryViewCount(s.id)"
                  :isResonated="(s: any) => justResonatedId === s.id"
                  :formattedTime="(s: any) => formatTime(s.createdAt)"
                  :formattedDistance="(s: any) => formatDistance(s.locationLat, s.locationLng)"
                  @update:searchQuery="searchQuery = $event"
                  @update:sortKey="onSortKeyChange"
                  @story-click="openStoryDetail"
                  @resonate="onResonate"
                />
              </template>

              <!-- 我的故事 -->
              <template v-else-if="activeTab === 'mine'">
                <div v-if="props.currentUserId == null" class="empty-state">
                  <User :size="20" class="empty-icon" />
                  <p>请先登录后查看我的故事</p>
                  <button class="empty-login-btn" @click="$router.push('/')">去登录</button>
                </div>
                <StoryList
                  v-else
                  :stories="myStories"
                  variant="mine"
                  :resonating="resonating"
                  :showToolbar="false"
                  :emptyIcon="PenSquare"
                  emptyMessage="你还没有在这颗星上写过故事"
                  :renderedContent="(s: any) => renderMarkdown(s.content)"
                  :displayResonance="(s: any) => getDisplayResonance(s)"
                  :displayViews="(s: any) => getStoryViewCount(s.id)"
                  :isResonated="(s: any) => justResonatedId === s.id"
                  :formattedTime="(s: any) => formatTime(s.createdAt)"
                  :formattedDistance="(s: any) => formatDistance(s.locationLat, s.locationLng)"
                  @story-click="openStoryDetail"
                  @resonate="onResonate"
                />
              </template>

              <template v-else>
                <div class="empty-state">
                  <AlertTriangle :size="20" class="empty-icon" />
                  <p>未知视图</p>
                </div>
              </template>
            </template>
          </div>

          <!-- 底部操作栏 -->
          <div class="mobile-bottom-bar">
            <BottomBar
              :isFavorited="isFavorited"
              @write-story="onWriteStory"
              @toggle-favorite="toggleFavorite"
              @open-chat="openChat"
            />
          </div>
        </div>

        <!-- 移动端故事详情全屏 -->
        <Transition name="mobile-story-slide">
          <div v-if="detailStory" class="mobile-story-detail">
            <div class="mobile-story-detail-top">
              <button class="mobile-story-back" @click="detailStoryId = null">
                <ChevronDown :size="20" style="transform: rotate(90deg)" />
              </button>
              <span class="mobile-story-back-label">{{ detailBackLabel }}</span>
              <div style="width: 20px"></div>
            </div>
            <div class="mobile-story-detail-body">
              <StoryDetail
                :story="detailStory"
                :backLabel="detailBackLabel"
                :renderedContent="renderMarkdown(detailStory.content)"
                :displayResonance="getDisplayResonance(detailStory)"
                :isResonated="justResonatedId === detailStory.id"
                :resonating="resonating"
                :deleting="deleting"
                :currentUserId="currentUserId"
                :formattedTime="formatTime(detailStory.createdAt)"
                :formattedDistance="formatDistance(detailStory.locationLat, detailStory.locationLng)"
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
    </Transition>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { Star, Sparkles, PenSquare, X, BookOpen, List, User, AlertTriangle, ChevronDown } from 'lucide-vue-next'
import StarNarrative from '../StarNarrative.vue'
import AncientChat from '../AncientChat.vue'
import StoryDetail from './StoryDetail.vue'
import StoryList from './StoryList.vue'
import StarHeader from './StarHeader.vue'
import StarInfoPanel from './StarInfoPanel.vue'
import BottomBar from './BottomBar.vue'
import MobileTabSelect from './MobileTabSelect.vue'
import MobileActionSheet from './MobileActionSheet.vue'
import SimilarStarsPanel from './SimilarStarsPanel.vue'
import AreaHighlightsPanel from './AreaHighlightsPanel.vue'
import { useNarrative } from '../../composables/useNarrative'
import { useKernel } from '../../composables/useKernel'
import { useSimilarStars } from '../../composables/useSimilarStars'
import { useAreaHighlights } from '../../composables/useAreaHighlights'
import { useAstroEvents, formatTime as formatClockTime, formatDateTime, formatAltitude, azimuthToDirection } from '../../composables/useAstroEvents'
import { useMediaQuery } from '../../composables/useMediaQuery'
import catalogData from '../../data/stars.json'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
marked.setOptions({ breaks: true, gfm: true })

const { isMobile } = useMediaQuery()

// ─── 移动端底部抽屉状态 ───
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
    // 下拉低于 30vh → 关闭
    emit('close')
  } else if (currentH < vh * 0.75) {
    sheetHeight.value = '60vh'
  } else {
    sheetHeight.value = '90vh'
  }
}

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
    userId: number | null
    imageUrl: string | null
  }>
  activeIndex: number
  starInfo: { id: number; displayName: string; con: string; mag: number; conName: string; distance: number | null; ra: number; dec: number; color: string } | null
  catalogStats: { storyCount: number; totalResonance: number; totalViews: number; starViews: number; favoriteCount: number } | null
  catalogStarId: number
  resonating: boolean
  favoriteStarIds: number[]
  currentUserId: number | null
  observerLat?: number | null
  observerLng?: number | null
  isGuest?: boolean
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
  deleteStory: [storyId: number]
}>()

const router = useRouter()
// 访客拦截：体验账号不能收藏/共鸣/写故事/与古人共赏，跳登录页
// 必须先清 token 再跳转，否则路由守卫（to.path === '/' && token）会重定向回 /sky
function guestGuard(): boolean {
  if (props.isGuest) {
    localStorage.removeItem('token')
    router.push('/')
    return true
  }
  return false
}

const realStories = computed(() => props.stories.filter(s => s.id > 0))
const hasRealStory = computed(() => realStories.value.length > 0)

const historyStories = computed(() => realStories.value.filter(s => s.type === 'history'))
const userStories = computed(() => realStories.value.filter(s => s.type !== 'history'))
const myStories = computed(() => realStories.value.filter(s => s.userId != null && s.userId === props.currentUserId))

// ─── 天文事件 ───
const { data: astroData } = useAstroEvents({
  raHours: () => props.starInfo?.ra ?? null,
  decDeg: () => props.starInfo?.dec ?? null,
  observerLat: () => props.observerLat ?? null,
  observerLon: () => props.observerLng ?? null,
})

// ─── 搜索 ───
const searchQuery = ref('')
const filteredStories = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return userStories.value
  return userStories.value.filter(s =>
    (s.title || '').toLowerCase().includes(q) ||
    s.content.toLowerCase().includes(q)
  )
})

// ─── 排序 ───
type SortKey = 'time' | 'distance' | 'resonance' | 'views' | 'random'
const sortKey = ref<SortKey>('time')
const randomSeed = ref(Date.now())

function onSortKeyChange(key: SortKey) {
  sortKey.value = key
  if (key === 'random') randomSeed.value = Date.now()
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

const displayedStories = computed(() => {
  const sortFn = getSortFn(sortKey.value)
  return [...filteredStories.value].sort(sortFn)
})

function getSortFn(key: SortKey): (a: typeof filteredStories.value[0], b: typeof filteredStories.value[0]) => number {
  switch (key) {
    case 'time':
      return (a, b) => b.createdAt.localeCompare(a.createdAt)
    case 'distance': {
      return (a, b) => {
        const da = formatDistance(a.locationLat, a.locationLng)
        const db2 = formatDistance(b.locationLat, b.locationLng)
        if (da.text && !db2.text) return -1
        if (!da.text && db2.text) return 1
        if (!da.text && !db2.text) return 0
        const na = parseFloat(da.text) || 0
        const nb = parseFloat(db2.text) || 0
        return na - nb
      }
    }
    case 'resonance':
      return (a, b) => getDisplayResonance(b) - getDisplayResonance(a)
    case 'views':
      return (a, b) => getStoryViewCount(b.id) - getStoryViewCount(a.id)
    case 'random': {
      const rng = seededRandom(randomSeed.value)
      return () => rng() - 0.5
    }
  }
}

function renderMarkdown(text: string): string {
  if (!text) return ''
  const raw = marked.parse(text) as string
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
  })
}

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
type TabId = 'info' | 'narrative' | 'history' | 'all' | 'mine'
// PC 端：不含「星信息」（与右栏重复）
const pcTabs: { id: TabId; label: string; icon: Component }[] = [
  { id: 'narrative', label: 'AI 叙事', icon: Sparkles },
  { id: 'history', label: '历史故事', icon: BookOpen },
  { id: 'all', label: '用户故事', icon: List },
  { id: 'mine', label: '我的故事', icon: User },
]
// 移动端：包含「星信息」
const mobileTabs: { id: TabId; label: string; icon: Component }[] = [
  { id: 'info', label: '星信息', icon: Star },
  ...pcTabs,
]
// 初始化时同步判断移动端（useMediaQuery 在 onMounted 才生效，不能用）
const isMobileInit = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
const activeTab = ref<TabId>(isMobileInit ? 'info' : 'narrative')

const detailBackLabel = computed(() => {
  switch (activeTab.value) {
    case 'history': return '历史故事'
    case 'all': return '用户故事'
    case 'mine': return '我的故事'
    default: return '返回'
  }
})

// ─── 共鸣乐观更新 ───
const resonanceOverrides = reactive(new Map<number, number>())
function getDisplayResonance(story: { id: number; resonanceCount: number }): number {
  return resonanceOverrides.get(story.id) ?? story.resonanceCount
}
watch(() => props.stories, () => {
  resonanceOverrides.clear()
})

// ─── 用户位置 ───
const userPosition = ref<{ lat: number; lng: number } | null>(null)
const positionReady = ref(false)

// ─── 叙事 ───
const narrative = useNarrative()

function fetchNarrativeWithPosition() {
  if (!props.catalogStarId) return
  narrative.reset()
  const lat = props.observerLat ?? userPosition.value?.lat
  const lng = props.observerLng ?? userPosition.value?.lng
  narrative.fetchNarrative(props.catalogStarId, lat, lng, props.starInfo?.ra, props.starInfo?.dec)
}

let isFirstStarChange = true
watch(() => props.catalogStarId, (id) => {
  // 首次由初始化值决定，后续切换星星时根据平台重置
  if (!isFirstStarChange) {
    activeTab.value = isMobile.value ? 'info' : 'narrative'
  }
  isFirstStarChange = false
  searchQuery.value = ''
  detailStoryId.value = null
  if (id && (positionReady.value || props.observerLat != null)) {
    fetchNarrativeWithPosition()
  }
}, { immediate: true })

watch(activeTab, () => {
  detailStoryId.value = null
})

// ─── AI 内核标签 ───
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
  window.dispatchEvent(new CustomEvent('fly-to-star', { detail: { catalogStarId } }))
}

onMounted(() => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userPosition.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        positionReady.value = true
        fetchNarrativeWithPosition()
      },
      () => {
        positionReady.value = true
        fetchNarrativeWithPosition()
      },
      { timeout: 5000 },
    )
  } else {
    positionReady.value = true
  }
  fetchNarrativeWithPosition()
})

function onResonate(story: { id: number; resonanceCount: number }) {
  if (guestGuard()) return
  const current = getDisplayResonance(story)
  resonanceOverrides.set(story.id, current + 1)
  emit('resonate', story.id)
  justResonatedId.value = story.id
  setTimeout(() => { justResonatedId.value = null }, 2000)
}

// ─── 删除故事 ───
const showDeleteConfirm = ref(false)
const deletingStoryId = ref<number | null>(null)
const deleting = ref(false)

function confirmDelete(storyId: number) {
  deletingStoryId.value = storyId
  showDeleteConfirm.value = true
}

async function doDeleteStory() {
  if (!deletingStoryId.value) return
  const token = getToken()
  if (!token) return
  deleting.value = true
  try {
    const res = await fetch(`/api/stories/${deletingStoryId.value}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      emit('deleteStory', deletingStoryId.value)
      showDeleteConfirm.value = false
      deletingStoryId.value = null
      detailStoryId.value = null
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

// ─── 收藏 ───
const isFavorited = computed(() => props.favoriteStarIds.includes(props.catalogStarId))

function getToken() { return localStorage.getItem('token') }

async function toggleFavorite() {
  if (guestGuard()) return
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
      emit('updateStats', json.data)
    }
  } catch { /* 静默 */ }
}

function onWriteStory() { if (guestGuard()) return; emit('writeStory') }

// ─── 古人陪看聊天 ───
const showChat = ref(false)
function openChat() { if (guestGuard()) return; showChat.value = true }

function openStoryDetail(story: { id: number }) {
  detailStoryId.value = story.id
  const current = getStoryViewCount(story.id)
  viewCountOverrides.set(story.id, current + 1)
  emit('incrementViews')
  fetch(`/api/stories/${story.id}/view`, { method: 'POST' })
    .then(() => emit('refreshStories'))
    .catch(() => {
      viewCountOverrides.set(story.id, current)
    })
}

// ─── 时间格式化 ───
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

// ─── 恒星色温 ───
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

// ─── 距离格式化 ───
interface DistanceResult { text: string; near: boolean }

function formatDistance(lat: number | null, lng: number | null): DistanceResult {
  if (lat == null || lng == null || !userPosition.value) return { text: '', near: false }
  return calcDistance(userPosition.value.lat, userPosition.value.lng, lat, lng)
}

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): DistanceResult {
  const R = 6371
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

// ─── 标签逻辑 ───
const displayTags = computed<{ tag: string; count: number; type: 'emotion' | 'theme' }[]>(() => {
  const aiTags = kernel.aggregatedTags.value
  if (aiTags && (aiTags.emotionalTags.length > 0 || aiTags.themes.length > 0)) {
    return [
      ...aiTags.emotionalTags.map(t => ({ tag: t.tag, count: t.count, type: 'emotion' as const })),
      ...aiTags.themes.map(t => ({ tag: t.tag, count: t.count, type: 'theme' as const })),
    ].slice(0, 8)
  }
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

const mergedTags = computed<{ tag: string; count: number; type: 'emotion' | 'theme'; custom: boolean }[]>(() => {
  const aiTags = displayTags.value.map(t => ({ ...t, custom: false }))
  const custom = customTags.value.map(t => ({
    tag: t,
    count: 0,
    type: 'theme' as const,
    custom: true,
  }))
  const customNames = new Set(custom.map(t => t.tag))
  const filteredAi = aiTags.filter(t => !customNames.has(t.tag))
  return [...custom, ...filteredAi]
})

watch(() => props.catalogStarId, () => {
  loadCustomTags()
})
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
}
.empty-icon { opacity: 0.2; }

.empty-login-btn {
  margin-top: 12px;
  padding: 8px 20px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--accent-border);
  background: var(--accent-subtle);
  color: var(--accent);
  font-family: var(--font);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s;
}
.empty-login-btn:hover { background: var(--accent-bg); }

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

/* 顶部固定：星星名字 */
.info-header {
  flex-shrink: 0;
  padding: 24px 24px 16px;
  position: relative;
  border-bottom: 1px solid var(--rule);
}

/* 中间滚动：星信息 + 标签 */
.info-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
/* PC 右栏：StarHeader 已在固定顶部，去掉 StarInfoPanel 顶部间距 */
.info-body :deep(.info-rows) {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}
.info-body::-webkit-scrollbar { width: 5px; }
.info-body::-webkit-scrollbar-track { background: transparent; }
.info-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

/* 底部固定：操作按钮 */
.info-footer {
  flex-shrink: 0;
  padding: 16px 24px 20px;
  border-top: 1px solid var(--rule);
  background: var(--surface);
}

/* ─── AI 叙事 Tab 布局：上部叙事 + 下部两栏面板 ─── */
.narrative-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  min-height: 0;
}
.narrative-top {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.narrative-top::-webkit-scrollbar { width: 5px; }
.narrative-top::-webkit-scrollbar-track { background: transparent; }
.narrative-top::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.narrative-bottom {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  height: 220px;
  flex-shrink: 0;
  padding: 0 28px;
}
/* 左栏宽度不足时，双面板收为上下排列 */
@media (max-width: 1050px) {
  .narrative-bottom {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 300px;
  }
}

/* ─── 移动端：相似星星 + 天区故事纵向堆叠 ─── */
.mobile-side-panels {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}
.mobile-side-panels > * {
  min-height: 200px;
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

/* ─── Tag Section ─── */
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
  background: var(--error-subtle);
  color: #ff8b7d;
}
.tag-theme {
  border-color: rgba(134, 168, 255, 0.25);
  background: var(--info-subtle);
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
  background: var(--accent-bg);
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
.tag-edit-btn:hover { opacity: 1; }
.tag-edit-btn:hover { color: var(--accent); }

/* ─── Tag Editor ─── */
.tag-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  background: var(--overlay-02);
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
.tag-remove-x { opacity: 0.5; }
.tag-editable:hover .tag-remove-x { opacity: 1; }
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
.tag-editor-input:focus { border-color: var(--accent-border); }
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
.tag-editor-add:hover:not(:disabled) { background: rgba(255, 217, 138, 0.15); }
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
.tag-suggestion:hover { opacity: 0.7; }
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
.tag-editor-save:hover { background: var(--accent-hover); }
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
.tag-editor-cancel:hover { border-color: var(--rule-hover); }

/* ─── Custom Tag ─── */
.tag-custom {
  border-style: dashed;
  border-color: rgba(255, 217, 138, 0.3);
  color: var(--accent);
}

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
.delete-cancel-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}
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
.delete-confirm-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

/* ═══════════════════════════════════════════
   Mobile Styles
   ═══════════════════════════════════════════ */

/* ─── Mobile Overlay ─── */
.mobile-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(4, 4, 18, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

/* ─── Mobile Sheet ─── */
.mobile-sheet {
  width: 100%;
  max-width: 500px;
  background: rgba(12, 16, 36, 0.98);
  border: 1px solid rgba(48, 55, 87, 0.4);
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 拖拽时高度变化才需要过渡，enter/leave 用 transform 过渡避免冲突 */
.mobile-sheet.dragging {
  transition: height 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  will-change: height;
}

/* ─── Drag Handle ─── */
.mobile-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  margin: 10px auto 6px;
  flex-shrink: 0;
}

/* ─── Mobile Top Bar ─── */
.mobile-top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 16px 10px;
  flex-shrink: 0;
}

.mobile-close-btn {
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
  flex-shrink: 0;
  padding: 0;
  transition: color 0.15s, border-color 0.15s;
}
.mobile-close-btn:hover {
  color: var(--ink);
  border-color: var(--rule-hover);
}

.mobile-tab-select-wrap {
  flex: 1;
  min-width: 0;
}

/* ─── Mobile Content ─── */
.mobile-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding: 0 16px;
}

/* ─── Mobile Section (Collapsible) ─── */
.mobile-section {
  border-bottom: 1px solid var(--rule);
  padding-bottom: 4px;
  margin-bottom: 4px;
}

.mobile-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 0;
  background: none;
  border: none;
  color: var(--ink);
  font-family: var(--font);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s;
}
.mobile-section-header:hover {
  color: var(--accent);
}

.mobile-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mobile-section-arrow {
  color: var(--muted);
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.mobile-section.collapsed .mobile-section-arrow {
  transform: rotate(-90deg);
}

.mobile-section-body {
  overflow: hidden;
  transition: max-height 0.35s cubic-bezier(0.32, 0.72, 0, 1),
              opacity 0.25s ease,
              padding 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  max-height: 2000px;
  opacity: 1;
  padding-bottom: 12px;
}

.mobile-section.collapsed .mobile-section-body {
  max-height: 0;
  opacity: 0;
  padding-bottom: 0;
}

/* ─── Mobile Tags ─── */
.info-section-mobile {
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--rule);
}

/* ─── Mobile Bottom Bar ─── */
.mobile-bottom-bar {
  flex-shrink: 0;
  padding: 10px 16px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--rule);
  background: rgba(12, 16, 36, 0.98);
  backdrop-filter: blur(8px);
}

/* ─── Mobile Chat Inline ─── */
.mobile-chat-inline {
  display: flex;
  flex-direction: column;
  min-height: 300px;
}

.mobile-chat-back {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  background: none;
  border: none;
  color: var(--accent);
  font-family: var(--font);
  font-size: 0.82rem;
  cursor: pointer;
  margin-bottom: 8px;
  transition: opacity 0.15s;
}
.mobile-chat-back:hover {
  opacity: 0.8;
}

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
.mobile-story-back:hover {
  color: var(--ink);
  border-color: var(--rule-hover);
}

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

/* ─── Mobile Transitions ─── */
.mobile-sheet-fade-enter-active {
  transition: opacity 0.25s ease;
}
.mobile-sheet-fade-enter-active .mobile-sheet {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.mobile-sheet-fade-leave-active {
  transition: opacity 0.2s ease;
}
.mobile-sheet-fade-leave-active .mobile-sheet {
  transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
}
.mobile-sheet-fade-enter-from {
  opacity: 0;
}
.mobile-sheet-fade-enter-from .mobile-sheet {
  transform: translateY(100%);
}
.mobile-sheet-fade-leave-to {
  opacity: 0;
}
.mobile-sheet-fade-leave-to .mobile-sheet {
  transform: translateY(100%);
}

.mobile-story-slide-enter-active {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.mobile-story-slide-leave-active {
  transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
}
.mobile-story-slide-enter-from {
  transform: translateX(100%);
}
.mobile-story-slide-leave-to {
  transform: translateX(100%);
}
</style>