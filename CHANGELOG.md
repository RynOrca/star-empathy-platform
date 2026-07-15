# CHANGELOG

## [Unreleased]

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
