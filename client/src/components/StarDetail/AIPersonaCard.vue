<template>
  <div class="panel-wrapper pw-persona">
    <div class="panel-head">
      <Sparkle :size="10" class="pw-icon pw-purple" />
      <span class="pw-title">星格画像</span>
      <span class="pw-count">{{ hasReal ? updatedAt : (tooFewStories ? '未生成' : '生成中') }}</span>
    </div>

    <!-- 真实数据 -->
    <div v-if="hasReal" class="persona-body">
      <!-- 左：星象小卡（20%） -->
      <div class="star-card">
        <div class="sc-corner sc-tl"></div>
        <div class="sc-corner sc-tr"></div>
        <div class="sc-corner sc-bl"></div>
        <div class="sc-corner sc-br"></div>

        <div class="sc-top">
          <div class="sc-constellation">{{ starName }} · {{ constellationName }}</div>
          <div class="sc-name-han">{{ hanName }}</div>
        </div>

        <svg viewBox="0 0 120 120" class="sc-svg">
          <circle v-for="(s, i) in bgStars" :key="i"
            :cx="s.x" :cy="s.y" :r="s.r" fill="#fff" :opacity="s.opacity" />
          <path d="M82 36 a20 20 0 1 0 0 26 a15 15 0 1 1 0 -26z"
            fill="#ffd98a" opacity="0.88" />
          <circle cx="40" cy="74" r="4" fill="#fff" />
          <circle cx="40" cy="74" r="10" :fill="starColor + 'cc'" opacity="0.3" />
          <path d="M12 18 L44 42" stroke="rgba(255,255,255,0.6)" stroke-width="1" stroke-linecap="round" />
          <circle cx="44" cy="42" r="1.5" fill="#fff" />
        </svg>

        <div class="sc-tags">
          <span class="sc-tag" v-for="t in personaTags" :key="t">{{ t }}</span>
        </div>
      </div>

      <!-- 右：文字解读（80%） -->
      <div class="persona-text">
        <p class="pt-para first" v-html="paraFirst"></p>
        <p class="pt-para" v-html="paraSecond"></p>
        <div class="pt-suggest-wrap">
          <span class="pt-tip">✨ 如果你也想在这里挂心事</span>
          <span class="pt-suggest">{{ suggest }}</span>
        </div>
      </div>
    </div>

    <!-- 状态 1：故事数 < 5 — 暂不生成 -->
    <div v-else-if="tooFewStories" class="persona-empty empty-scant">
      <div class="pe-icon-wrap pe-scant">
        <BookDashed :size="14" />
      </div>
      <div class="pe-text">
        <div class="pe-title">星星故事不足</div>
        <div class="pe-sub">当前 <b>{{ storyCount }}</b> 条故事，累计 5 条后 AI 将为它生成人格画像</div>
      </div>
    </div>

    <!-- 状态 2：生成中 — 带动画 -->
    <div v-else class="persona-empty empty-loading">
      <div class="pe-icon-wrap pe-loading">
        <Sparkle :size="14" class="spin-slow" />
      </div>
      <div class="pe-text">
        <div class="pe-title">AI 星格画像生成中…</div>
        <div class="pe-sub">正在从 {{ storyCount }} 条故事中抽取性格标签与星象意蕴</div>
      </div>
      <div class="skeleton-lines">
        <span class="sk-line sk-1"></span>
        <span class="sk-line sk-2"></span>
        <span class="sk-line sk-3"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkle, BookDashed } from 'lucide-vue-next'
import { computed } from 'vue'
import type { PersonaPayload } from '../../composables/useStarAnalysis'

const props = withDefaults(defineProps<{
  storyCount?: number
  updatedAt?: string
  starName?: string
  constellationName?: string
  starColor?: string
  persona?: PersonaPayload
  /** 后端是否已完成此 catalog 星的整套分析生成（ready=true 表示 persona/emotion/themehour.note 都有了） */
  analysisReady?: boolean
}>(), {
  storyCount: 0,
  updatedAt: '刚刚生成',
  starName: '未知星',
  constellationName: '未知星座',
  starColor: '#ffd98a',
  analysisReady: false,
})

