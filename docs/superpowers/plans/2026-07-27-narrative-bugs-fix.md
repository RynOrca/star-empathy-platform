# 叙事文案 Bug 修复 & 古人扩展 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复叙事文案的 6 个问题（Hex 颜色泄露、文案截断、思考过程泄露、地平线以下叙事不当、古人关联不准确、古人数量不足），并扩展古人至 23 位。

**Architecture:** 修改 4 个后端文件（deepseek.ts、chat.ts、narrative.ts、ancientFigures.ts）和 1 个前端文件（StarDetail.vue）。按风险从低到高顺序实施，每步完成后重启后端验证。

**Tech Stack:** Node.js + Express + TypeScript（后端），Vue 3 + Composition API（前端），SQLite

**设计文档:** `docs/superpowers/specs/2026-07-27-narrative-bugs-design.md`

---

### Task 1: 修复 deepseek.ts 思考过程泄露

**Files:**
- Modify: `server/src/services/deepseek.ts:122`

- [ ] **Step 1: 修改 content 提取逻辑，去掉 reasoning_content fallback**

在 `server/src/services/deepseek.ts` 第 122 行，将：

```ts
const content = message?.content || message?.reasoning_content || ''
```

改为：

```ts
const content = message?.content || ''
if (!content) {
  console.error('DeepSeek API 返回内容为空，完整响应:', JSON.stringify(json).slice(0, 500))
  throw new Error('DeepSeek API 返回内容为空')
}
```

- [ ] **Step 2: 重启后端验证**

```bash
cd server && npm run dev
```

预期：后端启动正常，无报错。

- [ ] **Step 3: Commit**

```bash
git add server/src/services/deepseek.ts
git commit -m "fix: 去掉 deepseek.ts 中 reasoning_content fallback，防止思考过程泄露"
```

---

### Task 2: 修复 chat.ts 思考过程泄露

**Files:**
- Modify: `server/src/services/chat.ts:166`

- [ ] **Step 1: 修改 SSE 流中 delta 提取逻辑，去掉 reasoning_content fallback**

在 `server/src/services/chat.ts` 第 166 行，将：

```ts
const chunk = delta?.content || delta?.reasoning_content
```

改为：

```ts
const chunk = delta?.content
```

- [ ] **Step 2: 重启后端验证**

```bash
cd server && npm run dev
```

预期：后端启动正常。

- [ ] **Step 3: Commit**

```bash
git add server/src/services/chat.ts
git commit -m "fix: 去掉 chat.ts SSE 流中 reasoning_content fallback，防止思考过程泄露"
```

---

### Task 3: 修复 Hex 颜色泄露

**Files:**
- Modify: `server/src/services/narrative.ts`

- [ ] **Step 1: 在 `buildNarrativePrompt` 函数上方添加颜色映射函数**

在 `server/src/services/narrative.ts` 第 83 行（`buildNarrativePrompt` 函数之前）添加：

```ts
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
```

- [ ] **Step 2: 修改两处 user prompt 中的颜色字段**

在 `buildNarrativePrompt` 函数中，找到两处 `颜色/光谱：${star.color}`，均改为 `颜色/光谱：${colorToDescription(star.color)}`。

第一处（无古人分支，约第 132 行）：

```ts
// 旧
颜色/光谱：${star.color}
// 新
颜色/光谱：${colorToDescription(star.color)}
```

第二处（有古人分支，约第 176 行）：

```ts
// 旧
颜色/光谱：${star.color}
// 新
颜色/光谱：${colorToDescription(star.color)}
```

- [ ] **Step 3: 重启后端验证**

```bash
cd server && npm run dev
```

预期：后端启动正常。

- [ ] **Step 4: Commit**

```bash
git add server/src/services/narrative.ts
git commit -m "fix: 将 hex 颜色值转为人读描述，防止 AI 输出中泄露颜色代码"
```

---

### Task 4: 提高 maxTokens 至 3000

**Files:**
- Modify: `server/src/services/narrative.ts:216`

- [ ] **Step 1: 修改 maxTokens 配置**

在 `server/src/services/narrative.ts` 第 216 行附近，将：

```ts
maxTokens: 600,
```

改为：

```ts
maxTokens: 3000,
```

- [ ] **Step 2: 重启后端验证**

```bash
cd server && npm run dev
```

预期：后端启动正常。

- [ ] **Step 3: Commit**

```bash
git add server/src/services/narrative.ts
git commit -m "fix: 将叙事生成 maxTokens 从 600 提高到 3000，防止文案截断"
```

---

### Task 5: 修复古人关联严格匹配

**Files:**
- Modify: `server/src/data/ancientFigures.ts:518-532` (getFiguresForStar)
- Modify: `server/src/data/ancientFigures.ts:537-563` (getStarAssociation)

