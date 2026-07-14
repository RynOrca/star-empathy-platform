# 登录 + 首页 + 功能改进 — 设计文档

> 日期：2026-07-15 | 状态：已确认

## 一、路由架构

```
App.vue  (Vue Router 容器)
├── /              HomePage     ← 首页（Three.js 粒子星空 + 登录/注册）
├── /sky           SkyPage      ← 星空交互（现有 App.vue 内容迁移，需登录）
└── /profile       ProfilePage  ← 个人主页（我的故事 + 收藏 + 统计）
```

- 未登录访问 `/sky` `/profile` → 跳回 `/`
- 已登录访问 `/` → 跳到 `/sky`
- 新增依赖：`vue-router`

## 二、数据库

### 新增 users 表

```sql
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,           -- 2~20 字
  password_hash TEXT NOT NULL,                  -- bcrypt
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### stars 表新增列

```sql
ALTER TABLE stars ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE stars ADD COLUMN tag TEXT;          -- 情绪标签
```

- `user_id = NULL` → 匿名，`user_id` 有值 → 绑定用户
- `tag = NULL` → 未选标签

### 兼容性

沿用 `server/src/db.ts` 中已有的 `ALTER TABLE ... ADD COLUMN` try-catch 模式。

## 三、后端 API

### 新增接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/register` | `{ username, password }` → `{ user, token }` |
| POST | `/api/auth/login` | `{ username, password }` → `{ user, token }` |
| GET | `/api/auth/me` | Bearer token → `{ user }` |
| GET | `/api/stats` | 公开统计：星星总数、共鸣总数、用户数 |
| GET | `/api/stars/search` | `?q=天狼` → 匹配星名/星座名 |
| GET | `/api/profile/stories` | 需登录 → 我的故事列表 |
| GET | `/api/profile/favorites` | 需登录 → 我的收藏列表 |

### 修改现有接口

| 接口 | 改动 |
|---|---|
| `POST /api/stars/story` | 可选 `tag` 字段；带 token 时绑定 `user_id` |
| `GET /api/stars` | 响应增加 `username`（有 user_id 时）和 `tag` 字段 |

### 鉴权中间件

`server/src/middleware/auth.ts`：解析 `Authorization: Bearer <token>` → JWT 验证 → `req.user = { id, username }`
可选模式：不带 token 的请求不拦截（兼容匿名）

### 新增依赖

- `bcryptjs`：纯 JS bcrypt，无原生编译
- `jsonwebtoken`：JWT 签发/验证

## 四、前端页面

### HomePage（`/`）

- Three.js 粒子星空背景（2000 粒子，自动旋转，流星效果），独立实例，不加载星表 JSON
- 登录/注册双栏卡片，左右并列
- 匿名入口底部小字，低视觉权重
- 登录成功后存 token 到 `localStorage`，跳转 `/sky`

### SkyPage（`/sky`）

现有 `App.vue` 内容整体迁移，增加：
- 顶部导航栏：Logo / 搜索框 / 用户名 + 退出按钮
- 星星详情面板显示发送者用户名（匿名显示"匿名星语"）
- 故事卡片显示情绪标签颜色标识

### ProfilePage（`/profile`）

- 用户信息区（用户名 + 加入天数）
- 统计卡片（故事数 / 共鸣数 / 收藏数）
- 我的故事列表（卡片式，可点击跳转到对应星星）
- 收藏的星星列表
- 返回星空按钮

## 五、新增功能

### 太阳系行星

在 SkyPage 的 Three.js 场景中添加：太阳（发光球体）、月球、金星、火星、木星、土星（带环）
使用简化轨道计算，每颗天体渲染带纹理球体 + CSS2DObject 名称标签

### 搜索星星

SkyPage 顶部搜索框，输入名/星座名 → `/api/stars/search` → 相机飞向目标并高亮

### 故事主题标签

投递可选情绪标签：思念 / 等待 / 离别 / 愿望 / 孤独
前端 StoryForm 中 5 个可选按钮，后端存 `stars.tag`，展示用颜色标识

## 六、可添加功能（写入方案.md，本次不做）

- 每日精选故事（`/api/stars/featured`，首页展示"今天的星光"）
- 背景环境音（星空浏览时播放轻柔氛围音）
- 分享卡片/链接（生成故事图片分享到社交媒体）
- 节日主题星域（七夕/中秋/跨年自动切换场景色调）
- 星星距离可视化（根据实际光年距离缩放渲染大小）
- 通知系统（我的故事被共鸣时提示）
