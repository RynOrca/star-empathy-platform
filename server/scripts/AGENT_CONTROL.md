# Agent 控制手册（server/）

本手册覆盖：冷启动建库 → 内核（story_kernels）生成 → AI 叙事 5 卡分析生成 →
常见错误排查 → 上线后自动再生机制。

全部命令都在 `server/` 目录下执行，除非特别说明。

---

## 0. Node.js 前置条件

需要 **Node.js ≥ 22.5**（后端依赖实验性内置模块 `node:sqlite`）：

```bash
node -v        # 必须 >= 22.5
npm install    # 首次 / 每次 package.json 变动后执行
```

---

## 1. DeepSeek + 高德 Key 配置（**必须先做**）

项目不提供客户端写入 Key 的通道（出于安全考虑）。在服务器上用以下**两种方式
之一**配置，方式 A / B 二选一；同时写时 **`.runtime-key` 文件优先**。

### 方式 A：环境变量（推荐，重启不丢）

写进 `server/.env`，或你托管进程的 environment（systemd / pm2 / docker）：

```
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AMAP_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx        # 可选：反向地理编码用
JWT_SECRET=随便一段长字符串，至少 32 字节
DATABASE_URL=./data/stars.db                         # 默认就是这个，不用改
```

### 方式 B：运行时文件（立即生效，不用重启 node 进程）

```bash
cd server
echo -n 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' > .runtime-key
chmod 600 .runtime-key

# 高德（可选）
echo -n 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' > .runtime-amap-key
chmod 600 .runtime-amap-key
```

**⚠️ 关键注意**：

- `echo` 必须带 `-n`，末尾多一个换行 `\n`（0x0A）都会让 DeepSeek 直接 401。
  检查：`xxd .runtime-key | tail -1`，最后一个字节不要是 `0a`。
- 文件权限要 `chmod 600`，否则同一台机器上其它用户可读你的 Key。

### 验证 Key 是否真的可用（任何用户都能跑）

```bash
# 让后端自己打一次请求，确认 200 OK：
curl -sS -X GET 'http://127.0.0.1:3000/api/catalog/stars/162/narrative' \
     -H 'Accept: application/json' | head -c 400
# 输出里有 "code":200 且 data.narrative 不是空的 = Key 连通。
```

如果返回 401 / Authentication Fails，跳「6. 常见错误排查」。

---

## 2. 冷启动（**只有第一次部署才跑！**）

```bash
cd server
npm run seed
```

做了什么：
- 创建 `server/data/stars.db` SQLite 文件和 3 张表（stars / catalog_visits / favorites）
- 注入 6140 颗星表恒星坐标（只读元数据，从 `server/src/data/ancientFigures.ts` +
  client 端 `stars.json` 加载）
- **清空「历史星 / 用户星」** 并注入 23 条冷启动真实故事（古诗词 / 星座神话 /
  社区语录）

**⚠️ 警告**：`npm run seed` 会 `DELETE FROM stars WHERE origin IN ('user','catalog')`
后再插，**已有生产数据绝对不要再跑第二次**。

---

## 3. 批量脚本一览

| 命令 | 说明 | 运行时机 |
|---|---|---|
| `npm run seed` | 冷启动建库 + 注入 23 条故事 | **仅首次部署** |
| `npm run agent:kernels` | 为缺少「内核」的故事生成「情绪标签 / 一句话凝练 / 主题词」→ 写 `story_kernels` 表 | 冷启动后第一次、每次批量导入后、或出现大规模 401 修完 key 后 |
| `npm run agent:analyze` | 为星表恒星批量生成「AI 叙事 5 卡」→ 写 `catalog_star_analyses` 表 | `agent:kernels` 跑完之后、或修完 key 强制重跑 |
| `ts-node scripts/fix-cids.mjs` | 修复 catalog_star_id 脏数据（历史迁移脚本） | 只在迁移报错时用 |

---

## 4. `agent:kernels` 详解

