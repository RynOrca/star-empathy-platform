<template>
  <div class="double-wrap">
    <!-- 情感解构卡片 -->
    <div class="card emotion-card">
      <div class="card-head">
        <Sparkle :size="10" class="head-ico ico-purple" />
        <span class="head-title">情感解构</span>
        <span class="head-sub">基于 5 维情感模型 · {{ storyCount }} 条语料</span>
      </div>

      <div class="emotion-body">
        <div class="emotion-orbs">
          <span
            v-for="e in emotions"
            :key="e.name"
            class="orb"
            :style="{ width: orbSize(e) + 'px', height: orbSize(e) + 'px', background: `radial-gradient(circle at 35% 30%, ${e.color}dd, ${e.color}33 70%, transparent)`, boxShadow: `0 0 ${10 + e.value * 16}px ${e.color}55` }"
          >
            <span class="orb-label">{{ e.name }}</span>
            <span class="orb-val">{{ Math.round(e.value * 100) }}</span>
          </span>
        </div>

        <div class="emotion-paras">
          <div class="e-para" v-for="(ins, i) in emotionInsights" :key="i">
            <span class="e-dot" :style="{ background: ins.color }"></span>
            <div class="e-text">
              <div class="e-title">
                {{ ins.title }}
                <span class="e-pct" :style="{ color: ins.color }">{{ ins.pct }}</span>
              </div>
              <div class="e-desc">{{ ins.desc }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 故事摘录卡片 -->
    <div class="card quote-card">
      <div class="card-head">
        <Quote :size="10" class="head-ico ico-gold" />
        <span class="head-title">故事摘录</span>
        <span class="head-sub">AI 精选的 3 段最动人独白</span>
      </div>

      <div class="quote-list">
        <div class="quote-item" v-for="(q, i) in quotes" :key="i">
          <!-- 右侧小插画 -->
          <svg v-if="q.illus === 'moon'" viewBox="0 0 60 60" class="illus illus-moon">
            <circle cx="14" cy="18" r="1" fill="#fff" opacity="0.5" />
            <circle cx="45" cy="44" r="0.7" fill="#fff" opacity="0.4" />
            <circle cx="30" cy="10" r="0.5" fill="#fff" opacity="0.3" />
            <path d="M42 28 a16 16 0 1 0 0 20 a12 12 0 1 1 0 -20z" fill="#ffd98a" opacity="0.6" />
          </svg>
          <svg v-else-if="q.illus === 'house'" viewBox="0 0 60 60" class="illus illus-house">
            <path d="M30 14 L14 28 L18 28 L18 48 L42 48 L42 28 L46 28 Z"
              fill="none" stroke="rgba(255,217,138,0.55)" stroke-width="1.2" stroke-linejoin="round" />
            <rect x="26" y="36" width="8" height="12" fill="none" stroke="rgba(255,217,138,0.4)" stroke-width="1" />
            <path d="M22 14 h16" stroke="rgba(255,217,138,0.2)" stroke-width="0.8" />
          </svg>
          <svg v-else-if="q.illus === 'sakura'" viewBox="0 0 60 60" class="illus illus-sakura">
            <g stroke="rgba(251,182,206,0.55)" stroke-width="0.8" fill="none">
              <path d="M30 50 L30 20" />
              <path d="M30 30 L20 22 M30 26 L42 18 M30 36 L22 30" />
            </g>
            <g fill="rgba(251,182,206,0.65)">
              <circle cx="20" cy="22" r="1.3" /><circle cx="42" cy="18" r="1.2" />
              <circle cx="22" cy="30" r="1.1" /><circle cx="36" cy="34" r="1" />
              <circle cx="30" cy="18" r="1" />
            </g>
          </svg>

          <div class="quote-body">
            <div class="quote-mark" :style="{ color: q.color }">"</div>
            <div class="quote-text">{{ q.text }}</div>
            <div class="quote-meta">
              <span class="q-tag" v-for="t in q.tags" :key="t">#{{ t }}</span>
              <span class="q-spacer"></span>
              <span class="q-author">{{ q.author }}</span>
              <span class="q-date">· {{ q.date }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkle, Quote } from 'lucide-vue-next'

defineProps<{ storyCount?: number }>()

const emotions = [
  { name: '思念', value: 0.88, color: '#ffd98a' },
  { name: '孤独', value: 0.74, color: '#86a8ff' },
  { name: '希望', value: 0.62, color: '#9ae6b4' },
  { name: '释然', value: 0.48, color: '#caa7ff' },
  { name: '共鸣', value: 0.81, color: '#ff8b7d' },
]
function orbSize(e: { value: number }) { return 40 + e.value * 26 }

const emotionInsights = [
  {
    title: '主色调 · 浓思念',
    pct: '42.3%',
    color: '#ffd98a',
    desc: '每 5 条故事里就有 2 条在写"想回去的地方"，频次是全星库平均的 2.1 倍。这颗星像一只收集乡愁的瓶子。',
  },
  {
    title: '暗涌 · 深夜孤独',
    pct: '28.1%',
    color: '#86a8ff',
    desc: '故事里高频出现"一个人""睡不着""安静的房间"。但孤独并不悲伤，人们更愿意把它写得很温柔。',
  },
  {
    title: '暖色尾调 · 希望与共鸣',
    pct: '23.6%',
    color: '#ff8b7d',
    desc: '37% 的故事以释然结尾。即使开头写得悲伤，最后一句总有人写"谢谢有人愿意听"。',
  },
]

const quotes = [
  {
    text: '老家的樱花开了，我在三千公里外看到这颗星，就当奶奶也在看我。',
    color: '#ffd98a',
    tags: ['思乡', '奶奶'],
    author: '@匿名星友·东京',
    date: '3 天前',
    illus: 'sakura',
  },
  {
    text: '失眠第三十七天，我跟这颗星说的话，比跟过去一年认识的人都多。',
    color: '#86a8ff',
    tags: ['深夜', '倾诉'],
    author: '@某颗小行星',
    date: '上周',
    illus: 'moon',
  },
  {
    text: '终于搬离了出租屋。最后一晚在这里看星星，原来只要抬头，就一直有家。',
    color: '#caa7ff',
    tags: ['搬家', '治愈'],
    author: '@月光在左',
    date: '6 月 14 日',
    illus: 'house',
  },
]
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
.ico-purple { color: #caa7ff; }
.ico-gold { color: #ffd98a; }
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

/* ── 情感解构 ── */
.emotion-body { display: flex; flex-direction: column; gap: 14px; }
.emotion-orbs {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 8px 4px 6px;
  min-height: 92px;
  border-bottom: 1px dashed rgba(255,255,255,0.05);
}
.orb {
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}
.orb-label {
  font-size: 0.62rem;
  color: rgba(255,255,255,0.9);
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.35);
  line-height: 1;
  margin-bottom: 2px;
}
.orb-val {
  font-size: 0.58rem;
  color: rgba(255,255,255,0.75);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1;
  opacity: 0.8;
}
.emotion-paras {
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.e-para {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.e-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
}
.e-text { flex: 1; min-width: 0; }
.e-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 2px;
  font-size: 0.76rem;
  font-weight: 600;
  color: rgba(255,255,255,0.72);
}
.e-pct {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-size: 0.72rem;
}
.e-desc {
  font-size: 0.73rem;
  line-height: 1.75;
  color: rgba(255,255,255,0.45);
  text-align: justify;
}

/* ── 故事摘录 ── */
.quote-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.quote-item {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 10px;
  padding: 10px 10px 10px 12px;
  border-radius: 7px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.035);
  position: relative;
}
.illus {
  width: 48px;
  height: 48px;
  align-self: center;
  opacity: 0.92;
}
.quote-body { position: relative; padding: 2px 2px 2px 6px; }
.quote-mark {
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 0.6;
  opacity: 0.55;
  margin-bottom: 2px;
  font-family: Georgia, serif;
  display: block;
}
.quote-text {
  font-size: 0.76rem;
  line-height: 1.75;
  color: rgba(255,255,255,0.65);
  margin-bottom: 6px;
  font-style: italic;
}
.quote-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 0.58rem;
  color: rgba(255,255,255,0.28);
}
.q-tag {
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.45);
  letter-spacing: 0.02em;
}
.q-spacer { flex: 1; }
.q-author { color: rgba(255,255,255,0.4); font-weight: 500; }
.q-date { color: rgba(255,255,255,0.22); }

@media (max-width: 900px) {
  .double-wrap {
    grid-template-columns: 1fr;
    margin: 0 18px 20px;
  }
}
</style>
