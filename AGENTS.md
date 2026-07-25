# AGENTS.md — 星语穹庭 (Star Language Dome)

## 项目概述

3D 星空情绪表达平台。用户匿名将心事"挂"在星星上，浏览历史星空故事和他人心事，通过"共鸣"形成弱连接。

**当前阶段**：已实现完整前后端。前端 Vue 3 + Three.js，后端 Express + node:sqlite。

## 仓库结构（两包 monorepo）

| 目录 | 技术 | 说明 |
|---|---|---|
| `server/` | Node.js + Express + TypeScript | REST API，零外部依赖（用 node:sqlite） |
| `client/` | Vue 3 + Vite + Three.js + PrimeVue | 3D 星空前端 |

## 数据库架构

SQLite（`server/data/stars.db`），四张表：

| 表 | 用途 |
|---|---|
| `users` | 用户表：用户名、密码哈希、签名 |
| `stars` | 故事表（历史 + 用户），含 `catalog_star_id`（星表恒星 ID）、`pos_x/y/z`、`resonance_count`、`view_count`、`user_id`、`tag` |
| `catalog_visits` | 星表恒星被浏览的记录 |
| `favorites` | 用户收藏的恒星（`user_id` + `catalog_star_id` 唯一约束） |

## 后端 API

Base URL：`http://localhost:3000`（开发），部署后为 `https://your-domain.com`

### 新规范路由（推荐使用）

**故事相关 `/api/stories`**

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | `/api/stories` | 获取所有故事 | 无 |
| GET | `/api/stories/:storyId` | 单条故事详情 | 无 |
| POST | `/api/stories` | 投递故事（必填 `content` 1~300 字，可选 `catalog_star_id`/`title`/`location`/`tag`） | 可选 |
| POST | `/api/stories/:storyId/resonate` | 共鸣 +1 | 无 |
| POST | `/api/stories/:storyId/view` | 记录故事浏览 | 无 |

**恒星 catalog 相关 `/api/catalog/stars`**

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | `/api/catalog/stars/search?q=` | 搜索恒星 | 无 |
| GET | `/api/catalog/stars/:catalogStarId/stats` | 获取某恒星的聚合统计 | 无 |
| GET | `/api/catalog/stars/:catalogStarId/stories` | 获取某恒星下的所有故事 | 无 |
| POST | `/api/catalog/stars/:catalogStarId/visit` | 记录恒星浏览 | 无 |
| POST | `/api/catalog/stars/:catalogStarId/favorite` | 收藏恒星 | 必须 |
| DELETE | `/api/catalog/stars/:catalogStarId/favorite` | 取消收藏 | 必须 |

**认证 `/api/auth`**

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/guest` | 访客快捷登录 |
| GET | `/api/auth/me` | 当前用户信息 |
| PATCH | `/api/auth/signature` | 更新签名 |

**个人主页 `/api/profile`**

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | `/api/profile/stories` | 我的故事 | 必须 |
| GET | `/api/profile/favorites` | 我的收藏 | 必须 |

**其他**

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/stats` | 全局统计 |
| GET | `/api/health` | 健康检查 |

### 旧路由兼容（功能同上，不推荐用于新代码）

`/api/stars`、`/api/stars/story`、`/api/stars/:id/resonate`、`/api/stars/:id/stats`、`/api/stars/:id/visit`、`/api/stars/story/:id/view`、`/api/stars/:id/favorite`、`/api/stars/search`

响应统一格式：`{ message: "...", data: ... }`，通过 HTTP 状态码（200|400|401|404|429|500）表示结果。数据字段统一使用 camelCase（如 `resonanceCount`、`catalogStarId`、`viewCount`、`createdAt`）。

### 限流策略

- 全局 API：120 次/分钟/IP
- 写操作（共鸣/浏览/收藏/投递）：30 次/分钟/IP
- 认证接口（登录/注册/访客）：10 次/分钟/IP

## 前端关键模块

- `client/src/composables/useStars.ts` — 获取/过滤/本地更新星星列表
- `client/src/composables/useSky.ts` — Three.js 渲染核心（天球体 + 银河 + 星座连线 + Raycaster 点击）
- `client/src/composables/useResonate.ts` — 共鸣操作
- `client/scripts/generateStarCatalog.ts` — 预计算恒星 3D 坐标 → `client/src/data/stars.json`
- `client/src/components/SkyCanvas.vue` — 3D 画布
- `client/src/components/StarDetail.vue` — 星星详情面板
- `client/src/components/StoryForm.vue` — 投递心事表单

## 坐标系统

前端天球半径 R=500，恒星坐标由赤经赤纬转 3D，运行在 `useSky.ts` 中。用户星投递时后端随机生成 ±300 立方体坐标。

## 常用命令

```bash
# 后端
cd server
npm install        # 首次安装依赖
npm run seed       # 注入 23 条冷启动数据
npm run dev        # 开发模式（nodemon + ts-node）
npm run build      # tsc 编译 → dist/
npm run start      # 运行编译产物

# 前端
cd client
npm install        # 首次安装依赖
npm run dev        # Vite 开发服务器（:5173）
npm run build      # vue-tsc + vite build
npm run preview    # 预览构建产物
```

## 前端代理配置

`client/vite.config.ts` 中 `/api` 代理到 `http://localhost:3000`。确保后端端口与此一致，或在 Vite 配置中修改。

## 关键约束

- **Node.js ≥22.5 必需** — 后端使用 `node:sqlite`（Node 内置实验模块），旧版本不可用
- **鉴权说明**：有完整 JWT 鉴权系统。匿名可浏览/共鸣/投递心事，收藏和个人主页需要登录。所有内容默认公开
- **冷启动数据真实** — seed 脚本中含古诗词、星座神话、社区语录，禁止用假数据
- **数据迁移兼容** — `server/src/db.ts` 中有 `ALTER TABLE ... ADD COLUMN` 的 try-catch 兼容旧库，新环境不需要但保留无害
- **星表坐标预计算** — 恒星坐标由 `generateStarCatalog.ts` 离线生成 JSON，后端不参与
- **生产环境必须设置** `JWT_SECRET` 环境变量，否则启动失败

## 部署

→ 见 `toA.md`（给开发者 A 的部署指南）

## 版本管理

Git 仓库已初始化，commit 记录在 `CHANGELOG.md`。每个功能完成请 commit。

## 识图能力

底层模型不具备原生识图能力。遇到图片时用 `vision.js`：

```bash
node vision.js "<图片路径>" "用中文描述这张图片"
```

触发场景：用户分享图片路径或 URL、消息中出现截图/附件、要求分析/描述/识别图片内容。

配置：API Key 已写入 `vision.js`，模型默认 `qwen-vl-max`。可通过环境变量覆盖：
- `VISION_API_KEY` — API Key
- `VISION_MODEL` — 模型名
- `VISION_BASE_URL` — API 地址
