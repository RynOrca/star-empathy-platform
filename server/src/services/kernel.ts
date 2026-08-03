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

// ════════════════════════════════════════════════════════════════
//  新故事 → 寻找最契合的恒星（内核 Jaccard Top10 + AI 语义重排给理由）
//  返回 Top3 候选星给前端，让用户挑一颗挂上故事
// ════════════════════════════════════════════════════════════════

export interface MatchCandidate {
  catalogStarId: number
  name: string | null
  constellationCN: string
  mag: number
  distance: number | null
  jaccardScore: number    // 0~1 Jaccard 相似度
  aiScore: number         // 0~1 AI 语义贴合度
  finalScore: number      // 加权总分
  matchReason: string     // AI 写的匹配理由（1~2 句，中文）
  starEssences: string[]  // 该星现有故事的 Top3 essence（一句话凝练）
  isFallback: boolean     // 是否为「匹配不到，降级兜底的亮星」
}

/** 解析 AI 重排的 JSON 结果（兼容 ```json fence、自由文提取） */
function parseRerankResult(raw: string): Array<{ catalogStarId: number; aiScore: number; matchReason: string }> {
  const jsonMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  const jsonStr = (jsonMatch ? jsonMatch[1] : raw).trim()

  // 尝试直接解析
  try {
    const obj = JSON.parse(jsonStr)
    const items = Array.isArray(obj) ? obj : (Array.isArray(obj.results) ? obj.results : null)
    if (!items) throw new Error('no array')
    return items.map((r: any) => ({
      catalogStarId: typeof r.catalog_star_id === 'number' ? r.catalog_star_id : (parseInt(String(r.catalogStarId ?? r.id ?? 0), 10) || 0),
      aiScore: typeof r.ai_score === 'number' ? clamp01(r.ai_score) : (clamp01(Number(r.aiScore) || 0)),
      matchReason: typeof r.match_reason === 'string' ? r.match_reason.trim() : (String(r.matchReason ?? '').trim() || '主题高度契合'),
    })).filter((r: { catalogStarId: number }) => r.catalogStarId > 0)
  } catch {
    // 自由文 fallback：逐行抠出 catalogStarId / score / reason
    const lines = jsonStr.split(/\n/).map(l => l.trim()).filter(Boolean)
    const out: Array<{ catalogStarId: number; aiScore: number; matchReason: string }> = []
    for (const line of lines) {
      const idMatch = line.match(/(?:catalogStarId|catalog_star_id|id)\s*[:：]?\s*(\d+)/i)
      const scoreMatch = line.match(/(?:aiScore|ai_score|score)\s*[:：]?\s*(0?\.\d+|1\.0|\d+)/i)
      const reasonMatch = line.match(/(?:matchReason|match_reason|reason|理由)\s*[:：]\s*(.+)/i)
      if (idMatch) {
        out.push({
          catalogStarId: parseInt(idMatch[1], 10),
          aiScore: scoreMatch ? clamp01(Number(scoreMatch[1])) : 0.5,
          matchReason: reasonMatch ? reasonMatch[1].trim().replace(/^["“]|["”，,。\.]+$/g, '') : '主题高度契合',
        })
      }
    }
    return out
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

/**
 * 为一段还未落库的新故事文本，寻找 Top3 最契合的恒星
 *
 * 流程：
 *  1) generateKernel() 提取新故事的临时内核（不写 DB）
 *  2) getAllStarKernels() 拿所有有故事的恒星的聚合标签
 *  3) Jaccard 算每颗星相似度 → 取 Top 10
 *  4) DeepSeek 把新故事 essence + Top10 星的 essence 做语义重排 + 给每颗星写匹配理由
 *  5) 加权合并 Jaccard*0.4 + AI*0.6 → 取 Top 3
 *  6) 若 Top3 最高分 < 0.3 → 降级兜底：挑亮星(mag≤3 且 storyCount<3) Top 3
 */
/**
 * 从新故事的标题/正文中提取 3-5 个建议标签（AI选标签 / 开放标签系统）
 *
 * 优先顺序：
 *   1) 新故事内核 generateKernel() 产出的 emotion / 主题词（AI关键词最准）
 *   2) 常见情绪词词典命中（中英文都支持，最终都转中文）
 *   3) 去重 + 长度裁剪到 2-6 字（和 createStar TAG_RE 一致）
 */
function extractSuggestedTags(
  newEmotions: string[],
  newThemes: string[],
  title: string | null,
  content: string,
): string[] {
  const all = `${title ?? ''} ${content}`;
  const TAG_RE = /^[\u4e00-\u9fa5A-Za-z0-9]{2,6}$/;
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (t: string) => {
    if (!t) return;
    const v = t.trim();
    if (!TAG_RE.test(v)) return;
    if (seen.has(v)) return;
    seen.add(v);
    out.push(v);
  };

  // 1) Kernel 产出的情绪词（AI 最懂）— 直接采纳
  for (const e of newEmotions) push(e);
  // 2) Kernel 产出的主题词，按 2-6 字筛选
  for (const th of newThemes) push(th);

  // 3) 常用情绪词典命中（兜底，当内核提取少或空时生效）
  const emoDict: Array<[string, RegExp]> = [
    ['思念', /思念|想念|相思|挂念|惦记|想你|怀念/],
    ['等待', /等待|等候|等你|守候|期待|盼/],
    ['离别', /离别|分开|分手|告别|告别|离开|分别/],
    ['愿望', /愿望|心愿|希望|想要|梦想|祈祷|许愿/],
    ['孤独', /孤独|寂寞|孤单|一个人|独处|冷清/],
    ['暗恋', /暗恋|喜欢|心动|偷偷|在意|心仪/],
    ['遗憾', /遗憾|后悔|可惜|错过|惋惜/],
    ['乡愁', /乡愁|故乡|家乡|老家|想家|游子/],
    ['成长', /成长|长大|蜕变|坚持|努力|奋斗|磨练/],
    ['勇气', /勇气|勇敢|坚强|无畏|加油/],
    ['释然', /释然|放下|释怀|看开|淡了/],
    ['感谢', /感谢|谢谢|感恩|感激|遇见/],
    ['难过', /难过|伤心|痛苦|悲伤|崩溃|哭|委屈/],
    ['治愈', /治愈|温暖|温柔|希望|光|阳光/],
    ['晚安', /晚安|夜|夜晚|凌晨|失眠|睡不着/],
    ['友情', /朋友|闺蜜|兄弟|友情|同窗|发小/],
    ['亲情', /家人|父母|妈妈|爸爸|亲情|家人/],
    ['初恋', /初恋|告白|表白|青涩/],
  ];
  for (const [word, re] of emoDict) {
    if (re.test(all)) push(word);
  }

  // 4) 取前 5 个
  return out.slice(0, 5);
}

export async function findMatchingStarsForContent(
  title: string | null,
  content: string,
  limit = 3,
): Promise<{ matches: MatchCandidate[]; suggestedTags: string[] }> {
  if (!content || !content.trim()) {
    return { matches: [], suggestedTags: [] }
  }
  const trimmed = content.trim()
  const trimmedTitle = title?.trim() || null

  // ── Step 1: 提取新故事内核（不落库，临时） ──
  const newKernel = await generateKernel(trimmed, trimmedTitle)
  const newEmotions = new Set(newKernel.emotionalTags)
  const newThemes = new Set(newKernel.themes)
  const newEssence = newKernel.essence

  // AI 建议标签（基于内核 + 情绪词典命中）
  const suggestedTags = extractSuggestedTags(
    newKernel.emotionalTags,
    newKernel.themes,
    trimmedTitle,
    trimmed,
  )

  // ── Step 2+3: 所有恒星聚合标签 Jaccard → Top 10 ──
  const allStarKernels = getAllStarKernels()
  interface JaccardEntry {
    catalogStarId: number
    jaccardScore: number
    sharedEmotions: string[]
    sharedThemes: string[]
  }
  const jaccardList: JaccardEntry[] = []
  for (const [cid, tags] of allStarKernels) {
    const emotionSim = jaccardSimilarity(newEmotions, tags.emotionalTags)
    const themeSim = jaccardSimilarity(newThemes, tags.themes)
    const score = emotionSim * 0.6 + themeSim * 0.4
    jaccardList.push({
      catalogStarId: cid,
      jaccardScore: Math.round(score * 100) / 100,
      sharedEmotions: [...newEmotions].filter(t => tags.emotionalTags.has(t)),
      sharedThemes: [...newThemes].filter(t => tags.themes.has(t)),
    })
  }
  jaccardList.sort((a, b) => b.jaccardScore - a.jaccardScore)
  const topN = Math.min(10, jaccardList.length)
  const jaccardTop = jaccardList.slice(0, topN)

  let finalCandidates: MatchCandidate[] = []

  if (jaccardTop.length > 0) {
    // ── Step 4: AI 重排 + 给理由 ──
    const { getCatalogStar, getStarDisplay } = await import('./catalogMeta')

    // 为 TopN 每颗星取 essence（展示用）
    const starEssencesMap = new Map<number, string[]>()
    for (const e of jaccardTop) {
      const tags = getAggregatedTags(e.catalogStarId)
      starEssencesMap.set(e.catalogStarId, tags.essences.slice(0, 3))
    }

    // 组装 AI 重排 prompt
    const rerankCandidates = jaccardTop.map(e => {
      const s = getCatalogStar(e.catalogStarId)
      const disp = getStarDisplay(e.catalogStarId)
      return {
        catalogStarId: e.catalogStarId,
        starName: disp.starName,
        constellation: disp.constellation,
        mag: s?.mag ?? null,
        jaccardScore: e.jaccardScore,
        sharedEmotions: e.sharedEmotions.slice(0, 5),
        sharedThemes: e.sharedThemes.slice(0, 5),
        starEssences: starEssencesMap.get(e.catalogStarId) ?? [],
      }
    })

    const rerankSystem = `你是"星语穹庭"的星辰匹配师。用户写了一段新的心事，需要判断把它挂到夜空中哪几颗星上最有缘分。

你会拿到：
- 新故事的「内核一句话（essence）」+ 情绪标签 + 主题词
- Jaccard 相似度初筛出的 10 颗候选星，每颗含：星名、星座、共享情绪/主题、该星下已有故事的内核凝练

请你：
1. 从「故事内核的情感共振 / 主题呼应 / 文化意象联想」三个维度，为每颗候选星打一个 0~1 的 aiScore（语义贴合度），不要所有分数都一样，要有区分度
2. 为每颗候选星写一句 matchReason（1~2 句中文，20~50 字），温暖诗意、点出具体的共鸣点，比如「织女一承载千年离别思念，与你写的异地恋故事高度共振」
3. 只返回 JSON，不要任何其他文字

JSON 格式（数组）：
[
  { "catalogStarId": 123, "aiScore": 0.82, "matchReason": "星名承载着XX意象，与你的XX故事高度共振..." },
  ...
]

**要求**：
- 数组里的 catalogStarId 必须严格等于候选星给你的 id，不要编造
- 返回的数组长度必须等于候选星数量
- 只输出 JSON，不要前缀后缀，不要 \`\`\`json fence
- 中文输出`

    const rerankUser = `新故事：
标题：${trimmedTitle ?? '(无标题)'}
内核一句话：${newEssence}
情绪标签：${newKernel.emotionalTags.join('、') || '(无)'}
主题词：${newKernel.themes.join('、') || '(无)'}
正文：${trimmed.slice(0, 150)}${trimmed.length > 150 ? '…' : ''}

候选星列表：
${rerankCandidates.map((c, i) => `${i + 1}. [catalogStarId=${c.catalogStarId}] ${c.starName}（${c.constellation}，视星等 ${c.mag}）
  Jaccard 相似度：${c.jaccardScore}
  共享情绪：${c.sharedEmotions.join('、') || '(无)'}
  共享主题：${c.sharedThemes.join('、') || '(无)'}
  该星故事内核凝练：${c.starEssences.map(e => `「${e}」`).join(' / ') || '(暂无故事)'}`).join('\n\n')}`

    try {
      const raw = await deepseekChat(
        [
          { role: 'system', content: rerankSystem },
          { role: 'user', content: rerankUser },
        ],
        { temperature: 0.7, maxTokens: 1200, jsonMode: true },
      )
      const reranked = parseRerankResult(raw)
      const aiMap = new Map(reranked.map(r => [r.catalogStarId, r]))

      // Step 5: 加权合并 Jaccard*0.4 + AI*0.6 → Top 3
      const merged = jaccardTop.map(e => {
        const ai = aiMap.get(e.catalogStarId) ?? { aiScore: e.jaccardScore, matchReason: '主题情绪高度契合' }
        const finalScore = clamp01(e.jaccardScore * 0.4 + ai.aiScore * 0.6)
        const s = getCatalogStar(e.catalogStarId)
        const disp = getStarDisplay(e.catalogStarId)
        return {
          catalogStarId: e.catalogStarId,
          name: (s?.name ?? disp.starName.replace(/^星 #\d+$/, '')) || null,
          constellationCN: disp.constellation,
          mag: s?.mag ?? 0,
          distance: s?.dist ?? null,
          jaccardScore: Math.round(e.jaccardScore * 100) / 100,
          aiScore: Math.round(ai.aiScore * 100) / 100,
          finalScore: Math.round(finalScore * 100) / 100,
          matchReason: ai.matchReason,
          starEssences: starEssencesMap.get(e.catalogStarId) ?? [],
          isFallback: false,
        } satisfies MatchCandidate
      })
      merged.sort((a, b) => b.finalScore - a.finalScore)
      finalCandidates = merged.slice(0, limit)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.warn('[match-star] AI 重排失败，降级只用 Jaccard:', msg.slice(0, 200))
      // AI 重排失败兜底：直接用 Jaccard Top3，理由自动生成
      const { getCatalogStar, getStarDisplay } = await import('./catalogMeta')
      finalCandidates = jaccardTop.slice(0, limit).map(e => {
        const s = getCatalogStar(e.catalogStarId)
        const disp = getStarDisplay(e.catalogStarId)
        const tagHint = [...e.sharedEmotions, ...e.sharedThemes].slice(0, 3).join('、')
        const reason = tagHint ? `共享${tagHint}等情绪主题，与你的故事高度契合` : '与你的故事内核相似度较高'
        return {
          catalogStarId: e.catalogStarId,
          name: (s?.name ?? disp.starName.replace(/^星 #\d+$/, '')) || null,
          constellationCN: disp.constellation,
          mag: s?.mag ?? 0,
          distance: s?.dist ?? null,
          jaccardScore: Math.round(e.jaccardScore * 100) / 100,
          aiScore: Math.round(e.jaccardScore * 100) / 100,
          finalScore: Math.round(e.jaccardScore * 100) / 100,
          matchReason: reason,
          starEssences: getAggregatedTags(e.catalogStarId).essences.slice(0, 3),
          isFallback: false,
        }
      })
    }
  }

  // ── Step 6: 降级兜底（最高分 < 0.3 或候选不足 limit） ──
  const MIN_FINAL = 0.3
  const needFallback =
    finalCandidates.length < limit ||
    (finalCandidates[0]?.finalScore ?? 0) < MIN_FINAL

  if (needFallback) {
    const { listAllCatalogStars } = await import('./catalogMeta')
    const allStars = listAllCatalogStars()

    // 拿每颗亮星的 storyCount
    const storyCounts = new Map<number, number>()
    try {
      const rows = db.prepare(`
        SELECT scs.catalog_star_id, COUNT(DISTINCT scs.story_id) as cnt
        FROM story_catalog_stars scs
        GROUP BY scs.catalog_star_id
      `).all() as Array<{ catalog_star_id: number; cnt: number }>
      for (const r of rows) storyCounts.set(r.catalog_star_id, r.cnt)
    } catch { /* ignore */ }

    // 优先：mag ≤ 3 且 storyCount < 3 的亮星（未被充分书写的亮星）
    let picks = allStars
      .filter(s => (s.mag ?? 99) <= 3)
      .map(s => ({ s, cnt: storyCounts.get(s.id) ?? 0 }))
      .filter(x => x.cnt < 3)
      .sort((a, b) => (a.s.mag - b.s.mag) || (a.cnt - b.cnt))
      .slice(0, limit)

    // 次级兜底：只有 3 颗以下，从 Top 20 亮星（mag ≤ 2）按 storyCount ASC 补够
    if (picks.length < limit) {
      const already = new Set(picks.map(p => p.s.id))
      const rest = allStars
        .filter(s => (s.mag ?? 99) <= 2 && !already.has(s.id))
        .map(s => ({ s, cnt: storyCounts.get(s.id) ?? 0 }))
        .sort((a, b) => (a.cnt - b.cnt) || (a.s.mag - b.s.mag))
      picks = [...picks, ...rest].slice(0, limit)
    }

    // 为兜底亮星写匹配理由（如果 AI 重排成功了就复用 AI，否则调用一次给理由）
    let fallReasons: Map<number, string> = new Map()
    try {
      const picksInfo = picks.map(({ s }) => {
        const starName = s.name || `星 #${s.id}`
        const con = s.constellationCN ? `${s.constellationCN}座` : '未分星座'
        return { id: s.id, starName, constellation: con, mag: s.mag }
      })
      const reasonSys = `你是"星语穹庭"的星辰匹配师。用户的新故事太独特，没有从已有故事的恒星中找到足够贴合的，现在要把它挂到几颗夜空中明亮但故事较少的星上，让用户的故事成为这颗星的第一批温度。

请为每颗候选亮星写一句简短的 matchReason（1 句中文，20~35 字），温柔有诗意，传达「你的故事将点亮这颗星」的感觉，结合星名/星座意象。

返回 JSON 数组，格式：
[ { "catalogStarId": 123, "matchReason": "这颗明亮的XX星静静等待，你的故事将成为它第一束星光。" }, ... ]

只输出 JSON，不要前缀后缀。`
      const reasonUser = `新故事内核：${newEssence}
情绪：${newKernel.emotionalTags.join('、') || '(无)'} / 主题：${newKernel.themes.join('、') || '(无)'}

亮星列表：
${picksInfo.map(p => `- [catalogStarId=${p.id}] ${p.starName}（${p.constellation}，视星等 ${p.mag}）`).join('\n')}`
      const raw = await deepseekChat(
        [{ role: 'system', content: reasonSys }, { role: 'user', content: reasonUser }],
        { temperature: 0.9, maxTokens: 600, jsonMode: true },
      )
      const parsed = parseRerankResult(raw)
      for (const p of parsed) fallReasons.set(p.catalogStarId, p.matchReason)
    } catch { /* ignore */ }

    const fallbackCandidates: MatchCandidate[] = picks.map(({ s }) => ({
      catalogStarId: s.id,
      name: s.name ?? null,
      constellationCN: s.constellationCN ? `${s.constellationCN}座` : '未分星座',
      mag: s.mag,
      distance: s.dist ?? null,
      jaccardScore: 0,
      aiScore: 0,
      finalScore: 0,
      matchReason: fallReasons.get(s.id) ?? '这颗明亮的星辰静静等待，你的故事将点亮它的第一束温度。',
      starEssences: [],
      isFallback: true,
    }))

    // 若原候选不足：补降级的到 limit 条；若整体分数太低：全量替换为降级
    if ((finalCandidates[0]?.finalScore ?? 0) < MIN_FINAL) {
      finalCandidates = fallbackCandidates
    } else {
      const already = new Set(finalCandidates.map(c => c.catalogStarId))
      for (const f of fallbackCandidates) {
        if (already.has(f.catalogStarId)) continue
        finalCandidates.push(f)
        if (finalCandidates.length >= limit) break
      }
    }
  }

  return { matches: finalCandidates.slice(0, limit), suggestedTags }
}