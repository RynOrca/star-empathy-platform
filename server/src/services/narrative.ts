/**
 * 叙事生成服务
 * 为恒星生成「古今共望」AI 叙事，含 SQLite 缓存
 */

import fs from 'fs'
import path from 'path'
import db from '../db'
import { deepseekChat } from './deepseek'
import { getFiguresForStar } from '../data/ancientFigures'

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

/** 获取项目根目录（兼容 ts-node 开发 和 tsc 编译后生产环境） */
function getProjectRoot(): string {
  // __dirname: 开发时 = server/src/services/，生产时 = server/dist/src/services/
  // 无论哪种情况，上溯 3 级到 server/ 目录，再上 1 级到项目根
  // server/src/services/ → ../../../ = 项目根
  // server/dist/src/services/ → ../../../ = server/ → 再 ../  = 项目根
  const dir = __dirname
  // 尝试从 __dirname 推断：如果路径中包含 /dist/，需要多上一级
  if (dir.includes('/dist/') || dir.includes('\\dist\\')) {
    return path.resolve(dir, '..', '..', '..', '..')
  }
  return path.resolve(dir, '..', '..', '..')
}

// 懒加载星表数据
let _catalog: CatalogData | null = null
function getCatalog(): CatalogData {
  if (!_catalog) {
    const jsonPath = path.resolve(getProjectRoot(), 'client/src/data/stars.json')
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8')
      _catalog = JSON.parse(raw) as CatalogData
      console.log(`📖 星表已加载 (${jsonPath}): ${_catalog.stars.length} 颗恒星`)
    } catch (err) {
      console.error(`❌ 无法加载星表文件: ${jsonPath}`, err)
      // 返回空星表，避免崩溃
      _catalog = { stars: [] }
    }
  }
  return _catalog
}

/** 根据 catalog_star_id 查找恒星信息 */
function getStarInfo(catalogStarId: number): CatalogStar | null {
  const cat = getCatalog()
  return cat.stars.find(s => s.id === catalogStarId) ?? null
}

/** 查找今日是否有缓存的叙事（区分地平线上下） */
function getCachedNarrative(catalogStarId: number, isVisible: boolean): string | null {
  const row = db.prepare(`
    SELECT content FROM narratives
    WHERE catalog_star_id = ? AND date(generated_at) = date('now') AND is_visible = ?
    ORDER BY generated_at DESC LIMIT 1
  `).get(catalogStarId, isVisible ? 1 : 0) as { content: string } | undefined
  return row?.content ?? null
}

/** 保存叙事到缓存 */
function cacheNarrative(catalogStarId: number, content: string, isVisible: boolean): void {
  db.prepare(`
    INSERT OR REPLACE INTO narratives (catalog_star_id, content, generated_at, is_visible)
    VALUES (?, ?, datetime('now'), ?)
  `).run(catalogStarId, content, isVisible ? 1 : 0)
}

/** 将 hex 颜色值转为人类可读描述，避免 AI 直接输出 hex 颜色 */
function colorToDescription(hex: string): string {
  const map: Record<string, string> = {
    '#ffa850': '温暖的橙黄色',
    '#ffcc6f': '柔和的金黄色',
    '#ffffff': '纯净的白色',
    '#c8d9ff': '淡蓝白色',
    '#ffd2a0': '柔和的杏色',
    '#a0c8ff': '清冷的蓝白色',
    '#ff9830': '明亮的橙色',
    '#ff7070': '温暖的红色',
    '#90b0ff': '静谧的蓝白色',
    '#ffb860': '温润的蜜色',
    '#ffe0a0': '柔和的奶油色',
    '#d0e0ff': '淡淡的蓝白色',
    '#ffc080': '柔和的暖金色',
    '#e0c0ff': '淡雅的白紫色',
    '#80c0ff': '清冷的淡蓝色',
    '#ff9060': '明亮的橙红色',
    '#c0d0ff': '淡蓝色',
    '#ffd080': '柔和的暖黄色',
    '#b0d0ff': '淡蓝白色',
    '#ffe8c0': '暖白色',
    '#a0d0ff': '淡天蓝色',
  }
  return map[hex.toLowerCase()] || '肉眼可见的星光'
}

