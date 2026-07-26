# 星语穹庭 (Star Language Dome) — Code Wiki

> 3D 星空情绪表达平台。用户匿名将心事"挂"在星星上，浏览历史星空故事和他人心事，通过"共鸣"形成弱连接。

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术架构](#2-技术架构)
3. [仓库结构总览](#3-仓库结构总览)
4. [后端 (server/)](#4-后端-server)
   - [入口与中间件](#41-入口与中间件)
   - [数据库架构](#42-数据库架构)
   - [路由层](#43-路由层)
   - [服务层](#44-服务层)
   - [工具函数](#45-工具函数)
   - [脚本](#46-脚本)
5. [前端 (client/)](#5-前端-client)
   - [入口与路由](#51-入口与路由)
   - [页面 (Pages)](#52-页面-pages)
   - [组件 (Components)](#53-组件-components)
   - [Composables](#54-composables)
   - [状态管理 (Stores)](#55-状态管理-stores)
   - [工具函数 (Utils)](#56-工具函数-utils)
   - [数据文件 (Data)](#57-数据文件-data)
   - [样式系统](#58-样式系统)
6. [依赖关系图](#6-依赖关系图)
7. [API 完整参考](#7-api-完整参考)
8. [运行与部署](#8-运行与部署)

---

## 1. 项目概述

**星语穹庭**是一个基于 3D 天球渲染的匿名情绪表达平台。核心体验：

- 用户可以看到一个真实的星图（基于真实星表数据），每颗恒星在天球上精确渲染
- 每颗恒星下方可以挂载用户投递的"心事"（故事），以及预置的历史文化典故
- 用户可以浏览、共鸣（点赞）他人故事，收藏感兴趣的恒星
- 通过 DeepSeek AI 为每颗恒星生成"古今共望"叙事短文
- 支持基于地理位置定位的天球旋转（天空与实际观测方向一致）

---

## 2. 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│  ┌───────────────────────────────────────────────┐  │
│  │         Vue 3 + Vite + TypeScript             │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────┐  │  │
│  │  │ HomePage │  │ SkyPage  │  │ ProfilePage│  │  │
│  │  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │  │
│  │       │             │              │          │  │
│  │  ┌────┴─────────────┴──────────────┴───────┐  │  │
│  │  │         Composables / Stores            │  │  │
│  │  │  useSky useStars useNarrative useAuth   │  │  │
│  │  └──────────────────┬──────────────────────┘  │  │
│  │  ┌──────────────────┴──────────────────────┐  │  │
│  │  │          Three.js (3D 天球渲染)          │  │  │
│  │  │  astronomy-engine (行星位置计算)         │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│                         │  HTTP /api/*              │
└─────────────────────────┼───────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────┐
│                    Express Server                    │
│  ┌──────────────────────┴──────────────────────┐    │
│  │  Middleware: helmet, cors, rate-limit, JWT  │    │
│  ├─────────────────────────────────────────────┤    │
│  │  Routes: auth, stories, catalog, profile,   │    │
│  │          stats, search, narrative            │    │
│  ├─────────────────────────────────────────────┤    │
│  │  Services: starService, userService,        │    │
│  │            narrative, deepseek               │    │
│  ├─────────────────────────────────────────────┤    │
│  │  Database: node:sqlite (SQLite)             │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**核心技术栈：**

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Vue 3 + TypeScript | Composition API + `<script setup>` |
| 构建工具 | Vite 6 | 快速 HMR，代理 /api 到后端 |
| 3D 渲染 | Three.js 0.170 | 天球渲染、星座连线、粒子系统 |
| 天文计算 | astronomy-engine 2.1 | 行星真实位置、黄赤坐标转换 |
| UI 组件库 | PrimeVue 4.5 + Lucide Icons | 主题变量、图标 |
| 后端框架 | Express 4 + TypeScript | REST API |
| 数据库 | node:sqlite (Node 内置) | 零外部依赖 SQLite |
| 认证 | bcryptjs + jsonwebtoken | JWT 鉴权 |
| AI 叙事 | DeepSeek API | 恒星「古今共望」叙事生成 |

---

## 3. 仓库结构总览

```
star-/
├── AGENTS.md                      # 项目全局指令（给 AI Agent 的上下文）
├── CHANGELOG.md                   # 变更日志
├── CODE_WIKI.md                   # 本文档
├── toA.md                         # 部署指南
├── server/                        # 后端 Express 应用
│   ├── package.json               # 依赖：express, bcryptjs, jsonwebtoken...
│   ├── tsconfig.json              # TS 编译配置 (CommonJS, ES2022)
│   ├── data/
│   │   └── stars.db               # SQLite 数据库文件（运行时生成）
│   ├── scripts/
│   │   ├── seed.ts                # 冷启动数据注入（58 条历史故事）
│   │   ├── seed_user_stories.ts   # 用户故事种子数据
│   │   ├── migrate-origin.ts      # 数据迁移脚本
│   │   └── story-rewrite-prompt.md # AI 故事改写 Prompt 模板
│   └── src/
│       ├── index.ts               # 应用入口（Express 配置 + 路由挂载）
│       ├── db.ts                  # SQLite 数据库初始化 + 建表
│       ├── middleware/
│       │   └── auth.ts            # JWT 鉴权中间件
│       ├── routes/
│       │   ├── auth.ts            # 注册/登录/访客/签名
│       │   ├── stories.ts         # 故事 CRUD + 共鸣（新规范路由）
│       │   ├── stars.ts           # 旧路由兼容（/api/stars/*）
│       │   ├── catalog.ts         # 恒星统计/故事/收藏
│       │   ├── narrative.ts       # AI 叙事接口
│       │   ├── profile.ts         # 个人主页（我的故事/收藏）
│       │   ├── stats.ts           # 全局统计
│       │   └── search.ts          # 恒星搜索
│       ├── services/
│       │   ├── starService.ts     # 故事/恒星核心业务逻辑
│       │   ├── userService.ts     # 用户认证/注册业务逻辑
│       │   ├── narrative.ts       # 叙事生成服务（含缓存）
│       │   └── deepseek.ts        # DeepSeek API 封装
│       └── utils/
│           ├── response.ts        # 统一响应格式 + snakeToCamel
│           └── position.ts        # 随机 3D 坐标生成
│
├── client/                        # 前端 Vue 3 应用
│   ├── package.json               # 依赖：vue, three, primevue...
│   ├── tsconfig.json              # TS 编译配置 (ESNext, bundler)
│   ├── vite.config.ts             # Vite 配置（代理 /api → :3000）
│   ├── index.html                 # 入口 HTML
│   ├── scripts/
│   │   └── generateStarCatalog.ts # 离线生成星表 3D 坐标
│   └── src/
│       ├── main.ts                # Vue 应用入口
│       ├── App.vue                # 根组件（仅含 RouterView）
│       ├── env.d.ts               # 类型声明
│       ├── router/
│       │   └── index.ts           # Vue Router 配置（3 条路由）
│       ├── stores/
│       │   └── auth.ts            # 认证状态管理（composable 风格）
│       ├── pages/
│       │   ├── HomePage.vue       # 登录/注册/访客页面
│       │   ├── SkyPage.vue        # 3D 星空主页面
│       │   └── ProfilePage.vue    # 个人主页
│       ├── components/
│       │   ├── SkyCanvas.vue      # 3D 天球画布（封装 useSky）
│       │   ├── StarDetail.vue     # 星星详情面板（故事列表 + 恒星信息）
│       │   ├── StarNarrative.vue  # AI 叙事展示组件
│       │   ├── StoryForm.vue      # 投递心事表单
│       │   ├── LoadingScreen.vue  # 加载动画
│       │   └── LegendToggle.vue   # 图例切换（历史/用户/共鸣）
│       ├── composables/
│       │   ├── useSky.ts          # Three.js 3D 天球渲染核心（~940 行）
│       │   ├── useParticleSky.ts  # 粒子星空背景（登录页用）
│       │   ├── useStars.ts        # 故事数据获取与过滤
│       │   ├── useNarrative.ts    # AI 叙事获取
│       │   └── useResonate.ts     # 共鸣操作
│       ├── utils/
│       │   ├── astro.ts           # 天文数学（儒略日、恒星时、坐标转换）
│       │   ├── constants.ts       # 3D 渲染常量（天球半径、FOV 等）
│       │   ├── sphereMapping.ts   # 坐标映射（立方体 → 球面）
│       │   └── storyMappings.ts   # 种子故事 → 恒星映射
│       ├── data/
│       │   ├── stars.json         # 预计算星表数据（500+ 颗恒星）
│       │   ├── new_lines.json     # 补充星座连线
│       │   ├── constellation_labels.json  # 星座名称标签位置
│       │   ├── planets.ts         # 太阳系行星数据 + 位置计算
│       │   └── starInfo.ts        # 星座中文名 + 恒星距离
│       └── styles/
│           └── variables.css      # CSS 变量（主题颜色、阴影、圆角）
```

---

## 4. 后端 (server/)

### 4.1 入口与中间件

**文件：** [server/src/index.ts](file:///d:/Code/Working-on-it/star-/server/src/index.ts)

Express 应用入口，按顺序配置：

| 步骤 | 中间件/配置 | 说明 |
|------|-------------|------|
| 1 | `helmet` | 安全头（开发环境禁用 CSP） |
| 2 | `cors` | 开发环境允许 localhost:5173/4173 |
| 3 | `express.json` | 请求体解析，限制 100KB |
| 4 | 全局限流 | `/api/` 全局 120 次/分钟/IP |
| 5 | 写操作限流 | 共鸣/浏览/收藏 30 次/分钟/IP |
| 6 | 认证限流 | 登录/注册/访客 10 次/分钟/IP |
| 7 | 静态文件 | 生产环境托管 `client/dist/` |
| 8 | 路由挂载 | 见下方路由层 |
| 9 | SPA 回退 | `*` → `index.html` |
| 10 | 全局错误处理 | 捕获未处理异常 |

**JWT 鉴权中间件：** [server/src/middleware/auth.ts](file:///d:/Code/Working-on-it/star-/server/src/middleware/auth.ts)

| 函数 | 用途 |
|------|------|
| `authRequired` | 强制登录，未登录返回 401 |
| `authOptional` | 可选登录，有 token 则附加 user 信息，不拦截 |

JWT Secret 策略：生产环境必须设 `JWT_SECRET` 环境变量，开发环境使用默认值 `star-empathy-dev-secret`。

---

### 4.2 数据库架构

**文件：** [server/src/db.ts](file:///d:/Code/Working-on-it/star-/server/src/db.ts)

使用 Node.js 内置 `node:sqlite`（零外部依赖），数据库文件位于 `server/data/stars.db`。

**表结构：**

```
users
├── id              INTEGER PRIMARY KEY
├── username        TEXT UNIQUE NOT NULL
├── password_hash   TEXT NOT NULL
├── signature       TEXT
└── created_at      TEXT DEFAULT (datetime('now'))

stars
├── id              INTEGER PRIMARY KEY
├── type            TEXT ('history' | 'user')
├── title           TEXT
├── content         TEXT NOT NULL
├── resonance_count INTEGER DEFAULT 0
├── pos_x/y/z       REAL NOT NULL        ← 3D 坐标（±300 立方体）
├── catalog_star_id INTEGER              ← 关联的星表恒星 ID
├── location_lat/lng REAL               ← 投递时地理位置
├── view_count      INTEGER DEFAULT 0
├── origin          TEXT                 ← 文化来源（如 '中国', '希腊'）
├── user_id         INTEGER → users.id
├── tag             TEXT                 ← 情绪标签（思念/等待/离别/愿望/孤独）
└── created_at      TEXT

catalog_visits
├── id              INTEGER PRIMARY KEY
├── catalog_star_id INTEGER NOT NULL
└── visited_at      TEXT

favorites
├── id              INTEGER PRIMARY KEY
├── catalog_star_id INTEGER NOT NULL
├── user_id         INTEGER NOT NULL
├── created_at      TEXT
└── UNIQUE(catalog_star_id, user_id)

narratives
├── id              INTEGER PRIMARY KEY
├── catalog_star_id INTEGER NOT NULL
├── content         TEXT NOT NULL
├── generated_at    TEXT
└── UNIQUE INDEX ON (catalog_star_id, date(generated_at))
```

**索引：** `idx_stars_type`, `idx_stars_catalog`, `idx_stars_user`, `idx_stars_created`, `idx_catalog_visits`, `idx_favorites`, `idx_narratives_day`

**兼容性：** 代码中通过 try-catch 执行 `ALTER TABLE ADD COLUMN` 来兼容旧版本数据库，新环境直接跳过无害。

---

### 4.3 路由层

#### 认证路由 `/api/auth` — [server/src/routes/auth.ts](file:///d:/Code/Working-on-it/star-/server/src/routes/auth.ts)

| 方法 | 路径 | 处理函数 | 鉴权 |
|------|------|----------|------|
| POST | `/api/auth/register` | 注册（用户名 2~20 字符，密码 6~50 字符） | 无 |
| POST | `/api/auth/login` | 登录，返回 JWT token | 无 |
| POST | `/api/auth/guest` | 访客快捷登录（自动创建内置访客账号） | 无 |
| GET | `/api/auth/me` | 获取当前用户信息 | 必须 |
| PATCH | `/api/auth/signature` | 更新用户签名（最长 30 字） | 必须 |

#### 故事路由 `/api/stories` — [server/src/routes/stories.ts](file:///d:/Code/Working-on-it/star-/server/src/routes/stories.ts)

| 方法 | 路径 | 处理函数 | 说明 |
|------|------|----------|------|
| GET | `/api/stories` | 获取所有故事 | 支持 `?page=&limit=` 分页 |
| GET | `/api/stories/:storyId` | 单条故事详情 | |
| POST | `/api/stories` | 投递故事 | 可选登录；content 1~300 字；支持 location/tag |
| POST | `/api/stories/:storyId/resonate` | 共鸣 +1 | |
| POST | `/api/stories/:storyId/view` | 记录故事浏览 | |
| DELETE | `/api/stories/:storyId` | 删除故事 | 必须登录，只能删自己的 |

#### 恒星 Catalog 路由 `/api/catalog/stars` — [server/src/routes/catalog.ts](file:///d:/Code/Working-on-it/star-/server/src/routes/catalog.ts)

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/api/catalog/stars/:catalogStarId/stories` | 获取该恒星下的所有故事 | 无 |
| GET | `/api/catalog/stars/:catalogStarId/stats` | 恒星聚合统计 | 无 |
| POST | `/api/catalog/stars/:catalogStarId/visit` | 记录恒星浏览 | 无 |
| POST | `/api/catalog/stars/:catalogStarId/favorite` | 收藏恒星 | 必须 |
| DELETE | `/api/catalog/stars/:catalogStarId/favorite` | 取消收藏 | 必须 |

#### 叙事路由 `/api/catalog/stars` — [server/src/routes/narrative.ts](file:///d:/Code/Working-on-it/star-/server/src/routes/narrative.ts)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/catalog/stars/:catalogStarId/narrative` | 获取恒星「古今共望」AI 叙事 |

#### 其他路由

| 路由文件 | 挂载路径 | 说明 |
|----------|----------|------|
| [stats.ts](file:///d:/Code/Working-on-it/star-/server/src/routes/stats.ts) | `/api/stats` | 全局统计：星星数、用户数、共鸣总数 |
| [profile.ts](file:///d:/Code/Working-on-it/star-/server/src/routes/profile.ts) | `/api/profile` | 个人主页：我的故事（分页）、我的收藏 |
| [search.ts](file:///d:/Code/Working-on-it/star-/server/src/routes/search.ts) | `/api/catalog/stars/search` | 恒星搜索（按名称/星座中文名） |
| [stars.ts](file:///d:/Code/Working-on-it/star-/server/src/routes/stars.ts) | `/api/stars` | 旧路由兼容（功能与 stories + catalog 重复） |

---

### 4.4 服务层

#### starService — [server/src/services/starService.ts](file:///d:/Code/Working-on-it/star-/server/src/services/starService.ts)

核心业务逻辑，提供所有与星星/故事相关的数据库操作：

| 函数 | 签名 | 说明 |
|------|------|------|
| `getAllStars` | `() → (Star & {username, tag})[]` | 获取所有故事，JOIN users 获取用户名 |
| `getAllStarsPaged` | `(page, limit) → {items, total, page, limit, totalPages}` | 分页获取 |
| `createStar` | `(content, title?, catalogStarId?, location?, userId?, tag?) → Star` | 创建故事，自动生成随机 3D 坐标 |
| `resonate` | `(id) → {id, resonanceCount} \| null` | 共鸣 +1 |
| `recordStoryView` | `(storyId) → void` | 故事浏览 +1 |
| `recordCatalogVisit` | `(catalogStarId) → void` | 恒星浏览记录 |
| `getCatalogStats` | `(catalogStarId) → {storyCount, totalResonance, totalViews, starViews, favoriteCount}` | 恒星统计 |
| `getStoryById` | `(storyId) → Star \| null` | 单条故事 |
| `getStoriesByCatalogStarId` | `(catalogStarId) → Star[]` | 某恒星下所有故事 |
| `addFavorite` | `(catalogStarId, userId) → {already}` | 收藏（唯一约束防重复） |
| `removeFavorite` | `(catalogStarId, userId) → void` | 取消收藏 |
| `getGlobalStats` | `() → {starCount, userCount, totalResonance}` | 全局统计 |
| `getUserStories` | `(userId) → Star[]` | 某用户的故事 |
| `getUserStoriesPaged` | `(userId, page, limit) → {items, total, ...}` | 分页 |
| `getUserFavorites` | `(userId) → number[]` | 用户收藏的 catalog_star_id 列表 |
| `deleteStory` | `(storyId, userId) → {success, notFound?, notOwner?}` | 删除故事（权限校验） |

#### userService — [server/src/services/userService.ts](file:///d:/Code/Working-on-it/star-/server/src/services/userService.ts)

| 函数 | 说明 |
|------|------|
| `register(username, password)` | 注册（bcrypt 哈希，返回 JWT） |
| `login(username, password)` | 登录（密码验证，返回 JWT） |
| `guestLogin()` | 访客登录（自动创建 `星穹访客` 账号） |
| `getUserById(id)` | 获取用户公开信息 |
| `updateSignature(id, signature)` | 更新签名（最长 30 字） |

#### narrative — [server/src/services/narrative.ts](file:///d:/Code/Working-on-it/star-/server/src/services/narrative.ts)

AI 叙事生成服务，实现"每日缓存"策略：

| 函数 | 说明 |
|------|------|
| `getNarrative(catalogStarId)` | 获取恒星叙事。流程：查恒星信息 → 查今日缓存 → 调 DeepSeek 生成 → 缓存到 narratives 表 |

叙事生成 Prompt 要求：以"今夜，你看到{星名}。"开头，联系古今人物与诗词，150~250 字，温暖治愈。

#### deepseek — [server/src/services/deepseek.ts](file:///d:/Code/Working-on-it/star-/server/src/services/deepseek.ts)

DeepSeek API 封装（兼容 OpenAI Chat Completions 格式）：

| 函数 | 说明 |
|------|------|
| `deepseekChat(messages, options)` | 调用 DeepSeek API，支持 temperature、maxTokens、enableSearch |

环境变量配置：`DEEPSEEK_API_KEY`（必需）、`DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`（默认 `deepseek-v4-flash`）。

---

### 4.5 工具函数

#### response — [server/src/utils/response.ts](file:///d:/Code/Working-on-it/star-/server/src/utils/response.ts)

统一响应格式：`{ message: string, data: any }`，自动将数据库字段 snake_case 转为 camelCase。

| 函数 | HTTP 状态码 |
|------|-------------|
| `ok(res, msg, data?)` | 200 |
| `created(res, msg, data?)` | 201 |
| `badRequest(res, msg)` | 400 |
| `unauthorized(res, msg)` | 401 |
| `forbidden(res, msg)` | 403 |
| `notFound(res, msg)` | 404 |
| `serverError(res, msg?)` | 500 |

#### position — [server/src/utils/position.ts](file:///d:/Code/Working-on-it/star-/server/src/utils/position.ts)

| 函数 | 说明 |
|------|------|
| `generatePosition()` | 返回 `{x, y, z}` 随机坐标，范围 ±300 立方体 |

---

### 4.6 脚本

| 脚本 | 说明 |
|------|------|
| `seed.ts` | 注入 58 条冷启动数据（古诗词、星座神话、社区语录） |
| `seed_user_stories.ts` | 用户故事种子数据 |
| `migrate-origin.ts` | 数据迁移（补充 origin 字段） |
| `story-rewrite-prompt.md` | AI 故事改写 Prompt 模板 |

---

## 5. 前端 (client/)

### 5.1 入口与路由

**入口：** [client/src/main.ts](file:///d:/Code/Working-on-it/star-/client/src/main.ts) → 创建 Vue 应用，挂载 Router 和全局 CSS 变量。

**路由：** [client/src/router/index.ts](file:///d:/Code/Working-on-it/star-/client/src/router/index.ts)

| 路径 | 名称 | 组件 | 鉴权 |
|------|------|------|------|
| `/` | home | HomePage | 已登录自动跳转 `/sky` |
| `/sky` | sky | SkyPage | 需登录 |
| `/profile` | profile | ProfilePage | 需登录 |

路由守卫逻辑：
- 需要登录的页面无 token → 重定向到 `/`
- 已登录访问 `/` → 重定向到 `/sky`

---

### 5.2 页面 (Pages)

#### HomePage — [client/src/pages/HomePage.vue](file:///d:/Code/Working-on-it/star-/client/src/pages/HomePage.vue)

登录/注册页面，左右分栏布局：
- **左栏**：品牌意境区，标题"星语穹庭"+ 副标题，背景为 Three.js 粒子星空（`useParticleSky`）
- **右栏**：登录/注册/访客表单，含全局统计展示

**关键逻辑：**
- `handleLogin()` — 调用 `useAuth().login()`，成功跳转 `/sky`
- `handleRegister()` — 调用 `useAuth().register()`，前端校验密码一致性
- `handleGuestAccess()` — 调 `/api/auth/guest`，获取访客 token

#### SkyPage — [client/src/pages/SkyPage.vue](file:///d:/Code/Working-on-it/star-/client/src/pages/SkyPage.vue)

3D 星空主页面，项目核心交互页面。

**关键功能模块：**
- **地理位置获取**：HTML5 Geolocation API 获取经纬度 → 天球旋转对齐真实天空
- **城市选择**：位置获取失败时提供 12 个中国城市手动选择
- **星星搜索**：调用 `/api/catalog/stars/search` 实时搜索恒星
- **故事加载**：分页加载所有故事（每页 50 条），按 `catalogStarId` 聚合
- **统计缓存**：故事数据加载完成后推送至 `useSky` 的 `statsCache`
- **行星点击**：支持太阳系行星（太阳/月球/金星/火星/木星/土星）的点击处理
- **缩放控制**：+/- 按钮调整相机 FOV
- **叙事引导牌**：底部 4 张半透明卡片介绍平台功能

**关键函数：**
- `onStarClick(starId)` — 点击恒星，显示详情面板 + 记录浏览
- `onPlanetClick(name, nameCN)` — 点击行星，显示该行星关联故事
- `fetchStories()` — 分页加载所有故事，并发请求剩余页
- `mergeStoriesIntoMap()` — 将故事按 `catalogStarId` 聚合 + 统计
- `flyToStar(starId)` — 搜索选中后跳转到对应恒星

#### ProfilePage — [client/src/pages/ProfilePage.vue](file:///d:/Code/Working-on-it/star-/client/src/pages/ProfilePage.vue)

个人主页，粒子星空背景。

**功能模块：**
- **星云签名**：可编辑的个人签名（PATCH `/api/auth/signature`）
- **统计行**：故事数、共鸣数、收藏数
- **故事星节点**：故事以随机位置星星动画展示，hover 显示标题，点击弹窗查看详情
- **收藏列表**：已收藏的恒星卡片，点击跳转星空页，支持取消收藏
- **无限滚动**：故事列表滚动到底部自动加载下一页

---

### 5.3 组件 (Components)

#### SkyCanvas — [client/src/components/SkyCanvas.vue](file:///d:/Code/Working-on-it/star-/client/src/components/SkyCanvas.vue)

3D 天球画布封装组件，桥接 Vue 和 Three.js。

**Props：** `observerLat`, `observerLng`（观测者经纬度）
**Events：** `starClick`, `starHover`, `planetClick`
**Expose：** `setStarStatsCache(cache)` — 向 useSky 推送统计数据

生命周期：`onMounted` 创建 SkyAPI，`onBeforeUnmount` 销毁，`watch` 经纬度变化更新天球旋转。

#### StarDetail — [client/src/components/StarDetail.vue](file:///d:/Code/Working-on-it/star-/client/src/components/StarDetail.vue)

星星详情面板，左右分栏（~600 行）：

- **左栏（故事面板）**：
  - 故事列表视图：搜索 + 排序（时间/距离/共鸣/浏览/随机）
  - 故事详情视图：点击进入，显示完整内容 + 共鸣按钮
  - 共鸣反馈：2 秒"已共鸣"动画
  - 浏览计数乐观更新
- **右栏（恒星信息）**：
  - 星名、星座、颜色色块
  - 视星等、距离、色温、亮度等级
  - 统计行（故事/共鸣/访问/收藏）
  - AI 叙事（`StarNarrative` 子组件）
  - 自动标签生成
  - 写故事 + 收藏按钮

**排序逻辑：** 历史故事始终置顶，用户故事按选定维度排序。支持稳定随机排序（seeded random）。

**距离计算：** Haversine 公式，<1km 显示"<1km"，<100km 带小数，其余四舍五入。

#### StarNarrative — [client/src/components/StarNarrative.vue](file:///d:/Code/Working-on-it/star-/client/src/components/StarNarrative.vue)

AI 叙事展示组件，四种状态：
- **加载中**：骨架屏 shimmer 动画
- **错误**：错误信息 + 重试按钮
- **已加载**：叙事文本 + "已缓存"标记
- **闲置**：初始状态提示

#### StoryForm — [client/src/components/StoryForm.vue](file:///d:/Code/Working-on-it/star-/client/src/components/StoryForm.vue)

投递心事表单弹窗：
- 标题输入（最长 60 字）
- 故事内容 textarea（最长 300 字，实时字数统计）
- 情绪标签选择（思念/等待/离别/愿望/孤独）
- 自动获取用户地理位置
- 提交时携带 token（若已登录）

#### LoadingScreen — [client/src/components/LoadingScreen.vue](file:///d:/Code/Working-on-it/star-/client/src/components/LoadingScreen.vue)

旋转星星加载动画 + "正在连接星空..." 文字。

#### LegendToggle — [client/src/components/LegendToggle.vue](file:///d:/Code/Working-on-it/star-/client/src/components/LegendToggle.vue)

图例切换按钮组（历史里的星 / 看见大家 / 高亮共鸣），通过 `filters` prop 控制显示。

---

### 5.4 Composables

#### useSky — [client/src/composables/useSky.ts](file:///d:/Code/Working-on-it/star-/client/src/composables/useSky.ts)

**核心文件，~940 行**，Three.js 3D 天球渲染引擎。

**返回接口：**
```typescript
interface SkyAPI {
  camera: PerspectiveCamera
  zoomIn: () => void
  zoomOut: () => void
  dispose: () => void
  setObserver: (obs: ObserverLoc | null) => void
  setStarStatsCache: (cache: Map<number, Stats>) => void
  updateHorizonRotation: (lat?, lng?) => void
}
```

**渲染流水线：**

| 步骤 | 说明 |
|------|------|
| 1. 场景初始化 | Scene + PerspectiveCamera + WebGLRenderer + CSS2DRenderer |
| 2. 天球组 (skyGroup) | 所有天体内容放入此 Group，用于地平旋转 |
| 3. 星星分层渲染 | 6 层亮度分级（mag ≤ -0.5 到 mag ≤ 99），PointsMaterial + AdditiveBlending |
| 4. 星座连线 | 从 stars.json 和 new_lines.json 加载，双线（主色 + 暖金辉光） |
| 5. 天赤道 | Dec=0° 完整圆环 |
| 6. 黄道 | 虚线圆环，带当日真黄赤交角，每日自动刷新 |
| 7. 银河 ribbon | 三角形扇形带（宽带 + 窄带核心），等效银道坐标转换 |
| 8. 地平面以下遮罩 | 下半球暖色遮罩（BackSide 渲染） |
| 9. 星座名称标签 | CSS2DObject 标签 |
| 10. 东南西北标注 | 地平坐标四方向标注（不随 skyGroup 旋转） |
| 11. 悬浮 Tooltip | CSS2DObject 实现，节流 80ms 检测 |
| 12. 悬浮高亮辉光 | Sprite 辉光，opacity lerp 动画 |
| 13. 故事星呼吸辉光 | 有故事的星星显示呼吸动画辉光 |
| 14. 太阳系行星 | 动态导入 planets.ts，astronomy-engine 计算真实位置 |
| 15. 渲染循环 | requestAnimationFrame，实时恒星时漂移 + 辉光动画 |

**关键算法：**
- `gmstHours(date)` — 格林尼治恒星时（Meeus 公式，精度 <0.1s）
- `galacticToRaDec(lonDeg)` — 银道坐标 → 赤道坐标
- `eclipticToRaDec(lonDeg)` — 黄道坐标 → 赤道坐标
- 地平旋转矩阵：`M = Rx(π/2 - lat) * Ry(LST - π/2)`

**交互：**
- 拖拽旋转：YXZ 欧拉角，垂直限制 ±86°
- 滚轮缩放：FOV 25~75
- 点击检测：预计算归一化位置，屏幕投影距离阈值 0.0015
- 悬浮检测：节流 80ms，同一颗星自动刷新统计数据

#### useParticleSky — [client/src/composables/useParticleSky.ts](file:///d:/Code/Working-on-it/star-/client/src/composables/useParticleSky.ts)

登录页粒子星空背景（~135 行），简洁版 Three.js 场景：
- 3 层粒子（暖金/蓝/白），每层不同半径和漂移速度
- 银河带：3000 颗微光星沿对角线分布
- 流星：随机出现，持续 1 秒渐隐
- 呼吸亮度：整体微颤

#### useStars — [client/src/composables/useStars.ts](file:///d:/Code/Working-on-it/star-/client/src/composables/useStars.ts)

故事数据状态管理：

| 返回值 | 类型 | 说明 |
|--------|------|------|
| `stars` | `Ref<StarData[]>` | 全量故事数据 |
| `loading` | `Ref<boolean>` | 加载状态 |
| `error` | `Ref<string \| null>` | 错误信息 |
| `filters` | `Reactive<StarFilters>` | 过滤条件（history/user/highlightResonance） |
| `filteredStars` | `Computed<StarData[]>` | 过滤后的故事 |
| `fetchStars()` | `() => Promise<void>` | 获取故事（GET /api/stories） |
| `addLocalStar(star)` | `(StarData) => void` | 本地添加新故事 |
| `updateResonanceLocally(id)` | `(number) => void` | 本地更新共鸣计数 |

#### useResonate — [client/src/composables/useResonate.ts](file:///d:/Code/Working-on-it/star-/client/src/composables/useResonate.ts)

共鸣操作封装：

| 返回值 | 说明 |
|--------|------|
| `resonate(id)` | POST `/api/stories/:id/resonate`，返回 boolean |
| `resonatingId` | 当前正在共鸣的故事 ID |
| `lastError` | 错误信息 |

#### useNarrative — [client/src/composables/useNarrative.ts](file:///d:/Code/Working-on-it/star-/client/src/composables/useNarrative.ts)

AI 叙事获取：

| 返回值 | 说明 |
|--------|------|
| `content` | 叙事文本 |
| `loading` | 加载状态 |
| `error` | 错误信息 |
| `cached` | 是否来自缓存 |
| `fetchNarrative(id)` | 获取叙事 |
| `reset()` | 重置状态 |

---

### 5.5 状态管理 (Stores)

#### useAuth — [client/src/stores/auth.ts](file:///d:/Code/Working-on-it/star-/client/src/stores/auth.ts)

认证状态（composable 风格，非 Pinia）：

| 返回值 | 说明 |
|--------|------|
| `user` | 当前用户信息 Ref |
| `isLoggedIn` | 是否有 token（computed） |
| `loading` | 加载状态 |
| `fetchMe()` | 获取当前用户信息 |
| `login(username, password)` | 登录，存储 token 到 localStorage |
| `register(username, password)` | 注册，存储 token 到 localStorage |
| `logout()` | 清除 token 和 user |

---

### 5.6 工具函数 (Utils)

#### astro — [client/src/utils/astro.ts](file:///d:/Code/Working-on-it/star-/client/src/utils/astro.ts)

纯天文数学（零依赖），基于 Meeus 公式：

| 函数 | 说明 |
|------|------|
| `dateToJD(date)` | JS Date → 儒略日 |
| `lstDeg(jd, lonDeg)` | 地方恒星时（度） |
| `altAz(raH, decD, latDeg, lstDeg)` | 赤道坐标 → 地平坐标（高度角/方位角） |
| `orientationEuler(latDeg, lstDeg)` | 计算相机初始欧拉角 {rotX, rotY} |
| `trueObliquityRad(date)` | 真黄赤交角（IAU 2000B 简化式） |
| `eclipticToRaDecJD(lonDeg, date)` | 黄道坐标 → 赤道坐标（当日真 ε） |
| `eclipticAltAz(lonDeg, obs, date)` | 黄道坐标 → 高度角/方位角 |

#### constants — [client/src/utils/constants.ts](file:///d:/Code/Working-on-it/star-/client/src/utils/constants.ts)

3D 渲染常量：
- `SPHERE_RADIUS = 500` — 天球半径
- `DEFAULT_FOV = 60`, `FOV_MIN/MAX = 25/75` — 相机视场角
- `STAR_SIZES` — 不同类别星星尺寸（history/user/highResonance）
- `STAR_COLORS` — 颜色映射（暖金/星蓝/翠绿/亮白）
- `HIGH_RESONANCE_THRESHOLD = 50` — 高共鸣阈值

#### sphereMapping — [client/src/utils/sphereMapping.ts](file:///d:/Code/Working-on-it/star-/client/src/utils/sphereMapping.ts)

| 函数 | 说明 |
|------|------|
| `cubeToSphere(x, y, z)` | 立方体坐标 → 球面投影（保持方向，统一距离 = SPHERE_RADIUS） |
| `randomSpherePoint(radius)` | 球面均匀随机撒点（Marsaglia 方法） |

#### storyMappings — [client/src/utils/storyMappings.ts](file:///d:/Code/Working-on-it/star-/client/src/utils/storyMappings.ts)

种子故事 → 恒星映射（~250 行），核心功能：

| 函数 | 说明 |
|------|------|
| `getSeedStarId(title)` | 根据种子故事标题找到对应星表恒星 ID |
| `assignUserStar()` | 为用户投递的故事随机分配一颗未命名暗星（mag 3.5~5.5），cursor 轮转避免重复 |
| `findNearestCatalogStar(px, py, pz)` | 根据后端坐标找最近真实恒星 |

包含 200+ 条手工映射，覆盖古诗词、希腊神话、巴比伦星官、阿拉伯星名等。

---

### 5.7 数据文件 (Data)

| 文件 | 说明 |
|------|------|
| [stars.json](file:///d:/Code/Working-on-it/star-/client/src/data/stars.json) | 预计算星表：500+ 颗恒星，含 id、name、赤经、赤纬、星等、颜色、星座、预计算 3D 坐标 |
| [new_lines.json](file:///d:/Code/Working-on-it/star-/client/src/data/new_lines.json) | 补充星座连线（星表 ID 对） |
| [constellation_labels.json](file:///d:/Code/Working-on-it/star-/client/src/data/constellation_labels.json) | 星座名称标签的 3D 位置 |
| [planets.ts](file:///d:/Code/Working-on-it/star-/client/src/data/planets.ts) | 太阳系行星数据：轨道参数、颜色、大小，`getBodyPosition()` 使用 astronomy-engine 计算真实位置 |
| [starInfo.ts](file:///d:/Code/Working-on-it/star-/client/src/data/starInfo.ts) | 星座缩写 → 中文名映射 + 主要恒星距离（光年） |

---

### 5.8 样式系统

**文件：** [client/src/styles/variables.css](file:///d:/Code/Working-on-it/star-/client/src/styles/variables.css)

基于 CSS 自定义属性的设计令牌系统：

| 类别 | 变量 | 说明 |
|------|------|------|
| 背景 | `--bg`, `--bg2`, `--surface`, `--surface-ground` | 深色主题层级 |
| 文字 | `--ink`, `--ink-secondary`, `--muted`, `--muted-light` | 四级文字颜色 |
| 边框 | `--rule`, `--rule-hover`, `--rule-focus` | 边框颜色 |
| 强调色 | `--accent (#ffd98a)`, `--accent-hover`, `--accent-subtle`, `--accent-border` | 暖金色系 |
| 星星色 | `--star-blue (#86a8ff)`, `--star-purple (#caa7ff)`, `--star-green (#95f0c0)`, `--star-red (#ff8b7d)` | 星星分类颜色 |
| 阴影 | `--shadow-sm/md/lg/glow` | 四级阴影 |
| 圆角 | `--radius-sm(6px)/md(10px)/lg(12px)/xl(16px)` | 四级圆角 |
| 字体 | `--font`, `--font-mono` | Inter + 中文字体栈 |
| 动效 | `--ease-out`, `--transition-fast/normal` | 缓动 + 过渡 |

---

## 6. 依赖关系图

### 后端依赖图

```
index.ts (入口)
  ├── helmet, cors, express-rate-limit, express.json
  ├── routes/auth.ts
  │   ├── middleware/auth.ts ← jsonwebtoken
  │   ├── services/userService.ts ← bcryptjs
  │   └── utils/response.ts
  ├── routes/stories.ts
  │   ├── services/starService.ts ← db.ts
  │   ├── middleware/auth.ts
  │   └── utils/response.ts
  ├── routes/catalog.ts
  │   ├── services/starService.ts
  │   ├── middleware/auth.ts
  │   └── utils/response.ts
  ├── routes/narrative.ts
  │   ├── services/narrative.ts
  │   │   ├── services/deepseek.ts ← fetch
  │   │   └── db.ts
  │   └── utils/response.ts
  ├── routes/profile.ts
  │   ├── services/starService.ts
  │   └── middleware/auth.ts
  ├── routes/stats.ts
  │   └── services/starService.ts
  ├── routes/search.ts
  │   └── stars.json (client/src/data/)
  └── routes/stars.ts (旧路由兼容)
```

### 前端依赖图

```
main.ts
  └── App.vue → RouterView
        ├── HomePage.vue
        │   ├── useParticleSky.ts ← Three.js
        │   └── useAuth (stores/auth.ts)
        │       └── fetch /api/auth/*
        ├── SkyPage.vue
        │   ├── SkyCanvas.vue
        │   │   └── useSky.ts ← Three.js + CSS2DRenderer
        │   │       ├── astro.ts (天文数学)
        │   │       ├── constants.ts
        │   │       ├── stars.json ← 星表数据
        │   │       ├── new_lines.json ← 星座连线
        │   │       ├── constellation_labels.json ← 标签
        │   │       └── planets.ts ← astronomy-engine
        │   ├── StarDetail.vue
        │   │   ├── StarNarrative.vue
        │   │   │   └── useNarrative.ts
        │   │   └── starInfo.ts
        │   └── StoryForm.vue
        └── ProfilePage.vue
            ├── useParticleSky.ts
            └── starInfo.ts, stars.json
```

---

## 7. API 完整参考

### 响应格式

所有 API 响应统一为：
```json
{
  "message": "string",
  "data": any
}
```
字段名使用 camelCase，HTTP 状态码表示结果（200/400/401/403/404/429/500）。

### 新规范路由（推荐使用）

#### 故事 `/api/stories`

| 方法 | 路径 | 请求体 | 响应 data | 鉴权 |
|------|------|--------|-----------|------|
| GET | `/api/stories` | — | `Star[]` 或 `{items, total, page, limit, totalPages}` | 无 |
| GET | `/api/stories/:storyId` | — | `Star` | 无 |
| POST | `/api/stories` | `{content, title?, catalogStarId?, location?, tag?}` | `Star` | 可选 |
| POST | `/api/stories/:storyId/resonate` | — | `{id, resonanceCount}` | 无 |
| POST | `/api/stories/:storyId/view` | — | `null` | 无 |
| DELETE | `/api/stories/:storyId` | — | `null` | 必须 |

#### 恒星 Catalog `/api/catalog/stars`

| 方法 | 路径 | 响应 data | 鉴权 |
|------|------|-----------|------|
| GET | `/api/catalog/stars/search?q=` | `CatalogStar[]` | 无 |
| GET | `/api/catalog/stars/:catalogStarId/stats` | `{storyCount, totalResonance, totalViews, starViews, favoriteCount}` | 无 |
| GET | `/api/catalog/stars/:catalogStarId/stories` | `Star[]` | 无 |
| GET | `/api/catalog/stars/:catalogStarId/narrative` | `{content, cached}` | 无 |
| POST | `/api/catalog/stars/:catalogStarId/visit` | `null` | 无 |
| POST | `/api/catalog/stars/:catalogStarId/favorite` | `null` | 必须 |
| DELETE | `/api/catalog/stars/:catalogStarId/favorite` | `null` | 必须 |

#### 认证 `/api/auth`

| 方法 | 路径 | 请求体 | 响应 data | 鉴权 |
|------|------|--------|-----------|------|
| POST | `/api/auth/register` | `{username, password}` | `{user, token}` | 无 |
| POST | `/api/auth/login` | `{username, password}` | `{user, token}` | 无 |
| POST | `/api/auth/guest` | — | `{user, token}` | 无 |
| GET | `/api/auth/me` | — | `{id, username, signature, createdAt}` | 必须 |
| PATCH | `/api/auth/signature` | `{signature}` | `{id, username, signature}` | 必须 |

#### 个人主页 `/api/profile`

| 方法 | 路径 | 响应 data | 鉴权 |
|------|------|-----------|------|
| GET | `/api/profile/stories` | `Star[]` 或 `{items, total, ...}` | 必须 |
| GET | `/api/profile/favorites` | `number[]` (catalog_star_id 列表) | 必须 |

#### 其他

| 方法 | 路径 | 响应 data |
|------|------|-----------|
| GET | `/api/stats` | `{starCount, userCount, totalResonance}` |
| GET | `/api/health` | `"ok"` |

### 旧路由兼容

`/api/stars` 下提供与上述功能相同的旧路由（`/api/stars`、`/api/stars/story`、`/api/stars/:id/resonate` 等），不推荐新代码使用。

### 限流策略

| 范围 | 限制 |
|------|------|
| 全局 API (`/api/`) | 120 次/分钟/IP |
| 写操作（共鸣/浏览/收藏/投递） | 30 次/分钟/IP |
| 认证接口（登录/注册/访客） | 10 次/分钟/IP |

---

## 8. 运行与部署

### 环境要求

- **Node.js ≥ 22.5**（必需，后端使用 `node:sqlite`）
- npm ≥ 9

### 开发环境

```bash
# 1. 克隆项目
cd star-

# 2. 后端
cd server
npm install
npm run seed          # 首次运行：注入冷启动数据
npm run dev           # 启动后端（http://localhost:3000）

# 3. 前端（新终端）
cd client
npm install
npm run dev           # 启动前端（http://localhost:5173）
```

前端 Vite 开发服务器自动将 `/api` 请求代理到 `http://localhost:3000`。

### 生产构建

```bash
# 后端
cd server
npm run build         # tsc 编译 → dist/
npm run start         # 运行编译产物

# 前端
cd client
npm run build         # vue-tsc + vite build → dist/
```

生产环境后端自动托管 `client/dist/` 静态文件，并设置 SPA 回退。

### 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `PORT` | 否 | 服务端口，默认 3000 |
| `NODE_ENV` | 否 | `production` 时启用严格 CSP 和 CORS 限制 |
| `JWT_SECRET` | 生产必需 | JWT 签名密钥，开发环境有默认值 |
| `ALLOWED_ORIGINS` | 否 | 生产 CORS 白名单，逗号分隔 |
| `DEEPSEEK_API_KEY` | 否 | AI 叙事功能需要 |
| `DEEPSEEK_BASE_URL` | 否 | 默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 否 | 默认 `deepseek-v4-flash` |

### 冷启动数据

```bash
cd server
npm run seed          # 注入 58 条历史故事（古诗词、星座神话、社区语录）
```

种子数据包含：中国古诗词（李白、杜甫、苏轼等）、星座神话（中国/希腊/埃及/巴比伦）、社区语录，每条绑定真实星表恒星。

---

> **文档版本：** 1.0
> **生成日期：** 2026-07-26
> **覆盖范围：** 全仓库 60+ 源文件