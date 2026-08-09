# FILES.md — 星语穹庭 文件清单

> 为 AI Agent 和开发者提供快速导航。每个文件标注用途，方便定位修改目标。
>
> **维护规则**：在创建、修改或删除文件后，必须同步更新本文件。如需了解项目文件作用，请先查阅本文件。

---

## 项目根目录

| 文件 | 用途 |
| --- | --- |
| `AGENTS.md` | 项目高层概述：架构、API 表、常用命令、关键约束 |
| `FILES.md` | 本文件。项目文件清单与用途说明 |
| `CHANGELOG.md` | 版本变更记录 |
| `ecosystem.config.js` | PM2 部署配置 |
| `.gitignore` | Git 忽略规则 |

---

## server/ — 后端（Express + TypeScript + node:sqlite）

### 入口与配置

| 文件 | 用途 |
| --- | --- |
| `src/index.ts` | **服务入口**。Express 启动、路由注册、CORS 配置、静态文件服务 |
| `src/db.ts` | **数据库初始化**。SQLite 建表（users, stars, narratives, story_kernels, collections, story_views 等）+ **情绪共振图谱三表**（`emotion_resonances` 用户打标记录 / `user_emotion_profile` 长期画像（多来源+时间衰减）/ `emotion_edges` 用户间共振边（user_a<user_b 防重复，用于二阶推荐））、迁移兼容（ALTER TABLE try-catch） |
| `package.json` | 依赖与脚本：`dev`（nodemon）、`build`（tsc）、`start`、`seed` |
| `tsconfig.json` | TypeScript 编译配置 |
| `.env.example` | 环境变量模板 |

### 路由层 `src/routes/`

| 文件 | 用途 |
| --- | --- |
| `stars.ts` | 旧版星星路由（`/api/stars`），保留兼容 |
| `stories.ts` | **故事路由**（`/api/stories`）。投递心事、共鸣、浏览、收藏；**`POST /api/stories/match-star`**（authRequired，1~2000 字校验）调 kernel 为未落库新故事寻找 Top3 契合星辰；**`POST /api/stories/ai-tags`**（authOptional，1~2000 字校验）仅生成 3-5 个 AI 建议标签供前端实时推荐；**`GET /api/stories/nearby`**（authRequired，`?geohash=&limit=&diversity=&exploration=&excludeViewed=`）返回「附近的人的心事」v2——geohash 网格 + k-匿名降级（同城→同省→全国→同频）+ IDF 加权 Jaccard + VA 维度相似度 + 持久化情绪画像 + 二阶推荐 + MMR 多样性重排 + ε-greedy 探索 + 已读过滤；**`POST /api/stories/:storyId/emotion-resonate`**（authRequired，body: `{emotionTags:string[], weight?:number}`）用户主动给别人的故事打"我也有同感"情绪标签，反哺自身画像 + 建立 A↔B 共振边（不能给自己打标，幂等累加 weight）；**`GET /api/stories/emotion-profile`**（authRequired）返回当前用户长期情绪画像（多来源加权 + 30 天时间衰减 + VA 空间分布）；**`GET /api/stories/emotion-graph`**（authRequired，`?limit=`）返回共振邻居图谱（sharedEmotions/totalWeight/lastResonanceAt + Top 共振情绪）。POST 投递支持 `geoInfo{geohash,city,province}` 或兼容 `location{lat,lng}`（后端自动截断为 5 位 geohash，存储层脱敏不落库精确坐标）。 |
| `nearbyService.ts` | **附近的人的心事核心匹配服务 v2（情绪共振图谱版）**。`getNearbyStories(geohash, userId, limit, k?, options?)` 实现六层算法：① 地理锚点 geohash 网格 + k-匿名降级漏斗（district→city→province→country→emotion，K=5）；② 情绪匹配 IDF 加权 Jaccard + VA 维度相似度 + 标签共现增益；③ 持久化画像（调 emotionResonanceService，多来源 story/emotion_resonance/resonate/view 加权 + 30 天半衰期，无画像时降级到 story_kernels 即时计算）；④ 二阶推荐（共振邻居的新故事 neighborBoost 加分）；⑤ 多样性 MMR 重排（λ=0.7）+ ε-greedy 探索（10% 概率混入跨情绪象限故事）+ 同作者限频（MAX_PER_AUTHOR=3）+ 质量过滤（内容≥10 字）；⑥ 已读过滤（SQL 子查询排除 story_views + emotion_resonances）。综合分七维加权：情绪相似 30%×geo + VA 18%×同区加成 + 共现 8% + 时间共振 12%×强度 + 二阶 7% + 新鲜度 15% + 热度 10%。隐私：只用 geohash 前缀查询，响应只含城市名不含坐标/距离。 |
| `catalog.ts` | 星表恒星路由（`/api/catalog/stars`）。统计、搜索 |
| `narrative.ts` | **AI 叙事路由**（`/api/catalog/stars/:id/narrative`）。含 `ra`/`dec` 参数用于地平线判断 |
| `chat.ts` | **古人陪看聊天路由**（`/api/catalog/stars/:id/chat/*`）。古人列表、开场白、SSE 流式聊天 |
| `auth.ts` | 用户认证路由（注册、登录、token 刷新） |
| `profile.ts` | **个人空间路由**（`/api/profile/*`）。我的故事（分页）、我的收藏、私有内核连线、聚合统计（`/stats`）、用户喜好 |
| `location.ts` | 反向地理编码路由（`/api/location/reverse`）。高德 → BigDataCloud → Nominatim 三级回退 |
| `search.ts` | 星星搜索路由 |
| `stats.ts` | 统计数据路由 |
| `analysis.ts` | **单星 AI 分析路由**（`/api/catalog/stars/:id/analysis`，兼容旧 `/api/stars/:id/analysis`）。返回预生成的 persona/emotion/themehour；themehour 未生成则即时 SQL 聚合返回 |
| `collections.ts` | **合集路由**。CRUD 列表/创建/详情/更新/删除/公开列表。新增 **`GET /:id/analysis` 合集 AI 分析接口**（对齐单星分析三态）；**公开列表** `GET /public` 支持 `page/limit/sort=hot | new | resonance | name_asc | stories_desc / visibility=public | anonymous | galaxy`分页排序过滤；**`GET /picks`** 穹庭书局推荐 Picks：前 N 本官方星河 + 14 天内热榜补足。可见性：`visibility ∈ {public, private, anonymous, galaxy}` 四态。星河（galaxy）仅 user_id=0（星穹守护·系统管理员）可创建编辑删除；匿名（anonymous）合集公开展示故事但对外隐藏作者名（owner/管理员除外）；公开/私有为原逻辑 |

