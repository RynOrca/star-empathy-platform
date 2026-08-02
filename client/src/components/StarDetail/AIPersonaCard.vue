<template>
  <div class="persona-wrap">
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
          <!-- 远景小星 -->
          <circle v-for="(s, i) in bgStars" :key="i"
            :cx="s.x" :cy="s.y" :r="s.r" fill="#fff" :opacity="s.opacity" />
          <!-- 月亮（默认有；如果是满月星的话可以调） -->
          <path d="M82 36 a20 20 0 1 0 0 26 a15 15 0 1 1 0 -26z"
            fill="#ffd98a" opacity="0.88" />
          <!-- 主星（大光点） -->
          <circle cx="40" cy="74" r="4" fill="#fff" />
          <circle cx="40" cy="74" r="10" :fill="starColor + 'cc'" opacity="0.3" />
          <!-- 流星 -->
          <path d="M12 18 L44 42" stroke="rgba(255,255,255,0.6)" stroke-width="1" stroke-linecap="round" />
          <circle cx="44" cy="42" r="1.5" fill="#fff" />
        </svg>

        <div class="sc-tags">
          <span class="sc-tag sc-tag-gold">{{ mbti }}</span>
          <span class="sc-tag" v-for="t in personaTags" :key="t">{{ t }}</span>
        </div>
      </div>

      <!-- 右：文字解读（80%） -->
      <div class="persona-text">
        <p v-if="paraFirst" class="pt-para first" v-html="paraFirst"></p>
        <p v-else class="pt-para first">
          <span class="pt-drop-cap">这</span>
          颗 <strong class="star-name-hl">{{ starName }}</strong> 在故事中呈现出一种
          <em class="em-gold">{{ tone }}</em> 的古典气质。它最常被人们在深夜凝望，
          故事中反复出现 <em class="em-purple">「{{ motifA }}」「{{ motifB }}」</em> 等意象，
          是亮星中情感浓度最高的一颗之一。
        </p>
        <p v-if="paraSecond" class="pt-para" v-html="paraSecond"></p>
        <p v-else class="pt-para">
          <span class="em-dash">—</span>
          人们在这里写下的心事，<em class="em-purple">{{ emoPct }}%</em> 与
          <em class="em-gold">{{ emoTheme }}</em> 有关，远高于全库平均的 54%。
          似乎每一个仰望它的人，都在它的光里看到了某个
          <em class="em-blue">{{ seeInLight }}</em>。
        </p>
        <div class="pt-para last">
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
  starName: '织女星',
  constellationName: '天琴座',
  starColor: '#ffd98a',
})

// 如果 persona 有就用服务端数据；否则 fallback 到 seed hash
const S = props.persona

// 伪随机种子（fallback 时才计算）
function seedHash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
const hFallback = S ? 0 : seedHash(props.starName + props.constellationName)

const HAN = ['望月听风', '枕星自语', '载梦渡夜', '拾光归墟', '渡云栖梦', '怀川望海', '摘雪煎茶', '听雨寄书']
const MBTI = ['INFP', 'INFJ', 'ENFP', 'ISFP', 'INTP']
const TAGS_POOL = [
  ['治愈系', '高敏感', '怀旧向', '诗意派', '情感共鸣体'],
  ['清冷挂', '哲思型', '孤独美学', '夜行者', '温柔观察者'],
  ['热血派', '理想主义', '少年心气', '行动派', '追光者'],
  ['怀旧者', '念旧人', '旧时光收藏家', '手写信派', '回忆滤镜'],
]
const TONE = ['温柔而忧郁', '冷静而深情', '明亮而治愈', '浪漫而诗意', '沉稳而长情']
const MOTIF_A = ['未说出口的话', '回不去的地方', '追不上的那个人', '熄不灭的少年火']
const MOTIF_B = ['多年前的自己', '远方的灯火', '奶奶的呼唤', '未寄出的信']
const EMO_PCT = [72, 78, 83, 85, 69, 64]
const EMO_THEME = ['亲情、故乡、童年', '爱情、离别、重逢', '理想、成长、选择', '友情、陪伴、告别']
const SEE_IN = ['再也回不去的夏夜', '多年以后那个转身', '万家灯火中的一盏', '十七岁未说完的话']
const SUGGEST = [
  '建议用「给多年前的自己写一封信」的语气开始，AI 会为你匹配最合适的星空位置。',
  '可以从「今夜看着它，我忽然想起了…」开头，自然会把心流牵出来。',
  '试着写下一件你从来没跟任何人说过的小事，它会替你保守秘密。',
  '以「如果那年…」作为开头，它承载了太多类似的「如果」。',
]

const hanName = computed(() => S?.hanName ?? HAN[hFallback % HAN.length])
const mbti = computed(() => S?.mbti ?? MBTI[(hFallback >>> 3) % MBTI.length])
const personaTags = computed(() => S?.tags ?? TAGS_POOL[(hFallback >>> 5) % TAGS_POOL.length])

