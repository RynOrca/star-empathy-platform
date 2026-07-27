# Issue #8: 完善账号功能 — Phase 1-3 实施计划

## 上下文

当前用户系统已实现注册/登录/访客/JWT 认证，但缺少密码修改、安全退出、防刷去重等关键功能。本计划覆盖 Phase 1-3：修改密码、退出登录（Token 黑名单）、防刷去重。

## 关键发现

- **SkyPage.vue 已有退出按钮**（`doLogout` 函数），但仅清除 localStorage，未调用后端 API 黑名单 token
- **SkyPage.vue 不追踪 userId**，只追踪 `username`；需后端通过 JWT 解码获取 user_id
- **共鸣 API 调用未发送 Authorization header**（`resonate` 函数 line 838），需加上 token
- 后端 `resonate()` 和 `recordStoryView()` 均无 user_id 参数，无去重逻辑

---

## Phase 1: 修改密码

### 后端改动

**文件: `server/src/services/userService.ts`**
- 新增 `changePassword(userId, oldPassword, newPassword)` 函数
- 验证旧密码正确性（bcrypt.compareSync）
- 验证新密码长度 6~50
- 新密码不能与旧密码相同
- bcrypt 加密新密码后更新数据库

**文件: `server/src/routes/auth.ts`**
- 新增 `PATCH /api/auth/password` 路由（authRequired）
- 接收 `{ oldPassword, newPassword }` body
- 调用 `changePassword()`，返回成功/失败

### 前端改动

**文件: `client/src/pages/ProfilePage.vue`**
- 在统计行下方新增"修改密码"按钮
- 点击弹出模态框，包含：旧密码、新密码、确认新密码输入框
- 调用 `PATCH /api/auth/password`（带 Authorization header）
- 成功后显示提示，失败显示错误信息

---

## Phase 2: 退出登录 + Token 黑名单

### 后端改动

**文件: `server/src/db.ts`**
- 新增 `token_blacklist` 表：
  ```sql
  CREATE TABLE IF NOT EXISTS token_blacklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);
  ```

**文件: `server/src/services/userService.ts`**
- 新增 `blacklistToken(token)` — 使用 SHA-256 hash 存储 token，记录 expires_at（从 JWT payload 解码 exp）
- 新增 `isTokenBlacklisted(token)` — 检查 token hash 是否在黑名单中
- 新增 `cleanExpiredTokens()` — 删除已过期的 token 记录

**文件: `server/src/middleware/auth.ts`**
- `authRequired` 函数中，在 `jwt.verify` 成功后，增加 `isTokenBlacklisted(token)` 检查
- 如在黑名单中，返回 401 "登录已过期"

**文件: `server/src/routes/auth.ts`**
- 新增 `POST /api/auth/logout` 路由（authRequired）
- 从 Authorization header 提取 token，调用 `blacklistToken()`

**文件: `server/src/index.ts`**
- 启动时注册定时任务：每 10 分钟调用 `cleanExpiredTokens()`

### 前端改动

**文件: `client/src/pages/SkyPage.vue`**
- `doLogout()` 函数增强：先调用 `POST /api/auth/logout`（带 token），然后清除 localStorage 并跳转首页
- 即使 API 调用失败也清除本地状态（防止网络问题导致无法退出）

---

## Phase 3: 防刷去重

### 后端改动

**文件: `server/src/db.ts`**
- 新增 `resonance_log` 表：
  ```sql
  CREATE TABLE IF NOT EXISTS resonance_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL REFERENCES stars(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(story_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_resonance_log_story ON resonance_log(story_id);
  ```
- 新增 `story_views` 表（去重用）：
  ```sql
  CREATE TABLE IF NOT EXISTS story_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL REFERENCES stars(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_story_views_dedup ON story_views(story_id, user_id);
  ```
- `catalog_visits` 表添加 `user_id` 列：
  ```sql
  ALTER TABLE catalog_visits ADD COLUMN user_id INTEGER REFERENCES users(id);
  CREATE INDEX IF NOT EXISTS idx_catalog_visits_user ON catalog_visits(user_id);
  ```