### 服务层 `src/services/`

| 文件 | 用途 |
| --- | --- |
| `narrative.ts` | **AI 叙事生成核心**。含 `PLANET_MAP`（太阳系星体映射）、`isAboveHorizon`（地平线计算）、`buildNarrativePrompt`（恒星 Prompt）、`buildPlanetNarrativePromptVisible/Hidden`（行星可见/不可见 Prompt） |
| `deepseek.ts` | DeepSeek API 封装。`deepseekChat()` 函数，支持 temperature/maxTokens 配置 |
| `chat.ts` | 古人陪看聊天服务。`streamChat()` SSE 流式输出 |
| `starService.ts` | 星星 CRUD 业务逻辑。含 `getUserStats()`（用户聚合统计）、`getUserStoriesPaged()`（分页跨星查询）、`getCatalogStats()`（单星聚合）、**`shouldHideAuthor()` 作者名可见性规则**（故事匿名=1 or 合集 visibility=anonymous，且访问者非 owner/管理员 → 隐藏作者）。`createStar` 支持 `geoInfo{geohash,city,province}` 参数（存储层脱敏，不落库精确坐标）。导出 `buildVisibilityFilter`/`hideAuthorForRows`/`buildCollectionMap`/`attachCatalogStarIds` 供 nearbyService 复用 |
| `collectionService.ts` | 合集业务服务。类型 `CollectionVisibility = 'public' | 'private' | 'anonymous' | 'galaxy'`；`PUBLIC_VISIBILITIES = [public, anonymous, galaxy]`；`SYSTEM_ADMIN_USER_ID = 0`（星穹守护 = 管理员）。`validateCollectionInput` 校验星河仅管理员可创建；`listPublicCollections` 公开合集分页（sort=hot/new/resonance/name_asc/stories_desc，visibility 过滤）；`getPublicCollectionPicks(wanted, galaxyN)` 穹庭书局推荐（前 galaxyN 本官方星河按 sort_order ASC + 最近 14 天 hot 补足 wanted 本）。星河合集（visibility=galaxy）默认 sort_order 用于官方卷轴排序；作者可见性规则封装供 starService 复用 |
| `userService.ts` | 用户 CRUD 业务逻辑 |
| `kernel.ts` | 故事内核（情感标签）提取与匹配服务。含 **`findMatchingStarsForContent(title, content, limit)`** 为未落库的新故事寻找 Top3 最契合的星辰（内核 Jaccard 相似度 Top10 + DeepSeek 语义重排给理由 + 匹配不到时降级选亮星）。**`extractSuggestedTagsForContent(title, content)`** 轻量接口：仅生成 3-5 个 AI 建议标签（不走星星匹配），配合前端 `POST /api/stories/ai-tags` 做实时标签推荐。`getSimilarStars(catalogStarId)` 星 vs 星内核相似度。`generateKernel()` AI 提取内核。 |
| `starAnalysis.ts` | **单星分析读服务**。`computeThemeHour()`（主题 Top8 + 24h 投递分布 SQL 聚合）；`readAnalysis()` 读 catalog_star_analyses 表 + 即时补 themehour |
| `collectionAnalysis.ts` | **合集级 AI 分析服务（Phase 1 同步合成 + 缓存，Phase 2 可平滑接真实 agent pipeline）**。`readCollectionAnalysis(id)` 三步：① getStoriesLite → storyCount；② 查 `collection_analyses` 表命中 & story_hash/storyCount 一致 → 直接反序列化 persona/emotion/nightscape JSON 返回 ready=true；③ 未命中 → `computeHourlyAndThemes()` 做 SQL 聚合（24h时辰分布 UTC+8 + tag+正文关键词 Top8 主题）→ `buildPersona()`（5标签/汉名/金句/2段解读/5维度）+ `buildEmotion()`（思念/孤独/释然/希望/共鸣 5色球权重）+ `buildNightscape()`（合集独有：月相节气/五大气象/心事时间轨迹散点/天窗片段3摘录/时辰peakLow/5情绪洞察/主调3段叙事）→ 写缓存（INSERT...ON CONFLICT DO UPDATE，story_hash 由 md5(id:len:md5(content.slice(0,8))|...) 做内容变了才重算）→ 返回 ready=true。`triggerAnalysisIfNeeded(id)` Phase 1 空占位，Phase 2 接 agent 异步懒生成 ready=false + 写回表。hashStories 幂等保证同内容不会重复跑 |
| `emotionResonanceService.ts` | **情绪共振图谱服务**（nearbyService v2 核心）。三大职责：① `addEmotionResonance(userId, storyId, emotionTags, weight)` 接收用户主动"我也有同感"打标，写入 emotion_resonances + 反哺 user_emotion_profile（source='emotion_resonance'，0.6 权重）+ 建立 emotion_edges 共振边（user_a<user_b 防双向重复，幂等累加 weight）；② `getPersistentEmotionProfile(userId, topN)` 多来源画像聚合（story 1.0 / emotion_resonance 0.6 / resonate 0.3 / view 0.1）+ 30 天半衰期时间衰减，无画像时降级到 story_kernels 即时计算；③ `getEmotionNeighbors(userId, limit)` 共振邻居查询（用于二阶推荐）。配套导出 `boostProfileFromOwnStory`（写故事时反哺）、`boostProfileFromResonate`（共鸣时反哺）、`getViewedStoryIds`（已读集合）、`getEmotionGraph`（图谱可视化）、`getEmotionProfileView`（画像可视化含 VA 分布）。标签校验 `isValidEmotionTag`（中英文 ≤12 字符，每次最多 5 个）。 |
| `amap.ts` | 高德地图 API 封装（逆地理编码） |
| `emailService.ts` | 邮件发送服务 |

