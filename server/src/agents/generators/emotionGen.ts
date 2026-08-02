/**
 * emotionGenerator
 *
 * Phase 2 · 第三步：情绪雷达 + 摘录
 *
 * 设计原则：能 SQL 算的绝不交给 AI，让 AI 只干它最值钱的"解读"。
 *
 *  1. 5 个情绪维度 name + value（0~1）：
 *     · 5 个名字固定在「思念/孤独/希望/释然/共鸣」里选，保证前端 radar 对齐
 *     · value：用 SQL 近似打分（resonance_count + themes 命中情绪词汇的频次）归一化
 *     · color：直接给固定 palette
 *  2. 3 个 StoryQuote：
 *     · 从该星前 N 条故事里直接选 3 条高共鸣内容
 *     · text 用内容前 8-20 字；tags 取 kernel 的 themes 前 2 个；author 匿名化 @星人· 城市/地区；date 相对时间；illus 四选一轮转
 *  3. 3 个 EmotionInsight：
 *     · 标题 + 百分比 + 颜色 + 70~120 字解读 → 交给 AI 写（它最擅长）
 */

import db from '../../db'
import { deepseekChat } from '../../services/deepseek'
import type { EmotionPayload, EmotionPoint, EmotionInsight, StoryQuote } from '../../types/starAnalysis'

// 5 个固定情绪（前后端 radar 图一致）
const EMOTION_PALETTE: Record<string, string> = {
  思念: '#ffb463',
  孤独: '#86a8ff',
  希望: '#ffd98a',
  释然: '#8fe0c8',
  共鸣: '#ff8bb8',
}
const EMOTION_NAMES: Array<EmotionPoint['name']> = ['思念', '孤独', '希望', '释然', '共鸣']

// AI 写 insight 时知道每个情绪的"关键词家族"，它自行判断命中
const EMOTION_KEYWORDS: Record<string, string[]> = {
  思念: ['故乡', '家', '爸妈', '父母', '奶奶', '爷爷', '外婆', '外公', '家乡', '老家', '思念', '想念', '团圆', '中秋', '春节', '归', '回家', '故人'],
  孤独: ['一个人', '独自', '孤独', '孤单', '夜晚', '失眠', '难过', '委屈', '没人', '空荡', '漂泊', '异乡', '一个人走', '加班到深夜'],
  希望: ['希望', '未来', '毕业', '开始', '成长', '努力', '坚持', '明天', '相信', '加油', '想做', '梦想', '一定会', '值得'],
  释然: ['放下', '算了', '释怀', '终于', '释然', '没关系', '接受', '时间', '过去了', '平淡', '平静', '还好', '会好的'],
  共鸣: ['感同身受', '也是', '同样', '一起', '我们', '彼此', '有人', '理解', '陪伴', '温暖', '共鸣', '被看见', '治愈'],
}

type KernelEmoRow = {
  story_id: number
  title: string | null
  content: string | null
  resonance_count: number
  origin: string | null
  location: string | null
  created_at: string | null
  themes: string | null // JSON string array
  emotion: string | null
}

// ──────────────────────── SQL 层 ────────────────────────

function loadKernelRows(catalogStarId: string | number, limit = 100): KernelEmoRow[] {
  const stmt = db.prepare(`
    SELECT s.id as story_id, s.title, s.content, s.resonance_count, s.origin,
           CASE WHEN s.location IS NOT NULL AND s.location != '' THEN s.location ELSE s.origin END AS location,
           s.created_at,
           k.themes, k.emotion
    FROM story_catalog_stars scs
    JOIN stars s ON s.id = scs.story_id
    LEFT JOIN story_kernels k ON k.story_id = s.id
    WHERE scs.catalog_star_id = ?
    ORDER BY s.resonance_count DESC, s.created_at DESC
    LIMIT ?
  `)
  return stmt.all(catalogStarId, limit) as KernelEmoRow[]
}

/**
 * 用关键词命中 + resonance_count 加权，算 5 个情绪 0~1 的分
 * scores 未归一化，返回 {思念: x, 孤独: x, ...}
 */
