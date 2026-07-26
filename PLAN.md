# 星语穹庭 开发计划

## 当前任务：Issue #10 — Agent功能融合方向

**最后更新**：2026-07-26（适配最新 main 架构）

---

## 架构基准确认（main 最新）

### 后端新规范
- **故事层** `/api/stories/*`（用户内容 CRUD + 共鸣 + 浏览）
- **恒星层** `/api/catalog/stars/*`（浏览 + 收藏 + 统计）
- 旧路由 `/api/stars/*` 保留兼容
- 所有响应统一用 `server/src/utils/response.ts`：
  ```ts
  ok(res, message, data?)       // 200
  badRequest(res, message)       // 400
  notFound(res, message)         // 404
  serverError(res)               // 500
  ```
- 响应体自动 snake_case → camelCase 转换
- 安全中间件：`helmet` + `express-rate-limit`

### API Key 配置
- DeepSeek API Key：环境变量 `DEEPSEEK_API_KEY`
- 默认模型：`deepseek-v4-flash`
- 与现有 `vision.js`（qwen）分离，独立配置

---

## Feature 1：「古今共望」 🌌

**分支**：`feat/ancient-narrative`

**目标**：点击恒星时展示 AI 叙事，连接古今。混合方案（C）：先骨架→再 AI 填充。

### 交互流程
```
用户点击星星 → SkyCanvas emit starClick
  → SkyPage 打开 StarDetail(catalogStarId)
    → StarDetail 调用 fetchNarrative(catalogStarId)
      → 后端 GPS /api/catalog/stars/:id/narrative
        → 查缓存（同星同日不重复调用）
        → DeepSeek API 生成叙事（联网查古诗词）
      → 前端先展示骨架 → 收到后填充叙事
```

### 后端新增

#### 文件
| 文件 | 用途 |
|---|---|
| `server/src/services/deepseek.ts` | DeepSeek API 封装（v4-flash，支持 web_search） |
| `server/src/services/narrative.ts` | 叙事生成逻辑（prompt 工程 + SQLite 缓存） |
| `server/src/routes/narrative.ts` | 叙事 API 路由 |

#### API
| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/catalog/stars/:catalogStarId/narrative` | 获取叙事（缓存命中直接返回，否则实时生成） |
| `GET` | `/api/stars/:catalogStarId/narrative` | 旧路径兼容，内部转发 |

#### SQLite 新表
```sql
CREATE TABLE IF NOT EXISTS narratives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  catalog_star_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(catalog_star_id, date(generated_at))
);
```

#### DeepSeek Prompt 结构
```
System: 你是"星语穹庭"的星空叙事者。根据恒星信息，写一段"古今共望"叙事短文。
  - 联系古今（古代诗人和现代观测者）
  - 引用相关古诗词（允许联网搜索）
  - 文字优美凝练，150~250字
  - 中文输出

User: { starName, constellation, magnitude, distance, relatedPoems }
```

### 前端新增

#### 文件
| 文件 | 用途 |
|---|---|
| `client/src/components/StarNarrative.vue` | 叙事展示组件（Props: catalogStarId, starInfo） |

#### 修改
| 文件 | 改动 |
|---|---|
| `client/src/components/StarDetail.vue` | 引入 StarNarrative，放在右面板恒星信息区（位置灵活可调） |
| `client/src/composables/useNarrative.ts` | 叙事获取逻辑（fetch + 状态管理） |

#### StarNarrative 状态
```
idle → loading（骨架动画） → loaded（展示叙事）
                              → error（重试按钮）
```

### 技术细节
- DeepSeek 允许联网搜索古诗词（API 参数 `enable_search: true`）
- 缓存：同日同星不重复 API 调用，缓存到 `narratives` 表
- Prompt 工程：传入 starName/conName/mag 等信息
- 前端骨架：CSS shimmer 动画 + starName
- 重试：失败显示「生成失败」+ 重试按钮

---

## Feature 2：「古人陪看」 💬

**分支**：`feat/ancient-chat`

**目标**：AI 角色扮演古人，对话式共赏星空。

### 设计决策
- **古人数量**：先 4 位，后续可扩展
- **对话历史**：仅内存保留（不持久化到数据库），刷新即丢
- **聊天窗形式**：侧边抽屉（从右侧滑入，与 StarDetail 右面板并列）

### 交互流程
```
StarDetail 右面板点击「与古人共赏」→ 右侧滑入抽屉
  → 选古人角色（4 位可选）→ 消息区展示角色开场白
  → 用户输入消息 → SSE 流式返回 → 逐字显示
  → 可关闭抽屉，重新打开时状态重置（重新选人）