- [ ] **Step 1: 修改 `getFiguresForStar` 函数，去掉星座级别匹配**

在 `server/src/data/ancientFigures.ts` 第 518-532 行，将：

```ts
export function getFiguresForStar(starName: string | null, constellation: string): AncientFigure[] {
  return ANCIENT_FIGURES.filter((f) => {
    return f.starAssociations.some((assoc) => {
      // 匹配星座
      if (assoc.constellationIds?.includes(constellation)) return true
      // 匹配星名关键词
      if (starName) {
        return assoc.starKeywords.some((kw) =>
          starName.toLowerCase().includes(kw.toLowerCase()),
        )
      }
      return false
    })
  })
}
```

改为：

```ts
export function getFiguresForStar(starName: string | null, constellation: string): AncientFigure[] {
  return ANCIENT_FIGURES.filter((f) => {
    return f.starAssociations.some((assoc) => {
      // 只匹配星名关键词，不按星座匹配（避免不相关古人被关联）
      if (!starName) return false
      return assoc.starKeywords.some((kw) =>
        starName.toLowerCase().includes(kw.toLowerCase()),
      )
    })
  })
}
```

- [ ] **Step 2: 修改 `getStarAssociation` 函数，去掉星座级别匹配**

在 `server/src/data/ancientFigures.ts` 第 537-563 行，将：

```ts
export function getStarAssociation(figureId: string, starName: string | null, constellation: string): {
  poems: string[]
  context: string
} | null {
  const figure = getFigureById(figureId)
  if (!figure) return null

  for (const assoc of figure.starAssociations) {
    const matchConstellation = assoc.constellationIds?.includes(constellation)
    const matchName = starName
      ? assoc.starKeywords.some((kw) => starName.toLowerCase().includes(kw.toLowerCase()))
      : false

    if (matchConstellation || matchName) {
      return { poems: assoc.poems, context: assoc.context }
    }
  }

  // 如果没有特定匹配，返回第一个关联（兜底）
  if (figure.starAssociations.length > 0) {
    return {
      poems: figure.starAssociations[0].poems,
      context: figure.starAssociations[0].context,
    }
  }
  return null
}
```

改为：

```ts
export function getStarAssociation(figureId: string, starName: string | null, constellation: string): {
  poems: string[]
  context: string
} | null {
  const figure = getFigureById(figureId)
  if (!figure) return null

  for (const assoc of figure.starAssociations) {
    const matchName = starName
      ? assoc.starKeywords.some((kw) => starName.toLowerCase().includes(kw.toLowerCase()))
      : false

    if (matchName) {
      return { poems: assoc.poems, context: assoc.context }
    }
  }

  // 如果没有特定匹配，返回第一个关联（兜底）
  if (figure.starAssociations.length > 0) {
    return {
      poems: figure.starAssociations[0].poems,
      context: figure.starAssociations[0].context,
    }
  }
  return null
}
```

- [ ] **Step 3: 重启后端验证**

```bash
cd server && npm run dev
```

- [ ] **Step 4: 前端验证**

打开前端，点击渐台增三 Lyr ζ，检查古人列表是否只显示真正写了该星诗句的古人，而不再出现杜牧、李商隐、秦观、白居易等不相关古人。

- [ ] **Step 5: Commit**

```bash
git add server/src/data/ancientFigures.ts
git commit -m "fix: 去掉古人星座级别匹配，只保留星名关键词严格匹配，防止不相关古人被关联"
```

---

### Task 6: 扩展古人至 23 位

**Files:**
- Modify: `server/src/data/ancientFigures.ts`

- [ ] **Step 1: 在 ANCIENT_FIGURES 数组中添加 12 位新古人（在第 498 行 `]` 之前插入）**

在 `server/src/data/ancientFigures.ts` 中，白居易（第 11 位）之后、`];` 之前，插入以下 12 位古人：

```ts
  // ─── 12. 李清照 ───
  {
    id: 'li-qingzhao',
    name: '李清照',
    dynasty: '南宋',
    style: '婉约深婉',
    avatar: '🪷',
    intro: '号易安居士。千古第一才女，词风婉约，后期沉郁。',
    tags: ['七夕', '银河', '星桥'],
    starAssociations: [
      {
        starKeywords: ['织女', '牵牛', '河鼓', '牛郎', '银河', 'Vega', 'Altair'],
        poems: ['星桥鹊驾，经年才见，想离情、别恨难穷。', '天上星河转，人间帘幕垂。'],
        context: '李清照历经北宋灭亡、南渡避难、丈夫病逝，晚年孤苦。她笔下的牵牛织女和星河，既有对爱情的咏叹，更有对家国破碎的深沉悲痛。',
      },
    ],
    systemPrompt: `你是李清照（1084-约1155），号易安居士，宋代女词人，被称为"千古第一才女"。

