# 实现规划：登录 + 首页 + 功能改进

> 基于 `.omo/specs/2026-07-15-login-homepage-design.md`
> 日期：2026-07-15

## TL;DR (For humans)

7 个阶段，顺序执行。前 2 阶段是纯后端（B），后 5 阶段是纯前端（A）+ 行星（A/B 协作）。每阶段有检查点 ✅。

---

## 阶段 1：后端 — users 表 + JWT 中间件 + auth API

### 任务

- [ ] **1.1 安装依赖**
  ```bash
  cd server
  npm install bcryptjs jsonwebtoken
  npm install -D @types/bcryptjs @types/jsonwebtoken
  ```

- [ ] **1.2 数据库建表 (`server/src/db.ts`)**
  - 在 `stars` 建表后追加 `CREATE TABLE IF NOT EXISTS users (...)`
  - 末尾 try-catch 追加 `ALTER TABLE stars ADD COLUMN user_id INTEGER` 和 `tag TEXT`

- [ ] **1.3 JWT 中间件 (`server/src/middleware/auth.ts`)**
  - `authRequired`：解析 Bearer token → 验证 JWT → `req.user = { id, username }`；无 token 返回 401
  - `authOptional`：同上，但无 token 时 `req.user = null`（不拦截，兼容匿名请求）

- [ ] **1.4 用户服务 (`server/src/services/userService.ts`)**
  ```ts
  export function register(username: string, password: string): { user, token }
  export function login(username: string, password: string): { user, token }
  export function getUserById(id: number): { id, username, created_at } | null
  ```
  密码用 `bcryptjs.hashSync(password, 10)`，登录用 `compareSync`

- [ ] **1.5 Auth 路由 (`server/src/routes/auth.ts`)**
  - `POST /api/auth/register` — 校验 username 2~20 字 / password 6~50 字，查重 → 创建 → 返回 token
  - `POST /api/auth/login` — 查用户 → 验密码 → 返回 token
  - `GET /api/auth/me` — `authRequired` 中间件 → 返回 `{ id, username, created_at }`

- [ ] **1.6 入口挂载 (`server/src/index.ts`)**
  - `app.use('/api/auth', authRouter)`

- [ ] **1.7 JWT 密钥**
  - `const JWT_SECRET = process.env.JWT_SECRET || 'star-empathy-dev-secret'`
  - 部署前改为环境变量（记录在 `toA.md`）

### ✅ 检查点
```bash
# 注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'
# 预期: { code:200, data:{ user:{...}, token:"eyJ..." } }

# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'
# 预期同上

# 拿用户
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
# 预期: { code:200, data:{ id:1, username:"test", created_at:"..." } }
```

---

## 阶段 2：后端 — stats + tag + 现有接口适配 + 搜索

### 任务

- [ ] **2.1 统计接口**
  - `GET /api/stats` → `{ starCount, userCount, totalResonance }`
  - 不需要鉴权

- [ ] **2.2 搜索接口**
  - `GET /api/stars/search?q=天狼`
  - 在 `stars.json` 的星名和星座名中模糊匹配（纯前端数据，不查数据库）
  - 返回匹配的恒星列表 `[{ id, name, con, mag, ra, dec }]`

- [ ] **2.3 修改 `POST /api/stars/story`**
  - `authOptional` 中间件 → `req.user` 有值时绑定 `user_id`
  - 接收可选 `tag` 字段（枚举校验：思念/等待/离别/愿望/孤独，或 null）

- [ ] **2.4 修改 `GET /api/stars`**
  - 返回数据中 JOIN `users` 表：`username = users.username`（有 user_id 时）
  - 新增 `tag` 字段

- [ ] **2.5 个人数据接口**
  - `GET /api/profile/stories`（`authRequired`）→ 我发送的故事列表
  - `GET /api/profile/favorites`（`authRequired`）→ 我收藏的星星列表

