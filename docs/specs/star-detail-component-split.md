# Spec: StarDetail 组件拆分

> 关联 Issue: [#77](https://github.com/RynOrca/star-empathy-platform/issues/77)
> 父 Issue: [#44](https://github.com/RynOrca/star-empathy-platform/issues/44)
> 分支: `feat/mobile-story-ui`
> 前置: [#91 Design Token System](https://github.com/RynOrca/star-empathy-platform/issues/91)

## Problem Statement

StarDetail.vue 是 2779 行的巨型单文件组件，包含桌面端双栏布局、移动端上拉抽屉、4 个 Tab 内容区、故事列表/详情、天文信息展示、标签编辑、删除确认弹窗、所有 CSS。修改任何一个功能都需要在 2779 行中定位，CSS 嵌套混乱，桌面端和移动端样式交织。这导致新功能开发慢、Bug 修复容易引入回归、新人难以接手。

## Solution

将 StarDetail.vue 拆分为 7 个职责清晰的子组件，通过 props/emits 通信。拆分后每个组件 < 400 行，CSS 随组件独立管理。拆分遵循"最小破坏"原则：不改变任何外部 API（props/emits 签名不变），不改变任何视觉行为。

## User Stories

1. As a 前端开发者, I want StarDetail 拆分为独立子组件，so that 修改一个 Tab 不影响其他 Tab
2. As a 前端开发者, I want 故事卡片提取为独立组件，so that 4 个 Tab 复用同一套卡片样式
3. As a 前端开发者, I want 桌面端和移动端布局逻辑分离，so that 改移动端不会意外破坏桌面端
4. As a 前端开发者, I want 底部操作栏独立，so that 后续重设计时只需改一个文件
5. As a 前端开发者, I want 每个子组件 < 400 行，so that 新人能快速理解单一职责
6. As a 前端开发者, I want 拆分后 build 和 lint 通过，so that 不影响现有 CI
7. As a 移动端用户, I want 拆分后功能和视觉与拆分前完全一致，so that 体验不受影响
8. As a 测试工程师, I want 组件边界清晰，so that 可以单独测试每个子组件

## Implementation Decisions

### 1. 拆分策略：最小破坏，渐进式

不一次性拆分所有 11 个组件（UI_HANDOVER.md 建议），而是优先拆出 7 个最关键的：

```
StarDetail/
├── index.vue              ← 容器：状态管理 + 布局编排
├── StarHeader.vue         ← 星星概要：名称、星座、星等、距离、标签
├── StoryCard.vue          ← 故事卡片（4 个 Tab 复用）
├── StoryDetail.vue        ← 故事详情视图（标题、正文、共鸣、删除）
├── StoryList.vue          ← 故事列表（搜索、排序、卡片列表）
├── StarInfoPanel.vue      ← 桌面端右侧信息面板（天文数据、相似星星、天区故事）
├── BottomBar.vue          ← 底部操作栏（共鸣、收藏、写故事）+ Tab 导航
```

### 2. 组件职责与 Props/Emits

**index.vue**（容器，~300 行）
- 持有所有状态：activeTab, searchQuery, sortKey, detailStoryId, 共鸣/收藏/删除逻辑
- 持有所有 composable 调用：useNarrative, useKernel, useSimilarStars, useAreaHighlights
- 负责桌面端双栏 / 移动端抽屉的布局编排
- 对外 props/emits 与原 StarDetail.vue 完全一致

**StarHeader.vue**（~200 行）
- Props: star, starInfo, stats, expanded, tags
- Emits: toggle-expand, edit-tag, delete-tag
- 职责：星星名称、星座名、展开/收起、星等/距离/色温 chip、统计数字、标签列表

**StoryCard.vue**（~150 行）
- Props: story, resonanceCount, isResonated, currentUserId, showSender
- Emits: click, resonate, delete
- 职责：单张故事卡片渲染（标题、摘要、图片、元信息、共鸣按钮、删除按钮）

**StoryDetail.vue**（~200 行）
- Props: story, resonanceCount, isResonated, currentUserId, backLabel
- Emits: back, resonate, delete
- 职责：故事详情全屏视图（标题、时间、距离、正文 Markdown、图片、共鸣/删除）

**StoryList.vue**（~200 行）
- Props: stories, searchQuery, sortKey, currentUserId, emptyMessage
- Emits: update:searchQuery, update:sortKey, story-click, resonate, delete
- 职责：搜索框、排序下拉、故事卡片列表、空状态

**StarInfoPanel.vue**（~200 行）
- Props: star, starInfo, similarStars, areaHighlights, astroData
- 职责：桌面端右侧面板（天文数据、相似星星、天区故事、展开/收起）

**BottomBar.vue**（~150 行）
- Props: activeTab, isFavorited, resonanceCount, showWriteButton
- Emits: update:activeTab, resonate, favorite, write-story
- 职责：底部 Tab 导航 + 操作按钮（共鸣、收藏、写故事）

### 3. 不拆出的部分

- **StarNarrative.vue** — 已存在独立组件，保持不变
- **删除确认弹窗** — 保留在 index.vue 中，逻辑简单（~30 行）
- **标签编辑弹窗** — 保留在 StarHeader.vue 中
- **手势/拖拽逻辑** — 当前分支无此功能，暂不新增

### 4. CSS 随组件拆分

- 每个子组件使用 `<style scoped>`，CSS 随组件走
- 共享样式（如 story-card 基础样式）保留在 StarDetail 目录下 `shared.css`
- 桌面端/移动端布局差异在 index.vue 中通过 CSS 媒体查询控制

### 5. 兼容性保证

- index.vue 的 props/emits 签名与原 StarDetail.vue 完全一致
- SkyPage.vue 中的 `<StarDetail>` 使用方式不变
- 外部引用路径不变（通过 index.vue 统一导出）

## Testing Decisions

- **测试什么**：外部行为不变 — 打开星星详情、切换 Tab、搜索故事、共鸣、收藏、写故事
- **不测试什么**：子组件内部实现细节
- **验证方式**：
  1. `npm run build` 通过（vue-tsc 类型检查 + vite 构建）
  2. 手动验证：桌面端打开星星 → 切换 4 个 Tab → 搜索 → 共鸣 → 收藏 → 关闭
  3. 手动验证：移动端视口（375px）打开星星 → 上拉抽屉 → 切换 Tab → 共鸣
  4. 对比拆分前后 screenshots 视觉回归

## Out of Scope

- 重设计底部 Tab/操作栏 UI — 后续独立 Spec
- 重设计故事卡片 UI — 后续独立 Spec
- 移动端手势交互（下拉关闭、触感反馈） — 后续独立 Spec
- 添加新功能或修改现有功能行为
- 修改 SkyPage.vue 对 StarDetail 的调用方式
- 引入 CSS Module 或 CSS-in-JS

## Further Notes

- 当前 StarDetail.vue 2779 行，拆分后 index.vue ~300 行 + 6 个子组件各 ~150-200 行
- 4 个 Tab 内容区未独立拆分（narrative 已独立，history/all/mine 共用一个 StoryList + StoryDetail）
- 当前分支无 @media 查询、无 touch 事件处理，拆分不引入新交互逻辑
- 拆分后 FILES.md 需更新 StarDetail 目录下的文件清单