/**
 * 月相 AI 解读服务
 *
 * 调用 DeepSeek 生成基于当前月相+农历+节气的诗句与注解。
 *
 * 设计要点：
 *   - 后端不缓存（缓存由前端 localStorage 7 天 + 喜好 hash 双重校验实现）
 *   - AI 未配置或失败时返回 { insight: null, source: 'fallback' }，前端降级显示诗词区
 *   - 接受 userPreferences 参数，用于生成个性化诗句
 *   - source 字段：'ai' 表示 AI 成功生成，'fallback' 表示降级
 *     前端依据 source === 'ai' 决定是否写 localStorage 缓存
 */

import { deepseekChat, getApiKey } from './deepseek'

export interface MoonInsight {
  /** 诗句 */
  poem: string
  /** 诗句注解 */
  note: string
}

export interface UserPreferencesInput {
  emotionalTags: string[]
  themes: string[]
  storyCount: number
}

interface GenerateOptions {
  phaseLabel: string
  lunarDay: string
  jieQi: string | null
  season: string
  altitude: number | null
  azimuth: number | null
  daysToFullMoon: number | null
  userPreferences: UserPreferencesInput | null
}

/**
 * 构建个性化 prompt
 *
 * - 无喜好或喜好为空：基础 prompt（月相+农历+节气+季节+位置）
 * - 有喜好：附加情绪/主题标签，引导 AI 生成与用户情感共振的诗句
 */
function buildPrompt(opts: GenerateOptions): { system: string; user: string } {
  const { phaseLabel, lunarDay, jieQi, season, altitude, azimuth, daysToFullMoon, userPreferences } = opts

  const system = `你是星空平台的月相诗人，根据月相信息生成一首诗与简短注解。

诗体自由：可以是中文古典诗（五七言、词牌）、现代诗、俳句、波斯鲁拜、西方自由诗等任意体裁，每次随机选择一种，体现多元文化对月相的诗意共鸣。

输出严格 JSON 格式，不要 markdown 代码块。`

  const lines: string[] = [
    '当前月相信息：',
    `- 相位：${phaseLabel}`,
    `- 农历日：${lunarDay}`,
    `- 节气：${jieQi ?? '无'}`,
    `- 季节：${season}`,
    `- 月球高度：${altitude != null ? altitude.toFixed(0) + '°' : '未知'}`,
    `- 方位角：${azimuth != null ? azimuth.toFixed(0) + '°' : '未知'}`,
    `- 距下次满月：${daysToFullMoon != null ? daysToFullMoon + ' 天' : '未知'}`,
  ]

  // 个性化提示（已登录用户且有故事内核）
  if (userPreferences && userPreferences.storyCount > 0) {
    const emotions = userPreferences.emotionalTags.slice(0, 5)
    const themes = userPreferences.themes.slice(0, 5)
    if (emotions.length > 0 || themes.length > 0) {
      lines.push(
        '',
        '用户情感画像（基于其投递的故事聚合）：',
        `- 情绪底色：${emotions.join('、') || '未知'}`,
        `- 主题偏好：${themes.join('、') || '未知'}`,
        '请在诗句中呼应上述情感与主题，让用户产生共鸣。',
      )
    }
  }

  lines.push(
    '',
    '请输出 JSON（不要 markdown 代码块）：',
    '{',
    '  "poem": "一首短诗（2-8 行），诗体自由，可中文或任意语言原文+中文译文，匹配当前相位与季节，体现月相的天文特征",',
    '  "note": "30-80字注解，说明诗意与月相天文特征的关联"',
    '}',
  )

  return { system, user: lines.join('\n') }
}

/**
 * 生成月相 AI 解读
 *
 * 流程：
 *   1. 检查 API Key → 未配置返回 fallback
 *   2. 调用 DeepSeek → 失败返回 fallback
 *   3. 解析 JSON → 失败返回 fallback
 */
export async function getMoonInsight(opts: GenerateOptions): Promise<{
  insight: MoonInsight | null
  source: 'ai' | 'fallback'
}> {
  // 1. AI 未配置时降级
  if (!getApiKey()) {
    return { insight: null, source: 'fallback' }
  }

  // 2. 调用 AI 生成
  try {
    const { system, user } = buildPrompt(opts)
    const content = await deepseekChat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.85, maxTokens: 8000 },
    )

    // 提取 JSON（兼容 markdown 代码块包裹）
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[moonInsight] AI 返回内容无 JSON:', content.slice(0, 200))
      return { insight: null, source: 'fallback' }
    }

    const insight = JSON.parse(jsonMatch[0]) as MoonInsight

    // 字段校验
    if (!insight.poem || !insight.note) {
      console.error('[moonInsight] AI 返回 JSON 字段缺失:', jsonMatch[0].slice(0, 200))
      return { insight: null, source: 'fallback' }
    }

    return { insight, source: 'ai' }
  } catch (e) {
    console.error('[moonInsight] AI 生成失败', e)
    return { insight: null, source: 'fallback' }
  }
}
