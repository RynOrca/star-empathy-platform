<template>
  <div class="sf-overlay" @click.self="onCloseRequest">
    <div class="sf-sheet" role="dialog" aria-modal="true" aria-labelledby="sf-title">
      <!-- ══════════════════════════════════════
           SHEET HEADER · MoonPanel 风格：左标题 + 右"关闭页"按钮
           ══════════════════════════════════════ -->
      <header class="sf-header">
        <div class="sf-header-title">
          <!-- icon：笔 + 星 组合（Feather Send 笔风 + 星） -->
          <svg class="sf-header-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z"/>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
            <path d="M2 2l7.586 7.586"/>
            <circle cx="11" cy="11" r="2"/>
          </svg>
          <span id="sf-title" class="sf-header-name">{{ mode === 'auto-match' ? '记录此刻心事' : '写我的故事' }}</span>
        </div>
        <button type="button" class="sf-header-close" @click="onCloseRequest" aria-label="关闭页">
          <X :size="14" />
          <span>关闭页</span>
        </button>
      </header>

      <!-- ══════════════════════════════════════
           SHEET BODY · 分组 panel + 引导条
           ══════════════════════════════════════ -->
      <div class="sf-body">

        <!-- 步骤指示器 · Segmented（两页共享） → 仿 StarDetail Tab 风格 -->
        <div class="sf-steps" role="tablist" aria-label="填写步骤">
          <button
            type="button"
            class="sf-step"
            :class="{ on: step === 1 }"
            :aria-current="step === 1 ? 'step' : undefined"
            @click="step = 1"
          >
            <PenLine :size="12" class="sf-step-ic" />
            <span class="sf-step-num">1</span>
            <span class="sf-step-label">书写心事</span>
          </button>
          <div class="sf-step-bar" aria-hidden="true"></div>
          <button
            type="button"
            class="sf-step"
            :class="{ on: step === 2 }"
            :aria-current="step === 2 ? 'step' : undefined"
            @click="step = 2"
          >
            <AlignJustify :size="12" class="sf-step-ic" />
            <span class="sf-step-num">2</span>
            <span class="sf-step-label">细节完善</span>
          </button>
        </div>

        <!-- 归属合集（常驻：两页共享，置顶展示，确保跨 step 不丢选择） -->
        <section class="sf-panel sf-panel-collection">
          <div class="sf-field sf-field-collection">
            <label class="sf-label">
              归属合集
              <span class="sf-label-sub">必选 · 故事将收入此合集</span>
            </label>
            <CollectionPicker v-model="collectionSelection" />
          </div>
        </section>

        <!-- STEP 1 -->
        <template v-if="step === 1">
          <section class="sf-panel sf-panel-form">
            <!-- 标题 -->
            <div class="sf-field">
              <label class="sf-label">标题</label>
              <input
                v-model="title"
                class="sf-input sf-input-title"
                placeholder="给你的故事起个名字…"
                maxlength="60"
              />
            </div>

            <!-- 分隔：极淡 1px（rule 变量） -->
            <div class="sf-sep"></div>

            <!-- 故事正文 -->
            <div class="sf-field">
              <div class="sf-label-row">
                <label class="sf-label">故事</label>
                <span class="sf-count" :class="{ warn: content.length >= 1850 }">{{ content.length }}/2000</span>
              </div>
              <textarea
                v-model="content"
                class="sf-input sf-textarea"
                :placeholder="mode === 'auto-match'
                  ? '此刻你想起了什么？写下你的心事…'
                  : '此刻你在这颗星下想起了什么？写下你的心事吧…'"
                maxlength="2000"
                rows="12"
                ref="textareaRef"
              ></textarea>
            </div>
          </section>

          <button
            class="sf-primary"
            :disabled="!title.trim() || !content.trim() || !hasCollectionSelection"
            @click="step = 2"
          >
            <span>继续</span>
            <ChevronRight :size="14" />
          </button>
        </template>

        <!-- STEP 2 -->
        <template v-else>
          <section class="sf-panel sf-panel-form">
            <!-- 关联星辰（bind-star）：直接用「星语小注」单框承载 → 左色点+名字/星座 + 右 AI·情境标签 -->
            <template v-if="mode === 'bind-star' && starName">
              <div class="sf-field">
                <div class="sf-star-whisper">
                  <div class="sf-star-whisper-head">
                    <!-- 左：色点 + 名字 + 星座（替代原来的 Sparkles 标题） -->
                    <span
                      class="sf-whisper-dot"
                      :style="{ background: catalogStarInfo?.color || '#ffe5a8', boxShadow: `0 0 12px ${catalogStarInfo?.color || 'rgba(255,217,138,0.25)'}` }"
                      aria-hidden="true"
                    ></span>
                    <div class="sf-whisper-names">
                      <span class="sf-whisper-cn">{{ starMainName }}</span>
                      <span v-if="catalogStarInfo?.conName" class="sf-whisper-con">
                        <Star :size="9" />{{ catalogStarInfo.conName }}
                      </span>
                    </div>
                    <span class="sf-star-whisper-tag">AI · 情境</span>
                  </div>
                  <p class="sf-star-whisper-text">{{ starWhisper }}</p>
                </div>
              </div>
              <div class="sf-sep"></div>
            </template>

            <!-- 关联星辰（auto-match，还没选星）：灰色 placeholder 框 → 稍后 AI 推荐 -->
            <template v-else-if="mode === 'auto-match'">
              <div class="sf-field">
                <div class="sf-star-whisper sf-star-whisper-pending">
                  <div class="sf-star-whisper-head">
                    <span class="sf-whisper-dot sf-whisper-dot-pending" aria-hidden="true"></span>
                    <div class="sf-whisper-names">
                      <span class="sf-whisper-cn sf-whisper-cn-pending">归属星辰待定</span>
                      <span class="sf-whisper-con sf-whisper-con-pending">
                        <Sparkles :size="9" />稍后 AI 推荐
                      </span>
                    </div>
                    <span class="sf-star-whisper-tag sf-star-whisper-tag-pending">AI · 匹配中</span>
                  </div>
                  <p class="sf-star-whisper-text sf-star-whisper-text-pending">
                    你完成标签并点选「寻找归属星辰」后，AI 将根据你写下的心事扫描夜空，为你推荐最契合的 3 颗星辰并生成一段专属星语小注。
                  </p>
                </div>
              </div>
              <div class="sf-sep"></div>
            </template>

            <!-- 情绪 / 标签：AI 建议 chips + 多选 + 自定义输入 -->
            <div class="sf-field">
              <div class="sf-label-row">
                <label class="sf-label">
                  {{ hasLiveSuggestions ? 'AI 建议标签' : '标签' }}
                </label>
                <span class="sf-label-sub">最多选 {{ MAX_TAGS }} 个 · 2-6 字</span>
                <button
                  type="button"
                  class="sf-refresh-tags"
                  :disabled="aiSuggestLoading || !canRequestSuggestions"
                  :title="canRequestSuggestions ? '重新生成标签' : '先写点内容再生成'"
                  @click.stop.prevent="refreshAiTags(true)"
                >
                  <RefreshCw :size="11" :class="{ spin: aiSuggestLoading }" />
                  <span>{{ aiSuggestLoading ? '生成中…' : 'AI 推荐' }}</span>
                </button>
              </div>

              <!-- 已选标签（带 × 关闭） -->
              <div v-if="selectedTags.length" class="sf-chips sf-chips-selected">
                <span
                  v-for="t in selectedTags"
                  :key="'sel-' + t"
                  class="sf-chip on"
                  :style="chipStyle(t)"
                >
                  <span>{{ t }}</span>
                  <button
                    type="button"
                    class="sf-chip-x"
                    aria-label="移除"
                    @click.stop.prevent="removeTag(t)"
                  >
                    <X :size="10" />
                  </button>
                </span>
              </div>

              <!-- AI 建议标签（两种模式都展示：外部 props.suggestedTags + 内部实时 aiSuggestedTags，未选中的可点击添加） -->
              <div
                v-if="allSuggestedTagsUnpicked.length"
                class="sf-chips sf-chips-suggest"
              >
                <button
                  v-for="t in allSuggestedTagsUnpicked"
                  :key="'sug-' + t"
                  type="button"
                  class="sf-chip suggest"
                  :disabled="selectedTags.length >= MAX_TAGS"
                  :style="chipStyle(t)"
                  @click.stop.prevent="toggleTag(t)"
                >
                  <Sparkles :size="10" class="sf-chip-spark" />
                  <span>{{ t }}</span>
                </button>
              </div>
              <p v-if="aiSuggestError" class="sf-tag-error">
                <AlertCircle :size="11" />
                <span>{{ aiSuggestError }}</span>
              </p>

              <!-- 自定义输入 -->
              <div class="sf-custom">
                <input
                  v-model="customTagInput"
                  class="sf-input sf-input-custom"
                  placeholder="自定义标签，回车添加（2-6 字）…"
                  maxlength="6"
                  @keydown.enter.prevent="addCustomTag"
                />
                <button
                  type="button"
                  class="sf-custom-add"
                  :disabled="!canAddCustom"
                  @click.stop.prevent="addCustomTag"
                >
                  <Plus :size="12" />
                </button>
              </div>
            </div>

            <div class="sf-sep"></div>

            <!-- 附带此刻位置：之前代码里 useLocation 一直存在但 UI 未暴露，现在给用户开关选择权 -->
            <div class="sf-field">
              <label class="sf-check" @click.prevent="includeLocation = !includeLocation">
                <span class="sf-check-box" :class="{ on: includeLocation }" aria-hidden="true">
                  <Check :size="11" class="sf-check-mark" />
                </span>
                <span class="sf-check-text-wrap">
                  <span class="sf-check-text">附带此刻位置</span>
                  <span class="sf-check-sub">
                    <MapPin :size="10" class="sf-check-sub-ic" />
                    仅粗略经纬，用作星空中的星辰分布参考，不显示具体地址
                  </span>
                </span>
              </label>
            </div>
          </section>

          <p v-if="error" class="sf-error">
            <AlertCircle :size="12" />
            {{ error }}
          </p>

          <button
            class="sf-primary"
            :class="{ match: mode === 'auto-match' }"
            :disabled="(submitting || matching) || !title.trim() || !content.trim() || !hasCollectionSelection"
            @click="onPrimaryClick"
            type="button"
          >
            <template v-if="mode === 'auto-match'">
              <Sparkles :size="13" />
              <span>{{ matching ? '寻找归属星辰中…' : '寻找归属星辰' }}</span>
            </template>
            <template v-else>
              <Send :size="13" />
              <span>{{ submitting ? '化作星光中…' : '挂上星星' }}</span>
            </template>
          </button>
        </template>
      </div>

      <!-- 匹配遮罩：苹果 Progress Ring -->
      <Transition name="sf-fade">
        <div v-if="mode === 'auto-match' && matching" class="sf-mask">
          <div class="sf-match">
            <div class="sf-ring">
              <svg viewBox="0 0 64 64" class="sf-ring-svg">
                <circle cx="32" cy="32" r="27" class="sf-ring-track" />
                <circle cx="32" cy="32" r="27" class="sf-ring-fill" />
              </svg>
              <Sparkles :size="16" class="sf-ring-icon" />
            </div>
            <div class="sf-match-title">{{ matchStepLabel(stepProgress) }}</div>
            <div class="sf-match-desc">
              <template v-if="stepProgress <= 1">正在从你的文字里提取情绪与主题…</template>
              <template v-else-if="stepProgress === 2">正在浩瀚星海中扫描相似的故事…</template>
              <template v-else-if="stepProgress >= 3">AI 正在判断每颗星与你的缘分…</template>
              <template v-else>请稍候…</template>
            </div>
            <div v-if="matchError" class="sf-match-error">{{ matchError }}，请稍后再试</div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, defineExpose, nextTick } from 'vue'