```

### 后端新增

#### 文件
| 文件 | 用途 |
|---|---|
| `server/src/data/ancientFigures.ts` | 古人角色预设数据（4 位） |
| `server/src/services/chat.ts` | 聊天逻辑（system prompt 角色扮演 + 调用 deepseek 流式） |
| `server/src/routes/chat.ts` | 聊天 API 路由（2 个端点） |

#### API
| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/catalog/stars/:catalogStarId/chat/figures` | 获取可选古人列表（含该星关联诗词） |
| `POST` | `/api/catalog/stars/:catalogStarId/chat` | 发送消息，SSE 流式返回 |

#### POST /chat 请求体
```json
{
  "figureId": "li-bai",
  "message": "这颗星星好亮啊",
  "history": [  // 对话历史（前端维护，每次全量发送）
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

#### SSE 响应格式
```
data: {"type":"chunk","content":"今夜"}
data: {"type":"chunk","content":"，你"}
data: {"type":"done"}
data: {"type":"error","message":"..."}
```

#### 古人角色预设（详细版）
```ts
const ANCIENT_FIGURES = [
  {
    id: 'li-bai',
    name: '李白',
    dynasty: '唐',
    style: '浪漫奔放',
    avatar: '🍶',
    intro: '字太白，号青莲居士。诗仙，一生好入名山游。',
    tags: ['月', '酒', '剑', '山水'],
    systemPrompt: `你是李白，唐代浪漫主义诗人。你正在与一位现代人一起仰望星空。
你说话豪放浪漫，常用比喻和夸张，偶尔引用自己的诗句。
你看到星星会联想到月、酒、剑、远游。
对于不认识的天文概念（如光年、星等），你会用诗意的方式理解。
保持对话温暖、有诗意，每次回复 50~100 字。`
  },
  {
    id: 'du-mu',
    name: '杜牧',
    dynasty: '唐',
    style: '清丽婉约',
    avatar: '🎋',
    intro: '字牧之，号樊川居士。晚唐诗人，以七绝著称。',
    tags: ['七夕', '秋夜', '怀古'],
    systemPrompt: `你是杜牧，晚唐诗人。你正在与一位现代人一起仰望星空。
你言辞清丽，善于借景抒情，常怀古伤今。
你写过"天阶夜色凉如水，卧看牵牛织女星"。
对于现代天文知识，你感到新奇但保持谦逊。
保持对话温婉有节制，每次回复 50~100 字。`
  },
  {
    id: 'su-shi',
    name: '苏轼',
    dynasty: '北宋',
    style: '豪放旷达',
    avatar: '🌊',
    intro: '字子瞻，号东坡居士。北宋文豪，诗词书画皆精。',
    tags: ['赤壁', '月亮', '人生'],
    systemPrompt: `你是苏轼，北宋文学家。你正在与一位现代人一起仰望星空。
你豁达乐观，善于从自然中领悟人生哲理。
你写过"但愿人长久，千里共婵娟"。
对于现代科学，你以开放心态接纳，并尝试用诗词比喻。
保持对话旷达有趣，偶尔幽默，每次回复 50~100 字。`
  },
  {
    id: 'zhang-heng',
    name: '张衡',
    dynasty: '东汉',
    style: '渊博严谨',
    avatar: '🔭',
    intro: '字平子。东汉天文学家、数学家，发明浑天仪、地动仪。',
    tags: ['天文', '星象', '历法'],
    systemPrompt: `你是张衡，东汉天文学家。你正在与一位现代人一起仰望星空。
你对天文星象有深入研究，曾著《灵宪》，记录 2500 余颗恒星。
你发明了浑天仪来演示天球运行。
对于现代天文学知识（望远镜、光年、恒星演化），你表现出极大的求知欲。
你的语言严谨但充满热情，每次回复 50~100 字。`
  },
]
```

#### System Prompt 构建策略
```
最终 prompt = figure.systemPrompt + 当前星星上下文

