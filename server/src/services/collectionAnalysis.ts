/**
 * collectionAnalysisService
 *
 * 合集级 AI 分析服务。
 *
 * 三档能力（从上到下，可平滑升级）：
 *   Phase 1（当前默认）：纯 SQL 聚合 + 确定性假数据，所有字段 ready=true，前端立即可用
 *   Phase 2：懒触发 server/src/agents 下的 generator（复用/改造 personaGen/emotionGen
 *            接收 stories[] 而非 catalog_star_id），写回表 + ready=false 轮询
 *   Phase 3：完整 agent pipeline（天空意象/夜色流转/心事轨迹五大气象 都是模型生成）
 *
 * 前端无论哪档都走同一接口 GET /api/collections/:id/analysis + { ready, persona, emotion, nightscape }
 */

import crypto from 'node:crypto'
import db from '../db'
import { getStoriesByCollectionId } from './starService'
import type { PersonaPayload, EmotionPayload } from '../types/starAnalysis'

// ───────────────────── 合集 Nightscape（合集专属：夜色流转+心事轨迹+五大气象+天窗片段+Hero统计） ──────────────────────
export type NightscapePayload = {
  nightSky: {
    phase: string
    moonAge: string
    moonIllum: string
    term: string
    meteo: Array<{ k: string; v: string; color?: string }>
  }
  fiveMeteo: Array<{ k: string; en: string; color: string }>
  heroStars: Array<{
    x: number; y: number; r: number; fill: string
    gid: 'Gold' | 'Purple' | 'Blue' | 'Green'
    label?: string
  }>
  heroStats: Array<{ k: string; v: number | string; sub: string; color: string }>
  storyQuotes: Array<{
    rank: string; text: string; tags: string[]; author: string; date: string
    illus: 'moon' | 'house' | 'plant'; starName: string; color: string
  }>
  hourly: number[]
  peakHour: number
  lowHour: number
  emotionNarrative: {
    dominant: string; dominantPct: string
    summary: string; contrast: string; flow: string
  }
  emotionInsights: Array<{
    title: string; pct: string; color: string; desc: string
  }>
}

export type CollectionAnalysisFull = {
  persona: PersonaPayload | null
  emotion: EmotionPayload | null
  nightscape: NightscapePayload | null
  ready: boolean
  generatedAt: number | null
}

// ──────────────────────── 5 光谱色（与前端保持一致，不随数据变） ────────────────────────
const SPECTRUM_PALETTE = ['#ffd98a', '#caa7ff', '#86a8ff', '#9ae6b4', '#ff8b7d']
const METEO_COLORS = { nightTemp: '#86a8ff', wind: '#caa7ff', moon: '#ffd98a', cloud: '#9ae6b4', feel: '#ff8b7d' }

/** 计算一组故事的稳定 hash：用于判断内容是否变了，与 catalog_star_analyses.story_hash 对齐 */
export function hashStories(stories: Array<{ id: number; content: string }>): string {
  const sorted = [...stories].sort((a, b) => a.id - b.id)
  const raw = sorted.map((s) => `${s.id}:${s.content.length}:${crypto.createHash('md5').update(s.content).digest('hex').slice(0, 8)}`).join('|')
  return crypto.createHash('md5').update(raw).digest('hex')
}

/** 取合集下的故事（精简字段） */
function getStoriesLite(collectionId: number | string): Array<{
  id: number; title: string | null; content: string
  resonanceCount: number; createdAt: string; tag: string | null
}> {
  const rows = db
    .prepare(
      `SELECT id, title, content, resonance_count AS resonanceCount, created_at AS createdAt, tag
       FROM stars WHERE collection_id = ? ORDER BY created_at ASC`
    )
    .all(String(collectionId)) as any[]
  return rows
}

