<template>
  <div class="stack-wrap">
    <!-- 1. 主题森林 -->
    <div class="ai-card forest-card">
      <div class="ai-head">
        <div class="ai-badge ai-badge-green">
          <TreeDeciduous :size="10" class="ai-spark" />
          <span>星语 AI · 主题森林</span>
        </div>
        <div class="ai-sub">{{ total }} 条故事 · {{ Math.min(8, themes.length) }} 个主题</div>
      </div>

      <!-- 8 棵小树苗：上排 4，下排 4 -->
      <div class="tree-rows">
        <div class="tree-row">
          <div class="tree" v-for="t in themes.slice(0, 4)" :key="t.name">
            <svg viewBox="0 0 48 68" class="tree-svg">
              <rect x="22" :y="68 - t.trunk" width="4" :height="t.trunk" fill="rgba(255,217,138,0.35)" />
              <polygon v-if="t.h1 > 0"
                :points="`24,${68 - t.trunk - t.h1} ${24 - t.w1},${68 - t.trunk + 4} ${24 + t.w1},${68 - t.trunk + 4}`"
                :fill="t.color" opacity="0.92" />
              <polygon v-if="t.h2 > 0"
                :points="`24,${68 - t.trunk - t.h1 - t.h2} ${24 - t.w2},${68 - t.trunk - t.h1 + 4} ${24 + t.w2},${68 - t.trunk - t.h1 + 4}`"
                :fill="t.color" opacity="0.88" />
              <polygon v-if="t.h3 > 0"
                :points="`24,${68 - t.trunk - t.h1 - t.h2 - t.h3} ${24 - t.w3},${68 - t.trunk - t.h1 - t.h2 + 4} ${24 + t.w3},${68 - t.trunk - t.h1 - t.h2 + 4}`"
                :fill="t.color" opacity="0.95" />
              <circle v-if="t.count >= 120" cx="24" :cy="68 - t.trunk - t.h1 - t.h2 - t.h3 - 4"
                r="1.6" fill="#ffd98a" />
            </svg>
            <div class="tree-meta">
              <div class="tree-name">{{ t.name }}</div>
              <div class="tree-count">{{ t.count }}</div>
            </div>
          </div>
        </div>
        <div class="tree-row tree-row-2" v-if="themes.length > 4">
          <div class="tree" v-for="t in themes.slice(4, 8)" :key="t.name">
            <svg viewBox="0 0 48 68" class="tree-svg">
              <rect x="22" :y="68 - t.trunk" width="4" :height="t.trunk" fill="rgba(255,217,138,0.35)" />
              <polygon v-if="t.h1 > 0"
                :points="`24,${68 - t.trunk - t.h1} ${24 - t.w1},${68 - t.trunk + 4} ${24 + t.w1},${68 - t.trunk + 4}`"
                :fill="t.color" opacity="0.92" />
              <polygon v-if="t.h2 > 0"
                :points="`24,${68 - t.trunk - t.h1 - t.h2} ${24 - t.w2},${68 - t.trunk - t.h1 + 4} ${24 + t.w2},${68 - t.trunk - t.h1 + 4}`"
                :fill="t.color" opacity="0.88" />
              <polygon v-if="t.h3 > 0"
                :points="`24,${68 - t.trunk - t.h1 - t.h2 - t.h3} ${24 - t.w3},${68 - t.trunk - t.h1 - t.h2 + 4} ${24 + t.w3},${68 - t.trunk - t.h1 - t.h2 + 4}`"
                :fill="t.color" opacity="0.95" />
              <circle v-if="t.count >= 60" cx="24" :cy="68 - t.trunk - t.h1 - t.h2 - t.h3 - 4"
                r="1.4" fill="#ffd98a" opacity="0.85" />
            </svg>
            <div class="tree-meta">
              <div class="tree-name">{{ t.name }}</div>
              <div class="tree-count">{{ t.count }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- AI 文字点评 -->
      <div class="forest-note">
        <Leaf :size="11" class="leaf-ico" />
        <div class="note-text">
          <span class="note-lead">AI 观察：</span>
          <span v-if="themeHour?.forestNote" v-html="themeHour.forestNote"></span>
          <span v-else>
            「<em class="hi-gold">{{ topThemeName }}</em>」主题树木最粗壮，故事量占全星
            <em class="hi-gold">{{ topThemePct }}%</em>；
            其余主题虽是小树，但构成这颗星完整的情感森林。
          </span>
        </div>
      </div>
    </div>

    <!-- 2. 时辰观察 -->
    <div class="ai-card hour-card">
      <div class="ai-head">
        <div class="ai-badge ai-badge-blue">
          <Clock3 :size="10" class="ai-spark" />
          <span>星语 AI · 时辰观察</span>
        </div>
        <div class="ai-sub">高峰 {{ peakHour }}:00 · 低谷 {{ lowHour }}:00</div>
      </div>

      <!-- 顶部念珠状 24 小时小圆 -->
      <div class="hour-beads">
        <span
          v-for="(v, h) in hourly"
          :key="h"
          class="bead"
          :style="{
            background: beadColor(v),
            width: beadSize(v) + 'px',
            height: beadSize(v) + 'px',
            boxShadow: v > 40 ? `0 0 8px ${beadColor(v)}88` : 'none',
          }"
          :title="`${h}:00 — ${v} 条`"
        ></span>
      </div>
      <div class="hour-axis">
        <span>子</span><span>丑</span><span>寅</span><span>卯</span>
        <span>辰</span><span>巳</span><span>午</span><span>未</span>
        <span>申</span><span>酉</span><span>戌</span><span>亥</span>
      </div>

      <!-- AI 时辰解读 -->
      <div class="hour-insights">
        <div class="hi-item">
          <div class="hi-hour hi-peak">
            <span class="hi-prefix">高峰</span>
            <span class="hi-time">{{ hourRangeText(peakHour) }}</span>
            <span class="hi-count">{{ peakPct }}% 投递集中</span>
          </div>
          <p class="hi-desc" v-if="themeHour?.peakText" v-html="themeHour.peakText"></p>
          <p class="hi-desc" v-else>
            {{ peakHour }} 时是人们最愿意向它倾诉的时刻。口吻最柔软，"想你""对不起""没关系"
            这类软词出现频次显著升高。
          </p>
        </div>

        <div class="hi-item">
          <div class="hi-hour hi-low">
            <span class="hi-prefix">低谷</span>
            <span class="hi-time">{{ hourRangeText(lowHour) }}</span>
            <span class="hi-count">仅 {{ lowPct }}% 故事</span>
          </div>
          <p class="hi-desc" v-if="themeHour?.lowText" v-html="themeHour.lowText"></p>
          <p class="hi-desc" v-else>
            {{ lowHour }} 时故事虽少，读起来却最轻盈。故事结尾以"释然""没关系""向前看"收尾的比例，
            明显高于其他时段。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TreeDeciduous, Clock3, Leaf } from 'lucide-vue-next'