function computeEmotionScores(rows: KernelEmoRow[]): Record<string, number> {
  const raw: Record<string, number> = { 思念: 0, 孤独: 0, 希望: 0, 释然: 0, 共鸣: 0 }
  if (!rows.length) return raw
  for (const r of rows) {
    const text = `${r.title ?? ''} ${r.content ?? ''} ${r.themes ?? ''} ${r.emotion ?? ''}`
    const weight = 1 + Math.log2(1 + (r.resonance_count || 0))
    for (const name of EMOTION_NAMES) {
      const kws = EMOTION_KEYWORDS[name] || []
      let hits = 0
      for (const kw of kws) if (text.includes(kw)) hits++
      raw[name] += hits * weight
    }
  }
  // 归一化到 [0.18, 0.95]，避免全 0 或全 1
  const max = Math.max(...Object.values(raw), 0.0001)
  const out: Record<string, number> = {}
  for (const name of EMOTION_NAMES) {
    const r = raw[name] / max
    out[name] = Math.max(0.18, Math.min(0.95, 0.2 + r * 0.75))
  }
  return out
}

/**
 * 从 stories 里挑 3 条最佳摘录，映射到 StoryQuote。
 * 保证不返回同一条。
 */
function pickStoryQuotes(rows: KernelEmoRow[]): [StoryQuote, StoryQuote, StoryQuote] {
  const fallback = (i: number): StoryQuote => ({
    text: ['月光下的心事', '未寄出的那封信', '抬头的那一刻'][i] || '星语点滴',
    color: ['#ffb463', '#86a8ff', '#caa7ff'][i] || '#8fe0c8',
    tags: [['思念', '深夜'], ['孤独', '释然'], ['希望', '共鸣']][i] || ['星语', '随笔'],
    author: '@星人 · 夜空',
    date: '此刻',
    illus: (['sakura', 'moon', 'house'] as const)[i] || 'moon',
  })
  if (!rows.length) return [fallback(0), fallback(1), fallback(2)]
  const picked: KernelEmoRow[] = []
  for (const r of rows) {
    if ((r.content || '').trim().length >= 4) picked.push(r)
    if (picked.length >= 3) break
  }
  while (picked.length < 3) picked.push(rows[picked.length % rows.length])

  const result: StoryQuote[] = picked.slice(0, 3).map((r, i) => {
    const content = (r.content || '').trim().replace(/\s+/g, ' ')
    const text = clip(content, 8, 20)
    let themes: string[] = []
    try {
      if (r.themes) {
        const t = JSON.parse(r.themes) as unknown
        if (Array.isArray(t)) themes = t.map(String).slice(0, 2)
      }
    } catch { /* ignore */ }
    if (themes.length < 2) themes = [['思念', '深夜'], ['孤独', '释然'], ['希望', '共鸣']][i] || ['星语', '随笔']
    let loc = r.location?.trim() || null
    if (!loc && r.origin) loc = r.origin
    if (!loc) loc = '夜空'
    const illusList = ['sakura', 'moon', 'house'] as const
    return {
      text,
      color: ['#ffb463', '#86a8ff', '#caa7ff'][i] || '#8fe0c8',
      tags: themes.slice(0, 2) as [string, string],
      author: `@星人 · ${loc.slice(0, 10)}`,
      date: relativeDate(r.created_at || undefined),
      illus: illusList[i % illusList.length],
    }
  })
  return result as [StoryQuote, StoryQuote, StoryQuote]
}

// ──────────────────────── AI 层：3 条 insights ────────────────────────

const INSIGHT_SYSTEM = `你是「星语穹庭」的情绪分析师。你的任务是为一颗星下的真实用户心事，写 3 条情绪洞察（EmotionInsight）。

输出要求：严格 JSON，对象结构为 { insights: [ {title, pct, color, desc}, ... ] }，无任何前后解释，不要 Markdown 代码块。

洞察字段要求：
- title：4-8 字中文，像栏目名（例：<b>思乡者的共鸣</b> 可以，但不要多余标签；最多 1 个 <b>）
- pct：形如 "42.6%"，30~85 之间，保留 1 位小数；3 条之间相差至少 3%
- color：6 位 hex 色，带 #，选以下 5 色之一：#ffb463（思念-橙）/ #86a8ff（孤独-蓝）/ #ffd98a（希望-金）/ #8fe0c8（释然-绿）/ #ff8bb8（共鸣-粉）
- desc：70~120 字中文，1 段，语气是"观星笔记"，克制、温柔、含蓄
  * 不要出现"数据/统计/显示"，把比例感自然嵌入描述
  * 每条洞察应绑定一个主要情绪（5 类之一），对应 color 与 pct
  * 允许极轻量的 <b>/<em> 强调（每条 ≤1 个），但不是必须

请确保三条洞察分别覆盖不同情绪维度（至少覆盖 3 种不同的 color）。`

