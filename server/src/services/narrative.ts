/**
 * 叙事生成服务
 * 为恒星生成「古今共望」AI 叙事，含 SQLite 缓存
 */

import fs from 'fs'
import path from 'path'
import db from '../db'
import { deepseekChat } from './deepseek'

interface CatalogStar {
  id: number
  name: string | null
  ra: number
  dec: number
  mag: number
  color: string
  con: string
  x: number; y: number; z: number
}

interface CatalogData {
  stars: CatalogStar[]
}

// 懒加载星表数据
let _catalog: CatalogData | null = null
function getCatalog(): CatalogData {
  if (!_catalog) {
    const jsonPath = path.resolve(__dirname, '../../../client/src/data/stars.json')
    const raw = fs.readFileSync(jsonPath, 'utf-8')
    _catalog = JSON.parse(raw) as CatalogData
  }
  return _catalog
}

/** 根据 catalog_star_id 查找恒星信息 */
function getStarInfo(catalogStarId: number): CatalogStar | null {
  const cat = getCatalog()
  return cat.stars.find(s => s.id === catalogStarId) ?? null
}

/** 查找今日是否有缓存的叙事 */
function getCachedNarrative(catalogStarId: number): string | null {
  const row = db.prepare(`
    SELECT content FROM narratives
    WHERE catalog_star_id = ? AND date(generated_at) = date('now')
    ORDER BY generated_at DESC LIMIT 1
  `).get(catalogStarId) as { content: string } | undefined
  return row?.content ?? null
}

/** 保存叙事到缓存 */
function cacheNarrative(catalogStarId: number, content: string): void {
  db.prepare(`
    INSERT OR REPLACE INTO narratives (catalog_star_id, content, generated_at)
    VALUES (?, ?, datetime('now'))
  `).run(catalogStarId, content)
}

/** 生成恒星的叙事 Prompt */
function buildNarrativePrompt(star: CatalogStar): { system: string; user: string } {
  const starName = star.name || `RA ${star.ra.toFixed(1)}h Dec ${star.dec.toFixed(1)}°`
  const conMap: Record<string, string> = {
    And: '仙女座', Aqr: '宝瓶座', Ari: '白羊座', Aur: '御夫座',
    Boo: '牧夫座', Cam: '鹿豹座', Cas: '仙后座', Cen: '半人马座',
    Cep: '仙王座', Cet: '鲸鱼座', CMa: '大犬座', CMi: '小犬座',
    Cnc: '巨蟹座', CrB: '北冕座', Cru: '南十字座', Crv: '乌鸦座',
    Cyg: '天鹅座', Del: '海豚座', Dra: '天龙座', Eri: '波江座',
    Gem: '双子座', Her: '武仙座', Hya: '长蛇座', Lac: '蝎虎座',
    Leo: '狮子座', Lep: '天兔座', Lib: '天秤座', Lyr: '天琴座',
    Mon: '麒麟座', Oph: '蛇夫座', Ori: '猎户座', Peg: '飞马座',
    Per: '英仙座', Psc: '双鱼座', Sco: '天蝎座', Ser: '巨蛇座',
    Sge: '天箭座', Sgr: '人马座', Tau: '金牛座', Tri: '三角座',
    UMa: '大熊座', UMi: '小熊座', Vir: '室女座', Vul: '狐狸座',
  }
  const conName = conMap[star.con] || star.con
  const brightness = star.mag < 1 ? '极亮' : star.mag < 3 ? '较亮' : '肉眼可见'

  const system = `你是"星语穹庭"的星空叙事者。根据用户提供的恒星信息，写一段"古今共望"叙事短文。

**你必须严格按照以下格式输出，逐字逐句，包括 # 和 > 符号：**

# 今夜，你看到{星名}。

（一段联系古今的叙述，1~2句）

（诗人名）写：

> "{诗句}"（朝代·《出处》）

（对诗句的解读，联系诗人当时的社会背景、心境，1~2句）

（结尾回扣，1句）

**格式规则（必须逐条遵守）：**
1. 第一行必须以"# 今夜，你看到"开头，后跟星名和句号
2. 每个段落之间必须空一行
3. 诗句引用必须以"> "（大于号+空格）开头，诗句用双引号包裹
4. 诗句后面用括号标注朝代和出处
5. 不要把所有内容写成一段，必须分段
6. 不要省略 # 和 > 符号

**内容要求：**
- 联系古今：提到至少一位古代诗人/天文学家/历史人物
- 引用相关古诗词（一句即可，标注作者和朝代）
- 勿编造不存在的人物和诗句
- 文字优美凝练、温暖治愈，150~250字
- 结尾回扣：千年以后，你也正在看同一片天空
- 中文输出`

  const user = `恒星名称：${starName}
所属星座：${conName}
视星等：${star.mag.toFixed(1)} 等（${brightness}）
颜色/光谱：${star.color}
赤经：${star.ra.toFixed(2)}h
赤纬：${star.dec.toFixed(2)}°

请为这颗星写一段"古今共望"叙事。记住：第一行必须是 "# 今夜，你看到${starName}。"，诗句引用必须以 "> " 开头。`

  return { system, user }
}

export interface NarrativeResult {
  content: string
  cached: boolean
}

/**
 * 获取恒星叙事（优先缓存，无缓存则生成并缓存）
 */
export async function getNarrative(catalogStarId: number): Promise<NarrativeResult> {
  // 1. 查找恒星信息
  const star = getStarInfo(catalogStarId)
  if (!star) {
    throw Object.assign(new Error('恒星不存在'), { statusCode: 404 })
  }

  // 2. 查缓存
  const cached = getCachedNarrative(catalogStarId)
  if (cached) {
    return { content: cached, cached: true }
  }

  // 3. 生成叙事
  const { system, user } = buildNarrativePrompt(star)
  const content = await deepseekChat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    {
      temperature: 0.9,
      maxTokens: 600,
    },
  )

  // 4. 缓存
  cacheNarrative(catalogStarId, content)

  return { content, cached: false }
}
