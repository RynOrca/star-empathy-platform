# AGENTS.md — 星语穹庭 (Star Language Dome)

## Project Overview

3D 星空情绪表达平台。用户匿名将心事"挂"在星星上，浏览历史星空故事和他人心事，通过"共鸣"形成弱连接。

**当前阶段**：方案 + HTML 原型阶段，尚未开始编码。`star-empathy-platform.html` 是设计稿，不是最终产品。

## Tech Stack (已确定)

| 层 | 技术 |
|---|---|
| 前端/3D | Three.js (WebGL) + 现有 HTML 原型 |
| 后端 | Node.js + Express |
| 数据库 | SQLite (单文件，免配置) |
| 部署 | 阿里云 ECS + PM2 + Nginx + SSL |

## Three-Person Split

- **开发者 A**：前端 + 3D 交互（Three.js 渲染、射线检测、UI 逻辑）
- **开发者 B**：后端 + 数据 + 部署（SQLite 设计、API 开发、爬虫冷启动数据、ECS 环境）

## API Contract (先读这个再写代码)

完整接口定义在 `方案.md` 第三节。三个核心接口：

1. `GET /api/stars` — 一次性拉取所有星星数据（历史星 + 用户星），前端据此渲染 3D 星空
2. `POST /api/stars/story` — 用户匿名投递心事，后端生成随机 3D 坐标存入 SQLite
3. `POST /api/stars/:id/resonate` — 共鸣点亮，对应星星 `resonance_count` +1

响应格式统一：`{ code: 200, message: "...", data: {...} }`

## Critical Design Decisions

- **不做任何权限系统**。所有星星内容默认全量公开——这是产品"匿名弱连接"的核心调性，也是简化鉴权的关键决策。不要在实现时擅自加 auth。
- **冷启动数据必须真实**。编写爬虫抓取真实古诗词、星座神话、开源社区语录注入 SQLite。禁止使用无意义的假数据（如 "test 123"）。
- **坐标系**：星星的 `position: {x, y, z}` 由后端随机生成，前端直接映射到 3D 场景。

## Implementation Order

1. B 先建 SQLite + 三个 API 完整逻辑（含错误处理）→ 部署到 ECS → 写爬虫注入 20 条真实数据
2. A 搭前端工程，引入 HTML/CSS 原型 + Three.js 基础球体渲染
3. A 对接线上真实接口，将数据映射为 3D 粒子/球体，实现点击→弹故事、提交→调 API
4. 最后打磨 3D 漫游拖拽手感 + Raycaster 点击命中率 + Nginx 跨域/HTTPS

## What's NOT Here (Don't Assume)

- 没有 package.json / 没有 lockfile — 项目尚未初始化
- 没有 CI / 没有 lint / 没有 test 框架 — 都需要从零搭建
- 没有 `.env` 模板 — 部署时手动管理环境变量