function buildInsightPrompt(args: {
  starName: string
  constellation: string
  emotionScores: Record<string, number>
  samples: KernelEmoRow[]
}): string {
  const { starName, constellation, emotionScores, samples } = args
  const scoreLines = EMOTION_NAMES.map(n => `- ${n}：${emotionScores[n].toFixed(3)}`).join('\n')
  const snippets = samples.slice(0, 15).map((r, i) => {
    const c = (r.content || '').replace(/\s+/g, ' ').slice(0, 80)
    return `${i + 1}.（共鸣 ${r.resonance_count ?? 0}）${c}`
  }).join('\n')
  return `
【星情】
星名：${starName}
星座：${constellation}
心事样本数：${samples.length}

【5 情绪归一化得分（0.18-0.95，越高越突出）】
${scoreLines}

【心事片段】（共鸣数排序，内容截断到 80 字）
${snippets}

请输出 3 条情绪洞察 JSON（insights 数组）。`.trim()
}

async function generateInsights(
  meta: { starName: string; constellation: string },
  emotionScores: Record<string, number>,
  samples: KernelEmoRow[],
): Promise<[EmotionInsight, EmotionInsight, EmotionInsight]> {
  const content = await deepseekChat(
    [
      { role: 'system', content: INSIGHT_SYSTEM },
      { role: 'user', content: buildInsightPrompt({ starName: meta.starName, constellation: meta.constellation, emotionScores, samples }) },
    ],
    {
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      temperature: 0.7,
      maxTokens: 900,
    },
  )
  const parsed = safeParseInsights(content)
  if (parsed) return parsed
  throw new Error(`[emotionGen] insights JSON 解析失败: ${content.slice(0, 300)}`)
}

// ──────────────────────── 对外总入口 ────────────────────────

export async function generateEmotion(
  catalogStarId: string | number,
  meta: { starName: string; constellation: string },
): Promise<EmotionPayload> {
  const rows = loadKernelRows(catalogStarId, 100)
  if (!rows.length) {
    throw new Error(`[emotionGen] 星 ${catalogStarId} 无故事，无法生成情绪`)
  }
  const scores = computeEmotionScores(rows)
  const emotions: EmotionPayload['emotions'] = EMOTION_NAMES.map(name => ({
    name,
    value: Math.round(scores[name] * 100) / 100,
    color: EMOTION_PALETTE[name],
  })) as EmotionPayload['emotions']

  const quotes = pickStoryQuotes(rows)
  const insights = await generateInsights(meta, scores, rows)
  return { emotions, insights, quotes }
}

// ──────────────────────── 工具函数 ────────────────────────

function clip(s: string, _min: number, max: number): string {
  if (s.length <= max) return s
  // 尝试在句读处截断
  const tail = s.slice(0, max)
  const puncs = ['。', '，', '；', '？', '！', '、', ' ']
  let best = max
  for (const p of puncs) {
    const idx = tail.lastIndexOf(p)
    if (idx >= max * 0.75 && idx < best) best = idx + 1
  }
  const cut = s.slice(0, best === max ? best : best)
  return cut + (cut.length < s.length ? '…' : '')
}

function relativeDate(created?: string): string {
  if (!created) return '很久以前'
  const d = new Date(created)
  if (Number.isNaN(d.getTime())) return '此刻'
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} 天前`
  if (diff < 86400 * 365) return `${Math.floor(diff / 86400 / 30)} 个月前`
  return `${Math.floor(diff / 86400 / 365)} 年前`
}

function safeParseInsights(text: string): [EmotionInsight, EmotionInsight, EmotionInsight] | null {
  let s = text.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence && fence[1]) s = fence[1].trim()
  const l = s.indexOf('{')
  const r = s.lastIndexOf('}')
  if (l >= 0 && r > l) s = s.slice(l, r + 1)
  try {
    const o = JSON.parse(s) as { insights?: Partial<EmotionInsight>[] }
    const arr = (Array.isArray(o.insights) ? o.insights : (Array.isArray(o) ? o : [])) as Partial<EmotionInsight>[]
    if (arr.length < 3) return null
    const fixed = arr.slice(0, 3).map((x, i): EmotionInsight => ({
      title: String(x.title ?? `情绪洞察 ${i + 1}`).slice(0, 24),
      pct: /^\d{1,3}(\.\d)?%$/.test(String(x.pct ?? '')) ? String(x.pct) : `${(45 + i * 11).toFixed(1)}%`,
      color: /^#[0-9a-fA-F]{6}$/.test(String(x.color ?? '')) ? String(x.color) : Object.values(EMOTION_PALETTE)[i % 5],
      desc: String(x.desc ?? '这颗星默默接住了很多深夜的叹息。').slice(0, 160),
    }))
    return fixed as [EmotionInsight, EmotionInsight, EmotionInsight]
  } catch {
    return null
  }
}
