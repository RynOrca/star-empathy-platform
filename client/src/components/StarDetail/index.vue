<template>
  <!-- ═══ PC 端布局 ═══ -->
  <Transition name="pc-detail-fade" @after-leave="emit('close')">
    <div v-if="!isMobile && show" class="overlay" :class="{ 'observe-mode': isPlanetCloseup && observeMode }" @click.self="handleClose">
    <div v-show="!(isPlanetCloseup && observeMode)" class="detail-wrap">
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
          <!-- Tab: AI 叙事（星语AI） -->
          <template v-if="activeTab === 'narrative'">
            <div class="narrative-layout">
              <!-- Tab 引导条：星语AI（仿 ca-hero-strip 风格） -->
              <div class="tab-intro tab-intro-narrative">
                <div class="ti-left">
                  <SparklesIcon :size="13" class="ti-icon" />
                  <span class="ti-label">星语AI</span>
                  <span class="ti-sub">· 正在聆听这颗星的心事，解读星格画像与情感脉络</span>
                </div>
              </div>
              <div class="narrative-top">
                <!-- 🧠 AI 分析模块（1）星格画像 -->
                <AIPersonaCard
                  :storyCount="catalogStats?.storyCount ?? 0"
                  :updatedAt="analysisUpdatedText || '刚刚生成'"
                  :starName="currentStarName"
                  :constellationName="currentConstellation || '未知星座'"
                  :starColor="getStarColor(catalogStarId)"
                  :persona="starAnalysis.analysis.value?.persona ?? undefined"
                  :analysis-ready="analysisReady"
                />

                <!-- 🧠 AI 分析模块（2+3）情感雷达 + 关键词云 -->
                <AIRadarWordcloud
                  :storyCount="catalogStats?.storyCount ?? 0"
                  :emotion="starAnalysis.analysis.value?.emotion ?? undefined"
                  :analysis-ready="analysisReady"
                />

                <!-- 🧠 AI 分析模块（4+5）24h热力 + 主题分布 -->
                <AIHeatmapThemes
                  :storyCount="catalogStats?.storyCount ?? 0"
                  :themeHour="starAnalysis.analysis.value?.themehour ?? undefined"
                  :analysis-ready="analysisReady"
                />

                <div class="narrative-bottom">
                  <div class="panel-wrapper pw-left">
                    <div class="panel-head">
                      <Sparkle :size="10" class="pw-icon pw-gold" />
                      <span class="pw-title">内核相似</span>
                      <span class="pw-count">{{ similarStars.similarStars.value?.length ?? 0 }} 颗</span>
                    </div>
                    <SimilarStarsPanel
                      :similarStars="similarStars.similarStars.value"
                      :getStarName="getStarName"
                      :getStarColor="getStarColor"
                      :getConstellationName="getConstellationName"
                      :onSimilarStarClick="onSimilarStarClick"
                    />
                  </div>
                  <div class="panel-wrapper pw-right">
                    <div class="panel-head">
                      <BookOpen :size="10" class="pw-icon pw-purple" />
                      <span class="pw-title">天区精选</span>
                      <span class="pw-count">{{ areaHighlightsData?.length ?? 0 }} 则</span>
                    </div>
                    <AreaHighlightsPanel
                      :highlights="areaHighlightsData"
                      :loading="areaLoading"
                      :currentStarId="catalogStarId"
                      :getStarName="getStarName"
                      :getStarColor="getStarColor"
                      :getConstellationName="getConstellationName"
                      :onSimilarStarClick="onSimilarStarClick"
                    />
                  </div>
                </div>

                <!-- E. 共鸣榜 Top 3 -->
                <div v-if="topResonatedStories.length > 0" class="story-section story-section-bottom">
                  <div class="section-header">
                    <FlameIcon :size="13" class="section-icon section-icon-orange" />
                    <span class="section-title">共鸣榜</span>
                    <span class="section-count">Top {{ topResonatedStories.length }}</span>
                  </div>
                  <div class="story-cards">
                    <div
                      v-for="(s, si) in topResonatedStories"
                      :key="s.id"
                      class="story-card story-card-top"
                      @click="openStoryDetail(s)"
                    >
                      <div class="card-rank" :class="`rank-${si + 1}`">{{ si + 1 }}</div>
                      <div class="card-body">
                        <div class="card-title" v-if="s.title">{{ s.title }}</div>
                        <div class="card-summary">{{ storySummary(s.content) }}</div>
                        <!-- 标签行：正文下方、meta 上方，空时隐藏 -->
                        <div
                          v-if="storyDisplayTags(s).length"
                          class="card-tags card-tags-inline"
                        >
                          <span
                            v-for="t in storyDisplayTags(s)"
                            :key="'top-' + s.id + '-' + t"
                            class="story-tag story-tag-inline"
                            :style="storyTagStyle(t)"
                          >#{{ t }}</span>
                        </div>
                        <div class="card-meta">
                          <HeartIcon :size="10" />
                          <span>{{ getDisplayResonance(s) }} 共鸣</span>
                          <span v-if="s.username" class="meta-sep">·</span>
                          <span v-if="s.username" class="meta-user">{{ s.username }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- F. 最新 3 条心事 -->
                <div v-if="latestStories.length > 0" class="story-section story-section-bottom">
                  <div class="section-header">
                    <ClockIcon :size="13" class="section-icon section-icon-blue" />
                    <span class="section-title">最新心事</span>
                    <div
                      class="section-more"
                      @click.stop="activeTab = 'all' as any"
                    >
                      查看全部 <ChevronDown :size="11" />
                    </div>
                  </div>
                  <div class="story-cards">
                    <div
                      v-for="s in latestStories"
                      :key="s.id"
                      class="story-card"
                      @click="openStoryDetail(s)"
                    >
                      <div class="card-body">
                        <div class="card-head">
                          <div class="card-avatar">
                            <User :size="11" />
                          </div>
                          <div class="card-user">
                            <div class="user-name">{{ s.username || '匿名星友' }}</div>
                            <div class="user-time">{{ formatTime(s.createdAt) }}</div>
                          </div>
                        </div>
                        <div class="card-summary">{{ storySummary(s.content) }}</div>
                        <!-- 标签行：正文下方、meta 上方；空时隐藏 -->
                        <div
                          v-if="storyDisplayTags(s).length"
                          class="card-tags card-tags-inline"
                        >
                          <span
                            v-for="t in storyDisplayTags(s)"
                            :key="'card-' + s.id + '-' + t"
                            class="story-tag story-tag-inline"
                            :style="storyTagStyle(t)"
                          >#{{ t }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Tab: 历史故事（星史长卷） -->
          <template v-else-if="activeTab === 'history'">
            <!-- Tab 引导条：星史长卷（仿 ca-hero-strip 风格） -->
            <div v-if="!detailStory" class="tab-intro tab-intro-history">
              <div class="ti-left">
                <BookOpen :size="13" class="ti-icon" />
                <span class="ti-label">星史长卷</span>
                <span class="ti-sub">· 穿越时空的星河史卷，品读古人留下的诗与传说</span>
              </div>
            </div>
            <StoryDetail
              v-if="detailStory"
              :story="detailStory"
              :backLabel="detailBackLabel"
              :renderedContent="renderMarkdown(detailStory.content)"
              :displayResonance="getDisplayResonance(detailStory)"
              :isResonated="isStoryResonated(detailStory)"
              :resonating="isStoryResonating(detailStory)"
              :deleting="deleting"
              :currentUserId="currentUserId"
              :formattedTime="formatTime(detailStory.createdAt)"
              :formattedDistance="formatDistance(detailStory.locationLat, detailStory.locationLng)"
              :viewCount="getStoryViewCount(detailStory.id)"
              :origin="detailStory.origin ?? null"
              :createdAtIso="detailStory.createdAt"
              :siblingStories="siblingStoriesFor(detailStory)"
              :showStarBelonging="false"
              @back="detailStoryId = null"
              @resonate="onResonate(detailStory)"
              @delete="confirmDelete(detailStory.id)"
              :collection-clickable="true"
              @collection-click="onCollectionClick"
              @open-story="openStoryDetail"
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
              :isResonated="(s: any) => isStoryResonated(s)"
              :collectionClickable="true"
              :showStarBelonging="false"
              @story-click="openStoryDetail"
              @resonate="onResonate"
              @collection-click="onCollectionClick"
            />
          </template>

          <!-- Tab: 所有故事（故事广场） -->
          <template v-else-if="activeTab === 'all'">
            <!-- Tab 引导条：故事广场（仿 ca-hero-strip 风格） -->
            <div v-if="!detailStory" class="tab-intro tab-intro-all">
              <div class="ti-left">
                <List :size="13" class="ti-icon" />
                <span class="ti-label">故事广场</span>
                <span class="ti-sub">· 星友们的心事在此汇聚，漫步广场，寻找共鸣的故事</span>
              </div>
            </div>
            <StoryDetail
              v-if="detailStory"
              :story="detailStory"
              :backLabel="detailBackLabel"
              :renderedContent="renderMarkdown(detailStory.content)"
              :displayResonance="getDisplayResonance(detailStory)"
              :isResonated="isStoryResonated(detailStory)"
              :resonating="isStoryResonating(detailStory)"
              :deleting="deleting"
              :currentUserId="currentUserId"
              :formattedTime="formatTime(detailStory.createdAt)"
              :formattedDistance="formatDistance(detailStory.locationLat, detailStory.locationLng)"
              :viewCount="getStoryViewCount(detailStory.id)"
              :origin="detailStory.origin ?? null"
              :createdAtIso="detailStory.createdAt"
              :siblingStories="siblingStoriesFor(detailStory)"
              :showStarBelonging="false"
              @back="detailStoryId = null"
              @resonate="onResonate(detailStory)"
              @delete="confirmDelete(detailStory.id)"
              :collection-clickable="true"
              @collection-click="onCollectionClick"
              @open-story="openStoryDetail"
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
              :isResonated="(s: any) => isStoryResonated(s)"
              :formattedTime="(s: any) => formatTime(s.createdAt)"
              :formattedDistance="(s: any) => formatDistance(s.locationLat, s.locationLng)"
              :collectionClickable="true"
              :showStarBelonging="false"
              @update:searchQuery="searchQuery = $event"
              @update:sortKey="onSortKeyChange"
              @story-click="openStoryDetail"
              @resonate="onResonate"
              @collection-click="onCollectionClick"
            />
          </template>

          <!-- Tab: 我的故事（我的星语） -->
          <template v-else-if="activeTab === 'mine'">
            <div v-if="props.currentUserId == null" class="empty-state">
              <User :size="20" class="empty-icon" />
              <p>请先登录后查看我的故事</p>
              <button class="empty-login-btn" @click="$router.push('/')">去登录</button>
            </div>
            <template v-else>
              <!-- Tab 引导条：我的星语（仿 ca-hero-strip 风格） -->
              <div v-if="!detailStory" class="tab-intro tab-intro-mine">
                <div class="ti-left">
                  <User :size="13" class="ti-icon" />
                  <span class="ti-label">我的星语</span>
                  <span class="ti-sub">· 你挂在这颗星上的专属心事，安放在为你闪烁的星辰下</span>
                </div>
              </div>
              <StoryDetail
                v-if="detailStory"
                :story="detailStory"
                :backLabel="detailBackLabel"
                :renderedContent="renderMarkdown(detailStory.content)"
                :displayResonance="getDisplayResonance(detailStory)"
                :isResonated="isStoryResonated(detailStory)"
                :resonating="isStoryResonating(detailStory)"
                :deleting="deleting"
                :currentUserId="currentUserId"
                :formattedTime="formatTime(detailStory.createdAt)"
                :formattedDistance="formatDistance(detailStory.locationLat, detailStory.locationLng)"
                :viewCount="getStoryViewCount(detailStory.id)"
                :origin="detailStory.origin ?? null"
                :createdAtIso="detailStory.createdAt"
                :siblingStories="siblingStoriesFor(detailStory)"
                :showStarBelonging="false"
                @back="detailStoryId = null"
                @resonate="onResonate(detailStory)"
                @delete="confirmDelete(detailStory.id)"
                :collection-clickable="true"
                @collection-click="onCollectionClick"
                @open-story="openStoryDetail"
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
                :isResonated="(s: any) => isStoryResonated(s)"
                :formattedTime="(s: any) => formatTime(s.createdAt)"
                :formattedDistance="(s: any) => formatDistance(s.locationLat, s.locationLng)"
                :collectionClickable="true"
                :showStarBelonging="false"
                @story-click="openStoryDetail"
                @resonate="onResonate"
                @collection-click="onCollectionClick"
              />
            </template>
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
          <button class="close-btn" @click="handleClose"><X :size="15" /></button>
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
                :style="infoTagStyle(t.tag, t.custom ? 'custom' : t.type)"
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
    <!-- PC 端行星特写 · 观察/返回按钮（issue #136）：已隐藏（功能存在 bug，待修复后恢复）
    <button
      v-if="isPlanetCloseup"
      class="observe-toggle-btn"
      @click="emit('toggleObserve')"
    >
      {{ observeMode ? '返回' : '观察' }}
    </button>
    -->
  </div>
  </Transition>

  <!-- ═══ 移动端布局：底部抽屉 ═══ -->
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
          <!-- 拖拽条（点击关闭） -->
          <div class="mobile-handle" @click="handleClose"></div>

          <!-- 顶部栏：关闭 + Tab 下拉 -->
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
              <!-- 星信息（星辰档案） -->
              <template v-if="activeTab === 'info'">
                <!-- Tab 引导条：星辰档案（仿 ca-hero-strip 风格） -->
                <div class="tab-intro tab-intro-info mobile-ti">
                  <div class="ti-left">
                    <Star :size="13" class="ti-icon" />
                    <span class="ti-label">星辰档案</span>
                    <span class="ti-sub">· 这颗星的宇宙名片，查阅它的坐标、亮度与运行轨迹</span>
                  </div>
                </div>
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
                    :getStarColor="getStarColor"
                    :getConstellationName="getConstellationName"
                    :onSimilarStarClick="onSimilarStarClick"
                  />
                  <AreaHighlightsPanel
                    :highlights="areaHighlightsData"
                    :loading="areaLoading"
                    :currentStarId="catalogStarId"
                    :getStarName="getStarName"
                    :getStarColor="getStarColor"
                    :getConstellationName="getConstellationName"
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

              <!-- AI 叙事（移动端）：只保留星语AI 往下的内容，旧 Markdown 叙事整块移除 -->
              <template v-else-if="activeTab === 'narrative'">
                <div class="narrative-layout mobile-narrative-layout">
                  <!-- Tab 引导条：星语AI（移动端 · 仿 ca-hero-strip 风格） -->
                  <div class="tab-intro tab-intro-narrative mobile-ti">
                    <div class="ti-left">
                      <SparklesIcon :size="13" class="ti-icon" />
                      <span class="ti-label">星语AI</span>
                      <span class="ti-sub">· 正在聆听这颗星的心事，解读星格画像与情感脉络</span>
                    </div>
                  </div>
                  <div class="narrative-top">
                    <!-- A. 星语数据条 -->
                    <div v-if="catalogStats" class="story-stats-bar">
                      <div class="stat-item">
                        <EyeIcon :size="14" class="stat-icon stat-icon-eye" />
                        <div class="stat-info">
                          <div class="stat-num">{{ catalogStats.starViews?.toLocaleString() ?? 0 }}</div>
                          <div class="stat-label">凝望次数</div>
                        </div>
                      </div>
                      <div class="stat-divider"></div>
                      <div class="stat-item">
                        <BookOpen :size="14" class="stat-icon stat-icon-story" />
                        <div class="stat-info">
                          <div class="stat-num">{{ catalogStats.storyCount ?? 0 }}</div>
                          <div class="stat-label">心事总数</div>
                        </div>
                      </div>
                      <div class="stat-divider"></div>
                      <div class="stat-item">
                        <HeartIcon :size="14" class="stat-icon stat-icon-heart" />
                        <div class="stat-info">
                          <div class="stat-num">{{ catalogStats.totalResonance?.toLocaleString() ?? 0 }}</div>
                          <div class="stat-label">共鸣总数</div>
                        </div>
                      </div>
                    </div>

                    <!-- 🧠 AI 分析模块（1）星格画像 -->
                    <AIPersonaCard
                      :storyCount="catalogStats?.storyCount ?? 0"
                      :updatedAt="analysisUpdatedText || '刚刚生成'"
                      :starName="currentStarName"
                      :constellationName="currentConstellation || '未知星座'"
                      :starColor="getStarColor(catalogStarId)"
                      :persona="starAnalysis.analysis.value?.persona ?? undefined"
                      :analysis-ready="analysisReady"
                    />

                    <!-- 🧠 AI 分析模块（2+3）情感雷达 + 关键词云 -->
                    <AIRadarWordcloud
                      :storyCount="catalogStats?.storyCount ?? 0"
                      :emotion="starAnalysis.analysis.value?.emotion ?? undefined"
                      :analysis-ready="analysisReady"
                    />

                    <!-- 🧠 AI 分析模块（4+5）24h热力 + 主题分布 -->
                    <AIHeatmapThemes
                      :storyCount="catalogStats?.storyCount ?? 0"
                      :themeHour="starAnalysis.analysis.value?.themehour ?? undefined"
                      :analysis-ready="analysisReady"
                    />

                    <div class="narrative-bottom">
                      <div class="panel-wrapper pw-left">
                        <div class="panel-head">
                          <Sparkle :size="10" class="pw-icon pw-gold" />
                          <span class="pw-title">内核相似</span>
                          <span class="pw-count">{{ similarStars.similarStars.value?.length ?? 0 }} 颗</span>
                        </div>
                        <SimilarStarsPanel
                          :similarStars="similarStars.similarStars.value"
                          :getStarName="getStarName"
                          :getStarColor="getStarColor"
                          :getConstellationName="getConstellationName"
                          :onSimilarStarClick="onSimilarStarClick"
                        />
                      </div>
                      <div class="panel-wrapper pw-right">
                        <div class="panel-head">
                          <BookOpen :size="10" class="pw-icon pw-purple" />
                          <span class="pw-title">天区精选</span>
                          <span class="pw-count">{{ areaHighlightsData?.length ?? 0 }} 则</span>
                        </div>
                        <AreaHighlightsPanel
                          :highlights="areaHighlightsData"
                          :loading="areaLoading"
                          :currentStarId="catalogStarId"
                          :getStarName="getStarName"
                          :getStarColor="getStarColor"
                          :getConstellationName="getConstellationName"
                          :onSimilarStarClick="onSimilarStarClick"
                        />
                      </div>
                    </div>

                    <!-- E. 共鸣榜 Top 3 -->
                    <div v-if="topResonatedStories.length > 0" class="story-section story-section-bottom">
                      <div class="section-header">
                        <FlameIcon :size="13" class="section-icon section-icon-orange" />
                        <span class="section-title">共鸣榜</span>
                        <span class="section-count">Top {{ topResonatedStories.length }}</span>
                      </div>
                      <div class="story-cards">
                        <div
                          v-for="(s, si) in topResonatedStories"
                          :key="s.id"
                          class="story-card story-card-top"
                          @click="openStoryDetail(s)"
                        >
                          <div class="card-rank" :class="`rank-${si + 1}`">{{ si + 1 }}</div>
                          <div class="card-body">
                            <div class="card-title" v-if="s.title">{{ s.title }}</div>
                            <div class="card-summary">{{ storySummary(s.content) }}</div>
                            <!-- 标签行：正文下方、meta 上方，空时隐藏 -->
                            <div
                              v-if="storyDisplayTags(s).length"
                              class="card-tags card-tags-inline"
                            >
                              <span
                                v-for="t in storyDisplayTags(s)"
                                :key="'topm-' + s.id + '-' + t"
                                class="story-tag story-tag-inline"
                                :style="storyTagStyle(t)"
                              >#{{ t }}</span>
                            </div>
                            <div class="card-meta">
                              <HeartIcon :size="10" />
                              <span>{{ getDisplayResonance(s) }} 共鸣</span>
                              <span v-if="s.username" class="meta-sep">·</span>
                              <span v-if="s.username" class="meta-user">{{ s.username }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- F. 最新 3 条心事 -->
                    <div v-if="latestStories.length > 0" class="story-section story-section-bottom">
                      <div class="section-header">
                        <Sparkle :size="12" class="section-icon section-icon-blue" />
                        <span class="section-title">最新心事</span>
                        <span class="section-count">{{ latestStories.length }} 则</span>
                      </div>
                      <div class="story-cards story-cards-latest">
                        <div
                          v-for="s in latestStories"
                          :key="s.id"
                          class="story-card story-card-latest"
                          @click="openStoryDetail(s)"
                        >
                          <div class="card-body">
                            <div class="card-title" v-if="s.title">{{ s.title }}</div>
                            <div class="card-summary">{{ storySummary(s.content) }}</div>
                            <!-- 标签行：正文下方、meta 上方，空时隐藏 -->
                            <div
                              v-if="storyDisplayTags(s).length"
                              class="card-tags card-tags-inline"
                            >
                              <span
                                v-for="t in storyDisplayTags(s)"
                                :key="'l-' + s.id + '-' + t"
                                class="story-tag story-tag-inline"
                                :style="storyTagStyle(t)"
                              >#{{ t }}</span>
                            </div>
                            <div class="card-meta">
                              <ClockIcon :size="10" class="meta-clock" />
                              <span>{{ formatTime(s.createdAt) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- 历史故事（星史长卷） -->
              <template v-else-if="activeTab === 'history'">
                <!-- Tab 引导条：星史长卷（移动端 · 仿 ca-hero-strip 风格） -->
                <div class="tab-intro tab-intro-history mobile-ti">
                  <div class="ti-left">
                    <BookOpen :size="13" class="ti-icon" />
                    <span class="ti-label">星史长卷</span>
                    <span class="ti-sub">· 穿越时空的星河史卷，品读古人留下的诗与传说</span>
                  </div>
                </div>
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
                  :isResonated="(s: any) => isStoryResonated(s)"
                  @story-click="openStoryDetail"
                  @resonate="onResonate"
                />
              </template>

              <!-- 所有故事（故事广场） -->
              <template v-else-if="activeTab === 'all'">
                <!-- Tab 引导条：故事广场（移动端 · 仿 ca-hero-strip 风格） -->
                <div class="tab-intro tab-intro-all mobile-ti">
                  <div class="ti-left">
                    <List :size="13" class="ti-icon" />
                    <span class="ti-label">故事广场</span>
                    <span class="ti-sub">· 星友们的心事在此汇聚，漫步广场，寻找共鸣的故事</span>
                  </div>
                </div>
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
                  :isResonated="(s: any) => isStoryResonated(s)"
                  :formattedTime="(s: any) => formatTime(s.createdAt)"
                  :formattedDistance="(s: any) => formatDistance(s.locationLat, s.locationLng)"
                  @update:searchQuery="searchQuery = $event"
                  @update:sortKey="onSortKeyChange"
                  @story-click="openStoryDetail"
                  @resonate="onResonate"
                />
              </template>

              <!-- 我的故事（我的星语） -->
              <template v-else-if="activeTab === 'mine'">
                <div v-if="props.currentUserId == null" class="empty-state">
                  <User :size="20" class="empty-icon" />
                  <p>请先登录后查看我的故事</p>
                  <button class="empty-login-btn" @click="$router.push('/')">去登录</button>
                </div>
                <template v-else>
                  <!-- Tab 引导条：我的星语（移动端 · 仿 ca-hero-strip 风格） -->
                  <div class="tab-intro tab-intro-mine mobile-ti">
                    <div class="ti-left">
                      <User :size="13" class="ti-icon" />
                      <span class="ti-label">我的星语</span>
                      <span class="ti-sub">· 你挂在这颗星上的专属心事，安放在为你闪烁的星辰下</span>
                    </div>
                  </div>
                  <StoryList
                    :stories="myStories"
                    variant="mine"
                    :resonating="resonating"
                    :showToolbar="false"
                    :emptyIcon="PenSquare"
                    emptyMessage="你还没有在这颗星上写过故事"
                    :renderedContent="(s: any) => renderMarkdown(s.content)"
                    :displayResonance="(s: any) => getDisplayResonance(s)"
                    :displayViews="(s: any) => getStoryViewCount(s.id)"
                    :isResonated="(s: any) => isStoryResonated(s)"
                    :formattedTime="(s: any) => formatTime(s.createdAt)"
                    :formattedDistance="(s: any) => formatDistance(s.locationLat, s.locationLng)"
                    @story-click="openStoryDetail"
                    @resonate="onResonate"
                  />
                </template>
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
              <!-- 任务1：外层顶部栏右侧接管共鸣/删除入口（仅自己的故事显示删除），内层 StoryDetail 传 hide-toolbar 隐藏重复工具栏 -->
              <div class="mobile-story-top-actions">
                <button
                  class="mobile-story-resonate"
                  :class="{ done: isStoryResonated(detailStory) }"
                  :disabled="isStoryResonating(detailStory)"
                  @click.stop="onResonate(detailStory)"
                >
                  <component :is="isStoryResonated(detailStory) ? CheckIcon : SparklesIcon" :size="14" />
                  <span>{{ isStoryResonated(detailStory) ? '已共鸣' : '共鸣' }}</span>
                  <span class="mobile-story-resonate-count">{{ getDisplayResonance(detailStory) }}</span>
                </button>
                <button
                  v-if="detailStory.userId != null && detailStory.userId === currentUserId"
                  class="mobile-story-delete"
                  :disabled="deleting"
                  @click.stop="confirmDelete(detailStory.id)"
                >
                  <Trash2Icon :size="13" />
                  <span>删除</span>
                </button>
              </div>
            </div>
            <div class="mobile-story-detail-body">
              <StoryDetail
                :story="detailStory"
                :backLabel="detailBackLabel"
                :renderedContent="renderMarkdown(detailStory.content)"
                :displayResonance="getDisplayResonance(detailStory)"
                :isResonated="isStoryResonated(detailStory)"
                :resonating="isStoryResonating(detailStory)"
                :deleting="deleting"
                :currentUserId="currentUserId"
                :formattedTime="formatTime(detailStory.createdAt)"
                :formattedDistance="formatDistance(detailStory.locationLat, detailStory.locationLng)"
                :viewCount="getStoryViewCount(detailStory.id)"
                :origin="detailStory.origin ?? null"
                :createdAtIso="detailStory.createdAt"
                :siblingStories="siblingStoriesFor(detailStory)"
                :showStarBelonging="false"
                :hide-toolbar="true"
                @back="detailStoryId = null"
                @resonate="onResonate(detailStory)"
                @delete="confirmDelete(detailStory.id)"
                :collection-clickable="true"
                @collection-click="onCollectionClick"
                @open-story="openStoryDetail"
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

<script setup lang="ts">
import { computed, ref, reactive, onMounted, watch, type Component, toRef, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Star, Sparkles, PenSquare, X, BookOpen, List, User, AlertTriangle, ChevronDown, Eye, Heart, Sparkle, TrendingUp, Clock, Flame, MessageCircle, Trash2, Check } from 'lucide-vue-next'
const SparklesIcon = Sparkles
const EyeIcon = Eye
const HeartIcon = Heart
const SparkleIcon = Sparkle
const TrendingIcon = TrendingUp
const ClockIcon = Clock
const FlameIcon = Flame
const MessageIcon = MessageCircle
const Trash2Icon = Trash2
const CheckIcon = Check
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
import AIPersonaCard from './AIPersonaCard.vue'
import AIRadarWordcloud from './AIRadarWordcloud.vue'
import AIHeatmapThemes from './AIHeatmapThemes.vue'
import { useNarrative } from '../../composables/useNarrative'
import { useKernel } from '../../composables/useKernel'
import { useSimilarStars, type SimilarStar } from '../../composables/useSimilarStars'
import { useAreaHighlights } from '../../composables/useAreaHighlights'
import { useStarAnalysis, type StarAnalysis } from '../../composables/useStarAnalysis'
import { useAstroEvents, formatTime as formatClockTime, formatDateTime, formatAltitude, azimuthToDirection } from '../../composables/useAstroEvents'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { useResonate } from '../../composables/useResonate'
import { constellationNames } from '../../data/starInfo'
import { getStarNameInfo } from '../../utils/starName'
import { marked } from 'marked'

// 摘出故事摘要：纯文本 26 字
function storySummary(content: string): string {
  const text = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 26 ? text.slice(0, 26) + '…' : text
}

/** 开放标签 hash 染色：字符串 → 稳定 HSL 柔和色 */
function _tagHashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return h
}
/** 故事卡片 story-tag 的染色（用在 userStories / top 卡片内） */
function storyTagStyle(tag: string): Record<string, string> {
  const h = Math.abs(_tagHashCode(tag)) % 360
  const color = `hsl(${h} 62% 74%)`
  const border = `hsla(${h}, 62%, 74%, 0.22)`
  const bg = `hsla(${h}, 62%, 74%, 0.06)`
  return {
    color,
    backgroundColor: bg,
    borderColor: border,
    border: '0.5px solid ' + border,
  }
}
/** 标签展示数组：优先 tags[]，空时退回 tag 单列（老数据兼容），最多 5 条、去重 */
function storyDisplayTags(s: { tag?: string | null; tags?: string[] | null } | null | undefined): string[] {
  if (!s) return []
  const arr = Array.isArray(s.tags) ? s.tags.filter((t) => !!t && typeof t === 'string') : []
  if (arr.length) return Array.from(new Set(arr)).slice(0, 5)
  return s.tag ? [s.tag] : []
}
/** Star 详情展示区的标签（type = emotion/theme/custom 都用） */
function infoTagStyle(tag: string, type: 'emotion' | 'theme' | 'custom'): Record<string, string> {
  if (type === 'custom') {
    // custom：沿用故事 tag 的颜色
    const h = Math.abs(_tagHashCode(tag)) % 360
    const color = `hsl(${h} 62% 74%)`
    return {
      color,
      borderColor: `hsla(${h}, 62%, 74%, 0.26)`,
      backgroundColor: `hsla(${h}, 62%, 74%, 0.06)`,
    }
  }
  // emotion/theme：统一用原设计（金/紫弱区），不做强染色，保持 StarDetail 原有味道
  if (type === 'emotion') {
    return { color: '#ffe5a8', borderColor: 'rgba(255,217,138,0.22)', backgroundColor: 'rgba(255,217,138,0.05)' }
  }
  return { color: '#d9c6ff', borderColor: 'rgba(202,167,255,0.22)', backgroundColor: 'rgba(202,167,255,0.05)' }
}
import DOMPurify from 'dompurify'
marked.setOptions({ breaks: true, gfm: true })

const { isMobile } = useMediaQuery()

// ─── 共鸣（useResonate） ───
const {
  resonate: doResonate,
  resonatingId: resonatingStoryId,
  lastError: resonateError,
  isResonated: resonatedInClient,
  syncFromServerRows,
} = useResonate()
/**
 * 合并两种「已共鸣」来源：
 *  1) 后端响应里的 `story.resonated`（登录用户拉取列表时一次性注入，跨设备可靠）；
 *  2) 前端 useResonate 的 resonatedIds（本会话共鸣后立即生效、未登录 localStorage 缓存）。
 * 任一 true 就视为「已共鸣」，按钮显示"已共鸣"且禁用。
 */
function isStoryResonated(story: { id: number; resonated?: boolean } | null | undefined): boolean {
  if (!story) return false
  return resonatedInClient(story.id) || !!story.resonated
}
/** 共鸣按钮 loading：useResonate resonatingId 匹配（优先级高）+ 父级老 resonating prop（兼容） */
function isStoryResonating(story: { id: number } | null | undefined): boolean {
  if (!story) return false
  return resonatingStoryId.value === story.id || props.resonating
}

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
    handleClose()
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
    collectionId?: number | null
    collectionName?: string | null
    collectionCoverColor?: string | null
    collectionVisibility?: string | null
    collectionStoryCount?: number | null
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
  /** PC 端行星特写模式（selectedCatalogStarId < 0 且 PC 端）：点击 overlay 空白进入观察模式而非关闭 */
  isPlanetCloseup?: boolean
  /** 观察模式：隐藏故事面板和模糊背景，露出 3D 行星特写供用户观察 */
  observeMode?: boolean
  /**
   * 外部强制打开某则故事的详情页（v-model:targetStoryId）。
   * - 父级设置为某 story.id → 本组件自动：
   *   ① 在 realStories 中找到该 story；
   *   ② 根据 type 切换到对应 Tab（history→history，其余→all）；
   *   ③ 切 Tab 完成后打开 StoryDetail 页面（等价于用户点击该故事卡片）；
   *   ④ 完成后 emit('update:targetStoryId', null) 让父级清零，避免下次同值不触发 watch。
   * - 找不到或传 null 时不会产生任何动作。
   */
  targetStoryId?: number | null
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
  updateSimilarStars: [stars: SimilarStar[]]
  deleteStory: [storyId: number]
  /** 故事集合或权重发生了实质变动 → 父级可用于通知 SkyPage 做跨星同步
   *  kind: 'new' | 'delete' | 'resonate' | 'kernel-edit'
   */
  storiesMutated: [kind: 'new' | 'delete' | 'resonate' | 'kernel-edit']
  /** PC 端行星特写：点击 overlay 空白切换观察模式（隐藏故事面板露出行星） */
  toggleObserve: []
  /** 合集徽章点击：透传合集信息给父组件，由父组件决定如何展示合集内所有故事 */
  'collection-click': [data: { collectionId: number; collectionName: string | null; userId: number | null }]
  /** 配合 props.targetStoryId 做 v-model 双向绑定：消费完 targetStoryId 后 emit 给父级清零 */
  'update:targetStoryId': [id: number | null]
}>()

// 列表/详情 props.stories 更新时：同步后端 resonated=true 的故事 id 到本地 resonatedIds
// （放在 defineProps 之后，避免 setup 阶段访问未初始化的 props）
watch(
  () => props.stories,
  (list) => {
    if (Array.isArray(list)) syncFromServerRows(list)
  },
  { immediate: true, deep: false }
)

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

// 共鸣榜 Top 3（所有故事按共鸣数倒序）
const topResonatedStories = computed(() => {
  return [...realStories.value]
    .sort((a, b) => getDisplayResonance(b) - getDisplayResonance(a))
    .slice(0, 3)
})

// 最新 3 条（按 createdAt 倒序）
const latestStories = computed(() => {
  return [...realStories.value]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
})

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

/** 同星其他故事推荐：按 catalogStarId 匹配（共享任一归属星视为同星），最多返回 4 条预览 */
import type { SiblingStoryPreview } from './StoryDetail.vue'
function siblingStoriesFor(story: any): SiblingStoryPreview[] {
  if (!story?.id) return []
  const ownIds = new Set<number>()
  if (typeof story.catalogStarId === 'number' && story.catalogStarId !== 0) ownIds.add(story.catalogStarId)
  if (Array.isArray(story.catalogStarIds)) {
    for (const n of story.catalogStarIds) if (typeof n === 'number' && n !== 0) ownIds.add(n)
  }
  const sharesStar = (s: any): boolean => {
    if (s.id === story.id) return false
    if (ownIds.size === 0) return false
    if (typeof s.catalogStarId === 'number' && ownIds.has(s.catalogStarId)) return true
    if (Array.isArray(s.catalogStarIds)) {
      for (const n of s.catalogStarIds) if (typeof n === 'number' && ownIds.has(n)) return true
    }
    return false
  }
  const pool = realStories.value.filter(sharesStar)
    .sort((a, b) => (b.resonanceCount ?? 0) - (a.resonanceCount ?? 0))
    .slice(0, 4)
  return pool.map<SiblingStoryPreview>((s: any) => ({
    id: s.id,
    title: s.title ?? null,
    type: s.type === 'history' ? 'history' : 'user',
    isNew: !!s.isNew,
    resonanceCount: s.resonanceCount ?? 0,
    viewCount: s.viewCount ?? 0,
    contentPreview: ((s.content ?? '').replace(/\s+/g, ' ').slice(0, 60)),
  }))
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
  { id: 'narrative', label: '星语AI', icon: Sparkles },
  { id: 'history', label: '星史长卷', icon: BookOpen },
  { id: 'all', label: '故事广场', icon: List },
  { id: 'mine', label: '我的星语', icon: User },
]
// 移动端：包含「星信息」，下拉框使用罗马数字前缀（与设置弹窗风格一致）
const mobileTabs: { id: TabId; label: string; roman: string; icon: Component }[] = [
  { id: 'info', label: '星辰档案', roman: 'Ⅰ', icon: Star },
  { id: 'narrative', label: '星语AI', roman: 'Ⅱ', icon: Sparkles },
  { id: 'history', label: '星史长卷', roman: 'Ⅲ', icon: BookOpen },
  { id: 'all', label: '故事广场', roman: 'Ⅳ', icon: List },
  { id: 'mine', label: '我的星语', roman: 'Ⅴ', icon: User },
]
// 初始化时同步判断移动端（useMediaQuery 在 onMounted 才生效，不能用）
const isMobileInit = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
const activeTab = ref<TabId>(isMobileInit ? 'info' : 'narrative')

const detailBackLabel = computed(() => {
  switch (activeTab.value) {
    case 'history': return '星史长卷'
    case 'all': return '故事广场'
    case 'mine': return '我的星语'
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

/** 叙事请求去重：同一颗星最多拉一次；若首拉时还没有定位，等定位回调到达后再补拉一次带位置的请求 */
let narrativeFetched = false
let narrativeFetchedWithPosition = false

function fetchNarrativeWithPosition() {
  if (!props.catalogStarId) return
  const lat = props.observerLat ?? userPosition.value?.lat
  const lng = props.observerLng ?? userPosition.value?.lng
  const hasPosition = lat != null && lng != null
  // 已拉过：带定位的请求不重复；之前无定位而这次有定位，允许补拉一次
  if (narrativeFetched && (narrativeFetchedWithPosition || !hasPosition)) return
  narrativeFetched = true
  if (hasPosition) narrativeFetchedWithPosition = true
  narrative.reset()
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
  narrativeFetched = false
  narrativeFetchedWithPosition = false
  if (id && (positionReady.value || props.observerLat != null)) {
    fetchNarrativeWithPosition()
  }
}, { immediate: true })

watch(activeTab, () => {
  detailStoryId.value = null
})

// ─── 外部驱动：打开指定 storyId 的详情页（支持父级 v-model:targetStoryId）───
/**
 * 执行顺序（关键：必须等 activeTab 切换的 watch 把 detailStoryId=null 跑完之后再赋值）：
 *  1. 定位到 targetStoryId 对应的 story；
 *  2. 切 Tab：history 类 → activeTab='history'，其他（用户故事）→ activeTab='all'；
 *  3. nextTick 等 activeTab 的 watch 清空 detailStoryId 后；
 *  4. 设置 detailStoryId.value = targetStoryId → StoryDetail 页面展示；
 *  5. emit('update:targetStoryId', null) 让父级清零，避免下次传同样 id watch 不触发。
 */
watch(
  () => props.targetStoryId,
  async (id) => {
    if (id == null) return
    const target = realStories.value.find(s => s.id === id)
    if (!target) {
      emit('update:targetStoryId', null)
      return
    }
    const needTab: TabId = target.type === 'history' ? 'history' : 'all'
    if (activeTab.value !== needTab) {
      activeTab.value = needTab
    }
    await nextTick()
    detailStoryId.value = id
    emit('update:targetStoryId', null)
  },
  { flush: 'post' }
)

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
  emit('updateSimilarStars', stars || [])
})

// ─── 天区故事精选 ───
const areaHighlights = useAreaHighlights(() => props.catalogStarId)
const { highlights: areaHighlightsData, loading: areaLoading } = areaHighlights

// ─── AI 预生成分析（persona/emotion/themehour） ───
const catalogStarIdRef = toRef(props, 'catalogStarId')
const catalogStarIdNullable = computed<number | null>(() => catalogStarIdRef.value ?? null)
const starAnalysis = useStarAnalysis(catalogStarIdNullable)

/**
 * 触发一次 AI 分析"就地刷新"：
 *  - reset() 清除缓存 ready 标记
 *  - fetchAnalysis() 立即拉一次并自动启动 3s × 20 次的 ready 轮询
 * 所有会改变 catalog 级故事集合/权重分布的动作都应调用：新增故事 / 删除故事 / 共鸣成功 / 内核被用户修改
 */
function retriggerStarAnalysis() {
  starAnalysis.reset()
  if (catalogStarIdNullable.value) {
    starAnalysis.fetchAnalysis()
  }
}

// 从 persona 返回里取 updatedAt 文案（用服务端生成时间）
const analysisUpdatedText = computed(() => {
  const t = starAnalysis.analysis.value?.generatedAt
  if (!t) return undefined
  const diff = Date.now() - t
  if (diff < 60 * 1000) return '刚刚生成'
  if (diff < 3600 * 1000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400 * 1000) return `${Math.floor(diff / 3600000)} 小时前`
  return new Date(t).toLocaleDateString('zh-CN')
})
// 传递给所有 AI 子卡的"ready 信号"：子卡用它判断"骨架是否还能一直转"，避免 ready=true 但卡片仍显示"生成中"
const analysisReady = computed(() => starAnalysis.analysis.value?.ready ?? false)

// 星名/元信息查找走共享工具（合并 stars.json 恒星 + planets.ts 行星），修复行星显示「恒星 #-100」(issue #135)
function getStarName(catalogStarId: number): string {
  const info = getStarNameInfo(catalogStarId)
  return info?.name || `恒星 #${catalogStarId}`
}
function getStarColor(catalogStarId: number): string {
  return getStarNameInfo(catalogStarId)?.color || '#ffd98a'
}
function getConstellationName(catalogStarId: number): string {
  const con = getStarNameInfo(catalogStarId)?.con
  if (!con) return ''
  return constellationNames[con] || con
}
const currentStarName = computed(() => getStarName(props.catalogStarId))
const currentConstellation = computed(() => getConstellationName(props.catalogStarId))
function onSimilarStarClick(catalogStarId: number) {
  // 跳转新星星：直接 emit('close') 让父组件卸载当前 StarDetail，新 StarDetail 挂载时有 enter 动画
  emit('close')
  window.dispatchEvent(new CustomEvent('fly-to-star', { detail: { catalogStarId } }))
}

// ─── 抽屉动画控制：内部 show 状态触发 enter/leave ───
const show = ref(false)
function handleClose() {
  show.value = false
}

onMounted(() => {
  nextTick(() => { show.value = true })
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

async function onResonate(story: { id: number; resonanceCount: number }) {
  if (guestGuard()) return
  if (isStoryResonated(story)) return // 已共鸣的按钮已经 disabled，这里二次兜底
  const before = getDisplayResonance(story)
  // 乐观 +1；失败再回滚
  resonanceOverrides.set(story.id, before + 1)
  const result = await doResonate(story.id)
  if (result.ok) {
    emit('resonate', story.id)
    emit('storiesMutated', 'resonate')
    // 成功：保留乐观更新；如果返回了真实 resonanceCount，直接对齐
    if (result.resonanceCount >= 0) resonanceOverrides.set(story.id, result.resonanceCount)
    // 共鸣改变故事权重分布 → 通知 composable 重置轮询，等后端异步重新生成完（15s debounce + 串行）就地刷新
    retriggerStarAnalysis()
  } else {
    // 失败：回滚乐观更新；如果是 unauthorized / 401，useResonate 已自动写入本地 resonatedIds 并提示
    resonanceOverrides.set(story.id, before)
    if (result.status !== 'unauthorized') {
      // 401 已经在 useResonate 里 set 了 lastError，不重复 alert
      if (result.message) alert(result.message)
    }
  }
}
// 把 useResonate lastError 暴露给可能的 UI 使用（目前不强制渲染 UI，保持静默）
watch(resonateError, () => { /* 预留：将来想在组件内显示 toast 时用 */ })

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
      emit('storiesMutated', 'delete')
      showDeleteConfirm.value = false
      deletingStoryId.value = null
      detailStoryId.value = null
      // 删除改变故事集合 → 立即重新拉 analysis + 启动 ready 轮询
      retriggerStarAnalysis()
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

function openStoryDetail(input: { id: number } | number) {
  const id: number = typeof input === 'number' ? input : input.id
  detailStoryId.value = id
  const current = getStoryViewCount(id)
  viewCountOverrides.set(id, current + 1)
  emit('incrementViews')
  fetch(`/api/stories/${id}/view`, { method: 'POST' })
    .then(() => emit('refreshStories'))
    .catch(() => {
      viewCountOverrides.set(id, current)
    })
}

/**
 * 合集徽章点击：透传合集信息给父组件（SkyPage）。
 * 具体的合集详情视图由父组件决定如何展示（弹窗/路由跳转）
 */
function onCollectionClick(story: any) {
  if (story?.collectionId != null) {
    emit('collection-click', {
      collectionId: story.collectionId,
      collectionName: story.collectionName ?? null,
      userId: story.userId ?? null,
    })
  }
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

/* ─── 观察模式（PC 端行星特写）：移除模糊背景，overlay 透传事件让 3D 画布接收滚轮/拖拽 ─── */
/* 「返回」按钮通过自己的 pointer-events: auto 保持可点击 */
.overlay.observe-mode {
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  pointer-events: none;
}

/* ─── PC 端行星特写 · 观察/返回按钮（issue #136）─── */
/* 灰色 + 透明风格，与现有 close-btn 等按钮保持一致 */
.observe-toggle-btn {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 28px;
  background: rgba(80, 84, 100, 0.35);
  border: 1px solid rgba(180, 185, 200, 0.25);
  border-radius: var(--radius-sm);
  color: rgba(220, 222, 230, 0.85);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 101;
  pointer-events: auto;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
.observe-toggle-btn:hover {
  background: rgba(100, 105, 122, 0.5);
  border-color: rgba(200, 205, 220, 0.4);
  color: rgba(240, 242, 248, 0.95);
}

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

/* ─── AI 叙事 Tab 布局：上部叙事 + 下部两栏面板（整体滚动） ─── */
.narrative-layout {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.narrative-top {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
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
  gap: 12px;
  padding: 20px 28px 22px;
  margin-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  flex-shrink: 0;
}
.narrative-bottom > * {
  height: auto;
  min-height: 0;
}

/* ─── 两面板外层统一套框（与 AI 分析卡风格对齐） ─── */
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
  height: 300px;
  min-height: 0;
}
.panel-wrapper::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
}
.pw-left::before {
  background: linear-gradient(90deg, transparent, rgba(255,217,138,0.4), transparent);
}
.pw-right::before {
  background: linear-gradient(90deg, transparent, rgba(202,167,255,0.4), transparent);
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.pw-icon { opacity: 0.85; flex-shrink: 0; }
.pw-gold { color: #ffd98a; }
.pw-purple { color: #caa7ff; }
.pw-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
}
.pw-count {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.22);
  letter-spacing: 0.03em;
}

/* ─── 共鸣榜/最新心事下沉后的样式 ─── */
.story-section-bottom {
  margin: 0 28px 22px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
.story-section-bottom:last-child { margin-bottom: 24px; }

/* 左栏宽度不足时，双面板收为上下排列 */
@media (max-width: 1050px) {
  .narrative-bottom {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .story-section-bottom {
    margin: 0 18px 20px;
  }
  .narrative-bottom {
    padding: 16px 18px 18px;
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

/* ─── A. 星语数据条 ─── */
.story-stats-bar {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  padding: 14px 18px;
  margin: 0 28px 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  gap: 8px;
}
.stat-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.stat-icon {
  flex-shrink: 0;
  opacity: 0.85;
}
.stat-icon-eye { color: #86a8ff; }
.stat-icon-story { color: #ffd98a; }
.stat-icon-heart { color: #ff8b7d; }
.stat-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-num {
  font-size: 0.98rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -0.01em;
}
.stat-label {
  font-size: 0.64rem;
  color: rgba(255, 255, 255, 0.32);
  letter-spacing: 0.03em;
}
.stat-divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 2px 0;
}

/* ─── 故事通用 Section ─── */
.story-section {
  margin: 0 28px 22px;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 10px;
}
.section-icon {
  flex-shrink: 0;
  opacity: 0.8;
}
.section-icon-orange { color: #ffa968; }
.section-icon-blue { color: #86a8ff; }
.section-title {
  font-size: 0.84rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.78);
  flex: 1;
  letter-spacing: 0.02em;
}
.section-count {
  font-size: 0.66rem;
  color: rgba(255, 255, 255, 0.25);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}
.section-more {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
  transition: background 0.15s;
}
.section-more:hover {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.55);
}

/* ─── 故事卡片列表 ─── */
.story-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.story-card {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;
}
.story-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}
.story-card-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
}
.card-rank {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.4);
  font-variant-numeric: tabular-nums;
  margin-top: 1px;
}
.card-rank.rank-1 {
  background: linear-gradient(135deg, rgba(255, 196, 100, 0.25), rgba(255, 154, 80, 0.08));
  color: #ffc464;
  box-shadow: 0 0 8px rgba(255, 196, 100, 0.15);
}
.card-rank.rank-2 {
  background: linear-gradient(135deg, rgba(200, 210, 230, 0.22), rgba(200, 210, 230, 0.06));
  color: #c8d2e6;
}
.card-rank.rank-3 {
  background: linear-gradient(135deg, rgba(220, 170, 130, 0.2), rgba(220, 170, 130, 0.06));
  color: #dcaa82;
}
.story-card .card-body {
  flex: 1;
  min-width: 0;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 7px;
}
.card-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}
.card-user {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.user-name {
  font-size: 0.74rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.1;
}
.user-time {
  font-size: 0.62rem;
  color: rgba(255, 255, 255, 0.24);
  letter-spacing: 0.02em;
}
.card-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.35;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-summary {
  font-size: 0.74rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.48);
  margin-bottom: 7px;
}
.card-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.64rem;
  color: rgba(255, 255, 255, 0.3);
  flex-wrap: wrap;
}
.meta-sep {
  opacity: 0.4;
}
.meta-user {
  color: rgba(255, 255, 255, 0.35);
}
/* 卡片标签区：正文下方 / meta 上方，上下虚线分隔更紧凑 */
.card-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 7px;
  margin-top: 5px;
  margin-bottom: 5px;
  padding: 5px 1px;
  border-top: 0.5px dashed var(--rule);
  border-bottom: 0.5px dashed var(--rule);
}
/* meta 行内嵌式标签（向后兼容但不作为默认视觉） */
.card-tags-inline {
  /* 复用默认 card-tags 样式，不额外覆盖 */
}
/* story-tag 基础形态：彩色胶囊 + 内描边 0.5px + 色值来自 storyTagStyle() */
.story-tag {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 11px;
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.45;
  transition: transform .15s ease, filter .15s ease;
}
.story-tag:hover {
  filter: brightness(1.06);
  transform: translateY(-0.3px);
}
.story-tag-inline:first-child { margin-left: 0; }

@media (max-width: 768px) {
  .story-stats-bar {
    margin: 0 18px 18px;
    padding: 12px 14px;
  }
  .stat-num {
    font-size: 0.9rem;
  }
  .story-section {
    margin: 0 18px 20px;
  }
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
  background: rgba(7, 8, 22, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

/* ─── Mobile Sheet（对齐 SettingsModal 风格） ─── */
.mobile-sheet {
  width: 100%;
  max-width: 500px;
  background: var(--surface);
  border: 1px solid var(--rule);
  /* 顶部金色边框（与罗马数字同色） */
  border-top: 5px solid var(--accent);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  box-shadow: 0 -16px 48px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font);
  color: var(--ink);
}

/* 拖拽时高度变化才需要过渡，enter/leave 用 transform 过渡避免冲突 */
.mobile-sheet.dragging {
  transition: height 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  will-change: height;
}

/* ─── Drag Handle（金色拖拽杠，与设置弹窗风格一致） ─── */
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
.mobile-handle:active::after {
  background: var(--accent);
}

/* ─── Mobile Top Bar ─── */
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
  padding: 16px 18px;
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

/* ─── 任务1：移动端故事详情顶部栏右侧 · 共鸣/删除按钮（对齐 StoryDetail 内按钮风格的小号版） ─── */
.mobile-story-top-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.mobile-story-resonate {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  background: var(--accent-subtle);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-family: var(--font);
  font-size: 0.74rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition-fast), opacity var(--transition-fast);
}
.mobile-story-resonate.done {
  border-color: rgba(149, 240, 192, 0.25);
  background: rgba(149, 240, 192, 0.08);
  color: var(--star-green);
}
.mobile-story-resonate:disabled {
  opacity: 0.6;
  cursor: wait;
}
.mobile-story-resonate-count {
  opacity: 0.65;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}
.mobile-story-delete {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: 1px solid rgba(255, 107, 138, 0.25);
  color: #ff6b8a;
  font-family: var(--font);
  font-size: 0.74rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}
.mobile-story-delete:hover:not(:disabled) {
  background: rgba(255, 107, 138, 0.08);
  border-color: rgba(255, 107, 138, 0.4);
}
.mobile-story-delete:disabled {
  opacity: 0.5;
  cursor: wait;
}

.mobile-story-detail-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0 16px 16px;
}

/* ─── Mobile Transitions ─── */
.mobile-sheet-fade-enter-active {
  transition: opacity 0.25s ease;
}
.mobile-sheet-fade-enter-active .mobile-sheet {
  transition: transform 0.36s cubic-bezier(0.32, 0.72, 0, 1);
}
.mobile-sheet-fade-leave-active {
  transition: opacity 0.22s ease;
}
.mobile-sheet-fade-leave-active .mobile-sheet {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
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

/* ─── PC Transitions ─── */
.pc-detail-fade-enter-active {
  transition: opacity 0.25s ease;
}
.pc-detail-fade-enter-active .detail-wrap {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.pc-detail-fade-leave-active {
  transition: opacity 0.2s ease;
}
.pc-detail-fade-leave-active .detail-wrap {
  transition: transform 0.2s ease-in;
}
.pc-detail-fade-enter-from,
.pc-detail-fade-leave-to {
  opacity: 0;
}
.pc-detail-fade-enter-from .detail-wrap,
.pc-detail-fade-leave-to .detail-wrap {
  transform: scale(0.95) translateY(16px);
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

/* ═══════════════════ Tab 引导条（仿 ca-hero-strip 风格） ═══════════════════ */
.tab-intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  margin: 14px 28px 16px;
  border-radius: 10px;
  flex-shrink: 0;
  /* 默认金紫渐变（星语AI），其他 Tab 下方覆盖 */
  background: linear-gradient(135deg, rgba(255, 217, 138, 0.06), rgba(202, 167, 255, 0.04));
  border: 1px solid rgba(255, 217, 138, 0.12);
}
.ti-left {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  flex: 1;
}
/* 图标：统一 opacity，颜色按 Tab 主题色覆盖 */
.ti-icon { flex-shrink: 0; opacity: 0.9; }
/* 主标签（Tab 名）：仿 ca-hero-label 风格 */
.ti-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.02em;
  flex-shrink: 0;
}
/* 副标签（引导说明）：仿 ca-hero-sub 风格 */
.ti-sub {
  font-size: 0.68rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}

/* ─── Tab 专属渐变 & 边框 & 图标配色 ─── */
/* ① 星语AI：金紫斜向渐变（即默认，再显式声明一次确保） */
.tab-intro-narrative {
  background: linear-gradient(135deg, rgba(255, 217, 138, 0.07), rgba(202, 167, 255, 0.035));
  border-color: rgba(255, 217, 138, 0.14);
}
.tab-intro-narrative .ti-icon { color: #ffd98a; }
/* ② 星史长卷：紫青斜向渐变 */
.tab-intro-history {
  background: linear-gradient(135deg, rgba(202, 167, 255, 0.07), rgba(127, 212, 224, 0.03));
  border-color: rgba(202, 167, 255, 0.15);
}
.tab-intro-history .ti-icon { color: #caa7ff; }
/* ③ 故事广场：蓝青斜向渐变 */
.tab-intro-all {
  background: linear-gradient(135deg, rgba(134, 168, 255, 0.07), rgba(127, 212, 224, 0.03));
  border-color: rgba(134, 168, 255, 0.15);
}
.tab-intro-all .ti-icon { color: #86a8ff; }
/* ④ 我的星语：玫瑰橙斜向渐变 */
.tab-intro-mine {
  background: linear-gradient(135deg, rgba(255, 163, 180, 0.07), rgba(255, 184, 119, 0.03));
  border-color: rgba(255, 163, 180, 0.15);
}
.tab-intro-mine .ti-icon { color: #ffa3b4; }
/* ⑤ 星辰档案：银蓝斜向渐变 */
.tab-intro-info {
  background: linear-gradient(135deg, rgba(198, 208, 228, 0.065), rgba(134, 168, 255, 0.03));
  border-color: rgba(198, 208, 228, 0.14);
}
.tab-intro-info .ti-icon { color: #c6d0e4; }

/* ─── 移动端 Tab 引导条 ─── */
@media (max-width: 768px) {
  .tab-intro.mobile-ti {
    margin: 12px 18px 14px;
    padding: 7px 12px;
  }
  .tab-intro.mobile-ti .ti-left {
    gap: 6px;
  }
  .tab-intro.mobile-ti .ti-label {
    font-size: 0.74rem;
  }
  .tab-intro.mobile-ti .ti-sub {
    font-size: 0.64rem;
  }
  /* 移动端星语AI：在 narrative-layout 内去圆角/侧边框做无缝衔接 */
  .mobile-narrative-layout > .tab-intro {
    margin: 0 0 10px;
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-top: none;
  }
}
</style>