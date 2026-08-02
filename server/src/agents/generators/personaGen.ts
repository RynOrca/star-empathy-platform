/**
 * personaGenerator
 *
 * Phase 2 · 第二步：人格画像
 *
 * 流程：
 *  1. 从 story_catalog_stars + stars + story_kernels 读最多 60 条该星下的用户心事
 *     （按 resonance_count DESC 选，优先选优质内容）
 *  2. 把内容摘要 + 星名 + 星座名喂给 DeepSeek
 *  3. 严格按 PersonaPayload schema 输出 JSON
 *     · constellation 自行构造（前端会覆盖，这里只保留便于排查）
 *     · hanName：四字国风汉名
 *     · mbti：8 类之一（INFP/INFJ/ENFP/ISFP/INTP/ENFJ/ISFJ/ISTP）
 *     · tags：5 个中文 2-4 字标签
 *     · quote：30-50 字金句
 *     · suggestIntro：60-100 字开场白
 *     · paragraphs：两段各 70-120 字解读
 *     · dimensions：4 维，每维左右 + 百分比
 */

import db from '../../db'
import { deepseekChat } from '../../services/deepseek'
import type { PersonaPayload } from '../../types/starAnalysis'

type KernelRow = {
  story_id: number
  title: string
  content: string
  resonance_count: number
  origin: string | null
  themes: string | null
  emotion: string | null
}

const SYSTEM = `你是「星语穹庭」的星语画像师。你根据一颗星下真实的用户心事集合，为它塑造一个有人格、有温度的"星格"。

你的输出必须是严格的 JSON，符合 PersonaPayload schema，无任何前后解释，不要 Markdown 代码块。

字段与硬约束：
- constellation：字符串，恒星名 + 所属星座
- hanName：四字汉名，国风气质（例：望月听风 / 落雪眠云 / 枕河听浪）
- mbti：以下 8 类之一：INFP | INFJ | ENFP | ISFP | INTP | ENFJ | ISFJ | ISTP
- tags：恰好 5 个中文标签，每个 2~4 字，语义不重复
- quote：30~50 字金句，有画面感，类似"它永远为那些在午夜想起故乡的人亮着"
- suggestIntro：60~100 字；像一个朋友在对刚点进星详情的用户轻声介绍这颗星
- paragraphs：恰好 2 段，每段 70~120 字；分别从"它接住了什么情绪"与"它与访客怎么共鸣"切入；段内允许 ≤2 个 <b>/<em> 轻强调
- dimensions：恰好 4 维，每维结构 { left, right, percent, side }
  * left / right：二词对立中文概念（例：内敛 / 外放、念旧 / 向前、独处 / 共鸣、含蓄 / 直白）
  * percent：10~90 之间的整数，不要 50
  * side：'left' 或 'right'，与 percent > 50 的一方对应

风格要点：
- 不要用"数据表明/统计显示"，要把数据感内化进文笔
- 适度留白，别用大词
- 所有段落都是中文，无英文术语
- 不要编造具体故事（不要引用具体用户），只讲整体气质`

function buildUserPrompt(args: {
  starName: string
  constellation: string
  totalStoryCount: number
  samples: KernelRow[]
}): string {
  const { starName, constellation, totalStoryCount, samples } = args
  const sampleLines = samples
    .map((r, i) => {
      const themes = r.themes ? `（主题：${r.themes}）` : ''
      const emo = r.emotion ? `（情绪：${r.emotion}）` : ''
      const c = (r.content || '').replace(/\s+/g, ' ').slice(0, 120)
      const t = r.title ? `《${r.title}》` : ''
      return `${i + 1}. ${t}${themes}${emo}\n   ${c}`
    })
    .join('\n')
  return `
【星情】
星名：${starName}
星座：${constellation}
累计心事：${totalStoryCount} 条

【心事样本】（共 ${samples.length} 条，按共鸣数排序，内容截断至 120 字）
${sampleLines}

请据此输出 PersonaPayload JSON。
`.trim()
}

