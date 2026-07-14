import catalogData from '../data/stars.json'

interface CatalogStar {
  id: number
  name: string | null
  ra: number; dec: number; mag: number
  color: string; con: string
  x: number; y: number; z: number
}

const CATALOG: CatalogStar[] = (catalogData as { stars: CatalogStar[] }).stars

/** 根据名字模糊查找星表恒星；精确匹配优先于子串匹配；其次选星等更亮（数值更小）的 */
function findStar(namePattern: string): CatalogStar | null {
  const hit = CATALOG.filter(s => s.name?.includes(namePattern))
  if (hit.length === 0) return null
  const exact = hit.find(s => s.name === namePattern)
  if (exact) return exact
  return hit.reduce((a, b) => a.mag <= b.mag ? a : b)
}

/**
 * 手工映射：种子故事 → 对应的真实恒星
 * key: 故事标题 (匹配 seed.ts 中的 title)
 *
 * 核心思路：
 *   - 优先把同一颗星在不同文化中的传说聚在一起
 *     （织女星 同时承载"水调歌头 / 牛郎织女 / 天琴与竖琴"的中国/希腊书写），
 *     让用户在同一颗星上读到文明对照；
 *   - 也引入一些本就有跨文明原型的恒星 / 星座
 *     （如"恶魔之星"大陵五、北极星的岁差故事）。
 */
