# FILES.md — 星语穹庭 文件清单

> 为 AI Agent 和开发者提供快速导航。每个文件标注用途，方便定位修改目标。
>
> **维护规则**：在创建、修改或删除文件后，必须同步更新本文件。如需了解项目文件作用，请先查阅本文件。

---

## 项目根目录

| 文件 | 用途 |
|---|---|
| `AGENTS.md` | 项目高层概述：架构、API 表、常用命令、关键约束 |
| `FILES.md` | 本文件。项目文件清单与用途说明 |
| `CHANGELOG.md` | 版本变更记录 |
| `ecosystem.config.js` | PM2 部署配置 |
| `.gitignore` | Git 忽略规则 |

---

## server/ — 后端（Express + TypeScript + node:sqlite）

### 入口与配置

| 文件 | 用途 |
|---|---|
| `src/index.ts` | **服务入口**。Express 启动、路由注册、CORS 配置、静态文件服务 |
| `src/db.ts` | **数据库初始化**。SQLite 建表（users, stars, narratives, story_kernels 等）、迁移兼容 |
| `package.json` | 依赖与脚本：`dev`（nodemon）、`build`（tsc）、`start`、`seed` |
| `tsconfig.json` | TypeScript 编译配置 |
| `.env.example` | 环境变量模板 |

### 路由层 `src/routes/`

| 文件 | 用途 |
|---|---|
| `stars.ts` | 旧版星星路由（`/api/stars`），保留兼容 |
| `stories.ts` | **故事路由**（`/api/stories`）。投递心事、共鸣、浏览、收藏；**`POST /api/stories/match-star`**（authRequired，1~2000 字校验）调 kernel 为未落库新故事寻找 Top3 契合星辰；**`POST /api/stories/ai-tags`**（authOptional，1~2000 字校验）仅生成 3-5 个 AI 建议标签（轻量、不走星星匹配）供前端发故事时实时推荐。 |
| `catalog.ts` | 星表恒星路由（`/api/catalog/stars`）。统计、搜索 |
| `narrative.ts` | **AI 叙事路由**（`/api/catalog/stars/:id/narrative`）。含 `ra`/`dec` 参数用于地平线判断 |
| `chat.ts` | **古人陪看聊天路由**（`/api/catalog/stars/:id/chat/*`）。古人列表、开场白、SSE 流式聊天 |
| `auth.ts` | 用户认证路由（注册、登录、token 刷新） |
| `profile.ts` | **个人空间路由**（`/api/profile/*`）。我的故事（分页）、我的收藏、私有内核连线、聚合统计（`/stats`）、用户喜好 |
| `location.ts` | 反向地理编码路由（`/api/location/reverse`）。高德 → BigDataCloud → Nominatim 三级回退 |
| `search.ts` | 星星搜索路由 |
| `stats.ts` | 统计数据路由 |
| `analysis.ts` | **单星 AI 分析路由**（`/api/catalog/stars/:id/analysis`，兼容旧 `/api/stars/:id/analysis`）。返回预生成的 persona/emotion/themehour；themehour 未生成则即时 SQL 聚合返回 |

### 服务层 `src/services/`

| 文件 | 用途 |
|---|---|
| `narrative.ts` | **AI 叙事生成核心**。含 `PLANET_MAP`（太阳系星体映射）、`isAboveHorizon`（地平线计算）、`buildNarrativePrompt`（恒星 Prompt）、`buildPlanetNarrativePromptVisible/Hidden`（行星可见/不可见 Prompt） |
| `deepseek.ts` | DeepSeek API 封装。`deepseekChat()` 函数，支持 temperature/maxTokens 配置 |
| `chat.ts` | 古人陪看聊天服务。`streamChat()` SSE 流式输出 |
| `starService.ts` | 星星 CRUD 业务逻辑。含 `getUserStats()`（用户聚合统计）、`getUserStoriesPaged()`（分页跨星查询）、`getCatalogStats()`（单星聚合） |
| `userService.ts` | 用户 CRUD 业务逻辑 |
| `kernel.ts` | 故事内核（情感标签）提取与匹配服务。含 **`findMatchingStarsForContent(title, content, limit)`** 为未落库的新故事寻找 Top3 最契合的星辰（内核 Jaccard 相似度 Top10 + DeepSeek 语义重排给理由 + 匹配不到时降级选亮星）。**`extractSuggestedTagsForContent(title, content)`** 轻量接口：仅生成 3-5 个 AI 建议标签（不走星星匹配），配合前端 `POST /api/stories/ai-tags` 做实时标签推荐。`getSimilarStars(catalogStarId)` 星 vs 星内核相似度。`generateKernel()` AI 提取内核。 |
| `starAnalysis.ts` | **单星分析读服务**。`computeThemeHour()`（主题 Top8 + 24h 投递分布 SQL 聚合）；`readAnalysis()` 读 catalog_star_analyses 表 + 即时补 themehour |
| `amap.ts` | 高德地图 API 封装（逆地理编码） |
| `emailService.ts` | 邮件发送服务 |

