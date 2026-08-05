<template>
  <div class="ca-wrap">
    <!-- ═══ 0. 顶部标识条 ═══ -->
    <div class="ca-hero-strip">
      <div class="ca-hero-left">
        <Sparkles :size="13" class="ca-hero-spark" />
        <span class="ca-hero-label">AI 星笺解读</span>
        <span class="ca-hero-sub">· 基于 {{ storyCount }} 则心事的聚合凝视</span>
      </div>
      <span class="ca-hero-badge">DESIGN PREVIEW</span>
    </div>

    <!-- ═══ 1. 合集画像（Persona）═══ -->
    <section class="ca-card ca-persona">
      <div class="ca-card-head">
        <component :is="MoonStar" :size="12" class="ca-ch-icon ca-ch-gold" />
        <span class="ca-ch-title">合集画像</span>
        <span class="ca-ch-count">四字凝意 · {{ persona.tags.length }} 标签</span>
      </div>
      <div class="ca-persona-body">
        <div class="ca-persona-main">
          <div class="ca-han-name">{{ persona.hanName }}</div>
          <div class="ca-han-sub">{{ persona.constellation }}</div>
          <div class="ca-tags">
            <span
              v-for="t in persona.tags"
              :key="t"
              class="ca-tag"
              :style="tagStyle(t)"
            >#{{ t }}</span>
          </div>
          <blockquote class="ca-quote">{{ persona.quote }}</blockquote>
          <p class="ca-intro">{{ persona.suggestIntro }}</p>
        </div>
        <div class="ca-dims">
          <div v-for="d in persona.dimensions" :key="d.left + d.right" class="ca-dim">
            <div class="ca-dim-labels">
              <span :class="{ active: d.side === 'left' }">{{ d.left }}</span>
              <span :class="{ active: d.side === 'right' }">{{ d.right }}</span>
            </div>
            <div class="ca-dim-track">
              <div class="ca-dim-fill" :style="{ width: d.percent + '%' }"></div>
              <div class="ca-dim-knob" :style="{ left: d.percent + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 2. 情感光谱 + 3. 主题脉络（双栏）═══ -->
    <div class="ca-duo">
      <!-- 情感光谱（发光球体 orb 风格，学习 StarDetail） -->
      <section class="ca-card ca-emotion">
        <div class="ca-card-head">
          <component :is="HeartPulse" :size="12" class="ca-ch-icon ca-ch-red" />
          <span class="ca-ch-title">情感光谱</span>
          <span class="ca-ch-count">5 色情绪</span>
        </div>
        <div class="ca-emotion-body">
          <div class="ca-emo-orbs">
            <span
              v-for="e in emotions"
              :key="e.name"
              class="ca-emo-orb"
              :style="{
                width: orbSize(e.value) + 'px',
                height: orbSize(e.value) + 'px',
                background: `radial-gradient(circle at 35% 30%, ${e.color}ee, ${e.color}44 65%, transparent)`,
                boxShadow: `0 0 ${8 + e.value * 14}px ${e.color}55`,
              }"
            >
              <span class="ca-emo-orb-label">{{ e.name }}</span>
              <span class="ca-emo-orb-val">{{ Math.round(e.value * 100) }}</span>
            </span>
          </div>
          <div class="ca-emo-insight">
            <span class="ca-emo-insight-lead">主调</span>
            <span class="ca-emo-insight-text">{{ topInsight.title }} {{ topInsight.pct }} — {{ topInsight.desc }}</span>
          </div>
        </div>
      </section>

      <!-- 星辰归属（SVG 星图散布：ra/dec 方位 + 大小=故事数 + 星座连线） -->
      <section class="ca-card ca-stars">
        <div class="ca-card-head">
          <component :is="Orbit" :size="12" class="ca-ch-icon ca-ch-blue" />
          <span class="ca-ch-title">星辰归属</span>
          <span class="ca-ch-count">{{ starBelongings.length }} 星 · {{ starBelongTotal }} 篇</span>
        </div>
        <div class="ca-starmap-wrap">
          <svg v-if="starMapData.stars.length > 0" :viewBox="`0 0 ${MAP_W} ${MAP_H}`" class="ca-starmap-svg" preserveAspectRatio="xMidYMid meet">
            <!-- 背景星点 -->
            <circle v-for="(bg, i) in bgStars" :key="'bg'+i" :cx="bg.x" :cy="bg.y" :r="bg.r" fill="#fff" :opacity="bg.opacity" />
            <!-- 星座连线 -->
            <line
              v-for="(l, i) in starMapData.lines"
              :key="'l'+i"
              :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
              :stroke="l.color" stroke-width="0.4" opacity="0.18" stroke-dasharray="2 2"
            />
            <!-- 主星：外发光 + 主体 + 高光核心 + 标签 -->
            <g v-for="s in starMapData.stars" :key="s.id" class="ca-sm-star">
              <!-- 外发光晕 -->
              <circle :cx="s.x" :cy="s.y" :r="s.radius * 3" :fill="s.color" opacity="0.06" />
              <circle :cx="s.x" :cy="s.y" :r="s.radius * 1.8" :fill="s.color" opacity="0.14" />
              <!-- 主体 -->
              <circle :cx="s.x" :cy="s.y" :r="s.radius" :fill="s.color" opacity="0.9">
                <animate attributeName="opacity" values="0.7;1;0.7" :dur="3 + (s.id % 3) + 's'" repeatCount="indefinite" />
              </circle>
              <!-- 高光核心 -->
              <circle :cx="s.x" :cy="s.y" :r="s.radius * 0.35" fill="#fff" opacity="0.85" />
              <!-- 星名标签 -->
              <text :x="s.x" :y="s.y + s.radius + 9" text-anchor="middle" class="ca-sm-label" :fill="s.color">{{ s.name }}</text>
              <!-- 故事数 -->
              <text :x="s.x" :y="s.y + s.radius + 18" text-anchor="middle" class="ca-sm-count">{{ s.count }}篇</text>
            </g>
          </svg>
          <div v-else class="ca-stars-empty">
            故事尚未挂上星辰
          </div>
          <!-- 图例 -->
          <div v-if="starBelongings.length > 0" class="ca-sm-legend">
            <span class="ca-sm-legend-item"><i class="ca-sm-dot"></i>圆点大小 = 故事数</span>
            <span class="ca-sm-legend-item"><i class="ca-sm-dash"></i>虚线 = 星座连线</span>
          </div>
        </div>
        <div class="ca-stars-insight">
          <component :is="Orbit" :size="10" class="ca-stars-flow-icon" />
          <span v-if="starBelongings.length > 0">
            心事散落于 {{ starBelongings.length }} 颗星，最密处在「{{ starBelongings[0].name }}」
          </span>
          <span v-else>等待第一则心事找到它的星辰</span>
        </div>
      </section>
    </div>

    <!-- ═══ 4. 时辰热力 ═══ -->
    <section class="ca-card ca-hour">
      <div class="ca-card-head">
        <component :is="Clock3" :size="12" class="ca-ch-icon ca-ch-purple" />
        <span class="ca-ch-title">时辰热力</span>
        <span class="ca-ch-count">高峰 {{ pad(peakHour) }}:00 · 低谷 {{ pad(lowHour) }}:00</span>
      </div>
      <div class="ca-hour-body">
        <div class="ca-hour-beads">
          <span
            v-for="(v, h) in hourly"
            :key="h"
            class="ca-bead"
            :style="{
              background: beadColor(v),
              width: beadSize(v) + 'px',
              height: beadSize(v) + 'px',
              boxShadow: v > 8 ? `0 0 8px ${beadColor(v)}88` : 'none',
            }"
            :title="`${h}:00 — ${v} 条`"
          ></span>
        </div>
        <div class="ca-hour-axis">
          <span>子</span><span>丑</span><span>寅</span><span>卯</span>
          <span>辰</span><span>巳</span><span>午</span><span>未</span>
          <span>申</span><span>酉</span><span>戌</span><span>亥</span>
        </div>
        <div class="ca-hour-insights">
          <div class="ca-hi ca-hi-peak">
            <span class="ca-hi-prefix">高峰</span>
            <span class="ca-hi-time">{{ hourRangeText(peakHour) }}</span>
            <span class="ca-hi-count">{{ peakPct }}% 投递集中</span>
            <p class="ca-hi-desc">{{ peakText }}</p>
          </div>
          <div class="ca-hi ca-hi-low">
            <span class="ca-hi-prefix">低谷</span>
            <span class="ca-hi-time">{{ hourRangeText(lowHour) }}</span>
            <span class="ca-hi-count">仅 {{ lowPct }}% 故事</span>
            <p class="ca-hi-desc">{{ lowText }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 5. 共鸣榜 + 情感轨迹（双栏，情感轨迹替换原关键词云）═══ -->
    <div class="ca-duo">
      <!-- 共鸣榜 -->
      <section class="ca-card ca-rank">
        <div class="ca-card-head">
          <component :is="Flame" :size="12" class="ca-ch-icon ca-ch-orange" />
          <span class="ca-ch-title">共鸣榜</span>
          <span class="ca-ch-count">Top {{ rankList.length }}</span>
        </div>
        <div class="ca-rank-body">
          <article
            v-for="(r, i) in rankList"
            :key="r.id"
            class="ca-rank-item"
            @click="$emit('story-click', r)"
          >
            <div class="ca-rank-no" :class="`ca-rank-no-${i + 1}`">{{ i + 1 }}</div>
            <div class="ca-rank-main">
              <div class="ca-rank-title">{{ r.title }}</div>
              <div class="ca-rank-summary">{{ r.summary }}</div>
            </div>
            <div class="ca-rank-res">
              <component :is="Heart" :size="11" />
              <span>{{ r.resonance }}</span>
            </div>
          </article>
        </div>
      </section>

      <!-- 情感轨迹（从原独立全宽位移入双栏，限高滚动+渐隐+展开） -->
      <section class="ca-card ca-trajectory">
        <div class="ca-card-head">
          <component :is="Route" :size="12" class="ca-ch-icon ca-ch-green" />
          <span class="ca-ch-title">情感轨迹</span>
          <span class="ca-ch-count">{{ trajectory.length }} 则</span>
          <button
            v-if="trajectory.length > 3"
            class="ca-traj-toggle"
            @click="trajExpanded = !trajExpanded"
          >{{ trajExpanded ? '收起' : '展开' }}</button>
        </div>
        <div class="ca-traj-scroll" :class="{ expanded: trajExpanded }">
          <div class="ca-traj-body">
            <div class="ca-traj-line"></div>
            <div
              v-for="(p, i) in trajectory"
              :key="i"
              class="ca-traj-node"
              :style="{ '--node-color': p.color } as Record<string, string>"
            >
              <div class="ca-traj-dot" :style="{ background: p.color, boxShadow: `0 0 8px ${p.color}aa` }"></div>
              <div class="ca-traj-card">
                <div class="ca-traj-head">
                  <span class="ca-traj-emo" :style="{ color: p.color }">{{ p.emotion }}</span>
                  <span class="ca-traj-date">{{ p.date }}</span>
                </div>
                <div class="ca-traj-title">{{ p.title }}</div>
                <div class="ca-traj-snippet">{{ p.snippet }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- ═══ 8. AI 总叙 ═══ -->
    <section class="ca-card ca-narrative">
      <div class="ca-card-head">
        <component :is="Feather" :size="12" class="ca-ch-icon ca-ch-gold" />
        <span class="ca-ch-title">AI 总叙</span>
        <span class="ca-ch-count">星笺综述</span>
      </div>
      <div class="ca-narr-body" v-html="renderedNarrative"></div>
    </section>

    <!-- 底部说明（设计预览标记）-->
    <div class="ca-foot-note">
      <component :is="Info" :size="11" />
      <span>以上为设计预览，AI 解读内容为占位示例，尚未接入生成服务。</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Sparkles, MoonStar, HeartPulse, Orbit, Clock3, Route, Flame, Heart,
  Feather, Info,
} from 'lucide-vue-next'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { getStarNameInfo } from '../../utils/starName'

marked.setOptions({ breaks: true, gfm: true })

const props = defineProps<{
  collectionName: string
  storyCount: number
  /** 真实故事列表，用于共鸣榜与星辰归属（若为空则用 mock） */
  stories?: Array<{
    id: number
    title: string | null
    content: string
    resonanceCount: number
    createdAt: string
    catalogStarId?: number | null
    catalogStarIds?: number[]
  }>
}>()

defineEmits<{
  'story-click': [story: any]
}>()

/* ═══════════════════════════════════════════════════════════
   MOCK DATA —— 设计预览占位，后续接入 agent 时替换
   ═══════════════════════════════════════════════════════════ */

const persona = {
  hanName: '夜雨孤灯',
  constellation: '夜雨孤灯 · 默认合集',
  tags: ['思念', '夜雨', '独行', '回忆', '微光'],
  quote: '每一盏孤灯，都是夜里不肯睡的人。',
  suggestIntro: '这卷星笺里收着夜半醒来的低语——雨声、灯影、与不肯寄出的思念。心事在子时最稠，在卯时散去，像一缕没说完的话。',
  dimensions: [
    { left: '内向', right: '外向', percent: 78, side: 'left' as const },
    { left: '柔和', right: '锋利', percent: 34, side: 'left' as const },
    { left: '沉静', right: '炽烈', percent: 62, side: 'left' as const },
    { left: '现实', right: '梦幻', percent: 71, side: 'right' as const },
  ],
}

const emotions = [
  { name: '思念', value: 0.78, color: '#ffd98a' },
  { name: '孤独', value: 0.62, color: '#caa7ff' },
  { name: '释然', value: 0.41, color: '#95f0c0' },
  { name: '希望', value: 0.35, color: '#86a8ff' },
  { name: '共鸣', value: 0.28, color: '#ff8b7d' },
]
const topInsight = {
  title: '思念',
  pct: '42.3%',
  desc: '雨夜与灯影反复出现，思念是这卷星笺的主调，多指向远方的人与未寄出的话。',
}

/** 情感球体尺寸：按值映射 28~52px */
function orbSize(value: number): number {
  return Math.round(28 + value * 24)
}

/** 星辰归属：从真实故事派生，聚合 catalogStarId/catalogStarIds → 星名+星座+颜色+故事数+方位 */
const starBelongings = computed<{ id: number; name: string; con: string; color: string; count: number; ra: number; dec: number }[]>(() => {
  const map = new Map<number, number>()
  for (const s of props.stories ?? []) {
    const ids: number[] = []
    if (s.catalogStarId != null) ids.push(s.catalogStarId)
    if (Array.isArray(s.catalogStarIds)) ids.push(...s.catalogStarIds)
    for (const id of Array.from(new Set(ids))) {
      map.set(id, (map.get(id) ?? 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([id, count]) => {
      const info = getStarNameInfo(id)
      return {
        id,
        name: info?.name ?? `星 ${id}`,
        con: info?.con ?? '',
        color: info?.color ?? '#86a8ff',
        count,
        ra: info?.ra ?? -1,
        dec: info?.dec ?? 0,
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
})
const starBelongTotal = computed(() => starBelongings.value.reduce((a, b) => a + b.count, 0))

/** SVG 星图：用 ra/dec 投影到 2D 平面，圆点大小=故事数 */
const MAP_W = 280
const MAP_H = 150
const starMapData = computed(() => {
  const stars = starBelongings.value
  if (stars.length === 0) return { stars: [], lines: [] }

  // 有方位数据的星（ra >= 0）
  const withPos = stars.filter(s => s.ra >= 0)
  // 无方位的星（行星等 ra=-1）：均匀散布在外圈
  const noPos = stars.filter(s => s.ra < 0)

  // 计算质心
  let cx = 12, cy = 0
  if (withPos.length > 0) {
    cx = withPos.reduce((a, s) => a + s.ra, 0) / withPos.length
    cy = withPos.reduce((a, s) => a + s.dec, 0) / withPos.length
  }

  // 计算最大距离用于缩放
  let maxDist = 0
  for (const s of withPos) {
    const d = Math.sqrt((s.ra - cx) ** 2 + (s.dec - cy) ** 2)
    if (d > maxDist) maxDist = d
  }
  maxDist = Math.max(maxDist, 2) // 避免除零

  const pad = 28
  const scale = Math.min((MAP_W - pad * 2) / 2, (MAP_H - pad * 2) / 2) / maxDist
  const maxCount = Math.max(1, ...stars.map(s => s.count))

  // 映射有方位的星
  const mapped = withPos.map(s => ({
    ...s,
    x: MAP_W / 2 + (s.ra - cx) * scale,
    y: MAP_H / 2 - (s.dec - cy) * scale,
    radius: 2.5 + (s.count / maxCount) * 5, // 2.5~7.5px
  }))

  // 无方位的星（行星）：在顶部弧形散布
  const noMapped = noPos.map((s, i) => {
    const angle = (i / Math.max(1, noPos.length)) * Math.PI - Math.PI / 2
    return {
      ...s,
      x: MAP_W / 2 + Math.cos(angle) * (MAP_W / 2 - pad),
      y: MAP_H / 2 + Math.sin(angle) * (MAP_H / 2 - pad) * 0.5,
      radius: 2.5 + (s.count / maxCount) * 5,
    }
  })

  const all = [...mapped, ...noMapped]

  // 星座连线：同星座的星用最近邻连线
  const conGroups = new Map<string, typeof all>()
  for (const s of all) {
    if (!s.con) continue
    if (!conGroups.has(s.con)) conGroups.set(s.con, [])
    conGroups.get(s.con)!.push(s)
  }
  const lines: { x1: number; y1: number; x2: number; y2: number; color: string }[] = []
  const seen = new Set<string>()
  for (const [, group] of conGroups) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i++) {
      let nearest = -1, minD = Infinity
      for (let j = 0; j < group.length; j++) {
        if (i === j) continue
        const d = (group[i].x - group[j].x) ** 2 + (group[i].y - group[j].y) ** 2
        if (d < minD) { minD = d; nearest = j }
      }
      if (nearest >= 0) {
        const a = group[i], b = group[nearest]
        const key = [a.x, a.y, b.x, b.y].map(Math.round).join(',')
        if (!seen.has(key)) {
          seen.add(key)
          lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, color: a.color })
        }
      }
    }
  }

  return { stars: all, lines }
})

/** 背景装饰星点（确定性伪随机） */
const bgStars = Array.from({ length: 28 }, (_, i) => {
  const seed = i * 7919 + 13
  return {
    x: (seed * 13) % MAP_W,
    y: (seed * 17) % MAP_H,
    r: 0.3 + ((seed % 4) * 0.25),
    opacity: 0.1 + ((seed % 6) * 0.04),
  }
})

// 情感轨迹展开/收起状态：默认收起（限高滚动），展开后显示全部
const trajExpanded = ref(false)

const hourly = [2, 1, 1, 0, 0, 1, 3, 5, 4, 3, 2, 2, 4, 3, 2, 1, 2, 3, 4, 6, 9, 12, 8, 5]
const peakHour = 22
const lowHour = 4
const peakText = '子时雨最盛，心事也最稠。你总在别人入睡后才点亮自己那盏灯，把白天没说完的话留给夜雨。'
const lowText = '卯时天将明，是这卷星笺最安静的时辰。或许醒来之后，有些情绪就随晨光散了。'

const trajectory = [
  { emotion: '思念', color: '#ffd98a', date: '03/12', title: '雨夜寄北', snippet: '把没寄出的话折成纸船，放进窗外的雨里。' },
  { emotion: '孤独', color: '#caa7ff', date: '03/18', title: '一个人的地铁', snippet: '末班车空荡荡，影子比人先到站。' },
  { emotion: '思念', color: '#ffd98a', date: '03/25', title: '旧照片', snippet: '翻到那张合影，才发现你笑得比我记得的还要年轻。' },
  { emotion: '释然', color: '#95f0c0', date: '04/02', title: '江边走走', snippet: '风把帽子吹进水里，我居然笑了出来。' },
  { emotion: '孤独', color: '#caa7ff', date: '04/09', title: '凌晨四点', snippet: '整座城市都睡了，只有我和一盏台灯还醒着。' },
  { emotion: '希望', color: '#86a8ff', date: '04/15', title: '阳台的种子', snippet: '埋下去第十天，今天早上冒了一点绿。' },
  { emotion: '思念', color: '#ffd98a', date: '04/22', title: '故乡的槐花', snippet: '又到开花的季节，只是树下的人不在了。' },
  { emotion: '释然', color: '#95f0c0', date: '04/30', title: '合上这一卷', snippet: '把散落的纸页收好，灯灭了，雨也停了。' },
]

const narrativeMd = `### 夜半的低语

这卷星笺收着 **8 则**心事，多写在子时前后。雨声、灯影、与不肯寄出的话，是反复出现的三种光。思念是主调，却并不尖锐——更像一盏不肯熄的灯，温吞地亮着。

### 情绪的流转

从「雨夜寄北」到「合上这一卷」，情绪走过一个小小的弧线：浓稠的思念 → 短暂的释然 → 再度回望 → 最终放下。中间那篇「凌晨四点」是最低的谷，之后开始慢慢上扬。

> 孤独不是没有人，而是有些话找不到人说。

### 给纺织者的话

你习惯把情绪写下来再收起来，像把雨折好放进抽屉。这卷星笺就是你的抽屉——别急着合上，还有些微光没说完。`

/* ═══════════════════════════════════════════════════════════
   Computed / 工具
   ═══════════════════════════════════════════════════════════ */

/** 共鸣榜：优先用真实故事 Top3，不足则补 mock */
const rankList = computed(() => {
  const real = (props.stories ?? [])
    .slice()
    .sort((a, b) => (b.resonanceCount ?? 0) - (a.resonanceCount ?? 0))
    .slice(0, 3)
    .map(s => ({
      id: s.id,
      title: s.title || '未命名故事',
      summary: storySummary(s.content),
      resonance: s.resonanceCount ?? 0,
    }))
  if (real.length >= 3) return real
  // 不足 3 则用 mock 补足
  const mock = [
    { id: -1, title: '雨夜寄北', summary: '把没寄出的话折成纸船，放进窗外的雨里。', resonance: 42 },
    { id: -2, title: '凌晨四点', summary: '整座城市都睡了，只有我和一盏台灯还醒着。', resonance: 35 },
    { id: -3, title: '故乡的槐花', summary: '又到开花的季节，只是树下的人不在了。', resonance: 28 },
  ]
  return [...real, ...mock.slice(real.length)].slice(0, 3)
})

function storySummary(content: string): string {
  const plain = (content || '').replace(/[#*`>\-_~]/g, '').replace(/\s+/g, ' ').trim()
  return plain.length > 36 ? plain.slice(0, 36) + '…' : plain
}

const renderedNarrative = computed(() => {
  const raw = marked.parse(narrativeMd) as string
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'del', 'code', 'blockquote', 'ul', 'ol', 'li', 'h3', 'h4', 'hr'],
    ALLOWED_ATTR: [],
  })
})

const hourSum = computed(() => Math.max(1, hourly.reduce((a, b) => a + b, 0)))
const peakPct = computed(() => Math.max(1, Math.round(hourly[peakHour] / hourSum.value * 100)))
const lowPct = computed(() => Math.max(0.1, Math.round(hourly[lowHour] / hourSum.value * 100 * 10) / 10))

const DIZHI_PER_2H: Record<number, string> = {
  23: '子', 0: '子', 1: '丑', 2: '丑', 3: '寅', 4: '寅', 5: '卯', 6: '卯',
  7: '辰', 8: '辰', 9: '巳', 10: '巳', 11: '午', 12: '午', 13: '未', 14: '未',
  15: '申', 16: '申', 17: '酉', 18: '酉', 19: '戌', 20: '戌', 21: '亥', 22: '亥',
}
function pad(n: number) { return n.toString().padStart(2, '0') }
function hourRangeText(h: number) {
  const d = DIZHI_PER_2H[h] ?? ''
  const end = (h + 2) % 24
  return `${d}时 · ${pad(h)}-${pad(end)}`
}

function beadColor(v: number) {
  if (v < 2) return 'rgba(255,255,255,0.12)'
  if (v < 5) return 'rgba(134,168,255,0.35)'
  if (v < 8) return 'rgba(154,230,180,0.45)'
  if (v < 11) return 'rgba(202,167,255,0.55)'
  return 'rgba(255,217,138,0.85)'
}
function beadSize(v: number) {
  return 4 + Math.min(10, Math.round(v / 1.5))
}

function tagStyle(tag: string): Record<string, string> {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h << 5) - h + tag.charCodeAt(i)
  h = Math.abs(h) % 360
  return {
    color: `hsl(${h} 62% 74%)`,
    background: `hsla(${h}, 62%, 74%, 0.08)`,
    borderColor: `hsla(${h}, 62%, 74%, 0.18)`,
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   Layout
   ═══════════════════════════════════════════════════════════ */
.ca-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 22px 24px;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.ca-wrap::-webkit-scrollbar { width: 5px; }
.ca-wrap::-webkit-scrollbar-track { background: transparent; }
.ca-wrap::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }

/* ═══ Hero Strip ═══ */
.ca-hero-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(255, 217, 138, 0.06), rgba(202, 167, 255, 0.04));
  border: 1px solid rgba(255, 217, 138, 0.12);
  flex-shrink: 0;
}
.ca-hero-left {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.ca-hero-spark { color: var(--accent); flex-shrink: 0; }
.ca-hero-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.02em;
}
.ca-hero-sub {
  font-size: 0.68rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ca-hero-badge {
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 2px 7px;
  border-radius: 100px;
  background: rgba(255, 217, 138, 0.12);
  color: var(--accent);
  border: 1px solid rgba(255, 217, 138, 0.2);
  flex-shrink: 0;
}

/* ═══ Card Base ═══ */
.ca-card {
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.ca-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 217, 138, 0.3), transparent);
}
.ca-card-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-bottom: 9px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.ca-ch-icon { opacity: 0.85; flex-shrink: 0; }
.ca-ch-gold { color: #ffd98a; }
.ca-ch-red { color: #ff8b7d; }
.ca-ch-blue { color: #86a8ff; }
.ca-ch-purple { color: #caa7ff; }
.ca-ch-green { color: #9ae6b4; }
.ca-ch-orange { color: #ffb877; }
.ca-ch-cyan { color: #7fd4e0; }
.ca-ch-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
}
.ca-ch-count {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.22);
  letter-spacing: 0.03em;
}

/* ═══ 双栏 ═══ */
.ca-duo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex-shrink: 0;
}

/* ═══ 1. Persona ═══ */
.ca-persona-body {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 18px;
  align-items: start;
}
.ca-han-name {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: 0.12em;
  line-height: 1.1;
  margin-bottom: 2px;
  background: linear-gradient(135deg, #ffd98a, #caa7ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.ca-han-sub {
  font-size: 0.66rem;
  color: var(--muted);
  margin-bottom: 10px;
  letter-spacing: 0.04em;
}
.ca-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 12px;
}
.ca-tag {
  font-size: 0.68rem;
  padding: 2px 8px;
  border-radius: 100px;
  border: 0.5px solid;
  font-weight: 500;
}
.ca-quote {
  margin: 0 0 10px;
  padding: 8px 12px;
  border-left: 2px solid var(--accent);
  background: rgba(255, 217, 138, 0.04);
  border-radius: 0 6px 6px 0;
  font-size: 0.82rem;
  color: var(--accent);
  font-style: italic;
  line-height: 1.6;
}
.ca-intro {
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.75;
  color: var(--ink-secondary);
}
.ca-dims {
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.ca-dim {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ca-dim-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.62rem;
  color: var(--muted);
}
.ca-dim-labels .active { color: var(--accent); font-weight: 600; }
.ca-dim-track {
  position: relative;
  height: 4px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.05);
}
.ca-dim-fill {
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  border-radius: 100px;
  background: linear-gradient(90deg, rgba(255, 217, 138, 0.4), rgba(202, 167, 255, 0.4));
  transition: width 0.5s ease;
}
.ca-dim-knob {
  position: absolute;
  top: 50%;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 6px rgba(255, 217, 138, 0.6);
  transform: translate(-50%, -50%);
  transition: left 0.5s ease;
}

/* ═══ 2. Emotion（发光球体 orb） ═══ */
.ca-emotion-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ca-emo-orbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  align-items: center;
  justify-content: center;
  padding: 6px 2px 10px;
  min-height: 70px;
}
.ca-emo-orb {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: default;
  transition: transform 0.2s;
  animation: orbFloat 4s ease-in-out infinite;
}
.ca-emo-orb:nth-child(2n) { animation-delay: 0.8s; }
.ca-emo-orb:nth-child(3n) { animation-delay: 1.6s; }
.ca-emo-orb:hover { transform: scale(1.12); }
@keyframes orbFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
.ca-emo-orb-label {
  font-size: 0.6rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1;
  margin-bottom: 1px;
}
.ca-emo-orb-val {
  font-size: 0.56rem;
  color: rgba(255, 255, 255, 0.5);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.ca-emo-insight {
  display: flex;
  gap: 7px;
  padding: 9px 10px;
  border-radius: 6px;
  background: rgba(255, 139, 125, 0.04);
  border-left: 2px solid rgba(255, 139, 125, 0.3);
  margin-top: 4px;
}
.ca-emo-insight-lead {
  font-size: 0.6rem;
  font-weight: 700;
  color: #ff8b7d;
  letter-spacing: 0.04em;
  flex-shrink: 0;
  margin-top: 2px;
}
.ca-emo-insight-text {
  font-size: 0.7rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.5);
}

/* ═══ 3. Stars Belonging（SVG 星图散布） ═══ */
.ca-starmap-wrap {
  position: relative;
  border-radius: 8px;
  background: radial-gradient(ellipse at 50% 40%, rgba(134, 168, 255, 0.04), rgba(10, 10, 26, 0.5));
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.03);
}
.ca-starmap-svg {
  width: 100%;
  height: auto;
  display: block;
  min-height: 120px;
}
.ca-sm-star {
  cursor: pointer;
  transition: transform 0.2s;
  transform-origin: center;
  transform-box: fill-box;
}
.ca-sm-star:hover {
  transform: scale(1.15);
}
.ca-sm-label {
  font-size: 5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  pointer-events: none;
}
.ca-sm-count {
  font-size: 4px;
  fill: rgba(255, 255, 255, 0.35);
  pointer-events: none;
}
.ca-sm-legend {
  display: flex;
  gap: 12px;
  padding: 5px 10px;
  font-size: 0.56rem;
  color: var(--muted-light);
  letter-spacing: 0.02em;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
  background: rgba(0, 0, 0, 0.15);
}
.ca-sm-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ca-sm-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ffd98a;
  box-shadow: 0 0 4px #ffd98a;
}
.ca-sm-dash {
  display: inline-block;
  width: 10px;
  height: 0;
  border-top: 1px dashed rgba(255, 255, 255, 0.3);
}
.ca-stars-empty {
  font-size: 0.7rem;
  color: var(--muted-light);
  font-style: italic;
  padding: 28px 0;
  text-align: center;
}
.ca-stars-insight {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(134, 168, 255, 0.04);
  border-left: 2px solid rgba(134, 168, 255, 0.3);
  margin-top: 4px;
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
}
.ca-stars-flow-icon { color: #86a8ff; flex-shrink: 0; }

/* ═══ 4. Hour ═══ */
.ca-hour-beads {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 6px;
}
.ca-bead {
  border-radius: 50%;
  flex-shrink: 0;
  transition: transform 0.15s;
}
.ca-bead:hover { transform: scale(1.6); z-index: 2; }
.ca-hour-axis {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  text-align: center;
  font-size: 0.58rem;
  color: rgba(255, 255, 255, 0.25);
  padding: 0 2px 8px;
  margin-bottom: 2px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.04);
  letter-spacing: 0.08em;
}
.ca-hour-insights {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.ca-hi {
  display: grid;
  grid-template-columns: auto auto 1fr;
  grid-template-rows: auto auto;
  align-items: center;
  gap: 4px 7px;
}
.ca-hi-prefix {
  grid-row: 1;
  font-size: 0.56rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  letter-spacing: 0.06em;
}
.ca-hi-peak .ca-hi-prefix { background: rgba(255, 217, 138, 0.15); color: #ffd98a; }
.ca-hi-low .ca-hi-prefix { background: rgba(134, 168, 255, 0.15); color: #86a8ff; }
.ca-hi-time {
  grid-row: 1;
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
}
.ca-hi-count {
  grid-row: 1;
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.28);
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.ca-hi-desc {
  grid-column: 1 / -1;
  grid-row: 2;
  margin: 0;
  padding: 7px 9px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
  font-size: 0.72rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.48);
}

/* ═══ 5. Trajectory（限高滚动+渐隐+展开） ═══ */
.ca-traj-toggle {
  margin-left: auto;
  padding: 2px 8px;
  font-size: 0.6rem;
  color: var(--accent);
  background: rgba(255, 217, 138, 0.08);
  border: 0.5px solid rgba(255, 217, 138, 0.2);
  border-radius: 100px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
  flex-shrink: 0;
}
.ca-traj-toggle:hover { background: rgba(255, 217, 138, 0.16); }
.ca-traj-scroll {
  max-height: 210px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  /* 底部渐隐遮罩，提示可滚动 */
  -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 calc(100% - 28px), transparent 100%);
  mask-image: linear-gradient(180deg, #000 0%, #000 calc(100% - 28px), transparent 100%);
  transition: max-height 0.3s ease;
  padding-right: 4px;
}
.ca-traj-scroll.expanded {
  max-height: 1200px;
  -webkit-mask-image: none;
  mask-image: none;
}
.ca-traj-scroll::-webkit-scrollbar { width: 3px; }
.ca-traj-scroll::-webkit-scrollbar-track { background: transparent; }
.ca-traj-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
.ca-traj-body {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 6px;
}
.ca-traj-line {
  position: absolute;
  left: 11px;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: linear-gradient(180deg, rgba(255, 217, 138, 0.4), rgba(202, 167, 255, 0.2), rgba(149, 240, 192, 0.4));
}
.ca-traj-node {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  position: relative;
}
.ca-traj-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
  position: relative;
  z-index: 1;
  border: 2px solid var(--surface);
}
.ca-traj-card {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.15s, border-color 0.15s;
}
.ca-traj-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}
.ca-traj-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
}
.ca-traj-emo {
  font-size: 0.66rem;
  font-weight: 600;
}
.ca-traj-date {
  font-size: 0.6rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.ca-traj-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 2px;
}
.ca-traj-snippet {
  font-size: 0.68rem;
  color: var(--muted);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* ═══ 6. Rank（共鸣榜，增强发光质感） ═══ */
.ca-rank-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ca-rank-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0.008));
  border: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.15s, box-shadow 0.15s;
  position: relative;
  overflow: hidden;
}
.ca-rank-item::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, transparent, var(--accent), transparent);
  opacity: 0;
  transition: opacity 0.2s;
}
.ca-rank-item:hover {
  background: linear-gradient(135deg, rgba(255, 217, 138, 0.08), rgba(255, 217, 138, 0.02));
  border-color: rgba(255, 217, 138, 0.18);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 217, 138, 0.08);
}
.ca-rank-item:hover::before { opacity: 1; }
.ca-rank-no {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  position: relative;
}
.ca-rank-no-1 {
  background: radial-gradient(circle, rgba(255, 217, 138, 0.25), rgba(255, 217, 138, 0.08));
  color: #ffd98a;
  box-shadow: 0 0 8px rgba(255, 217, 138, 0.35), inset 0 0 4px rgba(255, 217, 138, 0.15);
}
.ca-rank-no-2 {
  background: radial-gradient(circle, rgba(202, 202, 220, 0.18), rgba(202, 202, 220, 0.06));
  color: #cac4dc;
  box-shadow: 0 0 6px rgba(202, 202, 220, 0.25), inset 0 0 4px rgba(202, 202, 220, 0.1);
}
.ca-rank-no-3 {
  background: radial-gradient(circle, rgba(255, 139, 125, 0.18), rgba(255, 139, 125, 0.06));
  color: #ff8b7d;
  box-shadow: 0 0 6px rgba(255, 139, 125, 0.25), inset 0 0 4px rgba(255, 139, 125, 0.1);
}
.ca-rank-main { flex: 1; min-width: 0; }
.ca-rank-title {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}
.ca-rank-summary {
  font-size: 0.66rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ca-rank-res {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.68rem;
  color: #ff8b7d;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 100px;
  background: rgba(255, 139, 125, 0.08);
  border: 0.5px solid rgba(255, 139, 125, 0.15);
}

/* ═══ 7. Narrative ═══ */
.ca-narr-body :deep(h3) {
  margin: 14px 0 8px;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 0.02em;
  padding-left: 8px;
  border-left: 2px solid rgba(255, 217, 138, 0.4);
}
.ca-narr-body :deep(h3:first-child) { margin-top: 0; }
.ca-narr-body :deep(p) {
  margin: 0 0 10px;
  font-size: 0.76rem;
  line-height: 1.85;
  color: var(--ink-secondary);
}
.ca-narr-body :deep(strong) { color: var(--ink); font-weight: 600; }
.ca-narr-body :deep(em) { color: var(--star-purple); }
.ca-narr-body :deep(blockquote) {
  margin: 10px 0;
  padding: 8px 14px;
  border-left: 3px solid var(--accent);
  background: rgba(255, 217, 138, 0.03);
  border-radius: 0 6px 6px 0;
}
.ca-narr-body :deep(blockquote p) {
  margin: 0;
  font-size: 0.8rem;
  color: var(--accent);
  font-style: italic;
  line-height: 1.7;
}

/* ═══ Foot Note ═══ */
.ca-foot-note {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 0.64rem;
  color: var(--muted-light);
  background: rgba(255, 255, 255, 0.015);
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

/* ═══ Responsive ═══ */
@media (max-width: 900px) {
  .ca-duo { grid-template-columns: 1fr; }
  .ca-persona-body { grid-template-columns: 1fr; gap: 14px; }
  .ca-wrap { padding: 14px 16px 20px; }
}
</style>