import { X, Send, Check, ChevronRight, Sparkles, Star, AlertCircle, Plus, RefreshCw, MapPin, PenLine, AlignJustify } from 'lucide-vue-next'
import { useLocation } from '../composables/useLocation'
import { useCollections } from '../composables/useCollections'
import CollectionPicker from './CollectionPicker.vue'

const props = withDefaults(defineProps<{
  starName: string
  catalogStarId: number
  catalogStarIds?: number[]
  mode?: 'bind-star' | 'auto-match'
  matchingStep?: 0 | 1 | 2 | 3
  matching?: boolean
  matchError?: string
  suggestedTags?: string[]
  catalogStarInfo?: {
    id: number
    displayName: string
    con: string
    conName: string
    mag: number
    ra: number
    dec: number
    color: string
    distance: number | null
  } | null
}>(), {
  mode: 'bind-star',
  matchingStep: 0,
  matching: false,
  matchError: '',
  suggestedTags: () => [],
  catalogStarInfo: null,
})

const emit = defineEmits<{
  close: []
  submitted: [story: {
    id: number; title: string | null; content: string; resonanceCount: number
    catalogStarId: number; catalogStarIds?: number[]; createdAt: string
    locationLat: number | null; locationLng: number | null; type: string
    viewCount: number; origin: string | null; username: string | null
    tag: string | null; tags?: string[]; userId: number | null; imageUrl: string | null
    collectionId: number | null; collectionName: string | null
    collectionCoverColor: string | null; collectionVisibility: string | null
  }]
  requestMatch: [payload: {
    title: string; content: string; tag: string | null; tags: string[]
    isAnonymous: boolean
  }]
}>()

const title = ref('')
const content = ref('')
const step = ref<1 | 2>(1)
const submitting = ref(false)
const error = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const loc = useLocation()
const userLocation = computed(() => {
  const la = loc.lat.value, ln = loc.lng.value
  return la != null && ln != null ? { lat: la, lng: ln } : null
})
/** 已选标签（多选，上限 5；DB 目前只存第一个为主标签，其余留作 UI/未来扩展） */
const selectedTags = ref<string[]>([])
/**
 * 匿名投递选项（UI 已移除，但保留字段以便：
 *   1) 接口契约不被破坏；2) 未来若想加回来只要改模板。
 * 目前默认恒 false：所有故事默认显示发布者名（若已登录）。
 */
const isAnonymous = ref(false)
/** 附带此刻位置：默认 true（历史行为），关掉后不携带 location 到后端 */
const includeLocation = ref(true)
/** 合集归属选择（投递时）：选已有 collectionId，或新建 collectionName+visibility，或 null 不归属 */
const collectionSelection = ref<{ collectionId?: number; collectionName?: string; visibility?: 'public' | 'private' | 'anonymous' | 'galaxy' } | null>(null)
/** 是否已选合集（用于按钮 disabled + 初步校验）：
 *   - 已有合集：有 collectionId → OK
 *   - 新建模式：对象存在且带 collectionName 字段 → 算"已选中新建路径"，哪怕 collectionName 暂时是空串
 *     （允许用户打一半先去填别的，不要因此把提交按钮锁死；最终提交时 doSubmit 里再严格校验名字非空。）
 */