### 数据层 `src/data/`

| 文件 | 用途 |
|---|---|
| `ancientFigures.ts` | **古人角色预设**。23 位古人（李白、杜甫、苏轼等），含 `starAssociations`（星体-诗人关联）、`systemPrompt`（角色扮演 Prompt）、`openingTemplate`（开场白模板）。`getFiguresForStar()` 按星名匹配古人 |

### 工具层 `src/utils/`

| 文件 | 用途 |
|---|---|
| `response.ts` | 统一响应格式：`ok()`、`badRequest()`、`notFound()`、`serverError()`。<br>**含 `convertKeys` 函数**：自动将 snake_case 键转为 camelCase（如 `image_url` → `imageUrl`），SQL 查询中无需重复别名 |
| `position.ts` | 位置计算工具 |

### 中间件 `src/middleware/`

| 文件 | 用途 |
|---|---|
| `auth.ts` | JWT 认证中间件。`requireAuth` 用于需要登录的路由 |

### 脚本 `server/scripts/`

| 文件 | 用途 |
|---|---|
| `seed.ts` | **冷启动数据注入**。历史星（type='history'）初始数据。共鸣/浏览计数用标题+内容的稳定哈希（FNV-1a）生成，**同一内容多次 seed 结果一致，不再 Math.random() 随机假数据**；浏览量按共鸣的 2.2~3.6x 自然比例写入。 |
| `generateKernels.ts` | 故事内核（情感标签）批量生成 |
| `generateAllAnalyses.ts` | **单星分析批量生成**。调用 starAnalysisAgent.runAll()：themehour SQL 聚合 + AI 三段文 / persona 画像 / emotion 情感故事摘录；支持 --ids/--limit/--only/--force/--throttle；对应脚本名 `npm run agent:analyze`；内核脚本为 `npm run agent:kernels` |
| `migrate-origin.ts` | 数据迁移脚本（旧 origin 字段迁移） |
| `seed_user_stories.ts` | 用户故事种子数据（type='user'，30 颗星 × 2 条 = 60 条）。resonance_count 手写固定值；view_count 按标题+内容稳定哈希 × 2.0~3.0x 比例算出，保证多次 seed 稳定无随机。 |
| `story-rewrite-prompt.md` | 故事改写 Prompt 参考 |
| **`AGENT_CONTROL.md`** | **Agent 控制手册**。Key 配置、冷启动、agent:kernels、agent:analyze 参数、幂等&安全、常见 401/429 排查、自动再生闭环、部署自检清单（**部署必读**） |
| `fix-cids.mjs` | 修复 catalog_star_id 脏数据（历史迁移，异常场景才用） |

### AI 分析 Agent `src/agents/`

| 文件 | 用途 |
|---|---|
| `starAnalysisAgent.ts` | **分析总控 Agent**。`ensureOne()` 单星懒生成（story_hash 幂等 + 1200ms 节流 + partial 入库）；`runAll()` 批量按故事数 DESC + 亮星优先级排序；`upsertAnalysis()` 写 catalog_star_analyses 表 |
| `generators/personaGen.ts` | 人格画像生成器。DeepSeek 取 5 标签/金句/4 维度 + 复用「古今共望」叙事正文做两段解读 |
| `generators/emotionGen.ts` | 情感解构 + 故事摘录生成器。5 色情绪球 + 百分比洞察 + Top3 独白卡片 |
| `generators/themeHourGen.ts` | 主题森林/时辰观察三段文生成器。forestNote（森林引导） + peakText（活跃时段） + lowText（沉睡时段） |

### 类型 `src/types/`

| 文件 | 用途 |
|---|---|
| `starAnalysis.ts` | 分析完整类型：`PersonaPayload` / `EmotionPayload` / `ThemeHourPayload` / `CatalogAnalysisFull` |

---