### ✅ 检查点
```bash
curl http://localhost:3000/api/stats
# { code:200, data:{ starCount:25, userCount:1, totalResonance:... } }

curl "http://localhost:3000/api/stars/search?q=天狼"
# { code:200, data:[{ id:17, name:"天狼星", con:"CMa", ... }] }
```

---

## 阶段 3：前端 — Vue Router + HomePage

### 任务

- [ ] **3.1 安装 vue-router**
  ```bash
  cd client
  npm install vue-router
  ```

- [ ] **3.2 创建路由 (`client/src/router/index.ts`)**
  ```ts
  const routes = [
    { path: '/', component: () => import('../pages/HomePage.vue') },
    { path: '/sky', component: () => import('../pages/SkyPage.vue'), meta: { requiresAuth: true } },
    { path: '/profile', component: () => import('../pages/ProfilePage.vue'), meta: { requiresAuth: true } },
  ]
  ```
  `beforeEach` 守卫：检查 `localStorage.token`（`meta.requiresAuth` 且无 token → `/`；已登录访问 `/` → `/sky`）

- [ ] **3.3 创建 auth store（`client/src/stores/auth.ts`）**
  - `login(username, password)` → POST /api/auth/login → 存 token
  - `register(username, password)` → POST /api/auth/register → 存 token
  - `logout()` → 清 token → 跳转 `/`
  - `user` ref（从 /api/auth/me 获取）
  - `isLoggedIn` computed

- [ ] **3.4 创建 `HomePage.vue`**
  - Three.js 粒子星空背景（`client/src/composables/useParticleSky.ts`）
    - 2000 粒子，随机分布
    - 自动缓慢旋转（Y 轴每帧 +0.0005）
    - 粒子呼吸：sin(time * 0.001) 调节 opacity
    - 流星：每 3~8 秒随机发射一条短轨迹线
    - `onBeforeUnmount` 中 dispose
  - 文案区：大标题 + 副标题（渐变金色，CSS 动画）
  - 登录/注册双栏卡片
    - 左：登录表单（用户名 + 密码 + "进入星空"按钮）
    - 右：注册表单（用户名 + 密码 + 确认密码 + "注册"按钮）
    - 表单校验：前端校验长度 + 后端返回错误时 toast 提示
  - 匿名入口：分割线 + "匿名进入 · 不登录" 小字按钮
  - 底部统计：`onMounted` 调 `/api/stats`，显示"已有 X 颗历史星 · X 次共鸣"

- [ ] **3.5 修改 `main.ts`**
  - `createApp(App).use(router).mount('#app')`
  - `App.vue` 改为 `<RouterView />`

### ✅ 检查点
- 浏览器打开 `http://localhost:5173` → 看到粒子星空首页
- 注册新用户 → 自动跳到 `/sky`
- 退出后再访问 `/sky` → 自动跳回 `/`
- 匿名进入 → 跳到 `/sky`，`localStorage` 无 token

---

## 阶段 4：前端 — SkyPage 迁移 + 导航栏 + 发送者显示

### 任务

- [ ] **4.1 创建 `SkyPage.vue`**
  - 把现有 `App.vue` 的 `<template>`、`<script>`、`<style>` 整体搬入
  - 增加顶部导航栏（见下）
  - 增加搜索框（见下）
  - 故事详情卡片上显示 `username` 或 "匿名星语"

- [ ] **4.2 顶部导航栏**
  ```
  ┌──────────────────────────────────────────────┐
  │  ⭐ 星语穹庭    [🔍 搜索星星...]    👤 orca 退出  │
  └──────────────────────────────────────────────┘
  ```
  - 固定顶部，背景半透明
  - 点击用户名 → 跳转 `/profile`
  - 点击退出 → 清 token → 跳转 `/`

- [ ] **4.3 发送者显示**
  - `StarDetail.vue` 的故事卡片中，title 下方显示 `by {{ story.username || '匿名星语' }}`
  - 标签颜色圆点显示

