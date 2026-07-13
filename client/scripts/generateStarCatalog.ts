/**
 * 生成肉眼可见恒星表
 *
 * 数据来源组合：
 * 1. IAU 命名的亮星（手工录入：赤经/赤纬/星等）— 这些星形成可见星座
 * 2. 程序化补充暗星（均匀天球分布，星等分布符合实际观测）
 *
 * 用法: npx ts-node scripts/generateStarCatalog.ts
 * 输出: src/data/stars.json
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_PATH = path.join(__dirname, '../src/data/stars.json')

// ═══════════════════════════════════════════════
// IAU 命名亮星 (名称, Bayer编号, 赤经h, 赤纬deg, 星等, B-V, 星座)
// 赤经赤纬数据来源: SIMBAD / IAU Catalog
// ═══════════════════════════════════════════════
interface BrightStar {
  name: string
  ra: number    // hours
  dec: number   // degrees
  mag: number   // apparent magnitude
  ci: number    // B-V color index
  con: string   // constellation abbreviation
}

const NAMED_STARS: BrightStar[] = [
  // 北斗七星 (Big Dipper / Ursa Major)
  { name: '天枢 Dubhe',        ra: 11.062, dec: 61.751,  mag: 1.79, ci: 1.07, con: 'UMa' },
  { name: '天璇 Merak',        ra: 11.031, dec: 56.382,  mag: 2.37, ci: 0.03, con: 'UMa' },
  { name: '天玑 Phecda',       ra: 11.897, dec: 53.695,  mag: 2.44, ci: 0.04, con: 'UMa' },
  { name: '天权 Megrez',       ra: 12.257, dec: 57.033,  mag: 3.31, ci: 0.05, con: 'UMa' },
  { name: '玉衡 Alioth',       ra: 12.900, dec: 55.960,  mag: 1.77, ci: -0.02, con: 'UMa' },
  { name: '开阳 Mizar',        ra: 13.399, dec: 54.925,  mag: 2.27, ci: 0.12, con: 'UMa' },
  { name: '摇光 Alkaid',       ra: 13.792, dec: 49.313,  mag: 1.86, ci: -0.06, con: 'UMa' },

  // 猎户座 (Orion)
  { name: '参宿四 Betelgeuse', ra: 5.919,  dec: 7.407,   mag: 0.42, ci: 1.85, con: 'Ori' },
  { name: '参宿七 Rigel',      ra: 5.242,  dec: -8.202,  mag: 0.13, ci: -0.03, con: 'Ori' },
  { name: '参宿五 Bellatrix',  ra: 5.419,  dec: 6.350,   mag: 1.64, ci: -0.07, con: 'Ori' },
  { name: '参宿六 Saiph',      ra: 5.798,  dec: -9.670,  mag: 2.07, ci: -0.03, con: 'Ori' },
  { name: '参宿一 Alnitak',    ra: 5.678,  dec: -1.943,  mag: 1.77, ci: -0.01, con: 'Ori' },
  { name: '参宿二 Alnilam',    ra: 5.604,  dec: -1.202,  mag: 1.69, ci: -0.02, con: 'Ori' },
  { name: '参宿三 Mintaka',    ra: 5.533,  dec: -0.299,  mag: 2.23, ci: 0.02, con: 'Ori' },

  // 大犬座 (Canis Major) — 天狼星
  { name: '天狼星 Sirius',     ra: 6.752,  dec: -16.716, mag: -1.46, ci: 0.01, con: 'CMa' },

  // 小犬座 (Canis Minor) — 南河三
  { name: '南河三 Procyon',    ra: 7.655,  dec: 5.225,   mag: 0.34, ci: 0.40, con: 'CMi' },

  // 天鹰座 (Aquila) — 牛郎星
  { name: '牛郎星 Altair',     ra: 19.846, dec: 8.868,   mag: 0.77, ci: 0.22, con: 'Aql' },

  // 天琴座 (Lyra) — 织女星
  { name: '织女星 Vega',       ra: 18.616, dec: 38.784,  mag: 0.03, ci: 0.00, con: 'Lyr' },

  // 天鹅座 (Cygnus) — 天津四
  { name: '天津四 Deneb',      ra: 20.690, dec: 45.280,  mag: 1.25, ci: 0.09, con: 'Cyg' },

  // 牧夫座 (Bootes) — 大角
  { name: '大角 Arcturus',     ra: 14.261, dec: 19.182,  mag: -0.05, ci: 1.23, con: 'Boo' },

  // 天蝎座 (Scorpius) — 心宿二
  { name: '心宿二 Antares',    ra: 16.490, dec: -26.432, mag: 0.91, ci: 1.83, con: 'Sco' },

  // 室女座 (Virgo) — 角宿一
  { name: '角宿一 Spica',      ra: 13.420, dec: -11.161, mag: 0.97, ci: -0.13, con: 'Vir' },

  // 双子座 (Gemini)
  { name: '北河二 Castor',     ra: 7.577,  dec: 31.888,  mag: 1.58, ci: 0.03, con: 'Gem' },
  { name: '北河三 Pollux',     ra: 7.755,  dec: 28.026,  mag: 1.14, ci: 1.00, con: 'Gem' },

  // 金牛座 (Taurus)
  { name: '毕宿五 Aldebaran',  ra: 4.599,  dec: 16.509,  mag: 0.85, ci: 1.54, con: 'Tau' },

  // 御夫座 (Auriga)
  { name: '五车二 Capella',    ra: 5.278,  dec: 46.000,  mag: 0.08, ci: 0.80, con: 'Aur' },

  // 狮子座 (Leo)
  { name: '轩辕十四 Regulus',  ra: 10.140, dec: 11.967,  mag: 1.35, ci: -0.06, con: 'Leo' },

  // 南十字 (Crux)
  { name: '十字架二 Acrux',    ra: 12.443, dec: -63.099, mag: 0.76, ci: -0.08, con: 'Cru' },

  // 船底座 (Carina)
  { name: '老人星 Canopus',    ra: 6.399,  dec: -52.696, mag: -0.74, ci: 0.15, con: 'Car' },

  // 南鱼座 (Piscis Austrinus)
  { name: '北落师门 Fomalhaut', ra: 22.960, dec: -29.622, mag: 1.16, ci: 0.09, con: 'PsA' },

  // 波江座 (Eridanus)
  { name: '水委一 Achernar',   ra: 1.628,  dec: -57.237, mag: 0.46, ci: -0.02, con: 'Eri' },

  // 半人马座 (Centaurus)
  { name: '马腹一 Hadar',      ra: 14.064, dec: -60.373, mag: 0.61, ci: -0.08, con: 'Cen' },
  { name: '南门二 Rigil Kent', ra: 14.660, dec: -60.834, mag: -0.01, ci: 0.71, con: 'Cen' },

  // 仙王座 / 仙后座 / 仙女座 / 英仙座 (秋季星空)
  { name: '仙后座α Schedar',   ra: 0.675,  dec: 56.537,  mag: 2.23, ci: 1.17, con: 'Cas' },
  { name: '仙女座α Alpheratz', ra: 0.139,  dec: 29.090,  mag: 2.07, ci: -0.02, con: 'And' },
  { name: '英仙座α Mirfak',    ra: 3.406,  dec: 49.861,  mag: 1.79, ci: 0.48, con: 'Per' },
  { name: '英仙座β Algol',     ra: 3.136,  dec: 40.956,  mag: 2.12, ci: -0.05, con: 'Per' },

  // 大熊座其他亮星
  { name: '大熊座η Alkaid',    ra: 13.792, dec: 49.313,  mag: 1.86, ci: -0.04, con: 'UMa' },

  // 小熊座 (Ursa Minor) — 北极星
  { name: '北极星 Polaris',    ra: 2.530,  dec: 89.264,  mag: 1.98, ci: 0.60, con: 'UMi' },

  // 金牛座昴星团 (Pleiades)
  { name: '昴宿六 Alcyone',    ra: 3.791,  dec: 24.105,  mag: 2.87, ci: 0.00, con: 'Tau' },

  // 猎户座星云附近
  { name: '伐二 Saiph',        ra: 5.798,  dec: -9.670,  mag: 2.07, ci: -0.03, con: 'Ori' },

  // 更多中国星官体系中的重要星
  { name: '天市左垣一',         ra: 16.236, dec: -3.694,  mag: 2.75, ci: 0.49, con: 'Oph' },
  { name: '大火 Antares',      ra: 16.490, dec: -26.432, mag: 0.91, ci: 1.83, con: 'Sco' },
  { name: '河鼓二 Altair',     ra: 19.846, dec: 8.868,   mag: 0.77, ci: 0.22, con: 'Aql' },
  { name: '奎宿九 Mirach',     ra: 1.163,  dec: 35.621,  mag: 2.05, ci: 1.57, con: 'And' },
  { name: '娄宿三 Hamal',      ra: 2.123,  dec: 23.462,  mag: 2.00, ci: 1.15, con: 'Ari' },
  { name: '毕宿一 Electra',    ra: 3.748,  dec: 24.113,  mag: 3.70, ci: -0.03, con: 'Tau' },
  { name: '五车五 Elnath',     ra: 5.438,  dec: 28.607,  mag: 1.65, ci: -0.05, con: 'Tau' },
  { name: '井宿三 Alhena',     ra: 6.629,  dec: 16.399,  mag: 1.93, ci: 0.00, con: 'Gem' },
  { name: '鬼宿四 Asellus',    ra: 8.726,  dec: 18.154,  mag: 4.16, ci: 0.52, con: 'Cnc' },
  { name: '星宿一 Alphard',    ra: 9.461,  dec: -8.659,  mag: 1.98, ci: 1.44, con: 'Hya' },
  { name: '翼宿一 Alkes',      ra: 10.994, dec: -18.299, mag: 4.07, ci: 1.12, con: 'Crt' },
  { name: '轸宿一 Graffias',   ra: 16.091, dec: -19.805, mag: 2.62, ci: -0.05, con: 'Sco' },
  { name: '斗宿四 Nunki',      ra: 18.921, dec: -26.297, mag: 2.07, ci: -0.05, con: 'Sgr' },
  { name: '牛宿一 Dabih',      ra: 20.350, dec: -14.781, mag: 3.05, ci: 0.80, con: 'Cap' },
  { name: '虚宿一 Skat',       ra: 22.914, dec: -15.819, mag: 3.24, ci: 0.49, con: 'Aqr' },
  { name: '壁宿二 Algenib',    ra: 0.221,  dec: 15.184,  mag: 2.83, ci: -0.04, con: 'Peg' },
  { name: '奎宿一 Mesarthim',  ra: 1.893,  dec: 19.296,  mag: 3.88, ci: 0.16, con: 'Ari' },

  // 补充更多亮星以保证天球覆盖
  { name: 'Denebola',          ra: 11.818, dec: 14.572,  mag: 2.13, ci: 0.09, con: 'Leo' },
  { name: 'Zubenelgenubi',     ra: 14.848, dec: -16.042, mag: 2.75, ci: 0.62, con: 'Lib' },
  { name: 'Rasalhague',        ra: 17.582, dec: 12.560,  mag: 2.08, ci: 0.16, con: 'Oph' },
  { name: 'Kaus Australis',    ra: 18.403, dec: -34.385, mag: 1.85, ci: -0.04, con: 'Sgr' },
  { name: 'Altair',            ra: 19.846, dec: 8.868,   mag: 0.77, ci: 0.22, con: 'Aql' },
  { name: 'Peacock',           ra: 20.427, dec: -56.735, mag: 1.94, ci: -0.05, con: 'Pav' },
  { name: 'Enif',              ra: 21.735, dec: 9.875,   mag: 2.39, ci: 1.03, con: 'Peg' },
  { name: 'Markab',            ra: 23.078, dec: 15.205,  mag: 2.49, ci: -0.01, con: 'Peg' },
  { name: 'Scheat',            ra: 23.064, dec: 28.083,  mag: 2.42, ci: 1.67, con: 'Peg' },
  { name: 'Menkar',            ra: 2.997,  dec: 4.090,   mag: 2.53, ci: 1.64, con: 'Cet' },
  { name: 'Diphda',            ra: 0.726,  dec: -17.987, mag: 2.04, ci: 1.01, con: 'Cet' },
  { name: 'Mira',              ra: 2.322,  dec: -2.978,  mag: 3.04, ci: 1.42, con: 'Cet' },
  { name: 'Naos',              ra: 8.060,  dec: -40.003, mag: 2.25, ci: -0.11, con: 'Pup' },
  { name: 'Avior',             ra: 8.375,  dec: -59.509, mag: 1.86, ci: 0.18, con: 'Car' },
  { name: 'Miaplacidus',       ra: 9.221,  dec: -69.717, mag: 1.68, ci: 0.10, con: 'Car' },
  { name: 'Alphard',           ra: 9.461,  dec: -8.659,  mag: 1.98, ci: 1.44, con: 'Hya' },
  { name: 'Regulus',           ra: 10.140, dec: 11.967,  mag: 1.35, ci: -0.06, con: 'Leo' },
  { name: 'Zosma',             ra: 11.236, dec: 20.524,  mag: 2.56, ci: 0.07, con: 'Leo' },
  { name: 'Algieba',           ra: 10.332, dec: 19.842,  mag: 2.01, ci: 0.97, con: 'Leo' },
  { name: 'Zubeneschamali',    ra: 15.284, dec: -9.383,  mag: 2.61, ci: -0.01, con: 'Lib' },
  { name: 'Unukalhai',         ra: 15.737, dec: 6.426,   mag: 2.65, ci: 1.04, con: 'Ser' },
]

// ═══════════════════════════════════════════════
// 色指数 B-V → hex 颜色
// ═══════════════════════════════════════════════
function ciToHex(ci: number): string {
  if (ci < -0.15) return '#c8d8ff' // 蓝白 O/B 型
  if (ci < 0.10)  return '#f0f0ff' // 白 A 型
  if (ci < 0.40)  return '#fff8ee' // 黄白 F 型
  if (ci < 0.85)  return '#ffe8c0' // 黄 G 型
  if (ci < 1.40)  return '#ffd090' // 橙 K 型
  return '#ffb870'                 // 红 M 型
}

// ═══════════════════════════════════════════════
// 赤经(时)/赤纬(度) → 3D 天球坐标
// ═══════════════════════════════════════════════
function raDecToXYZ(ra: number, dec: number, radius: number) {
  const raRad = (ra / 24) * Math.PI * 2         // 赤经 → 方位角
  const decRad = (dec / 180) * Math.PI           // 赤纬 → 仰角
  return {
    x: radius * Math.cos(decRad) * Math.cos(raRad),
    y: radius * Math.sin(decRad),                // Y 轴 = 天极方向
    z: -radius * Math.cos(decRad) * Math.sin(raRad),
  }
}

// ═══════════════════════════════════════════════
// 主程序
// ═══════════════════════════════════════════════
interface StarJSON {
  id: number
  name: string | null
  ra: number
  dec: number
  mag: number
  color: string
  con: string
  x: number
  y: number
  z: number
}

const SPHERE_RADIUS = 500

function main() {
  const stars: StarJSON[] = []
  let id = 0

  // 1. 录入亮星
  for (const s of NAMED_STARS) {
    const pos = raDecToXYZ(s.ra, s.dec, SPHERE_RADIUS)
    stars.push({
      id: id++,
      name: s.name,
      ra: Math.round(s.ra * 10000) / 10000,
      dec: Math.round(s.dec * 1000) / 1000,
      mag: s.mag,
      color: ciToHex(s.ci),
      con: s.con,
      x: Math.round(pos.x * 100) / 100,
      y: Math.round(pos.y * 100) / 100,
      z: Math.round(pos.z * 100) / 100,
    })
  }

  // 2. 程序化生成暗星（均匀天球分布 + 真实的星等分布）
  //    星等分布近似: N(mag) ∝ 10^(0.6*mag)
  //    肉眼可见 ~6000 颗，其中 < 2 等只有 ~50 颗，3-4 等 ~200 颗，5-6 等 ~5000 颗
  const DIMMER_COUNT = 5500
  const magDistribution = [
    { min: 2.0, max: 3.0, ratio: 0.02 },   // ~110 颗
    { min: 3.0, max: 4.0, ratio: 0.08 },   // ~440 颗
    { min: 4.0, max: 5.0, ratio: 0.30 },   // ~1650 颗
    { min: 5.0, max: 6.5, ratio: 0.60 },   // ~3300 颗
  ]

  for (let i = 0; i < DIMMER_COUNT; i++) {
    // 均匀球面分布 (Marsaglia)
    let u: number, v: number, s: number
    do {
      u = Math.random() * 2 - 1
      v = Math.random() * 2 - 1
      s = u * u + v * v
    } while (s >= 1)

    const x = 2 * u * Math.sqrt(1 - s)
    const y = 2 * v * Math.sqrt(1 - s)
    const z = 1 - 2 * s

    // 反算赤经赤纬
    const dec = Math.asin(y) * 180 / Math.PI
    const ra = ((Math.atan2(-z, x) + Math.PI * 2) % (Math.PI * 2)) * 12 / Math.PI

    // 根据分布随机星等
    const rand = Math.random()
    let cumRatio = 0
    let mag = 4.0
    for (const d of magDistribution) {
      cumRatio += d.ratio
      if (rand <= cumRatio) {
        mag = d.min + Math.random() * (d.max - d.min)
        break
      }
    }

    // 星等决定 B-V 色指数（暗星更偏暖色，模拟真实观测）
    const ci = (Math.random() - 0.3) * 1.2 + (mag - 2) * 0.1

    stars.push({
      id: id++,
      name: null,
      ra: Math.round(ra * 10000) / 10000,
      dec: Math.round(dec * 1000) / 1000,
      mag: Math.round(mag * 100) / 100,
      color: ciToHex(ci),
      con: '',
      x: Math.round(x * SPHERE_RADIUS * 100) / 100,
      y: Math.round(y * SPHERE_RADIUS * 100) / 100,
      z: Math.round(z * SPHERE_RADIUS * 100) / 100,
    })
  }

  // 输出
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(stars))
  const sizeKB = Math.round(fs.statSync(OUTPUT_PATH).size / 1024)
  const named = stars.filter(s => s.name).length
  console.log(`✅ 输出: ${OUTPUT_PATH}`)
  console.log(`   ${stars.length} 颗星 (${named} 颗命名, ${DIMMER_COUNT} 颗暗星)`)
  console.log(`   文件大小: ${sizeKB} KB`)
}

main()