### 数据层 `src/data/`

| 文件 | 用途 |
|---|---|
| `ancientFigures.ts` | **古人角色预设**。23 位古人（李白、杜甫、苏轼等），含 `starAssociations`（星体-诗人关联）、`systemPrompt`（角色扮演 Prompt）、`openingTemplate`（开场白模板）。`getFiguresForStar()` 按星名匹配古人 |

### 工具层 `src/utils/`

| 文件 | 用途 |
| --- | --- |
| `response.ts` | 统一响应格式：`ok()`、`badRequest()`、`notFound()`、`serverError()`。<br>**含 `convertKeys` 函数**：自动将 snake_case 键转为 camelCase（如 `image_url` → `imageUrl`），SQL 查询中无需重复别名 |
| `position.ts` | 位置计算工具（3D 星空坐标随机生成，非地理坐标） |
| `geohash.ts` | **Geohash 编码工具**（纯 TS 零依赖）。`encode(lat,lng,precision)` 编码、`decode(hash)` 解码、`neighbors(hash)` 8 邻居网格、`truncate(hash,precision)` k-匿名截断、`PRECISION_LEVELS` 精度常量（3=省/4=城/5=区）。参考 Wikipedia Geohash Z-order curve |
| `emotionModel.ts` | **情绪维度模型**（Valence-Arousal 二维坐标）。基于 Russell (1980) 情感环模型，为 16 个情绪标签预设 VA 坐标（valence -1~1 效价 / arousal 0~1 唤醒度）。`getEmotionCoord(tag)` 取坐标、`vaSimilarity(tagsA, tagsB)` 计算两组标签重心欧氏距离转相似度（能发现"焦虑"和"愤怒"虽标签不同但情绪同频）、`emotionIntensity(tags)` 推断 arousal 均值（高唤醒故事更急需排解）、`isSameResonanceZone(tagsA, tagsB)` 判断是否同一情感象限（distress/sadness/joy/calm/neutral）。供 nearbyService v2 情绪匹配 + emotionResonanceService 画像 VA 分布使用。 |

### 中间件 `src/middleware/`

| 文件 | 用途 |
|---|---|
| `auth.ts` | JWT 认证中间件。`requireAuth` 用于需要登录的路由 |

### 脚本 `server/scripts/`

| 文件 | 用途 |
| --- | --- |
| `seed.ts` | **冷启动数据注入**。历史星（type='history'）初始数据。共鸣/浏览计数用标题+内容的稳定哈希（FNV-1a）生成，**同一内容多次 seed 结果一致，不再 Math.random() 随机假数据**；浏览量按共鸣的 2.2~3.6x 自然比例写入。 |
| `generateKernels.ts` | 故事内核（情感标签）批量生成 |
| `generateAllAnalyses.ts` | **单星分析批量生成**。调用 starAnalysisAgent.runAll()：themehour SQL 聚合 + AI 三段文 / persona 画像 / emotion 情感故事摘录；支持 --ids/--limit/--only/--force/--throttle；对应脚本名 `npm run agent:analyze`；内核脚本为 `npm run agent:kernels` |
| `migrate-origin.ts` | 数据迁移脚本（旧 origin 字段迁移） |
| `seed_user_stories.ts` | 用户故事种子数据（type='user'，30 颗星 × 2 条 = 60 条）。resonance_count 手写固定值；view_count 按标题+内容稳定哈希 × 2.0~3.0x 比例算出，保证多次 seed 稳定无随机。 |
| `migrate-default-collections.ts` | 为所有用户创建「公开星笺 + 私密星笺」双默认合集；把以前没有归属合集的用户故事（type='user', collection_id NULL）归入「公开星笺」。幂等：重复执行安全，已有合集的故事不动。命令：`npm run migrate:default-collections`。 |
| `seed-history-collections.ts` | **为 477 条历史故事创建 8 个主题合集并自动归类**。合集 owner 是用户表自动创建的「星穹守护」系统用户，全部 public。8 个合集按 origin + 标题关键词匹配，优先级从高到低：①月韵·唐诗中的星空（10 首唐诗）②星官故实（143 篇·中国星官/星宿/`·由来` 标题）③奥林匹斯星河（63 条·古希腊/希腊语/拉丁语/罗马语）④阿拉伯星名考（95 条·阿拉伯语/苏美尔/巴比伦/古埃及）⑤近代星名志（82 条·近代/现代命名）⑥星界编年史（72 条·天文学+跨文化）⑦天汉神话（7 条·中国天文神话：夸父/嫦娥/启明/彗星等）⑧星友之声（5 条·社区 origin=NULL 原创心声）。幂等：合集按 name 精确复用；仅补写 collection_id 为 NULL 的历史故事。命令：`npm run seed:history-collections`。 |
| `fix-invalid-catalog-star-ids.ts` | 修复 stars 表中坏故事的归属星：catalog_star_id 为 NULL、负数非行星、正数不在 catalog 范围的故事，随机挂到有效 catalog 星上，并补写 `story_catalog_stars` 连接表。命令：`npm run fix:catalog`。 |
| `story-rewrite-prompt.md` | 故事改写 Prompt 参考 |
| **`AGENT_CONTROL.md`** | **Agent 控制手册**。Key 配置、冷启动、agent:kernels、agent:analyze 参数、幂等&安全、常见 401/429 排查、自动再生闭环、部署自检清单（**部署必读**） |
| `fix-cids.mjs` | 修复 catalog_star_id 脏数据（历史迁移，异常场景才用） |

