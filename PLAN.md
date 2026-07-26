# PLAN.md — 星语穹庭 开发计划

## 当前任务：Issue #9 — 引入 Agents：星星故事凝练

**状态：** 阶段一、阶段二已完成

### 阶段一：AI 故事内核提取 + 替换标签系统

**目标：** 用 AI 自动分析故事内容，提取情绪标签、故事内核、主题词，替代现有的正则关键词标签系统。

**关键决策：**
- 标签由 AI 生成，但支持用户修改
- 内核异步生成（投递后不阻塞）
- 生成一次，永久缓存

#### 1. 数据库变更
- 新增 `story_kernels` 表
  - `story_id` (FK → stars.id, UNIQUE)
  - `emotional_tags` TEXT (JSON 数组)
  - `essence` TEXT (1-2 句故事内核凝练)
  - `themes` TEXT (JSON 数组)
  - `generated_at` TEXT

#### 2. 后端服务 `server/src/services/kernel.ts`
- `generateKernel(content, title)` → 调用 DeepSeek，返回 `{ emotionalTags, essence, themes }`
- `getKernel(storyId)` → 查缓存
- `cacheKernel(storyId, kernel)` → 写入 DB
- `updateKernel(storyId, kernel)` → 用户修改
- `getAggregatedTags(catalogStarId)` → 聚合某恒星下所有故事的内核标签

#### 3. 后端路由
- `POST /api/stories/:storyId/kernel` → 触发/获取内核
- `PATCH /api/stories/:storyId/kernel` → 用户修改内核
- `GET /api/catalog/stars/:catalogStarId/tags` → 聚合标签
- 投递故事后异步触发内核生成（不阻塞响应）

#### 4. 前端变更
- 新建 `client/src/composables/useKernel.ts`
- 替换 `StarDetail.vue` 中 `generatedTags` 为 API 获取的 AI 标签
- 标签区域支持编辑（点击编辑图标进入编辑模式）

#### 5. 向后兼容
- 保留 `stars.tag` 字段不动（旧数据兼容）
- 旧故事无内核时，显示"AI 分析中..."或回退到旧标签
- 为 seed 数据也可异步生成内核

---

### 阶段二：星座连线 + 天区故事精选

**目标：** 相似故事内核的星星浪漫化连接，天区故事精选面板展示内核凝练。

#### 1. 相似星星匹配 `kernel.ts`
- `getAllStarKernels()` → 聚合所有恒星的内核标签集合
- `jaccardSimilarity(a, b)` → Jaccard 相似度计算
- `getSimilarStars(catalogStarId, limit)` → 按情绪(60%)+主题(40%)权重匹配相似恒星
- `getAreaHighlights(catalogStarId, limit)` → 目标恒星+相似恒星的故事内核凝练

#### 2. 后端路由 `catalog.ts`
- `GET /api/catalog/stars/:catalogStarId/similar` → 内核相似的恒星
- `GET /api/catalog/stars/:catalogStarId/area-highlights` → 天区故事精选

#### 3. 前端变更
- 新建 `client/src/composables/useSimilarStars.ts` → 获取相似星星
- 新建 `client/src/composables/useAreaHighlights.ts` → 获取天区故事精选
- `StarDetail.vue` → 内核相似星星列表 + 天区故事精选面板
- `useSky.ts` → `setKernelLines()` 3D 虚线连接相似星星（发光层 + 动画）
- `SkyPage.vue` → `onUpdateSimilarStars()` 处理连线渲染