## client/ — 前端（Vue 3 + Vite + Three.js + PrimeVue）

### 入口与配置

| 文件 | 用途 |
|---|---|
| `src/main.ts` | **前端入口**。创建 Vue App、注册路由、挂载 PrimeVue |
| `src/App.vue` | 根组件（路由出口） |
| `index.html` | HTML 入口 |
| `vite.config.ts` | Vite 配置。含 `/api` 代理到 `localhost:3000` |
| `package.json` | 依赖与脚本：`dev`（Vite）、`build`（vue-tsc + vite） |
| `tsconfig.json` | TypeScript 编译配置 |
| `src/env.d.ts` | TypeScript 环境声明 |

### 页面 `src/pages/`

| 文件 | 用途 |
|---|---|
| `SkyPage.vue` | **星空主页**。定位、城市选择面板、3D 画布、星体点击处理（`onStarClick`/`onPlanetClick`，进入行星特写模式）、关闭详情退出特写（`onCloseDetail` 调 `exitCloseup`）、故事表单、设置面板、移动端底部「凝听星语」按钮（吸附星体后滑入，issue #124；issue #134 扩展支持行星：按钮区分恒星/行星，行星入口只打开故事面板不进入特写）；**PC 端行星特写观察模式**（issue #136）：`planetObserveMode` ref + document click 监听实现点击空白进入观察模式（隐藏故事面板露出行星）、任意点击切回故事模式；**「记录」功能入口**：导航栏 PenLine 按钮打开 `StoryForm` auto-match 模式 → `useStarMatching` 调 `/api/stories/match-star` → 展示 Top3 候选星面板 → 用户选星 → 相机飞行 + 高亮 + 打开 StarDetail |
| `HomePage.vue` | 首页/登录页。粒子星空背景 + 左右分栏（品牌意境/登录注册表单），含找回密码、匿名访客体验；移动端可竖向滚动（issue #124） |
| `ProfilePage.vue` | **个人空间页** (Style D 叙事沉浸式)。固定 Topbar（罗马数字按钮 Ⅰ返航/Ⅱ题刻/Ⅲ密钥/Ⅳ离开）+ 480px 月亮 Hero（含邮箱展示）+ 金线 banner/签名；时间轴默认 5 条+点击展开+5、左右交替卡片；私人星座 SVG 椭圆节点最多 12 + 内核虚线连线；典藏星展 Favorites 错叠 4 卡 shift 拼贴取消收藏；5 Modal 统一换肤（签名/星穹之钥密码+找回链接/退出登录确认/故事详情/摘取确认）+ Gold Flash 成功反馈。authFetch 401 兜底自动跳登录。响应式 768/380 双断点（移动端顶部设置弹窗）；Prefers-reduced-motion 全停动画 |

### 组件 `src/components/`