### AI 分析 Agent `src/agents/`

| 文件 | 用途 |
| --- | --- |
| `starAnalysisAgent.ts` | **分析总控 Agent**。`ensureOne()` 单星懒生成（story_hash 幂等 + 1200ms 节流 + partial 入库）；`runAll()` 批量按故事数 DESC + 亮星优先级排序；`upsertAnalysis()` 写 catalog_star_analyses 表 |
| `collectionAnalysisAgent.ts` | **合集级 AI 分析总控 Agent（Phase 2 预留，当前无文件，待接真实 pipeline）**。将复用 personaGen/emotionGen 并新增 nightscapeGen 做夜空意象/夜色流转/心事轨迹五大气象模型生成；`triggerAnalysisIfNeeded()` 会检查 ready=false → 启动异步任务 → 写 `collection_analyses` 表回 ready=true 给前端轮询拉到 |
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
| --- | --- |
| `src/main.ts` | **前端入口**。创建 Vue App、注册路由、挂载 PrimeVue |
| `src/App.vue` | 根组件（路由出口） |
| `index.html` | HTML 入口 |
| `vite.config.ts` | Vite 配置。含 `/api` 代理到 `localhost:3000` |
| `package.json` | 依赖与脚本：`dev`（Vite）、`build`（vue-tsc + vite） |
| `tsconfig.json` | TypeScript 编译配置 |
| `src/env.d.ts` | TypeScript 环境声明 |

### 页面 `src/pages/`

| 文件 | 用途 |
| --- | --- |
| `SkyPage.vue` | **星空主页**。定位、城市选择面板、3D 画布、星体点击处理（`onStarClick`/`onPlanetClick`，进入行星特写模式）、关闭详情退出特写（`onCloseDetail` 调 `exitCloseup`）、故事表单、导航栏**行星轨迹开关**（Orbit 图标，调 `setPlanetTrailsVisible`，黄道线作为太阳轨迹始终显示）、移动端底部「凝听星语」按钮（吸附星体后滑入，issue #124；issue #134 扩展支持行星：按钮区分恒星/行星，行星入口只打开故事面板不进入特写）；**PC 端行星特写观察模式**（issue #136）：`planetObserveMode` ref + document click 监听实现点击空白进入观察模式（隐藏故事面板露出行星）、任意点击切回故事模式；**「记录」功能入口**：导航栏 PenLine 按钮打开 `StoryForm` auto-match 模式 → `useStarMatching` 调 `/api/stories/match-star` → 展示 Top3 候选星面板 → 用户选星 → 相机飞行 + 高亮 + 打开 StarDetail；**天镜览星模式**：导航栏 ApertureIcon 按钮 → `useCameraMode(sky, stars)` → `CameraOverlay` v-if 分叉渲染 PC（取景框+HUD+故事列表）/移动端（方案D 单卡片轮播）→ ESC 退出/路由离开自动清理；sky Proxy 代理转发（SkyCanvas 挂载前同步调用 useCameraMode） |
| `HomePage.vue` | 首页/登录页。粒子星空背景 + 左右分栏（品牌意境/登录注册表单），含找回密码、匿名访客体验；移动端可竖向滚动（issue #124）。左右面板带入场动画（从下 14px + 淡入，延迟 0.05s/0.22s，与开场黑幕衔接） |
| `WelcomePage.vue` | **开场页**（`/welcome`）。纯编排层：`useParticleSky` 星空背景 + OpeningHero/OpeningLetterbox/OpeningTransition 拼装 + 点击时序状态机（phase: idle→entering→gone）。点击全屏 → 遮幅收缩(880ms) + 闪光灯(0.9s) + 黑幕(1.22s) + 震动/toast → 黑幕全覆盖后记 `sessionStorage.welcomed` → 有 token 跳 `/sky`，无 token 跳 `/` |
| `ProfilePage.vue` | **个人空间页** (Style D 叙事沉浸式)。固定 Topbar（罗马数字按钮 Ⅰ返航/Ⅱ题刻/Ⅲ密钥/Ⅳ离开）+ 480px 月亮 Hero（含邮箱展示）+ 金线 banner/签名；时间轴默认 5 条+点击展开+5、左右交替卡片；私人星座 SVG 椭圆节点最多 12 + 内核虚线连线；典藏星展 Favorites 错叠 4 卡 shift 拼贴取消收藏；5 Modal 统一换肤（签名/星穹之钥密码+找回链接/退出登录确认/故事详情/摘取确认）+ Gold Flash 成功反馈。authFetch 401 兜底自动跳登录。响应式 768/380 双断点（移动端顶部设置弹窗）；Prefers-reduced-motion 全停动画；**星笺 section 头右侧「穹庭书局逛逛」胶囊**跳 `/folios` |
| `FolioSquare.vue` | **穹庭书局 · 星笺广场主页** (`/folios`)。银河渐变背景+固定顶栏（返航/品牌/搜索/写星笺/刷新/回天际）+ 筛选条（分类 tab / 排序 chip / 搜索）+ 官方「星河八卷轴」横向画卷（仅 visibility=galaxy 官方星笺）+ 本周推荐三笺（官方 3 本 + 热榜补足，用 FolioGrid 大卡）+ 书架栅格（FolioGrid，分页无限滚动；showOwner 显示作者名；非 owner 点击打开 `/folios/:id` 全屏页）+ **右下角回顶部悬浮按钮**（顶部栏滚出可视区域时显示，点击平滑回顶；已放弃"下滑隐藏/上滑弹出"方案） |
| `FolioDetail.vue` | **星笺详情页** (`/folios/:id`)。无 Modal 壳的全屏展示，复用 `CollectionDetail/index.vue`；顶栏返回广场胶囊 + 右侧「更多星笺」胶囊；星河合集卷目疏/典藏谱系版展示 |

