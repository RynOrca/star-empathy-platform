<template>
  <div class="stack-wrap">
    <!-- 1. 情感解构 -->
    <div class="panel-wrapper pw-emotion">
      <div class="panel-head">
        <Sparkle :size="10" class="pw-icon pw-purple" />
        <span class="pw-title">情感解构</span>
        <span class="pw-count">{{ hasEmotion ? `${storyCount} 条 · 5 维模型` : (tooFewStories ? '未生成' : '生成中') }}</span>
      </div>

      <!-- 真实数据 -->
      <div v-if="hasEmotion" class="pw-body">
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

      <!-- 空态 1：故事数太少 -->
      <div v-else-if="tooFewStories" class="mini-empty mini-scant">
        <BookDashed :size="13" />
        <div class="me-title">星星故事不足</div>
        <div class="me-sub">当前 <b>{{ storyCount }}</b> 条故事，达 5 条后生成</div>
      </div>

      <!-- 空态 2：生成中 -->
      <div v-else class="mini-empty mini-loading mini-loading-purple">
        <Sparkle :size="13" class="spin-slow" />
        <div class="me-title">AI 情感解构生成中…</div>
        <div class="me-sub">正在提取 {{ storyCount }} 条故事的情绪构成</div>
        <div class="mini-sk"><span></span><span></span></div>
      </div>
    </div>

    <!-- 2. 故事摘录 -->
    <div class="panel-wrapper pw-quote">
      <div class="panel-head">
        <Quote :size="10" class="pw-icon pw-gold" />
        <span class="pw-title">故事摘录</span>
        <span class="pw-count">{{ hasQuote ? 'AI 精选 3 段独白' : (tooFewStories ? '未生成' : '生成中') }}</span>
      </div>

      <!-- 真实数据：参考星笺 AI 选本卡片结构（左侧色条+排名徽标+荐语行+摘录+底栏） -->
      <div v-if="hasQuote" class="pw-body">
        <div class="quote-list">
          <article
            class="quote-item"
            v-for="(q, i) in quotes"
            :key="i"
            :style="{ '--accent': q.color, '--cs-idx': i } as Record<string, string | number>"
          >
            <!-- 左侧：排名徽标 + 1px 色条（::before） -->
            <div class="quote-side">
              <span class="quote-rank" :class="`quote-rank-${i + 1}`">{{ quoteRanks[i] }}</span>
            </div>

            <!-- 主体：头部作者 → AI 荐语 → 摘录 → 底栏日期/标签 -->
            <div class="quote-body">
              <div class="quote-head">
                <span class="quote-headline">摘录 · {{ quoteHeadline(q, i) }}</span>
                <span class="quote-author" v-if="q.author">{{ q.author }}</span>
              </div>

              <!-- AI 荐语（由标签生成短神韵句，与合集 reason 同款） -->
              <div class="quote-reason">
                <Sparkles :size="8" class="quote-reason-icon" />
                <span class="quote-reason-prefix">荐：</span>
                <span class="quote-reason-text">{{ quoteReason(q, i) }}</span>
              </div>

              <!-- 摘录正文（3 行截断） -->
              <p class="quote-text">{{ q.text }}</p>

              <div class="quote-foot">
                <span class="quote-date" v-if="q.date">
                  <Clock :size="8" class="quote-foot-icon" />
                  {{ q.date }}
                </span>
                <div class="quote-tags" v-if="q.tags?.length">
                  <span v-for="(t, ti) in q.tags.slice(0, 2)" :key="ti" class="quote-tag">#{{ t }}</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <!-- 空态 1：故事数太少 -->
      <div v-else-if="tooFewStories" class="mini-empty mini-scant">
        <BookDashed :size="13" />
        <div class="me-title">星星故事不足</div>
        <div class="me-sub">当前 <b>{{ storyCount }}</b> 条故事，达 5 条后摘录</div>
      </div>

      <!-- 空态 2：生成中 -->
      <div v-else class="mini-empty mini-loading mini-loading-gold">
        <Quote :size="13" class="spin-slow" />
        <div class="me-title">AI 故事摘录生成中…</div>
        <div class="me-sub">正在从 {{ storyCount }} 条故事中抽取独白片段</div>
        <div class="mini-sk mini-sk-gold"><span></span><span></span></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkle, Quote, BookDashed, Sparkles, Clock } from 'lucide-vue-next'
import { computed } from 'vue'
import type { EmotionPayload } from '../../composables/useStarAnalysis'

type StoryQuoteShape = { text: string; color: string; tags?: string[]; author?: string; date?: string; illus?: string }

