# 写故事支持上传图片 + Markdown 渲染 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用户在"写我的故事"时可上传图片，故事卡片和详情页展示图片，故事内容支持 Markdown 渲染。

**Architecture:** 后端新增 `POST /api/upload` 图片上传接口（multer），`stars` 表新增 `image_url` 列；前端 StoryForm 新增图片上传区域，StarDetail 的故事卡片和详情视图改用 `marked` 渲染 Markdown 并展示图片。

**Tech Stack:** Express + multer（后端），Vue 3 + marked（前端，已有）

---

## 文件结构

| 文件 | 操作 | 职责 |
|---|---|---|
| `server/package.json` | 修改 | 新增 `multer` 依赖 |
| `server/src/db.ts` | 修改 | `stars` 表新增 `image_url` 列 + 兼容迁移 |
| `server/src/index.ts` | 修改 | 配置 multer + 静态文件服务 `server/data/uploads/` |
| `server/src/services/starService.ts` | 修改 | `createStar()` 支持 `imageUrl`；`Star` 接口加 `image_url` |
| `server/src/routes/stories.ts` | 修改 | 新增 `POST /api/upload`；`POST /api/stories` 接受 `imageUrl` |
| `client/src/components/StoryForm.vue` | 修改 | 新增图片上传区域（拖拽/点击 + 预览 + 删除） |
| `client/src/components/StarDetail.vue` | 修改 | 故事卡片/详情展示图片；Markdown 渲染内容 |
| `client/src/pages/SkyPage.vue` | 修改 | `StoryData` 接口新增 `imageUrl` 字段 |

---

### Task 1: 安装后端依赖 multer

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: 安装 multer 和类型定义**

```bash
cd server && npm install multer && npm install -D @types/multer
```

- [ ] **Step 2: 验证安装**

```bash
cd server && node -e "const m = require('multer'); console.log('multer OK:', typeof m)"
```
Expected: `multer OK: function`

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: add multer for image upload support"
```

---

### Task 2: 数据库新增 image_url 列

**Files:**
- Modify: `server/src/db.ts`

- [ ] **Step 1: 在 db.ts 建表语句中新增 image_url 列**

在 `stars` 表的 `CREATE TABLE` 语句中，`tag TEXT` 后新增 `image_url TEXT`：

```sql
-- 在 stars 表定义中，tag TEXT 之后加：
  tag             TEXT,
  image_url       TEXT,
  is_anonymous    INTEGER NOT NULL DEFAULT 0
```

注意：`image_url` 要放在 `is_anonymous` 之前（因为 `is_anonymous` 在兼容迁移中通过 `ALTER TABLE` 添加，而 `image_url` 需要在建表时定义）。

- [ ] **Step 2: 在兼容迁移区新增 ALTER TABLE**

在 `db.ts` 末尾的兼容迁移区域，`is_anonymous` 那行之后加：

```typescript
// 兼容旧数据库：stars 加 image_url 列
try { db.exec('ALTER TABLE stars ADD COLUMN image_url TEXT'); } catch {}
```

- [ ] **Step 3: 验证**

重启后端：`cd server && npm run dev`，确认无报错。

- [ ] **Step 4: Commit**

```bash
git add server/src/db.ts
git commit -m "feat: add image_url column to stars table"
```

---

### Task 3: 后端配置 multer + 静态文件服务

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: 在文件顶部导入 multer 和 path**

```typescript
import multer from 'multer'
```

- [ ] **Step 2: 配置 multer 存储（在 express.json 之后、限流之前）**

```typescript
// 图片上传配置
const uploadsDir = path.resolve(__dirname, '../data/uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 JPG/PNG/WebP/GIF 格式'))
    }
  },
})
```

- [ ] **Step 3: 添加静态文件服务（在 express.static(clientDist) 之后）**

```typescript
// 上传文件静态服务
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '7d',
}))
```

- [ ] **Step 4: 需要导入 fs 模块**

在文件顶部已有 `import path from 'path'`，需要新增：
```typescript
import fs from 'node:fs'
```

- [ ] **Step 5: 导出 upload 实例供路由使用**

在文件末尾 `export default app` 之前：
```typescript
export { upload }
```

- [ ] **Step 6: 验证**

重启后端：`cd server && npm run dev`，确认 `server/data/uploads/` 目录已创建，无报错。

- [ ] **Step 7: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: add multer middleware and uploads static serving"
```