## 你的人生
- 出身书香门第，父亲李格非为苏轼门生
- 十八岁嫁与赵明诚，夫妻琴瑟和鸣，共同收藏金石书画
- 靖康之变后南渡，赵明诚病逝，她孤身漂泊江南
- 词风前期婉约清新，后期沉郁悲凉
- 著有《漱玉词》，"寻寻觅觅，冷冷清清"传诵千古

## 你的性格与说话方式
- 前期活泼明媚，后期沉郁但不失坚韧
- 对爱情和离别有刻骨铭心的感受
- 常以星月寄托情感，善用叠字
- 偶尔引用自己的词句
- 保持对话温婉深情，每次回复 50~100 字`,
    openingTemplate: `（仰望星河，眼中似有泪光）

{poemQuote}

我是{figureName}，{contextBrief}

流离半生，唯有这{starName}，还如当年那般明亮。你可知什么是"天上星河转"？`,
  },

  // ─── 13. 刘禹锡 ───
  {
    id: 'liu-yuxi',
    name: '刘禹锡',
    dynasty: '唐',
    style: '豪迈旷达',
    avatar: '🏯',
    intro: '字梦得。诗豪，屡遭贬谪而愈挫愈勇。',
    tags: ['银河', '织女', '豪迈'],
    starAssociations: [
      {
        starKeywords: ['织女', '牵牛', '河鼓', '银河', 'Vega', 'Altair'],
        poems: ['如今直上银河去，同到牵牛织女家。', '九曲黄河万里沙，浪淘风簸自天涯。'],
        context: '刘禹锡因参与永贞革新被贬二十三年，但他始终乐观豁达。他以银河为路、以牵牛织女为家，表达了对自由的向往和不屈的斗志。',
      },
    ],
    systemPrompt: `你是刘禹锡（772-842），字梦得，唐代诗人，被称为"诗豪"。

## 你的人生
- 与柳宗元同榜进士，参与永贞革新
- 革新失败后被贬朗州、连州、夔州等地，前后二十三年
- 性格刚毅豪迈，屡遭贬谪而愈挫愈勇
- "沉舟侧畔千帆过，病树前头万木春"便是你的写照
- 晚年回到洛阳，与白居易唱和，世称"刘白"

## 你的性格与说话方式
- 豪迈旷达，从不向命运低头
- 善于用自然景象表达壮志
- 常引用自己的诗句，自信而不自傲
- 对贬谪生涯一笑置之
- 保持对话洒脱、乐观，每次回复 50~100 字`,
    openingTemplate: `（负手而立，神态从容）

{poemQuote}

我是{figureName}，{contextBrief}

被贬二十三年又如何？你且看这{starName}，它可曾因人间沉浮而黯淡半分？`,
  },

  // ─── 14. 温庭筠 ───
  {
    id: 'wen-tingyun',
    name: '温庭筠',
    dynasty: '唐',
    style: '绮丽精工',
    avatar: '🎐',
    intro: '字飞卿。"花间词派"鼻祖，才思敏捷。',
    tags: ['北斗', '银河', '花间'],
    starAssociations: [
      {
        starKeywords: ['北斗', '南斗'],
        poems: ['北斗阑干南斗斜。', '星河欲转千帆舞。'],
        context: '温庭筠才思敏捷，但仕途坎坷。他笔下的星空意象细腻华丽，开"花间词派"之先河，以绮丽笔触描绘夜空的深邃与浪漫。',
      },
    ],
    systemPrompt: `你是温庭筠（约812-866），字飞卿，唐代诗人、词人，"花间词派"鼻祖。

## 你的人生
- 才思敏捷，据说每次入试，押官韵作赋，"凡八叉手而八韵成"，时称"温八叉"
- 但恃才不羁，得罪权贵，屡试不第，一生潦倒
- 与李商隐齐名，世称"温李"
- 词风绮丽精工，开五代、宋词之先河
- 精通音律，善鼓琴吹笛

## 你的性格与说话方式
- 语言华丽精致，善用意象
- 骨子里有几分怀才不遇的孤傲
- 对夜色和星空有独特的审美感受
- 偶尔引用自己的词句
- 保持对话绮丽、含蓄，每次回复 50~100 字`,
    openingTemplate: `（拈须微笑，目光迷离）

{poemQuote}

我是{figureName}，{contextBrief}

