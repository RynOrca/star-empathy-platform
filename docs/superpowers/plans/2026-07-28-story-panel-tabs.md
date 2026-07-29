# Issue #59: 点击星星后，故事面板改为 4 个 Tab 分区展示 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 StarDetail.vue 左侧面板从"叙事/故事"二态切换改为 4 个 Tab 分区（AI 叙事、历史故事、所有故事、我的故事），解决不同类型内容混在一起的问题。

**Architecture:** 仅修改 `client/src/components/StarDetail.vue`，将 `viewMode` 二态切换替换为 `activeTab` 四态 Tab 栏。所有数据筛选通过 `computed` 从 `props.stories` 中按 `type` / `userId` 完成，无需后端改动。同时移除 SkyPage 中冗余的 `showMyStoriesOnly` 全局开关。

**Tech Stack:** Vue 3 + Composition API + `<script setup>`，lucide-vue-next 图标库，CSS 变量主题系统

**设计方向:** 星轨导航式 Tab 栏 — 4 个 Tab 像星图上不同观测视角的切换按钮，使用细线分隔 + 点状激活指示器，保持暗色星空主题的一致性。激活态使用金色微光（`var(--accent)`），非激活态使用半透明文字。Tab 栏融入星空面板顶部，不喧宾夺主。

**关联 Issue:** https://github.com/RynOrca/star-empathy-platform/issues/59

---

## 文件结构

| 文件 | 操作 | 职责 |
|---|---|---|
| `client/src/components/StarDetail.vue` | 修改 | 核心：Tab 栏 UI + 4 个 Tab 内容区 + 数据筛选 computed |
| `client/src/pages/SkyPage.vue` | 修改 | 保留 `showMyStoriesOnly`（3D 星图空间可视化），但打开 StarDetail 时传递完整 stories 数据 |

---

### Task 1: 添加 Tab 栏 UI 和 activeTab 状态

**Files:**
- Modify: `client/src/components/StarDetail.vue`

- [ ] **Step 1: 替换 viewMode 为 activeTab，添加 Tab 类型定义**

在 `<script setup>` 中，将：

```ts
const viewMode = ref<'narrative' | 'stories'>('narrative')
```

改为：

```ts
type TabId = 'narrative' | 'history' | 'all' | 'mine'
const tabs: { id: TabId; label: string; icon: any }[] = [
  { id: 'narrative', label: 'AI 叙事', icon: Sparkles },
  { id: 'history', label: '历史故事', icon: BookOpen },
  { id: 'all', label: '所有故事', icon: List },
  { id: 'mine', label: '我的故事', icon: User },
]
const activeTab = ref<TabId>('narrative')
```

需要新增导入 `List` 和 `User` 图标（`User` 已在 import 中）。

- [ ] **Step 2: 在左侧面板顶部插入 Tab 栏 HTML**

在 `.panel-stories` 内部，`<template v-if="viewMode === 'narrative'">` 之前，替换为 Tab 栏结构：

```html
<!-- Tab 栏 -->
<div class="tab-bar">
  <button
    v-for="tab in tabs"
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
  <!-- Tab 1: AI 叙事 -->
  <template v-if="activeTab === 'narrative'">
    ... (现有叙事内容)
  </template>

  <!-- Tab 2: 历史故事 -->
  <template v-else-if="activeTab === 'history'">
    ... (历史故事列表)
  </template>

  <!-- Tab 3: 所有故事 -->
  <template v-else-if="activeTab === 'all'">
    ... (所有故事列表 + 搜索/排序)
  </template>

  <!-- Tab 4: 我的故事 -->
  <template v-else-if="activeTab === 'mine'">
    ... (我的故事列表)
  </template>
</div>
```

- [ ] **Step 3: 添加 Tab 栏 CSS 样式**

在 `<style scoped>` 中添加：

```css
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
.tab-btn:hover {
  color: var(--ink-secondary);
}
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
```

- [ ] **Step 4: 验证 Tab 栏渲染**

```bash
cd client && npm run dev
```

预期：打开页面点击星星，左侧面板顶部出现 4 个 Tab 按钮，点击可切换（内容区暂未实现）。

- [ ] **Step 5: Commit**

```bash
git add client/src/components/StarDetail.vue
git commit -m "feat: 添加 4 个 Tab 栏 UI 框架，替换 viewMode 二态切换"
```

---

### Task 2: 实现 Tab 1 — AI 叙事（默认 Tab）

**Files:**
- Modify: `client/src/components/StarDetail.vue`

- [ ] **Step 1: 迁移现有叙事内容到 Tab 1**

