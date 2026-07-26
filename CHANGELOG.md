# CHANGELOG

## [Unreleased]

### 2026-07-26

- **fix**: 连线拖拽时不消失 + 定位高亮呼吸加大
  - 拖拽旋转视角时，内核连线不再消失，保持可见
  - 定位高亮呼吸缩放从 6~14 加大到 10~25，初始缩放从 12 加大到 25，更容易找到目标星

- **feat**: 悬浮连线 + 定位高亮
  - 鼠标悬浮星星 1s 后自动显示内核连线（无需点击），移开即消失
  - `useSky.ts` 新增 `onStarHoverLong` 回调和 1s 计时器
  - 搜索定位后目标星高亮 2s（呼吸脉冲 + 渐隐动画）
  - `useSky.ts` 新增 `highlightStar()` 和 `locateHighlight` sprite
  - 详情面板打开时悬浮连线不触发，避免冲突

- **feat**: 搜索定位星星 + 连线可见性优化
  - 搜索下拉结果新增定位按钮（Crosshair 图标），点击后相机平滑动画转动到该星为中心
  - `useSky.ts` 新增 `focusOnStar(x, y, z)` 函数：quaternion slerp 平滑转动，1.2s ease-in-out 动画
  - 优化详情面板 overlay 透明度（0.45→0.3）和模糊（4px→2px），让内核连线可见
  - 提高内核连线基础透明度（0.4→0.55）和发光层（0.15→0.25），呼吸动画范围加大

- **feat**: Issue #9 阶段二 — 星座连线 + 天区故事精选
  - 后端 `kernel.ts`：新增 `getAllStarKernels()`、`jaccardSimilarity()`、`getSimilarStars()`、`getAreaHighlights()` 函数
  - 新增 `GET /api/catalog/stars/:catalogStarId/similar` 端点（Jaccard 相似度匹配，情绪 60% + 主题 40% 权重）
  - 新增 `GET /api/catalog/stars/:catalogStarId/area-highlights` 端点（天区故事内核凝练）
  - 新建 `useSimilarStars.ts` composable（获取相似星星）
  - 新建 `useAreaHighlights.ts` composable（获取天区故事精选）
  - `StarDetail.vue`：新增「内核相似的星星」列表 +「天区故事精选」面板（故事内核卡片展示）
  - `useSky.ts`：新增 `setKernelLines()` 3D 虚线连接相似星星（发光层 + additive blending）
  - `SkyPage.vue`：新增 `onUpdateSimilarStars()` 处理连线渲染
  - 修复 `StarDetail.vue` 模板中 `similarStars` composable 对象引用错误

- **feat**: AI 故事内核提取系统 — Issue #9 阶段一 (`1105d44`)
  - 新增 `story_kernels` 表，存储 AI 生成的故事情绪标签、内核、主题词
  - 新增 `server/src/services/kernel.ts`：DeepSeek 驱动的内核提取服务
  - 投递故事后异步触发内核生成（不阻塞响应），永久缓存
  - API：`POST /api/stories/:storyId/kernel`（获取/生成）、`PATCH /api/stories/:storyId/kernel`（用户修改）、`GET /api/catalog/stars/:catalogStarId/tags`（聚合标签）
  - 前端 StarDetail 标签区域替换为 AI 生成标签（情绪标签 + 主题词，带计数）
  - 支持用户自定义标签编辑器（添加/删除/保存），localStorage 持久化
  - 无 AI 标签时回退到旧正则匹配标签
- **fix**: 强制 AI 输出格式 — Chat 分行 + Narrative Markdown (`f334687`)
  - Chat: 系统 Prompt 增加格式要求（动作括号标注→空行→对话分段），`max_tokens` 300→500
  - Narrative: 强化 Prompt 逐条列出格式规则（`#` 标题、`>` 引用、双引号、朝代标注），用户消息追加格式提醒
  - 清除旧叙事缓存，确保新 Prompt 立即生效
