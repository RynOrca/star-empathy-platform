# Draft: 后端实现规划

- **intent**: CLEAR
- **review_required**: false
- **status**: awaiting-approval
- **方案依据**: `方案.md` — 开发者 B 分工（后端逻辑、数据流、运维部署）

## 决策记录

| 决策项 | 选择 | 理由 |
|---|---|---|
| SQLite 驱动 | better-sqlite3（同步，简单） | Hackathon 场景，性能足够；如果 Windows 编译失败可退化为 sqlite3 |
| 项目结构 | server/ 独立目录 | 与前端分离，方便 A 并行开发 |
| 错误处理 | 路由层校验 + 全局兜底中间件 | 确保 400/404/500 格式统一 |
| 冷热数据 | 种子脚本独立，history 数据手工+爬虫混合 | 保证真实数据，手动兜底避免爬虫失败阻塞部署 |
| 部署 | PM2 + Nginx 反向代理 | 方案已确定，直接执行 |
