/**
 * starAnalysisService
 *
 * 「单星故事集门户」的分析服务。
 *
 * Phase 1 能力：
 *   - computeThemeHour(catalogStarId)
 *       · 8 主题 Top8（SQL COUNT 聚合 story_kernels.themes）
 *       · 24h 投递计数（基于 stars.created_at 本地时区 UTC+8）
 *       · 3 段 AI 自由文暂时返回占位符；后续 Phase 2 接 deepseek
 *
 *   - readAnalysis(catalogStarId)
 *       · 查 catalog_star_analyses 表返回已预生成的 persona/emotion/themehour
 *       · themehour 如果表中没存 → 立即走 computeThemeHour 返回（轻量 SQL 不花 API）
 *
 * Phase 2 能力（预留接口）：
 *   - personaGen  / emotionGen / themeHour 3 段文 接 DeepSeek
 *   - runAll(priority) 批量生成
 *   - ensureOne(catalogStarId, force) 懒生成 + story_hash 幂等
 */

import db from '../db'
import type { ThemeHourPayload, CatalogAnalysisFull } from '../types/starAnalysis'

// ──────────────────────── 主题 palette（固定 8 色，与前端保持一致） ────────────────
const THEME_PALETTE = [
  '#ffd98a', // 故乡-金
  '#86a8ff', // 深夜-蓝
  '#ff8b7d', // 爱情-珊瑚
  '#caa7ff', // 成长-紫
  '#9ae6b4', // 童年-绿
  '#fbb6ce', // 城市-粉
  '#93c5fd', // 梦想-天蓝
  '#a7f3d0', // 日常-薄荷
]

// 主题别名归一化（常见近义词合并，避免"亲情/家人/妈妈"散成 N 个）
const THEME_ALIAS: Record<string, string> = {
  '亲情': '亲情故乡',
  '家人': '亲情故乡',
  '故乡': '亲情故乡',
  '乡愁': '亲情故乡',
  '思乡': '亲情故乡',
  '家': '亲情故乡',
  '回家': '亲情故乡',
  '妈妈': '亲情故乡',
  '爸爸': '亲情故乡',
  '父母': '亲情故乡',
  '奶奶': '亲情故乡',
  '爷爷': '亲情故乡',
  '童年': '童年回忆',
  '回忆': '童年回忆',
  '怀旧': '童年回忆',
  '旧时光': '童年回忆',
  '过去': '童年回忆',
  '爱情': '爱情离别',
  '恋人': '爱情离别',
  '恋爱': '爱情离别',
  '分手': '爱情离别',
  '离别': '爱情离别',
  '重逢': '爱情离别',
  '暗恋': '爱情离别',
  '孤独': '深夜独处',
  '独处': '深夜独处',
  '失眠': '深夜独处',
  '夜晚': '深夜独处',
  '深夜': '深夜独处',
  '漂泊': '城市漂泊',
  '城市': '城市漂泊',
  '北漂': '城市漂泊',
  '异乡': '城市漂泊',
  '出租屋': '城市漂泊',
  '搬家': '城市漂泊',
  '成长': '成长困惑',
  '迷茫': '成长困惑',
  '选择': '成长困惑',
  '未来': '成长困惑',
  '青春': '成长困惑',
  '高中': '成长困惑',
  '大学': '成长困惑',
  '毕业': '成长困惑',
  '梦想': '梦想坚持',
  '理想': '梦想坚持',
  '坚持': '梦想坚持',
  '目标': '梦想坚持',
  '努力': '梦想坚持',
  '日常': '平凡日常',
  '生活': '平凡日常',
  '今天': '平凡日常',
  '平凡': '平凡日常',
  '小确幸': '平凡日常',
  '友情': '友情陪伴',
  '朋友': '友情陪伴',
  '陪伴': '友情陪伴',
  '兄弟': '友情陪伴',
  '闺蜜': '友情陪伴',
  '自然': '自然旅行',
  '旅行': '自然旅行',
  '旅途': '自然旅行',
  '山川': '自然旅行',
  '大海': '自然旅行',
  '夏天': '自然旅行',
  '冬天': '自然旅行',
  '自我': '自我和解',
  '和解': '自我和解',
  '接纳': '自我和解',
  '焦虑': '自我和解',
  '内耗': '自我和解',
}

function normalizeTheme(raw: string): string {
  const t = raw.trim()
  return THEME_ALIAS[t] ?? t
}

/**
 * Phase 1: themeHour SQL 聚合。
 * themes 直接从 story_kernels.themes (JSON 数组字符串) 聚合。
 * 24h 分布从 stars.created_at 按 UTC+8 时区聚合。
 */