| 文件 | 用途 |
|---|---|
| `SkyCanvas.vue` | **3D 画布组件**。挂载 `useSky`、代理点击/悬停/准星吸附事件（`starClick`/`starHover`/`starHoverLong`/`planetClick`/`snapChange`） |
| `StarDetail/index.vue` | **星星详情容器**。状态管理、布局编排、PC端 4 个 Tab（AI 叙事/历史故事/用户故事/我的故事）+ 移动端 5 个 Tab（含星信息）、标签编辑、删除确认；**PC 端行星特写观察模式**（issue #136）：`isPlanetCloseup`/`observeMode` prop 控制 overlay 点击行为分叉（行星特写时点击空白切换观察模式而非关闭），观察模式下隐藏故事面板+移除模糊背景露出 3D 行星 |
| `StarDetail/StoryCard.vue` | 故事卡片子组件（4 个 Tab 复用） |
| `StarDetail/StoryDetail.vue` | 故事详情子组件（标题、正文、共鸣、删除） |
| `StarDetail/StoryList.vue` | 故事列表子组件（搜索、排序、卡片列表、空状态） |
| `StarDetail/StarHeader.vue` | 星星概要子组件（名称、星座、颜色） |
| `StarDetail/StarInfoPanel.vue` | 信息面板子组件（视星等/距离/色温/亮度、统计、天文事件、月相、北极星岁差科普） |
| `StarDetail/SimilarStarsPanel.vue` | **内核相似的星星面板**（PC端 AI 叙事 Tab 下方左栏 + 移动端 info tab） |
| `StarDetail/AreaHighlightsPanel.vue` | **天区故事精选面板**（PC端 AI 叙事 Tab 下方右栏 + 移动端 info tab） |
| `StarDetail/BottomBar.vue` | 底部操作栏子组件（写故事、收藏、与古人共赏） |
| `StarDetail/MobileTabSelect.vue` | 移动端下拉 Tab 选择器（替代 PC 端 Tab 栏） |
| `StarDetail/MobileActionSheet.vue` | 移动端底部 Action Sheet（删除确认，3 秒倒计时） |
| `CollectionDetail/index.vue` | **合集详情容器**（镜像 StarDetail 双栏布局）。PC 端左栏 tab（**AI 解读默认首个**/故事列表/合集列表）+ 右栏合集信息（描述/**4 列统计 故事/共鸣/浏览/收藏**/活跃时辰热力/故事时间轴/高频标签/编辑删除）；移动端底部抽屉 + 全屏故事详情。故事缩略/详细中 tag 上方显示**星星归属**（挂在哪颗星上）而非合集徽章（`showStarBelonging` 透传）。复用 StoryList/StoryDetail/CollectionAnalysis，内部处理共鸣/删除（optimistic）。从 ProfilePage 合集卡片和 SkyPage 故事详情合集徽章两处打开 |
| `CollectionDetail/CollectionAnalysis.vue` | **合集 AI 解读组件**（设计预览阶段，未接 agent）。8 个富信息板块：合集画像（四字凝意+维度条）/情感光谱/主题脉络/时辰热力/情感轨迹（逐则心事情绪流转）/共鸣榜/关键词星云/AI 总叙。mock 数据占位，共鸣榜优先用真实故事 Top3。接入 `collectionName`/`storyCount`/`stories` props，emit `story-click` |
| `StarNarrative.vue` | AI 叙事展示组件（Markdown 渲染） |
| `AncientChat.vue` | **与古人共赏**聊天抽屉。古人选择 → SSE 流式聊天 |
| `StoryForm.vue` | 投递心事表单。两种 `mode` prop：**`bind-star`**（预绑定 catalogStarId，原行为） vs **`auto-match`**（未选星，点「寻找归属星辰」emit `requestMatch` 给父组件，匹配后父组件通过 ref 调 `doSubmit(catalogStarId)` 真正提交）。auto-match 模式下提供 3 步进度遮罩（提取内核 / 夜空寻星 / 判断缘分）。**实时 AI 标签推荐**：标题+正文变化 600ms debounce → `POST /api/stories/ai-tags`，推荐标签与匹配接口回传的 `suggestedTags` 合并去重后展示，两种模式都启用。暴露：`defineExpose({ doSubmit, resetForm })`。 |
| `SettingsModal.vue` | 设置面板（API Key 管理、显示配置） |
| `LoadingScreen.vue` | 加载动画 |
| `LegendToggle.vue` | 图例开关 |

### 核心逻辑 `src/composables/`

| 文件 | 用途 |
|---|---|
| `useSky.ts` | **Three.js 渲染核心**。天球体、银河、星座连线、行星渲染（物理直径比例+halo辅助光点）、Raycaster 点击检测、相机控制、行星特写状态机（IDLE/TWEENING/CLOSEUP/EXITING，含 `preCloseupCamera` 快照实现望远镜效果——退出特写回到进入前的相机视角而非固定原点；进入特写隐藏 planetHoverGlow+halo 避免闪光弹）、行星 hover 淡光晕（与恒星 hover 互斥，按行星色 tint）、移动端准星吸附（`onSnapChange` 回调 + `releaseSnap` 主动释放，issue #124；issue #134 扩展支持行星吸附，导出 `SnapTarget` 类型区分恒星/行星，吸附行星时 tooltip 显示行星名） |
| `useStars.ts` | 星星数据获取、过滤、本地更新 |
| `useNarrative.ts` | 叙事 API 调用封装。`fetchNarrative()` 含 `lat`/`lng`/`ra`/`dec` 参数 |
| `useResonate.ts` | 共鸣操作（乐观更新） |
| `useKernel.ts` | 故事内核（情感标签）提取 |
| **`useStarMatching.ts`** | **「记录」归属星辰匹配封装**。`matchStars(title, content, limit)` → POST `/api/stories/match-star` → 返回 Top3 `MatchCandidate[]`。`step` 1/2/3 进度自动推进（配合 StoryForm 匹配遮罩）。`reset()` 中断+清状态 |
| `useSimilarStars.ts` | 相似星星推荐 |
| `useAreaHighlights.ts` | 天区故事精选 |
| `useAstroEvents.ts` | 天文事件计算（日月出没、行星可见性） |
| `useParticleSky.ts` | 粒子背景动画 |
| `useMediaQuery.ts` | 响应式断点检测（768px PC/移动端分界） |

