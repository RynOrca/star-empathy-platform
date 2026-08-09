/**
 * 一次性修复：catalog_star_analyses.persona_json 中被 AI 中断截断的段落
 * （以冒号/逗号等不完整标点结尾，或过短），替换为可读内容：
 *   段落不足 → 依次兜底：有效叙事段 → 金句 quote → 通用兜底文案
 * 命令：npm run fix:persona-truncated
 */

import db from '../src/db'

const FALLBACK: [string, string] = [
  '这颗星接住了最多那些来不及说出口的话——关于告别、关于年少、关于某个再也回不去的夏夜。人们在它的光里放下重量，也在它的光里重新看见自己。',
  '仰望它的人，往往能在心事里找到与自己同频的那一束。它不会替你做决定，但会陪你在夜里坐一会儿，让银河替你把话慢慢说。',
]

/** 与 personaGen.isValidParagraph 保持一致：非空、>=10 字、不以不完整标点结尾 */
function isValidParagraph(text: string): boolean {
  const s = (text ?? '').trim()
  if (!s || s.length < 10) return false
  if (/[:：，,、；;…]$/.test(s)) return false
  return true
}

const rows = db
  .prepare('SELECT catalog_star_id, persona_json FROM catalog_star_analyses WHERE persona_json IS NOT NULL')
  .all() as Array<{ catalog_star_id: string; persona_json: string }>

const update = db.prepare('UPDATE catalog_star_analyses SET persona_json = ? WHERE catalog_star_id = ?')
let fixed = 0
let skipped = 0
// 需要强制重新生成的星：残句被兜底替换，或段落与金句/兜底文案相同（内容单薄，值得重生成完整叙事）
const regenIds = new Set<string>()

function isFallbackText(t: string, p: { quote?: unknown }): boolean {
  if (!t) return true
  if (FALLBACK.includes(t)) return true
  if (typeof p.quote === 'string' && t === p.quote.trim()) return true
  return false
}

for (const row of rows) {
  let p: { quote?: unknown; paragraphs?: unknown }
  try {
    p = JSON.parse(row.persona_json) as { quote?: unknown; paragraphs?: unknown }
  } catch {
    skipped++
    continue
  }
  if (!Array.isArray(p.paragraphs) || p.paragraphs.length < 2) {
    skipped++
    continue
  }

  const raw = p.paragraphs as unknown[]
  const a0 = String(raw[0] ?? '').trim()
  const a1 = String(raw[1] ?? '').trim()
  const ok0 = isValidParagraph(a0)
  const ok1 = isValidParagraph(a1)
  if (ok0 && ok1 && !isFallbackText(a0, p) && !isFallbackText(a1, p)) continue
  // 段落本身有效，但疑似金句/兜底文案（内容单薄）→ 不写库，仅标记重新生成
  if (ok0 && ok1) {
    regenIds.add(row.catalog_star_id)
    continue
  }

  const quote = (typeof p.quote === 'string' ? p.quote : '').trim()
  const validNarr = [ok0 ? a0 : '', ok1 ? a1 : ''].filter(Boolean)
  const p0 = validNarr[0] || quote || FALLBACK[0]
  const p1 =
    validNarr[1] ||
    (validNarr[0] && validNarr[0] !== p0 ? validNarr[0] : '') ||
    (quote && quote !== p0 ? quote : '') ||
    FALLBACK[1]

  p.paragraphs = [p0, p1]
  update.run(JSON.stringify(p), row.catalog_star_id)
  fixed++
  regenIds.add(row.catalog_star_id)
  console.log(`[fix] id=${row.catalog_star_id}${ok0 ? '' : ' p0残句'}${ok1 ? '' : ' p1残句'} → 已替换`)
}

console.log(`完成：扫描 ${rows.length} 条，修复 ${fixed} 条，跳过 ${skipped} 条`)
if (regenIds.size > 0) {
  console.log(`[regen] ${[...regenIds].join(',')}`)
}