---

### Task 4: 后端上传接口 + 故事创建支持 imageUrl

**Files:**
- Modify: `server/src/routes/stories.ts`
- Modify: `server/src/services/starService.ts`

- [ ] **Step 1: 更新 starService.ts 的 Star 接口和 createStar 函数**

在 `Star` 接口中新增 `image_url` 字段：

```typescript
export interface Star {
  // ... 已有字段
  tag: string | null;
  image_url: string | null;  // 新增
  is_anonymous: number;
}
```

修改 `createStar` 函数签名，新增 `imageUrl` 参数：

```typescript
export function createStar(
  content: string,
  title?: string,
  catalogStarId?: number,
  location?: { lat: number; lng: number },
  userId?: number,
  tag?: string,
  isAnonymous?: boolean,
  imageUrl?: string,  // 新增
): Star & { username: string | null; userId: number | null } {
```

修改 INSERT 语句：

```typescript
const stmt = db.prepare(`
  INSERT INTO stars (type, title, content, pos_x, pos_y, pos_z, catalog_star_id, location_lat, location_lng, user_id, tag, image_url, is_anonymous)
  VALUES ('user', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const result = stmt.run(
  title ?? null,
  content,
  pos.x, pos.y, pos.z,
  catalogStarId ?? null,
  location?.lat ?? null,
  location?.lng ?? null,
  userId ?? null,
  safeTag,
  imageUrl ?? null,  // 新增
  isAnonymous ? 1 : 0,
)
```

- [ ] **Step 2: 在 stories.ts 中新增 POST /api/upload 路由**

在 router 定义之后、`export default router` 之前：

```typescript
import { upload } from '../index'

// 上传图片
router.post('/upload', authRequired, upload.single('image'), (req: Request, res: Response) => {
  try {
    if (!req.file) return badRequest(res, '请选择图片')
    const imageUrl = `/uploads/${req.file.filename}`
    ok(res, '上传成功', { imageUrl })
  } catch (error) {
    console.error('POST /api/upload error:', error)
    serverError(res)
  }
})
```

- [ ] **Step 3: 修改 POST /api/stories 接受 imageUrl**

在 `POST /` 路由中，从 `req.body` 解构 `imageUrl`，传给 `createStar`：

```typescript
const { title, content, catalogStarId: catalog_star_id, location, tag, isAnonymous, imageUrl } = req.body
// ... 校验 ...

const story = createStar(
  safeContent, safeTitle ?? undefined, catalogStarId, locationData,
  user.id, safeTag, anonymous,
  typeof imageUrl === 'string' && imageUrl.startsWith('/uploads/') ? imageUrl : undefined
)
```

- [ ] **Step 4: 在 index.ts 中注册 upload 路由**

在 `server/src/index.ts` 中，`storiesRouter` 使用之前，确保 `/api/upload` 路由在 `storiesRouter` 之前或之中注册。由于 `upload` 路由已在 `stories.ts` 中定义，需确保 `/api/upload` 不会被 `/api/stories/:storyId` 匹配。

修改 `index.ts` 中的路由注册，在 `app.use('/api/stories', storiesRouter)` 之前添加：

```typescript
// 图片上传（放在 storiesRouter 之前，避免被 :storyId 匹配）
app.post('/api/upload', writeLimiter)
```

然后从 `stories.ts` 中移除 upload 路由，改为在 `index.ts` 中直接定义：

```typescript
// 图片上传
app.post('/api/upload', authRequired, writeLimiter, upload.single('image'), (req: Request, res: Response) => {
  try {
    if (!req.file) return badRequest(res, '请选择图片')
    const imageUrl = `/uploads/${req.file.filename}`
    ok(res, '上传成功', { imageUrl })
  } catch (error) {
    console.error('POST /api/upload error:', error)
    serverError(res)
  }
})
```

注意：需要在 `index.ts` 顶部导入 `authRequired`、`badRequest`、`serverError`、`ok`（这些已经导入了）。

- [ ] **Step 5: 验证**

```bash
# 启动后端
cd server && npm run dev

# 测试图片上传
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "image=@/path/to/test.jpg"
```

Expected: 返回 `{ "message": "上传成功", "data": { "imageUrl": "/uploads/xxx.jpg" } }`

- [ ] **Step 6: Commit**

```bash
git add server/src/services/starService.ts server/src/routes/stories.ts server/src/index.ts
git commit -m "feat: add image upload API and support imageUrl in story creation"
```

---

### Task 5: 前端 StoryForm 新增图片上传区域

**Files:**
- Modify: `client/src/components/StoryForm.vue`

- [ ] **Step 1: 新增图片上传 UI 模板**

在表单中「情绪标签」field 之后、「匿名投递」之前，新增图片上传区域：

```html
<!-- 图片上传 -->
<div class="field">
  <label class="field-label">图片 <span class="optional">- 可选</span></label>
  <div
    class="image-upload-zone"
    :class="{ 'has-image': imagePreview }"
    @click="triggerFileInput"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <template v-if="!imagePreview">
      <ImageIcon :size="24" class="upload-icon" />
      <span class="upload-text">点击或拖拽上传图片</span>
      <span class="upload-hint">支持 JPG/PNG/WebP/GIF，最大 5MB</span>
    </template>
    <template v-else>
      <img :src="imagePreview" class="upload-preview" />
      <button class="upload-remove" @click.stop="removeImage">
        <X :size="14" />
      </button>
    </template>
  </div>
  <input
    ref="fileInputRef"
    type="file"
    accept="image/jpeg,image/png,image/webp,image/gif"
    class="file-input-hidden"
    @change="onFileChange"
  />
  <p v-if="uploadError" class="upload-error">{{ uploadError }}</p>
</div>
```

- [ ] **Step 2: 新增 script 逻辑**

在 `<script setup>` 中新增：

```typescript
import { Image as ImageIcon } from 'lucide-vue-next'

const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const imageUrl = ref<string | null>(null)
const uploadError = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) processFile(file)
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

