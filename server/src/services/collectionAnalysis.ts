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
  tone: 'modern' | 'ancient'
}

export type CollectionAnalysisFull = {
  persona: PersonaPayload | null
  emotion: EmotionPayload | null
  nightscape: NightscapePayload | null
  ready: boolean
  generatedAt: number | null
  tone: 'modern' | 'ancient'
}

// ──────────────────────── 5 光谱色（与前端保持一致，不随数据变） ────────────────────────

// ═══════════════════════════════════════════════════════════════
// 内存二级缓存（避免 100+ 故事时每次都 getStoriesLite + hashStories + DB JSON.parse×3）
//  - 命中：<1ms 返回
//  - 失效：合集故事变更时调用 invalidateCollectionAnalysisCache()
// ═══════════════════════════════════════════════════════════════
type MemCacheEntry = {
  storyCount: number
  storyHash: string
  result: CollectionAnalysisFull
  generatedAt: number
}
const memCache = new Map<string, MemCacheEntry>()

/** 主动失效某个合集的分析缓存（合集增删故事后必须调用） */
export function invalidateCollectionAnalysisCache(collectionId: number | string): void {
  memCache.delete(String(collectionId))
}

/** 快速预检：仅拉故事总数（<1ms），不拿内容 */
function quickStoryCount(collectionId: string): number {
  const row = db
    .prepare('SELECT COUNT(*) AS c FROM stars WHERE collection_id = ?')
    .get(collectionId) as { c: number } | undefined
  return row?.c ?? 0
}
const SPECTRUM_PALETTE = ['#ffd98a', '#caa7ff', '#86a8ff', '#9ae6b4', '#ff8b7d']
const METEO_COLORS = { nightTemp: '#86a8ff', wind: '#caa7ff', moon: '#ffd98a', cloud: '#9ae6b4', feel: '#ff8b7d' }

/** 缓存版本号：每次改模板时 bump，让旧缓存全部失效重建 */
const CACHE_VERSION = 'v2'

/** 计算一组故事的稳定 hash：用于判断内容是否变了，v2 含 CACHE_VERSION + type 指纹 */
export function hashStories(stories: Array<{ id: number; content: string; type?: string | null }>): string {
  const sorted = [...stories].sort((a, b) => a.id - b.id)
  const typeSummary = sorted.filter(s => s.type === 'history').length + ':' + sorted.length
  const raw = `${CACHE_VERSION}|${typeSummary}|` +
    sorted.map((s) => `${s.id}:${s.content.length}:${crypto.createHash('md5').update(s.content).digest('hex').slice(0, 8)}`).join('|')
  return crypto.createHash('md5').update(raw).digest('hex')
}

/** 判断合集语气：历史故事 > 50% 则 ancient（诗话/钞本口吻），否则 modern（现代陪伴口吻） */
function detectTone(rows: Array<{ type?: string | null }>): 'modern' | 'ancient' {
  if (!rows.length) return 'modern'
  const historyCount = rows.filter(r => r.type === 'history').length
  return historyCount / rows.length >= 0.5 ? 'ancient' : 'modern'
}