const SEED_STAR_MAP: Record<string, string> = {
  // ── 原 ──
  '静夜思':     '北极星 Polaris',
  '不永恒的北极': '北极星 Polaris', // 岁差 → 北极星（公元前 3000 年 → 天龙座α，现代 → 勾陈一）
  '水调歌头':   '织女星 Vega',
  '牛郎织女':   '织女星 Vega',
  '天琴与竖琴': '织女星 Vega',     // 俄耳甫斯竖琴 = 天琴座 = 织女星
  '春江花月夜': '角宿一 Spica',
  '望月怀远':   '毕宿五 Aldebaran',
  '霜月':       '参宿七 Rigel',
  '十五夜望月': '五车二 Capella',
  '月下独酌':   '玉衡 Alioth',
  '古朗月行':   '天枢 Dubhe',
  '把酒问月':   '天津四 Deneb',
  '西江月':     '轩辕十四 Regulus',
  '帝车与四乡': '天枢 Dubhe',      // 史记·天官书 → 北斗"帝车"
  '天狼星':     '天狼星 Sirius',
  '猎户座':     '参宿四 Betelgeuse',
  '天蝎座':     '心宿二 Antares',
  '双子座':     '北河三 Pollux',
  '仙女座':     '仙女座α Alpheratz',
  '北斗七星':   '天枢 Dubhe',
  '参商二星':   '参宿四 Betelgeuse',
  '深夜独白':   '南河三 Procyon',
  '异乡人':     '北落师门 Fomalhaut',
  '程序员的自白': '大角 Arcturus',
  '雨天思考':   '天璇 Merak',
  '毕业季':     '十字架二 Acrux',
  '天鹅与飞鸟': '天津四 Deneb',    // 天津四 = 天鹅尾巴（东亚视角）
  '牵牛不服箱': '牛郎星 Altair',   // 《诗经·大东》"牵牛" = 河鼓二 = 牛郎星

  // ── v2 新增 ──
  // 英仙座 β 大陵五 Algol —— 恶魔之星 / 美杜莎之首，跨文化凶星
  '恶魔之星':   '大陵五 Algol',

  // 仙后座 α（Schedar / 王良一）—— 虚荣王后被罚倒悬
  // 注：findStar 用 s.name.includes(pattern) 匹配，西方恒星 catalog 中无中文名，
  // 故 pattern 取拉丁名。中文名仅作注释。
  '仙后的惩罚': 'Schedar',

  // 白羊座 α（Hamal / 娄宿三）—— 金羊毛
  '金毛与公羊': 'Hamal',

  // 仙王座 α（Alderamin / 天钩五）—— 皇室四星座
  '皇室四星座': 'Alderamin',

  // ── 西方亮星的名字由来（v3）──────────────────────────────
  '尾刺·Shaula':        'Shaula',        // 天蝎座 λ
  '十字横臂·Gacrux':     'Gacrux',        // 南十字座 γ
  '撞角·Elnath':         'Elnath',        // 金牛座 β / 御夫座 ζ
  '平静之水·Miaplacidus': 'Miaplacidus',  // 船底座 β
  '亮者·Alnair':         'Alnair',        // 天鹤座 α
  '重量·Wezen':          'Wezen',         // 大犬座 δ
  '手肘·Mirfak':         'Mirfak',        // 英仙座 α
  '南弓·Kaus Australis': 'Kaus Australis',// 人马座 ε
  '航海家·Avior':        'Avior',         // 船底座 ε
  '古名·Sargas':         'Sargas',        // 天蝎座 θ
  '缰绳之肩·Menkalinan': 'Menkalinan',    // 御夫座 β
  '三角之首·Atria':      'Atria',         // 南三角座 α
  '印记·Alhena':         'Alhena',        // 双子座 γ
  '孔雀之首·Peacock':    'Peacock',       // 孔雀座 α
  '先驱·Mirzam':         'Mirzam',        // 大犬座 β
  '孤独者·Alphard':      'Alphard',       // 长蛇座 α
  '羔羊·Hamal':          'Hamal',         // 白羊座 α
  '狮鬃·Algieba':        'Algieba',       // 狮子座 γ
  '火星之敌·Antares':    'Antares',       // 天蝎座 α

  // ── 次亮西方星名由来（v3b）────────────────────────────────
  '狮尾·Denebola':             'Denebola',         // 狮子座 β
  '腰肋·Zosma':                'Zosma',            // 狮子座 ζ
  '第二蛙·Diphda':             'Diphda',           // 鲸鱼座 β
  '腰带·Mirach':               'Mirach',           // 仙女座 β
  '飞马之脐·Alpheratz':        'Alpheratz',        // 仙女/飞马 α
  '查理之心·Cor Caroli':      'Cor Caroli',      // 猎犬座 α
  '缠蛇者之头·Rasalhague':     'Rasalhague',      // 蛇夫座 α
  '断冕之珠·Alphecca':         'Alphecca',         // 北冕座 α
  '织带·Izar':                 'Izar',             // 牧夫座 ε
  '龙首·Eltanin':              'Eltanin',          // 天龙座 γ
  '南爪·Zubenelgenubi':        'Zubenelgenubi',   // 天秤座 α
  '弓之中段·Kaus Media':       'Kaus Media',      // 人马座 δ
  '蛇喉·Unukalhai':            'Unukalhai',       // 巨蛇座 γ
  '乌喙·Kraz':                 'Kraz',            // 乌鸦座 β
  '苍蝇座·Mus':               'Mus',              // 苍蝇座 α
  '猎鹰·Tarazed':              'Tarazed',         // 天鹰座 ζ
  '帆船·Alsephina':            'Alsephina',       // 船帆座 γ

  // ── 剩余西方亮星分组（v3c）──────────────────────────────
  '天蝎之冠·Dschubba':  'Dschubba',    // 天蝎座 δ
  '仙后之座·Schedar':   'Schedar',     // 仙后座 α
  '飞马大四方形·Enif':  'Enif',        // 飞马座 ε
  '联星之美·Almach':    'Almach',      // 仙女座 γ
  '医神之犬·Sabik':     'Sabik',       // 蛇夫座 η
  '南斗之弓·Nunki':     'Nunki',       // 人马座 σ
  '耕者之腿·Muphrid':   'Muphrid',     // 牧夫座 η
  '小熊之腰·Pherkad':   'Pherkad',     // 小熊座 γ
  '天鹅之心·Sadr':      'Sadr',        // 天鹅座 γ
  '众尾星·Gienah':      'Gienah',      // 乌鸦座 γ
  '羊角尖·Sheratan':    'Sheratan',    // 白羊座 β
  '龙尾·Rastaban':      'Rastaban',    // 天龙座 β
  '天秤双臂·Zubeneschamali':'Zubeneschamali', // 天秤座 β
  '南方补漏·HyiTuc':    ' Hyi',        // 长蛇座 β
  '南天多层命名·AraPhe':'Ankaa',       // 凤凰座 α

  // ── v3d / v3e / v3f ───────────────────────────────────────
  '第二撞角·ElnathA':            'Elnath',          // 金牛座 β Elnath
  '宇航员之花·Navi':             'Navi',            // 仙后座 γ
  '古船·Naos':                   'Naos',            // 船尾座 ζ
  '手掌·Caph':                   'Caph',            // 仙后座 β
  '火凤凰·Ankaa':                'Ankaa',           // 凤凰座 α
  '胫骨·Scheat':                 'Scheat',          // 飞马座 β
  '马腹·Algenib':                'Algenib',         // 飞马座 γ
  '马鞍·Markab':                 'Markab',          // 飞马座 α
  '天兔·Arneb':                  'Arneb',           // 天兔座 α
  '跪膝者之头·Rasalgethi':       'Rasalgethi',      // 武仙座 α
  '蝎钳·Graffias':               'Graffias',        // 天蝎座 β
  '蝎咬·Lesath':                 'Lesath',          // 天蝎座 υ
  '惊星·Mira':                   'Mira',            // 鲸鱼座 ο
  '鲸鼻·Menkar':                 'Menkar',          // 鲸鱼座 α
  '少女星群·Aludra':             'Aludra',          // 大犬座 η
  '渴驼·Nihal':                  'Nihal',           // 天兔座 β
  '贝壳星·Imai':                 'Imai',            // 南十字底座
  '山羊尾·DenebAlgedi':          'Deneb Algedi',    // 摩羯座 δ
  '宇航员帆·Regor':              'Regor',           // 船帆座 γ
  '持蛇神掌·Cebalrai':           'Cebalrai',        // 蛇夫座 θ
  '古龙·Thuban':                 'Thuban',          // 天龙座 α
  '棍棒·Kornephoros':            'Kornephoros',     // 武仙座 β
  '最幸之幸·Sadalsuud':          'Sadalsuud',       // 水瓶座 β
  '万幸之王·Sadalmelik':         'Sadalmelik',      // 水瓶座 α
  '壶腿·Skat':                   'Skat',            // 水瓶座 δ
  '熊轭·Alioth':                 'Alioth',          // 大熊座 ε
  '斗柄首领·Alkaid':             'Alkaid',          // 大熊座 η
  '熊之腰布·Mizar':              'Mizar',           // 大熊座 ζ
  '狮君·Regulus':                'Regulus',         // 狮子座 α
  '狮子脊柱·ZosmaSpin':          'Zosma',           // 狮子座 ζ
  '天鹅的彩羽·Aljanah':          'Aljanah',         // 天鹅座 ε
  '仙后之剑·Segin':              'Segin',           // 仙后座 ε
  '七姐妹之父·Atlas':            'Atlas',           // 金牛座 ζ(昴团)
  '象鼻·Hassaleh':               'Hassaleh',        // 御夫座 ι
  '狮子短须·Chertan':            'Chertan',         // 狮子座 θ
  '丰收女神组·Porrima':          'Porrima',         // 室女座 γ
  '山羊分叉·Dabih':              'Dabih',           // 摩羯座 β
  '牧夫第二膝·Seginus':          'Seginus',         // 牧夫座 γ
  '射手之臂·Ascella':            'Ascella',         // 人马座 ζ
  '环鸽·Phact':                  'Phact',           // 天鸽座 α
  '联结·Alrescha':               'Alrescha',        // 双鱼座 α
  '武仙左足座·Rasalgethi2':      'Rasalgethi',      // 武仙座 α
  '蟹钳·Acubens':                'Acubens',         // 巨蟹座 α
  '蟹目·Altarf':                 'Altarf',          // 巨蟹座 β
  '狮子裙角·Zaniah':             'Zaniah',          // 室女座 η
  '坠落的星·Wasat':              'Wasat',           // 双子座 δ
  '空杯·Alkes':                  'Alkes',           // 巨爵座 α
  '盾击·Rukbat':                 'Rukbat',          // 人马座 β
  '画架与望远镜·PicDor':         'Pic',             // 绘架座 α
  '仙王之子·Alfirk':             'Alfirk',          // 仙王座 β
  '独角兽与幼狮·CamLMi':         '46 LMi',         // 小狮座
  '箭与狐·SgeVul':               'Sge',             // 天箭座 α
  '度量之具·SexAnt':            'Sex',             // 六分仪座 α
  '炉火与淬火·ForInd':           'For',             // 天炉座 α
  '南角小众·MenTrA':             'α Men',           // 山案座 α（精确匹配；不与 Menkar/Menkalinan 冲突）
  '水蛇与巨嘴鸟·TucHyiAra':       'Tuc',             // 杜鹃座 α
  '近代南天极小星补遗·IndCrA':   'Ind',             // 印第安座 α

  // ── v3g 全量收尾 ─────────────────────────────────────────
  '天鹅左翼·Fawaris':         'Fawaris',         // 天鹅座 δ
  '仙后裙摆·Ruchbah':         'Ruchbah',         // 仙后座 δ
  '新收妇人·Vindemiatrix':    'Vindemiatrix',    // 室女座 ε
  '祭坛火·AraBeta':           'Ara',             // 祭坛座 β
  '祭坛火二·AraBeta2':        ' Ara',            // 祭坛座 β（id=133）
  '天鹅金喉·Albireo':         'Albireo',         // 天鹅座 β
  '双子的爪子·Mebsuta':       'Mebsuta',         // 双子座 ε
  '鹿角之尖·Sheratan2':       'Ari',             // 白羊座 β
  '印度孤星·IndAlpha':        'Ind',             // 印第安座 α
  '天猫之眼·LynAlpha':        'Lyn',             // 天猫座 α
  '圆规之轴·CirAlpha':        'Cir',             // 圆规座 α
  '琴上之龟·Sulafat':         'Sulafat',         // 天琴座 γ
  '剑鱼之牙·DorAlpha':        'Dor',             // 剑鱼座 α
  '网罟·RetAlpha':            'Ret',             // 网罟座 α
  '三角之首·TriAlpha':        'Tri',             // 三角座 α
  '琴弦·Sheliak':             'Sheliak',         // 天琴座 β
  '海豚献词·Rotanev':         'Rotanev',         // 海豚座 β
  '罗盘卡尺·PyxAlpha':        'Pyx',             // 罗盘座 α
  '昴团之母·Electra':         'Electra',         // 金牛座 η(昴团)
  '茶隼·Alshain':             'Alshain',         // 天鹰座 β
  '天鹅泡·LacAlpha':          'Lac',             // 蝎虎座 α
  '麒麟之角·MonBeta':         'Mon',             // 麒麟座 β
  '海豚反写·Sualocin':        'Sualocin',        // 海豚座 α
  '小狮第四十六·LMi46':       '46 LMi',         // 小狮座
  '炉火之焰·ForAlpha':        'For',             // 天炉座 α
  '南极之路·ApsAlpha':        'Aps',             // 天燕座 α
  '盾火星·SctAlpha':          'Sct',             // 盾牌座 α
  '昴团长女·Maia':            'Maia',            // 金牛座 ζ(昴团)
  '小马方尖碑·Kitalpha':      'Kitalpha',        // 小马座 α
  '麒麟之首·MonAlpha':        'Mon',             // 麒麟座 α
  '蝘蜓之首·ChaAlpha':        'Cha',             // 蝘蜓座 α
  '昴团五妹·Merope':          'Merope',          // 金牛座 η(昴团)
  '后发之冠·ComBeta':         'Com',             // 后发座 β
  '昴团四妹·Taygeta':         'Taygeta',         // 金牛座 ζ(昴团)
  '勺形之槽·SclAlpha':        'Scl',             // 玉夫座 α
  '狐狸之焰·VulAlpha':        'Vul',             // 狐狸座 α
  '雕具沉默·CaeAlpha':        'Cae',             // 雕具座 α
}

