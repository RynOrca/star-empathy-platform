# 叙事文案 Bug 修复 & 古人扩展 — 设计方案

> 关联 Issue: [#38](https://github.com/RynOrca/star-empathy-platform/issues/38)
> 日期: 2026-07-27
> 状态: 设计完成，待实施

---

## 一、问题总览

| # | 问题 | 严重程度 | 根因 |
|---|------|---------|------|
| 1 | Hex 颜色泄露（如 `#ffa850` 出现在叙事中） | 高 | prompt 中传入 hex 颜色值，AI 直接输出 |
| 2 | 文案截断（叙事不完整） | 高 | `maxTokens: 600` 过小 |
| 3 | 思考过程泄露（`reasoning_content` 输出到叙事） | 高 | `deepseek.ts` / `chat.ts` 中 fallback 到 `reasoning_content` |
| 4 | 地平线以下星星叙事不当（"今夜，你看到…"） | 中 | 未根据星星可见性区分 prompt |
| 5 | 古人关联不准确（无关联的古人被匹配到星星） | 中 | `getFiguresForStar` 星座级别匹配过于宽松 |
| 6 | 古人数量不足（仅 11 位） | 低 | 初始数据量有限，需扩展至 23 位 |

---

## 二、逐项修复方案

### 2.1 Hex 颜色泄露

**涉及文件**: `server/src/services/narrative.ts`

**根因**: `buildNarrativePrompt()` 的 user prompt 中传入了 `star.color`（如 `#ffa850`），AI 可能将其原样输出。

**修复**: 在 `buildNarrativePrompt` 中增加颜色映射函数，将 hex 颜色转为人类可读描述：

```ts
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
    // 更多常见颜色映射...
  }
  return map[hex.toLowerCase()] || '肉眼可见的星光'
}
```

然后将 user prompt 中的 `颜色/光谱：${star.color}` 改为 `颜色/光谱：${colorToDescription(star.color)}`。

### 2.2 文案截断

**涉及文件**: `server/src/services/narrative.ts`

**根因**: `deepseekChat` 调用时 `maxTokens: 600`，对于150~250字的叙事+格式标记，可能不够。

**修复**: 将 `maxTokens: 600` 改为 `maxTokens: 3000`。

### 2.3 思考过程泄露

**涉及文件**:
- `server/src/services/deepseek.ts` (第 122 行)
- `server/src/services/chat.ts` (第 166 行)

**根因**: DeepSeek v4 推理模型有时把思考过程放在 `reasoning_content` 字段。两处代码都做了 `content || reasoning_content` 的 fallback，导致思考过程被当作正式内容输出。

**修复**:

`deepseek.ts` 第 122 行：
```ts
// 旧
const content = message?.content || message?.reasoning_content || ''
// 新
const content = message?.content || ''
if (!content) {
  console.error('DeepSeek API 返回内容为空，完整响应:', JSON.stringify(json).slice(0, 500))
  throw new Error('DeepSeek API 返回内容为空')
}
```

`chat.ts` 第 166 行：
```ts
// 旧
const chunk = delta?.content || delta?.reasoning_content
// 新
const chunk = delta?.content
```

### 2.4 地平线以下星星叙事

**涉及文件**: `server/src/services/narrative.ts`、`client/src/components/StarDetail.vue`

**根因**: 叙事生成不考虑星星当前是否在地平线以上，一律用"今夜，你看到…"开头。

**修复分两步**:

**后端** (`narrative.ts`):
1. `getNarrative()` 增加可选参数 `lat?: number, lng?: number`
2. 新增 `isAboveHorizon(star: CatalogStar, lat: number, lng: number): boolean` 函数，基于恒星赤经赤纬和观测者位置计算可见性
3. `buildNarrativePrompt()` 增加 `isVisible: boolean` 参数，不可见时使用不同的 prompt 模板

**前端** (`StarDetail.vue`):
1. 获取用户地理位置（`navigator.geolocation`）
2. 请求叙事 API 时传入 `lat`、`lng` 参数

地平线以下星星的叙事模板（示例）：
```
# 此刻，{星名}正在地平线之下

它并未消失，只是暂时隐于大地的另一侧。

（诗人名）写：

> "{诗句}"（朝代·《出处》）

（对诗句的解读）

千年以后，当它再次升起，你与古人看见的，仍是同一颗星。
```

### 2.5 古人关联严格匹配

**涉及文件**: `server/src/data/ancientFigures.ts`

**根因**: `getFiguresForStar()` 中星座级别匹配（`constellationIds?.includes(constellation)`）过于宽松。例如天琴座的任何星星都会匹配到杜牧、李商隐、秦观、白居易——但他们只写了织女/牵牛相关诗句，并非天琴座所有星星。

**修复**: 去掉星座级别匹配，只保留星名关键词匹配：

```ts
export function getFiguresForStar(starName: string | null, constellation: string): AncientFigure[] {
  return ANCIENT_FIGURES.filter((f) => {
    return f.starAssociations.some((assoc) => {
      if (!starName) return false
      return assoc.starKeywords.some((kw) =>
        starName.toLowerCase().includes(kw.toLowerCase()),
      )
    })
  })
}
```

同时，`getStarAssociation()` 中也需要做同样的修改。

### 2.6 扩展古人至 23 位

**涉及文件**: `server/src/data/ancientFigures.ts`

**新增 12 位古人**（均有明确星象记录）:

| # | 古人 | 朝代 | 关联星象 | 记录来源 |
|---|------|------|---------|---------|
| 12 | 李清照 | 南宋 | 牵牛织女、银河 | 《行香子·七夕》"星桥鹊驾" |
| 13 | 刘禹锡 | 唐 | 织女、河鼓 | 《浪淘沙》"如今直上银河去，同到牵牛织女家" |
| 14 | 温庭筠 | 唐 | 北斗、银河 | 《太液池歌》"北斗阑干南斗斜" |
| 15 | 王勃 | 唐 | 参商、星汉 | 《滕王阁序》"星分翼轸"、"天高地迥，觉宇宙之无穷" |
| 16 | 范仲淹 | 北宋 | 北斗、银河 | 《苏幕遮》"夜夜除非，好梦留人睡" |
| 17 | 陶渊明 | 东晋 | 北斗、南斗 | 《归园田居》"晨兴理荒秽，带月荷锄归" |
| 18 | 王安石 | 北宋 | 北斗、银河 | 《泊船瓜洲》等 |
| 19 | 柳宗元 | 唐 | 北斗、七星 | 《小石潭记》以星喻水 |
| 20 | 郭守敬 | 元 | 二十八宿、全天恒星 | 《授时历》实测全天星象 |
| 21 | 沈括 | 北宋 | 北斗、极星 | 《梦溪笔谈》卷七·象数一 |
| 22 | 李贺 | 唐 | 银河、北斗 | 《天上谣》"天河夜转漂回星" |
| 23 | 陆游 | 南宋 | 北斗、银河、牵牛 | 《秋夜将晓出篱门迎凉有感》等 |

**数据结构**: 每位古人需包含 `id`、`name`、`dynasty`、`style`、`avatar`、`intro`、`tags`、`starAssociations`（含 `starKeywords`、`poems`、`context`）、`systemPrompt`、`openingTemplate`。

---

## 三、实施顺序

| 步骤 | 内容 | 涉及文件 | 风险 |
|------|------|---------|------|
| 1 | 修复思考过程泄露 | `deepseek.ts`, `chat.ts` | 低 |
| 2 | 修复 Hex 颜色泄露 | `narrative.ts` | 低 |
| 3 | 提高 maxTokens 至 3000 | `narrative.ts` | 低 |
| 4 | 修复古人关联严格匹配 | `ancientFigures.ts` | 中 |
| 5 | 扩展古人至 23 位 | `ancientFigures.ts` | 中 |
| 6 | 地平线检测 | `narrative.ts`, `StarDetail.vue` | 中 |

建议按 1→2→3→4→5→6 顺序实施，每步完成后重启后端验证。

---

## 四、验证方式

1. 重启后端 `cd server && npm run dev`
2. 在前端打开有内核数据的星星，点击「生成叙事」
3. 检查叙事中是否出现 hex 颜色值
4. 检查叙事是否完整（不截断）
5. 检查叙事中是否出现思考过程内容
6. 检查古人列表是否与星星实际关联匹配
7. 检查地平线以下星星的叙事是否使用了正确的模板