/** 取合集下的故事（精简字段） */
function getStoriesLite(collectionId: number | string): Array<{
  id: number; title: string | null; content: string; type: 'history' | 'user' | string | null;
  origin: string | null; resonanceCount: number; createdAt: string; tag: string | null
}> {
  const rows = db
    .prepare(
      `SELECT id, title, content, type, origin, resonance_count AS resonanceCount, created_at AS createdAt, tag
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
 * 根据故事 tone 分两套文案：
 *   modern（现代用户心事）：保留「当夜观览 · 从X坐到Y」陪伴口吻；
 *   ancient（历史故事诗集）：改用古籍叙录/钞本口吻，不出现现代用户语境。
 */
function buildNightscape(
  collectionId: number | string, rows: any[], hourly: number[], peakHour: number,
  lowHour: number, themes: any[], tone: 'modern' | 'ancient',
): NightscapePayload {
  const totalRes = rows.reduce((acc, r) => acc + (r.resonanceCount ?? 0), 0)
  const avgRes = Math.round(totalRes / Math.max(1, rows.length))
  const topTheme = themes[0]?.name ?? '思念'

  // ── 通用参数（天文数字部分 modern/ancient 共享，只是解释不同） ──
  const seed = (parseInt(String(collectionId), 10) || 0) + rows.length
  const phases = ['残月', '蛾眉月', '上弦月', '盈凸月', '满月', '亏凸月']
  const terms  = ['春分后三', '谷雨前夕', '立夏初', '白露前夜', '霜降一候', '冬至二九']
  const phase = phases[seed % phases.length]
  const term  = terms[(seed >> 1) % terms.length]
  const moonAges = ['26.4', '12.1', '7.3', '3.8', '15.2', '20.6']
  const illumPct = (seed % 100) + ''
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

  // ── 名称库：ancient 用钞本/卷册名；modern 保留原夜雨孤灯等轻文艺名 ──
  const hanSeed = rows.length + (parseInt(String(collectionId), 10) % 997)
  let hanName: string
  let name: string
  let season: string
  let timeSpan: string
  let meteo: NightscapePayload['nightSky']['meteo']

  if (tone === 'ancient') {
    const anNamePool1 = ['遗山', '中州', '剑南', '临川', '亭林', '渔洋', '随园', '惜抱']
    const anNamePool2 = ['诗钞', '乐府', '词旨', '集句', '本事', '韵语', '小稿', '外编']
    hanName = `${anNamePool1[hanSeed % anNamePool1.length]}${anNamePool2[(hanSeed * 3) % anNamePool2.length]}`
    name = `《${hanName}》 · 其卷${['一','二','三','四','五','六'][hanSeed % 6]}`
    const d = (hanSeed * 3) % 28 + 1
    season = `${term} · 太史氏第${(seed % 3) + 1}录 · ${d}宿`
    const startStem = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'][hanSeed % 10]
    const endStem   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][(hanSeed * 5) % 12]
    timeSpan = `${startStem}${toCN(peakHour)} ${d}宿度 · ${endStem}方`
    meteo = [
      { k: '卷帙', v: `凡 ${rows.length} 则 · ${themes.length} 目`, color: SPECTRUM_PALETTE[0] },
      { k: '气格', v: (hanSeed % 2 ? '清远' : '沉郁') + ' · 有唐韵', color: METEO_COLORS.nightTemp },
      { k: '比兴', v: (seed % 3 === 0 ? '托物' : seed % 3 === 1 ? '赋事' : '言情'), color: METEO_COLORS.wind },
      { k: '声律', v: (hanSeed % 2 ? '近体 · 律' : '古体 · 歌'), color: METEO_COLORS.cloud },
      { k: '出处', v: `钞自 ${topTheme === '思念' ? '群贤手翰' : topTheme === '孤独' ? '稗官野纪' : '说部丛钞'}`, color: SPECTRUM_PALETTE[4] },
      { k: '品评', v: '中品 · 可传', color: undefined },
    ]
  } else {
    const namePool1 = ['夜雨', '云边', '江风', '星窗', '灯影', '槐序', '清宵', '残月']
    const namePool2 = ['孤灯', '微语', '剪秋', '晚潮', '青衫', '碎月', '春寒', '听风']
    hanName = `${namePool1[hanSeed % namePool1.length]}${namePool2[(hanSeed * 3) % namePool2.length]}`
    name = `${hanName} · 那一夜`
    season = `${term} · ${toCN(peakHour)}夜第${(seed % 3) + 1}场`
    const startH = (peakHour + 20) % 24
    const endH   = (peakHour + 5) % 24
    timeSpan = `${toCN(startH)}初 ${String(startH).padStart(2,'0')}:${String((seed * 7) % 60).padStart(2,'0')} ~ ${toCN(endH)}初 ${String(endH).padStart(2,'0')}:${String((seed * 11) % 60).padStart(2,'0')}`
    meteo = [
      { k: '时跨', v: `${toCN((peakHour + 20) % 24)}~${toCN((peakHour + 5) % 24)} · ${((peakHour + 5 - (peakHour + 20)) % 24 + 24) % 24} 时`, color: SPECTRUM_PALETTE[0] },
      { k: '夜温', v: `${(10 + (seed % 5)).toFixed(1)}℃ · 凉润`, color: METEO_COLORS.nightTemp },
      { k: '风向', v: (seed % 2 ? '西北' : '东南') + '风 二级', color: METEO_COLORS.wind },
      { k: '能见度', v: '薄云 · 7.2km', color: METEO_COLORS.cloud },
      { k: '云量', v: '散云 · 4/8 量', color: SPECTRUM_PALETTE[4] },
      { k: '体感', v: '夜寒 · 衣稍薄', color: undefined },
    ]
  }

  // hourDots：ancient 改为「韵部/主题出现频次」，modern 保留时辰散点
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
    name,
    season,
    timeSpan,
    phase,
    moonIllum: `${illumPct}%`,
    moonAge: `${moonAges[seed % moonAges.length]} 日龄`,
    term,
    ecliptic: `λ ${termDeg}°${(seed % 60).toString().padStart(2,'0')}′`,
    termDeg,
    meteo,
    hourDots,
  }

  // ── fiveMeteo 五大气象/五门评骘：ancient 换成诗话评骘术语 ──
  const fiveMeteo = tone === 'ancient'
    ? [
        { k: '气格', en: 'Qi · Style',  color: METEO_COLORS.nightTemp },
        { k: '神韵', en: 'Yun · Verve',  color: METEO_COLORS.wind },
        { k: '声律', en: 'Sheng · Tone',  color: METEO_COLORS.moon },
        { k: '比兴', en: 'Xing · Analogy',color: METEO_COLORS.cloud },
        { k: '思致', en: 'Si · Wit',     color: METEO_COLORS.feel },
      ]
    : [
        { k: '夜温', en: 'T · NIGHT',    color: METEO_COLORS.nightTemp },
        { k: '风向', en: 'W · NORTHW',   color: METEO_COLORS.wind },
        { k: '见月', en: 'M · WANING',   color: METEO_COLORS.moon },
        { k: '云量', en: 'C · FOURTH',   color: METEO_COLORS.cloud },
        { k: '体感', en: 'F · CHILL',    color: METEO_COLORS.feel },
      ]

  // ── heroStars：ancient 改为「钞本年代/韵部分布」，时间标签改朝代/作者；modern 保留时辰投递轨迹 ──
  const heroCount = Math.min(8, Math.max(4, rows.length))
  const gids: Array<'Gold'|'Purple'|'Blue'|'Green'> = ['Gold', 'Purple', 'Blue', 'Green']
  const ancientLabels = ['汉', '魏', '晋', '宋', '齐', '梁', '陈', '隋', '唐', '宋', '金', '元']
  const heroStars = Array.from({ length: heroCount }, (_, i) => {
    const progress = i / Math.max(1, heroCount - 1) // 0→1
    const x = 58 + progress * 260  // 58→318
    const yBase = 60 + (Math.sin(progress * Math.PI) * -60)
    const y = Math.max(50, Math.min(200, yBase + ((seed * (i + 1)) % 40)))
    const r = 3.2 + ((i % 3) * 0.9)
    const gid = gids[i % gids.length]
    const fill = SPECTRUM_PALETTE[i % SPECTRUM_PALETTE.length]
    let label: string
    if (tone === 'ancient') {
      // 钞本标识：朝代号
      label = ancientLabels[(hanSeed + i) % ancientLabels.length]
    } else {
      const hh = 20 + Math.floor(progress * 10)
      const mm = ((i * 13) % 60).toString().padStart(2, '0')
      label = `${(hh % 24).toString().padStart(2, '0')}:${mm}`
    }
    return { x, y, r, fill, gid, label }
  })

  // ── heroStats：ancient 改为「卷帙 / 品题 / 选韵 / 采摭」；modern 保留原统计 ──
  const heroStats = tone === 'ancient'
    ? [
        { k: '篇什总数', v: rows.length, sub: '则', color: SPECTRUM_PALETTE[0] },
        { k: '累世品题', v: totalRes, sub: '次', color: SPECTRUM_PALETTE[1] },
        { k: '篇皆珠玉', v: avgRes, sub: '· 品题均', color: SPECTRUM_PALETTE[2] },
        { k: '韵涉', v: `${positivesCount(hourly)}/12`, sub: '部', color: SPECTRUM_PALETTE[3] },
      ]
    : [
        { k: '心事总数', v: rows.length, sub: '则', color: SPECTRUM_PALETTE[0] },
        { k: '累计共鸣', v: totalRes, sub: '次', color: SPECTRUM_PALETTE[1] },
        { k: '平均共鸣', v: avgRes, sub: '则心事', color: SPECTRUM_PALETTE[2] },
        { k: '覆盖时辰', v: `${positivesCount(hourly)}/24`, sub: '段', color: SPECTRUM_PALETTE[3] },
      ]

  // ── storyQuotes：ancient 改作者为「出处/钞自」+ 日期为朝代；modern 保留匿名 + 现代日期 ──
  const ranked = [...rows].sort((a, b) => (b.resonanceCount ?? 0) - (a.resonanceCount ?? 0)).slice(0, 3)
  const illuses: Array<'moon'|'house'|'plant'> = ['moon', 'house', 'plant']
  const ancientAuthors = ['钞本手录 · 佚名', '出《中州集》· 元好问编', '出《万首唐人绝句》· 洪迈辑', '出《瀛奎律髓》· 方回批']
  const ancientDates = ['宋元椠本', '明钞本', '汲古阁藏版', '写本 · 清晖阁题款']
  const modernStarNames = ['α · 雨夜寄北', 'β · 凌晨四点', 'γ · 江边走走']
  const ancientStarNames = ['α · 夜雨寄北', 'β · 西窗剪烛', 'γ · 巴山楚水']
  const storyQuotes = ranked.map((r, i) => {
    const raw = (r.title ? `${r.title} · ` : '') + (r.content ?? '')
    const excerpt = raw.length > 70 ? raw.slice(0, 68) + '…' : raw
    const topThemeColor = themes[i]?.color ?? SPECTRUM_PALETTE[i % SPECTRUM_PALETTE.length]
    const tag = typeof r.tag === 'string' && r.tag ? r.tag.split(/[,，、\s]+/).filter(Boolean).slice(0, 3) : [themes[i]?.name ?? topTheme, tone === 'ancient' ? '钞存' : '心事', tone === 'ancient' ? '手泽' : '夜空']
    const author = tone === 'ancient'
      ? (r.origin ? `出《${r.origin}》` : ancientAuthors[(hanSeed + i) % ancientAuthors.length])
      : '匿名观星者'
    const date = tone === 'ancient'
      ? ancientDates[(hanSeed + i) % ancientDates.length]
      : (r.createdAt ? String(r.createdAt).slice(0, 10) : '2026-08-05')
    const starName = (tone === 'ancient' ? ancientStarNames : modernStarNames)[i] ?? `${['α','β','γ','δ'][i]} · ${topTheme}`
    return {
      rank: (['α','β','γ'])[i] ?? 'δ',
      text: excerpt,
      tags: tag,
      author,
      date,
      illus: illuses[i % illuses.length],
      starName,
      color: topThemeColor,
    }
  })

  // ── 情感洞察 & 主调叙事（5 条 emotion insights + 主调 narrative 三段）━━ tone 切换 ──
  const names = ['思念', '孤独', '释然', '希望', '共鸣']
  const values = calcEmotionWeights(rows, themes)
  const ancientHours = ['雅部 · 宫声', '逸品 · 商音', '冲淡 · 角调', '清远 · 徵音', '沉郁 · 羽声']
  const emotionInsights = names.map((name, i) => {
    const v = values[i]
    const pct = Math.round(v * 100)
    let title: string
    let desc: string
    if (tone === 'ancient') {
      title = `《${hanName}》<span style="font-weight:700;color:var(--c)">第 ${['一','二','三','四','五'][i]} 品</span> · ${ancientHours[i]}`
      const ancientDescs = [
        `${topTheme}一途，最得风人之旨——反复吟咏，如见古人扺掌而谈，纸墨犹带残燈气。`,
        `世远言湮，而此心耿耿不磨——编者读至此，掩卷三叹，不能自己。`,
        `${ancientHours[i]}一转，气格渐平；读者方悟${topTheme}之思，至此始得安顿。`,
        `末幅${ancientHours[i]}，有「曲终人不见，江上数峰青」之致——留空白处，正是古人用心处。`,
        `隔代有知音：后世读者${ancientHours[i]}，忽焉有会，如对古人于灯下。`,
      ]
      desc = ancientDescs[i % ancientDescs.length]
    } else {
      title = `夜色<span style="font-weight:700;color:var(--c)">第 ${['一','二','三','四','五'][i]} 重</span> · ${name}`
      const hours = ['子时末', '丑正二刻', '寅初一刻', '寅正三刻', '卯初初刻']
      const descriptions = [
        `${topTheme}最重的那${hours[i]}，字里行间带着潮湿的呼吸——每一行都是点亮又按灭的灯。`,
        `你一个人坐了很久，什么也没写，但夜空替你把这${hours[i]}记下来了。`,
        `${hours[i]}的风变了方向，从江边吹来，带着${topTheme}的气息——忽然就不那么难过了。`,
        `${hours[i]}东方有一点点淡白，你合上本子，把${topTheme}写在最后一页，留了个空白给自己。`,
        `远处有另一盏灯亮了一下，又暗了——那是陌生人留下的${hours[i]}，像回声。`,
      ]
      desc = descriptions[i % descriptions.length]
    }
    return {
      title,
      pct: `${pct}%`,
      color: SPECTRUM_PALETTE[i],
      desc,
    }
  })
  const dominantIdx = values.indexOf(Math.max(...values))
  const dominant = names[dominantIdx]
  const dominantPct = `${Math.round(values[dominantIdx] * 100)}%`

  // emotionNarrative（主调叙事 3 段）
  let summary: string
  let contrast: string
  let flow: string
  if (tone === 'ancient') {
    summary = `右《${hanName}》一编，都 ${rows.length} 首。钞自 ${themes.length} 集，${term} 节中书于清秘阁——凡例既定，雅郑别白。`
    const ancientContrasts = [
      `「${dominant}」实为此编主脑（${dominantPct}），沉郁深婉，真得风人之遗。而末幅忽开「${['清旷','淡远','微婉'][dominantIdx%3]}」之境——一阖一辟，正是古人章法。`,
      `${dominant}之思，至 ${['子','丑','寅','卯','辰'][dominantIdx]} 韵而极（${dominantPct}）；至 ${['未','申','酉'][dominantIdx%3]} 韵一转，${['释然','希望','共鸣'][dominantIdx%3]} 之趣生焉——正得「怨而不怒」之体。`,
      `读是编者，当于气格高浑处求「${dominant}」（${dominantPct}）；字句间若隐若现，正是金针暗度处。`,
    ]
    contrast = ancientContrasts[dominantIdx % ancientContrasts.length]
    const rhy = ['《韶》','《濩》','《武》','《风》','《雅》','《颂》'][peakHour % 6]
    flow = `以 ${rhy} 韵${peakHour}部为纲领，共绾合 ${hourly[peakHour] > 0 ? hourly[peakHour] : Math.round(rows.length / 2)} 篇为一束；${lowHour} 部间以短调收束——正合「一张一弛」之道。`
  } else {
    summary = `从 ${rows[0]?.createdAt?.slice(0,10) ?? '第一则心事'} 到 ${rows[rows.length-1]?.createdAt?.slice(0,10) ?? '最后一笔'}，共 ${rows.length} 段心事，被 ${term} 的风收进卷里。`
    contrast = `最深的${dominant}在 ${['子','丑','寅','卯','辰'][dominantIdx]} 时最浓（${dominantPct}），天亮前 ${['释然','希望','共鸣'][dominantIdx%3]} 会悄悄出现，像纸页背面的微光。`
    flow = `${peakHour}:00 是你最想写的时刻，共 ${hourly[peakHour]} 段心事。${lowHour}:00 你在休息，但夜空没睡——这也是心事最软的地方。`
  }

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
      summary,
      contrast,
      flow,
    },
    // tone 暴露给前端，用于 UI 切换文案（古代版不出现「投递时间/你坐了多久」）
    tone,
  } as any
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

/** 构建 persona（合集画像）—— 与 star 的 PersonaPayload 同结构，方便前端复用；按 tone 分两套文案 */
function buildPersona(rows: any[], themes: any[], tone: 'modern' | 'ancient'): PersonaPayload {
  const seed = rows.length
  const hanSeed = rows.length
  let hanName: string
  let topTheme: string
  let tags: string[]
  let quote: string
  let suggestIntro: string
  let paraFirst: string
  let paraSecond: string
  let constellation: string
  let mbti: string
  let dims: PersonaPayload['dimensions']

  topTheme = themes[0]?.name ?? (tone === 'ancient' ? '怀远' : '心事')

  if (tone === 'ancient') {
    const anNamePool1 = ['遗山', '中州', '剑南', '临川', '亭林', '渔洋', '随园', '惜抱']
    const anNamePool2 = ['诗钞', '乐府', '词旨', '集句', '本事', '韵语', '小稿', '外编']
    hanName = `${anNamePool1[hanSeed % anNamePool1.length]}${anNamePool2[(hanSeed * 3) % anNamePool2.length]}`
    constellation = `《${hanName}》 · 集录`
    mbti = (['雅正', '清远', '沉郁', '微婉'])[seed % 4]
    tags = themes.slice(0, 5).map((t) => t.name).concat([topTheme, '钞存', '手泽']).slice(0, 5)
    quote = rows[0]?.content?.slice(0, 28) ? `「${rows[0].content.slice(0, 26)}…」` : '诗三百，一言以蔽之，曰「思无邪」。'
    suggestIntro = `右《${hanName}》一集，都 ${rows.length} 首——以「${topTheme}」为纲，别裁伪体，转益多师。`
    paraFirst = `辞不必皆出于一时，而人不必皆居于一地；或登楼以怀远，或对酒而长歌，或夜雨联床，或西窗剪烛——编者披览群籍，钞而存之，俾后世读者，亦可想见其风致于万一。`
    paraSecond = `虽体制不一，而以「${topTheme}」为之贯；或沉郁，或清远，或微婉，或冲淡——要皆出于性情之正，而非苟作也。读者不以人废言，可矣。`
    const d1 = 70 + (seed % 20); const d2 = 75 - (seed % 15); const d3 = 72 + (seed % 15); const d4 = 68 + (seed % 18)
    dims = [
      { left: '沉郁',   right: '清远',   percent: d1, side: d1 >= 50 ? 'left' : 'right' },
      { left: '含蓄',   right: '直露',   percent: d2, side: d2 >= 50 ? 'left' : 'right' },
      { left: '古淡',   right: '秾丽',   percent: d3, side: d3 >= 50 ? 'left' : 'right' },
      { left: '学古',   right: '开新',   percent: d4, side: d4 >= 50 ? 'left' : 'right' },
    ]
  } else {
    // modern 版保留原「轻文艺陪伴」基调，但去掉用户吐槽的「潮湿的呼吸 / 点亮又按灭的灯 / 字缝里仍能看见微光...」套话
    const name1 = ['夜雨', '云边', '江风', '星窗', '灯影', '槐序']
    const name2 = ['孤灯', '微语', '剪秋', '晚潮', '青衫', '碎月']
    hanName = `${name1[seed % name1.length]}${name2[(seed * 3) % name2.length]}`
    constellation = `${hanName} · 合集`
    mbti = (['INFP', 'INFJ', 'ISFP', 'INTP'])[seed % 4]
    tags = themes.slice(0, 5).map((t) => t.name).concat([topTheme, '夜空', '记录']).slice(0, 5)
    quote = rows[0]?.content?.slice(0, 28) ? `「${rows[0].content.slice(0, 26)}…」` : '有些心事，适合说给星星听。'
    suggestIntro = `这卷「${hanName}」共 ${rows.length} 则心事——「${topTheme}」是它们反复出现的主题。`
    paraFirst = `这些故事来自不同的人、不同的夜晚；有的写在灯下，有的写在通勤路上，有的是对着屏幕打了很久又删掉后留下的文字。它们没有共同的作者，却有一种共同的语气：一种不想打扰别人、又希望被轻轻接住的柔软。`
    paraSecond = `读完整卷后会发现，「${topTheme}」并不是它唯一的底色——总有一些转折和出口藏在里面：一次散步、一通电话、清晨的第一缕光、陌生人留下的一句话。它们不是被治愈了，而是被好好地看见了。`
    dims = [
      { left: '内向',   right: '外向',   percent: 70 + (seed % 20), side: 'left' },
      { left: '感性',   right: '理性',   percent: 75 - (seed % 15), side: 'left' },
      { left: '独处',   right: '喧闹',   percent: 82,                 side: 'left' },
      { left: '怀旧',   right: '向前',   percent: 64,                 side: 'left' },
    ]
  }
  return {
    constellation,
    hanName,
    mbti,
    tags,
    quote,
    suggestIntro,
    paragraphs: [paraFirst, paraSecond],
    dimensions: dims,
  }
}

/** 构建 emotion（合集情感）—— 与 StarDetail 的 EmotionPayload 同结构；按 tone 分两套文案 */
function buildEmotion(rows: any[], themes: any[], tone: 'modern' | 'ancient'): EmotionPayload {
  const names: ['思念', '孤独', '释然', '希望', '共鸣'] = ['思念', '孤独', '释然', '希望', '共鸣']
  const weights = calcEmotionWeights(rows, themes)
  const emotions: EmotionPayload['emotions'] = [
    { name: names[0], value: weights[0], color: SPECTRUM_PALETTE[0] },
    { name: names[1], value: weights[1], color: SPECTRUM_PALETTE[1] },
    { name: names[2], value: weights[2], color: SPECTRUM_PALETTE[2] },
    { name: names[3], value: weights[3], color: SPECTRUM_PALETTE[3] },
    { name: names[4], value: weights[4], color: SPECTRUM_PALETTE[4] },
  ]
  const topTheme = themes[0]?.name ?? (tone === 'ancient' ? '怀远' : '夜色')
  const top3Stories = rows.slice(0, 3).concat([null, null, null]).slice(0, 3) as (any | null)[]
  const pct0 = `${Math.round(weights[0] * 100 / Math.max(0.01, weights.reduce((a, b) => a + b, 0)))}%`
  const pct1 = `${Math.round(weights[1] * 100 / Math.max(0.01, weights.reduce((a, b) => a + b, 0)))}%`
  const pctRest = `${Math.round((weights[2] + weights[3] + weights[4]) * 100 / Math.max(0.01, weights.reduce((a, b) => a + b, 0)))}%`
  let insights: EmotionPayload['insights']
  if (tone === 'ancient') {
    insights = [
      { title: '主脑', pct: pct0, color: SPECTRUM_PALETTE[0],
        desc: `是编以「${names[0]}」为之主（${pct0}）——或托物起兴，或因事抒怀，皆出于性情之真，非为文造情者可比。` },
      { title: '根柢', pct: pct1, color: SPECTRUM_PALETTE[1],
        desc: `「${names[1]}」是诸篇之根柢——非曰愁苦，乃古人所谓「宁静以致远」之境。读者当于无字句处求之。` },
      { title: '归趣', pct: pctRest, color: '#95f0c0',
        desc: `「${names[2]}」「${names[3]}」「${names[4]}」三篇，为全编收束处——由郁而舒，由聚而散，正得「温柔敦厚」之教。` },
    ]
  } else {
    insights = [
      { title: '夜读时刻', pct: pct0, color: SPECTRUM_PALETTE[0],
        desc: `最浓的情绪是「${names[0]}」（${pct0}），它和「${topTheme}」一起，是整本合集被提到最多的词。` },
      { title: '柔软底色', pct: pct1, color: SPECTRUM_PALETTE[1],
        desc: `「${names[1]}」（${pct1}）是这卷星笺的底色——它不是负面的，而是一种愿意和自己慢慢相处的体贴。` },
      { title: '出口微光', pct: pctRest, color: '#95f0c0',
        desc: `「${names[2]}」「${names[3]}」「${names[4]}」加起来（${pctRest}）构成了合集的另一半：它不是"好起来了"，而是被看见之后，自然就有的柔软出口。` },
    ]
  }

  const ancientQuoteAuthors = ['钞本手录 · 佚名', '《中州集》· 元好问编', '《万首唐人绝句》· 洪迈辑', '《瀛奎律髓》· 方回批']
  const ancientQuoteDates = ['宋元椠本', '明钞本', '汲古阁藏版', '写本 · 清晖阁题款']
  const modernQuoteAuthors = ['@未署名 · 江风路', '@未署名 · 槐树下', '@未署名 · 末班车上']
  const quotes: EmotionPayload['quotes'] = top3Stories.map((r, i) => {
    const baseText = r?.content?.slice(0, 18) ? r.content.slice(0, 18) + '…' : null
    let text: string
    if (baseText) text = baseText
    else if (tone === 'ancient')
      text = ['思君如满月，夜夜减清辉。', '还将两行泪，遥寄海西头。', '桃李春风一杯酒，江湖夜雨十年灯。'][i]
    else
      text = ['有些心事只能说给星星听', '天亮之后，把昨夜留给昨夜', '每一盏灯，都有它想等的人'][i]
    return {
      text,
      color: [SPECTRUM_PALETTE[0], SPECTRUM_PALETTE[4], SPECTRUM_PALETTE[3]][i],
      tags: (r?.tags ?? [themes[i]?.name ?? (tone === 'ancient' ? '风人' : '夜'), themes[i + 1]?.name ?? (tone === 'ancient' ? '手泽' : '光')]).slice(0, 2),
      author: tone === 'ancient'
        ? (r?.origin ? `出《${r.origin}》` : ancientQuoteAuthors[i % ancientQuoteAuthors.length])
        : (r?.location ? `@匿名 · ${r.location}` : modernQuoteAuthors[i % modernQuoteAuthors.length]),
      date: tone === 'ancient'
        ? ancientQuoteDates[i % ancientQuoteDates.length]
        : (r?.createdAt ? relativeDate(r.createdAt) : ['3 天前', '昨天', '刚刚'][i]),
      illus: (['moon', 'house', 'sakura'] as const)[i],
    }
  }) as EmotionPayload['quotes']
  return { emotions, insights, quotes }
}

/** 读 collection_analyses 表；没存过 → 立即合成一份 Phase 1 完整数据返回 ready=true，并写缓存 */
export function readCollectionAnalysis(collectionId: number | string): CollectionAnalysisFull {
  const id = String(collectionId)

  // Step 0: 内存缓存 + 快速 COUNT 预检（省掉拉 143 条故事 + hash）
  const memEntry = memCache.get(id)
  if (memEntry) {
    const currentCount = quickStoryCount(id)
    if (currentCount === memEntry.storyCount) {
      return memEntry.result  // <1ms 返回，无需任何计算
    } else {
      // 故事数量变了 → 失效内存缓存
      memCache.delete(id)
    }
  }

  // Step 1: 才需要拉完整故事 & 算 hash（冷启动/失效后才做）
  const rows = getStoriesLite(collectionId)
  const storyCount = rows.length
  const storyHash = hashStories(rows)
  const tone = detectTone(rows)

  const dbRow = db
    .prepare(
      `SELECT persona_json, emotion_json, nightscape_json, generated_at, story_count AS sc, story_hash AS sh
       FROM collection_analyses WHERE collection_id = ?`
    )
    .get(id) as
    | { persona_json: string | null; emotion_json: string | null; nightscape_json: string | null; generated_at: number; sc: number; sh: string | null }
    | undefined

  // Step 2: DB 缓存命中且 hash/storyCount 一致 → 直接返回
  if (dbRow && dbRow.persona_json && dbRow.emotion_json && dbRow.nightscape_json
      && dbRow.sc === storyCount && dbRow.sh && dbRow.sh === storyHash) {
    try {
      const pr = JSON.parse(dbRow.persona_json)
      const er = JSON.parse(dbRow.emotion_json)
      const ns = JSON.parse(dbRow.nightscape_json)
      const result: CollectionAnalysisFull = {
        persona: pr,
        emotion: er,
        nightscape: ns,
        ready: true,
        generatedAt: dbRow.generated_at,
        tone: ns?.tone ?? tone,
      }
      // 写入内存缓存（下次 Step 0 直接命中）
      memCache.set(id, { storyCount, storyHash, result, generatedAt: dbRow.generated_at })
      return result
    } catch {
      // parse 失败 → 往下走重新生成
    }
  }

  // Step 3: 没命中 / hash 变 → 合成 Phase 1 数据并写缓存（下次命中直接返回）
  const { hourly, peakHour, lowHour, themes } = computeHourlyAndThemes(rows)
  const persona    = buildPersona(rows, themes, tone)
  const emotion    = buildEmotion(rows, themes, tone)
  const nightscape = buildNightscape(collectionId, rows, hourly, peakHour, lowHour, themes, tone)
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

  const result: CollectionAnalysisFull = {
    persona,
    emotion,
    nightscape,
    ready: true,
    generatedAt,
    tone,
  }
  // 冷生成后也要写入内存缓存
  memCache.set(id, { storyCount, storyHash, result, generatedAt })
  return result
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