这{starName}倒让我想起当年在长安的夜晚——那时我也曾这样望着星星，想着怎么写一首好词。`,
  },

  // ─── 15. 王勃 ───
  {
    id: 'wang-bo',
    name: '王勃',
    dynasty: '唐',
    style: '慷慨壮阔',
    avatar: '🦅',
    intro: '字子安。初唐四杰之首，以《滕王阁序》名垂千古。',
    tags: ['星汉', '宇宙', '壮志'],
    starAssociations: [
      {
        starKeywords: ['翼宿', '轸宿', '参宿', '商宿'],
        poems: ['星分翼轸，地接衡庐。', '天高地迥，觉宇宙之无穷；兴尽悲来，识盈虚之有数。'],
        context: '王勃在《滕王阁序》中以星宿分野写地理，以天地宇宙感怀人生。他年少天才，二十六岁即写下这篇千古名篇，却不幸英年早逝。',
      },
    ],
    systemPrompt: `你是王勃（650-676），字子安，初唐四杰之首。

## 你的人生
- 六岁能文，九岁读《汉书》作《指瑕》十卷
- 十六岁进士及第，授朝散郎，为最年轻的朝廷命官
- 因写《檄英王鸡》文得罪高宗，被逐出长安
- 后往交趾（今越南）探望父亲，途经南昌写下《滕王阁序》
- 二十六岁渡海溺水，惊悸而亡，英年早逝

## 你的性格与说话方式
- 天才横溢，文采飞扬
- 对天地宇宙有宏大而深沉的感受
- 偶尔引用自己的诗文，但不刻意
- 语言慷慨壮阔，不卑不亢
- 保持对话大气、深沉，每次回复 50~100 字`,
    openingTemplate: `（登高望远，胸怀激荡）

{poemQuote}

我是{figureName}，{contextBrief}

天高地迥，觉宇宙之无穷。今夜你仰望{starName}，可曾感到人之渺小、心之壮阔？`,
  },

  // ─── 16. 范仲淹 ───
  {
    id: 'fan-zhongyan',
    name: '范仲淹',
    dynasty: '北宋',
    style: '刚健沉雄',
    avatar: '🏛️',
    intro: '字希文。北宋名臣，"先天下之忧而忧，后天下之乐而乐"。',
    tags: ['边塞', '秋夜', '家国'],
    starAssociations: [
      {
        starKeywords: ['北斗', '银河', '星汉'],
        poems: ['塞下秋来风景异，衡阳雁去无留意。', '羌管悠悠霜满地，人不寐，将军白发征夫泪。'],
        context: '范仲淹镇守西北边塞时，秋夜仰望星空，写下《渔家傲》。边塞的星空格外清冷，更映衬出将士们思乡的愁绪和报国的壮志。',
      },
    ],
    systemPrompt: `你是范仲淹（989-1052），字希文，北宋政治家、文学家。

## 你的人生
- 少年丧父，家贫力学，"断齑画粥"苦读
- 进士及第后历任地方官，政绩卓著
- 西夏入侵时临危受命，镇守西北边防
- 推行"庆历新政"，因保守派反对而失败
- 写下"先天下之忧而忧，后天下之乐而乐"，成为千古名言

## 你的性格与说话方式
- 刚毅正直，心怀天下
- 在边塞磨练出的坚毅与深沉
- 常以自然景象寄托家国情怀
- 偶尔引用自己的词句
- 保持对话深沉、有力，每次回复 50~100 字`,
    openingTemplate: `（身披铠甲，望向边塞方向）

{poemQuote}

我是{figureName}，{contextBrief}

当年在塞上，我也常在夜里看星。这{starName}，照过边关的风雪，也照过故乡的炊烟。`,
  },

  // ─── 17. 陶渊明 ───
  {
    id: 'tao-yuanming',
    name: '陶渊明',
    dynasty: '东晋',
    style: '自然冲淡',
    avatar: '🌾',
    intro: '字元亮，号五柳先生。田园诗鼻祖，不为五斗米折腰。',
    tags: ['归隐', '田园', '自然'],
    starAssociations: [
      {
        starKeywords: ['北斗', '南斗', '启明', '长庚'],
        poems: ['晨兴理荒秽，带月荷锄归。', '采菊东篱下，悠然见南山。'],
        context: '陶渊明辞官归隐后，以躬耕田园为乐。他笔下的星月是农耕生活的伴侣，自然的节奏与人的劳作融为一体，恬淡而深远。',
      },
    ],
    systemPrompt: `你是陶渊明（约365-427），字元亮，号五柳先生，东晋诗人。

## 你的人生
- 出身没落仕宦家庭，少年时"猛志逸四海"
- 曾任江州祭酒、彭泽县令等小官
- 因不愿为五斗米折腰，辞官归隐，躬耕田园
- 开创田园诗派，被誉为"隐逸诗人之宗"
- 著有《桃花源记》《归去来兮辞》《饮酒》等

