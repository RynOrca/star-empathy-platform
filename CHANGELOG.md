# CHANGELOG

## [Unreleased]

### 2026-07-15

- **feat**: 基于登录页模板.html 完全重写 HomePage — split 布局（左品牌区+右表单区），靛蓝紫色主题
- **feat**: 新增 `POST /api/auth/guest` — 访客快捷登录，自动创建/登录内置账号「星穹访客」
- **feat**: 匿名快捷体验按钮 — 一键登录，无需注册
- **feat**: 左栏 Three.js 粒子星空全屏背景（fix: 改 window 尺寸 + fixed 定位）
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