function processFile(file: File) {
  uploadError.value = ''
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    uploadError.value = '仅支持 JPG/PNG/WebP/GIF 格式'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    uploadError.value = '图片大小不能超过 5MB'
    return
  }
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

function removeImage() {
  imageFile.value = null
  imagePreview.value = null
  imageUrl.value = null
  uploadError.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}
```

- [ ] **Step 3: 修改 onSubmit 函数，先上传图片再提交故事**

```typescript
async function onSubmit() {
  const trimmedTitle = title.value.trim()
  const trimmed = content.value.trim()
  if (!trimmedTitle || !trimmed || submitting.value) return

  submitting.value = true
  error.value = ''

  try {
    // 如果有图片，先上传
    if (imageFile.value && !imageUrl.value) {
      const formData = new FormData()
      formData.append('image', imageFile.value)
      const token = localStorage.getItem('token')
      const uploadHeaders: Record<string, string> = {}
      if (token) uploadHeaders['Authorization'] = `Bearer ${token}`
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
      })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok) {
        error.value = uploadJson.message || '图片上传失败'
        submitting.value = false
        return
      }
      imageUrl.value = uploadJson.data.imageUrl
    }

    // 提交故事
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const body: Record<string, any> = {
      catalogStarId: props.catalogStarId,
      title: trimmedTitle,
      content: trimmed,
      location: userLocation.value,
      tag: selectedTag.value,
      isAnonymous: isAnonymous.value,
    }
    if (imageUrl.value) body.imageUrl = imageUrl.value

    const res = await fetch('/api/stories', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (res.ok) {
      emit('submitted', {
        id: json.data.id,
        title: json.data.title,
        content: json.data.content,
        resonanceCount: json.data.resonanceCount,
        catalogStarId: json.data.catalogStarId,
        createdAt: json.data.createdAt || '',
        locationLat: json.data.locationLat ?? null,
        locationLng: json.data.locationLng ?? null,
        type: 'user',
        viewCount: 0,
        origin: null,
        username: json.data.username ?? null,
        tag: json.data.tag ?? selectedTag.value,
        userId: json.data.userId ?? null,
        imageUrl: json.data.imageUrl ?? null,
      })
    } else {
      error.value = json.message || '提交失败，再试一次吧'
    }
  } catch (e) {
    error.value = '网络开小差了，稍后再试'
  } finally {
    submitting.value = false
  }
}
```

- [ ] **Step 4: 更新 emit 类型定义，新增 imageUrl**

```typescript
const emit = defineEmits<{
  close: []
  submitted: [story: { id: number; title: string | null; content: string; resonanceCount: number; catalogStarId: number; createdAt: string; locationLat: number | null; locationLng: number | null; type: string; viewCount: number; origin: string | null; username: string | null; tag: string | null; userId: number | null; imageUrl: string | null }]
}>()
```

- [ ] **Step 5: 新增样式**

```css
/* ─── Image Upload ─── */
.image-upload-zone {
  border: 2px dashed rgba(255,255,255,0.12);
  border-radius: var(--radius-md);
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  position: relative;
  min-height: 100px;
  justify-content: center;
}
.image-upload-zone:hover {
  border-color: rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.02);
}
.image-upload-zone.has-image {
  padding: 0;
  border-style: solid;
  border-color: rgba(255,255,255,0.08);
}
.upload-icon {
  color: var(--muted);
}
.upload-text {
  font-size: 0.82rem;
  color: var(--muted);
}
.upload-hint {
  font-size: 0.7rem;
  color: var(--muted-light);
}
.upload-preview {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: var(--radius-md);
}
.upload-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0,0,0,0.6);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.upload-remove:hover {
  background: rgba(255, 90, 90, 0.8);
}
.upload-error {
  margin: 4px 0 0;
  font-size: 0.78rem;
  color: var(--star-red);
}
.file-input-hidden {
  display: none;
}
```

- [ ] **Step 6: 验证**

启动前端 `cd client && npm run dev`，打开写故事表单，确认：
- 图片上传区域显示正常
- 点击可触发文件选择
- 拖拽可上传图片
- 预览图显示正确
- 删除按钮可移除图片

- [ ] **Step 7: Commit**

```bash
git add client/src/components/StoryForm.vue
git commit -m "feat: add image upload to StoryForm"
```

---

### Task 6: 前端 StarDetail 展示图片 + Markdown 渲染

**Files:**
- Modify: `client/src/components/StarDetail.vue`

- [ ] **Step 1: 导入 marked**

在 `<script setup>` 顶部新增：
```typescript
import { marked } from 'marked'
marked.setOptions({ breaks: true, gfm: true })
```

- [ ] **Step 2: 新增 renderMarkdown 函数**

```typescript
function renderMarkdown(text: string): string {
  if (!text) return ''
  return marked.parse(text) as string
}
```

- [ ] **Step 3: 修改所有故事卡片的内容展示**

所有 `{{ story.content }}` 改为使用 `v-html` + Markdown 渲染，并新增图片展示。

以「历史故事」Tab 中的故事卡片为例（第 50 行），修改为：

```html
<div class="story-body">
  <img v-if="story.imageUrl" :src="story.imageUrl" class="story-image" @click.stop />
  <div class="story-excerpt" v-html="renderMarkdown(story.content)"></div>