const props = withDefaults(defineProps<{
  storyCount?: number
  emotion?: EmotionPayload
  /** 后端整套分析是否已生成（ready=true → 即使 emotion 缺也不再显示无限加载） */
  analysisReady?: boolean
}>(), { storyCount: 0, analysisReady: false })

/** 摘录排名（与合集同款希腊字母序号） */
const quoteRanks = ['α', 'β', 'γ']
/** 摘录小标题（从首标签派生，缺省给 3 类固定兜底） */
function quoteHeadline(q: StoryQuoteShape, i: number): string {
  if (q.tags?.[0]) return q.tags[0]
  return ['深夜独白', '心口一念', '夜雨寄远'][i] ?? '心语'
}
/** AI 荐语：≤10 字神韵句，同款合集 reason fallback 逻辑 */
function quoteReason(q: StoryQuoteShape, i: number): string {
  const themeWord = q.tags?.[0] ?? '心事'
  const pool = [
    `「${themeWord}」最入心`,
    `字字切「${themeWord}」`,
    `光景最真切`,
    `余味最长的「${themeWord}」`,
  ]
  return pool[i % pool.length]
}

/**
 * 空态分支判断（与 AIPersonaCard / AIHeatmapThemes 保持一致）：
 *  1) hasEmotion/hasQuote 真 → 真实数据
 *  2) analysisReady=true 但 emotion 缺 → 认为无法生成，走"心事太少"分支（避免骨架卡住）
 *  3) storyCount < 5 → 心事太少
 *  4) 否则 → 生成中骨架
 */
const tooFewStories = computed(() => {
  if (hasEmotion.value || hasQuote.value) return false
  if (props.analysisReady) return true
  return (props.storyCount ?? 0) < 5
})