/** 轻量 SQL 聚合：时辰分布（UTC+8） + Top 情绪（按 resonance + tag 关键词启发） */
function computeHourlyAndThemes(rows: any[]) {
  const hourly = new Array(24).fill(0)
  const themeCounter = new Map<string, number>()

  for (const r of rows) {
    // 24h 计数（UTC+8）
    try {
      const h = db
        .prepare(`SELECT cast(strftime('%H', datetime(?, '+8 hours')) AS INTEGER) AS h`)
        .get(r.createdAt) as { h: number }
      if (h && h.h >= 0 && h.h < 24) hourly[h.h] += 1
    } catch { /* ignore */ }
    // tag 启发式主题聚合
    if (typeof r.tag === 'string' && r.tag.trim()) {
      const parts = r.tag.split(/[,，、\s]+/).map((t: string) => t.trim()).filter(Boolean)
      for (const p of parts) {
        const norm = p.length > 10 ? p.slice(0, 8) : p
        themeCounter.set(norm, (themeCounter.get(norm) ?? 0) + Math.max(1, r.resonanceCount))
      }
    }
    // content 关键词抽（简单启发：前 4 个两字中文高频，忽略标点 & 常用词）
    if (typeof r.content === 'string') {
      const stop = new Set(['的', '了', '是', '我', '你', '他', '她', '在', '也', '和', '就', '都', '还', '没', '不', '有', '一', '会', '这', '那'])
      const tokens = r.content.match(/[\u4e00-\u9fa5]{2,4}/g) ?? []
      for (const t of tokens.slice(0, 12)) {
        if (stop.has(t) || /^[一二三四五六七八九十]+$/.test(t)) continue
        themeCounter.set(t, (themeCounter.get(t) ?? 0) + 1)
      }
    }
  }

  const peak = hourly.indexOf(Math.max(...hourly))
  const positives = hourly.filter((v) => v > 0)
  const low = positives.length ? hourly.indexOf(Math.min(...positives)) : 5

  const themes = [...themeCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count], i) => ({ name, count, color: SPECTRUM_PALETTE[i % SPECTRUM_PALETTE.length] }))

  return { hourly, peakHour: peak, lowHour: low, themes }
}

/**
 * 生成夜观手记的 nightscape（合集独有）。
 * 当前 Phase 1 确定性生成，不接模型，保证 ready=true。
 */
