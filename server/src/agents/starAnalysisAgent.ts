/**
 * starAnalysisAgent
 *
 * Phase 2 总控：
 *  - ensureOne(catalogStarId, force?) 懒生成单星，story_hash 幂等
 *  - runAll(opts?)                     按优先级批量扫 catalog 里有故事 / 亮度高的星
 *  - upsertAnalysis()                  UPSERT catalog_star_analyses
 *
 *  节流策略：每调用一次 DeepSeek 间至少 sleep 1200 ms（避免 429）
 *  幂等策略：story_hash = SHA1(catalog_star_id + '|' + total_story_count + '|' + latest_created_at_s)
 *            如果表中 story_hash == 当前 hash 且三个 JSON 都有 → 跳过
 *  重试：单颗星生成失败（AI 抛错 / 网络错）记录 error，不中断；写 partial（只有 themehour 3 段也算 partial）
 */

import crypto from 'node:crypto'
import db from '../db'
import { computeThemeHour } from '../services/starAnalysis'
import { countStarStories, generatePersona } from './generators/personaGen'
import { generateEmotion } from './generators/emotionGen'
import { generateThemeHourTexts } from './generators/themeHourGen'
import type { PersonaPayload, EmotionPayload, ThemeHourPayload } from '../types/starAnalysis'

export type AgentStep = 'themehour' | 'persona' | 'emotion'

export type EnsureOpts = {
  meta: { starName: string; constellation: string }
  /** true 时忽略 story_hash 强制重算 */
  force?: boolean
  /** 只做指定阶段（调试用） */
  onlySteps?: AgentStep[]
  /** 每步生成后回调 */
  onProgress?: (e: { catalogStarId: string; step: AgentStep; ok: boolean; err?: string }) => void
  /** 节流 sleep ms（默认 1200） */
  throttleMs?: number
}

export type RunAllOpts = EnsureOpts & {
  /** 最多处理多少颗星（默认 20） */
  limit?: number
  /** 只处理有 ≥N 条故事的星（默认 1） */
  minStories?: number
  /** 允许的 catalog_star_id 白名单，undefined 代表全部 */
  onlyCatalogIds?: Array<string | number>
  /** 并发永远是 1，不并发；但允许跳过已 ready 的 */
  skipReady?: boolean
}

// ──────────────────────── 元数据 & 幂等 ────────────────────────

export type StarStoryMeta = {
  catalogStarId: string
  total: number
  latestAt: string | null
  catalogMag: number | null
  catalogName: string | null
}

export function computeStoryHash(m: Pick<StarStoryMeta, 'catalogStarId' | 'total' | 'latestAt'>): string {
  const s = `${m.catalogStarId}|${m.total}|${m.latestAt ?? 'NULL'}`
  return crypto.createHash('sha1').update(s, 'utf8').digest('hex').slice(0, 16)
}

export function getStarStoryMeta(catalogStarId: string | number): StarStoryMeta {
  const cid = String(catalogStarId)
  const r = db
    .prepare(
      `SELECT
         COUNT(DISTINCT s.id) AS total,
         MAX(s.created_at) AS latestAt,
         cs.mag AS catalogMag,
         cs.name AS catalogName
       FROM story_catalog_stars scs
       LEFT JOIN stars s ON s.id = scs.story_id
       LEFT JOIN catalog_stars cs ON cs.id = CAST(scs.catalog_star_id AS INTEGER)
       WHERE scs.catalog_star_id = ?
       GROUP BY scs.catalog_star_id`
    )
    .get(cid) as
    | { total: number; latestAt: string | null; catalogMag: number | null; catalogName: string | null }
    | undefined
  return {
    catalogStarId: cid,
    total: r?.total ?? 0,
    latestAt: r?.latestAt ?? null,
    catalogMag: r?.catalogMag ?? null,
    catalogName: r?.catalogName ?? null,
  }
}

