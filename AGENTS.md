# AGENTS.md — 星语穹庭 (Star Language Dome)

## 📁 文件导航（FILES.md）

**重要**：在阅读或修改任何项目文件之前，请先查阅 `FILES.md`，它提供了完整的项目文件清单和用途说明。创建、修改或删除文件后，必须同步更新 FILES.md。

## 项目概述

3D 星空情绪表达平台。用户匿名将心事"挂"在星星上，浏览历史星空故事和他人心事，通过"共鸣"形成弱连接。

**当前阶段**：已实现完整前后端。前端 Vue 3 + Three.js，后端 Express + node:sqlite。

## 仓库结构（两包 monorepo）

| 目录 | 技术 | 说明 |
|---|---|---|
| `server/` | Node.js + Express + TypeScript | REST API，零外部依赖（用 node:sqlite） |
| `client/` | Vue 3 + Vite + Three.js + PrimeVue | 3D 星空前端 |

## 数据库架构

SQLite（`server/data/stars.db`），三张表：

| 表 | 用途 |
|---|---|
| `stars` | 核心表：历史星 + 用户星，含 `catalog_star_id`（星表恒星 ID）、`pos_x/y/z`（3D 坐标）、`resonance_count`、`view_count`、`origin` |
| `catalog_visits` | 星表恒星被浏览的记录 |
| `favorites` | 用户收藏的恒星 |

## 后端 API

Base URL：`http://localhost:3000`（开发），部署后为 `https://your-domain.com`

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/stars` | 获取所有星星 |
| POST | `/api/stars/story` | 投递心事（必填 `content` 1~2000 字，可选 `catalog_star_id`/`title`/`location`/`tags` JSON 数组） |
| POST | `/api/stars/:id/resonate` | 共鸣 +1 |
| GET | `/api/stars/:id/stats` | 获取某星表的聚合统计 |
| POST | `/api/stars/:id/visit` | 记录恒星浏览 |
| POST | `/api/stars/story/:id/view` | 记录故事浏览 |
| POST | `/api/stars/:id/favorite` | 收藏 |
| DELETE | `/api/stars/:id/favorite` | 取消收藏 |
| POST | `/api/stories/ai-tags` | **仅标签推荐（轻量）**：标题+正文 → 3~5 个 AI 建议标签，不触发星星匹配 |
| POST | `/api/stories/match-star` | AI 归属星辰匹配：标题+正文 → Top 3 契合星辰 + suggestedTags（带匹配理由） |

响应统一格式：`{ code: 200|400|404|500, message: "...", data: ... }`

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

`client/vite.config.ts` 中 `/api` 代理到 `http://localhost:3000`。后端 `server/src/index.ts` 默认端口也是 3000（可通过 `PORT` 环境变量覆盖）。

## 关键约束

- **Node.js ≥22.5 必需** — 后端使用 `node:sqlite`（Node 内置实验模块），旧版本不可用
- **不做权限系统** — 所有星星默认公开，这是产品核心设计
- **冷启动数据真实** — seed 脚本中含古诗词、星座神话、社区语录，禁止用假数据
- **数据迁移兼容** — `server/src/db.ts` 中有 `ALTER TABLE ... ADD COLUMN` 的 try-catch 兼容旧库，新环境不需要但保留无害
- **星表坐标预计算** — 恒星坐标由 `generateStarCatalog.ts` 离线生成 JSON，后端不参与
- **天镜览星模式（Camera Mode）** — 相机模式逻辑全部位于 `client/src/composables/useCameraMode.ts`，`useSky.ts` 仅暴露 API（`flyToStar3D`/`getStarsInFrame`/`onCameraFrame` 等）不承载业务；模式切换由 SkyPage 顶层 `v-if="cameraMode === 'observe'"` 分叉；与行星特写状态机互斥（进入相机模式时若在 CLOSEUP 先 `exitCloseup()`）；PC 端复刻方案B（取景框+HUD+列表），移动端复刻方案A（气泡+拖拽补齐）；详细故事卡片复用 `useResonate` 但不复用完整 StarDetail
- **图标规范（全项目）** — 所有 UI 图标必须使用 SVG icon（内联 SVG 或 SVG 函数式组件），**禁止使用 emoji 字符**（如 ✨🔥📍📜💫👁🌌📖🕐）。新增 icon 统一放 `client/src/components/icons/` 或对应功能模块的 `icons/` 子目录。设计原型中的 emoji 仅作占位，落地时必须替换为 SVG icon

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