const hasEmotion = computed(() => {
  const e = props.emotion
  return !!(e && Array.isArray(e.emotions) && e.emotions.length >= 5
    && Array.isArray(e.insights) && e.insights.length >= 3)
})
const hasQuote = computed(() => {
  const e = props.emotion
  return !!(e && Array.isArray(e.quotes) && e.quotes.length >= 3)
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
@keyframes spin { to { transform: rotate(360deg); } }
.spin-slow { animation: spin 4.5s linear infinite; }
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── 与 narrative-bottom 中的 panel-wrapper 完全一致（不写 min-height:0；加 flex-shrink:0） ── */
.stack-wrap {
  margin: 0 28px 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex-shrink: 0;
}
.panel-wrapper {
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
/* 两板块等高：固定 310px，内容超出走内部滚动条（视觉高度完全一致） */
.pw-emotion,
.pw-quote   { height: 310px; }
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
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.pw-icon { opacity: 0.85; flex-shrink: 0; }
.pw-gold { color: #ffd98a; }
.pw-purple { color: #caa7ff; }
.pw-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
}
.pw-count {
  font-size: 0.58rem;
  color: rgba(255, 255, 255, 0.22);
  letter-spacing: 0.03em;
}

/* 卡片内部 body：flex 撑满，overflow-y 滚动（空态 mini-empty 也一起填满外层内空） */
.pw-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  /* 滚动条：4px 细条 + 半透明 thumb + hover 提亮（与合集 ca-story-scroll 同款） */
  scrollbar-width: thin;
  scrollbar-color: rgba(255,217,138,0.18) transparent;
}
.pw-body::-webkit-scrollbar { width: 4px; }
.pw-body::-webkit-scrollbar-track { background: transparent; }
.pw-body::-webkit-scrollbar-thumb {
  background: rgba(255,217,138,0.18);
  border-radius: 999px;
  transition: background 0.16s var(--ease-out);
}
.pw-body::-webkit-scrollbar-thumb:hover { background: rgba(255,217,138,0.32); }
/* 紫色卡单独的滚动条色相，与 panel 主题协调 */
.pw-emotion .pw-body::-webkit-scrollbar-thumb { background: rgba(202,167,255,0.18); }
.pw-emotion .pw-body::-webkit-scrollbar-thumb:hover { background: rgba(202,167,255,0.32); }

/* 旧的高度补丁删除：因为外层 panel-wrapper 已给定 min-height，内层 flex:1 会自动拉满对齐 */
/* （删除之前 .pw-emotion > { min-height }）*/

/* 情感解构内部（紧凑化） */
.emotion-orbs {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 2px 2px 4px;
  min-height: 72px;
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
  font-size: 0.60rem;
  color: rgba(255,255,255,0.9);
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.35);
  line-height: 1;
  margin-bottom: 2px;
}
.orb-val {
  font-size: 0.56rem;
  color: rgba(255,255,255,0.75);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1;
  opacity: 0.8;
}
.emotion-paras {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.e-para {
  display: flex;
  gap: 7px;
  align-items: flex-start;
}
.e-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
  box-shadow: 0 0 5px currentColor;
}
.e-text { flex: 1; min-width: 0; }
.e-title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 1px;
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255,255,255,0.68);
  line-height: 1.5;
}
.e-title :deep(b),
.e-title :deep(strong) { color: #ffd98a; font-weight: 700; }
.e-pct {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-size: 0.68rem;
  margin-left: auto;
}
.e-desc {
  font-size: 0.70rem;
  line-height: 1.65;
  color: rgba(255,255,255,0.42);
  text-align: left;
}

/* ═══ 故事摘录：紧凑版（与合集同款结构 + 压缩间距/字号） ═══ */
.quote-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.quote-item {
  --accent: #ffd98a;
  display: flex;
  flex-direction: row;
  gap: 8px;
  padding: 9px 10px 9px 0;
  border-radius: 7px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  position: relative;
  overflow: hidden;
  min-width: 0;
  flex-shrink: 0;
  transition:
    background 0.22s var(--ease-out),
    border-color 0.22s var(--ease-out),
    transform 0.16s var(--ease-out),
    box-shadow 0.22s var(--ease-out);
  /* 入场错峰：α/β/γ 依次进入（0 / 50 / 100 ms） */
  animation: q-item-enter 0.55s var(--ease-out) both;
  animation-delay: calc(var(--cs-idx, 0) * 50ms);
}
@keyframes q-item-enter {
  0%   { opacity: 0; transform: translateY(18px) scale(0.985); box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
  100% { opacity: 1; transform: translateY(0) scale(1);      box-shadow: 0 0 0 0.5px rgba(255,255,255,0.02) inset; }
}
/* 左侧 1px 色条（左内边缘 8px 上下留白），颜色来自 --accent */
.quote-item::before {
  content: '';
  position: absolute;
  left: 0; top: 8px; bottom: 8px;
  width: 1px;
  background: var(--accent);
  opacity: 0.55;
}
.quote-item:hover {
  background: rgba(255,255,255,0.035);
  border-color: rgba(255,255,255,0.10);
  transform: translateY(-1px);
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.26),
    0 0 0 0.5px rgba(255,255,255,0.03) inset;
}

/* 左侧 rank 徽标 */
.quote-side {
  padding: 6px 0 0 8px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.quote-rank {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Georgia', 'Songti SC', serif;
  font-size: 0.68rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent);
  box-shadow: none !important;
  transition: transform 0.16s var(--ease-out), filter 0.16s var(--ease-out), border-color 0.16s var(--ease-out), background 0.16s var(--ease-out);
}
.quote-rank-1,
.quote-rank-2,
.quote-rank-3 {
  background: color-mix(in srgb, var(--accent) 12%, transparent) !important;
  color: var(--accent) !important;
  border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent) !important;
}
.quote-item:hover .quote-rank {
  transform: translateY(-0.5px);
  filter: brightness(1.12);
  border-color: color-mix(in srgb, var(--accent) 34%, transparent) !important;
}

/* 主体：标题行 / 荐语 / 摘录 / 底栏 */
.quote-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 2px;
  padding-right: 2px;
}
.quote-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 1px;
}
.quote-headline {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255,255,255,0.72);
  letter-spacing: 0.01em;
  line-height: 1.5;
  transition: transform 0.16s var(--ease-out), filter 0.16s var(--ease-out), color 0.16s var(--ease-out);
}
.quote-item:hover .quote-headline {
  transform: translateY(-0.3px);
  filter: brightness(1.12);
  color: rgba(255,255,255,0.78);
}
.quote-author {
  font-size: 0.58rem;
  font-weight: 500;
  color: rgba(255,255,255,0.58);
  padding: 1px 5px;
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  margin-left: auto;
  line-height: 1.4;
  max-width: 50%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: transform 0.16s var(--ease-out), filter 0.16s var(--ease-out), border-color 0.16s var(--ease-out), background 0.16s var(--ease-out), color 0.16s var(--ease-out);
}
.quote-item:hover .quote-author {
  transform: translateY(-0.5px);
  filter: brightness(1.1);
  border-color: rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.035);
  color: rgba(255,255,255,0.66);
}