### 组件 `src/components/`

| 文件 | 用途 |
| --- | --- |
| `SkyCanvas.vue` | **3D 画布组件**。挂载 `useSky`、代理点击/悬停/准星吸附事件（`starClick`/`starHover`/`starHoverLong`/`planetClick`/`snapChange`） |
| `OpeningHero.vue` | **开场文案层**。金描标题「星语穹庭」（金色渐变字 + 金辉）+ STARS EMPATHY 金线副标 + 中文副标 + 居中「点击进入」呼吸提示；挂载后 .in 类触发错落入场 |
| `OpeningLetterbox.vue` | **电影遮幅**。上下 2.35:1 黑色遮幅（14.24vh）+ 金色内阴影；exit prop → height 收缩至 0（880ms），入场 .in 从 0 拉高 |
| `OpeningTransition.vue` | **切页过渡层**。闪光灯（.flash 0.9s 爆闪消散）+ 黑幕淡入（.fader 1.22s 到全黑）；trigger prop，黑幕覆盖后 emit `after` |
| `StarDetail/index.vue` | **星星详情容器**。状态管理、布局编排、PC端 4 个 Tab（AI 叙事/历史故事/用户故事/我的故事）+ 移动端 5 个 Tab（含星信息）、标签编辑、删除确认；**PC 端行星特写观察模式**（issue #136）：`isPlanetCloseup`/`observeMode` prop 控制 overlay 点击行为分叉（行星特写时点击空白切换观察模式而非关闭），观察模式下隐藏故事面板+移除模糊背景露出 3D 行星 |
| `StarDetail/StoryCard.vue` | 故事卡片子组件（4 个 Tab 复用） |
| `StarDetail/StoryDetail.vue` | 故事详情子组件（标题、正文、共鸣、删除）。含 `hideToolbar` prop：外层已有返回/共鸣/删除入口时隐藏内部 `.detail-toolbar` 避免双栏（移动端全屏故事详情用） |
| `StarDetail/StoryList.vue` | 故事列表子组件（搜索、排序、卡片列表、空状态） |
| `StarDetail/StarHeader.vue` | 星星概要子组件（名称、星座、颜色） |
| `StarDetail/StarInfoPanel.vue` | 信息面板子组件（视星等/距离/色温/亮度、统计、天文事件、月相、北极星岁差科普） |
| `StarDetail/SimilarStarsPanel.vue` | **内核相似的星星面板**（PC端 AI 叙事 Tab 下方左栏 + 移动端 info tab） |
| `StarDetail/AreaHighlightsPanel.vue` | **天区故事精选面板**（PC端 AI 叙事 Tab 下方右栏 + 移动端 info tab） |
| `StarDetail/BottomBar.vue` | 底部操作栏子组件（写故事、收藏、与古人共赏） |
| `StarDetail/MobileTabSelect.vue` | 移动端下拉 Tab 选择器（替代 PC 端 Tab 栏） |
| `StarDetail/MobileActionSheet.vue` | 移动端底部 Action Sheet（删除确认，3 秒倒计时） |
| `CollectionDetail/index.vue` | **合集详情容器**（镜像 StarDetail 双栏布局）。PC 端左栏 tab（**AI 解读默认首个**/故事列表/合集列表）+ 右栏合集信息（描述/**4 列统计 故事/共鸣/浏览/收藏**/活跃时辰热力/故事时间轴/高频标签/编辑删除）；移动端底部抽屉 + 全屏故事详情。故事缩略/详细中 tag 上方显示**星星归属**（挂在哪颗星上）而非合集徽章（`showStarBelonging` 透传）。复用 StoryList/StoryDetail/CollectionAnalysis，内部处理共鸣/删除（optimistic）。从 ProfilePage 合集卡片和 SkyPage 故事详情合集徽章两处打开（此时为 Overlay，owner=编辑删除；**非 owner=底部「🌌 更多星笺·穹庭书局」胶囊**跳 `/folios`）。**AI 解读 Tab PC/移动端都传 `collectionId` props**，保证 useCollectionAnalysis composable 能调后端 GET `/api/collections/:id/analysis` 接口。**星河合集** visibility=galaxy 时，活跃时辰 → 卷目疏，故事时间轴 → 典藏谱系。**扁平整页复用（flatMode）**：FolioDetail 传 `flat-mode=true` 时移动端不再用底部抽屉/拖拽/遮罩，内容直接以整页形式嵌入父页面（tab 栏 sticky 吸顶 offset 84px 对齐外层顶栏），独立路由页 `/folios/:id` 使用；PC 端仍由父页 :deep 拍平 Modal 壳 |
| `CollectionDetail/CollectionAnalysis.vue` | **合集 AI 解读组件（已接入 agent）**。**三态切换 v-if**：① 故事数 <3 → StarDetail 同款 BookDashed 空态「心事不够多」不生成；② loading（ready=false轮询中） → Sparkle + skeleton-lines shimmer 骨架屏动画；③ ready=true → 全量真实内容渲染。内容板块：星辰归属散点星图 + 四小指标+星辰速览+光谱主流+星座Top3品质标签、夜观手记（笺卷小卡+汉名+双段叙事+五大气象紧凑5列小卡）、**AI选本·代表故事**（1列纵向卡片；每条含 AI 荐语（reason，Sparkles 图标+「荐：」前缀，有神韵的短句如「「思念」最入心」）+ 节选内容；扁平卡片无光辉）、天窗片段（时辰贴纸+夜色小窗3种插画+摘录）、时辰热力（24珠子热力+高峰低谷洞察）、共鸣榜+情感轨迹双栏（Top3共鸣卡+时间线节点展开收起）。星河合集（isGalaxy）下：夜观手记 → 卷目疏（古籍八目录卷轴式）；共鸣榜/情感轨迹 → 典藏谱系。引入 `useCollectionAnalysis(collId)` composable 轮询接口，所有 computed 从 API 返回值兜底到 mock，保证绝不空白 |
| `StarNarrative.vue` | AI 叙事展示组件（Markdown 渲染） |
| `AncientChat.vue` | **与古人共赏**聊天抽屉。古人选择 → SSE 流式聊天 |
| `StoryForm.vue` | 投递心事表单。两种 `mode` prop：**`bind-star`**（预绑定 catalogStarId，原行为） vs **`auto-match`**（未选星，点「寻找归属星辰」emit `requestMatch` 给父组件，匹配后父组件通过 ref 调 `doSubmit(catalogStarId)` 真正提交）。auto-match 模式下提供 3 步进度遮罩（提取内核 / 夜空寻星 / 判断缘分）。**实时 AI 标签推荐**：标题+正文变化 600ms debounce → `POST /api/stories/ai-tags`，推荐标签与匹配接口回传的 `suggestedTags` 合并去重后展示，两种模式都启用。暴露：`defineExpose({ doSubmit, resetForm })`。 |
| `SettingsModal.vue` | 设置面板（API Key 管理、显示配置）。**已废弃**：API Key 改为服务器内置后，SkyPage 不再引用此组件，保留文件供未来可能复用 |
| `LoadingScreen.vue` | 加载动画 |
| `LegendToggle.vue` | 图例开关 |
| `CollectionGrid.vue` | 个人主页 合集网格（兼容包装，内部委托 `FolioGrid`）：空态 + 新建卡片 + 卡片列表；editable=true 显示编辑/删除操作，点击 emit create/open/edit/delete |
| `FolioGrid.vue` | **星笺卡片公共栅格组件**（FolioSquare 书架 + 推荐三笺 + Profile CollectionGrid 三合一复用）。props：collections / loading / error / size=default | large / showOwner 显示作者名 / editable / variant=bookshelf 书架卡片卷首样式。内部生成卡片+空态卡片+加载骨架。emit：open / create / edit / delete。与个人主页保持统一视觉：金棕 coverColor 细边 + 徽标 |
| `CollectionBadge.vue` | 合集可见性徽章（public 公开/private 私有/anonymous 匿名/galaxy 星河），不同颜色和 SVG 图标（Galaxy 别名 Sparkles） |
| `CollectionEditModal.vue` | 合集创建/编辑弹窗。表单：名称/描述/封面颜色/可见性（public / private / anonymous；仅 SYSTEM_ADMIN_USER_ID=0 显示「星河」选项）；创建时默认首选项 |
| `CollectionPicker.vue` | 故事投递时的合集选择器：下拉列表已有合集 + 「+新建星笺」弹窗内联，匿名/星河可见性选项创建时暴露 |

