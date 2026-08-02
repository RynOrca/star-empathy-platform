<template>
  <div v-if="!hasReal" class="empty-state">
    <Sparkle :size="11" class="es-ic" />
    <span>AI 星格画像生成中…</span>
  </div>
  <div v-else class="persona-wrap">
    <!-- AI 徽章头 -->
    <div class="ai-head">
      <div class="ai-badge">
        <Sparkle :size="10" class="ai-spark" />
        <span>星语 AI · 星格画像</span>
      </div>
      <div class="ai-updated">
        <RefreshCw :size="9" class="refresh-icon" />
        <span>{{ updatedAt }}</span>
      </div>
    </div>

    <div class="persona-body">
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
  </div>
</template>

<script setup lang="ts">
import { Sparkle, RefreshCw } from 'lucide-vue-next'
import { computed } from 'vue'
import type { PersonaPayload } from '../../composables/useStarAnalysis'

const props = withDefaults(defineProps<{
  updatedAt?: string
  starName?: string
  constellationName?: string
  starColor?: string
  persona?: PersonaPayload
}>(), {
  updatedAt: '刚刚生成',
  starName: '未知星',
  constellationName: '未知星座',
  starColor: '#ffd98a',
})

const hasReal = computed(() => {
  const p = props.persona
  if (!p) return false
  return !!(p.paragraphs?.[0] && p.paragraphs?.[1]
    && Array.isArray(p.tags) && p.tags.length >= 3
    && p.hanName?.trim() && p.suggestIntro?.trim())
})

const hanName      = computed(() => props.persona?.hanName ?? '')
const personaTags  = computed(() => props.persona?.tags ?? [])
const paraFirst    = computed(() => props.persona?.paragraphs?.[0] ?? '')
const paraSecond   = computed(() => props.persona?.paragraphs?.[1] ?? '')
const suggest      = computed(() => props.persona?.suggestIntro ?? '')

const bgStars = Array.from({ length: 26 }, (_, i) => ({
  x: ((i * 31) % 110) + 5,
  y: ((i * 17) % 110) + 4,
  r: 0.4 + ((i * 7) % 13) / 12,
  opacity: 0.15 + ((i * 13) % 70) / 100,
}))
</script>

<style scoped>
.empty-state {
  margin: 0 28px 22px;
  padding: 34px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.74rem;
  color: rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.012);
  border-radius: 10px;
  border: 1px dashed rgba(255,255,255,0.06);
}
.es-ic { color: #ffd98a; animation: tw 2.2s ease-in-out infinite; }
@keyframes tw { 0%,100%{opacity:.35} 50%{opacity:.9} }

.persona-wrap {
  margin: 0 28px 22px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  position: relative;
}
.persona-wrap::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(202,167,255,0.4), rgba(255,217,138,0.4), transparent);
  pointer-events: none;
}

/* ─── 头部徽章 ─── */
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
  background: linear-gradient(135deg, rgba(202,167,255,0.15), rgba(255,217,138,0.1));
  border: 1px solid rgba(202,167,255,0.25);
  font-size: 0.68rem;
  font-weight: 600;
  color: #caa7ff;
  letter-spacing: 0.03em;
}
.ai-spark {
  color: #ffd98a;
  animation: twinkle 2.4s ease-in-out infinite;
}
@keyframes twinkle {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}
.ai-updated {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6rem;
  color: rgba(255,255,255,0.22);
  letter-spacing: 0.03em;
}
.refresh-icon { opacity: 0.5; }

/* ─── 主体：星象小卡 + 文字 ─── */
.persona-body {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 20px;
  align-items: stretch;
}

/* 左：星象小卡 */
.star-card {
  position: relative;
  background: linear-gradient(160deg, rgba(20, 10, 48, 0.85), rgba(8, 14, 36, 0.85));
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px;
  padding: 14px 12px 12px;
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
  margin-bottom: 6px;
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

/* 响应式 */
@media (max-width: 1000px) {
  .persona-body { grid-template-columns: 130px 1fr; gap: 14px; }
  .pt-tip { padding: 2px 7px; font-size: 0.6rem; }
  .pt-suggest { font-size: 0.7rem; }
}
@media (max-width: 900px) {
  .persona-wrap,
  .empty-state { margin: 0 18px 18px; }
}
</style>