function buildNightscape(collectionId: number | string, rows: any[], hourly: number[], peakHour: number, lowHour: number, themes: any[]): NightscapePayload {
  const totalRes = rows.reduce((acc, r) => acc + (r.resonanceCount ?? 0), 0)
  const avgRes = Math.round(totalRes / Math.max(1, rows.length))
  const topTheme = themes[0]?.name ?? '思念'

  // ── nightSky：月相 / 节气 / 气象五维 ──
  const seed = (parseInt(String(collectionId), 10) || 0) + rows.length
  const phases = ['残月', '蛾眉月', '上弦月', '盈凸月', '满月', '亏凸月']
  const terms  = ['春分后三', '谷雨前夕', '立夏初', '白露前夜', '霜降一候', '冬至二九']
  const phase = phases[seed % phases.length]
  const term  = terms[(seed >> 1) % terms.length]
  // 时辰对应月亮年龄 / 亮度
  const moonAges = ['26.4', '12.1', '7.3', '3.8', '15.2', '20.6']
  const illumPct = (seed % 100) + ''

  // 根据 peakHour 计算一个合理的 timeSpan（子初 ~ 卯初 的表达）
  const startH = (peakHour + 20) % 24
  const endH   = (peakHour + 5) % 24
  const toCN = (h: number) => {
    if (h === 23 || h === 0) return '子'
    if (h >= 1  && h <= 2)  return '丑'
    if (h >= 3  && h <= 4)  return '寅'
    if (h >= 5  && h <= 6)  return '卯'
    if (h >= 7  && h <= 8)  return '辰'
    if (h >= 9  && h <= 10) return '巳'
    if (h >= 11 && h <= 12) return '午'
    if (h >= 13 && h <= 14) return '未'
    if (h >= 15 && h <= 16) return '申'
    if (h >= 17 && h <= 18) return '酉'
    if (h >= 19 && h <= 20) return '戌'
    return '亥'
  }
  const termDeg = 3 + ((seed * 7) % 27)
  const hanSeed = rows.length + (parseInt(String(collectionId), 10) % 997)
  const namePool1 = ['夜雨', '云边', '江风', '星窗', '灯影', '槐序', '清宵', '残月']
  const namePool2 = ['孤灯', '微语', '剪秋', '晚潮', '青衫', '碎月', '春寒', '听风']
  const hanName = `${namePool1[hanSeed % namePool1.length]}${namePool2[(hanSeed * 3) % namePool2.length]}`

  // hourDots：按 hourly 非零小时数生成散点
  const nonZeroHours: number[] = hourly
    .map((v, h) => ({ v, h }))
    .filter(x => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 8)
    .map(x => x.h)
  const hourDots = nonZeroHours.length > 0
    ? nonZeroHours.map((h, i) => {
        const pos = Math.round(((h + 2) % 24) / 24 * 100)
        const size = 6 + Math.min(6, Math.round(hourly[h] / Math.max(1, hourly[peakHour]) * 6))
        const color = SPECTRUM_PALETTE[i % SPECTRUM_PALETTE.length]
        return { pos, size, color }
      })
    : [
        { pos: 10,  size: 12, color: SPECTRUM_PALETTE[0] },
        { pos: 38,  size: 10, color: SPECTRUM_PALETTE[3] },
        { pos: 66,  size: 7,  color: SPECTRUM_PALETTE[1] },
        { pos: 88,  size: 4,  color: SPECTRUM_PALETTE[2] },
      ]

  const nightSky = {
    name: `${hanName} · 那一夜`,
    season: `${term} · ${toCN(peakHour)}夜第${(seed % 3) + 1}场`,
    timeSpan: `${toCN(startH)}初 ${String(startH).padStart(2,'0')}:${String((seed * 7) % 60).padStart(2,'0')} ~ ${toCN(endH)}初 ${String(endH).padStart(2,'0')}:${String((seed * 11) % 60).padStart(2,'0')}`,
    phase,
    moonIllum: `${illumPct}%`,
    moonAge: `${moonAges[seed % moonAges.length]} 日龄`,
    term,
    ecliptic: `λ ${termDeg}°${(seed % 60).toString().padStart(2,'0')}′`,
    termDeg,
    meteo: [
      { k: '时跨', v: `${toCN(startH)}~${toCN(endH)} · ${endH - startH & 12} 时`, color: SPECTRUM_PALETTE[0] },
      { k: '夜温', v: `${(10 + (seed % 5)).toFixed(1)}℃ · 凉润`, color: METEO_COLORS.nightTemp },
      { k: '风向', v: (seed % 2 ? '西北' : '东南') + '风 二级', color: METEO_COLORS.wind },
      { k: '能见度', v: '薄云 · 7.2km', color: METEO_COLORS.cloud },
      { k: '云量', v: '散云 · 4/8 量', color: SPECTRUM_PALETTE[4] },
      { k: '体感', v: '夜寒 · 衣稍薄', color: undefined },
    ],
    hourDots,
  }
  const fiveMeteo = [
    { k: '夜温', en: 'T · NIGHT',    color: METEO_COLORS.nightTemp },
    { k: '风向', en: 'W · NORTHW',   color: METEO_COLORS.wind },
    { k: '见月', en: 'M · WANING',   color: METEO_COLORS.moon },
    { k: '云量', en: 'C · FOURTH',   color: METEO_COLORS.cloud },
    { k: '体感', en: 'F · CHILL',    color: METEO_COLORS.feel },
  ]

  // ── heroStars：心事投递时间轨迹散点（按 stories 数生成 4~8 个，均匀落在时间轴 20:00→06:00） ──
  const heroCount = Math.min(8, Math.max(4, rows.length))
  const gids: Array<'Gold'|'Purple'|'Blue'|'Green'> = ['Gold', 'Purple', 'Blue', 'Green']
  const heroStars = Array.from({ length: heroCount }, (_, i) => {
    const progress = i / Math.max(1, heroCount - 1) // 0→1
    const x = 58 + progress * 260  // 58→318（20:00 到 04:00）
    const yBase = 60 + (Math.sin(progress * Math.PI) * -60) // 曲线上下波动
    const y = Math.max(50, Math.min(200, yBase + ((seed * (i + 1)) % 40)))
    const r = 3.2 + ((i % 3) * 0.9)
    const gid = gids[i % gids.length]
    const fill = SPECTRUM_PALETTE[i % SPECTRUM_PALETTE.length]
    // 时间标签：20:00 ~ 06:00
    const hh = 20 + Math.floor(progress * 10)
    const mm = ((i * 13) % 60).toString().padStart(2, '0')
    const label = `${(hh % 24).toString().padStart(2, '0')}:${mm}`
    return { x, y, r, fill, gid, label }
  })

  // ── heroStats：合集真实统计 ──
  const heroStats = [
    { k: '心事总数', v: rows.length, sub: '则', color: SPECTRUM_PALETTE[0] },
    { k: '累计共鸣', v: totalRes, sub: '次', color: SPECTRUM_PALETTE[1] },
    { k: '平均共鸣', v: avgRes, sub: '则心事', color: SPECTRUM_PALETTE[2] },
    { k: '覆盖时辰', v: `${positivesCount(hourly)}/24`, sub: '段', color: SPECTRUM_PALETTE[3] },
  ]

  // ── storyQuotes：天窗片段（取 Top 3 共鸣最高的故事，抽 40~70 字摘录） ──
  const ranked = [...rows].sort((a, b) => (b.resonanceCount ?? 0) - (a.resonanceCount ?? 0)).slice(0, 3)
  const illuses: Array<'moon'|'house'|'plant'> = ['moon', 'house', 'plant']
  const storyQuotes = ranked.map((r, i) => {
    const raw = (r.title ? `${r.title} · ` : '') + (r.content ?? '')
    const excerpt = raw.length > 70 ? raw.slice(0, 68) + '…' : raw
    const topThemeColor = themes[i]?.color ?? SPECTRUM_PALETTE[i % SPECTRUM_PALETTE.length]
    const tag = typeof r.tag === 'string' && r.tag ? r.tag.split(/[,，、\s]+/).filter(Boolean).slice(0, 3) : [themes[i]?.name ?? topTheme, '心事', '夜空']
    const dateStr = r.createdAt ? String(r.createdAt).slice(0, 10) : '2026-08-05'
    const starName = (['α · 雨夜寄北', 'β · 凌晨四点', 'γ · 江边走走'])[i] ?? `${['α','β','γ','δ'][i]} · ${topTheme}`
    return {
      rank: (['α','β','γ'])[i] ?? 'δ',
      text: excerpt,
      tags: tag,
      author: '匿名观星者',
      date: dateStr,
      illus: illuses[i % illuses.length],
      starName,
      color: topThemeColor,
    }
  })

  // ── 情感洞察 & 主调叙事（5 条 emotion insights，对应 5 球；主调叙事三段） ──
  const names = ['思念', '孤独', '释然', '希望', '共鸣']
  const values = calcEmotionWeights(rows, themes)
  const emotionInsights = names.map((name, i) => {
    const v = values[i]
    const pct = Math.round(v * 100)
    const title = `夜色<span style="font-weight:700;color:var(--c)">第 ${['一','二','三','四','五'][i]} 重</span> · ${name}`
    const hours = ['子时末', '丑正二刻', '寅初一刻', '寅正三刻', '卯初初刻']
    const descriptions = [
      `${topTheme}最重的那${hours[i]}，字里行间带着潮湿的呼吸——每一行都是点亮又按灭的灯。`,
      `你一个人坐了很久，什么也没写，但夜空替你把这${hours[i]}记下来了。`,
      `${hours[i]}的风变了方向，从江边吹来，带着${topTheme}的气息——忽然就不那么难过了。`,
      `${hours[i]}东方有一点点淡白，你合上本子，把${topTheme}写在最后一页，留了个空白给自己。`,
      `远处有另一盏灯亮了一下，又暗了——那是陌生人留下的${hours[i]}，像回声。`,
    ]
    return {
      title,
      pct: `${pct}%`,
      color: SPECTRUM_PALETTE[i],
      desc: descriptions[i % descriptions.length],
    }
  })
  const dominantIdx = values.indexOf(Math.max(...values))
  const dominant = names[dominantIdx]
  const dominantPct = `${Math.round(values[dominantIdx] * 100)}%`

  return {
    nightSky,
    fiveMeteo,
    heroStars,
    heroStats,
    storyQuotes,
    hourly,
    peakHour,
    lowHour,
    emotionInsights,
    emotionNarrative: {
      dominant,
      dominantPct,
      summary: `从 ${rows[0]?.createdAt?.slice(0,10) ?? '第一则心事'} 到 ${rows[rows.length-1]?.createdAt?.slice(0,10) ?? '最后一笔'}，共 ${rows.length} 段心事，被 ${term} 的风收进卷里。`,
      contrast: `最深的${dominant}在 ${['子','丑','寅','卯','辰'][dominantIdx]} 时最浓（${dominantPct}），天亮前 ${['释然','希望','共鸣'][dominantIdx%3]} 会悄悄出现，像纸页背面的微光。`,
      flow: `${peakHour}:00 是你最想写的时刻，共 ${hourly[peakHour]} 段心事。${lowHour}:00 你在休息，但夜空没睡——这也是心事最软的地方。`,
    },
  }
}
function positivesCount(arr: number[]) { return arr.filter(v => v > 0).length }