export function loadStorySamplesForPersona(catalogStarId: string | number, limit = 60): KernelRow[] {
  const stmt = db.prepare(`
    SELECT s.id as story_id, s.title, s.content, s.resonance_count, s.origin,
           k.themes, k.emotion
    FROM story_catalog_stars scs
    JOIN stars s ON s.id = scs.story_id
    LEFT JOIN story_kernels k ON k.story_id = s.id
    WHERE scs.catalog_star_id = ?
    ORDER BY s.resonance_count DESC, s.created_at DESC
    LIMIT ?
  `)
  const rows = stmt.all(catalogStarId, limit) as KernelRow[]
  return rows
}

export function countStarStories(catalogStarId: string | number): number {
  const r = db
    .prepare('SELECT COUNT(*) AS c FROM story_catalog_stars WHERE catalog_star_id = ?')
    .get(catalogStarId) as { c: number }
  return r?.c ?? 0
}

export async function generatePersona(
  catalogStarId: string | number,
  meta: { starName: string; constellation: string },
): Promise<PersonaPayload> {
  const total = countStarStories(catalogStarId)
  const samples = loadStorySamplesForPersona(catalogStarId, 60)
  if (!samples.length) {
    throw new Error(`[personaGen] 星 ${catalogStarId} 无故事样本，无法生成画像`)
  }

  const content = await deepseekChat(
    [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: buildUserPrompt({
          starName: meta.starName || '未命名星',
          constellation: meta.constellation || '未分星座',
          totalStoryCount: total,
          samples,
        }),
      },
    ],
    {
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      temperature: 0.8,
      maxTokens: 1400,
    },
  )

  const json = safeParsePersona(content)
  if (!json) {
    throw new Error(`[personaGen] AI 返回不符合 PersonaPayload: ${content.slice(0, 300)}`)
  }
  // 前端会覆盖 constellation，但至少塞一份可读的进去
  if (!json.constellation) json.constellation = `${meta.starName} · ${meta.constellation}`
  return json
}

// ──────────────────────── 工具函数 ────────────────────────

function safeParsePersona(text: string): PersonaPayload | null {
  let s = text.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence && fence[1]) s = fence[1].trim()
  const l = s.indexOf('{')
  const r = s.lastIndexOf('}')
  if (l >= 0 && r > l) s = s.slice(l, r + 1)
  try {
    const o = JSON.parse(s) as Partial<PersonaPayload>
    if (
      typeof o.hanName === 'string' &&
      typeof o.mbti === 'string' &&
      Array.isArray(o.tags) && o.tags.length >= 3 &&
      typeof o.quote === 'string' &&
      typeof o.suggestIntro === 'string' &&
      Array.isArray(o.paragraphs) && o.paragraphs.length >= 2 &&
      Array.isArray(o.dimensions) && o.dimensions.length >= 4
    ) {
      return {
        constellation: o.constellation || '',
        hanName: o.hanName.slice(0, 6),
        mbti: String(o.mbti).toUpperCase().slice(0, 6),
        tags: (o.tags as string[]).slice(0, 5).map(t => String(t).slice(0, 8)),
        quote: String(o.quote).slice(0, 120),
        suggestIntro: String(o.suggestIntro).slice(0, 160),
        paragraphs: [String(o.paragraphs[0]).slice(0, 220), String(o.paragraphs[1]).slice(0, 220)] as [string, string],
        dimensions: (o.dimensions as Array<Partial<PersonaPayload['dimensions'][0]>>).slice(0, 4).map(d => {
          const pct = clampPct(d.percent)
          return {
            left: String(d.left || '内敛'),
            right: String(d.right || '外放'),
            percent: pct,
            side: (pct > 50 ? 'right' : 'left') as 'left' | 'right',
          } as PersonaPayload['dimensions'][0]
        }) as PersonaPayload['dimensions'],
      }
    }
    return null
  } catch (e) {
    return null
  }
}

function clampPct(n: unknown): number {
  const v = typeof n === 'number' ? n : typeof n === 'string' ? parseInt(n, 10) : 55
  if (Number.isNaN(v) || v <= 10) return 45
  if (v >= 90) return 62
  if (v === 50) return 52
  return Math.round(v)
}