### 组件 `src/components/CameraMode/` — 天镜览星（Camera Mode）

| 文件 | 用途 |
| --- | --- |
| `CameraOverlay.vue` | **容器组件**。按 `isMobile` 分叉渲染 PC/移动端子组件，管理故事卡片状态。PC 端组合 Viewfinder+CameraHud+ViewportInfo+ZoomFilterControl+FrameStoriesPanel；移动端（方案D 单卡片轮播）组合 MobileCameraHud+MobileGalleryPanel；两端共用 StoryDetailCard。移动端事件流：`activeChange`（卡片切换同步 activeStarId，不飞镜头）+ 复用 `storyClick`（点击卡片飞镜头+开详情）。通过 `defineExpose` 暴露 panelRef 供父组件调用滚动居中 |
| `Viewfinder.vue` | **PC 端取景框 overlay**。边框（inset:0 贴近视口边缘，包含顶部 HUD 与底部参数栏）+四角标记+九宫格网格+暗角+**贯穿中心的相机十字准星**（横竖两条贯穿屏幕的细线 + 中心 16px 十字标记，模拟相机取景器）。级联进入动画（纯 opacity，避免 transform 残留导致拖动时抖动） |
| `CameraHud.vue` | **PC 端顶部/底部 HUD**。EXIT 按钮+PHOTO MODE 录制指示+RA/DEC/FOV 坐标 chip+底部 ISO/快门/光圈参数+日期时间 FPS。requestAnimationFrame 实时更新。HUD 容器 `will-change: opacity` + `backface-visibility: hidden` 提升为独立合成层，避免 canvas 重绘时文字抖动；进入动画纯 opacity 无 transform |
| `ViewportInfo.vue` | **PC 端左上角天区信息**。显示取景框内亮星数量与故事总数，按数量推断天区名称 |
| `ZoomFilterControl.vue` | **PC 端左下角缩放+模式切换**。ZOOM 滑块（Ⅰ~Ⅳ 罗马数字档位）+ MODE 二选一互斥按钮（观星 gazing / 听语 listening），emit setZoom/setMode |
| `FrameStoriesPanel.vue` | **PC 端右下角故事列表**。接收 `mode` prop，按星去重（catalogStarId 优先）：观星模式展示星星介绍（STARS IN FRAME），听语模式展示情感故事（VOICES IN FRAME，未看过+共鸣高优先）。点击触发居中滚动+飞镜头+打开详情。`defineExpose({ scrollToCardCenter, isCardCentered })` 供父组件协调交互时序 |
| `MobileCameraHud.vue` | **移动端顶部 HUD**。双行布局：第一行 EXIT 按钮+天区名，第二行观星/听语模式切换按钮。slide-down 进入动画 |
| `MobileGalleryPanel.vue` | **移动端底部单卡片横滑轮播**（方案D 化核心组件）。替代 BubbleLayer+ZoomStageIndicator：底部固定画廊，header 标题+翻页按钮，单卡片轨道横向滑动切换（touchend 水平位移 > 40px 判定），小圆点分页器。滑动=浏览摘要不飞镜头；点击卡片 emit clickStory 飞镜头+开详情。activeIdx 变化 emit activeChange 同步 activeStarId。stories 变化时保持当前星或回到首位。按 mode 切换观星/听语文案与 meta（听语多 viewCount/时间）。复用 CameraIcons 图标 |
| `StoryDetailCard.vue` | **两端共用故事卡片**。Teleport+Transition 实现，PC 端居中弹出（scale+translate），移动端底部滑入（translateY）。含星名（catalogStarId 优先取 `getStarDisplayName` 真实星名，避免与故事标题重复）/标题（与星名不同时才显示）/正文/meta/标签/共鸣按钮（含访客拦截）。使用 useResonate 实现共鸣操作 |
| `icons/CameraIcons.ts` | **相机模式 SVG icon 集合**。17 个函数式组件（ApertureIcon/ChevronLeftIcon/ChevronRightIcon 翻页右箭头/CloseIcon/BookOpenIcon/SparklesIcon/FlameIcon/MapPinIcon/ScrollIcon/HeartIcon/EyeIcon/CompassIcon/ClockIcon/CrosshairIcon/TelescopeIcon 观星/MessageCircleIcon 听语/GalleryIcon 画廊四宫格），统一 `viewBox 0 0 24 24` + `stroke=currentColor` + `stroke-width=1.8`，供 Phase 4-6 相机模式组件使用。禁用 emoji 字符（AGENTS.md 规范） |