/**
 * 显示哪个分支的判断逻辑（必须与 AIRadarWordcloud / AIHeatmapThemes 一致，避免不同卡不同分支）：
 *  1) hasReal=true（persona 完整）→ 展示真实数据
 *  2) props.analysisReady=true 但 persona 缺失 → 说明后端判定"无分析/无法生成"→ 走 tooFewStories 空态（防止骨架无限转圈）
 *  3) storyCount < 5 → 心事太少
 *  4) 否则（ready=false 且 storyCount>=5 且 persona 不完整）→ 生成中骨架
 */
const tooFewStories = computed(() => {
  if (hasReal.value) return false
  if (props.analysisReady) return true
  return (props.storyCount ?? 0) < 5
})

const hasReal = computed(() => {
  const p = props.persona
  if (!p) return false
  return !!(p.paragraphs?.[0] && p.paragraphs?.[1]
    && Array.isArray(p.tags) && p.tags.length >= 3
    && p.hanName?.trim() && p.suggestIntro?.trim())
})

const hanName     = computed(() => props.persona?.hanName ?? '')
const personaTags = computed(() => props.persona?.tags ?? [])
const paraFirst   = computed(() => props.persona?.paragraphs?.[0] ?? '')
const paraSecond  = computed(() => props.persona?.paragraphs?.[1] ?? '')
const suggest     = computed(() => props.persona?.suggestIntro ?? '')

const bgStars = Array.from({ length: 26 }, (_, i) => ({
  x: ((i * 31) % 110) + 5,
  y: ((i * 17) % 110) + 4,
  r: 0.4 + ((i * 7) % 13) / 12,
  opacity: 0.15 + ((i * 13) % 70) / 100,
}))
</script>