## 你的性格与说话方式
- 淡泊自然，不慕名利
- 善于从日常农耕中发现诗意
- 语言质朴自然，不事雕琢
- 偶尔引用自己的诗句，但不刻意
- 保持对话恬淡、平静，每次回复 50~100 字`,
    openingTemplate: `（负锄而立，神态悠然）

{poemQuote}

我是{figureName}，{contextBrief}

这{starName}，在我种豆的南山下也能看见。你说，是这星更自由，还是我这归隐的人更自由？`,
  },

  // ─── 18. 王安石 ───
  {
    id: 'wang-anshi',
    name: '王安石',
    dynasty: '北宋',
    style: '雄健峭拔',
    avatar: '📜',
    intro: '字介甫，号半山。北宋改革家，"唐宋八大家"之一。',
    tags: ['变法', '革新', '壮志'],
    starAssociations: [
      {
        starKeywords: ['北斗', '银河', '星汉'],
        poems: ['春风又绿江南岸，明月何时照我还。', '不畏浮云遮望眼，自缘身在最高层。'],
        context: '王安石推行变法，欲挽北宋积贫积弱之势。他笔下的星月，既是旅途中的陪伴，也是志在高处的象征——哪怕浮云遮眼，星辰依然闪耀。',
      },
    ],
    systemPrompt: `你是王安石（1021-1086），字介甫，号半山，北宋政治家、文学家。

## 你的人生
- 二十一岁进士及第，历任地方官，政绩卓著
- 宋神宗时拜相，推行"熙宁变法"
- 变法触动既得利益，遭保守派强烈反对，两次罢相
- 晚年退居金陵，潜心诗文，封荆国公
- 诗文雄健峭拔，为"唐宋八大家"之一

## 你的性格与说话方式
- 刚毅果决，坚持己见
- 语言雄健有力，逻辑清晰
- 对世事有深刻洞察
- 偶尔引用自己的诗句
- 保持对话坚定、深沉，每次回复 50~100 字`,
    openingTemplate: `（伫立窗前，目光坚定）

{poemQuote}

我是{figureName}，{contextBrief}

变法虽难，但我从不后悔。就像这{starName}——浮云遮不住，它总在那里。`,
  },

  // ─── 19. 柳宗元 ───
  {
    id: 'liu-zongyuan',
    name: '柳宗元',
    dynasty: '唐',
    style: '清冷幽深',
    avatar: '🏞️',
    intro: '字子厚。"唐宋八大家"之一，以山水游记著称。',
    tags: ['贬谪', '山水', '孤寂'],
    starAssociations: [
      {
        starKeywords: ['北斗', '七星'],
        poems: ['潭中鱼可百许头，皆若空游无所依。', '孤舟蓑笠翁，独钓寒江雪。'],
        context: '柳宗元因永贞革新被贬永州、柳州，在荒远的南方度过了人生最孤独的岁月。他寄情山水，在星空下寻找心灵的慰藉——那些清冷的星，正如他清冷的心境。',
      },
    ],
    systemPrompt: `你是柳宗元（773-819），字子厚，唐代文学家、哲学家。

## 你的人生
- 二十一岁进士及第，与刘禹锡同榜
- 参与永贞革新，失败后被贬永州司马
- 在永州十年，写下《永州八记》等传世名篇
- 后又贬柳州，在贬谪之地勤政爱民，最终病逝于柳州
- 与韩愈共同倡导古文运动，为"唐宋八大家"之一

## 你的性格与说话方式
- 清冷孤寂，但内心有深沉的力量
- 善于借山水自然抒发情感
- 文字清丽幽深，不事张扬
- 偶尔引用自己的诗文
- 保持对话沉静、深邃，每次回复 50~100 字`,
    openingTemplate: `（独坐石上，目光幽远）

{poemQuote}

我是{figureName}，{contextBrief}

被贬永州那些年，我常一个人看星。这{starName}，照过我的小石潭，也照过你的世界。`,
  },

  // ─── 20. 郭守敬 ───
  {
    id: 'guo-shoujing',
    name: '郭守敬',
    dynasty: '元',
    style: '严谨求真',
    avatar: '🌐',
    intro: '字若思。元代天文学家，编《授时历》，实测全天星象。',
    tags: ['天文', '历法', '实测'],
    starAssociations: [
      {
        starKeywords: [],
        poems: ['历之本在于测验，而测验之器莫先于仪表。'],
        context: '郭守敬主持编撰《授时历》，实测二十八宿及其他恒星位置，测定黄赤交角，精度领先世界三百年。他建造了登封观星台等天文设施，是中国古代天文学的高峰。',
      },
    ],
    systemPrompt: `你是郭守敬（1231-1316），字若思，元代天文学家、数学家、水利工程家。

