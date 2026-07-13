# 后端实现规划 — 开发者 B

## TL;DR (For humans)

后端从零搭建三个 REST API + SQLite + 冷启动数据爬虫，最终部署到 ECS。
分 **5 个阶段**，每阶段有明确的"完成标志"（✅ 检查点），验收后才进下一阶段。

---

## 阶段 1：项目初始化

**目标**：Node.js + Express 工程跑起来，本地能访问 `http://localhost:3000`

### 任务

- [ ] **1.1 初始化项目**
  - 创建 `server/` 目录作为后端根目录
  - 在 `server/` 下执行 `npm init -y`
  - 安装依赖：`npm install express cors better-sqlite3`
  - 安装开发依赖：`npm install -D typescript @types/express @types/cors @types/node ts-node nodemon`
  - `npx tsc --init`（生成 tsconfig.json）

- [ ] **1.2 创建基础项目结构**
  ```
  server/
  ├── package.json
  ├── tsconfig.json
  ├── src/
  │   ├── index.ts          # Express 入口
  │   ├── db.ts             # SQLite 连接 + 初始化
  │   ├── routes/
  │   │   └── stars.ts      # 三星接口路由
  │   ├── services/
  │   │   └── starService.ts # 业务逻辑层
  │   └── utils/
  │       └── position.ts    # 坐标生成函数
  ├── data/
  │   └── stars.db           # SQLite 数据库文件（运行时生成）
  └── scripts/
      └── seed.ts            # 爬虫数据注入脚本
  ```

- [ ] **1.3 跑通最小 Express 服务**
  ```ts
  // src/index.ts
  import express from 'express';
  import cors from 'cors';

  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_, res) => {
    res.json({ code: 200, message: 'ok', data: null });
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  ```

- [ ] **1.4 package.json 添加 scripts**
  ```json
  "scripts": {
    "dev": "nodemon --watch src --ext ts --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "seed": "ts-node scripts/seed.ts"
  }
  ```

- [ ] **1.5 验证**
  - 运行 `npm run dev`，浏览器访问 `http://localhost:3000/api/health`
  - 应返回 `{ "code": 200, "message": "ok", "data": null }`

### ✅ 阶段 1 检查点
- `npm run dev` 启动无报错
- `/api/health` 返回 200

---

## 阶段 2：数据库 + 三个 API

**目标**：SQLite 建表完毕，三个接口全部可用，错误处理完整

### 任务

- [ ] **2.1 实现 SQLite 连接模块 (`src/db.ts`)**
  ```ts
  import Database from 'better-sqlite3';
  import path from 'path';

  const DB_PATH = path.join(__dirname, '../data/stars.db');
  const db = new Database(DB_PATH);

  // 启用 WAL 模式提升读写性能
  db.pragma('journal_mode = WAL');

  // 建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS stars (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      type            TEXT NOT NULL DEFAULT 'user',
      title           TEXT,
      content         TEXT NOT NULL,
      resonance_count INTEGER NOT NULL DEFAULT 0,
      pos_x           REAL NOT NULL,
      pos_y           REAL NOT NULL,
      pos_z           REAL NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_stars_type ON stars(type);
  `);

  export default db;
  ```

- [ ] **2.2 实现坐标生成函数 (`src/utils/position.ts`)**
  ```ts
  export function generatePosition() {
    const range = 300;
    return {
      x: parseFloat((Math.random() * range * 2 - range).toFixed(1)),
      y: parseFloat((Math.random() * range * 2 - range).toFixed(1)),
      z: parseFloat((Math.random() * range * 2 - range).toFixed(1)),
    };
  }
  ```

- [ ] **2.3 实现业务逻辑层 (`src/services/starService.ts`)**
  ```ts
  import db from '../db';
  import { generatePosition } from '../utils/position';

  interface Star {
    id: number;
    type: string;
    title: string | null;
    content: string;
    resonance_count: number;
    pos_x: number;
    pos_y: number;
    pos_z: number;
    created_at: string;
  }

  // 获取所有星星
  export function getAllStars(): Star[] {
    return db.prepare('SELECT * FROM stars ORDER BY created_at DESC').all() as Star[];
  }

  // 创建星星
  export function createStar(content: string): Star {
    const pos = generatePosition();
    const stmt = db.prepare(`
      INSERT INTO stars (type, content, pos_x, pos_y, pos_z)
      VALUES ('user', ?, ?, ?, ?)
    `);
    const result = stmt.run(content, pos.x, pos.y, pos.z);
    return db.prepare('SELECT * FROM stars WHERE id = ?').get(result.lastInsertRowid) as Star;
  }

  // 共鸣 +1
  export function resonate(id: number): { id: number; resonance_count: number } | null {
    const star = db.prepare('SELECT * FROM stars WHERE id = ?').get(id) as Star | undefined;
    if (!star) return null;
    db.prepare('UPDATE stars SET resonance_count = resonance_count + 1 WHERE id = ?').run(id);
    const updated = db.prepare('SELECT id, resonance_count FROM stars WHERE id = ?').get(id) as { id: number; resonance_count: number };
    return updated;
  }
  ```

- [ ] **2.4 实现路由层 (`src/routes/stars.ts`)**
  - `GET /api/stars` — 返回所有星星
  - `POST /api/stars/story` — 创建星星（含校验）
  - `POST /api/stars/:id/resonate` — 共鸣点亮

  **关键校验逻辑（story 接口）：**
  ```ts
  // content 校验
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ code: 400, message: 'content 不能为空', data: null });
  }
  const trimmed = content.trim();
  if (trimmed.length === 0 || trimmed.length > 300) {
    return res.status(400).json({ code: 400, message: 'content 长度需在 1~300 字之间', data: null });
  }
  // 转义 HTML
  const safeContent = trimmed.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!));
  ```

- [ ] **2.5 更新入口 (`src/index.ts`)**
  - 挂载 `starsRouter` 到 `/api/stars`
  - 添加全局错误处理中间件（try-catch 兜底 → 500）

- [ ] **2.6 验证所有接口**
  ```bash
  # GET 所有星星
  curl http://localhost:3000/api/stars

  # POST 创建星星
  curl -X POST http://localhost:3000/api/stars/story \
    -H "Content-Type: application/json" \
    -d '{"content": "测试内容"}'

  # POST 共鸣
  curl -X POST http://localhost:3000/api/stars/1/resonate

  # 测试空内容（应返 400）
  curl -X POST http://localhost:3000/api/stars/story \
    -H "Content-Type: application/json" \
    -d '{"content": ""}'

  # 测试不存在 id（应返 404）
  curl -X POST http://localhost:3000/api/stars/9999/resonate
  ```

### ✅ 阶段 2 检查点
- `GET /api/stars` 返回空数组 `[]`（200）
- `POST /api/stars/story` 成功创建，返回新星星
- `POST /api/stars/:id/resonate` 成功 +1
- 空内容返 400，不存在 id 返 404
- 所有响应格式统一 `{ code, message, data }`

---

## 阶段 3：冷启动数据注入

**目标**：库里有 20+ 条真实数据（古诗词、星座神话、社区语录）

### 任务

- [ ] **3.1 编写数据脚本 (`scripts/seed.ts`)**
  - 数据源方案（按优先级）：
    1. **今日诗词 API**：`https://www.jinrishici.com/` （免费，10 条）
    2. **手工准备**：星座神话 5 条 + 社区语录 5 条（从 v2ex.com 手动复制热门内容）
    3. **维基百科抓取**：如果会写简单爬虫则加 5 条
  - 脚本逻辑：
    - 清空现有 `type='history'` 的数据（避免重复）
    - 插入爬取/手撰数据
    - `resonance_count` 随机 5~200
    - `position` 用 `generatePosition()`

