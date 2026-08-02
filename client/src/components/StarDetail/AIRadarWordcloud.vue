<template>
  <div v-if="!hasData" class="empty-state">
    <Sparkle :size="11" class="es-ic" />
    <span>情感分析生成中…</span>
  </div>
  <div v-else class="stack-wrap">
    <div class="ai-card emotion-card">
      <div class="card-head">
        <span class="card-title">情感解构</span>
        <span class="card-sub">{{ storyCount }} 条语料 · 5 维模型</span>
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

    <div class="ai-card quote-card">
      <div class="card-head">
        <span class="card-title">故事摘录</span>
        <span class="card-sub">AI 精选 3 段独白</span>
      </div>
      <div class="quote-list">
        <div class="quote-item" v-for="(q, i) in quotes" :key="i">
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
          </svg>
          <svg v-else viewBox="0 0 60 60" class="illus illus-sakura">
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
import { Sparkle } from 'lucide-vue-next'
import { computed } from 'vue'
import type { EmotionPayload } from '../../composables/useStarAnalysis'

const props = withDefaults(defineProps<{
  storyCount?: number
  emotion?: EmotionPayload
}>(), { storyCount: 0 })

const hasData = computed(() => {
  const e = props.emotion
  return !!(e && Array.isArray(e.emotions) && e.emotions.length >= 5
    && Array.isArray(e.insights) && e.insights.length >= 3
    && Array.isArray(e.quotes) && e.quotes.length >= 3)
})

const emotions = computed(() => props.emotion?.emotions ?? [])
const emotionInsights = computed(() => props.emotion?.insights ?? [])
const quotes = computed(() => props.emotion?.quotes ?? [])
function orbSize(e: { value: number }) { return 40 + (e.value ?? 0) * 26 }
</script>

<style scoped>
.empty-state {
  margin: 0 28px 16px;
  padding: 28px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.72rem;
  color: rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.012);
  border-radius: 10px;
  border: 1px dashed rgba(255,255,255,0.06);
}
.es-ic { color: #caa7ff; animation: tw 2.2s ease-in-out infinite; }
@keyframes tw { 0%,100%{opacity:.35} 50%{opacity:.9} }

.stack-wrap {
  margin: 0 28px 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.ai-card {
  padding: 12px 14px 14px;
  background: rgba(255,255,255,0.012);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 10px;
}
.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px dashed rgba(255,255,255,0.05);
}
.card-title {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(255,255,255,0.62);
}
.card-sub {
  font-size: 0.6rem;
  color: rgba(255,255,255,0.2);
  letter-spacing: 0.02em;
}

/* 情感解构 */
.emotion-body { display: flex; flex-direction: column; gap: 10px; }
.emotion-orbs {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 4px 2px 6px;
  min-height: 86px;
  border-bottom: 1px dashed rgba(255,255,255,0.04);
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
  gap: 8px;
}
.e-para {
  display: flex;
  gap: 9px;
  align-items: flex-start;
}
.e-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
  box-shadow: 0 0 5px currentColor;
}
.e-text { flex: 1; min-width: 0; }
.e-title {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-bottom: 2px;
  font-size: 0.74rem;
  font-weight: 600;
  color: rgba(255,255,255,0.68);
}
.e-pct {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-size: 0.7rem;
}
.e-desc {
  font-size: 0.72rem;
  line-height: 1.72;
  color: rgba(255,255,255,0.42);
  text-align: justify;
}

/* 故事摘录 */
.quote-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 2px;
}
.quote-item {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 9px;
  padding: 9px;
  border-radius: 6px;
  background: rgba(255,255,255,0.015);
  border: 1px solid rgba(255,255,255,0.03);
}
.illus {
  width: 42px; height: 42px;
  align-self: center;
  opacity: 0.9;
}
.quote-body { position: relative; padding: 0; }
.quote-mark {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 0.5;
  opacity: 0.5;
  font-family: Georgia, serif;
  display: block;
}
.quote-text {
  font-size: 0.74rem;
  line-height: 1.7;
  color: rgba(255,255,255,0.62);
  margin: 4px 0 5px;
  font-style: italic;
}
.quote-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 0.56rem;
  color: rgba(255,255,255,0.26);
}
.q-tag {
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.42);
  letter-spacing: 0.02em;
}
.q-spacer { flex: 1; }
.q-author { color: rgba(255,255,255,0.38); font-weight: 500; }
.q-date { color: rgba(255,255,255,0.22); }

@media (max-width: 900px) {
  .stack-wrap { margin: 0 18px 14px; grid-template-columns: 1fr; }
  .empty-state { margin: 0 18px 14px; }
}
</style>