</div>
```

同样修改「所有故事」Tab 中故事卡片（第 171 行）和「我的故事」Tab 中故事卡片（第 225 行）。

- [ ] **Step 4: 修改详情视图**

详情视图中的 `<div class="detail-body">{{ detailStory.content }}</div>`（第 84 行）改为：

```html
<div class="detail-body">
  <img v-if="detailStory.imageUrl" :src="detailStory.imageUrl" class="detail-image" @click.stop />
  <div class="detail-content" v-html="renderMarkdown(detailStory.content)"></div>
</div>
```

- [ ] **Step 5: 新增样式**

```css
/* ─── Story Image ─── */
.story-image {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  margin-bottom: 10px;
}
.detail-image {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

/* ─── Markdown 渲染样式 ─── */
.story-excerpt :deep(p) {
  margin: 0 0 0.5em;
  line-height: 1.6;
  color: var(--ink-secondary);
  font-size: 0.84rem;
}
.story-excerpt :deep(p:last-child) {
  margin-bottom: 0;
}
.story-excerpt :deep(em) {
  color: #c9b8e8;
}
.story-excerpt :deep(strong) {
  color: var(--ink);
}
.story-excerpt :deep(blockquote) {
  border-left: 2px solid rgba(255,255,255,0.15);
  padding-left: 12px;
  margin: 0.5em 0;
  color: var(--muted);
  font-style: italic;
}
.story-excerpt :deep(code) {
  background: rgba(255,255,255,0.06);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.8rem;
}
.story-excerpt :deep(a) {
  color: var(--accent);
  text-decoration: underline;
}

.detail-content :deep(p) {
  margin: 0 0 0.8em;
  line-height: 1.75;
  color: var(--ink-secondary);
  font-size: 0.9rem;
}
.detail-content :deep(p:last-child) {
  margin-bottom: 0;
}
.detail-content :deep(em) {
  color: #c9b8e8;
}
.detail-content :deep(strong) {
  color: var(--ink);
}
.detail-content :deep(blockquote) {
  border-left: 2px solid rgba(255,255,255,0.15);
  padding-left: 14px;
  margin: 0.8em 0;
  color: var(--muted);
  font-style: italic;
}
.detail-content :deep(code) {
  background: rgba(255,255,255,0.06);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.82rem;
}
.detail-content :deep(a) {
  color: var(--accent);
  text-decoration: underline;
}
```

- [ ] **Step 6: 验证**

启动前端，确认：
- 故事卡片中带图片的故事显示缩略图
- 故事详情中图片完整显示
- Markdown 内容（粗体、斜体、引用、代码等）正确渲染
- 无图片的旧故事正常显示

- [ ] **Step 7: Commit**

```bash
git add client/src/components/StarDetail.vue
git commit -m "feat: display story images and render content with Markdown"
```

---

### Task 7: 更新 SkyPage StoryData 接口

**Files:**
- Modify: `client/src/pages/SkyPage.vue`

- [ ] **Step 1: 在 StoryData 接口中新增 imageUrl**

```typescript
interface StoryData {
  id: number; title: string | null; content: string; resonanceCount: number
  catalogStarId: number; createdAt: string; locationLat: number | null
  locationLng: number | null; type: string; viewCount: number; origin: string | null
  username: string | null; tag: string | null; userId: number | null
  imageUrl: string | null  // 新增
}
```

- [ ] **Step 2: 在 mergeStoriesIntoMap 函数中传递 imageUrl**

找到 `mergeStoriesIntoMap` 函数中 push 到 map 的代码，确认 `imageUrl` 字段被传递。由于该函数使用 `...s` 展开，`imageUrl` 会自动传递，但需要确认后端返回的字段名是 `imageUrl`（camelCase）。后端 `getAllStars` 查询中需确保 `image_url` 映射为 `imageUrl`。

检查 `server/src/services/starService.ts` 的 `getAllStars` 函数 —— 当前使用 `s.*`，返回的是 `image_url`（snake_case）。需要在查询中显式映射：

```typescript
// 修改 getAllStars 查询
SELECT s.*, s.user_id as userId, s.image_url as imageUrl,
  CASE WHEN s.is_anonymous = 1 THEN NULL ELSE u.username END as username,
  s.tag
FROM stars s
LEFT JOIN users u ON s.user_id = u.id
ORDER BY s.created_at DESC
```

同样修改 `getAllStarsPaged`、`getStoryById`、`getStoriesByCatalogStarId`、`getUserStories`、`getUserStoriesPaged` 中的查询。

- [ ] **Step 3: 验证**

启动前后端，确认 `imageUrl` 字段在 API 响应中正确传递，前端正常展示。

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/SkyPage.vue server/src/services/starService.ts
git commit -m "fix: add imageUrl to StoryData interface and map image_url in queries"
```

---

## 自审清单

1. **Spec 覆盖**：写故事上传图片 ✓ | 故事卡片展示图片 ✓ | 详情页展示图片 ✓ | Markdown 渲染 ✓
2. **无占位符**：所有步骤都有具体代码和命令
3. **类型一致性**：前端 `imageUrl`（camelCase）↔ 后端查询 `image_url as imageUrl`（映射）↔ 数据库 `image_url`（snake_case）