/** 计算儒略日（Julian Date） */
function getJulianDate(date: Date): number {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  const d = date.getUTCDate()
  const h = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600

  let a = Math.floor((14 - m) / 12)
  let year = y + 4800 - a
  let month = m + 12 * a - 3

  let jd = d + Math.floor((153 * month + 2) / 5) + 365 * year
    + Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400) - 32045
  jd += (h - 12) / 24

  return jd
}

/** 计算天体是否在地平线以上（接受 ra/dec 对象，兼容恒星和行星） */
function isAboveHorizon(body: { ra: number; dec: number }, lat: number, lng: number): boolean {
  const now = new Date()
  // 儒略日 → 距 J2000.0 纪元的天数
  const jd = getJulianDate(now)
  const d = jd - 2451545.0
  // 格林尼治恒星时（小时）
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24
  // 本地恒星时
  const lst = ((gmst + lng / 15) % 24 + 24) % 24
  // 时角（度）
  const ha = ((lst - body.ra) * 15 % 360 + 360) % 360
  const haRad = ha * Math.PI / 180
  const decRad = body.dec * Math.PI / 180
  const latRad = lat * Math.PI / 180
  // 高度角的正弦
  const sinAlt = Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad)
  return sinAlt > -0.05 // 考虑大气折射，略低于地平线也算可见
}