/* 荐语 pill：✨ 荐： 神韵句 */
.quote-reason {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  margin: 1px 0 4px;
  border-radius: 4px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  width: fit-content;
  max-width: 100%;
  transition: transform 0.16s var(--ease-out), filter 0.16s var(--ease-out), border-color 0.16s var(--ease-out), background 0.16s var(--ease-out);
}
.quote-item:hover .quote-reason {
  transform: translateY(-0.5px);
  filter: brightness(1.1);
  border-color: rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.035);
}
.quote-reason-icon {
  flex-shrink: 0;
  color: rgba(255,255,255,0.52);
  opacity: 1;
}
.quote-reason-prefix {
  font-size: 0.58rem;
  font-weight: 700;
  color: rgba(255,255,255,0.58);
  letter-spacing: 0.03em;
  white-space: nowrap;
}
.quote-reason-text {
  font-size: 0.64rem;
  color: rgba(255,255,255,0.70);
  white-space: nowrap;
  max-width: calc(100% - 30px);
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
}

/* 摘录正文：5 行截断（用户要求更多内容），行高压到 1.65 更紧凑 */
.quote-text {
  margin: 0;
  font-size: 0.70rem;
  line-height: 1.65;
  color: rgba(255,255,255,0.58);
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  overflow: hidden;
  transition: color 0.16s var(--ease-out), transform 0.16s var(--ease-out);
}
.quote-item:hover .quote-text {
  color: rgba(255,255,255,0.64);
}

/* 底栏：日期 + 标签（不贴底，跟在摘录后） */
.quote-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  flex-wrap: wrap;
  padding-top: 4px;
}
.quote-date {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.58rem;
  color: rgba(255,255,255,0.42);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  white-space: nowrap;
  transition: color 0.16s var(--ease-out), opacity 0.16s var(--ease-out);
}
.quote-foot-icon { opacity: 1; flex-shrink: 0; color: rgba(255,255,255,0.32); transition: color 0.16s var(--ease-out); }
.quote-tags {
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.quote-tag {
  font-size: 0.56rem;
  padding: 1px 5px;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 99px;
  background: rgba(255,255,255,0.015);
  color: rgba(255,255,255,0.52);
  letter-spacing: 0.02em;
  line-height: 1.5;
  transition: transform 0.16s var(--ease-out), filter 0.16s var(--ease-out), border-color 0.16s var(--ease-out), background 0.16s var(--ease-out), color 0.16s var(--ease-out);
}
.quote-item:hover .quote-tag {
  transform: translateY(-0.5px);
  filter: brightness(1.1);
  border-color: rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.60);
}
.quote-item:hover .quote-foot-icon {
  color: rgba(255,255,255,0.40);
}

/* 移动端：荐语 wrap，不挤爆 */
@media (max-width: 820px) {
  .quote-reason-text { white-space: normal; max-width: 100%; }
}

/* ─── 双态空态（mini）：心事太少 / 生成中
   flex:1 + min-height:0 → 和真实态 .pw-body 一样，完整填满外层 panel-wrapper 内空
───────────────────────────────────────────────*/
.mini-empty {
  width: 100%;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 22px 16px;
  border-radius: 8px;
  background: rgba(255,255,255,0.015);
  border: 1px dashed rgba(255,255,255,0.06);
  text-align: center;
}
.mini-scant {
  color: rgba(255,255,255,0.35);
}
.mini-loading {
  gap: 8px;
  color: rgba(255,255,255,0.35);
}
.mini-loading-purple {
  box-shadow: inset 0 0 22px rgba(202,167,255,0.06);
}
.mini-loading-gold {
  box-shadow: inset 0 0 22px rgba(255,217,138,0.05);
}
.me-title {
  font-size: 0.76rem;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  margin-top: 2px;
}
.me-sub {
  font-size: 0.6rem;
  color: rgba(255,255,255,0.26);
  line-height: 1.7;
}
.me-sub b { color: rgba(255,255,255,0.42); font-weight: 600; }

/* 生成中 mini 骨架 */
.mini-sk {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 88%;
  margin-top: 6px;
}
.mini-sk span {
  height: 5px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(202,167,255,0.08), rgba(202,167,255,0.18), rgba(202,167,255,0.08));
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}
.mini-sk span:nth-child(1) { width: 100%; }
.mini-sk span:nth-child(2) { width: 72%; margin-left: 10%; }
.mini-sk-gold span {
  background: linear-gradient(90deg, rgba(255,217,138,0.08), rgba(255,217,138,0.2), rgba(255,217,138,0.08));
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}

@media (max-width: 900px) {
  .stack-wrap { margin: 0 18px 14px; grid-template-columns: 1fr; }
}
</style>