import type { ThemeHourPayload } from '../../composables/useStarAnalysis'

const props = withDefaults(defineProps<{
  themeHour?: ThemeHourPayload
}>(), {})

// Fallback 假数据
const FALLBACK: ThemeHourPayload = {
  themes: [
    { name: '思乡亲情', count: 248, color: '#ffd98a' },
    { name: '深夜独处', count: 192, color: '#86a8ff' },
    { name: '爱情离别', count: 156, color: '#ff8b7d' },
    { name: '成长困惑', count: 128, color: '#caa7ff' },
    { name: '童年回忆', count: 97,  color: '#9ae6b4' },
    { name: '城市漂泊', count: 76,  color: '#fbb6ce' },
    { name: '梦想坚持', count: 58,  color: '#93c5fd' },
    { name: '平凡日常', count: 41,  color: '#a7f3d0' },
  ],
  hourly: [3, 2, 1, 1, 0, 1, 2, 7, 11, 14, 13, 17, 15, 12, 10, 9, 11, 18, 27, 41, 57, 63, 48, 21],
  peakHour: 21,
  lowHour: 4,
}

const rawThemes = computed(() => props.themeHour?.themes?.length ? props.themeHour.themes : FALLBACK.themes)
const hourly     = computed(() => props.themeHour?.hourly?.length === 24 ? props.themeHour.hourly : FALLBACK.hourly)
const peakHour   = computed(() => props.themeHour?.peakHour ?? FALLBACK.peakHour)
const lowHour    = computed(() => props.themeHour?.lowHour  ?? FALLBACK.lowHour)

const maxCount = computed(() => Math.max(...rawThemes.value.map(t => t.count), 1))
const total    = computed(() => rawThemes.value.reduce((a, b) => a + b.count, 0))
const themes   = computed(() => rawThemes.value.slice(0, 8).map(t => {
  const ratio = Math.max(0.1, t.count / maxCount.value)
  const h1 = Math.round(16 + ratio * 18)
  const h2 = ratio > 0.4 ? Math.round(12 + (ratio - 0.4) * 22) : 0
  const h3 = ratio > 0.7 ? Math.round(10 + (ratio - 0.7) * 30) : 0
  const w1 = Math.round(10 + ratio * 11)
  const w2 = Math.round(7 + ratio * 9)
  const w3 = Math.round(4 + ratio * 7)
  const trunk = Math.round(8 + (1 - ratio) * 8)
  return { ...t, h1, h2, h3, w1, w2, w3, trunk }
}))

// AI 观察 fallback 动态文案
const topThemeName = computed(() => themes.value[0]?.name ?? '—')
const topThemePct  = computed(() => {
  if (!total.value) return 0
  return Math.round((themes.value[0]?.count ?? 0) / total.value * 100)
})