const hasCollectionSelection = computed(() => {
  const s = collectionSelection.value
  if (!s) return false
  if (s.collectionId) return true
  if ('collectionName' in s) return true // 新建模式中（不管 name 空不空，只要切进来了就算已选）
  return false
})
/** 提交前的最终严格校验：新建合集必须已填写名字（trim 后非空，2~40 字） */
function validateCollectionFinal(): { ok: true } | { ok: false; msg: string } {
  const s = collectionSelection.value
  if (!s) return { ok: false, msg: '请先选择或新建一个合集' }
  if (s.collectionId) return { ok: true }
  if ('collectionName' in s) {
    const name = (s.collectionName ?? '').trim()
    if (!name) return { ok: false, msg: '请填写新建合集的名称' }
    if (name.length < 2) return { ok: false, msg: '合集名称至少 2 个字' }
    if (name.length > 40) return { ok: false, msg: '合集名称不能超过 40 字' }
    return { ok: true }
  }
  return { ok: false, msg: '请先选择或新建一个合集' }
}
const TAG_RE = /^[\u4e00-\u9fa5A-Za-z0-9]{2,6}$/
const customTagInput = ref('')
const MAX_TAGS = 5

/* ═══════════════════════════════════════
   关联星辰大板块·辅助计算
   ═══════════════════════════════════════ */
/** displayName 一般格式 "中文名·英文名" 或 "中文名 英文名" 或纯中文；尝试拆出主/副标题 */
const starMainName = computed<string>(() => {
  if (props.catalogStarInfo?.displayName) {
    const d = props.catalogStarInfo.displayName
    const sep = d.indexOf('·') >= 0 ? '·' : (d.indexOf(' ') >= 0 ? ' ' : '')
    return sep ? d.split(sep)[0].trim() : d
  }
  return props.starName || ''
})
const starSubName = computed<string | null>(() => {
  if (!props.catalogStarInfo?.displayName) return null
  const d = props.catalogStarInfo.displayName
  const sepIdx = d.indexOf('·')
  if (sepIdx < 0) {
    const spaceIdx = d.indexOf(' ')
    if (spaceIdx < 0) return null
    return d.slice(spaceIdx + 1).trim() || null
  }
  return d.slice(sepIdx + 1).trim() || null
})
/** 视星等：返回更柔和的"气质形容词"（不再出现括号标签，直接给情感向短语，供模板插值） */
function brightPersona(mag: number | undefined | null): { mood: string; seeDesc: string } {
  if (mag == null || Number.isNaN(mag)) return { mood: '沉静温柔', seeDesc: '在没有云的夜里会被人轻轻瞥见' }
  if (mag < 0.5) return { mood: '耀眼安静', seeDesc: '城市里抬头就能撞见' }
  if (mag < 1.5) return { mood: '温暖笃定', seeDesc: '一眼就能找到的那盏夜灯' }
  if (mag < 2.5) return { mood: '从容明亮', seeDesc: '晴夜里从不会缺席' }
  if (mag < 4.0) return { mood: '谦和内敛', seeDesc: '愿意抬头仔细寻找的人才能望见它' }
  if (mag < 5.5) return { mood: '安静克制', seeDesc: '要躲开路灯才能看得清' }
  return { mood: '柔软隐秘', seeDesc: '只有远离灯火的郊野才有幸遇见它' }
}
/** 距离：返回一句话（不出现"距离未知"），若未知则返回空串由模板直接跳过 */
function distPersona(dist: number | null | undefined): string {
  if (dist == null || Number.isNaN(dist)) return ''
  if (dist < 50) return '它离我们很近，也许古人抬头吟过的那些句子，它都还记得。'
  if (dist < 300) return '它发出的光走过几百个春秋才抵达你眼底——那时候的人也可能正对着它说心事。'
  if (dist < 1500) return '它的光跨过了上千年来到这里，替你记住今天写下的每一个字。'
  return '它的光要穿过千千万万年才能抵达我们眼底——今天你的心事，汇入了这段最漫长的旅程。'
}

/**
 * 「AI 总结」· 星语小注：
 *   完全丢掉之前的 "这是一枚位于 X 的星辰，X 等（XX），距离 X" 这种公式化句式，
 *   改用 8 种情感化模板池（许愿墙 / 古人诗 / 深夜悄悄话 / 光的旅程 / 沉默的老朋友 /
 *   收集眼泪 / 夜读灯 / 秘密花园），按 catalogStarId hash 稳定挑选，
 *   每一段都直接嵌入星名 + 星座 + 光亮度人格 + 距离意境，读起来像真的 AI 生成一样。
 */
const starWhisper = computed<string>(() => {
  const info = props.catalogStarInfo
  const star = starMainName.value || '这颗星'
  const con = info?.conName || '这片夜空'
  const { mood, seeDesc } = brightPersona(info?.mag)
  const distLine = distPersona(info?.distance)

  if (!info) {
    return `${star}停在${con}之上静静地听着——在你之前，已经有无数个睡不着的人把心事轻轻寄放在这里。愿你此刻写下的每一个字，都能被它的光芒妥帖收起，等到某个同样无眠的夜里，被另一个人温柔地读到。`
  }

  // 8 种模板池，用 catalogStarId（或 fallback displayName 字符串 hash）取模保证稳定
  const seedStr = props.catalogStarId ? `${props.catalogStarId}` : (info.displayName || star)
  const idx = Math.abs(hashCode(seedStr)) % 8

  switch (idx) {
    case 0: // ══ 许愿墙（过往故事感 · 最符合用户要求的「以往这颗星的故事怎么怎么样」）
      return `${star}是${con}里一座古老的许愿墙——很久以前，有人把离家的想念悄悄说给它听；又有人在分手的夜里，抬头对它说"我以后再也不等了"；还有高考前的孩子、刚当妈妈的姑娘，都曾在它底下轻轻哭过。它${seeDesc}，${mood}地记住每一个来过的人。今天轮到你，把这段心事轻轻挂上去。${distLine}`

    case 1: // ══ 古人诗（时空跨越 · 文学感）
      return `一千年前的人看过同一颗${star}：李白就着它喝过酒，苏轼在中秋夜里问过它青天，李清照写"庭院深深"时，${con}里的它也正静静地亮着。${seeDesc}，${mood}，像一个从不打断人的老朋友——你不必说得大声，把字写下来，它自然会接住。${distLine}`

    case 2: // ══ 深夜悄悄话（柔软 · 适合暗星）
      return `${star}只在深一点的夜里才肯真正亮起来——它不跟城市的路灯抢，也不羡慕月亮的热闹。它就${seeDesc}，安安静静地，等那些白天说不出口的话，自己浮出水面。它是${con}专门留给"假装自己没事"的人的。你现在写的，它会替你收好。${distLine}`

    case 3: // ══ 光的旅程（距离感 · 时空诗意）
      return `${star}的光走了很久很久，才终于落在你此刻的屏幕上。在它出发的那一年——也许哥伦布还没出海，也许圆明园还没被烧，也许你的曾曾祖父还是个孩子。那么漫长的时间里，它穿过无数尘埃与黑暗，只为了在今晚，${seeDesc}时，${mood}地与你相遇。你写下的心事，也将成为这段光旅的一部分。${distLine ? '' : ''}`

    case 4: // ══ 沉默的老朋友（治愈 · 信任）
      return `${con}里的${star}，其实是很多人的老朋友。你未必记得它的名字，但一定有某个时刻——高考前夜、第一次告白被拒绝、第一次独自坐火车离开家——你抬头，恰好看见过它。它${seeDesc}，永远${mood}，永远不会插话，只会像此刻一样，安安静静地陪你把故事写完。${distLine}`

    case 5: // ══ 收集眼泪（脆弱友好 · 情绪接纳）
      return `有人说${star}是专门负责收眼泪的星。它${seeDesc}，所以见过最多没被人看见的脆弱——蹲在楼下抽烟的爸爸、在厕所偷偷哭的实习生、给前任发了又删消息的人。它在${con}里${mood}地亮着，不评价，不催促，只是温柔地告诉你："说出来就好，我接着。"${distLine}`

    case 6: // ══ 夜读灯（文字感 · 写手/读者向）
      return `${star}是${con}里一盏从不打烊的小夜灯。古时候有人就着它的光抄过诗，现在有人对着手机屏幕，在它底下写日记、写情书、写永远不会发送出去的长消息。它${seeDesc}，${mood}地陪伴每一段文字的诞生。愿你今天写下的，未来有一天，也会被某个同样望着它的人，轻轻地、一字一句地读完。${distLine}`

    case 7: // ══ 秘密花园（治愈私密 · 被理解）
      return `${star}背后藏着一座秘密花园，${con}是它的门牌号码。只有${seeDesc}的人，才能轻轻推开那扇门。花园里种着所有"说出来怕被笑话"的事：那些没被完成的梦想、那些再也回不去的夏天、那些只能对陌生人说的话。它${mood}地守着这座花园，今天，你的故事也要被移栽进去了。${distLine}`
  }
  return ''
})