/**
 * 列出待处理的 catalog 星（priority 排序：故事数 DESC × 10 + 亮星加成）。
 * minStories=0 时会把完全没故事的亮星也列进来（可让它们只跑 persona 的 fallback？ —— 我们这里跳过，等有故事再说）
 */
export function listPrioritizedStars(opts: {
  limit?: number
  minStories?: number
  onlyCatalogIds?: Array<string | number>
} = {}): StarStoryMeta[] {
  const limit = Math.max(1, Math.min(500, opts.limit ?? 20))
  const minStories = Math.max(0, opts.minStories ?? 1)
  const onlyIds = opts.onlyCatalogIds?.length ? opts.onlyCatalogIds.map(String) : null

  const rows = db
    .prepare(
      `SELECT
         CAST(scs.catalog_star_id AS TEXT) AS catalogStarId,
         COUNT(DISTINCT scs.story_id) AS total,
         MAX(s.created_at) AS latestAt,
         cs.mag AS catalogMag,
         cs.name AS catalogName
       FROM story_catalog_stars scs
       LEFT JOIN stars s ON s.id = scs.story_id
       LEFT JOIN catalog_stars cs ON cs.id = CAST(scs.catalog_star_id AS INTEGER)
       GROUP BY scs.catalog_star_id
       HAVING total >= ?
       ORDER BY total DESC, COALESCE(cs.mag, 99) ASC
       LIMIT ?`
    )
    .all(minStories, limit * 5) as Array<StarStoryMeta & { total: number }>

  let list = rows
  if (onlyIds) {
    const set = new Set(onlyIds)
    list = list.filter(r => set.has(r.catalogStarId))
    // 如果用户白名单给了没故事的星，显式补进去（按 limit 裁）
    const inList = new Set(list.map(r => r.catalogStarId))
    const missed = onlyIds
      .filter(id => !inList.has(id))
      .map(id => getStarStoryMeta(id))
    list = [...list, ...missed].slice(0, limit)
  } else {
    list = list.slice(0, limit)
  }
  return list
}

function loadDbRow(cid: string) {
  return db
    .prepare(
      `SELECT story_hash, story_count, persona_json, emotion_json, themehour_json
       FROM catalog_star_analyses WHERE catalog_star_id = ?`
    )
    .get(cid) as
    | {
        story_hash: string | null
        story_count: number
        persona_json: string | null
        emotion_json: string | null
        themehour_json: string | null
      }
    | undefined
}

// ──────────────────────── UPSERT 入库 ────────────────────────

export type PartialAnalysisPatch = {
  persona?: PersonaPayload | null
  emotion?: EmotionPayload | null
  themehour?: ThemeHourPayload | null
  /** 缺 = 留旧值 / 用 meta 现算 */
  storyCount?: number
  storyHash?: string
  generatedAt?: number
}

export function upsertAnalysis(catalogStarId: string | number, patch: PartialAnalysisPatch) {
  const cid = String(catalogStarId)
  const existing = db
    .prepare('SELECT * FROM catalog_star_analyses WHERE catalog_star_id = ?')
    .get(cid) as Record<string, unknown> | undefined

  let personaJson: string | null | undefined = patch.persona === undefined ? undefined : (patch.persona ? JSON.stringify(patch.persona) : null)
  let emotionJson: string | null | undefined = patch.emotion === undefined ? undefined : (patch.emotion ? JSON.stringify(patch.emotion) : null)
  let themehourJson: string | null | undefined = patch.themehour === undefined ? undefined : (patch.themehour ? JSON.stringify(patch.themehour) : null)

  if (existing) {
    if (personaJson === undefined) personaJson = existing.persona_json as string | null | undefined
    if (emotionJson === undefined) emotionJson = existing.emotion_json as string | null | undefined
    if (themehourJson === undefined) themehourJson = existing.themehour_json as string | null | undefined
  }
  const storyCount = patch.storyCount ?? (existing?.story_count as number | undefined) ?? 0
  const storyHash = patch.storyHash ?? (existing?.story_hash as string | undefined) ?? null
  const generatedAt = patch.generatedAt ?? Date.now()

  db.prepare(
    `INSERT INTO catalog_star_analyses
       (catalog_star_id, persona_json, emotion_json, themehour_json, story_count, story_hash, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(catalog_star_id) DO UPDATE SET
       persona_json   = COALESCE(excluded.persona_json,   catalog_star_analyses.persona_json),
       emotion_json   = COALESCE(excluded.emotion_json,   catalog_star_analyses.emotion_json),
       themehour_json = COALESCE(excluded.themehour_json, catalog_star_analyses.themehour_json),
       story_count    = excluded.story_count,
       story_hash     = COALESCE(excluded.story_hash,     catalog_star_analyses.story_hash),
       generated_at   = excluded.generated_at`
  ).run(cid, personaJson ?? null, emotionJson ?? null, themehourJson ?? null, storyCount, storyHash, generatedAt)
}