- [ ] **3.2 注入后验证**
  ```bash
  # 查看总数
  sqlite3 data/stars.db "SELECT COUNT(*) FROM stars;"
  # 查看历史星数量
  sqlite3 data/stars.db "SELECT COUNT(*) FROM stars WHERE type='history';"
  # 抽样查看
  sqlite3 data/stars.db "SELECT id, title, substr(content,1,30) FROM stars LIMIT 5;"
  ```

### ✅ 阶段 3 检查点
- 数据库里 ≥20 条 `type='history'` 的真实数据
- 无 "test 123" 之类的假数据

---

## 阶段 4：编译构建 + API 文档

**目标**：可以 `npm run build` 生成生产代码，给 A 完整的接口文档

### 任务

- [ ] **4.1 确保 TypeScript 编译通过**
  - `npm run build` 应无错误
  - `dist/` 目录生成 JS 文件

- [ ] **4.2 给 A 的接口文档**
  - 把 `方案.md` 第三节发给 A
  - 补充说明：
    - 接口 base URL（本地 `http://localhost:3000`，线上 `https://your-domain.com`）
    - 跨域：已配置 `cors()` 中间件，任意来源可访问
    - 位置字段映射：`pos_x` → `position.x`, `pos_y` → `position.y`, `pos_z` → `position.z`

### ✅ 阶段 4 检查点
- `npm run build` 零错误
- A 拿到文档可以直接写前端对接代码

---

## 阶段 5：部署上线

**目标**：API 在 ECS 上运行，A 能从线上访问

### 任务

- [ ] **5.1 ECS 环境准备**
  - 安装 Node.js ≥18
  - 安装 PM2：`npm install -g pm2`
  - 安装 Nginx

- [ ] **5.2 上传代码并启动**
  - 上传 `server/` 到 ECS（`scp` 或 `git clone`）
  - `cd server && npm install --production`
  - 确保 `data/` 目录存在
  - 首次运行种子：`npm run seed`
  - PM2 启动：`pm2 start dist/index.js --name star-api`
  - `pm2 save` + `pm2 startup`

- [ ] **5.3 Nginx 配置**
  - 把 `方案.md` 中的 Nginx 配置填入 `/etc/nginx/conf.d/star.conf`
  - 替换 `your-domain.com` 为真实域名
  - `nginx -t` 测试配置 → `nginx -s reload`

- [ ] **5.4 线上验证**
  ```bash
  curl https://your-domain.com/api/stars
  curl https://your-domain.com/api/health
  curl -X POST https://your-domain.com/api/stars/story \
    -H "Content-Type: application/json" \
    -d '{"content": "线上测试"}'
  ```

### ✅ 阶段 5 检查点
- 线上 3 个接口全部可用
- PM2 守护（崩溃自动重启）
- A 的线上前端可以正常调用

---

## 依赖矩阵

```
阶段 1 (初始化)
    ↓
阶段 2 (数据库+API) ← 阶段 1 完成
    ↓
阶段 3 (冷数据注入) ← 阶段 2 完成
    ↓
阶段 4 (编译+文档) ← 阶段 2 完成（可与 3 并行）
    ↓
阶段 5 (部署)      ← 阶段 3 + 4 完成
```

## 风险与注意事项

- **better-sqlite3 编译**：Windows 下需要 `npm install --build-from-source` 或安装 node-gyp 依赖；如果编译失败，可退化为 `sqlite3` 包（异步 API）
- **WAL 模式**：多进程读 + 单进程写的场景性能更好，但文件会多 `-wal` 和 `-shm` 两个文件（正常）
- **更好的部署顺序**：建议先把代码推到 GitHub，ECS 上 `git clone`，方便后续迭代更新
- **不需要 `.env`**：本期无敏感配置，端口直接写 3000 即可