星星上下文：
"你正在观测的这颗星名为{starName}，位于{constellation}星座，
视星等{mag}，距离地球约{dist}光年。
{如果有该星相关诗词，附上}"
```

### 前端新增

#### 文件
| 文件 | 用途 |
|---|---|
| `client/src/components/AncientChat.vue` | 侧边抽屉聊天组件（选角色 → 消息 → 输入） |

#### 修改
| 文件 | 改动 |
|---|---|
| `client/src/components/StarDetail.vue` | 右面板底部添加「与古人共赏」按钮 |

#### AncientChat 组件设计

**Props：**
| Prop | 类型 | 说明 |
|---|---|---|
| `visible` | `boolean` | 抽屉是否可见 |
| `catalogStarId` | `number` | 当前恒星 ID |
| `starName` | `string` | 星名 |
| `constellation` | `string` | 星座名 |

**Events：**
| Event | 说明 |
|---|---|
| `@close` | 关闭抽屉 |

**内部状态机：**
```
figureSelect（选角色）
  → 用户点击角色卡片 → 加载角色开场白
  → chatting（对话中）
      → 消息列表（用户 + AI 气泡）
      → 底部输入框 + 发送按钮
      → SSE streaming（AI 消息逐字显示）
  → 关闭抽屉 → 状态重置
```

**UI 布局：**
```
┌─────────────────────────────┐
│  ← 与古人共赏          [X]  │  ← 抽屉头部
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │  🍶 李白  唐·浪漫奔放 │  │  ← 角色卡片网格（figureSelect 阶段）
│  │  🎋 杜牧  唐·清丽婉约 │  │
│  │  🌊 苏轼  北宋·豪放旷达│  │
│  │  🔭 张衡  东汉·渊博严谨│  │
│  └───────────────────────┘  │
│  ── 或 ──                   │
│  ┌─ 顶部角色信息条 ───────┐ │
│  │  🍶 李白 · 唐           │ │  ← chatting 阶段
│  ├─────────────────────────┤ │
│  │  [AI] 今夜，你我共赏... │ │  ← 消息列表
│  │  [用户] 这颗星好亮      │ │
│  │  [AI] 此星之明...       │ │
│  ├─────────────────────────┤ │
│  │  [____________]  [发送]  │ │  ← 输入区
│  └─────────────────────────┘ │
└─────────────────────────────┘
```

### 技术细节
- 复用 `server/src/services/deepseek.ts`（已在 F1 实现），开启 stream 模式
- 对话历史由前端维护，每次请求全量发送，后端不存储
- SSE 通过 `res.write()` 逐块推送，前端用 `EventSource` 或 `fetch` + `ReadableStream` 接收
- 星星上下文：前端在请求中附带 `starName`/`constellation`，后端从 `stars.json` 和 `starInfo.ts` 补充距离、星等等信息
- 错误处理：网络中断显示"连接中断，重试"按钮；API 限流显示"星空繁忙，稍后再聊"

---

## UI 原则
- ✅ 功能先行，组件独立封装（Props 驱动，无全局耦合）
- ✅ StarNarrative 放到右面板底部，后期换位置只改一行
- ✅ AncientChat 作为侧边抽屉（从右滑入），不嵌入 StarDetail 内部
- ✅ 所有样式用 scoped CSS + CSS 变量（后期换主题不费力）

---

## 执行顺序
1. [x] 提交当前修改到 `Orca` 分支 → 已推送
2. [x] Pull 最新 `main` → 架构已更新
3. [x] Feature 1「古今共望」→ 已实现（deepseek + narrative + StarNarrative）
4. [ ] 建分支 `feat/ancient-chat`
5. [ ] 后端：`ancientFigures.ts` 数据 + `chat.ts` 服务 + `chat.ts` 路由
6. [ ] 前端：`AncientChat.vue` 侧边抽屉 + `StarDetail.vue` 集成
7. [ ] 测试 + commit
8. [ ] 更新 CHANGELOG.md

---

## 变更日志
| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-07-26 | v1 | 初始计划，适配 main 最新架构（stories/catalog 分离） |
| 2026-07-26 | v2 | 确认 F1 已实现；完善 F2 方案：设计决策、古人详细预设、System Prompt 策略、SSE 格式、AncientChat UI 布局、技术细节 |
