<template>
  <div v-if="!hasData" class="empty-state">
    <Sparkle :size="10" class="pw-icon pw-gold" style="animation:tw 2.2s ease-in-out infinite" />
    <span>AI 情感与摘录生成中…</span>
  </div>
  <div v-else class="stack-wrap">
    <!-- 1. 情感解构 -->
    <div class="panel-wrapper pw-emotion">
      <div class="panel-head">
        <Sparkle :size="10" class="pw-icon pw-purple" />
        <span class="pw-title">情感解构</span>
        <span class="pw-count">{{ storyCount }} 条 · 5 维模型</span>
      </div>
      <div class="pw-body">
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
              <div class="e-title" :style="`--c:${ins.color}`" v-html="titleHTML(ins)"></div>
              <div class="e-desc">{{ ins.desc }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 故事摘录 -->
    <div class="panel-wrapper pw-quote">
      <div class="panel-head">
        <Quote :size="10" class="pw-icon pw-gold" />
        <span class="pw-title">故事摘录</span>
        <span class="pw-count">AI 精选 3 段独白</span>
      </div>
      <div class="pw-body">
        <div class="quote-list">
          <div class="quote-item" v-for="(q, i) in quotes" :key="i">
            <svg v-if="q.illus === 'moon'" viewBox="0 0 60 60" class="illus">
              <circle cx="14" cy="18" r="1" fill="#fff" opacity="0.5" />
              <circle cx="45" cy="44" r="0.7" fill="#fff" opacity="0.4" />
              <circle cx="30" cy="10" r="0.5" fill="#fff" opacity="0.3" />
              <path d="M42 28 a16 16 0 1 0 0 20 a12 12 0 1 1 0 -20z" fill="#ffd98a" opacity="0.6" />
            </svg>
            <svg v-else-if="q.illus === 'house'" viewBox="0 0 60 60" class="illus">
              <path d="M30 14 L14 28 L18 28 L18 48 L42 48 L42 28 L46 28 Z"
                fill="none" stroke="rgba(255,217,138,0.55)" stroke-width="1.2" stroke-linejoin="round" />
              <rect x="26" y="36" width="8" height="12" fill="none" stroke="rgba(255,217,138,0.4)" stroke-width="1" />
            </svg>
            <svg v-else viewBox="0 0 60 60" class="illus">
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
  </div>
</template>

<script setup lang="ts">
import { Sparkle, Quote } from 'lucide-vue-next'
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

// 让 <b>炽热守望</b> 这种 AI 返回的 HTML 标题正确渲染，同时安全拼接百分号 span
function titleHTML(ins: { title: string; pct: string; color: string }) {
  const escPct = ins.pct.replace(/"/g, '&quot;')
  return `${ins.title} <span class="e-pct" style="color:${ins.color}">${escPct}</span>`
}
function orbSize(e: { value: number }) { return 40 + (e.value ?? 0) * 26 }
</script>

<style scoped>
.empty-state {
  margin: 0 28px 14px;
  padding: 28px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.72rem;
  color: rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.018);
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.05);
}
@keyframes tw { 0%,100%{opacity:.4} 50%{opacity:.95} }

/* ── 与 narrative-bottom 中的 panel-wrapper 完全一致 ── */
.stack-wrap {
  margin: 0 28px 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.panel-wrapper {
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  overflow: hidden;
  min-height: 0;
}
.panel-wrapper::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
}
/* 两张子卡各自的顶线颜色（参考内核相似=金、天区精选=紫） */
.pw-emotion::before {
  background: linear-gradient(90deg, transparent, rgba(202,167,255,0.4), transparent);
}
.pw-quote::before {
  background: linear-gradient(90deg, transparent, rgba(255,217,138,0.4), transparent);
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.pw-icon { opacity: 0.85; flex-shrink: 0; }
.pw-gold { color: #ffd98a; }
.pw-purple { color: #caa7ff; }
.pw-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
}
.pw-count {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.22);
  letter-spacing: 0.03em;
}

/* 卡片内部 body，不再搞额外 padding */
.pw-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding-right: 2px;
}
.pw-body::-webkit-scrollbar { width: 5px; }
.pw-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 999px; }

/* 情感解构内部 */
.emotion-orbs {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 4px 2px 6px;
  min-height: 82px;
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
  line-height: 1.5;
}
.e-title :deep(b),
.e-title :deep(strong) { color: #ffd98a; font-weight: 700; }
.e-pct {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-size: 0.7rem;
  margin-left: auto;
}
.e-desc {
  font-size: 0.72rem;
  line-height: 1.72;
  color: rgba(255,255,255,0.42);
  text-align: justify;
}

/* 故事摘录内部 */
.quote-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
.illus { width: 42px; height: 42px; align-self: center; opacity: 0.9; }
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
