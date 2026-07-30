/**
 * 将 constellations.json 中的连线从星名匹配转换为 ID 匹配
 * 用法: npx tsx scripts/convertConstellationToId.ts
 */

import starsRaw from '../src/data/stars.json'
import conRaw from '../src/data/constellations.json'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const stars: { id: number; name: string | null; ra: number; dec: number }[] = (starsRaw as any).stars
const conData = conRaw as Record<string, { name: string; nameEn: string; labelPos: number[] | null; lines: [string, string][] }>

// 构建 星名 → ID 映射
const nameToId = new Map<string, number>()
for (const s of stars) {
  if (s.name) nameToId.set(s.name, s.id)
}

// 旧名 → 新名 别名映射（兼容 constellations.json 中未被更新的旧星名）
const NAME_ALIASES: Record<string, string> = {
  // 小熊座 UMi - 星官命名修正
  '勾陈增九 UMi δ': '勾陈二 UMi δ',
  '勾陈一 UMi ε': '勾陈三 UMi ε',
  '北极二 UMi ζ': '勾陈四 UMi ζ',
  '北极一 UMi η': '勾陈增一 UMi η',
  // 天龙座 Dra - 紫微垣星官名修正
  '紫微右垣三 Thuban': '右枢 Thuban',
  '紫微左垣一 Dra κ': '左枢 Edasich',
  '紫微左垣二 Dra λ': '上辅 Dra λ',
  '紫微左垣三 Dra ν': '少弼 Kuma',
  '紫微左垣四 Dra ξ': '天棓一 Grumium',
  '天棓一 Dra η': '少宰 Dra η',
  '天棓二 Dra θ': '上宰 Dra θ',
  '天棓五 Dra ι': '左枢 Edasich',
  '紫微左垣五 Dra π': '__SKIP__', // 已删除的重复恒星
  '上弼 Dra β': '天棓三 Rastaban', // β Dra 旧名
  '少卫 Dra δ': '天厨一 Altais', // δ Dra 旧名
  // 仙王座 Cep - 天钩四去重
  '天钩四 Cep β': '上卫增一 Alfirk',
}

function resolveName(name: string): string | null {
  const alias = NAME_ALIASES[name]
  if (alias === '__SKIP__') return null // 显式标记为无效
  return alias || name
}

// 解析坐标字符串 "hhHmmM · ±dd°mm′" → { ra, dec }
function parseCoord(raw: string): { ra: number; dec: number } | null {
  const m = raw.match(/(\d+)h\s*(\d+)m\s*·?\s*([+-]?\d+)°\s*(\d+)[′']/)
  if (!m) return null
  const ra = parseInt(m[1]) + parseInt(m[2]) / 60
  const dec = (m[3].startsWith('-') ? -1 : 1) * (Math.abs(parseInt(m[3])) + parseInt(m[4]) / 60)
  return { ra, dec }
}

// 根据坐标查找最近的星星 ID
function findStarByCoord(ra: number, dec: number): number | null {
  let best: { id: number; dist: number } | null = null
  for (const s of stars) {
    const dRa = Math.abs(s.ra - ra) * 15 // 转换为角度
    const dDec = Math.abs(s.dec - dec)
    const dist = Math.sqrt(dRa * dRa + dDec * dDec)
    if (dist < 0.1 && (best === null || dist < best.dist)) {
      best = { id: s.id, dist }
    }
  }
  return best?.id ?? null
}

const notFound: string[] = []
const converted: Record<string, { name: string; nameEn: string; labelPos: number[] | null; lines: [number, number][] }> = {}

for (const [abbr, con] of Object.entries(conData)) {
  const newLines: [number, number][] = []
  for (const [a, b] of con.lines) {
    const resolvedA = resolveName(a)
    const resolvedB = resolveName(b)
    let idA = resolvedA ? nameToId.get(resolvedA) : undefined
    let idB = resolvedB ? nameToId.get(resolvedB) : undefined

    if (idA == null) {
      const coord = parseCoord(a)
      if (coord) {
        idA = findStarByCoord(coord.ra, coord.dec)
        if (idA !== null) {
          console.log(`  [坐标] ${abbr}: "${a}" → ID ${idA} (${stars.find(s => s.id === idA)?.name || '无名称'})`)
        }
      }
    }
    if (idB == null) {
      const coord = parseCoord(b)
      if (coord) {
        idB = findStarByCoord(coord.ra, coord.dec)
        if (idB !== null) {
          console.log(`  [坐标] ${abbr}: "${b}" → ID ${idB} (${stars.find(s => s.id === idB)?.name || '无名称'})`)
        }
      }
    }

    if (idA == null || idB == null) {
      const missing = idA == null ? a : b
      if (!notFound.includes(missing)) notFound.push(missing)
      console.error(`  ❌ ${abbr}: 找不到 "${missing}"`)
      continue
    }

    newLines.push([idA, idB])
  }

  converted[abbr] = {
    name: con.name,
    nameEn: con.nameEn,
    labelPos: con.labelPos,
    lines: newLines,
  }
  console.log(`${abbr} (${con.name}): ${con.lines.length} 条连线 → ${newLines.length} 条转换成功`)
}

if (notFound.length > 0) {
  console.error(`\n⚠️ 找不到匹配的星星 (${notFound.length}):`)
  for (const n of notFound) {
    console.error(`  - ${n}`)
  }
}

// 写入文件
const outPath = path.resolve(__dirname, '../src/data/constellations.json')
fs.writeFileSync(outPath, JSON.stringify(converted, null, 2), 'utf-8')
console.log(`\n✅ 已写入: ${outPath}`)
console.log(`共 ${Object.keys(converted).length} 个星座`)