// ─── 补充：新故事所用到的星表精确名称（findStar 模糊匹配用）───
// 以上 findStar 用 s.name?.includes(key) 匹配，故 key 必须是 stars.json
// 中 name 字段包含的片段 —— 这里列出以防后续维护者困惑：
//   '大陵五 Algol'   → stars.json 含 'Algol'
//   '王良一 Schedar' → stars.json 含 'Schedar'
//   '娄宿三 Hamal'   → stars.json 含 'Hamal'
//   '天钩五 Alderamin' → stars.json 含 'Alderamin'
//   '河鼓二 Altair'  → stars.json 含 'Altair'
// 若 stars.json 中实际字段有出入，请同步本表。

/**
 * 根据种子故事标题找到对应的星表恒星 ID
 */
export function getSeedStarId(title: string): number | null {
  const starName = SEED_STAR_MAP[title]
  if (!starName) return null
  const star = findStar(starName)
  return star?.id ?? null
}

/**
 * 为用户投递的故事随机分配一颗未命名的暗星
 * 优先选亮度适中的星 (mag 3.5~5.5)
 */
let userStarCursor = 0

export function assignUserStar(): CatalogStar {
  // 收集所有未命名且星等在 3.5~5.5 之间的星
  const pool = CATALOG.filter(s => !s.name && s.mag >= 3.5 && s.mag <= 5.5)
  if (pool.length === 0) {
    // 兜底：所有未命名星
    const fallback = CATALOG.filter(s => !s.name)
    return fallback[Math.floor(Math.random() * fallback.length)]
  }
  // 均匀分配（用 cursor 轮转，避免重复分到同一颗星）
  const star = pool[userStarCursor % pool.length]
  userStarCursor++
  return star
}

/**
 * 根据后端 pos_x/pos_y/pos_z 找最近的真实恒星（用于兼容无映射的数据）
 */
export function findNearestCatalogStar(px: number, py: number, pz: number): CatalogStar {
  let best = CATALOG[0]
  let minDist = Infinity
  for (const s of CATALOG) {
    const dx = s.x - px
    const dy = s.y - py
    const dz = s.z - pz
    const d = dx * dx + dy * dy + dz * dz
    if (d < minDist) { minDist = d; best = s }
  }
  return best
}