export function computeThemeHour(catalogStarId: string | number): ThemeHourPayload {
  const cid = String(catalogStarId)

  // ── 8 Themes（按 count 降序，Top 8） ──
  // 通过连接表 story_catalog_stars 统一拿该星所有故事 + kernels，兼容一个故事挂多颗星
  const stories = db
    .prepare(
      `SELECT s.id AS sid, sk.themes AS themes_json
       FROM story_catalog_stars scs
       JOIN stars s ON s.id = scs.story_id
       LEFT JOIN story_kernels sk ON sk.story_id = s.id
       WHERE scs.catalog_star_id = ?`
    )
    .all(cid) as Array<{ sid: number; themes_json: string | null }>

  const counter = new Map<string, number>()
  for (const row of stories) {
    if (!row.themes_json) continue
    try {
      const arr: unknown = JSON.parse(row.themes_json)
      if (!Array.isArray(arr)) continue
      for (const raw of arr) {
        if (typeof raw !== 'string') continue
        const norm = normalizeTheme(raw)
        counter.set(norm, (counter.get(norm) ?? 0) + 1)
      }
    } catch {
      /* ignore malformed json */
    }
  }
  // 没有 kernels → 退化到 stars.tag 字段聚合（老数据兜底；用连接表）
  if (counter.size === 0) {
    const tagRows = db
      .prepare(
        `SELECT s.tag AS tag
         FROM story_catalog_stars scs
         JOIN stars s ON s.id = scs.story_id
         WHERE scs.catalog_star_id = ? AND s.tag IS NOT NULL AND s.tag != ''`
      )
      .all(cid) as Array<{ tag: string }>
    for (const r of tagRows) {
      const n = normalizeTheme(r.tag)
      counter.set(n, (counter.get(n) ?? 0) + 1)
    }
  }
  const sortedThemes = [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count], i) => ({
      name,
      count,
      color: THEME_PALETTE[i % THEME_PALETTE.length],
    }))
  // 连 tag 都没 → 返回一组通用的空主题
  const themes = sortedThemes.length > 0 ? sortedThemes : [
    { name: '亲情故乡', count: 0, color: THEME_PALETTE[0] },
    { name: '深夜独处', count: 0, color: THEME_PALETTE[1] },
    { name: '爱情离别', count: 0, color: THEME_PALETTE[2] },
  ]

  // ── 24 Hourly（UTC+8） ──
  // SQLite datetime() 默认 UTC。北京时区 = +8h。
  const hourRows = db
    .prepare(
      `SELECT cast(strftime('%H', datetime(s.created_at, '+8 hours')) AS INTEGER) AS h,
              COUNT(DISTINCT s.id) AS c
       FROM story_catalog_stars scs
       JOIN stars s ON s.id = scs.story_id
       WHERE scs.catalog_star_id = ?
         AND s.created_at IS NOT NULL
       GROUP BY h`
    )
    .all(cid) as Array<{ h: number; c: number }>

  const hourly: number[] = new Array(24).fill(0)
  for (const r of hourRows) {
    if (r.h >= 0 && r.h < 24) hourly[r.h] = r.c
  }
  const peakHour = hourly.indexOf(Math.max(...hourly))
  const minV = Math.min(...hourly.filter(v => v > 0).length ? hourly.filter(v => v > 0) : [0])
  let lowHour = hourly.indexOf(minV)
  if (Math.max(...hourly) === 0) lowHour = 5 // 无数据，默认低谷卯时 5 点

  return {
    themes,
    hourly,
    peakHour,
    lowHour,
    // Phase 2 会由 AI 替换；Phase 1 先放占位文（前端可以显示 "AI 文字待生成"）
    forestNote: undefined,
    peakText: undefined,
    lowText: undefined,
  }
}

/**
 * 读 catalog_star_analyses 表，拼合返回给前端的完整 payload。
 * themehour 表里没存时会即时 SQL 聚合返回（轻量）。
 */
export function readAnalysis(catalogStarId: string | number): CatalogAnalysisFull {
  const row = db
    .prepare(
      `SELECT persona_json, emotion_json, themehour_json, generated_at
       FROM catalog_star_analyses
       WHERE catalog_star_id = ?`
    )
    .get(String(catalogStarId)) as
    | { persona_json: string | null; emotion_json: string | null; themehour_json: string | null; generated_at: number }
    | undefined

  let persona = null
  let emotion = null
  let themehour: ThemeHourPayload | null = null

  if (row?.persona_json) {
    try { persona = JSON.parse(row.persona_json) } catch { persona = null }
  }
  if (row?.emotion_json) {
    try { emotion = JSON.parse(row.emotion_json) } catch { emotion = null }
  }
  if (row?.themehour_json) {
    try { themehour = JSON.parse(row.themehour_json) } catch { themehour = null }
  }
  // themehour 永远不会真的空 —— 用 SQL 聚合即时补（只有 3 段自由文可能缺）
  if (!themehour) themehour = computeThemeHour(catalogStarId)

  const ready = Boolean(persona && emotion && themehour.forestNote && themehour.peakText && themehour.lowText)
  return {
    persona,
    emotion,
    themehour,
    ready,
    generatedAt: row?.generated_at ?? null,
  }
}