// 时辰解读辅助
const hourSum = computed(() => Math.max(1, hourly.value.reduce((a, b) => a + b, 0)))
const peakPct = computed(() => Math.max(1, Math.round(hourly.value[peakHour.value] / hourSum.value * 100)))
const lowPct  = computed(() => Math.max(0.1, Math.round(hourly.value[lowHour.value] / hourSum.value * 100 * 10) / 10))

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

// 24 小时珠子颜色 + 尺寸
function beadColor(v: number) {
  if (v < 3) return 'rgba(255,255,255,0.12)'
  if (v < 10) return 'rgba(134,168,255,0.35)'
  if (v < 25) return 'rgba(154,230,180,0.45)'
  if (v < 45) return 'rgba(202,167,255,0.55)'
  return 'rgba(255,217,138,0.85)'
}
function beadSize(v: number) {
  return 4 + Math.min(10, Math.round(v / 8))
}
</script>

<style scoped>
.stack-wrap {
  margin: 0 28px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ai-card {
  padding: 16px 18px 18px;
  background: rgba(255,255,255,0.015);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  position: relative;
}
.ai-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(202,167,255,0.4), rgba(255,217,138,0.4), transparent);
  pointer-events: none;
}

/* 头：徽章 + 右侧说明 */
.ai-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.ai-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.03em;
}
.ai-badge-green {
  background: linear-gradient(135deg, rgba(154,230,180,0.18), rgba(255,217,138,0.08));
  border: 1px solid rgba(154,230,180,0.3);
  color: #9ae6b4;
}
.ai-badge-blue {
  background: linear-gradient(135deg, rgba(134,168,255,0.2), rgba(202,167,255,0.08));
  border: 1px solid rgba(134,168,255,0.32);
  color: #86a8ff;
}
.ai-spark {
  color: #ffd98a;
  animation: twinkle 2.4s ease-in-out infinite;
}
@keyframes twinkle {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}
.ai-sub {
  font-size: 0.6rem;
  color: rgba(255,255,255,0.22);
  letter-spacing: 0.03em;
}

/* 主题森林 */
.tree-rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0 10px;
  margin-bottom: 10px;
  border-bottom: 1px dashed rgba(255,255,255,0.05);
}
.tree-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.tree {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.tree-svg {
  width: 100%;
  height: 72px;
  display: block;
}
.tree-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.tree-name {
  font-size: 0.6rem;
  color: rgba(255,255,255,0.55);
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.tree-count {
  font-size: 0.62rem;
  font-weight: 700;
  color: rgba(255,255,255,0.3);
  font-variant-numeric: tabular-nums;
}
.forest-note {
  display: flex;
  gap: 9px;
  padding: 10px 11px;
  background: rgba(154,230,180,0.04);
  border-radius: 6px;
  border-left: 2px solid rgba(154,230,180,0.35);
  align-items: flex-start;
}
.leaf-ico {
  color: #9ae6b4;
  opacity: 0.8;
  margin-top: 3px;
  flex-shrink: 0;
}
.note-text {
  font-size: 0.73rem;
  line-height: 1.75;
  color: rgba(255,255,255,0.5);
}
.note-lead {
  font-size: 0.66rem;
  color: #9ae6b4;
  font-weight: 700;
  margin-right: 4px;
  letter-spacing: 0.04em;
}
.hi-gold   { color: #ffd98a; font-style: normal; font-weight: 700; }
.hi-purple { color: #caa7ff; font-style: normal; font-weight: 700; }
.hi-blue   { color: #86a8ff; font-style: normal; font-weight: 700; }

/* 时辰观察 */
.hour-beads {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 6px;
  margin-bottom: 2px;
}
.bead {
  border-radius: 50%;
  flex-shrink: 0;
  transition: transform 0.15s;
}
.bead:hover { transform: scale(1.6); z-index: 2; }
.hour-axis {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  text-align: center;
  font-size: 0.58rem;
  color: rgba(255,255,255,0.25);
  padding: 0 2px 10px;
  margin-bottom: 10px;
  border-bottom: 1px dashed rgba(255,255,255,0.05);
  letter-spacing: 0.08em;
}
.hour-insights {
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.hi-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.hi-hour {
  display: flex;
  align-items: center;
  gap: 7px;
}
.hi-prefix {
  font-size: 0.58rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  letter-spacing: 0.06em;
}
.hi-peak .hi-prefix {
  background: rgba(255,217,138,0.15);
  color: #ffd98a;
}
.hi-low .hi-prefix {
  background: rgba(134,168,255,0.15);
  color: #86a8ff;
}
.hi-time {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255,255,255,0.75);
}
.hi-count {
  font-size: 0.6rem;
  color: rgba(255,255,255,0.28);
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.hi-desc {
  margin: 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(255,255,255,0.022);
  font-size: 0.72rem;
  line-height: 1.8;
  color: rgba(255,255,255,0.48);
}

@media (max-width: 900px) {
  .stack-wrap {
    margin: 0 18px 16px;
  }
}
</style>