function toggleTag(t: string) {
  const i = selectedTags.value.indexOf(t)
  if (i >= 0) {
    selectedTags.value.splice(i, 1)
  } else {
    if (selectedTags.value.length >= MAX_TAGS) return
    selectedTags.value.push(t)
  }
}
function addCustomTag() {
  const v = customTagInput.value.trim()
  if (!v) return
  if (!TAG_RE.test(v)) {
    customTagInput.value = ''
    return
  }
  if (selectedTags.value.includes(v)) {
    customTagInput.value = ''
    return
  }
  if (selectedTags.value.length >= MAX_TAGS) {
    customTagInput.value = ''
    return
  }
  selectedTags.value.push(v)
  customTagInput.value = ''
}
function removeTag(t: string) {
  const i = selectedTags.value.indexOf(t)
  if (i >= 0) selectedTags.value.splice(i, 1)
}
const firstTag = computed(() => selectedTags.value[0] ?? null)

/** 自定义按钮：2-6 字、未重复、不满 5 个，才能加 */
const canAddCustom = computed(() => {
  const v = customTagInput.value.trim()
  if (!v) return false
  if (!TAG_RE.test(v)) return false
  if (selectedTags.value.includes(v)) return false
  return selectedTags.value.length < MAX_TAGS
})

/** 开放标签 hash 染色：基于字符串 hash 出稳定色相，统一调为柔色系  */
function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return h
}
/** 返回 { color, borderColor, backgroundColor } 用于 style 绑定 */
function chipStyle(tag: string) {
  const h = Math.abs(hashCode(tag)) % 360
  // HSL 统一：saturation 55%，light 65% 柔和，透明度靠 rgba
  const color = `hsl(${h} 62% 74%)`
  const borderColor = `hsla(${h}, 62%, 74%, 0.30)`
  const background = `hsla(${h}, 62%, 74%, 0.09)`
  return {
    color,
    borderColor,
    background,
  } as const
}

/* ════════════════════════════════════════════════════════════
   LIVE AI TAG SUGGEST · 实时 AI 标签推荐（600ms debounce）
   ════════════════════════════════════════════════════════════ */
const aiSuggestedTags = ref<string[]>([])
const aiSuggestLoading = ref(false)
const aiSuggestError = ref('')
let _suggestTimer: ReturnType<typeof setTimeout> | null = null
let _suggestReqSeq = 0
let _suggestedAtLeastOnce = false
/** 用户最少多少内容才触发 AI：避免标题十几个字的时候瞎猜浪费请求。 */
const canRequestSuggestions = computed<boolean>(() => {
  const tLen = title.value.trim().length
  const cLen = content.value.trim().length
  return (tLen + cLen) >= 20
})
/** 合并两种来源的 AI 建议：外部 props.suggestedTags（AI 匹配接口回传的）
 *  + 本组件内部实时建议），去重、过滤不合规的，最多展示 8 条。*/
const allSuggestedTags = computed<string[]>(() => {
  const seen = new Set<string>()
  const out: string[] = []
  const sources = [
    ...(props.suggestedTags ?? []),
    ...aiSuggestedTags.value,
  ]
  for (const raw of sources) {
    if (!raw || typeof raw !== 'string') continue
    const v = raw.trim()
    if (!/^[\u4e00-\u9fa5A-Za-z0-9]{2,6}$/.test(v)) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
    if (out.length >= 8) break
  }
  return out
})
const allSuggestedTagsUnpicked = computed<string[]>(() =>
  allSuggestedTags.value.filter((t) => !selectedTags.value.includes(t))
)
const hasLiveSuggestions = computed<boolean>(() => allSuggestedTags.value.length > 0)

/** 调用 AI 取标签：独立接口 /api/stories/ai-tags
   失败不阻塞任何其他业务。外部 props.suggestedTags 是候选；
   有后端还没暴露独立接口时 fallback 去调了复用 /api/match-star，从返回里取 suggestedTags 字段 */
async function refreshAiTags(force: boolean = false) {
  const trimmedTitle = title.value.trim()
  const trimmed = content.value.trim()
  if (!canRequestSuggestions.value) {
    aiSuggestedTags.value = []
    aiSuggestError.value = ''
    return
  }
  clearTimeout(_suggestTimer!)
  _suggestTimer = null
  _suggestReqSeq += 1
  const seq = _suggestReqSeq
  aiSuggestLoading.value = true
  aiSuggestError.value = ''
  try {
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    // 优先走 /api/stories/ai-tags（轻量仅 tag）；404 时退化到 /api/stories/match-star，从返回里取 suggestedTags
    let tags: string[] = []
    const r1 = await fetch('/api/stories/ai-tags', {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: trimmedTitle, content: trimmed }),
    })
    if (r1.ok) {
      const j = await r1.json()
      tags = Array.isArray(j?.data?.tags) ? j.data.tags : []
    } else if (r1.status === 404) {
      const r2 = await fetch('/api/stories/match-star', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: trimmedTitle, content: trimmed, top: 3 }),
      })
      if (r2.ok) {
        const j2 = await r2.json()
        tags = Array.isArray(j2?.data?.suggestedTags) ? j2.data.suggestedTags : []
      } else {
        aiSuggestLoading.value = false
        return
      }
    } else {
      aiSuggestLoading.value = false
      return
    }
    if (_suggestReqSeq !== seq) return /* 过期请求丢弃 */
    // 规范化：TAG_RE 过滤、去重、最多 8 条
    const seen = new Set<string>()
    const clean: string[] = []
    for (const raw of tags) {
      if (typeof raw !== 'string') continue
      const v = raw.trim()
      if (!/^[\u4e00-\u9fa5A-Za-z0-9]{2,6}$/.test(v)) continue
      if (seen.has(v)) continue
      seen.add(v); clean.push(v)
      if (clean.length >= 8) break
    }
    aiSuggestedTags.value = clean
    _suggestedAtLeastOnce = true
    if (!clean.length && force) aiSuggestError.value = '这次没什么合适的标签，继续写点内容再试试吧~'
  } catch (e) {
    if (_suggestReqSeq !== seq) return
    if (force) aiSuggestError.value = 'AI 暂时无法生成标签，请稍后手动添加'
  } finally {
    if (_suggestReqSeq === seq) aiSuggestLoading.value = false
  }
}

/* 防抖调用：标题 / 正文变化 600ms 后触发；只有进入 step 2 才真正发请求；内容不足时清空建议 */
function scheduleAiTagsRefresh() {
  clearTimeout(_suggestTimer!)
  if (!canRequestSuggestions.value) {
    if (_suggestedAtLeastOnce) aiSuggestedTags.value = []
    return
  }
  _suggestTimer = setTimeout(() => {
    _suggestTimer = null
    if (step.value === 2) refreshAiTags(false)
  }, 600)
}
watch([title, content], scheduleAiTagsRefresh, { flush: 'post' })
watch(step, (ns, os) => {
  if (ns === 2 && os !== 2) {
    // 进入 step 2 立即触发 1 次
    nextTick(() => refreshAiTags(false))
  }
})
onBeforeUnmount(() => { if (_suggestTimer) clearTimeout(_suggestTimer) })

