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
    JOIN stars s ON sk.story_id = s.id
    WHERE s.catalog_star_id = ?
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
    SELECT DISTINCT s.catalog_star_id, sk.emotional_tags, sk.themes
    FROM story_kernels sk
    JOIN stars s ON sk.story_id = s.id
    WHERE s.catalog_star_id IS NOT NULL AND s.catalog_star_id > 0
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

  const results: SimilarStar[] = []
  for (const [cid, tags] of allKernels) {
    if (cid === catalogStarId) continue
    const emotionSim = jaccardSimilarity(target.emotionalTags, tags.emotionalTags)
    const themeSim = jaccardSimilarity(target.themes, tags.themes)
    // 情绪权重 0.6，主题权重 0.4
    const score = emotionSim * 0.6 + themeSim * 0.4
    if (score <= 0) continue

    const sharedEmotions = [...target.emotionalTags].filter(t => tags.emotionalTags.has(t))
    const sharedThemes = [...target.themes].filter(t => tags.themes.has(t))

    const storyCount = (db.prepare(
      'SELECT COUNT(*) as cnt FROM stars WHERE catalog_star_id = ?'
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
    'SELECT COUNT(*) as cnt FROM stars WHERE catalog_star_id = ?'
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

/** 异步触发内核生成（不阻塞，失败静默） */
export function triggerKernelGeneration(storyId: number, content: string, title?: string | null): void {
  setImmediate(async () => {
    try {
      await ensureKernel(storyId, content, title)
    } catch (err) {
      console.error(`故事 ${storyId} 内核生成失败:`, err)
    }
  })
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
  // 获取用户所有有内核的故事
  const rows = db.prepare(`
    SELECT s.id as story_id, s.catalog_star_id, s.pos_x, s.pos_y, s.pos_z,
           sk.emotional_tags, sk.themes
    FROM stars s
    JOIN story_kernels sk ON s.id = sk.story_id
    WHERE s.user_id = ? AND s.catalog_star_id IS NOT NULL AND s.catalog_star_id > 0
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