/** 5 情绪权重（0~1，总和 =1）：简单按 主题/词频 + 共鸣启发 */
function calcEmotionWeights(rows: any[], themes: any[]): number[] {
  // 思念 / 孤独 / 释然 / 希望 / 共鸣
  const base = [0.32, 0.26, 0.16, 0.14, 0.12]
  const themeBoost = new Map<string, number>()
  const kwBoosts = [
    ['思念', 0], ['故乡', 0], ['回家', 0], ['想', 0], // 思念
    ['孤独', 1], ['一个人', 1], ['深夜', 1], ['独处', 1], ['失眠', 1], // 孤独
    ['释然', 2], ['放下', 2], ['风', 2], ['走了', 2], // 释然
    ['希望', 3], ['明天', 3], ['光', 3], ['向前', 3], // 希望
    ['共鸣', 4], ['有人', 4], ['陌生', 4], ['回声', 4], // 共鸣
  ]
  for (const [kw, idx] of kwBoosts as Array<[string, number]>) themeBoost.set(kw, idx)
  // themes 命中
  for (const t of themes) {
    const idx = themeBoost.get(t.name)
    if (typeof idx === 'number') base[idx] += 0.05 * Math.min(6, t.count)
  }
  // 按 tag 命中加
  for (const r of rows) {
    const tag = (r.tag ?? '') + ' ' + (r.content?.slice(0, 400) ?? '')
    for (const [kw, idx] of kwBoosts as Array<[string, number]>) {
      if (tag.includes(kw)) base[idx] += 0.015 * (1 + (r.resonanceCount ?? 0) * 0.02)
    }
  }
  // 归一到 [0,1]，总和 ≈ 1
  const sum = base.reduce((a, b) => a + b, 1e-9)
  return base.map((v) => Math.max(0.05, Math.min(0.9, v / sum)))
}

