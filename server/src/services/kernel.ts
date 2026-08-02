/**
 * 故事内核提取服务
 * 用 AI 分析故事内容，提取情绪标签、故事内核、主题词
 * 生成一次，永久缓存
 */

import db from '../db'
import { deepseekChat } from './deepseek'

export interface StoryKernel {
  id?: number
  storyId: number
  emotionalTags: string[]
  essence: string
  themes: string[]
  generatedAt?: string
}

function parseKernel(raw: string): { emotionalTags: string[]; essence: string; themes: string[] } | null {
  // 尝试提取 JSON（AI 可能用 ```json 包裹）
  const jsonMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw.trim()

  try {
    const parsed = JSON.parse(jsonStr)
    const emotionalTags = Array.isArray(parsed.emotional_tags) ? parsed.emotional_tags.slice(0, 5) : []
    const essence = typeof parsed.essence === 'string' ? parsed.essence.trim() : ''
    const themes = Array.isArray(parsed.themes) ? parsed.themes.slice(0, 5) : []
    if (!essence) return null
    return { emotionalTags, essence, themes }
  } catch {
    console.error('内核解析失败，AI 返回:', raw.slice(0, 200))
    return null
  }
}

function buildKernelPrompt(content: string, title?: string | null): { system: string; user: string } {
  const system = `你是"星语穹庭"的故事分析师。用户会给你一段心事/故事，请你提取其内核。

**你必须只输出一个 JSON 对象，不要输出任何其他文字。**

JSON 格式：
{
  "emotional_tags": ["情绪标签1", "情绪标签2", ...],
  "essence": "故事内核的一句话凝练",
  "themes": ["主题词1", "主题词2", ...]
}

**字段说明：**
- emotional_tags: 2~5 个情绪标签，描述故事中的情感底色。如：思念、释怀、温暖、遗憾、孤独、希望、迷茫、愧疚、感恩、焦虑、平静、释然、愤怒、欣慰、怀念、期待
- essence: 一句话凝练故事的核心，不要复述内容，而要提炼出「这是一个关于___的故事」。12~30 字，温暖、诗意
- themes: 2~5 个主题词，描述故事涉及的主题领域。如：亲情、爱情、友情、成长、告别、梦想、自然、城市、星空、回忆、未来、青春、家、旅途、自我

**规则：**
1. 只输出 JSON，不要有任何前缀或后缀
2. emotional_tags 和 themes 不重复
3. essence 要有文学性，像一首微型诗
4. 中文输出`

  const titleLine = title ? `标题：${title}\n` : ''
  const user = `${titleLine}内容：${content}`

  return { system, user }
}

/** 调用 AI 生成故事内核 */
async function generateKernel(content: string, title?: string | null): Promise<{ emotionalTags: string[]; essence: string; themes: string[] }> {
  const { system, user } = buildKernelPrompt(content, title)
  const raw = await deepseekChat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    {
      temperature: 0.5,
      maxTokens: 300,
    },
  )

  const result = parseKernel(raw)
  if (!result) {
    throw new Error('AI 内核提取失败，无法解析返回内容')
  }
  return result
}

/** 从数据库获取缓存的内核 */
export function getKernel(storyId: number): StoryKernel | null {
  const row = db.prepare(`
    SELECT id, story_id, emotional_tags, essence, themes, generated_at
    FROM story_kernels WHERE story_id = ?
  `).get(storyId) as {
    id: number
    story_id: number
    emotional_tags: string
    essence: string
    themes: string
    generated_at: string
  } | undefined

  if (!row) return null

  return {
    id: row.id,
    storyId: row.story_id,
    emotionalTags: JSON.parse(row.emotional_tags),
    essence: row.essence,
    themes: JSON.parse(row.themes),
    generatedAt: row.generated_at,
  }
}