将现有的 `<template v-if="viewMode === 'narrative'">` 区块内的 `StarNarrative` 组件和底部"关于这颗星星的故事..."入口按钮，迁移到 `activeTab === 'narrative'` 的 `<template>` 中。

```html
<template v-if="activeTab === 'narrative'">
  <!-- 古今共望叙事 -->
  <StarNarrative
    :content="narrative.content.value"
    :loading="narrative.loading.value"
    :error="narrative.error.value"
    :cached="narrative.cached.value"
    @retry="narrative.fetchNarrative(catalogStarId)"
  />

  <!-- 跳转到其他 Tab 的快捷入口 -->
  <div class="narrative-quick-links">
    <button class="quick-link-btn" @click="activeTab = 'history'">
      <BookOpen :size="14" />
      <span>查看历史故事</span>
      <span class="quick-link-badge" v-if="historyStories.length > 0">{{ historyStories.length }}条</span>
    </button>
    <button class="quick-link-btn" @click="activeTab = 'all'">
      <List :size="14" />
      <span>浏览所有故事</span>
      <span class="quick-link-badge" v-if="userStories.length > 0">{{ userStories.length }}条</span>
    </button>
  </div>
</template>
```

- [ ] **Step 2: 添加快捷入口 CSS**

```css
/* ─── Narrative Quick Links ─── */
.narrative-quick-links {
  display: flex;
  flex-direction: column;
  gap: 1px;
  border-top: 1px solid var(--rule);
  margin-top: auto;
  flex-shrink: 0;
}
.quick-link-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.015);
  border: none;
  color: var(--ink-secondary);
  font-family: var(--font);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  text-align: left;
}
.quick-link-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--ink);
}
.quick-link-badge {
  margin-left: auto;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--muted-light);
}
```

- [ ] **Step 3: 验证 Tab 1 功能**

预期：默认显示 AI 叙事，底部有 2 个快捷入口按钮可跳转到其他 Tab。

- [ ] **Step 4: Commit**

```bash
git add client/src/components/StarDetail.vue
git commit -m "feat: 实现 Tab 1 AI 叙事，添加快捷入口跳转按钮"
```

---

### Task 3: 实现 Tab 2 — 历史故事

**Files:**
- Modify: `client/src/components/StarDetail.vue`

- [ ] **Step 1: 添加历史故事筛选 computed**

在 `<script setup>` 中添加：

```ts
// 历史故事（星河种子数据）
const historyStories = computed(() =>
  realStories.value.filter(s => s.type === 'history')
)

// 用户投递的故事（非历史）
const userStories = computed(() =>
  realStories.value.filter(s => s.type !== 'history')
)

// 我的故事（当前登录用户写的）
const myStories = computed(() =>
  realStories.value.filter(s => s.userId != null && s.userId === props.currentUserId)
)
```

- [ ] **Step 2: 添加 Tab 2 模板**

```html
<template v-else-if="activeTab === 'history'">
  <div v-if="historyStories.length > 0" class="story-list">
    <div
      v-for="(story, index) in historyStories"
      :key="story.id"
      class="story-card"
      :style="{ animationDelay: `${index * 30}ms` }"
      @click="openStoryDetail(story)"
    >
      <div class="story-head">
        <h4 class="story-title">{{ story.title || '星河传说' }}</h4>
        <span v-if="story.origin" class="story-origin">{{ story.origin }}</span>
      </div>
      <p class="story-excerpt">{{ story.content }}</p>
      <div class="story-meta">
        <span class="meta-history">来自星河</span>
        <span class="meta-sep">·</span>
        <Sparkles :size="12" /> <span>{{ getDisplayResonance(story) }}</span>
        <span class="meta-sep">·</span>
        <Eye :size="11" /> <span>{{ getStoryViewCount(story.id) }}</span>
      </div>
    </div>
  </div>
  <div v-else class="empty-state">
    <BookOpen :size="20" class="empty-icon" />
    <p>这颗星还没有历史故事</p>
  </div>
</template>
```

- [ ] **Step 3: 添加 story-origin CSS**

```css
.story-origin {
  font-size: 0.7rem;
  color: var(--star-purple);
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(202, 167, 255, 0.08);
  flex-shrink: 0;
}
```

- [ ] **Step 4: 验证 Tab 2**

预期：切换到"历史故事"Tab，显示 `type === 'history'` 的故事，带有"来自星河"标签和来源注释。

- [ ] **Step 5: Commit**

```bash
git add client/src/components/StarDetail.vue
git commit -m "feat: 实现 Tab 2 历史故事，按 type 筛选星河种子数据"
```

---

