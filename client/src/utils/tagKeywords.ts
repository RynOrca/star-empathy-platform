/**
 * 词云标签提取 — 基于 n-gram 频率 + 主题词加权
 * 无依赖，纯字符串运算；支持中文（无分词）。
 */

export interface TagCloudItem {
  text: string
  weight: number
}

// ── 停用字符（高频虚词/介词/量词，在 n-gram 中几乎不贡献语义）──
const STOP_CHARS = new Set(
  '的了了一是在有和也都不而但个之上中为人到会以可这那年那来又她对里后很就把当从让给向出还得去要对能如着过及与将把被或因很最更只其与所在那这'.split('')
)

// ── 主题词别名（变体 → 规范词，起别名折叠 + 语义归一）──
const ALIASES: Record<string, string> = {
  // 天象
  织女: '织女星', 牛郎: '牛郎星', 天狼: '天狼星', 北斗: '北斗七星',
  银河: '银河', 天河: '银河', 银汉: '银河',
  // 月亮
  明月: '月亮', 玉盘: '月亮', 婵娟: '月亮', 嫦娥: '月亮', 广寒: '月亮',
  素娥: '月亮', 玉兔: '月亮',
  // 情感
  相思: '思念', 眷恋: '思念', 怀念: '思念',
  别离: '离别', 离别: '离别', 分离: '离别', 分隔: '离别',
  独酌: '孤独', 孤: '孤独',
  家乡: '故乡', 家园: '故乡', 故土: '故乡',
  // 时间
  岁月: '岁月', 光阴: '光阴', 年华: '年华',
}

// ── 高信号主题词（出现即 ×1.5 奖励，帮助真正的意象从噪声中浮现）──
const THEME_BOOST = new Set([
  '月亮', '星星', '星辰', '银河', '星空', '夜空', '织女星', '牛郎星',
  '北斗七星', '天狼星', '参宿', '心宿',
  '思念', '离别', '孤独', '故乡', '思乡', '等待', '守候',
  '岁月', '光阴', '流年', '人生',
  '清风', '明月', '落花', '流水',
  '天涯', '海角', '重逢',
  '梦想', '希望', '惆怅', '忧伤',
  '永恒', '传说', '神话',
])

// ── 权重参数 ──
const HISTORY_MULTIPLIER = 1.5   // 历史故事权重
const USER_MULTIPLIER = 1.0
const TITLE_BOOST = 3.0          // 标题出现 = 3× 正文出现
const RESONANCE_DIVISOR = 5      // ln(1+res) / 5
const THEME_BONUS = 1.5
const MAX_TAGS = 12
const MIN_RATIO = 0.12           // 低于峰值 12% 的丢弃

// ── 字体映射参数（传给调用方）──
export const FONT_MIN = 0.70  // rem
export const FONT_MAX = 1.25  // rem

// ════════════════════════════════════════
function normalize(raw: string): string {
  return raw.replace(/[，。、！？：；""''（）《》【】…—\-—\sA-Za-z0-9·]+/g, '')
}

function isStopGram(gram: string): boolean {
  const chars = [...gram]
  if (chars.every((c) => STOP_CHARS.has(c))) return true
  if (STOP_CHARS.has(chars[0]) || STOP_CHARS.has(chars[chars.length - 1])) return true
  return false
}

/** 从一段文本中提取 n-gram 到计数器 */
function extractGrams(text: string, out: Map<string, number>): void {
  const chars = [...normalize(text)]
  if (chars.length < 2) return
  for (const n of [2, 3, 4]) {
    for (let i = 0; i + n <= chars.length; i++) {
      const gram = chars.slice(i, i + n).join('')
      if (isStopGram(gram)) continue
      const label = ALIASES[gram] ?? gram
      const bonus = THEME_BOOST.has(label) ? THEME_BONUS : 1.0
      out.set(label, (out.get(label) ?? 0) + bonus)
    }
  }
}

function pickTop(map: Map<string, number>, n = MAX_TAGS): TagCloudItem[] {
  const sorted = [...map.entries()]
    .map(([text, weight]) => ({ text, weight }))
    .sort((a, b) => b.weight - a.weight)
  if (sorted.length === 0) return []
  const peak = sorted[0].weight
  const floor = peak * MIN_RATIO
  return sorted.filter((it) => it.weight >= floor).slice(0, n)
}

export interface TagStoryInput {
  id: number
  title: string | null
  content: string
  type: string
  resonanceCount: number
}

/** 主入口：从一组故事生成加权标签云 */
export function buildTagCloud(stories: TagStoryInput[]): TagCloudItem[] {
  const global = new Map<string, number>()
  const real = stories.filter((s) => s.id > 0)

  for (const s of real) {
    const body = new Map<string, number>()
    extractGrams(s.content, body)

    const title = new Map<string, number>()
    if (s.title) extractGrams(s.title, title)

    const typeMul = s.type === 'history' ? HISTORY_MULTIPLIER : USER_MULTIPLIER
    const resonance = 1 + Math.log(1 + (s.resonanceCount ?? 0)) / RESONANCE_DIVISOR

    const allKeys = new Set([...body.keys(), ...title.keys()])
    for (const word of allKeys) {
      const bodyCount = body.get(word) ?? 0
      const titleCount = title.get(word) ?? 0
      // 标题额外 ×(TITLE_BOOST - 1)（body 已算过一次）
      const weighted =
        (bodyCount + titleCount * (TITLE_BOOST - 1)) * typeMul * resonance
      global.set(word, (global.get(word) ?? 0) + weighted)
    }
  }

  return pickTop(global)
}

/** 计算某个标签的字体 rem（调用方传入当前最大/最小 weight）── */
export function fontSize(weight: number, minW: number, maxW: number): number {
  if (maxW <= minW) return (FONT_MIN + FONT_MAX) / 2
  const t = (weight - minW) / (maxW - minW)
  return FONT_MIN + t * (FONT_MAX - FONT_MIN)
}