/** 将内核写入数据库 */
function cacheKernel(storyId: number, kernel: { emotionalTags: string[]; essence: string; themes: string[] }): StoryKernel {
  db.prepare(`
    INSERT OR REPLACE INTO story_kernels (story_id, emotional_tags, essence, themes, generated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(
    storyId,
    JSON.stringify(kernel.emotionalTags),
    kernel.essence,
    JSON.stringify(kernel.themes),
  )

  return getKernel(storyId)!
}

/** 获取或生成内核（优先缓存，无缓存则生成并缓存） */
export async function ensureKernel(storyId: number, content: string, title?: string | null): Promise<StoryKernel> {
  const cached = getKernel(storyId)
  if (cached) return cached

  const kernel = await generateKernel(content, title)
  return cacheKernel(storyId, kernel)
}

/** 用户修改内核 */
export function updateKernel(
  storyId: number,
  updates: { emotionalTags?: string[]; essence?: string; themes?: string[] },
): StoryKernel | null {
  const existing = getKernel(storyId)
  if (!existing) return null

  const merged = {
    emotionalTags: updates.emotionalTags ?? existing.emotionalTags,
    essence: updates.essence ?? existing.essence,
    themes: updates.themes ?? existing.themes,
  }

  db.prepare(`
    UPDATE story_kernels
    SET emotional_tags = ?, essence = ?, themes = ?, generated_at = datetime('now')
    WHERE story_id = ?
  `).run(
    JSON.stringify(merged.emotionalTags),
    merged.essence,
    JSON.stringify(merged.themes),
    storyId,
  )

  return getKernel(storyId)
}

/** 聚合某恒星下所有故事的内核标签 */
export function getAggregatedTags(catalogStarId: number): {
  emotionalTags: { tag: string; count: number }[]
  themes: { tag: string; count: number }[]
  essences: string[]
} {
  const rows = db.prepare(`
    SELECT sk.emotional_tags, sk.themes, sk.essence
    FROM story_kernels sk
    JOIN story_catalog_stars scs ON sk.story_id = scs.story_id
    WHERE scs.catalog_star_id = ?
  `).all(catalogStarId) as {
    emotional_tags: string
    themes: string
    essence: string
  }[]

  const emotionalCounts = new Map<string, number>()
  const themeCounts = new Map<string, number>()
  const essences: string[] = []

  for (const row of rows) {
    try {
      const tags: string[] = JSON.parse(row.emotional_tags)
      tags.forEach(t => emotionalCounts.set(t, (emotionalCounts.get(t) || 0) + 1))
    } catch { /* skip */ }
    try {
      const themes: string[] = JSON.parse(row.themes)
      themes.forEach(t => themeCounts.set(t, (themeCounts.get(t) || 0) + 1))
    } catch { /* skip */ }
    if (row.essence) {
      essences.push(row.essence)
    }
  }

  const sortByCount = (map: Map<string, number>) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }))

  return {
    emotionalTags: sortByCount(emotionalCounts),
    themes: sortByCount(themeCounts),
    essences,
  }
}

/** 获取所有有内核的恒星及其标签集合 */
function getAllStarKernels(): Map<number, { emotionalTags: Set<string>; themes: Set<string> }> {
  const rows = db.prepare(`
    SELECT DISTINCT scs.catalog_star_id, sk.emotional_tags, sk.themes
    FROM story_kernels sk
    JOIN story_catalog_stars scs ON sk.story_id = scs.story_id
    WHERE scs.catalog_star_id IS NOT NULL AND scs.catalog_star_id > 0
  `).all() as { catalog_star_id: number; emotional_tags: string; themes: string }[]

  const map = new Map<number, { emotionalTags: Set<string>; themes: Set<string> }>()
  for (const row of rows) {
    if (!map.has(row.catalog_star_id)) {
      map.set(row.catalog_star_id, { emotionalTags: new Set(), themes: new Set() })
    }
    const entry = map.get(row.catalog_star_id)!
    try { JSON.parse(row.emotional_tags).forEach((t: string) => entry.emotionalTags.add(t)) } catch { /* skip */ }
    try { JSON.parse(row.themes).forEach((t: string) => entry.themes.add(t)) } catch { /* skip */ }
  }
  return map
}

/**
 * 获取与指定恒星共享任何故事的其他 catalog_star_id 集合
 * issue #117：同一故事绑定的多颗星（如星座神话）共享同一份内核，
 * 星座神话场景下相似度为 1.0，即使有额外独有故事也极高，无推荐价值
 */
function getSharedStoryStarIds(catalogStarId: number): Set<number> {
  const rows = db.prepare(`
    SELECT DISTINCT scs2.catalog_star_id
    FROM story_catalog_stars scs1
    JOIN story_catalog_stars scs2 ON scs1.story_id = scs2.story_id
    WHERE scs1.catalog_star_id = ? AND scs2.catalog_star_id != ?
  `).all(catalogStarId, catalogStarId) as { catalog_star_id: number }[]
  return new Set(rows.map(r => r.catalog_star_id))
}

/** 计算 Jaccard 相似度 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  let intersection = 0
  for (const item of a) {
    if (b.has(item)) intersection++
  }
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

export interface SimilarStar {
  catalogStarId: number
  score: number
  sharedEmotions: string[]
  sharedThemes: string[]
  storyCount: number
}

/** 查找与指定恒星内核相似的恒星 */
export function getSimilarStars(catalogStarId: number, limit = 8): SimilarStar[] {
  const allKernels = getAllStarKernels()
  const target = allKernels.get(catalogStarId)
  if (!target) return []

  // issue #117：排除与目标星共享同一故事的星（共享内核导致相似度极高，无推荐价值）
  const sharedStoryStarIds = getSharedStoryStarIds(catalogStarId)

  const results: SimilarStar[] = []
  for (const [cid, tags] of allKernels) {
    if (cid === catalogStarId) continue
    if (sharedStoryStarIds.has(cid)) continue // 跳过共享故事的星
    const emotionSim = jaccardSimilarity(target.emotionalTags, tags.emotionalTags)
    const themeSim = jaccardSimilarity(target.themes, tags.themes)
    // 情绪权重 0.6，主题权重 0.4
    const score = emotionSim * 0.6 + themeSim * 0.4
    // issue #117：阈值从 score > 0 提升至 score >= 0.2，过滤仅有微弱标签重叠的噪音推荐
    if (score < 0.2) continue

    const sharedEmotions = [...target.emotionalTags].filter(t => tags.emotionalTags.has(t))
    const sharedThemes = [...target.themes].filter(t => tags.themes.has(t))

    const storyCount = (db.prepare(
      'SELECT COUNT(*) as cnt FROM story_catalog_stars WHERE catalog_star_id = ?'
    ).get(cid) as { cnt: number }).cnt

    results.push({ catalogStarId: cid, score: Math.round(score * 100) / 100, sharedEmotions, sharedThemes, storyCount })
  }

  // 按相似度降序，取前 limit
  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}

export interface AreaHighlight {
  catalogStarId: number
  essences: string[]
  sharedEmotions: string[]
  score: number
  storyCount: number
}

/** 获取天区故事精选：目标恒星 + 相似恒星的故事内核凝练 */
export function getAreaHighlights(catalogStarId: number, limit = 6): AreaHighlight[] {
  const similar = getSimilarStars(catalogStarId, limit)

  // 目标恒星自己的内核
  const targetEssences = getAggregatedTags(catalogStarId).essences
  const targetStoryCount = (db.prepare(
    'SELECT COUNT(*) as cnt FROM story_catalog_stars WHERE catalog_star_id = ?'
  ).get(catalogStarId) as { cnt: number }).cnt

  const result: AreaHighlight[] = []

  if (targetEssences.length > 0) {
    result.push({
      catalogStarId,
      essences: targetEssences.slice(0, 3),
      sharedEmotions: [],
      score: 0,
      storyCount: targetStoryCount,
    })
  }

  // 相似恒星的内核
  for (const s of similar) {
    const tags = getAggregatedTags(s.catalogStarId)
    if (tags.essences.length === 0) continue
    result.push({
      catalogStarId: s.catalogStarId,
      essences: tags.essences.slice(0, 2),
      sharedEmotions: s.sharedEmotions,
      score: s.score,
      storyCount: s.storyCount,
    })
  }

  return result
}

// ─── 异步内核生成：重试 + 并发控制 ───
const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 3000, 8000] // ms，指数退避
let activeKernelJobs = 0
const MAX_CONCURRENT = 3
const kernelQueue: Array<() => Promise<void>> = []

function runNextKernelJob(): void {
  if (activeKernelJobs >= MAX_CONCURRENT || kernelQueue.length === 0) return
  activeKernelJobs++
  const job = kernelQueue.shift()!
  job().finally(() => {
    activeKernelJobs--
    runNextKernelJob()
  })
}

async function generateWithRetry(storyId: number, content: string, title?: string | null): Promise<void> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await ensureKernel(storyId, content, title)
      return
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error(`[kernel] 故事 ${storyId} 内核生成最终失败（已重试${MAX_RETRIES}次）:`, err)
        return
      }
      const delay = RETRY_DELAYS[attempt]
      console.warn(`[kernel] 故事 ${storyId} 内核生成失败（第${attempt + 1}次），${delay}ms后重试...`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
}

/** 异步触发内核生成（不阻塞用户响应，自动重试+并发控制） */
export function triggerKernelGeneration(storyId: number, content: string, title?: string | null): void {
  // 先检查是否已有缓存，避免重复生成
  if (getKernel(storyId)) return
  kernelQueue.push(() => generateWithRetry(storyId, content, title))
  runNextKernelJob()
}

// ════════════════════════════════════════════════════════════════
// 新增故事 → 自动更新 catalog_star_analyses（前端 AI 卡片）
//
// 规则：
//   · storyCount < 5 → 什么都不做（前端显示「心事太少」）
//   · storyCount ≥ 5 → debounce 15s 合并窗口后调用 starAnalysisAgent.ensureOne
//     （短时间多条故事进同一颗星，只在最后一条落库后跑一次，省 API）
//   · 确保同一 catalog_star_id 在跑的只有一份（并发锁）
// ════════════════════════════════════════════════════════════════

const ANALYSIS_DEBOUNCE_MS = 15 * 1000
const analysisDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
const activeAnalysisIds = new Set<string>()
const analysisRetryQueue: string[] = []
let analysisWorkerRunning = false

async function runAnalysisFor(catalogStarId: string): Promise<void> {
  // 懒 import（避免循环依赖 kernel ↔ starAnalysisAgent）
  const mod = await import('../agents/starAnalysisAgent')
  try {
    await mod.ensureOne(catalogStarId, {})
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[analysis] cid=${catalogStarId} 自动生成失败:`, msg.slice(0, 200))
  }
}