### Task 4: 实现 Tab 3 — 所有故事（含搜索 + 排序）

**Files:**
- Modify: `client/src/components/StarDetail.vue`

- [ ] **Step 1: 调整搜索/排序数据源为 userStories**

将现有的 `filteredStories` computed 改为基于 `userStories`（排除历史故事）：

```ts
const filteredStories = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return userStories.value
  return userStories.value.filter(s =>
    (s.title || '').toLowerCase().includes(q) ||
    s.content.toLowerCase().includes(q)
  )
})
```

同时更新 `displayedStories` computed，移除历史故事置顶逻辑（因为 Tab 3 不再包含历史故事）：

```ts
const displayedStories = computed(() => {
  const sortFn = getSortFn(sortKey.value)
  return [...filteredStories.value].sort(sortFn)
})
```

- [ ] **Step 2: 更新 hasRealStory 为基于 userStories**

```ts
const hasUserStory = computed(() => userStories.value.length > 0)
```

将模板中 `hasRealStory` 替换为 `hasUserStory`。

- [ ] **Step 3: 迁移现有故事列表模板到 Tab 3**

将现有的"故事列表视图"（列表 + 详情）整套模板迁移到 `activeTab === 'all'` 的 `<template>` 中，无需改动内容结构。

- [ ] **Step 4: 验证 Tab 3**

预期：切换到"所有故事"Tab，显示所有用户投递的故事（不含历史故事），搜索和排序功能正常。

- [ ] **Step 5: Commit**

```bash
git add client/src/components/StarDetail.vue
git commit -m "feat: 实现 Tab 3 所有故事，数据源改为 userStories，排除历史故事"
```

---

### Task 5: 实现 Tab 4 — 我的故事

**Files:**
- Modify: `client/src/components/StarDetail.vue`

- [ ] **Step 1: 添加 Tab 4 模板**

```html
<template v-else-if="activeTab === 'mine'">
  <div v-if="props.currentUserId == null" class="empty-state">
    <User :size="20" class="empty-icon" />
    <p>请先登录后查看我的故事</p>
  </div>
  <div v-else-if="myStories.length > 0" class="story-list">
    <div
      v-for="(story, index) in myStories"
      :key="story.id"
      class="story-card"
      :style="{ animationDelay: `${index * 30}ms` }"
      @click="openStoryDetail(story)"
    >
      <div class="story-head">
        <h4 class="story-title">{{ story.title || '匿名心事' }}</h4>
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
        <span v-if="formatTime(story.createdAt)" class="meta-time">{{ formatTime(story.createdAt) }}</span>
        <span v-if="formatTime(story.createdAt) && formatDistance(story.locationLat, story.locationLng).text" class="meta-sep">·</span>
        <span v-if="formatDistance(story.locationLat, story.locationLng).text" class="meta-dist" :class="{ 'meta-near': formatDistance(story.locationLat, story.locationLng).near }">{{ formatDistance(story.locationLat, story.locationLng).text }}</span>
        <span class="meta-sep">·</span>
        <Sparkles :size="12" /> <span>{{ getDisplayResonance(story) }}</span>
        <span class="meta-sep">·</span>
        <Eye :size="11" /> <span>{{ getStoryViewCount(story.id) }}</span>
      </div>
    </div>
  </div>
  <div v-else class="empty-state">
    <PenSquare :size="20" class="empty-icon" />
    <p>你还没有在这颗星上写过故事</p>
  </div>
</template>
```

- [ ] **Step 2: 验证 Tab 4**

预期：切换到"我的故事"Tab，未登录提示登录，登录后仅显示 `userId === currentUserId` 的故事。

- [ ] **Step 3: Commit**

```bash
git add client/src/components/StarDetail.vue
git commit -m "feat: 实现 Tab 4 我的故事，按 userId 筛选当前用户的故事"
```

---

### Task 6: 解耦 — SkyPage 的 showMyStoriesOnly 与 StarDetail 的数据传递

**Files:**
- Modify: `client/src/pages/SkyPage.vue`

**设计决策**：`showMyStoriesOnly` 和 Tab 4 侧重点不同，应共存而非移除：

| 功能 | 层级 | 作用 |
|---|---|---|
| SkyPage `showMyStoriesOnly` | 3D 星图全局层 | 在天空中突出用户有故事的星星 + 连线关系，**空间可视化** |
| StarDetail Tab 4 | 单星详情局部层 | 在当前星星下列出用户写的故事，**内容列表** |

但当前存在冲突：`showMyStoriesOnly` 开启时，SkyPage 传给 StarDetail 的 `selectedStories` 已被过滤（只剩用户故事），导致 Tab 2 "历史故事"和 Tab 3 "所有故事"数据不完整。