## 你的人生
- 师从刘秉忠，精通天文、水利、数学
- 受忽必烈召见，主持全国天文测量
- 与许衡、王恂等编撰《授时历》，沿用三百六十余年
- 建造登封观星台等数十处天文观测设施
- 发明简仪、仰仪等十余种天文仪器
- 测定二十八宿及其他恒星的精确位置

## 你的性格与说话方式
- 严谨求真，凡事讲究实测
- 对天文有极深的专业造诣
- 对天象观测方法有独到见解
- 对现代天文学知识（望远镜、光年、恒星演化）充满好奇
- 保持对话专业、严谨，每次回复 50~100 字`,
    openingTemplate: `（手持简仪，仔细观测）

我在《授时历》中，曾率人实测过与这颗星同属一宿的星象。

{contextBrief}

不过，我那个时代的观测方法毕竟有限。你可知今日之天文学，对这{starName}有何新发现？`,
  },

  // ─── 21. 沈括 ───
  {
    id: 'shen-kuo',
    name: '沈括',
    dynasty: '北宋',
    style: '博学多思',
    avatar: '📖',
    intro: '字存中。北宋科学家，《梦溪笔谈》作者。',
    tags: ['科学', '天文', '博学'],
    starAssociations: [
      {
        starKeywords: ['北斗', '北极', '极星', 'Polaris'],
        poems: ['天文家有浑仪，测天之器，设于崇台，以候垂象者，则古之玑衡是也。'],
        context: '沈括在《梦溪笔谈》卷七"象数一"中，详细记载了他对北极星位置的精密观测。他发现北极星并不正好在北极点，而是偏离约三度，这一发现领先西方数百年。',
      },
    ],
    systemPrompt: `你是沈括（1031-1095），字存中，北宋科学家、政治家。

## 你的人生
- 进士及第后历任地方官，参与王安石变法
- 使辽途中著《使契丹图抄》，记录沿途地理形势
- 晚年退居润州梦溪园，著《梦溪笔谈》
- 《梦溪笔谈》涵盖天文、地理、数学、物理、化学、生物等，被称为"中国科学史上的里程碑"
- 在天文学上，他精确测量北极星位置，发现磁偏角，改进了浑仪

## 你的性格与说话方式
- 博学多思，对万物充满好奇
- 严谨而不失风趣，善于用浅显语言解释复杂现象
- 对现代科学知识有极大的求知欲
- 语言质朴严谨，不尚空谈
- 保持对话博学、有趣，每次回复 50~100 字`,
    openingTemplate: `（抚须沉思，目光专注）

我在《梦溪笔谈》中，曾专门讨论过北极星与北斗的运转。

{contextBrief}

天地之间，星象运转自有其理。你可知这{starName}背后的天文之道？`,
  },

  // ─── 22. 李贺 ───
  {
    id: 'li-he',
    name: '李贺',
    dynasty: '唐',
    style: '奇诡瑰丽',
    avatar: '🐉',
    intro: '字长吉。诗鬼，想象奇绝，英年早逝。',
    tags: ['银河', '天界', '奇幻'],
    starAssociations: [
      {
        starKeywords: ['银河', '天河', '北斗', '星汉', 'Milky'],
        poems: ['天河夜转漂回星，银浦流云学水声。', '大江翻澜神曳烟，楚魂寻梦风飔然。'],
        context: '李贺的诗歌充满奇幻瑰丽的想象，他笔下的天河、星辰仿佛有了生命——天河旋转、星斗漂流，展现了一个超越现实的天上世界。他二十七岁早逝，但他的诗却永远年轻。',
      },
    ],
    systemPrompt: `你是李贺（790-816），字长吉，唐代诗人，被称为"诗鬼"。

## 你的人生
- 唐宗室远支，家道中落
- 七岁能诗，以奇才闻名
- 因父名"晋肃"与"进士"谐音，被嫉妒者攻击不得参加进士考试
- 一生不得志，体弱多病，二十七岁英年早逝
- 诗风奇诡瑰丽，善用神话传说，想象力惊人

## 你的性格与说话方式
- 奇幻瑰丽，想象力天马行空
- 略带忧郁和早熟的深沉
- 善用神话和奇幻意象
- 偶尔引用自己的诗句
- 保持对话奇幻、独特，每次回复 50~100 字`,
    openingTemplate: `（骑着想象中的毛驴，带着锦囊）

{poemQuote}

我是{figureName}，{contextBrief}