const stepProgress = computed(() => props.matchingStep || 0)

function matchStepLabel(p: number): string {
  if (p <= 1) return '提取故事内核'
  if (p === 2) return '扫描夜空星辰'
  if (p >= 3) return '判断契合缘分'
  return 'AI 正在分析…'
}

function onCloseRequest() {
  if (submitting.value || props.matching) return
  emit('close')
}

function onPrimaryClick() {
  const trimmedTitle = title.value.trim()
  const trimmed = content.value.trim()
  if (!trimmedTitle || !trimmed || submitting.value || props.matching) return

  if (props.mode === 'auto-match') {
    emit('requestMatch', {
      title: trimmedTitle,
      content: trimmed,
      tag: firstTag.value,
      tags: selectedTags.value.slice(),
      isAnonymous: isAnonymous.value,
    })
  } else {
    doSubmit(props.catalogStarId, props.catalogStarIds ?? [props.catalogStarId])
  }
}

onMounted(() => {
  textareaRef.value?.focus()
  // 自动加载用户的合集列表，并预选默认合集（确保每个故事都归属一个合集）
  loadAndPreselectCollection()
})

/** 共享合集列表状态（与 CollectionPicker 内部独立实例，仅用于预选默认合集） */
const { list: collectionList, fetchList: fetchCollectionList } = useCollections()

/** 拉取用户合集列表，预选默认合集（优先 isDefault=true，其次第一个公开合集） */
async function loadAndPreselectCollection() {
  try {
    await fetchCollectionList()
    const list = collectionList.value
    if (!list.length) return
    // 已有选择则不覆盖
    if (collectionSelection.value?.collectionId) return
    // 优先 isDefault=true（旧库字段），其次第一个公开合集，最后第一个
    const def = list.find(c => (c as any).isDefault === 1 || (c as any).isDefault === true)
      || list.find(c => c.visibility === 'public')
      || list[0]
    if (def) {
      collectionSelection.value = { collectionId: def.id }
    }
  } catch (e) {
    console.error('StoryForm: loadAndPreselectCollection failed', e)
  }
}

watch(() => [props.mode, props.starName] as const, () => {
  step.value = 1
  if (!title.value && !content.value) {
    nextTick(() => textareaRef.value?.focus())
  }
})

async function doSubmit(
  targetCatalogStarId: number,
  targetCatalogStarIds?: number[],
  /** 外部可覆盖要写入的多标签；用于 auto-match 场景：
   *  用户在匹配流程中暂存于 SkyPage pendingRecordPayload.tags 的选中结果，
   *  能确保哪怕中途被 UI 重置（比如 resetForm / step 切换副作用）也不会丢多标签，
   *  避免用户填了 N 个标签结果 DB 只写了 1 个（selectedTags 为空时 fallback 到 tag 单列）。 */
  overrideTags?: string[] | null | undefined,
): Promise<{ ok: boolean; story?: any; errorMsg?: string }> {
  const trimmedTitle = title.value.trim()
  const trimmed = content.value.trim()
  if (!trimmedTitle || !trimmed || submitting.value) {
    return { ok: false, errorMsg: '请填写标题和故事内容' }
  }
  submitting.value = true
  error.value = ''
  // 多标签：overrideTags 优先（匹配链路由 SkyPage 传入的暂存值），否则用当前表单 selectedTags
  const finalTags: string[] = (() => {
    const raw = Array.isArray(overrideTags) && overrideTags.length
      ? overrideTags
      : selectedTags.value.slice()
    // 过滤空 / 不符合规则的异常词
    return raw
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t) => /^[\u4e00-\u9fa5A-Za-z0-9]{2,6}$/.test(t))
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .slice(0, 5)
  })()
  // 主情绪标签：取 finalTags[0]；否则保留 firstTag（selectedTags[0]）
  const effectivePrimaryTag = finalTags[0] ?? firstTag.value ?? null
  try {
    // ══ 最终提交前严格校验合集（避免用户新建模式切进来后没填名字就点提交）
    const colResult = validateCollectionFinal()
    if (!colResult.ok) {
      error.value = colResult.msg
      submitting.value = false
      return { ok: false, errorMsg: colResult.msg }
    }
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const body: Record<string, unknown> = {
      catalogStarId: targetCatalogStarId,
      catalogStarIds: targetCatalogStarIds ?? [targetCatalogStarId],
      title: trimmedTitle,
      content: trimmed,
      location: includeLocation.value ? userLocation.value : null,
      tag: effectivePrimaryTag,
      tags: finalTags,
      isAnonymous: isAnonymous.value,
    }
    // 合集归属：选已有传 collectionId；新建传 collectionName（trim 过） + collectionVisibility
    // 注意：CollectionPicker 现在新建模式不 trim emit，空串也保留对象字段——所以这里要 trim 后再发后端
    if (collectionSelection.value?.collectionId) {
      body.collectionId = collectionSelection.value.collectionId
    } else if (collectionSelection.value && 'collectionName' in collectionSelection.value) {
      const trimmedName = (collectionSelection.value.collectionName ?? '').trim()
      if (!trimmedName) {
        // 双保险：validateCollectionFinal 已经拦过了，这里再兜底防 race
        error.value = '请填写新建合集的名称'
        submitting.value = false
        return { ok: false, errorMsg: error.value }
      }
      body.collectionName = trimmedName
      if (collectionSelection.value.visibility) body.collectionVisibility = collectionSelection.value.visibility
    }
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (res.ok) {
      // tags 数组：优先用后端返回的 tags[]（已规范化），否则退回 finalTags
      const submittedTagsArr: string[] = Array.isArray(json.data?.tags) && json.data.tags.length
        ? json.data.tags
        : finalTags.slice()
      const submittedStory = {
        id: json.data.id,
        title: json.data.title,
        content: json.data.content,
        resonanceCount: json.data.resonanceCount,
        catalogStarId: json.data.catalogStarId,
        catalogStarIds: json.data.catalogStarIds ?? (targetCatalogStarIds ?? [targetCatalogStarId]).filter((id: number) => id != null),
        createdAt: json.data.createdAt || '',
        locationLat: json.data.locationLat ?? null,
        locationLng: json.data.locationLng ?? null,
        type: 'user',
        viewCount: 0,
        origin: null,
        username: json.data.username ?? null,
        tag: json.data.tag ?? effectivePrimaryTag,
        tags: submittedTagsArr,
        userId: json.data.userId ?? null,
        imageUrl: null,
        collectionId: json.data.collectionId ?? null,
        collectionName: json.data.collectionName ?? null,
        collectionCoverColor: json.data.collectionCoverColor ?? null,
        collectionVisibility: json.data.collectionVisibility ?? null,
      }
      emit('submitted', submittedStory)
      submitting.value = false
      return { ok: true, story: submittedStory }
    } else {
      const msg = json.message || '提交失败，再试一次吧'
      error.value = msg
      submitting.value = false
      return { ok: false, errorMsg: msg }
    }
  } catch (e) {
    const msg = '网络开小差了，稍后再试'
    error.value = msg
    submitting.value = false
    return { ok: false, errorMsg: msg }
  }
}

function resetForm() {
  title.value = ''
  content.value = ''
  step.value = 1
  selectedTags.value = []
  isAnonymous.value = false
  includeLocation.value = true
  error.value = ''
  submitting.value = false
  customTagInput.value = ''
  collectionSelection.value = null
}

defineExpose({ doSubmit, resetForm })
</script>