### 数据 `src/data/`

| 文件 | 用途 |
|---|---|
| `stars.json` | **星表数据**。6142 颗恒星预计算 3D 坐标（由 `generateStarCatalog.ts` 离线生成） |
| `planets.ts` | 行星数据。`BODY_MAP`（名称映射）、`getBodyPosition()`（实时 RA/Dec 计算）、`getMoonPhase()`、`getSolarTerm()`、视运动轨迹。size 字段为物理直径比例（以太阳 1,392,700km=5.0 为基准） |
| `constellations.json` | 星座连线数据 |
| `starInfo.ts` | 恒星附加信息（星座中文名、距离） |
| `asteroids.ts` | 小行星数据 |
| `comets.ts` | 彗星数据 |
| `meteorShowers.ts` | 流星雨数据 |

### 工具 `src/utils/`

| 文件 | 用途 |
|---|---|
| `astro.ts` | 天文计算工具 |
| `geoTime.ts` | 地理位置时区工具 |
| `starName.ts` | **星名统一查找工具**（issue #135）。合并 stars.json 恒星 + planets.ts 行星，提供 `isPlanetId`/`getStarNameInfo`/`getStarDisplayName`/`getPlanetBodyName`，消除 ProfilePage/StarDetail/SkyPage 三处重复 lookup 对行星负 id 的漏查 |
| `constants.ts` | 全局常量（含行星特写模式参数：CLOSEUP_FOV/CLOSEUP_INIT_RATIO/CLOSEUP_MIN_RATIO/CLOSEUP_MAX_RATIO/CLOSEUP_NEAR/DEFAULT_NEAR/CLOSEUP_WHEEL_FACTOR） |
| `gpuDetect.ts` | GPU 性能检测 |
| `sphereMapping.ts` | 球面坐标映射 |
| `starDisplayConfig.ts` | 星空显示配置（星座线、标签、彗星等开关） |
| `storyMappings.ts` | 故事数据映射/转换 |

### 路由与状态 `src/router/`、`src/stores/`

| 文件 | 用途 |
|---|---|
| `router/index.ts` | Vue Router 路由配置 |
| `stores/auth.ts` | 用户认证状态管理（Zustand 风格）。login/register/logout（调后端黑名单 API）/fetchMe/token 自动刷新；导出 `authFetch`（401 兜底清 token 跳登录）、`setAuthRouter`（注入路由实例）、`isGuest`（访客账号判断） |

### 样式 `src/styles/`

| 文件 | 用途 |
|---|---|
| `variables.css` | CSS 变量（颜色、字号、间距等设计 token） |

### 脚本 `client/scripts/`

| 文件 | 用途 |
|---|---|
| `generateStarCatalog.ts` | **星表坐标预计算**。赤经赤纬 → 3D 坐标 → `stars.json` |

### 静态资源 `client/public/`

| 路径 | 用途 |
|---|---|
| `textures/planets/` | 行星纹理贴图（太阳、月球、水星、金星、火星、木星、土星、天王星、海王星） |
| `textures/skybox/` | 银河背景贴图 |

---

## docs/ — 设计文档 & 实现计划

按 superpowers 工作流规范：先写 Spec，再生成实现计划。

### 设计规范 `docs/superpowers/specs/`

| 文件 | 用途 |
|---|---|
| `2026-07-31-personal-space-ui-style-d-design.md` | **个人空间界面优化设计规范**。Style D（叙事沉浸式）完整 Spec：美学方向、颜色 token、字体层级、4 大段结构、交互流程、数据/API 映射、响应式规则、无障碍、验收清单 |
| `2026-08-02-mobile-login-and-story-button-design.md` | **移动端登录页适配 + 凝听星语按钮设计规范**（issue #124）。登录页可滚动 + 移动端进入故事改用底部「凝听星语」按钮（吸附星辰后滑入）替代触屏点击 |
| `2026-08-04-story-collection-folio-design.md` | **故事合集（星笺）设计规范**。合集=故事唯一系列标识（非收藏夹）：`collections` 表 + `stars.collection_id` 列；投递故事时选合集；合集 `visibility` 决定内含故事可见性（public/private）；与 favorites/星星归属正交。含数据模型、API、可见性过滤逻辑、前端模块、P1–P4 路线图与验收清单 |