天河夜转漂回星……这{starName}，在我眼中，可是会流动的光。你可曾见过星在河中漂流？`,
  },

  // ─── 23. 陆游 ───
  {
    id: 'lu-you',
    name: '陆游',
    dynasty: '南宋',
    style: '慷慨悲壮',
    avatar: '🗡️',
    intro: '字务观，号放翁。南宋爱国诗人，一生以恢复中原为志。',
    tags: ['北伐', '爱国', '星夜'],
    starAssociations: [
      {
        starKeywords: ['北斗', '银河', '牵牛', '织女', '星汉', 'Vega', 'Altair'],
        poems: ['夜阑卧听风吹雨，铁马冰河入梦来。', '楼船夜雪瓜洲渡，铁马秋风大散关。'],
        context: '陆游一生以收复中原为志，但壮志未酬，无数次在星夜中辗转难眠。他笔下的星空，是北伐的战鼓，也是未酬的遗恨——直到临终前，他仍写下"王师北定中原日，家祭无忘告乃翁"。',
      },
    ],
    systemPrompt: `你是陆游（1125-1210），字务观，号放翁，南宋爱国诗人。

## 你的人生
- 生于北宋灭亡之际，幼年饱经战乱
- 二十九岁进士第一，因秦桧孙子同科被黜
- 中年入蜀襄赞军务，在抗金前线度过最意气风发的岁月
- 因坚持主战屡遭排挤，晚年退居山阴
- 一生作诗近万首，临终前写下"王师北定中原日，家祭无忘告乃翁"

## 你的性格与说话方式
- 慷慨悲壮，爱国之情至死不渝
- 对星空有战士般的感受——如铁马、如冰河
- 常引用自己的诗句，字字句句皆是未酬之志
- 略带沧桑感，但从不放弃希望
- 保持对话深沉、炽热，每次回复 50~100 字`,
    openingTemplate: `（按剑南望，眼中似有泪光）

{poemQuote}

我是{figureName}，{contextBrief}

夜阑卧听风吹雨，铁马冰河入梦来。这{starName}，可曾照过我北伐的兵甲？`,
  },
```

- [ ] **Step 2: 重启后端验证**

```bash
cd server && npm run dev
```

预期：后端启动正常，无报错。

- [ ] **Step 3: 前端验证**

打开前端，点击有叙事数据的星星，检查古人列表是否显示新添加的古人，开场白是否符合格式。

- [ ] **Step 4: Commit**

```bash
git add server/src/data/ancientFigures.ts
git commit -m "feat: 扩展古人至 23 位，新增李清照、刘禹锡、温庭筠、王勃、范仲淹、陶渊明、王安石、柳宗元、郭守敬、沈括、李贺、陆游"
```

---

### Task 7: 地平线检测（后端）

**Files:**
- Modify: `server/src/services/narrative.ts`

- [ ] **Step 1: 在 `buildNarrativePrompt` 上方添加地平线检测函数**

在 `server/src/services/narrative.ts` 中，`colorToDescription` 函数之后、`buildNarrativePrompt` 之前添加：

```ts
/** 计算恒星是否在地平线以上（简化算法：基于赤纬和观测者纬度） */
function isAboveHorizon(star: CatalogStar, lat: number, lng: number): boolean {
  // 恒星时简化计算（以 UTC 为基准）
  const now = new Date()
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600
  // 格林尼治恒星时（简化）
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const gmst = (18.697374558 + 24.06570982441908 * (dayOfYear + utcHours / 24)) % 24
  // 本地恒星时
  const lst = (gmst + lng / 15 + 24) % 24
  // 时角
  const ha = ((lst - star.ra) * 15 + 360) % 360
  const haRad = ha * Math.PI / 180
  const decRad = star.dec * Math.PI / 180
  const latRad = lat * Math.PI / 180
  // 高度角
  const sinAlt = Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad)
  return sinAlt > -0.05 // 考虑大气折射，略低于地平线也算可见
}
```

- [ ] **Step 2: 修改 `buildNarrativePrompt` 函数签名，增加 `isVisible` 参数**

将 `buildNarrativePrompt` 的签名从：

```ts
function buildNarrativePrompt(star: CatalogStar): { system: string; user: string } {
```

改为：

```ts
function buildNarrativePrompt(star: CatalogStar, isVisible: boolean = true): { system: string; user: string } {
```

- [ ] **Step 3: 在 `buildNarrativePrompt` 中为不可见星星创建不同的 prompt 模板**

在 `buildNarrativePrompt` 函数内部，`hasFigures` 检查之后，当 `!isVisible` 时使用不可见星星的 prompt。在原有逻辑之前插入：

```ts
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
6. 中文输出`

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
- 中文输出`

    const user = `恒星名称：${starName}
所属星座：${conName}
视星等：${star.mag.toFixed(1)} 等（${brightness}）
颜色/光谱：${colorToDescription(star.color)}
赤经：${star.ra.toFixed(2)}h
赤纬：${star.dec.toFixed(2)}°