**脚本**：[scripts/generateKernels.ts](file:///d:/Project/star-empathy-platform/server/scripts/generateKernels.ts)
**服务**：[services/kernel.ts](file:///d:/Project/star-empathy-platform/server/src/services/kernel.ts)

### 做什么
挑出所有 `story_kernels.id IS NULL` 的故事，逐条调用 DeepSeek：

```json
{
  "emotion": "yearning|..." ,
  "summary": "一句话凝练，不超 40 字",
  "themes":  ["故乡","思念","秋夜",... ]
}
```

写完内核是跑「AI 叙事 5 卡」的前置条件——没有内核，themehour 就拿不到主题词、
persona 拿不到性格标签。

### 参数
全部用**位置参数 / 环境变量**，没有命令行参数，配置如下：

| 环境变量 | 默认 | 说明 |
|---|---|---|
| `KERNEL_BATCH` | `all` | `all`= 全量补；或数字 N = 只处理前 N 条（调试） |
| `KERNEL_CONCURRENCY` | `3` | 并发调用 DeepSeek 的次数，不要 > 5，容易 429 |

### 例子
```bash
# 全量补（冷启动后第一次用这个）
npm run agent:kernels

# 只跑 50 条（调试 prompt 用）
KERNEL_BATCH=50 npm run agent:kernels

# 单故事串行跑（防止 429）
KERNEL_CONCURRENCY=1 npm run agent:kernels
```

---

## 5. `agent:analyze` 详解（AI 叙事 5 卡批量生成）

**脚本**：[scripts/generateAllAnalyses.ts](file:///d:/Project/star-empathy-platform/server/scripts/generateAllAnalyses.ts)
**Agent 入口**：[agents/starAnalysisAgent.ts](file:///d:/Project/star-empathy-platform/server/src/agents/starAnalysisAgent.ts)

### 生成的 3 步产物
每颗星按顺序执行：

| 步骤 | 产物 | 故事数门槛 | 写入 `catalog_star_analyses` 字段 |
|---|---|---|---|
| 1 | themehour（主题森林树 + 时辰观察珠 + AI 三段文） | `>= 1` | `themehour_json` |
| 2 | persona（星格画像 · 5 维词云 + 解读文） | `>= 5` | `persona_json` |
| 3 | emotion（情感解构 · 5 维雷达 + 摘录 3 条） | `>= 5` | `emotion_json`

门槛设计与前端空态完全对齐：故事数 < 5 时，persona/emotion 根本不调用 DeepSeek，
直接 onProgress 打日志跳过，不浪费钱。

### 所有命令行参数

```bash
npm run agent:analyze -- [--参数 值]
```

| 参数 | 默认 | 说明 |
|---|---|---|
| `--min-stories 5` | `5` | 故事数小于 N 的星直接 skip，**推荐保持 5**，与前端 / 门槛对齐 |
| `--limit 20` | `20` | 本次只处理前 N 颗（按故事数 + 共鸣降序优先处理亮星） |
| `--list` | — | **只打印将要处理哪些星，不真正调 API**（第一次跑强烈建议先 --list 检查） |
| `--ids 162,114,175` | — | 白名单：只处理这几颗 catalog_star_id（调试 prompt / 修单颗星） |
| `--force` | — | 忽略 `story_hash` 幂等校验，**强制重算**（改了 prompt / 清了 key 重新跑时必须加） |
| `--only themehour` | — | 只跑某一步或几步（逗号分隔）。可选值：`themehour` `persona` `emotion` |
| `--throttle 1200` | `1200` ms | 每颗星的 3 步之间 sleep 毫秒数。DeepSeek 429 就调大（2000/3000） |

### 常见组合
```bash
# 第一次冷启动跑完 kernel 之后：先看打算处理谁
npm run agent:analyze -- --min-stories 5 --limit 30 --list

# 正式跑：故事≥5 的前 30 颗亮星
npm run agent:analyze -- --min-stories 5 --limit 30

# Key 换了新的 → 清掉旧 partial 空壳记录，强制全量重算前 100 颗
npm run agent:analyze -- --min-stories 5 --limit 100 --force

# 只补主题森林+时辰观察的 AI 润色文（便宜，想先快速点亮 UI 用）
npm run agent:analyze -- --min-stories 1 --limit 200 --only themehour

# 就想重算织女（162）和天狼（114）两颗
npm run agent:analyze -- --ids 162,114 --force
```

### 幂等 & 避免浪费 API
`ensureOne()` 计算 `story_hash = SHA1(catalog_id | story_count | latest_story_created_at)[:16]`：

- 同一颗星「故事总数 + 最新故事时间」没变 → hash 相同 → 即使 `--force` 没加也
  不会再调 DeepSeek，控制台打 `[story_hash 不变] skip`。
- 一旦新故事进来（下一步 7. 自动再生）hash 变了 → 自动触发重新生成。

---

## 6. 常见错误排查

### `Authentication Fails, Your api key: ****xxxx is invalid` (HTTP 401)

**根因**：`.runtime-key` 里的 key 无效（撤销 / 过期 / 末尾带换行 / 从来不对）。

**修**：
```bash
# 1. 看看文件末尾是不是多了 0x0A（换行）
xxd server/.runtime-key | tail -1

# 2. 重新写入（echo -n！！）
echo -n 'sk-你今天在 platform.deepseek.com 新复制的那串' > server/.runtime-key
chmod 600 server/.runtime-key

# 3. 不用重启进程，直接再 curl 一次 /narrative 验证
```

### `429 Too Many Requests`（rate limit）

**根因**：并发 > 5 或 prompt 太长 + 批量跑。

**修**：
```bash
# 调小并发（kernels）
KERNEL_CONCURRENCY=1 npm run agent:kernels
# 加大两步之间的 sleep（analyze）
npm run agent:analyze -- --throttle 3500 ...
```

### `SQLITE_READONLY` / `database is locked`

**根因**：部署用户对 `server/data/` 没写权限，或另一个 node 进程持有写锁。

**修**：
```bash
chmod u+rwX server/data
chmod u+rw  server/data/stars.db
# 如果有旧进程抢锁：
#   lsof server/data/stars.db  →  kill PID
```

### `500 Internal Server Error`（前端报 /visit /stats /analysis 500）

**根因**：通常是旧 dev server 进程还在监听 :3000（合并前的老代码）。

**修**：
```powershell
# Windows：查 3000 谁占的，kill 掉重启
Get-NetTCPConnection -LocalPort 3000 | % { Stop-Process -Id $_.OwningProcess -Force }
```

---

## 7. 上线后的自动再生机制（**全自动，不用再手动跑脚本**）

部署启动成功后，以下 3 条链路完全自动：

| 触发事件 | 服务器做什么 | 耗时 |
|---|---|---|
| 用户投第 1 ~ 4 条故事（某星） | 生成单故事 kernel（调 1 次 DeepSeek）；catalog 分析**不跑**（storyCount<5 门双校验，一次都不会花 API） | ~3s |
| 用户投第 5 条故事（跨线） | 生成单故事 kernel → 15s debounce 合并静默期 → ensureOne(cid) 串行跑 themehour + persona + emotion 3 步 + 每步 sleep 1.2s 防 429 → 写入 `catalog_star_analyses` | ~20s（含 15s debounce） |
| 用户投第 6+ 条故事 | 每多一条 reset 15s 计时器 → 15s 静默期过了 → `story_hash` 变了才真的重新生成；没变则 skip（幂等） | ~20s 或直接 skip |
| 后端启动（setImmediate） | 自动 `backfillMissingKernels()` 把缺 kernel 的故事补一遍（不修 catalog 分析，分析留到下次新故事或你手动跑 agent:analyze） | 几分钟后台 |

前端状态 ↔ 后端逻辑的对应：

| 前端卡片看到什么 | 后端实际情况 |
|---|---|
| 「心事还不够多，累计 5 条后…」 | storyCount < 5 → persona/emotion 根本没生成（也不会生成直到够 5 条） |
| 「AI XX 生成中…」+ 旋转动画 | storyCount ≥ 5 但 `catalog_star_analyses.persona_json / emotion_json` 还没写出来；通常意味着 15s debounce 静默期 + 串行 worker 还没轮到这颗 |
| 有真实内容 | 写入完成，读库渲染 |

---

## 8. 部署自检清单

每次推送新版本后都按这个顺序跑，不会踩 401 / 空库的坑：

- [ ] `node -v` >= 22.5
- [ ] `server/.runtime-key` 存在且 `xxd | tail -1` 末尾不是 `0a`；`chmod 600`
- [ ] 不是冷启动就不要再跑 `npm run seed`（否则清空用户故事！）
- [ ] `curl /api/catalog/stars/162/narrative` 返回 code:200 且 narrative 非空
- [ ] `npm run agent:kernels` 不再打 `Authentication Fails`
- [ ] `npm run agent:analyze -- --min-stories 5 --limit 3 --force --ids 162,114,175` 有 3 颗跑完没 401/429
- [ ] 浏览器打开 /profile 或 /star/162，5 张卡：30s 内从「生成中…」切换到真内容
- [ ] 前端设置弹窗：DeepSeek 栏显示「✅ 已连接」；没有输入框/保存按钮（安全补丁）

以上 9 条通过 = 本次部署完成。