### 实现计划 `docs/superpowers/plans/`

| 文件 | 用途 |
|---|---|
| `2026-07-31-personal-space-ui-style-d.md` | **个人空间 Style D 实现计划**。Subagent-Driven 8 任务分解（色板→骨架→时间轴→星座→星展→Modal→响应式→终检）+ 每任务 2 阶段审核 (spec compliance + code quality) + 规范 commit 信息，对应分支 `fix/personal-space-ui-optimization` |
| `2026-07-28-story-image-upload-markdown.md` | 故事图片上传 + Markdown 正文支持 实施计划 |
| `2026-07-28-story-panel-tabs.md` | StarDetail 4→5 Tab 重构 实施计划 |
| `2026-07-27-narrative-bugs-fix.md` | AI 叙事行星/相似星/天区高亮 Bug 修复计划 |

---

## designs/ — 设计素材与原型

| 路径 | 用途 |
|---|---|
| `style-a-minimalist-elegant.jpg` | 方案 A：极简优雅风格概念设计图 |
| `style-b-dreamy-romantic.jpg` | 方案 B：梦幻浪漫风格概念设计图 |
| `style-c-curatorial-museum.jpg` | 方案 C：典藏博物风格概念设计图 |
| `style-d-narrative-immersive.jpg` | 方案 D：叙事沉浸式概念设计图（最终选定） |
| `prototypes/index.html` | 设计方案导航首页（4 种风格入口） |
| `prototypes/style-a.html` | 方案 A 可交互 HTML/CSS 原型 |
| `prototypes/style-b.html` | 方案 B 可交互 HTML/CSS 原型（含 Canvas 粒子） |
| `prototypes/style-c.html` | 方案 C 可交互 HTML/CSS 原型（星图册 + 侧边栏 + Bento 卡片） |
| `prototypes/style-d.html` | 方案 D 可交互 HTML/CSS 原型（月亮 Hero + 时间轴 + 星座 SVG + 叠卡星展） |

---

## deploy/ — 部署配置

| 文件 | 用途 |
|---|---|
| `deploy.sh` | Linux 部署脚本 |
| `deploy-local.ps1` | Windows 本地部署脚本 |
| `nginx.conf.template` | Nginx 反向代理模板 |
| `GITHUB_ACTIONS.md` | GitHub Actions 部署说明 |
| `SSH.md` | SSH 配置说明 |

---

## .github/ — CI/CD

| 文件 | 用途 |
|---|---|
| `workflows/deploy.yml` | GitHub Actions 自动部署流水线 |

---

## 快速导航：常见任务 → 文件

| 想做什么 | 去改哪个文件 |
|---|---|
| 修改 AI 叙事风格/Prompt | `server/src/services/narrative.ts` |
| 添加/修改古人角色 | `server/src/data/ancientFigures.ts` |
| 修改古人聊天逻辑 | `server/src/routes/chat.ts`、`server/src/services/chat.ts` |
| 添加新 API 路由 | `server/src/routes/` 下新建，在 `server/src/index.ts` 注册 |
| 修改数据库表结构 | `server/src/db.ts` |
| 修改 3D 星空渲染 | `client/src/composables/useSky.ts` |
| 修改星星详情面板 | `client/src/components/StarDetail/index.vue` |
| 修改古人聊天 UI | `client/src/components/AncientChat.vue` |
| 修改行星数据/位置计算 | `client/src/data/planets.ts` |
| 修改星空显示配置 | `client/src/utils/starDisplayConfig.ts` |
| 修改定位/城市选择 | `client/src/pages/SkyPage.vue`、`server/src/routes/location.ts` |
| 修改/新增 **记录 · AI 归属星辰** 功能（写故事 → AI 匹配 Top3 星辰 → 选星挂载 → 飞相机高亮详情） | `server/src/services/kernel.ts`、`server/src/routes/stories.ts`、`client/src/composables/useStarMatching.ts`、`client/src/components/StoryForm.vue`、`client/src/pages/SkyPage.vue` |
| 添加前端新页面 | `client/src/pages/` 新建，`client/src/router/index.ts` 注册 |
| 修改 CSS 设计 token | `client/src/styles/variables.css` |
| 修改部署流程 | `deploy/`、`.github/workflows/deploy.yml` |