function runNextAnalysisJob() {
  if (analysisWorkerRunning) return
  const next = analysisRetryQueue.shift()
  if (!next) return
  if (activeAnalysisIds.has(next)) {
    // 同一颗星正在跑，移到下一轮再试
    analysisRetryQueue.push(next)
    setTimeout(runNextAnalysisJob, 2000).unref?.()
    return
  }
  analysisWorkerRunning = true
  activeAnalysisIds.add(next)
  runAnalysisFor(next).finally(() => {
    activeAnalysisIds.delete(next)
    analysisWorkerRunning = false
    setImmediate(runNextAnalysisJob)
  })
}

/**
 * 触发某 catalog 星的分析自动再生（非阻塞、debounce 合并、并发 1）
 * - 内部会先查 storyCount，<5 直接放弃（不会浪费一次 ensureOne 调用）
 * - 一个新故事挂了多颗星，对每颗 id 都要调一次
 */
export function triggerAnalysisRegeneration(catalogStarIds: Array<string | number>): void {
  if (!catalogStarIds?.length) return
  // 懒 import：取 story meta 和 storyCount 用
  let getStarStoryMeta: ((cid: string | number) => { total: number }) | null = null

  for (const raw of catalogStarIds) {
    const cid = String(raw)

    // 1) 合并窗口：15s 内同星多次触发只跑最后一次
    const existing = analysisDebounceTimers.get(cid)
    if (existing) clearTimeout(existing)

    const t = setTimeout(async () => {
      analysisDebounceTimers.delete(cid)
      try {
        // 延迟加载，避免模块加载期互相 import
        if (!getStarStoryMeta) {
          const mod = await import('../agents/starAnalysisAgent')
          getStarStoryMeta = mod.getStarStoryMeta
        }
        const meta = getStarStoryMeta(cid)
        if ((meta.total ?? 0) < 5) {
          console.log(`[analysis] cid=${cid} stories=${meta.total}<5，暂不生成分析`)
          return
        }
        // 入并发 1 的串行队列
        if (!activeAnalysisIds.has(cid)) {
          analysisRetryQueue.push(cid)
          setImmediate(runNextAnalysisJob)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[analysis] trigger cid=${cid} 调度失败:`, msg.slice(0, 200))
      }
    }, ANALYSIS_DEBOUNCE_MS)
    t.unref?.() // Node 下不会阻止进程退出；Express 进程常驻时本句无副作用
    analysisDebounceTimers.set(cid, t)
  }
}

/** 启动时补全所有缺失的内核（批量，不阻塞服务启动） */
export function backfillMissingKernels(): void {
  const rows = db.prepare(`
    SELECT s.id, s.title, s.content
    FROM stars s
    LEFT JOIN story_kernels sk ON s.id = sk.story_id
    WHERE sk.story_id IS NULL
    ORDER BY s.id
  `).all() as Array<{ id: number; title: string | null; content: string }>

  if (rows.length === 0) {
    console.log('[kernel] 所有故事内核已就绪')
    return
  }
  console.log(`[kernel] 发现 ${rows.length} 条故事缺少内核，开始后台补全...`)
  for (const row of rows) {
    kernelQueue.push(() => generateWithRetry(row.id, row.content, row.title))
  }
  runNextKernelJob()
}

export interface KernelLine {
  from: { catalogStarId: number; x: number; y: number; z: number }
  to: { catalogStarId: number; x: number; y: number; z: number }
  score: number
  sharedEmotions: string[]
  sharedThemes: string[]
}

/** 获取用户自己的故事之间的内核连线（跨星） */
export function getUserKernelLines(userId: number, limit = 20): KernelLine[] {
  // 获取用户所有有内核的故事（通过连接表获取主星）
  const rows = db.prepare(`
    SELECT s.id as story_id, scs.catalog_star_id, s.pos_x, s.pos_y, s.pos_z,
           sk.emotional_tags, sk.themes
    FROM stars s
    JOIN story_kernels sk ON s.id = sk.story_id
    JOIN story_catalog_stars scs ON s.id = scs.story_id AND scs.is_primary = 1
    WHERE s.user_id = ? AND scs.catalog_star_id IS NOT NULL AND scs.catalog_star_id > 0
  `).all(userId) as {
    story_id: number
    catalog_star_id: number
    pos_x: number; pos_y: number; pos_z: number
    emotional_tags: string; themes: string
  }[]

  if (rows.length < 2) return []

  // 为每个故事构建标签集合
  interface StoryEntry {
    storyId: number
    catalogStarId: number
    x: number; y: number; z: number
    emotionalTags: Set<string>
    themes: Set<string>
  }
  const entries: StoryEntry[] = rows.map(r => {
    let emotionalTags: string[] = []
    let themes: string[] = []
    try { emotionalTags = JSON.parse(r.emotional_tags) } catch {}
    try { themes = JSON.parse(r.themes) } catch {}
    return {
      storyId: r.story_id,
      catalogStarId: r.catalog_star_id,
      x: r.pos_x, y: r.pos_y, z: r.pos_z,
      emotionalTags: new Set(emotionalTags),
      themes: new Set(themes),
    }
  })

  // 计算两两之间的相似度
  const lines: KernelLine[] = []
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]
      const b = entries[j]
      // 同一颗星下的不连（同一颗星的故事已经聚合在一起了）
      if (a.catalogStarId === b.catalogStarId) continue

      const emotionSim = jaccardSimilarity(a.emotionalTags, b.emotionalTags)
      const themeSim = jaccardSimilarity(a.themes, b.themes)
      const score = emotionSim * 0.6 + themeSim * 0.4
      if (score <= 0.15) continue // 相似度太低的不连

      const sharedEmotions = [...a.emotionalTags].filter(t => b.emotionalTags.has(t))
      const sharedThemes = [...a.themes].filter(t => b.themes.has(t))

      lines.push({
        from: { catalogStarId: a.catalogStarId, x: a.x, y: a.y, z: a.z },
        to: { catalogStarId: b.catalogStarId, x: b.x, y: b.y, z: b.z },
        score: Math.round(score * 100) / 100,
        sharedEmotions,
        sharedThemes,
      })
    }
  }

  // 按相似度降序，取前 limit
  return lines.sort((a, b) => b.score - a.score).slice(0, limit)
}

export interface UserPreferences {
  emotionalTags: string[]
  themes: string[]
  storyCount: number
}

/**
 * 聚合用户所有故事的内核标签（用于月相 AI 个性化与缓存校验）
 *
 * - 返回去重后的情绪标签（按出现次数降序，前 10）
 * - 返回去重后的主题标签（按出现次数降序，前 10）
 * - storyCount 为用户有内核的故事总数
 *
 * 失败时返回空标签集合（不抛错），让上层降级为 'empty' prefsHash
 */
export function getUserPreferences(userId: number): UserPreferences {
  const rows = db.prepare(`
    SELECT sk.emotional_tags, sk.themes
    FROM story_kernels sk
    JOIN stars s ON sk.story_id = s.id
    WHERE s.user_id = ?
  `).all(userId) as { emotional_tags: string; themes: string }[]

  if (rows.length === 0) {
    return { emotionalTags: [], themes: [], storyCount: 0 }
  }

  const emotionCounts = new Map<string, number>()
  const themeCounts = new Map<string, number>()

  for (const row of rows) {
    try {
      const tags: string[] = JSON.parse(row.emotional_tags)
      tags.forEach(t => emotionCounts.set(t, (emotionCounts.get(t) || 0) + 1))
    } catch { /* skip */ }
    try {
      const themes: string[] = JSON.parse(row.themes)
      themes.forEach(t => themeCounts.set(t, (themeCounts.get(t) || 0) + 1))
    } catch { /* skip */ }
  }

  const sortByCount = (map: Map<string, number>) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag)

  return {
    emotionalTags: sortByCount(emotionCounts),
    themes: sortByCount(themeCounts),
    storyCount: rows.length,
  }
}