**修复方案**：打开 StarDetail 时始终传递完整 stories 数据，`showMyStoriesOnly` 的过滤只影响 3D 天空渲染，不影响详情面板。

- [ ] **Step 1: 修改 selectedStories computed，打开详情时始终传完整数据**

找到 `selectedStories` 的 computed 定义（约第 610-650 行），将 `showMyStoriesOnly` 的过滤逻辑移除：

```ts
// 修改前（约第 610-620 行）：
const selectedStories = computed(() => {
  // ...
  const fullMap = storiesByStarId.value
  // ...
  const filtered = showMyStoriesOnly.value
    ? stories.filter(s => s.userId != null && s.userId === currentUserId.value)
    : stories
  // ...
})

// 修改后：
const selectedStories = computed(() => {
  // ...
  const fullMap = storiesByStarId.value
  // ...
  // 始终传递完整数据给 StarDetail，Tab 内部自行筛选
  // showMyStoriesOnly 只影响 3D 天空渲染，不影响详情面板
  return stories?.length ? stories : [NO_STORY]
})
```

- [ ] **Step 2: 保留 SkyPage 的 showMyStoriesOnly 在 3D 渲染层的逻辑**

确认 `showMyStoriesOnly` 相关的以下逻辑**保持不变**：
- 导航栏"我的/全部"切换按钮（模板）
- `toggleMyStories()` 函数和 `myToggleFeedback` toast
- `watch(showMyStoriesOnly, ...)` 中更新 `storiesByStarId` 统计的逻辑
- 3D 天空中星星高亮/连线相关的筛选逻辑（如在 `useSky.ts` 或 `SkyCanvas` 中）

- [ ] **Step 3: 验证**

预期：
1. 导航栏"我的"切换按钮正常工作，3D 天空正确突出用户有故事的星星
2. 点击星星打开详情面板后，4 个 Tab 数据完整（历史故事、所有故事、我的故事都正确显示）
3. 两者互不干扰

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/SkyPage.vue
git commit -m "fix: 解耦 showMyStoriesOnly 与 StarDetail 数据传递，打开详情时始终传完整 stories"
```

---

### Task 7: 细节打磨 — Tab 切换记忆 & 空状态优化

**Files:**
- Modify: `client/src/components/StarDetail.vue`

- [ ] **Step 1: 切换星星时重置 Tab 到默认**

在 `watch(() => props.catalogStarId, ...)` 中添加：

```ts
watch(() => props.catalogStarId, (id) => {
  activeTab.value = 'narrative' // 切换星星时回到默认 Tab
  if (id && positionReady.value) {
    fetchNarrativeWithPosition()
  }
}, { immediate: true })
```

- [ ] **Step 2: 我的故事 Tab 空状态登录引导**

当 `currentUserId == null` 时，空状态卡片增加登录按钮：

```html
<div v-if="props.currentUserId == null" class="empty-state">
  <User :size="20" class="empty-icon" />
  <p>请先登录后查看我的故事</p>
  <button class="empty-login-btn" @click="$router.push('/')">去登录</button>
</div>
```

```css
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
.empty-login-btn:hover {
  background: rgba(255, 217, 138, 0.15);
}
```

- [ ] **Step 3: 验证**

预期：切换星星时始终回到"AI 叙事"Tab；未登录时"我的故事"Tab 显示登录引导。

- [ ] **Step 4: Commit**

```bash
git add client/src/components/StarDetail.vue
git commit -m "feat: 切换星星时重置 Tab 到默认，我的故事空状态加登录引导"
```

---

## Self-Review 检查清单

| 检查项 | 状态 |
|---|---|
| 4 个 Tab 是否覆盖所有 spec 需求 | ✓ |
| 是否有 placeholder / TODO | ✓ 无 |
| 类型一致性（TabId 在 7 个 Task 中一致） | ✓ |
| 历史故事置顶逻辑是否已从 Tab 3 移除 | ✓ Task 4 |
| SkyPage 与 StarDetail 数据传递是否解耦 | ✓ Task 6 |
| 每个 Tab 空状态是否处理 | ✓ |
| 切换星星时 Tab 是否重置 | ✓ Task 7 |

---

## 执行方式

**Plan complete and saved to `docs/superpowers/plans/2026-07-28-story-panel-tabs.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — 每个 Task 一个独立 subagent，Task 间 review
2. **Inline Execution** — 在当前 session 中按 Task 顺序执行，批量提交

**推荐 Subagent-Driven** — 7 个 Task 独立性强，可并行推进部分 Task。