### ✅ 检查点
- `/sky` 页面看到导航栏
- 已有 23 颗历史星正常渲染
- 点击星星弹出详情，匿名故事显示"匿名星语"

---

## 阶段 5：前端 — ProfilePage + 搜索 + 标签

### 任务

- [ ] **5.1 创建 `ProfilePage.vue`**
  - 用户信息卡片（用户名 + 加入天数，从 `/api/auth/me` 获取）
  - 统计卡片（故事数/共鸣数/收藏数）
  - 我的故事列表：卡牌式，显示标题/内容摘要/共鸣数/标签，点击跳到对应星星
  - 收藏列表：星星名称卡牌
  - "← 返回星空" 按钮

- [ ] **5.2 搜索星星**
  - 导航栏搜索框：输入 → 调用 `/api/stars/search` → 下拉列表
  - 选中 → 相机 `lookAt` 飞到目标坐标（`raDecXYZ`）+ 高亮脉冲动画

- [ ] **5.3 故事标签**
  - `StoryForm.vue` 中 textarea 下方加 5 个标签按钮（思念/等待/离别/愿望/孤独）
  - 选中高亮，单选（不选 = null）
  - 提交时 `POST body` 含 `tag` 字段
  - 故事卡片上标签用小圆点颜色区分：
    - 思念：#ff8b7d（暖红）| 等待：#86a8ff（蓝）| 离别：#caa7ff（紫）
    - 愿望：#ffd98a（金）| 孤独：#95f0c0（绿）

### ✅ 检查点
- `/profile` 显示用户信息和故事列表
- 搜索"天狼" → 相机飞向天狼星
- 投递故事选标签 → 故事卡片显示对应颜色圆点

---

## 阶段 6：行星渲染

### 任务

- [ ] **6.1 行星数据 (`client/src/data/planets.ts`)**
  - 6 颗天体：太阳/月球/金星/火星/木星/土星
  - 每颗：名称、近似 RA/Dec（按日期动态计算）、大小、颜色
  - 简化：用当前日期的简化椭圆轨道公式计算位置

- [ ] **6.2 场景渲染**
  - 在 `useSky.ts` 中添加行星渲染逻辑
  - 太阳：发光球体（`MeshBasicMaterial` + 外圈光晕 Sprite）
  - 行星：带纹理球体（纯色即可，比赛不要求真实纹理）
  - 土星：球体 + 倾斜环（`RingGeometry`）
  - 每颗天体 `CSS2DObject` 名称标签

### ✅ 检查点
- SkyPage 中能看到太阳和行星
- 行星标签可见（点击不受影响）

---

## 阶段 7：方案更新

### 任务

- [ ] **7.1 方案.md 追加章节**
  - 新增"可添加功能"章节，列出设计文档第六节内容

### ✅ 检查点
- `方案.md` 末尾有可添加功能列表

---

## 依赖矩阵

```
阶段 1 (users + JWT + auth API)
    ↓
阶段 2 (stats + tag + 适配 + 搜索API)
    ↓
阶段 3 (Vue Router + HomePage)  ← 依赖阶段 1+2 的后端接口
    ↓
阶段 4 (SkyPage 迁移)           ← 依赖阶段 3 的路由
    ↓
阶段 5 (Profile + 搜索 + 标签)   ← 可和阶段 6 并行
    ↓
阶段 6 (行星)                   ← 可和阶段 5 并行
    ↓
阶段 7 (方案更新)
```

## 注意事项

- **JWT_SECRET**：开发阶段硬编码字符串，部署前在 `toA.md` 中说明如何设环境变量
- **`authOptional` vs `authRequired`**：匿名请求走 `authOptional`，个人数据走 `authRequired`
- **localStorage 中的 token**：退出时清空，登录时写入
- **Vite 代理**：新增 `/api/auth` `/api/stats` `/api/profile` 路由，确认 `vite.config.ts` 中 `/api` 代理能覆盖