### 核心逻辑 `src/composables/`

| 文件 | 用途 |
| --- | --- |
| `useSky.ts` | **Three.js 渲染核心**。天球体、银河、星座连线、行星渲染（物理直径比例+halo辅助光点）、Raycaster 点击检测、相机控制、行星特写状态机（IDLE/TWEENING/CLOSEUP/EXITING，含 `preCloseupCamera` 快照实现望远镜效果——退出特写回到进入前的相机视角而非固定原点；进入特写隐藏 planetHoverGlow+halo 避免闪光弹；观察模式下滚轮/pinch 拉远到 maxDist 时 clamp 而非退出 CLOSEUP，issue #144）、行星 hover 淡光晕（与恒星 hover 互斥，按行星色 tint）、移动端准星吸附（`onSnapChange` 回调 + `releaseSnap` 主动释放，issue #124；issue #134 扩展支持行星吸附，导出 `SnapTarget` 类型区分恒星/行星，吸附行星时 tooltip 显示行星名）；**行星视运动轨迹**存储于 `planetTrailLines` 数组，`setPlanetTrailsVisible(v)` 切换显示（黄道线作为太阳轨迹始终显示）；**天镜览星 API**：`flyToStar3D`（670ms 两段式飞行动画——前 35% 缩小 FOV 到 75°+朝向 slerp 到目标星，后 65% 移动并放大到目标 FOV，全程相机 lookAt 目标星保持居中）、`cancelFly`、`getStarsInFrame`（Frustum 视锥过滤+屏幕坐标投影+RA/Dec 计算）、`onCameraFrame`（帧回调订阅）、`getCenterCelestial`、`setCameraModeOverlay`（进入时保存相机快照 pos/quat/fov 到 `cameraModeEnterPos/Quat/Fov`，接受 storyStars 创建呼吸 glow Sprite）、`exitCameraModeWithTween`（退出时 800ms tween 回到进入时的相机快照）、`cameraZoomLevel` ref |
| `useStars.ts` | 星星数据获取、过滤、本地更新。**天镜览星派生字段**：`isNew`（24h 内）、`isHot`（resonanceCount ≥ HOT_THRESHOLD）、`isAncient`（type='history'）、`isNear`（地平线可见，由 useCameraMode 更新） |
| `useCameraMode.ts` | **天镜览星模式总控**。模式状态机（IDLE/SCROLLING/FLYING/DETAIL_OPEN）、取景框星过滤（节流 400ms）、故事列表派生（`CameraFilters.mode` 互斥：gazing 观星 / listening 听语；按 catalogStarId 去重每星一卡：观星优先 history 故事，听语优先 user 故事+未看过+共鸣高）、点击协调（PC 居中滚动+飞镜头+卡片；移动端飞镜头+卡片）。导出 `markStarSeen(starId)` 用 localStorage 记录已看故事星，影响听语模式排序 |
| `useNarrative.ts` | 叙事 API 调用封装。`fetchNarrative()` 含 `lat`/`lng`/`ra`/`dec` 参数 |
| `useResonate.ts` | 共鸣操作（乐观更新） |
| `useKernel.ts` | 故事内核（情感标签）提取 |
| `useStarMatching.ts` | **「记录」归属星辰匹配封装**。`matchStars(title, content, limit)` → POST `/api/stories/match-star` → 返回 Top3 `MatchCandidate[]`。`step` 1/2/3 进度自动推进（配合 StoryForm 匹配遮罩）。`reset()` 中断+清状态 |
| `useCollectionAnalysis.ts` | **合集 AI 分析 composable（对齐 useStarAnalysis 三态模式）**。`useCollectionAnalysis(collectionId: Ref<number | null>, { pollIntervalMs=3000, maxPolls=20 })` → 轮询 GET `/api/collections/:id/analysis`。三态：①`tooFewStories=true`（故事<3后端明确返回） → 立即停，前端显空态；②`ready=false & not tooFew` → 每 POLL_INTERVAL 再拉直到 ready=true 或 MAX_POLLS 次；③ `ready=true` → 停。返回 `{ analysis, loading, error, fetchAnalysis, reset }`。`inflightSeq`竞态保护（watch collectionId 变化时 reset + 新 id fetch，旧 inflight 结果丢弃），onBeforeUnmount 清 pollTimer + destroyed 标志防写 ref。`CollectionAnalysis` 类型 persona/emotion 复用 `useStarAnalysis`的 PersonaPayload/EmotionPayload，`nightscape` 为合集独有 NightscapePayload |
| `useSimilarStars.ts` | 相似星星推荐 |
| `useAreaHighlights.ts` | 天区故事精选 |
| `useAstroEvents.ts` | 天文事件计算（日月出没、行星可见性） |
| `useParticleSky.ts` | 粒子背景动画 |
| `useFlickerVignette.ts` | 开场入场闪烁噪点（200ms 三次闪烁暗角），`start()` 触发 .on 类 |
| `useScreenShake.ts` | 屏幕震动反馈。`navigator.vibrate(12)` + CSS `.screen-shake` 类 fallback（关键帧定义在 WelcomePage 全局样式块） |
| `useMediaQuery.ts` | 响应式断点检测（768px PC/移动端分界） |