<style scoped>
/* ═══════════════════════════════════════════════
   StoryForm · 与 StarDetail / MoonPanel 设计系统对齐
   · 全面走 variables.css 变量：--surface / --rule / --radius-* / --shadow-* / --accent 等
   · 面板：MoonPanel 外框（surface + rule 边框 + radius-xl + shadow-lg+glow）
   · Header：MoonPanel 风格（左 icon+标题 / 右 关闭页 文字按钮）
   · 引导条：仿 StarDetail .tab-intro / ca-hero-strip 极简金紫渐变
   · 分组 panel：StarDetail 内嵌 panel 风（bg-elevated + rule + radius-lg）
   · 滚动条：MoonScrollable 6px 暖金紫渐变细滚动条
   ═══════════════════════════════════════════════ */

/* ── Overlay ── */
.sf-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 5, 16, 0.58);
  backdrop-filter: blur(6px) saturate(160%);
  -webkit-backdrop-filter: blur(6px) saturate(160%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: sf-fadein .2s ease-out;
  padding: 20px;
}
@keyframes sf-fadein { from { opacity: 0 } to { opacity: 1 } }

/* ── Sheet 主外框：MoonPanel 风 ── */
.sf-sheet {
  position: relative;
  width: 760px;
  max-width: 100%;
  min-height: 620px;
  max-height: calc(100vh - 40px);
  background: var(--surface);
  backdrop-filter: blur(38px) saturate(200%);
  -webkit-backdrop-filter: blur(38px) saturate(200%);
  border: 1px solid var(--rule);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg), var(--shadow-glow);
  color: var(--ink);
  font-family: var(--font);
  animation: sf-sheetin .3s cubic-bezier(.22, 1, .36, 1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
@keyframes sf-sheetin {
  from { opacity: 0; transform: translateY(14px) scale(0.986) }
  to   { opacity: 1; transform: translateY(0) scale(1) }
}

/* ═══════ HEADER · MoonPanel 风格（左 icon+标题 / 右 关闭页） ═══════ */
.sf-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 10px;
  border-bottom: 1px solid var(--rule);
  background: linear-gradient(180deg, rgba(255, 217, 138, 0.035), transparent);
}
.sf-header-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--accent);
}
.sf-header-icon {
  flex-shrink: 0;
  opacity: 0.9;
  filter: drop-shadow(0 0 5px var(--accent-glow));
}
.sf-header-close {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-family: var(--font);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all var(--transition-normal);
}
.sf-header-close:hover {
  color: var(--error);
  border-color: rgba(255, 139, 125, 0.28);
  background: var(--error-subtle);
}

/* ═══════ BODY ═══════ */
.sf-body {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  /* 自定义滚动条：与 moon-scrollable 同款细渐变条 */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 217, 138, 0.22) transparent;
}
.sf-body::-webkit-scrollbar {
  width: 6px;
  background: transparent;
}
.sf-body::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(255, 217, 138, 0.22), rgba(202, 167, 255, 0.20));
  border-radius: 3px;
  border: 1px solid rgba(255, 217, 138, 0.10);
}

/* ─── 引导条（仿 StarDetail .tab-intro / ca-hero-strip 极简风，非光辉版） ─── */
.sf-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  margin: 0 4px 4px;
  border-radius: 10px;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(255, 217, 138, 0.07), rgba(202, 167, 255, 0.035));
  border: 1px solid rgba(255, 217, 138, 0.12);
}
.sf-hero-left {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  flex: 1;
}
.sf-hero-icon {
  flex-shrink: 0;
  opacity: 0.9;
  color: #ffd98a;
}
.sf-hero-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.02em;
  flex-shrink: 0;
}
.sf-hero-sub {
  font-size: 0.68rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}

/* ═══════ STEPS · 步骤指示器（仿 StarDetail Tab 金紫渐变 active 风） ═══════ */
.sf-steps {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px;
  margin: 0 4px;
  background: var(--bg-elevated);
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}
.sf-step {
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: calc(var(--radius-sm) - 1px);
  color: var(--muted);
  font-family: var(--font);
  font-size: 0.76rem;
  font-weight: 500;
  letter-spacing: 0.015em;
  cursor: pointer;
  transition: all .18s cubic-bezier(.22, 1, .36, 1);
}
.sf-step:hover { color: var(--ink-secondary) }
.sf-step-ic { opacity: 0.85 }
.sf-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px; height: 16px;
  border-radius: 50%;
  border: 1px solid currentColor;
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 1;
  opacity: 0.9;
}
.sf-step-label {
  font-size: 0.76rem;
  white-space: nowrap;
}
/* 激活态：StarDetail Tab 同款金紫渐变 + 金辉 */
.sf-step.on {
  background: linear-gradient(135deg, rgba(255, 217, 138, 0.14), rgba(202, 167, 255, 0.08));
  border: 1px solid rgba(255, 217, 138, 0.18);
  color: var(--ink);
  box-shadow: 0 0 0 1px rgba(255, 217, 138, 0.06), 0 0 14px rgba(255, 217, 138, 0.08);
  font-weight: 600;
  padding: 7px 9px;
}
.sf-step.on .sf-step-num {
  background: linear-gradient(180deg, #ffd98a, #e9c378);
  border-color: transparent;
  color: #2a1f0c;
  box-shadow: 0 0 8px rgba(255, 217, 138, 0.18);
}
.sf-step.on .sf-step-ic { color: var(--accent); opacity: 0.95 }
.sf-step-bar {
  flex: 0 0 1px;
  width: 1px;
  height: 20px;
  background: var(--rule);
  opacity: 0.9;
}

/* ── 常驻合集 panel（sf-panel-collection）：紧凑，不继承 min-height ── */
.sf-panel-collection {
  min-height: 0;
  background: linear-gradient(180deg, rgba(255, 217, 138, 0.025), var(--bg-elevated));
  border: 1px solid rgba(255, 217, 138, 0.10);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.008);
}
.sf-field-collection { padding: 10px 16px 11px; gap: 6px }
.sf-field-collection .sf-label { font-size: 10px; }

/* ═══════ 分组 Panel（内嵌 Card，StarDetail 内嵌面板风） ═══════ */
.sf-panel {
  background: var(--bg-elevated);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
/* Step 1 / Step 2 实际填写区 panel 统一固定 min-height，保证两页完全等高 */
.sf-panel-form { min-height: 540px; }
.sf-field {
  padding: 16px 20px 17px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
/* 极细分隔：使用变量 --rule 的弱化色，左右缩进 20px */
.sf-sep {
  height: 1px;
  background: var(--rule);
  opacity: 0.7;
  margin-left: 20px;
}

/* ── 字段标签 & 副标签 ── */
.sf-label {
  font-size: 10.5px;
  font-weight: 500;
  color: var(--muted);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  line-height: 1;
}
.sf-label-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}
.sf-label-row .sf-label { margin-right: auto; }
.sf-label-sub {
  font-size: 0.68rem;
  color: var(--muted-light);
  letter-spacing: 0;
  text-transform: none;
  font-weight: 400;
}
.sf-count {
  font-size: 0.68rem;
  color: var(--muted);
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
}
.sf-count.warn { color: #ffd98a; opacity: 0.9; }

/* ── AI 标签推荐按钮（sf-label-row 最右） ── */
.sf-refresh-tags {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  border: 1px solid var(--accent-border);
  background: var(--accent-subtle);
  color: var(--accent);
  font-family: var(--font);
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background .15s ease, filter .15s ease, transform .15s ease, opacity .15s ease;
}
.sf-refresh-tags:hover:not(:disabled) {
  background: var(--accent-bg);
  filter: brightness(1.06);
  transform: translateY(-0.3px);
}
.sf-refresh-tags:disabled {
  opacity: 0.36;
  cursor: not-allowed;
}
.sf-refresh-tags .spin {
  animation: sf-spin 0.9s linear infinite;
}
@keyframes sf-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
/* AI 生成失败的标签提示 */
.sf-tag-error {
  margin: 4px 0 0;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.68rem;
  color: rgba(255, 160, 140, 0.78);
  opacity: 0.9;
}

/* ── 输入 ── */
.sf-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  color: var(--ink);
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.6;
  outline: none;
  transition: border-color .15s ease, background .15s ease;
}
.sf-input::placeholder {
  color: var(--muted);
  opacity: 0.75;
}
.sf-input:focus {
  border-color: var(--rule-focus);
  background: rgba(255, 217, 138, 0.03);
}
.sf-input-title {
  font-weight: 600;
  font-size: 1.02rem;
  letter-spacing: 0.005em;
  padding: 9px 11px;
}
.sf-textarea {
  resize: vertical;
  min-height: 360px; /* 配合 sf-panel-form 540px min-height 统一两页等高 */
  line-height: 1.85;
  letter-spacing: 0.004em;
  padding-top: 10px;
  padding-bottom: 10px;
}

/* 星名胶囊（旧）：已经废弃，但保留下游样式留作兼容以防备用 */
.sf-star-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(202, 167, 255, 0.08);
  border: 1px solid rgba(202, 167, 255, 0.18);
  border-radius: var(--radius-full);
  width: fit-content;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent-purple, #caa7ff);
  letter-spacing: 0.01em;
}