/** 相对日期工具：created ISO 时间戳 → "3 天前" 等中文文案（本地 copy 相对日期，避免跨模块相对日期工具 */
function relativeDate(created?: number | string | null): string {
  if (!created) return '很久以前'
  const d = typeof created === 'number' ? new Date(created) : new Date(created)
  if (Number.isNaN(d.getTime())) return '此刻'
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} 天前`
  if (diff < 86400 * 365) return `${Math.floor(diff / 86400 / 30)} 个月前`
  return `${Math.floor(diff / 86400 / 365)} 年前`
}

/** 构建 persona（合集画像）—— 与 star 的 PersonaPayload 同结构，方便前端复用 */
function buildPersona(rows: any[], themes: any[]): PersonaPayload {
  const name1 = ['夜雨', '云边', '江风', '星窗', '灯影', '槐序']
  const name2 = ['孤灯', '微语', '剪秋', '晚潮', '青衫', '碎月']
  const seed = rows.length
  const hanName = `${name1[seed % name1.length]}${name2[(seed * 3) % name2.length]}`
  const topTheme = themes[0]?.name ?? '心事'
  const tags = themes.slice(0, 5).map((t) => t.name).concat([topTheme, '夜空', '记录']).slice(0, 5)
  const quote = rows[0]?.content?.slice(0, 28) ? `「${rows[0].content.slice(0, 26)}…」` : '每一盏孤灯，都是夜里不肯睡的人。'
  const suggestIntro = `这卷${hanName}共收着 ${rows.length} 则心事——${topTheme}是它们共同的底色。`
  const paraFirst = `它们总在夜里被写下：从第一盏灯亮起来开始，字里行间带着潮湿的呼吸。有的写给远方的人，有的写给回不去的某个夜晚。每一则都是点亮又按灭的灯，独自亮了很久，才被收进这卷笺里。`
  const paraSecond = `虽然底色里有${topTheme}，但并非完全沉寂——从字缝里仍能看见微光：风过江面、清晨的第一缕阳光、陌生人留下的一句话。它们像卷轴上的金粉，被轻轻一拂，就亮了起来。`
  const dims: PersonaPayload['dimensions'] = [
    { left: '内向',   right: '外向',   percent: 70 + (seed % 20), side: 'left' },
    { left: '感性',   right: '理性',   percent: 75 - (seed % 15), side: 'left' },
    { left: '独处',   right: '喧闹',   percent: 82,                 side: 'left' },
    { left: '怀旧',   right: '向前',   percent: 64,                 side: 'left' },
  ]
  return {
    constellation: `${hanName} · 合集`,
    hanName,
    mbti: (['INFP', 'INFJ', 'ISFP', 'INTP'])[seed % 4],
    tags,
    quote,
    suggestIntro,
    paragraphs: [paraFirst, paraSecond],
    dimensions: dims,
  }
}

/** 构建 emotion（合集情感）—— 与 StarDetail 的 EmotionPayload 同结构 */
function buildEmotion(rows: any[], themes: any[]): EmotionPayload {
  const names: ['思念', '孤独', '释然', '希望', '共鸣'] = ['思念', '孤独', '释然', '希望', '共鸣']
  const weights = calcEmotionWeights(rows, themes)
  const emotions: EmotionPayload['emotions'] = [
    { name: names[0], value: weights[0], color: SPECTRUM_PALETTE[0] },
    { name: names[1], value: weights[1], color: SPECTRUM_PALETTE[1] },
    { name: names[2], value: weights[2], color: SPECTRUM_PALETTE[2] },
    { name: names[3], value: weights[3], color: SPECTRUM_PALETTE[3] },
    { name: names[4], value: weights[4], color: SPECTRUM_PALETTE[4] },
  ]
  const topTheme = themes[0]?.name ?? '夜色'
  const top3Stories = rows.slice(0, 3).concat([null, null, null]).slice(0, 3) as (any | null)[]
  const insights: EmotionPayload['insights'] = [
    { title: '夜读时刻', pct: `${Math.round(weights[0] * 100 / Math.max(0.01, weights.reduce((a, b) => a + b, 0)))}%`,
      color: SPECTRUM_PALETTE[0],
      desc: `最浓的情绪是「${names[0]}」——总在夜深时涌上来。你习惯把最软的部分留给${topTheme}，在别人入睡后才开始写这些心事。` },
    { title: '温柔底色', pct: `${Math.round(weights[1] * 100 / Math.max(0.01, weights.reduce((a, b) => a + b, 0)))}%`,
      color: SPECTRUM_PALETTE[1],
      desc: `「${names[1]}」是这卷星笺的底色——它不是悲凉，而是一种慢慢和自己相处的方式，藏着不愿打扰别人的体贴。` },
    { title: '微光出口', pct: `${Math.round((weights[2] + weights[3] + weights[4]) * 100 / Math.max(0.01, weights.reduce((a, b) => a + b, 0)))}%`,
      color: '#95f0c0',
      desc: `「${names[2]}」「${names[3]}」「${names[4]}」拼出了另一面——即使夜色再沉，你仍愿意抬头看看月亮，相信风过之后天亮会来。` },
  ]
  const quotes: EmotionPayload['quotes'] = top3Stories.map((r, i) => ({
    text: r?.content?.slice(0, 18) ? r.content.slice(0, 18) + '…'
         : ['每一盏孤灯都是夜里不肯睡的人', '有些心事只能说给星星听', '天亮之后，把昨夜留给昨夜'][i],
    color: [SPECTRUM_PALETTE[0], SPECTRUM_PALETTE[4], SPECTRUM_PALETTE[3]][i],
    tags: (r?.tags ?? [themes[i]?.name ?? '夜', themes[i + 1]?.name ?? '光']).slice(0, 2),
    author: r?.location ? `@匿名 · ${r.location}` : ['@未署名 · 江风路', '@未署名 · 槐树下', '@未署名 · 末班车上'][i],
    date: r?.createdAt ? relativeDate(r.createdAt) : ['3 天前', '昨天', '刚刚'][i],
    illus: (['moon', 'house', 'sakura'] as const)[i],
  })) as EmotionPayload['quotes']
  return { emotions, insights, quotes }
}

/** 读 collection_analyses 表；没存过 → 立即合成一份 Phase 1 完整数据返回 ready=true，并写缓存 */
export function readCollectionAnalysis(collectionId: number | string): CollectionAnalysisFull {
  const id = String(collectionId)

  // 先拿故事 & 算 hash，无论缓存命中否都用来校验
  const rows = getStoriesLite(collectionId)
  const storyCount = rows.length
  const storyHash = hashStories(rows)

  const dbRow = db
    .prepare(
      `SELECT persona_json, emotion_json, nightscape_json, generated_at, story_count AS sc, story_hash AS sh
       FROM collection_analyses WHERE collection_id = ?`
    )
    .get(id) as
    | { persona_json: string | null; emotion_json: string | null; nightscape_json: string | null; generated_at: number; sc: number; sh: string | null }
    | undefined

  // 缓存命中且 hash/storyCount 一致 → 直接返回
  if (dbRow && dbRow.persona_json && dbRow.emotion_json && dbRow.nightscape_json
      && dbRow.sc === storyCount && (!dbRow.sh || dbRow.sh === storyHash)) {
    try {
      return {
        persona: JSON.parse(dbRow.persona_json),
        emotion: JSON.parse(dbRow.emotion_json),
        nightscape: JSON.parse(dbRow.nightscape_json),
        ready: true,
        generatedAt: dbRow.generated_at,
      }
    } catch {
      // parse 失败 → 往下走重新生成
    }
  }

  // 没命中 / hash 变 → 合成 Phase 1 数据并写缓存（下次命中直接返回）
  const { hourly, peakHour, lowHour, themes } = computeHourlyAndThemes(rows)
  const persona    = buildPersona(rows, themes)
  const emotion    = buildEmotion(rows, themes)
  const nightscape = buildNightscape(collectionId, rows, hourly, peakHour, lowHour, themes)
  const generatedAt = Date.now()

  try {
    db.prepare(
      `INSERT INTO collection_analyses
         (collection_id, persona_json, emotion_json, nightscape_json, story_count, story_hash, generated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(collection_id) DO UPDATE SET
         persona_json = excluded.persona_json,
         emotion_json = excluded.emotion_json,
         nightscape_json = excluded.nightscape_json,
         story_count = excluded.story_count,
         story_hash  = excluded.story_hash,
         generated_at = excluded.generated_at`
    ).run(
      id,
      JSON.stringify(persona),
      JSON.stringify(emotion),
      JSON.stringify(nightscape),
      storyCount,
      storyHash,
      generatedAt,
    )
  } catch (e) {
    // 写缓存失败不影响返回
    console.warn('[collectionAnalysis] upsert cache failed:', (e as any)?.message)
  }

  return {
    persona,
    emotion,
    nightscape,
    ready: true,
    generatedAt,
  }
}

/** 懒触发生成（Phase 2 预留：接真实 agent pipeline）
 *  当前 Phase 1 没什么事要做，readCollectionAnalysis 已返回 ready=true。
 *  Phase 2 可在此：检查 ready=false → 启动异步任务调用 collectionAnalysisAgent → 写回表。
 */
export function triggerAnalysisIfNeeded(_collectionId: number | string): void {
  // TODO(Phase 2): 接 agents/collectionAnalysisAgent 走 DeepSeek
}

// 把未使用的 import 警告压掉
void getStoriesByCollectionId