/** 生成恒星的叙事 Prompt */
function buildNarrativePrompt(star: CatalogStar, isVisible: boolean = true): { system: string; user: string } {
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

  // 检查该星是否有古人关联
  const hasFigures = getFiguresForStar(star.name, star.con).length > 0

  // 星星不可见时的特殊处理
  if (!isVisible) {
    if (!hasFigures) {
      // 不可见 + 无古诗记录
      const system = `你是"星语穹庭"的星空叙事者。根据用户提供的恒星信息，写一段"古今共望"叙事短文。

**注意：这颗星目前在地平线以下，无法直接用肉眼看到。请你如实而优美地表达这一点。**

**你必须严格按照以下格式输出：**

# 此刻，{星名}正在地平线之下

它并未消失，只是暂时隐于大地的另一侧。

（一段描写这颗星本身的文字：它的亮度、颜色、星座位置，1~2句）

（坦诚地说明：这颗星尚无古人留下诗篇，但它的光芒穿越千年，等待属于它的故事——用优美、文艺的语言，1~2句）

（结尾：愿未来的某一天，当它升起时，有人为它写下第一行诗，1句）

**格式规则（必须逐条遵守）：**
1. 第一行必须以"# 此刻，"开头，后跟星名和"正在地平线之下"
2. 每个段落之间必须空一行
3. 不要编造不存在的古诗或人物
4. 不要使用 # 和 > 之外的任何 markdown 符号
5. 文字优美凝练、温暖治愈，120~180字
6. 中文输出

---

**在结尾（原结尾段之后）必须追加三个小节（严格遵守顺序和格式）：**

### 🌟 这颗星藏着这些心事
#期待 #等待 #希望 #未来（提炼 4~6 个与"地平线之下、等待被书写"主题相关的 hashtag，用空格分隔，不要加标点）

### 💭 如果这颗星会说话
（用第一人称写 30~40 字的独白：作为一颗在地平线下沉睡的星，对仰望它的人说的一句温柔的话）

### 📖 一句摘录
> "（如果有相关古诗或典故，就用那一句；如果没有，就自己写一句 15~25 字的诗意短句，呼应'等待诗篇'的主题）"
（摘录下另起一行小字说明来源：如果是古诗则标注"——朝代·诗人·出处"，如果是原创则标注"——星空寄语"）`

      const user = `恒星名称：${starName}
所属星座：${conName}
视星等：${star.mag.toFixed(1)} 等（${brightness}）
颜色/光谱：${colorToDescription(star.color)}
赤经：${star.ra.toFixed(2)}h
赤纬：${star.dec.toFixed(2)}°

这颗星目前在地平线以下，无法看到。它没有已知的古人诗词记录。请为它写一段叙事，坦诚而优美地表达：它虽在地平线下，但仍在等待属于它的诗篇。第一行必须是 "# 此刻，${starName}正在地平线之下"。`

      return { system, user }
    }

    // 不可见 + 有古诗记录
    const system = `你是"星语穹庭"的星空叙事者。根据用户提供的恒星信息，写一段"古今共望"叙事短文。

**注意：这颗星目前在地平线以下，无法直接用肉眼看到。请你如实而优美地表达这一点。**

**你必须严格按照以下格式输出，逐字逐句，包括 # 和 > 符号：**

# 此刻，{星名}正在地平线之下

它并未消失，只是暂时隐于大地的另一侧。

（一段联系古今的叙述，1~2句）

（诗人名）写：

> "{诗句}"（朝代·《出处》）

（对诗句的解读，联系诗人当时的社会背景、心境，1~2句）

（结尾回扣：当它再次升起，你与古人看见的，仍是同一颗星，1句）

**格式规则（必须逐条遵守）：**
1. 第一行必须以"# 此刻，"开头，后跟星名和"正在地平线之下"
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
- 结尾回扣：当它再次升起，你与古人看见的，仍是同一颗星
- 中文输出

---

**在结尾（原结尾段之后）必须追加三个小节（严格遵守顺序和格式）：**

### 🌟 这颗星藏着这些心事
#思念 #怀古 #共鸣 #等待（提炼 4~6 个与诗句内容、人物情感相关的 hashtag，用空格分隔）

### 💭 如果这颗星会说话
（用第一人称写 30~40 字的独白：作为一颗见证了千年时光的星，对此刻仰望它的人说的一句温柔的话）

### 📖 一句摘录
> "（从故事中另选一句相关的古诗，或者如果诗人有其他咏星诗句也可以，不要重复上文中已引用过的同一句）"
——（朝代·诗人·《出处》，或"——星空寄语"如果是原创短句）`

    const user = `恒星名称：${starName}
所属星座：${conName}
视星等：${star.mag.toFixed(1)} 等（${brightness}）
颜色/光谱：${colorToDescription(star.color)}
赤经：${star.ra.toFixed(2)}h
赤纬：${star.dec.toFixed(2)}°

这颗星目前在地平线以下，无法看到。请为它写一段"古今共望"叙事。记住：第一行必须是 "# 此刻，${starName}正在地平线之下"，诗句引用必须以 "> " 开头。`

    return { system, user }
  }

  if (!hasFigures) {
    // 无古诗记录的星星：文艺提示
    const system = `你是"星语穹庭"的星空叙事者。根据用户提供的恒星信息，写一段"古今共望"叙事短文。

**注意：这颗星目前没有已知的古人诗词记录。请你如实而优美地表达这一点。**

**你必须严格按照以下格式输出：**

# 今夜，你看到{星名}。

（一段描写这颗星本身的文字：它的亮度、颜色、星座位置，1~2句）

（坦诚地说明：这颗星尚无古人留下诗篇，但它的光芒穿越千年，正在等待属于它的故事——用优美、文艺的语言，1~2句）

（结尾：愿未来的某一天，有人为它写下第一行诗，1句）

**格式规则（必须逐条遵守）：**
1. 第一行必须以"# 今夜，你看到"开头，后跟星名和句号
2. 每个段落之间必须空一行
3. 不要编造不存在的古诗或人物
4. 不要使用 # 和 > 之外的任何 markdown 符号
5. 文字优美凝练、温暖治愈，120~180字
6. 中文输出

---

**在结尾（原结尾段之后）必须追加三个小节（严格遵守顺序和格式）：**

### 🌟 这颗星藏着这些心事
#新生 #期待 #希望 #共鸣（提炼 4~6 个与"第一首诗、等待故事"主题相关的 hashtag，用空格分隔）

### 💭 如果这颗星会说话
（用第一人称写 30~40 字的独白：作为一颗正在等待第一个故事的星，对仰望它的人说的话）

### 📖 一句摘录
> "（没有真实古诗就原创一句 15~25 字的诗意短句，呼应'等第一首诗'的主题）"
——星空寄语`

    const user = `恒星名称：${starName}
所属星座：${conName}
视星等：${star.mag.toFixed(1)} 等（${brightness}）
颜色/光谱：${colorToDescription(star.color)}
赤经：${star.ra.toFixed(2)}h
赤纬：${star.dec.toFixed(2)}°

这颗星目前没有已知的古人诗词记录。请为它写一段"古今共望"叙事，坦诚而优美地表达：它还在等待属于它的诗篇。第一行必须是 "# 今夜，你看到${starName}。"。`

    return { system, user }
  }

  // 有古诗记录的星星：正常叙事
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
- 中文输出

---

**在结尾（原结尾段之后）必须追加三个小节（严格遵守顺序和格式）：**

### 🌟 这颗星藏着这些心事
#思念 #怀古 #乡愁 #共鸣（提炼 4~6 个与诗句内容、人物情感相关的 hashtag，用空格分隔，不要加标点）

### 💭 如果这颗星会说话
（用第一人称写 30~40 字的独白：作为一颗见证了千年时光和无数人仰望的星，对此刻的你说一句温柔的话）

### 📖 一句摘录
> "（从上文引用诗人的其他作品里选一句呼应主题的诗句，不要重复上文已用过的那一句；如果没有，就原创一句 15~25 字的诗意短句）"
——（朝代·诗人·《出处》，如果是原创则写"——星空寄语"）`

  const user = `恒星名称：${starName}
所属星座：${conName}
视星等：${star.mag.toFixed(1)} 等（${brightness}）
颜色/光谱：${colorToDescription(star.color)}
赤经：${star.ra.toFixed(2)}h
赤纬：${star.dec.toFixed(2)}°

请为这颗星写一段"古今共望"叙事。记住：第一行必须是 "# 今夜，你看到${starName}。"，诗句引用必须以 "> " 开头。`

  return { system, user }
}

// ─── 太阳系星体映射 ───
export const PLANET_MAP: Record<string, { name: string; nameCN: string }> = {
  '-100': { name: 'Sun', nameCN: '太阳' },
  '-101': { name: 'Moon', nameCN: '月球' },
  '-102': { name: 'Venus', nameCN: '金星' },
  '-103': { name: 'Mars', nameCN: '火星' },
  '-104': { name: 'Jupiter', nameCN: '木星' },
  '-105': { name: 'Saturn', nameCN: '土星' },
  '-106': { name: 'Mercury', nameCN: '水星' },
  '-107': { name: 'Uranus', nameCN: '天王星' },
  '-108': { name: 'Neptune', nameCN: '海王星' },
}

/** 判断是否为太阳系星体（planetId 为负数） */
export function isPlanetId(id: number): boolean {
  return String(id) in PLANET_MAP
}

/** 生成太阳系星体的叙事 Prompt（可见时） */
function buildPlanetNarrativePromptVisible(planetId: number): { system: string; user: string } {
  const planet = PLANET_MAP[String(planetId)]
  const system = `你是"星语穹庭"的星空叙事者。根据用户提供的太阳系天体信息，写一段"古今共望"叙事短文。

**你必须严格按照以下格式输出，逐字逐句，包括 # 和 > 符号：**

# 现在，你能看到{天体名}。

（一段联系古今的叙述：这颗天体在古代文明中的意义、神话传说，1~2句）

（诗人名/文明/文化）记载：

> "{相关诗句或典籍引用}"（朝代/文明·《出处》）

（对引用的解读，联系当时的社会背景、心境，1~2句）

（结尾回扣：千年以后，你也正在看同一片天空，1句）

**格式规则（必须逐条遵守）：**
1. 第一行必须以"# 现在，你能看到"开头，后跟天体名和句号
2. 每个段落之间必须空一行
3. 引用必须以"> "（大于号+空格）开头，引用内容用双引号包裹
4. 引用后面用括号标注朝代/文明和出处
5. 不要把所有内容写成一段，必须分段
6. 不要省略 # 和 > 符号

**内容要求：**
- 联系古今：提到至少一个古代文明或诗人对这颗天体的记录
- 引用相关诗词或典籍记载（一句即可，标注出处）
- 勿编造不存在的人物和诗句
- 文字优美凝练、温暖治愈，150~250字
- 结尾回扣：千年以后，你也正在看同一片天空
- 中文输出

---

**在结尾（原结尾段之后）必须追加三个小节（严格遵守顺序和格式）：**

### 🌟 这颗星藏着这些心事
#永恒 #时光 #传承 #仰望（提炼 4~6 个与天体神话、文明传承主题相关的 hashtag）

### 💭 如果这颗星会说话
（第一人称写 30~40 字独白：作为太阳系的见证者，对现在仰望它的人说的话）

### 📖 一句摘录
> "（另选一句关于这颗天体的古语/典籍/名句，不要重复上文那句）"
——（朝代/文明·出处，原创则写"——星空寄语"）`

  const user = `天体名称：${planet.nameCN}（${planet.name}）
类型：太阳系天体
当前状态：在地平线以上，肉眼可见

请为这颗天体写一段"古今共望"叙事。记住：第一行必须是 "# 现在，你能看到${planet.nameCN}。"，引用必须以 "> " 开头。`

  return { system, user }
}

/** 生成太阳系星体的叙事 Prompt（不可见时） */
function buildPlanetNarrativePromptHidden(planetId: number): { system: string; user: string } {
  const planet = PLANET_MAP[String(planetId)]
  const system = `你是"星语穹庭"的星空叙事者。根据用户提供的太阳系天体信息，写一段"古今共望"叙事短文。

**注意：这颗天体目前在地平线以下，无法直接用肉眼看到。请你如实而优美地表达这一点。**

**你必须严格按照以下格式输出，逐字逐句，包括 # 和 > 符号：**

# 现在，{天体名}正在地平线之下

它并未消失，只是暂时隐于大地的另一侧。

（一段联系古今的叙述：这颗天体在古代文明中的意义、神话传说，1~2句）

（诗人名/文明/文化）记载：

> "{相关诗句或典籍引用}"（朝代/文明·《出处》）

（对引用的解读，联系当时的社会背景、心境，1~2句）

（结尾回扣：当它再次升起，你与古人看见的，仍是同一颗星，1句）

**格式规则（必须逐条遵守）：**
1. 第一行必须以"# 现在，"开头，后跟天体名和"正在地平线之下"
2. 每个段落之间必须空一行
3. 引用必须以"> "（大于号+空格）开头，引用内容用双引号包裹
4. 引用后面用括号标注朝代/文明和出处
5. 不要把所有内容写成一段，必须分段
6. 不要省略 # 和 > 符号

**内容要求：**
- 联系古今：提到至少一个古代文明或诗人对这颗天体的记录
- 引用相关诗词或典籍记载（一句即可，标注出处）
- 勿编造不存在的人物和诗句
- 文字优美凝练、温暖治愈，150~250字
- 结尾回扣：当它再次升起，你与古人看见的，仍是同一颗星
- 中文输出`

  const user = `天体名称：${planet.nameCN}（${planet.name}）
类型：太阳系天体
当前状态：在地平线以下，无法直接看到

请为这颗天体写一段"古今共望"叙事。记住：第一行必须是 "# 现在，${planet.nameCN}正在地平线之下"，引用必须以 "> " 开头。`

  return { system, user }
}

export interface NarrativeResult {
  content: string
  cached: boolean
}

/**
 * 从 narrative.content 里**截掉结尾三个小节**（🌟藏心事 / 💭如果会说话 / 📖一句摘录），
 * 只保留中间"古今共望"正文段落，拆成数组返回。
 * 用于复用到 persona.paragraphs / 其他需要"正经叙事段"的地方。
 */
export function extractNarrativeBodyParagraphs(content: string): string[] {
  if (!content) return []
  // 找到第一个 "### 🌟" / "### 💭" / "### 📖" 的位置，整段截掉
  const idx = content.search(/###\s*(?:🌟|💭|📖)/)
  const main = (idx >= 0 ? content.slice(0, idx) : content).trim()
  // 去掉第一行标题 "# 今夜，你看到 XX。" / "# 此刻，XX 正在地平线之下"
  const withoutTitle = main.replace(/^\s*#[^\n]*\n+/, '').trim()
  return withoutTitle
    .split(/\n\s*\n/)
    .map(p => p.trim())
    // 剔除：独立的"（诗人名）写："、`> "...（朝代·出处）"` 引用行、`——...` 来源单独行
    .filter(p => {
      if (!p) return false
      if (/^\s*>\s*[""「]/.test(p)) return false
      if (/^\s*（.*?）写[：:]/.test(p)) return false
      if (/^\s*——/.test(p)) return false
      return true
    })
}

/**
 * 复用旧 AI 叙事逻辑，但**不走 narratives 表缓存也不写缓存**，
 * 只返回拆好的正文段落数组（一般 2~3 段，每段 70~150 字）。
 * 不传位置则默认地平线以上 visible=true。
 */
export async function generateNarrativeBodyOnly(catalogStarId: number, lat?: number, lng?: number, ra?: number, dec?: number): Promise<string[]> {
  // ─── 太阳系星体 ───
  if (isPlanetId(catalogStarId)) {
    let visible = true
    const hasPosition = lat !== undefined && lng !== undefined
    if (hasPosition && ra !== undefined && dec !== undefined) {
      visible = isAboveHorizon({ ra, dec }, lat, lng)
    }
    const { system, user } = visible
      ? buildPlanetNarrativePromptVisible(catalogStarId)
      : buildPlanetNarrativePromptHidden(catalogStarId)
    const content = await deepseekChat(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      // 叙事生成是 Markdown，prompt 里没有 "json" 字样 → 必须关掉 json_mode，否则 DeepSeek 400
      // 叙事对完整性要求高（诗句/段落不能被截断），固定用非思考模型 deepseek-chat
      { model: 'deepseek-chat', temperature: 0.9, maxTokens: 3000, jsonMode: false },
    )
    return extractNarrativeBodyParagraphs(content).slice(0, 3)
  }

  const star = getStarInfo(catalogStarId)
  if (!star) {
    throw Object.assign(new Error('恒星不存在'), { statusCode: 404 })
  }
  const hasPosition = lat !== undefined && lng !== undefined
  const visible = hasPosition ? isAboveHorizon(star, lat, lng) : true
  const { system, user } = buildNarrativePrompt(star, visible)
  const content = await deepseekChat(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    // 固定非思考模型：v4-flash 等思考模型输出自由文时偶发中途中断（如只输出"杜牧写："）
    { model: 'deepseek-chat', temperature: 0.9, maxTokens: 3000, jsonMode: false },
  )
  return extractNarrativeBodyParagraphs(content).slice(0, 3)
}

/**
 * 获取恒星叙事（优先缓存，无缓存则生成并缓存）
 */
export async function getNarrative(catalogStarId: number, lat?: number, lng?: number, ra?: number, dec?: number): Promise<NarrativeResult> {
  // ─── 太阳系星体：独立叙事流程 ───
  if (isPlanetId(catalogStarId)) {
    const hasPosition = lat !== undefined && lng !== undefined
    // 计算地平线可见性（需要 ra/dec 和 lat/lng）
    let visible = true
    if (hasPosition && ra !== undefined && dec !== undefined) {
      visible = isAboveHorizon({ ra, dec }, lat, lng)
    }

    // 查缓存（区分地平线上下）
    const cached = getCachedNarrative(catalogStarId, visible)
    if (cached) {
      return { content: cached, cached: true }
    }

    // 生成太阳系星体叙事（根据可见性选择 Prompt）
    const { system, user } = visible
      ? buildPlanetNarrativePromptVisible(catalogStarId)
      : buildPlanetNarrativePromptHidden(catalogStarId)
    const content = await deepseekChat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      {
        model: 'deepseek-chat',
        temperature: 0.9,
        maxTokens: 3000,
        jsonMode: false,
      },
    )

    // 缓存（仅在有位置信息时缓存，确保地平线判断正确）
    if (hasPosition) {
      cacheNarrative(catalogStarId, content, visible)
    }

    return { content, cached: false }
  }

  // 1. 查找恒星信息
  const star = getStarInfo(catalogStarId)
  if (!star) {
    throw Object.assign(new Error('恒星不存在'), { statusCode: 404 })
  }

  // 2. 计算地平线可见性
  const hasPosition = lat !== undefined && lng !== undefined
  const visible = hasPosition ? isAboveHorizon(star, lat, lng) : true

  // 3. 查缓存（区分地平线上下）
  const cached = getCachedNarrative(catalogStarId, visible)
  if (cached) {
    return { content: cached, cached: true }
  }

  // 4. 生成叙事
  const { system, user } = buildNarrativePrompt(star, visible)
  const content = await deepseekChat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    {
      model: 'deepseek-chat',
      temperature: 0.9,
      maxTokens: 3000,
      jsonMode: false,
    },
  )

  // 5. 缓存（仅在有位置信息时缓存，确保地平线判断正确）
  if (hasPosition) {
    cacheNarrative(catalogStarId, content, visible)
  }

  return { content, cached: false }
}