// 文案：如果 persona 带 paragraphs 就用 paragraphs[i] 且保留星名/tone/意象/emo 注入结构
// 否则 fallback 到模板句式
const tone = computed(() => TONE[(hFallback >>> 7) % TONE.length])
const motifA = computed(() => MOTIF_A[(hFallback >>> 11) % MOTIF_A.length])
const motifB = computed(() => MOTIF_B[(hFallback >>> 13) % MOTIF_B.length])
const emoPct = computed(() => EMO_PCT[(hFallback >>> 17) % EMO_PCT.length])
const emoTheme = computed(() => EMO_THEME[(hFallback >>> 19) % EMO_THEME.length])
const seeInLight = computed(() => SEE_IN[(hFallback >>> 23) % SEE_IN.length])
const suggest = computed(() => S?.suggestIntro ?? SUGGEST[(hFallback >>> 2) % SUGGEST.length])

// paragraphs 结构：persona 给了就用 persona 的段落
const paraFirst = computed(() => {
  if (S?.paragraphs?.[0]) return S.paragraphs[0]
  return null // 用模板渲染
})
const paraSecond = computed(() => {
  if (S?.paragraphs?.[1]) return S.paragraphs[1]
  return null
})

// 背景小星位置（伪随机，固定 seed）
const bgStars = Array.from({ length: 26 }, (_, i) => ({
  x: ((i * 31) % 110) + 5,
  y: ((i * 17) % 110) + 4,
  r: 0.4 + ((i * 7) % 13) / 12,
  opacity: 0.15 + ((i * 13) % 70) / 100,
}))
</script>

<style scoped>
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
  width: 8px; height: 8px;
  border: 1px solid rgba(255,217,138,0.35);
}
.sc-tl { top: 6px; left: 6px; border-right: none; border-bottom: none; }
.sc-tr { top: 6px; right: 6px; border-left: none; border-bottom: none; }
.sc-bl { bottom: 6px; left: 6px; border-right: none; border-top: none; }
.sc-br { bottom: 6px; right: 6px; border-left: none; border-top: none; }

.sc-top { text-align: center; margin-bottom: 6px; z-index: 1; }
.sc-constellation {
  font-size: 0.55rem;
  letter-spacing: 0.12em;
  color: rgba(255,255,255,0.38);
  margin-bottom: 5px;
}
.sc-name-han {
  font-size: 1rem;
  font-weight: 700;
  color: #ffd98a;
  letter-spacing: 0.1em;
  text-shadow: 0 0 10px rgba(255,217,138,0.35);
}
.sc-svg {
  width: 100%;
  display: block;
  margin: 2px 0 8px;
  flex: 1;
  z-index: 1;
}
.sc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  z-index: 1;
}
.sc-tag {
  font-size: 0.56rem;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.55);
  border: 1px solid rgba(255,255,255,0.07);
  letter-spacing: 0.03em;
}
.sc-tag-gold {
  background: rgba(255,217,138,0.15);
  border-color: rgba(255,217,138,0.3);
  color: #ffd98a;
  font-weight: 700;
}

/* 右：文字解读 */
.persona-text {
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 4px 6px 0 0;
}
.pt-para {
  font-size: 0.8rem;
  line-height: 1.85;
  color: rgba(255,255,255,0.55);
  letter-spacing: 0.01em;
  margin: 0;
}
.star-name-hl {
  color: rgba(255,255,255,0.85);
  font-weight: 600;
  letter-spacing: 0.02em;
}
.pt-para.first {
  text-align: justify;
}
.pt-drop-cap {
  float: left;
  font-size: 1.65rem;
  font-weight: 700;
  line-height: 1;
  color: #ffd98a;
  padding: 3px 6px 0 0;
  font-family: 'Noto Serif SC', Georgia, serif;
}
.pt-para.last {
  margin-top: 4px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.02);
  border-radius: 6px;
  border-left: 2px solid rgba(255,217,138,0.3);
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.pt-tip {
  font-size: 0.7rem;
  color: #ffd98a;
  opacity: 0.85;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.pt-suggest {
  font-size: 0.74rem;
  color: rgba(255,255,255,0.5);
  line-height: 1.7;
}
.em-gold { color: #ffd98a; font-style: normal; font-weight: 600; }
.em-purple { color: #caa7ff; font-style: normal; font-weight: 700; }
.em-blue { color: #86a8ff; font-style: normal; font-weight: 600; }
.em-dash {
  display: inline-flex;
  align-items: center;
  color: rgba(255,255,255,0.4);
  font-size: 1rem;
  font-weight: 300;
  letter-spacing: -0.08em;
  line-height: 1;
  margin: 3px 6px 0 0;
  flex-shrink: 0;
}

/* 首段中的 EmDash 包裹 */
.pt-para:not(.first):not(.last) {
  display: flex;
  align-items: flex-start;
}

@media (max-width: 768px) {
  .persona-wrap { margin: 0 18px 20px; }
  .persona-body {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .star-card { max-width: 220px; margin: 0 auto; width: 100%; }
}
</style>