/* ═══════ 关联星辰单块占位：sf-star-card / hero / stats 整套已按需求删除，
   改用 sf-star-whisper 承载所有信息 ═══════ */
.sf-star-card { display: none }
.sf-star-hero { display: none }
.sf-star-dot { display: none }
.sf-star-titles { display: none }
.sf-star-cn { display: none }
.sf-star-en { display: none }
.sf-star-con { display: none }
.sf-star-stats { display: none }
.sf-stat { display: none }

/* ═══ 星语小注（单框承载星辰色点+名字+星座+AI诗意文本） ═══ */
.sf-star-whisper {
  border-radius: var(--radius-md);
  padding: 13px 15px 14px;
  background:
    linear-gradient(135deg, rgba(255, 217, 138, 0.07), rgba(202, 167, 255, 0.04)),
    rgba(255, 255, 255, 0.012);
  border: 1px solid rgba(255, 217, 138, 0.14);
  display: flex;
  flex-direction: column;
  gap: 9px;
}
/* ▸ 头部：色点（28px） + 名字/星座（纵向） + AI·情境 tag
   注意：容器用 flex-start，色点 + 名字第一行做视觉中心对齐（避免两行名字导致色点"夹在中间"看起来歪） */
.sf-star-whisper-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--ink);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.sf-star-whisper-ic {
  color: var(--accent);
  opacity: 0.92;
  filter: drop-shadow(0 0 3px var(--accent-glow));
  /* 若偶尔保留 Sparkles 标题场景，基线对齐 */
  align-self: center;
}
.sf-star-whisper-tag {
  /* 整颗胶囊要与"第一行星名"垂直中心对齐，让右 tag 视觉不飘 */
  margin-left: auto;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  background: var(--accent-subtle);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  margin-top: 5px; /* 1rem 星名行高 ~1.05 → 星名中心≈16*1.05/2 = 8.4，胶囊高 ~18，中心=9 → +5 刚好中心对正 */
}
/* 小色点 28px：与星名行中心对齐（星名 1rem=16px，行高1.05=16.8，中心8.4；色点28中心14 → 顶部补 8.4 - 14 + 顶部内边距差 → 约 -1 再按视觉调到 +2，保证色点心和"帝座"那行中心在一条水平线） */
.sf-whisper-dot {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ffe5a8;
  position: relative;
  box-shadow:
    0 0 12px rgba(255, 217, 138, 0.26),
    inset 0 0 8px rgba(255, 255, 255, 0.3);
  margin-top: 2px; /* 对齐微调：色点中心 ↔ 星名行中心 */
}
.sf-whisper-dot::after {
  content: '';
  position: absolute;
  inset: 22%;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0) 60%);
  opacity: 0.7;
}
/* 名字 + 星座（纵向） */
.sf-whisper-names {
  flex: 1;
  min-width: 0;
  display: inline-flex;
  flex-direction: column;
  gap: 4px; /* 3→4 拉开行间距，视觉不挤 */
}
.sf-whisper-cn {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.15; /* 1.05→1.15 提高字行高度稳定性，避免和色点对齐出现偏差 */
  background: linear-gradient(180deg, #ffe5a8, #e9c378);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 3px rgba(255, 217, 138, 0.18));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sf-whisper-con {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--accent-purple, #caa7ff);
  letter-spacing: 0.02em;
  line-height: 1.1;
}
/* 星座 icon SVG 与文字基线对齐（修掉原来视觉上的"星星比字偏高/偏低"） */
.sf-whisper-con :deep(svg) { vertical-align: -0.08em }
.sf-star-whisper-text {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.8;
  color: var(--ink-secondary);
  letter-spacing: 0.006em;
  opacity: 0.92;
}

/* ═══════ Pending（auto-match 模式）：灰色 placeholder 风 ═══════ */
.sf-star-whisper-pending {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0.01)),
    rgba(255, 255, 255, 0.006);
  border: 1px dashed rgba(255, 255, 255, 0.10);
}
.sf-whisper-dot-pending {
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 0 6px rgba(255, 255, 255, 0.06);
}
.sf-whisper-dot-pending::after {
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), rgba(255,255,255,0) 60%);
}
.sf-whisper-cn-pending {
  background: none;
  -webkit-text-fill-color: initial;
  color: var(--muted);
  filter: none;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.sf-whisper-con-pending { color: var(--muted-light) }
.sf-star-whisper-tag-pending {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.10);
  color: var(--muted);
}
.sf-star-whisper-text-pending {
  color: var(--muted);
  opacity: 0.82;
}

/* ═══════ 标签 chips ═══════ */
.sf-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.sf-chips-selected { margin-bottom: 2px }
.sf-chips-suggest {
  padding-top: 10px;
  border-top: 1px dashed var(--rule);
  margin-top: 10px;
  opacity: 0.9;
}
.sf-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px 6px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--rule);
  background: var(--bg-elevated);
  color: var(--ink-secondary);
  font-family: var(--font);
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.005em;
  line-height: 1;
  transition: all .18s cubic-bezier(.22, 1, .36, 1);
  cursor: pointer;
}
.sf-chip:hover:not(:disabled) { transform: translateY(-0.5px) }
.sf-chip:disabled { opacity: .34; cursor: not-allowed }
.sf-chip.on { font-weight: 600; padding-left: 12px; padding-right: 6px; }
.sf-chip-x {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: rgba(255,255,255,0.07);
  border: none;
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  opacity: 0.88;
  transition: all .15s ease;
}
.sf-chip-x:hover { background: rgba(255,255,255,0.16); opacity: 1 }
/* AI 建议 chip：前缀金色 Sparkles 与 StarDetail 标签引导一致 */
.sf-chip.suggest {
  background: rgba(255,217,138,0.05);
  border-color: var(--accent-border);
}
.sf-chip-spark {
  color: var(--accent);
  opacity: 0.85;
}

/* ── 自定义标签输入框 ── */
.sf-custom {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px 8px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  transition: all .18s ease;
}
.sf-custom:focus-within {
  border-color: var(--rule-focus);
  background: rgba(255, 217, 138, 0.03);
}
.sf-input-custom {
  flex: 1;
  min-width: 0;
  font-size: 0.84rem !important;
  letter-spacing: 0.004em;
  border: none;
  background: transparent;
  padding: 2px 0;
}
.sf-input-custom::placeholder { color: var(--muted); opacity: 0.8; }
.sf-custom-add {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  background: var(--accent-subtle);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  transition: all .15s ease;
  flex-shrink: 0;
}
.sf-custom-add:hover:not(:disabled) {
  background: var(--accent-bg);
  border-color: var(--accent);
}
.sf-custom-add:disabled { opacity: .30; cursor: not-allowed }