<style scoped>
/* ── 与内核相似 / 天区精选 的 panel-wrapper 完全一致 ──
   关键：pw-persona 显式 min-height = 真实态总高度（panel-head 约 32 + persona-body 约 190）*/
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
  margin: 0 28px 14px;
  flex-shrink: 0;
  min-height: 222px;     /* ← panel-head + 真实态 body 完整高度 */
}
.pw-persona { min-height: 222px; }
.panel-wrapper::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(202,167,255,0.4), rgba(255,217,138,0.4), transparent);
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.pw-icon { opacity: 0.85; flex-shrink: 0; }
.pw-gold   { color: #ffd98a; }
.pw-purple { color: #caa7ff; }
.pw-green  { color: #9ae6b4; }
.pw-blue   { color: #86a8ff; }
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
  display: flex;
  align-items: center;
  gap: 4px;
}
.pw-count svg { opacity: 0.6; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin-slow { animation: spin 4.5s linear infinite; }

/* ─── 主体：星象小卡 + 文字 ─── */
.persona-body {
  flex: 1;                /* ← 撑满外层 panel-wrapper 剩余所有高度 */
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 20px;
  align-items: stretch;
  min-height: 0;
}

/* 左：星象小卡 */
.star-card {
  position: relative;
  background: linear-gradient(160deg, rgba(20, 10, 48, 0.85), rgba(8, 14, 36, 0.85));
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px;
  padding: 12px 12px 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.star-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 40%, rgba(202,167,255,0.08), transparent 55%),
              radial-gradient(circle at 70% 80%, rgba(255,217,138,0.07), transparent 55%);
  pointer-events: none;
}
/* 四角装饰 */
.sc-corner {
  position: absolute;
  width: 9px; height: 9px;
  border-color: rgba(255,217,138,0.4);
  border-style: solid;
  border-width: 0;
}
.sc-tl { top: 6px; left: 6px;  border-top-width: 1px; border-left-width: 1px; }
.sc-tr { top: 6px; right: 6px; border-top-width: 1px; border-right-width: 1px; }
.sc-bl { bottom: 6px; left: 6px;  border-bottom-width: 1px; border-left-width: 1px; }
.sc-br { bottom: 6px; right: 6px; border-bottom-width: 1px; border-right-width: 1px; }

.sc-top {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 4px;
}
.sc-constellation {
  font-size: 0.56rem;
  color: rgba(255,255,255,0.38);
  letter-spacing: 0.04em;
}
.sc-name-han {
  font-size: 0.82rem;
  font-weight: 700;
  color: #ffd98a;
  letter-spacing: 0.14em;
  font-family: "LXGW WenKai", "Noto Serif SC", serif;
  text-shadow: 0 0 8px rgba(255,217,138,0.25);
}
.sc-svg {
  width: 100%;
  flex: 1;
  min-height: 72px;
  display: block;
  position: relative;
  z-index: 1;
}
.sc-tags {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.sc-tag {
  padding: 1px 6px;
  font-size: 0.52rem;
  border-radius: 3px;
  background: rgba(202,167,255,0.08);
  border: 1px solid rgba(202,167,255,0.18);
  color: rgba(255,255,255,0.75);
  letter-spacing: 0.03em;
  white-space: nowrap;
}

/* 右：文字解读 */
.persona-text {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.pt-para {
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.85;
  color: rgba(255,255,255,0.72);
  text-align: justify;
}
.pt-para.first {
  color: rgba(255,255,255,0.82);
  line-height: 1.9;
  padding: 0;
}
.star-name-hl { color: #ffd98a; font-weight: 700; }

/* 挂心事引导 */
.pt-suggest-wrap {
  margin-top: auto;
  padding-top: 6px;
  border-top: 1px dashed rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  gap: 10px;
}
.pt-tip {
  flex-shrink: 0;
  font-size: 0.66rem;
  color: #ffd98a;
  letter-spacing: 0.03em;
  font-weight: 600;
  background: rgba(255,217,138,0.07);
  border: 1px solid rgba(255,217,138,0.18);
  padding: 2px 8px;
  border-radius: 999px;
}
.pt-suggest {
  font-size: 0.72rem;
  color: rgba(255,255,255,0.55);
  line-height: 1.75;
}

/* ─── 空态统一：心事太少 / 生成中
   flex:1 → 撑满外层 panel-wrapper 除 panel-head 外的所有内空，
   这样内层虚线卡和外层 panel-wrapper 边框贴齐，不会吊在中间留空白
───────────────────────────────────────────────*/
.persona-empty {
  width: 100%;
  flex: 1;               /* ← 关键：撑到外层内容区大小 */
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;        /* 水平居中 */
  justify-content: center;    /* 垂直居中 */
  gap: 10px;
  padding: 22px 24px;         /* 内层保留舒适 padding（和边框贴合） */
  box-sizing: border-box;
  border-radius: 8px;
  background: rgba(255,255,255,0.015);
  border: 1px dashed rgba(255,255,255,0.06);
}
.pe-icon-wrap {
  width: 44px; height: 44px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
}
.pe-icon-wrap.pe-loading {
  background: rgba(202,167,255,0.12);
  color: #caa7ff;
  box-shadow: 0 0 16px rgba(202,167,255,0.18);
}
.pe-icon-wrap.pe-scant {
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.35);
}
.pe-text {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pe-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255,255,255,0.68);
}
.pe-sub {
  font-size: 0.64rem;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.02em;
}
.pe-sub b { color: rgba(255,255,255,0.45); font-weight: 600; }

/* 生成中骨架线 — 横向撑满，留出两侧小边距即可 */
.skeleton-lines {
  width: 100%;
  max-width: 90%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}
.sk-line {
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(202,167,255,0.08), rgba(202,167,255,0.18), rgba(202,167,255,0.08));
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}
.sk-line.sk-1 { width: 92%; }
.sk-line.sk-2 { width: 76%; }
.sk-line.sk-3 { width: 58%; }
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 响应式 */
@media (max-width: 1000px) {
  .persona-body { grid-template-columns: 130px 1fr; gap: 14px; }
  .pt-tip { padding: 2px 7px; font-size: 0.6rem; }
  .pt-suggest { font-size: 0.7rem; }
}
@media (max-width: 900px) {
  .panel-wrapper { margin: 0 18px 14px; }
}
</style>