### 数据 `src/data/`

| 文件 | 用途 |
| --- | --- |
| `stars.json` | **星表数据**。6142 颗恒星预计算 3D 坐标（由 `generateStarCatalog.ts` 离线生成） |
| `planets.ts` | 行星数据。`BODY_MAP`（名称映射）、`getBodyPosition()`（实时 RA/Dec 计算）、`getMoonPhase()`、`getSolarTerm()`、视运动轨迹。size 字段为物理直径比例（以太阳 1,392,700km=5.0 为基准） |
| `constellations.json` | 星座连线数据 |
| `starInfo.ts` | 恒星附加信息（星座中文名、距离） |
| `asteroids.ts` | 小行星数据 |
| `comets.ts` | 彗星数据 |

### 工具 `src/utils/`

| 文件 | 用途 |
| --- | --- |
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
| --- | --- |
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
| --- | --- |
| `textures/planets/` | 行星纹理贴图（太阳、月球、水星、金星、火星、木星、土星、天王星、海王星） |
| `textures/skybox/` | 银河背景贴图 |

---

## docs/ — 设计文档 & 实现计划

按 superpowers 工作流规范：先写 Spec，再生成实现计划。

### 设计规范 `docs/superpowers/specs/`

| 文件 | 用途 |
| --- | --- |
| `2026-07-31-personal-space-ui-style-d-design.md` | **个人空间界面优化设计规范**。Style D（叙事沉浸式）完整 Spec：美学方向、颜色 token、字体层级、4 大段结构、交互流程、数据/API 映射、响应式规则、无障碍、验收清单 |
| `2026-08-02-mobile-login-and-story-button-design.md` | **移动端登录页适配 + 凝听星语按钮设计规范**（issue #124）。登录页可滚动 + 移动端进入故事改用底部「凝听星语」按钮（吸附星辰后滑入）替代触屏点击 |
| `2026-08-04-story-collection-folio-design.md` | **故事合集（星笺）设计规范**。合集=故事唯一系列标识（非收藏夹）：`collections` 表 + `stars.collection_id` 列；投递故事时选合集；合集 `visibility` 决定内含故事可见性（public/private）；与 favorites/星星归属正交。含数据模型、API、可见性过滤逻辑、前端模块、P1–P4 路线图与验收清单 |

### 实现计划 `docs/superpowers/plans/`

| 文件 | 用途 |
| --- | --- |
| `2026-07-31-personal-space-ui-style-d.md` | **个人空间 Style D 实现计划**。Subagent-Driven 8 任务分解（色板→骨架→时间轴→星座→星展→Modal→响应式→终检）+ 每任务 2 阶段审核 (spec compliance + code quality) + 规范 commit 信息，对应分支 `fix/personal-space-ui-optimization` |
| `2026-07-28-story-image-upload-markdown.md` | 故事图片上传 + Markdown 正文支持 实施计划 |
| `2026-07-28-story-panel-tabs.md` | StarDetail 4→5 Tab 重构 实施计划 |
| `2026-07-27-narrative-bugs-fix.md` | AI 叙事行星/相似星/天区高亮 Bug 修复计划 |

---

## designs/ — 设计素材与原型

| 路径 | 用途 |
| --- | --- |
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
| --- | --- |
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
| --- | --- |
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
<<<<<<< HEAD
| 添加前端新页面 | `client/src/pages/` 新建，`client/src/router/index.ts` 注册（开场页 `/welcome` 守卫逻辑也在 router/index.ts：新会话访问根路径 `/` 一律先看开场——无论登录态，`sessionStorage.welcomed` 会话内只播一次，刷新不重放、新开标签页重播；已登录看完开场 → `/sky`，未登录 → 登录页） |
=======
| 修改/新增 **附近的人的心事 + 情绪共振图谱**（geohash 邻近 + 情绪画像 + 共振边 + 二阶推荐 + MMR 多样性 + ε-greedy 探索） | `server/src/services/nearbyService.ts`、`server/src/services/emotionResonanceService.ts`、`server/src/utils/emotionModel.ts`、`server/src/utils/geohash.ts`、`server/src/routes/stories.ts`、`server/src/db.ts`（三张图谱表） |
| 添加前端新页面 | `client/src/pages/` 新建，`client/src/router/index.ts` 注册 |
>>>>>>> 667d90c (feat(emotion): 情绪共振图谱系统 — 附近的人的心事 v2 升级)
| 修改 CSS 设计 token | `client/src/styles/variables.css` |
| 修改部署流程 | `deploy/`、`.github/workflows/deploy.yml` |