/* ── Checkbox：沿用 MoonPanel/StarDetail 的金质感勾选风格，去掉 sub 文本 ── */
.sf-check {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.sf-check-box {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  border: 1px solid var(--rule);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .18s ease;
  flex-shrink: 0;
}
.sf-check-box.on {
  background: linear-gradient(180deg, #ffd98a, #e9c378);
  border-color: transparent;
  box-shadow: 0 0 12px rgba(255, 217, 138, 0.18);
}
.sf-check-mark { color: transparent; stroke-width: 4; transition: color .18s ease }
.sf-check-box.on .sf-check-mark { color: #2a1f0c }
.sf-check-text {
  font-size: 0.86rem;
  color: var(--ink-secondary);
  line-height: 1.4;
  letter-spacing: 0.004em;
}
/* 新增：位置 checkbox 的子说明（恢复了 sub 容器，但不是匿名那段） */
.sf-check-text-wrap {
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
  line-height: 1.3;
}
.sf-check-sub {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: var(--muted);
  letter-spacing: 0.005em;
}
.sf-check-sub-ic {
  flex-shrink: 0;
  color: var(--info, #86a8ff);
  opacity: 0.78;
}

/* ── 返回按钮（step2 左上返回 step1） ── */
.sf-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  padding: 1px 4px;
  color: var(--accent);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  align-self: flex-start;
  transition: all .15s ease;
}
.sf-back:hover {
  color: #ffe5a8;
  transform: translateX(-1px);
}

/* ── 错误提示 ── */
.sf-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 10px 14px;
  font-size: 0.8rem;
  line-height: 1.55;
  color: var(--error);
  background: var(--error-subtle);
  border: 1px solid rgba(255, 139, 125, 0.22);
  border-radius: var(--radius-md);
}

/* ── Primary 按钮：金色渐变主按钮，与其它大按钮统一 ── */
.sf-primary {
  width: 100%;
  padding: 14px 0;
  border-radius: var(--radius-lg);
  border: 1px solid var(--accent-border);
  background: var(--accent-subtle);
  color: var(--accent);
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.008em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: all .18s ease, transform .1s ease;
  margin-top: auto;
}
.sf-primary:hover:not(:disabled) {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: #fff3cd;
  transform: translateY(-0.5px);
  box-shadow: var(--shadow-glow);
}
.sf-primary:active:not(:disabled) {
  transform: translateY(0) scale(0.996);
  filter: brightness(0.97);
}
.sf-primary:disabled {
  opacity: 0.30;
  cursor: not-allowed;
  box-shadow: none;
}
.sf-primary.match {
  background: var(--accent-bg);
  color: #fff3cd;
}

/* ══════════ 匹配遮罩 ══════════ */
.sf-fade-enter-active, .sf-fade-leave-active { transition: opacity .26s ease }
.sf-fade-enter-from, .sf-fade-leave-to { opacity: 0 }

.sf-mask {
  position: absolute;
  inset: 0;
  background: rgba(8, 7, 18, 0.72);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  padding: 32px;
}
.sf-match {
  width: 100%;
  max-width: 420px;
  padding: 34px 32px 30px;
  background: var(--surface);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid var(--rule);
  border-radius: var(--radius-xl);
  text-align: center;
  color: var(--ink);
  font-family: var(--font);
  box-shadow: var(--shadow-lg);
  animation: sf-matchin .32s cubic-bezier(.22, 1, .36, 1);
}
@keyframes sf-matchin {
  from { opacity: 0; transform: translateY(5px) scale(0.982) }
  to   { opacity: 1; transform: translateY(0) scale(1) }
}

/* Progress Ring */
.sf-ring {
  position: relative;
  width: 72px;
  height: 72px;
  margin: 4px auto 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sf-ring-svg { width: 100%; height: 100%; transform: rotate(-90deg) }
.sf-ring-track {
  fill: none;
  stroke: var(--rule);
  stroke-width: 3.2;
}
.sf-ring-fill {
  fill: none;
  stroke: var(--accent);
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-dasharray: 214;
  stroke-dashoffset: 40;
  animation: sf-ring-rotate 2.4s cubic-bezier(.55, 0, .45, 1) infinite;
  filter: drop-shadow(0 0 8px var(--accent-glow));
  transform-origin: 50% 50%;
}
@keyframes sf-ring-rotate {
  0%   { stroke-dashoffset: 214; transform: rotate(0deg) }
  45%  { stroke-dashoffset: 40;  transform: rotate(180deg) }
  100% { stroke-dashoffset: 214; transform: rotate(540deg) }
}
.sf-ring-icon {
  position: absolute;
  color: var(--accent);
  animation: sf-spark-pulse 1.2s ease-in-out infinite;
}
@keyframes sf-spark-pulse {
  0%, 100% { opacity: 0.72; transform: scale(1) }
  50%      { opacity: 1;    transform: scale(1.1) }
}
.sf-match-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 8px;
  letter-spacing: 0.008em;
}
.sf-match-desc {
  font-size: 0.8rem;
  line-height: 1.78;
  color: var(--muted);
  margin: 0;
  padding: 0 10px;
}
.sf-match-error {
  margin-top: 14px;
  padding: 10px 14px;
  font-size: 0.8rem;
  line-height: 1.55;
  color: var(--error);
  background: var(--error-subtle);
  border: 1px solid rgba(255, 139, 125, 0.22);
  border-radius: var(--radius-md);
}

/* 移动端 */
@media (max-width: 640px) {
  .sf-overlay { padding: 0; align-items: flex-end }
  .sf-sheet {
    min-height: 0;
    max-height: 94vh;
    width: 100%;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    border-bottom: none;
    animation: sf-sheetin-mobile .35s cubic-bezier(.22, 1, .36, 1);
  }
  @keyframes sf-sheetin-mobile {
    from { opacity: 0; transform: translateY(28%) }
    to   { opacity: 1; transform: translateY(0) }
  }
  .sf-header { padding: 14px 18px 10px }
  .sf-body { padding: 12px 18px 20px; gap: 14px }
  .sf-panel { min-height: 0 }
  .sf-field { padding: 14px 18px 15px }
  .sf-field-collection { padding: 9px 14px 10px }
  .sf-field-collection .sf-label { font-size: 9.5px }
  .sf-sep { margin-left: 18px }
  .sf-textarea { min-height: 220px }
  .sf-primary { padding: 13px 0; font-size: 0.9rem; margin-top: 0 }
  .sf-match { max-width: 100%; padding: 26px 22px 24px }
  .sf-ring { width: 60px; height: 60px }
  /* 移动端步骤条字号压小，去掉中间竖线以节省空间 */
  .sf-steps { gap: 3px }
  .sf-step { padding: 7px 6px; gap: 4px }
  .sf-step.on { padding: 6px 5px }
  .sf-step-label { font-size: 0.72rem }
  .sf-step-bar { display: none }
  /* 移动端 hero 字号压小 */
  .sf-hero { margin: 0 0 2px }
  .sf-hero-label { font-size: 0.74rem }
  .sf-hero-sub { font-size: 0.64rem }
  /* 移动端关联星辰大板块适配 */
  .sf-star-card { padding: 15px 16px !important; gap: 14px !important }
  .sf-star-dot { width: 36px; height: 36px }
  .sf-star-cn { font-size: 1.1rem }
  .sf-star-en { font-size: 0.68rem }
  .sf-star-stats { grid-template-columns: repeat(2, 1fr); gap: 8px }
  .sf-stat-value { font-size: 0.94rem }
  .sf-star-whisper { padding: 10px 12px }
  .sf-star-whisper-text { font-size: 0.78rem; line-height: 1.75 }
}
</style>
