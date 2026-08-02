<template>
  <div class="double-wrap">
    <!-- 主题森林 -->
    <div class="card forest-card">
      <div class="card-head">
        <TreeDeciduous :size="10" class="head-ico ico-green" />
        <span class="head-title">主题森林</span>
        <span class="head-sub">{{ total }} 条故事 · 8 个主题</span>
      </div>

      <!-- 8 棵小树苗：上排 4，下排 4 -->
      <div class="tree-rows">
        <div class="tree-row">
          <div class="tree" v-for="t in themes.slice(0, 4)" :key="t.name">
            <svg viewBox="0 0 48 68" class="tree-svg">
              <!-- 树干 -->
              <rect x="22" :y="68 - t.trunk" width="4" :height="t.trunk" fill="rgba(255,217,138,0.35)" />
              <!-- 树冠 3 层 -->
              <polygon v-if="t.h1 > 0"
                :points="`24,${68 - t.trunk - t.h1} ${24 - t.w1},${68 - t.trunk + 4} ${24 + t.w1},${68 - t.trunk + 4}`"
                :fill="t.color" opacity="0.92" />
              <polygon v-if="t.h2 > 0"
                :points="`24,${68 - t.trunk - t.h1 - t.h2} ${24 - t.w2},${68 - t.trunk - t.h1 + 4} ${24 + t.w2},${68 - t.trunk - t.h1 + 4}`"
                :fill="t.color" opacity="0.88" />
              <polygon v-if="t.h3 > 0"
                :points="`24,${68 - t.trunk - t.h1 - t.h2 - t.h3} ${24 - t.w3},${68 - t.trunk - t.h1 - t.h2 + 4} ${24 + t.w3},${68 - t.trunk - t.h1 - t.h2 + 4}`"
                :fill="t.color" opacity="0.95" />
              <!-- 顶星 -->
              <circle v-if="t.count >= 120" cx="24" :cy="68 - t.trunk - t.h1 - t.h2 - t.h3 - 4"
                r="1.6" fill="#ffd98a" />
            </svg>
            <div class="tree-meta">
              <div class="tree-name">{{ t.name }}</div>
              <div class="tree-count">{{ t.count }}</div>
            </div>
          </div>
        </div>
        <div class="tree-row tree-row-2">
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
          <span>「思乡与亲情」主题树木最粗壮，故事量占全星 <em class="hi-gold">32%</em>；成长困惑与平凡日常虽是小树，
          但近 6 周增速最快，分别环比上涨 <em class="hi-purple">142%</em> 与 <em class="hi-blue">97%</em>。</span>
        </div>
      </div>
    </div>

    <!-- 时辰观察 -->
    <div class="card hour-card">
      <div class="card-head">
        <Clock3 :size="10" class="head-ico ico-blue" />
        <span class="head-title">时辰观察</span>
        <span class="head-sub">高峰 {{ peakHour }}:00 · 低谷 {{ lowHour }}:00</span>
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
            <span class="hi-time">子时 · 23-01</span>
            <span class="hi-count">28.4% 投递集中</span>
          </div>
          <p class="hi-desc">
            这个时段的故事最柔软。AI 反复观察到"妈妈""对不起""好想你"等软词出现率是白天的 <em class="hi-gold">3.4 倍</em>，
            人们仿佛只有在万籁俱寂时才敢把心掀开一条缝。
          </p>
        </div>

        <div class="hi-item">
          <div class="hi-hour hi-low">
            <span class="hi-prefix">低谷</span>
            <span class="hi-time">卯时 · 05-07</span>
            <span class="hi-count">仅 0.6% 故事</span>
          </div>
          <p class="hi-desc">
            清晨投递虽少，却是<strong>释然率最高</strong>的时辰。卯时故事的释然结尾比例高达 <em class="hi-purple">62%</em>，
            仿佛醒来的时候，人也更容易和自己和解。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TreeDeciduous, Clock3, Leaf } from 'lucide-vue-next'

// 8 主题（count 范围 41 ~ 248）
const rawThemes = [
  { name: '思乡亲情', count: 248, color: '#ffd98a' },
  { name: '深夜独处', count: 192, color: '#86a8ff' },
  { name: '爱情离别', count: 156, color: '#ff8b7d' },
  { name: '成长困惑', count: 128, color: '#caa7ff' },
  { name: '童年回忆', count: 97, color: '#9ae6b4' },
  { name: '城市漂泊', count: 76, color: '#fbb6ce' },
  { name: '梦想坚持', count: 58, color: '#93c5fd' },
  { name: '平凡日常', count: 41, color: '#a7f3d0' },
]
const maxCount = Math.max(...rawThemes.map(t => t.count))
const total = rawThemes.reduce((a, b) => a + b.count, 0)
// 把 count 转成树冠 3 层大小
const themes = rawThemes.map(t => {
  const ratio = t.count / maxCount // 0.165 ~ 1
  const h1 = Math.round(16 + ratio * 18)     // 19 ~ 34
  const h2 = ratio > 0.4 ? Math.round(12 + (ratio - 0.4) * 22) : 0
  const h3 = ratio > 0.7 ? Math.round(10 + (ratio - 0.7) * 30) : 0
  const w1 = Math.round(10 + ratio * 11)     // 12 ~ 21
  const w2 = Math.round(7 + ratio * 9)       // 8 ~ 16
  const w3 = Math.round(4 + ratio * 7)       // 5 ~ 11
  const trunk = Math.round(8 + (1 - ratio) * 8) // 越高越短，反之亦然
  return { ...t, h1, h2, h3, w1, w2, w3, trunk }
})

// 24 小时分布
const hourly = [3, 2, 1, 1, 0, 1, 2, 7, 11, 14, 13, 17, 15, 12, 10, 9, 11, 18, 27, 41, 57, 63, 48, 21]
const peakHour = computed(() => hourly.indexOf(Math.max(...hourly)))
const lowHour = computed(() => {
  const min = Math.min(...hourly)
  return hourly.findIndex(h => h === min)
})
// 珠子颜色 + 尺寸
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
.double-wrap {
  margin: 0 28px 22px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.card {
  background: rgba(255,255,255,0.018);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 10px;
  padding: 14px 16px 16px;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.head-ico { opacity: 0.85; }
.ico-green { color: #9ae6b4; }
.ico-blue { color: #86a8ff; }
.head-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255,255,255,0.8);
  flex: 1;
}
.head-sub {
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
.hi-gold { color: #ffd98a; font-style: normal; font-weight: 700; }
.hi-purple { color: #caa7ff; font-style: normal; font-weight: 700; }
.hi-blue { color: #86a8ff; font-style: normal; font-weight: 700; }

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
  background: rgba(255,217,138,0.18);
  color: #ffd98a;
}
.hi-low .hi-prefix {
  background: rgba(134,168,255,0.18);
  color: #86a8ff;
}
.hi-time {
  font-size: 0.74rem;
  font-weight: 600;
  color: rgba(255,255,255,0.72);
  flex: 1;
}
.hi-count {
  font-size: 0.6rem;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.02em;
}
.hi-desc {
  margin: 0;
  font-size: 0.73rem;
  line-height: 1.75;
  color: rgba(255,255,255,0.48);
  padding: 7px 10px;
  background: rgba(255,255,255,0.018);
  border-radius: 5px;
  text-align: justify;
}
.hi-desc strong {
  color: rgba(255,255,255,0.75);
  font-weight: 600;
}

@media (max-width: 900px) {
  .double-wrap {
    grid-template-columns: 1fr;
    margin: 0 18px 20px;
  }
}
</style>