- **fix**: 修复三个问题 — 聊天 Markdown + 叙事渲染 + 故事入口重构 (`8bbcc73`)
  - AncientChat 对话增加 Markdown 渲染（`marked`），括号动作/空行/对话分层展示
  - 删除右栏冗余叙事组件（`StarNarrative` 只保留在左栏）
  - 加强叙事 Prompt 强制 Markdown 格式输出（标题 `#`、引用 `>`、空行分隔）
  - 故事按钮改为视图切换入口（叙事 → 故事列表），非折叠展开
  - 故事列表增加「返回叙事」导航
- **refactor**: 重构古人共赏 + 叙事 Markdown 渲染 + 布局调整 (`c740de4`)
  - 扩展诗人列表至 11 位（新增屈原/陶渊明/李清照/辛弃疾/王维/白居易/李商隐）
  - 新增星星-诗人关联映射（`starAssociations`），按星名/星座精确匹配
  - 新增诗人主动开场白功能（`POST /api/catalog/stars/:id/chat/opening`）
  - 新增 `GET /api/catalog/stars/:id/chat/figures` 按关联过滤古人
  - 叙事支持 Markdown 渲染（`marked` 库），结构化输出（标题/引用/段落）
  - 布局重构：叙事移至左栏顶部，故事列表改为可折叠区域
  - 修复叙事生成失败（去掉 `enableSearch: true`）
  - 修复 `starName` 可能为 null 的类型错误
- **fix**: 修复三个 Bug (`fc95d3d`)
  - chat.ts 中 stars.json 解析错误（对象而非数组），修复「与古人共赏」500 错误
  - deepseek.ts 空内容返回增加详细日志
  - StarDetail 右面板布局溢出：加 height/max-height/overflow-y
- **feat(chat)**: 古人陪看 AI 角色扮演聊天功能 (`6e417c4`)
  - 4 位古人预设（李白/杜牧/苏轼/张衡），含 systemPrompt 角色扮演
  - SSE 流式聊天，星星上下文自动注入
  - API：`GET /api/catalog/stars/:id/chat/figures` + `POST /api/catalog/stars/:id/chat`
  - 前端：AncientChat.vue 侧边抽屉（选角色→聊天状态机）
  - StarDetail 右面板底部「与古人共赏」紫色按钮

### 2026-07-15

- **feat**: 个人资料页星光节点重设计 — 全屏星空背景 + 故事星节点 + 星云签名编辑
- **feat**: 用户签名功能 — users 表加 signature 字段 + PATCH /api/auth/signature
- **refactor**: 删除太阳系行星（planets.ts + useSky.ts 渲染段），回归纯粹恒星背景
- **feat**: 故事改写 Prompt 模板 — `server/scripts/story-rewrite-prompt.md`
- **feat**: 种子数据全面重写 — 23 条旧故事按"还原原型"风格重写 + 补全 35 条新星座神话（共 58 条）
- **feat**: 新增星座故事覆盖：狮子座、天琴座、天鹅座、仙后座、英仙座、天龙座、武仙座、金牛座、宝瓶座、白羊座、御夫座、牧夫座、大犬座、小犬座、摩羯座、半人马座、仙王座、鲸鱼座、乌鸦座、南十字座、海豚座、波江座、长蛇座、天兔座、天秤座、飞马座、射手座、大熊座、小熊座、室女座、巨蟹座、蛇夫座、麒麟座、天坛座、船底座
- **fix**: SkyPage 导航栏完全透明（无背景色、无border、无blur）
- **fix**: Vite 代理端口修正 31415→3000
- **feat**: SkyPage 导航栏透明化，去掉「星语穹庭」logo
- **fix**: 修复 SkyPage 缺失 `starInfo.ts`，添加星座中文名映射和主要恒星距离数据
- **fix**: Vite 代理端口修正 31415→3000

### 2026-07-13

- **feat**: 后端项目初始化（Express + node:sqlite + TypeScript）
- **feat**: 实现三个核心 API（GET /api/stars, POST /api/stars/story, POST /api/stars/:id/resonate）
- **feat**: SQLite 数据库建表 + 坐标生成算法
- **feat**: 冷启动数据注入脚本（23 条真实古诗词/星座神话/社区语录）
- **docs**: 项目方案文档（方案.md）
- **docs**: AGENTS.md 全局指令文件
- **docs**: toA.md 前端对接 & 部署指南

> Git commit: edac02f