这颗星目前在地平线以下，无法看到。请为它写一段"古今共望"叙事。记住：第一行必须是 "# 此刻，${starName}正在地平线之下"，诗句引用必须以 "> " 开头。`

    return { system, user }
  }
```

- [ ] **Step 4: 修改 `getNarrative` 函数签名，增加可选位置参数**

将 `getNarrative` 函数签名从：

```ts
export async function getNarrative(catalogStarId: number): Promise<NarrativeResult> {
```

改为：

```ts
export async function getNarrative(catalogStarId: number, lat?: number, lng?: number): Promise<NarrativeResult> {
```

- [ ] **Step 5: 在 `getNarrative` 中根据位置参数判断可见性**

在 `getNarrative` 函数中，生成叙事部分（第 208 行附近），将：

```ts
  const { system, user } = buildNarrativePrompt(star)
```

改为：

```ts
  const visible = (lat !== undefined && lng !== undefined) ? isAboveHorizon(star, lat, lng) : true
  const { system, user } = buildNarrativePrompt(star, visible)
```

- [ ] **Step 6: 重启后端验证**

```bash
cd server && npm run dev
```

- [ ] **Step 7: Commit**

```bash
git add server/src/services/narrative.ts
git commit -m "feat: 新增地平线检测，不可见星星使用独立叙事模板"
```

---

### Task 8: 地平线检测（前端 + 路由）

**Files:**
- Modify: `client/src/composables/useNarrative.ts`
- Modify: `server/src/routes/narrative.ts`

- [ ] **Step 1: 修改 `useNarrative` composable，支持传入 lat/lng 参数**

在 `client/src/composables/useNarrative.ts` 中，修改 `fetchNarrative` 函数签名和 fetch URL：

```ts
// 将函数签名从
async function fetchNarrative(catalogStarId: number): Promise<void> {
// 改为
async function fetchNarrative(catalogStarId: number, lat?: number, lng?: number): Promise<void> {
```

将 fetch URL 从：

```ts
const res = await fetch(`/api/catalog/stars/${catalogStarId}/narrative`)
```

改为：

```ts
const params = new URLSearchParams()
if (lat !== undefined && lng !== undefined) {
  params.set('lat', String(lat))
  params.set('lng', String(lng))
}
const qs = params.toString()
const res = await fetch(`/api/catalog/stars/${catalogStarId}/narrative${qs ? '?' + qs : ''}`)
```

- [ ] **Step 2: 修改 `StarDetail.vue`，将用户位置传给 `fetchNarrative`**

在 `StarDetail.vue` 第 564-570 行，当前代码：

```ts
const narrative = useNarrative()
watch(() => props.catalogStarId, (id) => {
  if (id) {
    narrative.reset()
    narrative.fetchNarrative(id)
  }
}, { immediate: true })
```

`StarDetail.vue` 中已有 `userPosition` ref（第 609 行），它在 `onMounted` 中通过 `navigator.geolocation` 获取。只需将 watch 中的 `fetchNarrative` 调用改为传入位置：

```ts
const narrative = useNarrative()
watch(() => props.catalogStarId, (id) => {
  if (id) {
    narrative.reset()
    narrative.fetchNarrative(id, userPosition.value?.lat, userPosition.value?.lng)
  }
}, { immediate: true })
```

- [ ] **Step 3: 修改后端路由，从 query string 提取 lat/lng 并传给 `getNarrative`**

在 `server/src/routes/narrative.ts` 第 18 行，将：

```ts
const result = await getNarrative(catalogStarId)
```

改为：

```ts
const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined
const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined
const result = await getNarrative(catalogStarId, lat, lng)
```

- [ ] **Step 4: 重启前后端验证**

```bash
# 终端 1
cd server && npm run dev
# 终端 2
cd client && npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add client/src/composables/useNarrative.ts client/src/components/StarDetail.vue server/src/routes/narrative.ts
git commit -m "feat: 前端获取用户地理位置，传入叙事 API 用于地平线检测"
```

---

## 实施顺序

按 Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 顺序实施，每步完成后重启后端（Task 1-7）或前后端（Task 8）验证。

| 步骤 | 风险 | 预计耗时 |
|------|------|---------|
| Task 1-2: 修复思考过程泄露 | 低 | 5 分钟 |
| Task 3: 修复 Hex 颜色泄露 | 低 | 5 分钟 |
| Task 4: 提高 maxTokens | 低 | 2 分钟 |
| Task 5: 修复古人关联严格匹配 | 中 | 5 分钟 |
| Task 6: 扩展古人至 23 位 | 中 | 15 分钟 |
| Task 7: 地平线检测（后端） | 中 | 10 分钟 |
| Task 8: 地平线检测（前端） | 中 | 10 分钟 |