// ──────────────────────── 单星懒生成 ────────────────────────

const DEFAULT_STEPS: AgentStep[] = ['themehour', 'persona', 'emotion']

/**
 * 对某一颗星跑一遍。
 * - 若 skipReady=true 且 hash 命中 + 三项齐全 → 立即 return
 * - 否则按 themehour → persona → emotion 顺序生成（themehour 最轻，没故事也能跑）
 * - 任何步骤失败都记录日志但不中断，保证 partial 入库
 */
export async function ensureOne(catalogStarId: string | number, opts: EnsureOpts): Promise<void> {
  const cid = String(catalogStarId)
  const steps = opts.onlySteps?.length ? opts.onlySteps : DEFAULT_STEPS
  const throttle = Math.max(0, opts.throttleMs ?? 1200)
  const meta = getStarStoryMeta(cid)
  const hash = computeStoryHash(meta)
  const row = loadDbRow(cid)

  if (!opts.force && row?.story_hash === hash) {
    const hasAll =
      !!row.persona_json &&
      !!row.emotion_json &&
      !!row.themehour_json &&
      themehourHasTexts(row.themehour_json)
    if (hasAll) return
  }

  const storyCount = meta.total ?? countStarStories(cid)

  // Step 1：themehour —— 先真实 SQL + AI 三段文；没故事也允许（SQL 会全 0，AI 写更朦胧一点）
  if (steps.includes('themehour')) {
    try {
      const base = computeThemeHour(cid)
      let th: ThemeHourPayload
      if (storyCount >= 1) {
        const texts = await generateThemeHourTexts(cid, opts.meta)
        th = { ...base, ...texts }
      } else {
        // 没故事的亮星跳过 AI 三段文（免得胡编），只给 SQL 聚合（全 0 数组）
        th = base
      }
      upsertAnalysis(cid, { themehour: th, storyCount, storyHash: hash })
      opts.onProgress?.({ catalogStarId: cid, step: 'themehour', ok: true })
      await sleep(throttle)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[starAnalysisAgent] themehour 失败 cid=${cid}:`, msg.slice(0, 200))
      opts.onProgress?.({ catalogStarId: cid, step: 'themehour', ok: false, err: msg })
      // 至少写一个 base（只有真实聚合，没 AI 三段文）
      const base = computeThemeHour(cid)
      upsertAnalysis(cid, { themehour: base, storyCount, storyHash: hash })
    }
  }

  // Step 2：persona —— 需要至少 1 条故事
  if (steps.includes('persona')) {
    if (storyCount >= 1) {
      try {
        const persona = await generatePersona(cid, opts.meta)
        upsertAnalysis(cid, { persona, storyCount, storyHash: hash })
        opts.onProgress?.({ catalogStarId: cid, step: 'persona', ok: true })
        await sleep(throttle)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[starAnalysisAgent] persona 失败 cid=${cid}:`, msg.slice(0, 200))
        opts.onProgress?.({ catalogStarId: cid, step: 'persona', ok: false, err: msg })
      }
    } else {
      opts.onProgress?.({ catalogStarId: cid, step: 'persona', ok: false, err: '故事数<1，跳过' })
    }
  }

  // Step 3：emotion —— 需要至少 1 条故事
  if (steps.includes('emotion')) {
    if (storyCount >= 1) {
      try {
        const emotion = await generateEmotion(cid, opts.meta)
        upsertAnalysis(cid, { emotion, storyCount, storyHash: hash, generatedAt: Date.now() })
        opts.onProgress?.({ catalogStarId: cid, step: 'emotion', ok: true })
        await sleep(throttle)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[starAnalysisAgent] emotion 失败 cid=${cid}:`, msg.slice(0, 200))
        opts.onProgress?.({ catalogStarId: cid, step: 'emotion', ok: false, err: msg })
      }
    } else {
      opts.onProgress?.({ catalogStarId: cid, step: 'emotion', ok: false, err: '故事数<1，跳过' })
    }
  }
}

// ──────────────────────── 批量 ────────────────────────

export type RunAllSummary = {
  planned: string[]
  skippedReady: string[]
  ok: Array<{ id: string }>
  partial: Array<{ id: string; missing: string }>
  failed: Array<{ id: string; err: string }>
}

export async function runAll(opts: RunAllOpts): Promise<RunAllSummary> {
  const skipReady = opts.skipReady ?? true
  const stars = listPrioritizedStars({
    limit: opts.limit,
    minStories: opts.minStories,
    onlyCatalogIds: opts.onlyCatalogIds,
  })
  const summary: RunAllSummary = { planned: [], skippedReady: [], ok: [], partial: [], failed: [] }
  const stepTracker = new Map<string, Set<AgentStep>>()

  const customProgress = opts.onProgress
  const localProgress: EnsureOpts['onProgress'] = (e) => {
    const set = stepTracker.get(e.catalogStarId) ?? new Set<AgentStep>()
    if (e.ok) set.add(e.step)
    stepTracker.set(e.catalogStarId, set)
    customProgress?.(e)
  }

  for (const star of stars) {
    summary.planned.push(star.catalogStarId)
    if (skipReady && !opts.force) {
      const row = loadDbRow(star.catalogStarId)
      const meta = getStarStoryMeta(star.catalogStarId)
      const hash = computeStoryHash(meta)
      const ready =
        row?.story_hash === hash &&
        !!row.persona_json &&
        !!row.emotion_json &&
        !!row.themehour_json &&
        themehourHasTexts(row.themehour_json)
      if (ready) {
        summary.skippedReady.push(star.catalogStarId)
        console.log(`[starAnalysisAgent] skip ready id=${star.catalogStarId} total=${meta.total}`)
        continue
      }
    }

    const name = star.catalogName || opts.meta.starName
    const constellation = opts.meta.constellation

    try {
      await ensureOne(star.catalogStarId, {
        ...opts,
        meta: { starName: name || '未命名星', constellation: constellation || '未分星座' },
        onProgress: localProgress,
      })
      const set = stepTracker.get(star.catalogStarId) ?? new Set<AgentStep>()
      const missing: string[] = []
      if (!set.has('themehour')) missing.push('themehour')
      if (!set.has('persona')) missing.push('persona')
      if (!set.has('emotion')) missing.push('emotion')
      if (missing.length === 0) summary.ok.push({ id: star.catalogStarId })
      else summary.partial.push({ id: star.catalogStarId, missing: missing.join(',') })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      summary.failed.push({ id: star.catalogStarId, err: msg })
    }
  }
  return summary
}

// ──────────────────────── utils ────────────────────────

function themehourHasTexts(jsonStr: string): boolean {
  try {
    const obj = JSON.parse(jsonStr) as Partial<ThemeHourPayload>
    return !!obj.forestNote && !!obj.peakText && !!obj.lowText
  } catch {
    return false
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms))
}
