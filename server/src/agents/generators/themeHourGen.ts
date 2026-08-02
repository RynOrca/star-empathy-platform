/**
 * themeHourGenerator
 *
 * Phase 2 · 第一步：最轻量的 AI 生成
 * - 真实 themes/hourly/peak/low 已在 computeThemeHour 中 SQL 聚合好（永远准确）
 * - AI 只负责写 3 段自由文：forestNote / peakText / lowText
 *   * forestNote：90-120 字，观察这颗星最突出的主题与第二主题的呼应
 *   * peakText：  70-100 字，描述 peakHour（通常是子时）的情感浓度
 *   * lowText：   70-100 字，描述 lowHour （通常是卯时）的静谧与转机
 *
 * 设计决策：
 * - 让 AI 只写文，不参与数值计算；因此每次生成都稳定、便宜、失败易重试
 * - 输出严格 JSON，schema: { forestNote, peakText, lowText }
 */

import { deepseekChat } from '../../services/deepseek'
import { computeThemeHour } from '../../services/starAnalysis'

export type ThemeHourTexts = {
  forestNote: string
  peakText: string
  lowText: string
}

const SYSTEM = `你是「星语穹庭」的星图观察家，擅长把真实的用户心事聚合数据翻译成有人味的星空观察。

你的任务：根据真实的 8 主题分布与 24 小时投递曲线，写三段感性但克制的自由文。
必须严格遵守输出格式：
- 只返回一个 JSON 对象，无任何前后解释
- 键名固定：forestNote / peakText / lowText
- 不使用 Markdown，不包代码块
- 不要虚构故事数据；只围绕给定的数据说话

风格：
- 像一个温柔的观星笔记作者，语气克制、含蓄、有画面感
- 禁止"数据显示/统计表明"这类词汇，要自然嵌入
- 每段 1~2 句，段落内可用 <b>…</b> 或 <em>…</em> 做轻量强调（≤2 个标签/段）
- 允许引用古诗句里的意境（不必写出处），但整篇要现代中文

字数硬约束：
- forestNote：90~120 字
- peakText： 70~100 字
- lowText：  70~100 字`

function buildUserPrompt(args: {
  starName: string
  constellation: string
  themes: Array<{ name: string; count: number; color: string }>
  totalStory: number
  peakHour: number
  peakCount: number
  lowHour: number
  lowCount: number
  hourly: number[]
}): string {
  const { starName, constellation, themes, totalStory, peakHour, peakCount, lowHour, lowCount, hourly } = args
  const topThemes = themes.slice(0, 4).map(t => `- ${t.name}：${t.count} 条`).join('\n')
  const hourlyStr = hourly.map((v, h) => `  ${String(h).padStart(2, '0')}h: ${v}`).join('\n')
  return `
【观察对象】
恒星：${starName}（${constellation}）
累计心事数：${totalStory} 条

【主题 Top4（归一化后真实计数）】
${topThemes}
其余 ${Math.max(0, themes.length - 4)} 个主题分布较均匀。

【24h 投递曲线（UTC+8，每条真实计数）】
${hourlyStr}

高峰：${peakHour} 点，共 ${peakCount} 条
低谷：${lowHour} 点，共 ${lowCount} 条

请按要求输出 JSON。
`.trim()
}

/**
 * 仅返回 3 段文；真实 themes/hourly 等在外层与 computeThemeHour 的结果合并。
 *
 * @throws 当 API 未配置 / JSON 解析失败时抛错（上层捕获写 fallback）
 */
export async function generateThemeHourTexts(
  catalogStarId: string | number,
  meta: { starName: string; constellation: string },
): Promise<ThemeHourTexts> {
  const th = await computeThemeHour(String(catalogStarId))
  if (!th) {
    throw new Error(`[themeHourGen] computeThemeHour 返回空 catalog=${catalogStarId}`)
  }
  const totalStory = th.themes.reduce((a, b) => a + b.count, 0) || 0

  const content = await deepseekChat(
    [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: buildUserPrompt({
          starName: meta.starName || '未命名星',
          constellation: meta.constellation || '未分星座',
          themes: th.themes,
          totalStory,
          peakHour: th.peakHour,
          peakCount: th.hourly[th.peakHour] || 0,
          lowHour: th.lowHour,
          lowCount: th.hourly[th.lowHour] || 0,
          hourly: th.hourly,
        }),
      },
    ],
    {
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      temperature: 0.7,
      maxTokens: 700,
    },
  )

  const json = safeParseJson(content)
  if (!json) {
    throw new Error(`[themeHourGen] AI 返回不是合法 JSON: ${content.slice(0, 200)}`)
  }

  return {
    forestNote: trimWithLength(json.forestNote, 90, 120),
    peakText: trimWithLength(json.peakText, 70, 100),
    lowText: trimWithLength(json.lowText, 70, 100),
  }
}

// ──────────────────────── 工具函数 ────────────────────────

function safeParseJson(text: string): ThemeHourTexts | null {
  let s = text.trim()
  // 去掉 ```json ... ``` 包裹
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence && fence[1]) s = fence[1].trim()
  // 取首尾大括号之间的内容（容错 AI 加了解释）
  const l = s.indexOf('{')
  const r = s.lastIndexOf('}')
  if (l >= 0 && r > l) s = s.slice(l, r + 1)
  try {
    const obj = JSON.parse(s) as Partial<ThemeHourTexts>
    if (typeof obj.forestNote === 'string' && typeof obj.peakText === 'string' && typeof obj.lowText === 'string') {
      return obj as ThemeHourTexts
    }
    return null
  } catch {
    return null
  }
}

/** 轻量长度合规（超过就截断在 句号/逗号 后 + 省略号；过短就补一句自然的收尾） */
function trimWithLength(src: unknown, min: number, max: number): string {
  let s = typeof src === 'string' ? src.trim() : ''
  if (!s) return '—'
  if (s.length > max) {
    // 从 max 处往前找最近的句读
    const tail = s.slice(0, max)
    const puncIdx = Math.max(
      tail.lastIndexOf('。'),
      tail.lastIndexOf('，'),
      tail.lastIndexOf('；'),
      tail.lastIndexOf('、'),
    )
    const cut = puncIdx >= max * 0.7 ? puncIdx + 1 : max
    s = tail.slice(0, cut) + '…'
  } else if (s.length < min) {
    // 太短就补一句
    s = s + ' 这一点光，正落在它专属的坐标里，不动声色地接住每一次抬头。'
    if (s.length > max) s = s.slice(0, max) + '…'
  }
  return s
}