**文件: `server/src/services/starService.ts`**
- `resonate(id, userId?)` 改为：
  - 如果 userId 存在，检查 `resonance_log` 是否有 `(story_id, user_id)` 记录
  - 如已存在，返回 `{ already: true }` 而不是增加计数
  - 如不存在，插入 `resonance_log`，然后 `resonance_count + 1`
  - 如果 userId 不存在（匿名），直接 `resonance_count + 1`（保持向后兼容）
- `recordStoryView(storyId, userId?)` 改为：
  - 如果 userId 存在，检查 `story_views` 24h 内是否有记录
  - 有记录则跳过，无记录则插入 `story_views` 并 `view_count + 1`
  - 匿名用户直接 +1
- `recordCatalogVisit(catalogStarId, userId?)` 改为：
  - 如果 userId 存在，检查 `catalog_visits` 24h 内是否有 `(catalog_star_id, user_id)` 记录
  - 有记录则跳过，无记录则插入（含 user_id）
  - 匿名用户直接插入（无 user_id）

**文件: `server/src/routes/stories.ts`**
- `POST /:storyId/resonate` 改为 `authOptional`（获取 user 信息）
- 将 `user?.id` 传入 `resonate(id, userId)`
- `POST /:storyId/view` 改为 `authOptional`
- 将 `user?.id` 传入 `recordStoryView(storyId, userId)`

**文件: `server/src/routes/catalog.ts`**
- `POST /:catalogStarId/visit` 改为 `authOptional`
- 将 `user?.id` 传入 `recordCatalogVisit(catalogStarId, userId)`

### 前端改动

**文件: `client/src/pages/SkyPage.vue`**
- `onResonate()` 函数：在 fetch 请求中添加 `Authorization: Bearer ${token}` header
- `StarDetail.vue` 中 `openStoryDetail()` 的 `fetch('/api/stories/${story.id}/view')` 也加上 token header

---

## 验证步骤

### Phase 1 验证
1. 启动后端 `npm run dev`，前端 `npm run dev`
2. 登录账号 → 进入个人主页
3. 点击"修改密码" → 输入错误旧密码 → 应提示"旧密码错误"
4. 输入正确旧密码 + 新密码 → 修改成功
5. 退出后用新密码重新登录 → 成功

### Phase 2 验证
1. 登录后点击"退出"按钮
2. 检查 localStorage 中 token 已清除
3. 用旧 token 直接调用 API（如 `GET /api/auth/me`）→ 应返回 401
4. 检查数据库 `token_blacklist` 表有记录

### Phase 3 验证
1. 登录后给某故事点共鸣 → 成功，resonance_count +1
2. 再次点击同一故事共鸣 → 应返回 `{ already: true }`，resonance_count 不变
3. 匿名用户点击共鸣 → 仍可正常 +1（向后兼容）
4. 查看故事详情 → view_count +1
5. 24h 内再次查看同一故事 → view_count 不变
6. 查看恒星详情 → catalog_visits 记录
7. 24h 内再次查看同一恒星 → 不重复记录

## 修改文件清单

| 文件 | Phase | 改动类型 |
|------|-------|----------|
| `server/src/db.ts` | 2, 3 | 新增表 + 兼容列 |
| `server/src/services/userService.ts` | 1, 2 | 新增函数 |
| `server/src/services/starService.ts` | 3 | 修改函数签名 |
| `server/src/middleware/auth.ts` | 2 | 增加黑名单检查 |
| `server/src/routes/auth.ts` | 1, 2 | 新增路由 |
| `server/src/routes/stories.ts` | 3 | 修改路由 |
| `server/src/routes/catalog.ts` | 3 | 修改路由 |
| `server/src/index.ts` | 2 | 定时清理 |
| `client/src/pages/ProfilePage.vue` | 1 | 新增 UI |
| `client/src/pages/SkyPage.vue` | 2, 3 | 修改函数 |
| `client/src/components/StarDetail.vue` | 3 | 修改 API 调用 |