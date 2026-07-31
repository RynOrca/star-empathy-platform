<template>
  <div class="profile-page">
    <!-- 保留 canvas 不删除 -->
    <canvas ref="canvasRef" class="sky-bg pd-sky-canvas"></canvas>
    <div v-if="!loaded" class="loading">...</div>
    <template v-else>
      <!-- 1. Topbar 固定导航 -->
      <header class="pd-topbar">
        <button class="pd-btn-back pd-btn-ghost" @click="goBack">← 星空</button>
        <span class="pd-brand">STARRY · DOME</span>
        <div class="pd-actions">
          <button class="pd-btn-ghost" @click="startEditSig">✎ 编辑签名</button>
          <button class="pd-btn-ghost" @click="clearAndClosePwdModal(); showPwdModal = true">⚙ 修改密码</button>
        </div>
      </header>

      <!-- 2. Hero 区 100vh -->
      <section class="pd-hero">
        <div class="pd-hero-moon">
          <div class="pd-moon-disk">
            <div class="moon-mare moon-mare-a"></div>
            <div class="moon-mare moon-mare-b"></div>
            <div class="moon-mare moon-mare-c"></div>
          </div>
        </div>
        <div class="pd-hero-content">
          <div class="hero-tag">✦ WEAVER · OF · NIGHT · STORIES ✦</div>
          <h1 class="hero-name">{{ user?.username }}</h1>
          <div class="hero-banner">
            <span class="hero-line hero-line-left"></span>
            <span class="banner-text">{{ sigText }}</span>
            <span class="hero-line hero-line-right"></span>
          </div>
          <div class="hero-joined">
            <span class="pd-gold-sep">◆</span>
            <span>星穹纺织者</span>
            <span class="pd-gold-sep">◆</span>
            <span>加入星空 {{ daysAgo }} 天</span>
            <span class="pd-gold-sep">◆</span>
          </div>
        </div>
        <div class="scroll-hint">
          <span>Scroll · 向下滚动开启回忆</span>
          <span class="pd-scroll-line"></span>
        </div>
      </section>

      <!-- 3. Timeline Section -->
      <section class="pd-section" id="pd-timeline">
        <h2 class="pd-section-head">· 我的回忆 · THE · TIMELINE ·</h2>
        <p class="pd-section-sub">—— 挂在星上的，慢慢读 ——</p>

        <div class="pd-stats-pills">
          <span class="pd-stats-pill">✦ {{ stats.storyCount }} 故事</span>
          <span class="pd-stats-pill">❁ {{ stats.totalResonance }} 收到共鸣</span>
          <span class="pd-stats-pill">☾ {{ stats.resonanceGivenCount }} 发出共鸣</span>
          <span class="pd-stats-pill">♡ {{ stats.favoriteCount }} 收藏</span>
        </div>

        <nav class="pd-timeline" aria-label="个人故事时间轴" v-if="stories.length > 0">
          <div class="pd-t-axis" aria-hidden="true"></div>
          <div class="pd-t-items">
            <article
              v-for="(s, i) in stories.slice(0, visibleCount)"
              :key="s.id"
              class="pd-t-item"
              :class="i % 2 === 0 ? 'left' : 'right'"
              :aria-label="storyAriaLabel(s, i)"
              role="article"
              :style="{ animationDelay: Math.min(i * 30, 200) + 'ms' }"
            >
              <div class="pd-t-node" aria-hidden="true"><span class="pd-t-dot">✦</span></div>
              <div class="pd-t-date" :class="i % 2 === 0 ? 'left' : 'right'">{{ formatMD(s.createdAt) }}</div>
              <button class="pd-t-card" type="button" @click="openStory(s)">
                <header class="pd-tc-head">
                  <h3 class="pd-tc-title">{{ s.title || '未命名故事' }}</h3>
                  <button type="button" v-if="getStoryPrimaryStar(s)"
                    class="pd-tc-star"
                    @click.stop="goToStar(getStoryPrimaryStar(s)!.id)">
                    {{ getStoryPrimaryStar(s)!.name }}<em v-if="getStoryPrimaryStar(s)!.con"> · {{ getStoryPrimaryStar(s)!.con }}</em><strong v-if="getStoryPrimaryStar(s)!.extraCount > 0"> +{{ getStoryPrimaryStar(s)!.extraCount }}</strong>
                  </button>
                </header>
                <p class="pd-tc-excerpt">{{ s.content }}</p>
                <footer class="pd-tc-foot">
                  <span v-if="s.tag" class="tag" :class="'tag-' + s.tag">{{ s.tag }}</span>
                  <span class="pd-tc-res">♡ {{ s.resonanceCount || 0 }}</span>
                </footer>
              </button>
            </article>
          </div>
        </nav>
        <div v-else class="pd-empty">
          <div class="pd-empty-orb" aria-hidden="true">✧</div>
          <h4 class="pd-empty-title">还没有故事，</h4>
          <p class="pd-empty-sub">去星空投递一颗属于你的星 →</p>
          <button class="pd-btn-ghost" @click="router.push('/sky')">前往星空</button>
        </div>

        <div v-if="loadingMore" class="pd-bottom-hint">加载中...</div>
        <div v-else-if="!hasMore && stories.length>0 && visibleCount>=stories.length" class="pd-bottom-hint">✦ ✦ ✦ 已经到底了</div>

        <div class="pd-expand-wrap">
          <button v-if="visibleCount < stories.length" class="pd-btn-expand" @click="expandStories">展开更多故事</button>
          <button v-else-if="hasMore" class="pd-btn-expand" @click="loadAndExpandNext5">加载并展开下一组</button>
        </div>
      </section>

      <section id="pd-constellation" class="pd-section pd-constellation" aria-label="我的私人星座">
        <h2 class="pd-section-head">· 私人星座 · THE · CONSTELLATION ·</h2>
        <p class="pd-section-sub">—— 那些共鸣过的星，在你头顶连成了图 ——</p>
        <div class="pd-const-wrap">
          <template v-if="stories.length === 0">
            <div class="pd-empty" style="max-width: 480px;">
              <div class="pd-empty-orb" aria-hidden="true">✧</div>
              <h4 class="pd-empty-title">还没有编织出星座，</h4>
              <p class="pd-empty-sub">先去时间轴投递一些故事，再来看看它们的连接。</p>
            </div>
          </template>
          <template v-else>
            <div class="pd-const-chart" role="img" :aria-label="`私人星座图，包含 ${Math.min(stories.length, 12)} 颗恒星，${constellationLines().length} 条内核连线`">
              <!-- SVG 椭圆星座图 -->
              <svg class="pd-const-svg" viewBox="0 0 500 360" preserveAspectRatio="xMidYMid meet">
                <!-- 椭圆轨道 guides (虚线，不抢戏) -->
                <ellipse class="pd-const-guide" cx="250" cy="180" rx="180" ry="130" />
                <ellipse class="pd-const-guide" cx="250" cy="180" rx="220" ry="160" />
                <ellipse class="pd-const-guide" cx="250" cy="180" rx="140" ry="100" />
                <!-- 内核连线 kernel dashed -->
                <g class="pd-const-lines">
                  <line
                    v-for="(l, i) in constellationLines()"
                    :key="'cl-' + i"
                    class="pd-const-line"
                    :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
                  />
                </g>
                <!-- 椭圆故事节点 -->
                <g class="pd-const-nodes">
                  <g
                    v-for="(n, i) in constellationNodes()"
                    :key="'cn-' + n.index"
                    class="pd-const-node"
                    tabindex="0"
                    role="button"
                    :aria-label="`跳转至第 ${n.index + 1} 则故事：${stories[n.index]?.title || '未命名故事'}`"
                    @click="scrollToStory(n.index)"
                    @keyup.enter="scrollToStory(n.index)"
                    @keyup.space.prevent="scrollToStory(n.index)"
                  >
                    <ellipse class="pd-const-node-shape" :cx="n.x" :cy="n.y" rx="22" ry="12" />
                    <text class="pd-const-node-idx" :x="n.x" :y="n.y + 3.5">{{ String(n.index + 1).padStart(2, '0') }}</text>
                    <!-- 选中提示 -->
                    <circle class="pd-const-node-halo" :cx="n.x" :cy="n.y" r="34" />
                  </g>
                </g>
              </svg>
            </div>
            <!-- Legend -->
            <div class="pd-const-legend" role="list">
              <div v-for="(s, i) in stories.slice(0, 12)" :key="'clg-' + s.id" class="pd-const-legend-item" role="listitem">
                <span class="pd-const-legend-idx">{{ String(i + 1).padStart(2, '0') }}</span>
                <a href="javascript:void(0)" class="pd-const-legend-name" @click.prevent="scrollToStory(i)" :title="s.content?.slice(0,30)">
                  {{ s.title || '未命名故事' }}
                  <em>{{ getStoryStarNames(s).join(' · ') }}</em>
                </a>
              </div>
            </div>
          </template>
        </div>
      </section>

      <section id="pd-favorites" class="pd-section pd-favorites" aria-label="我的收藏星空">
        <h2 class="pd-section-head">· 典藏星空 · CURATED · FAVORITES ·</h2>
        <p class="pd-section-sub">—— 那些收藏过的星，随时取出来读 ——</p>
        <template v-if="favorites.length === 0">
          <div class="pd-empty" style="max-width: 520px;">
            <div class="pd-empty-orb" aria-hidden="true">♡</div>
            <h4 class="pd-empty-title">还没有收藏的恒星，</h4>
            <p class="pd-empty-sub">在时间轴上点 ❤ 收藏一颗星，它会出现在这里。</p>
          </div>
        </template>
        <template v-else>
          <div class="pd-fav-grid" role="list">
            <article
              v-for="(f, i) in favorites"
              :key="f.id"
              class="pd-fav-card"
              :class="'shift-' + (i % 4)"
              role="listitem"
              tabindex="0"
              :aria-label="`恒星收藏卡：${f.title || '未命名收藏'}，恒星 ${f.starName || ''}，共鸣 ${f.resonanceCount || 0}，按 Enter 详情，按 Delete 取消收藏`"
              @click="goToStarWithCheck(f.starCatalogId, f.id)"
              @keyup.enter="goToStarWithCheck(f.starCatalogId, f.id)"
              @keyup.delete.prevent="unfavorite(f.id)"
            >
              <!-- 收藏卡渐变背景图 (CSS radial 层叠模拟星尘) -->
              <div class="pd-fav-card-bg" aria-hidden="true"></div>
              <!-- 右上角取消收藏按钮 -->
              <button
                type="button"
                class="pd-fav-close"
                aria-label="取消收藏：{{ f.starName || '星' }}"
                @click.stop="unfavorite(f.id)"
                @keyup.enter.stop.prevent="unfavorite(f.id)"
              >×</button>
              <!-- 恒星编号 & Tag -->
              <div class="pd-fav-head">
                <span class="pd-fav-cat">
                  {{ f.starName?.slice(0, 3) || 'HD' + (f.starCatalogId || 0).toString().slice(0, 4) }}
                </span>
                <span v-if="f.starConstellation" class="pd-fav-con">{{ f.starConstellation }}</span>
              </div>
              <!-- 主内容：标题/作者/摘录（如果有 story） -->
              <div class="pd-fav-body">
                <h3 class="pd-fav-title">{{ f.title || f.starName || '无名星' }}</h3>
                <p v-if="f.content" class="pd-fav-excerpt">{{ f.content }}</p>
                <p v-else class="pd-fav-excerpt pd-fav-no-story">—— 此处空，是一颗纯净的恒星球面坐标 ——</p>
              </div>
              <!-- 底部：共鸣/作者/日期 -->
              <footer class="pd-fav-foot">
                <div class="pd-fav-meta">
                  <span class="pd-fav-res">♡ {{ f.resonanceCount || 0 }}</span>
                  <span v-if="f.createdAt" class="pd-fav-date">{{ formatMD(f.createdAt) }}</span>
                </div>
                <div class="pd-fav-cta" aria-hidden="true">→ 前往星空</div>
              </footer>
            </article>
          </div>
        </template>
      </section>

      <!-- 签名 inline 编辑器 -->
      <div v-if="editingSig" class="pd-sign-inline">
        <label class="pd-sign-label">✦ 编辑你的个性签名 ✦</label>
        <input ref="sigInputRef" v-model="sigDraft" maxlength="30"
          @keydown.enter="saveSig" @keydown.escape="editingSig = false"
          class="pd-sign-input" placeholder="写一行签名..." />
        <button class="pd-btn-primary" @click="saveSig">保存</button>
        <button class="pd-btn-ghost" @click="editingSig = false">取消</button>
      </div>

      <!-- 修改密码弹窗 -->
      <div v-if="showPwdModal" class="pd-modal-mask" @click.self="clearAndClosePwdModal">
        <div class="pd-modal-panel">
          <header class="pd-modal-head">
            <h3>· STELLAR · VAULT · 修改星穹之钥 ·</h3>
            <button type="button" class="pd-modal-close" aria-label="关闭" @click="clearAndClosePwdModal">×</button>
          </header>
          <main class="pd-modal-body">
            <div class="pd-modal-form-row">
              <label class="pd-modal-label">旧 密 码</label>
              <input v-model="oldPwd" type="password" class="pd-modal-input" placeholder="输入旧密码" />
            </div>
            <div class="pd-modal-form-row">
              <label class="pd-modal-label">新 密 码</label>
              <input v-model="newPwd" type="password" class="pd-modal-input" placeholder="6~50 个字符" minlength="6" maxlength="50" />
            </div>
            <div class="pd-modal-form-row">
              <label class="pd-modal-label">确 认 新 密 码</label>
              <input v-model="confirmPwd" type="password" class="pd-modal-input" placeholder="再次输入新密码" />
            </div>
            <p v-if="pwdError" class="pwd-error">{{ pwdError }}</p>
          </main>
          <footer class="pd-modal-foot">
            <button class="pd-btn-ghost" @click="clearAndClosePwdModal">取消</button>
            <button class="pd-btn-primary" @click="updatePassword" :disabled="pwdLoading">
              {{ pwdLoading ? '修改中...' : '确认修改' }}
            </button>
          </footer>
        </div>
      </div>

      <!-- 故事详情弹窗 -->
      <div v-if="activeStory" class="pd-modal-mask" @click.self="activeStory = null">
        <div class="pd-modal-panel pd-story-panel">
          <header class="pd-modal-head">
            <div class="pd-story-head-title">
              <h3>{{ activeStory.title || '未命名故事' }}</h3>
              <span v-if="activeStory.tag" class="tag" :class="'tag-' + activeStory.tag">{{ activeStory.tag }}</span>
            </div>
            <button type="button" class="pd-modal-close" aria-label="关闭" @click="activeStory = null">×</button>
          </header>
          <main class="pd-modal-body">
            <div class="pd-story-meta-row">
              <template v-if="getStoryStarIds(activeStory).length">
                <button
                  v-for="cid in getStoryStarIds(activeStory)"
                  :key="cid"
                  class="pd-story-meta-star"
                  @click="goToStar(cid)"
                >
                  ✦ {{ getStarName(cid) }}
                </button>
              </template>
              <span class="pd-story-meta-date">{{ formatDate(activeStory.createdAt) }}</span>
              <span class="pd-story-meta-res">♡ {{ activeStory.resonanceCount || 0 }}</span>
              <span v-if="activeStory.location" class="pd-story-meta-loc">◎ {{ activeStory.location }}</span>
            </div>
            <div class="pd-modal-divider"></div>
            <div class="pd-story-content">
              <img v-if="activeStory.imageUrl" :src="activeStory.imageUrl" class="pd-story-image" alt="故事图片" />
              {{ activeStory.content }}
            </div>
          </main>
          <footer class="pd-modal-foot">
            <button class="pd-btn-ghost" @click="resonateStory">共鸣 +1</button>
            <button class="pd-btn-danger" @click="activeStoryId = activeStory?.id ?? null; showDeleteConfirm = true">删除此故事</button>
          </footer>
        </div>
      </div>

      <!-- 删除确认弹窗 -->
      <div v-if="showDeleteConfirm" class="pd-modal-mask" @click.self="showDeleteConfirm = false">
        <div class="pd-modal-panel" style="width: 400px;">
          <header class="pd-modal-head">
            <h3>· 摘取故事 · REMOVE ·</h3>
            <button type="button" class="pd-modal-close" aria-label="取消" @click="showDeleteConfirm = false">×</button>
          </header>
          <main class="pd-modal-body">
            <p class="pd-delete-text">要把「{{ activeStory?.title || '这则故事' }}」送回星穹吗？此操作不可撤销。</p>
          </main>
          <footer class="pd-modal-foot">
            <button class="pd-btn-ghost" @click="showDeleteConfirm = false" :disabled="deletingStory">取消</button>
            <button class="pd-btn-danger" @click="confirmDelete" :disabled="deletingStory">
              {{ deletingStory ? '删除中...' : '确认摘取' }}
            </button>
          </footer>
        </div>
      </div>

      <!-- Gold flash banner -->
      <Transition name="pd-flash">
        <div v-if="flash" class="pd-flash-banner" :class="flash.tone" role="status" aria-live="polite">
          <span>{{ flash.text }}</span>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Star } from 'lucide-vue-next'
import { useParticleSky } from '../composables/useParticleSky'
import catalogData from '../data/stars.json'
import { constellationNames } from '../data/starInfo'

const PAGE_SIZE = 20
const VISIBLE_STEP = 5

const router = useRouter()
const canvasRef = ref<HTMLCanvasElement | null>(null)
useParticleSky(canvasRef)

interface FavoriteItem {
  id: number
  starCatalogId?: number
  starName?: string
  starConstellation?: string
  title?: string
  content?: string
  resonanceCount?: number
  createdAt?: string
}
const loaded = ref(false)
const user = ref<{ id: number; username: string; signature: string; createdAt: string } | null>(null)
const stories = ref<any[]>([])
const favorites = ref<FavoriteItem[]>([])
const stats = ref({ storyCount: 0, totalResonance: 0, resonanceGivenCount: 0, favoriteCount: 0 })
const hoverIdx = ref(-1)
const activeStory = ref<any>(null)

const editingSig = ref(false)
const sigDraft = ref('')
const sigInputRef = ref<HTMLInputElement | null>(null)

// ─── 修改密码 ───
const showPwdModal = ref(false)
const pwdLoading = ref(false)
const pwdError = ref('')
const pwdSuccess = ref('')
const oldPwd = ref('')
const newPwd = ref('')
const confirmPwd = ref('')

async function updatePassword() {
  pwdError.value = ''
  pwdSuccess.value = ''
  if (!oldPwd.value || !newPwd.value || !confirmPwd.value) {
    pwdError.value = '请填写所有字段'
    return
  }
  if (newPwd.value !== confirmPwd.value) {
    pwdError.value = '两次输入的新密码不一致'
    return
  }
  const token = getToken()
  if (!token) return
  pwdLoading.value = true
  try {
    const res = await fetch('/api/auth/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ oldPassword: oldPwd.value, newPassword: newPwd.value }),
    })
    const json = await res.json()
    if (res.ok) {
      showFlash('✦ 密码已更换 · 星穹之锁已重铸 ✦', 'success')
      newPwd.value = ''
      confirmPwd.value = ''
      oldPwd.value = ''
      showPwdModal.value = false
    } else {
      pwdError.value = json.message || '修改失败'
    }
  } catch {
    pwdError.value = '网络错误，请重试'
  } finally {
    pwdLoading.value = false
  }
}

function clearAndClosePwdModal() {
  showPwdModal.value = false
  oldPwd.value = ''; newPwd.value = ''; confirmPwd.value = ''; pwdError.value = ''
}

const currentPage = ref(0)
const hasMore = ref(true)
const loadingMore = ref(false)

// ─── Task3 预留引用 ───
const visibleCount = ref(VISIBLE_STEP)
function expandStories() {
  const oldCount = visibleCount.value
  visibleCount.value = Math.min(oldCount + VISIBLE_STEP, stories.value.length)
  nextTick(() => {
    const selector = `.pd-t-item:nth-child(${oldCount + 1})`
    const el = document.querySelector(selector) as HTMLElement | null
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
async function loadAndExpandNext5() {
  await loadNextPage()
  visibleCount.value = Math.min(visibleCount.value + VISIBLE_STEP, stories.value.length)
}

// ─── Constellation scroll helper (Task4) ───
function scrollToStory(i: number) {
  if (i < 0 || i >= stories.value.length) return
  // 点击节点时：若目标故事当前不在 visibleCount 范围内，先扩展到包含它
  if (visibleCount.value <= i) {
    visibleCount.value = Math.min(Math.ceil((i + 1) / VISIBLE_STEP) * VISIBLE_STEP, stories.value.length)
  }
  nextTick(() => {
    const el = document.querySelector(`.pd-t-item:nth-child(${i + 1})`) as HTMLElement | null
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // gold flash focus
      el.classList.add('pd-story-flash')
      setTimeout(() => el.classList.remove('pd-story-flash'), 1400)
    }
  })
}

// ─── Favorites helpers (Task5) ───
async function goToStarWithCheck(starCatalogId: number | undefined, favId: number) {
  if (!starCatalogId) {
    console.warn('[Profile] 收藏记录缺少 catalog_star_id:', favId)
    return
  }
  router.push({ path: '/sky', query: { star: String(starCatalogId) } })
}

// ─── Gold Flash feedback (Task6) ───
const flash = ref<{ text: string; tone: 'success' | 'error' | 'info' } | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | null = null
function showFlash(text: string, tone: 'success' | 'error' | 'info' = 'success') {
  flash.value = { text, tone }
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flash.value = null
    flashTimer = null
  }, 2600)
}

async function resonateStory() {
  if (!activeStory.value) return
  try {
    const res = await fetch(`/api/stars/${activeStory.value.id}/resonate`, { method: 'POST' })
    if (res.ok) {
      const j = await res.json()
      if (j.data) {
        activeStory.value = { ...activeStory.value, resonanceCount: (activeStory.value.resonanceCount || 0) + 1 }
        const idx = stories.value.findIndex(s => s.id === activeStory.value!.id)
        if (idx >= 0) stories.value[idx].resonanceCount = (stories.value[idx].resonanceCount || 0) + 1
      }
      showFlash('✦ 共鸣已传向那颗星 ✦', 'success')
    }
  } catch { showFlash('共鸣失败，稍后再试', 'error') }
}

const sigText = computed(() => user.value?.signature || '今夜星光很好')
const daysAgo = computed(() => {
  if (!user.value) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(user.value.createdAt).getTime()) / 86400000))
})

function formatDate(d: string) { if (!d) return ''; return d.slice(0, 16).replace('T', ' ') }

interface CatalogStarLite { name: string; con: string; mag: number; color: string }
const starLookup = new Map<number, CatalogStarLite>()
for (const s of catalogData.stars) starLookup.set(s.id, { name: s.name || `${s.con || ''} #${s.id}`, con: s.con || '', mag: s.mag, color: s.color || '#fff' })
function getStarName(id: number) { return starLookup.get(id)?.name || `星星 #${id}` }
function getStarCon(id: number) { const c = starLookup.get(id)?.con; return c ? (constellationNames[c] || c) : '' }
function getStarMag(id: number) { return starLookup.get(id)?.mag ?? null }
function getStarColor(id: number) { return starLookup.get(id)?.color || '#ffffff' }

function goToStar(starId: number) { router.push({ path: '/sky', query: { star: String(starId) } }) }

async function unfavorite(favoriteId: number) {
  const token = getToken()
  if (!token) return
  const f = favorites.value.find(x => x.id === favoriteId)
  const starId = f?.starCatalogId
  try {
    if (starId != null) {
      const res = await fetch(`/api/catalog/stars/${starId}/favorite`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
    }
    favorites.value = favorites.value.filter(x => x.id !== favoriteId)
    stats.value.favoriteCount = favorites.value.length
  } catch {}
}

// ─── TimeLine Helpers ───
function getStoryPrimaryStar(s: any): { id: number; name: string; con: string; extraCount: number } | null {
  const ids = getStoryStarIds(s)
  if (!ids.length) return null
  const first = ids[0]
  return { id: first, name: getStarName(first), con: getStarCon(first), extraCount: Math.max(0, ids.length - 1) }
}
function formatMD(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d.slice(5,10).replace('-',' / ')
  return `${String(dt.getMonth()+1).padStart(2,'0')} / ${String(dt.getDate()).padStart(2,'0')}`
}
function storyAriaLabel(s: any, i: number) {
  const when = formatDate(s.createdAt)
  const starName = getStoryPrimaryStar(s)?.name ?? '无名星'
  const title = s.title || '未命名故事'
  return `第 ${i+1} 则故事：${title}，于 ${when} 挂在 ${starName}，共鸣 ${s.resonanceCount || 0}`
}

// ─── Constellation helpers (Task4 uses, pre-write now so data ready) ───
const kernelLinesRaw = ref<{ from:{catalogStarId:number}; to:{catalogStarId:number} }[]>([])
function constellationNodes() {
  const items = stories.value.slice(0, 12)
  const n = items.length
  const rx = 180, ry = 130, cx = 250, cy = 180
  return items.map((_, i) => ({
    index: i,
    x: cx + rx * Math.cos((i / n) * Math.PI * 2 + 0.35),
    y: cy + ry * Math.sin((i / n) * Math.PI * 2 + 0.35),
  }))
}
function constellationLines() {
  const limitedStories = stories.value.slice(0, 12)
  const starToIdx = new Map<number, number>()
  limitedStories.forEach((s, i) => {
    const ids = getStoryStarIds(s)
    if (ids[0] != null && !starToIdx.has(ids[0])) starToIdx.set(ids[0], i)
  })
  const nodes = constellationNodes()
  const out: { x1:number; y1:number; x2:number; y2:number }[] = []
  for (const l of kernelLinesRaw.value) {
    const a = starToIdx.get(l.from?.catalogStarId)
    const b = starToIdx.get(l.to?.catalogStarId)
    if (a == null || b == null || !nodes[a] || !nodes[b]) continue
    out.push({ x1: nodes[a].x, y1: nodes[a].y, x2: nodes[b].x, y2: nodes[b].y })
  }
  return out
}

function getToken() { return localStorage.getItem('token') }

async function loadNextPage() {
  if (!hasMore.value || loadingMore.value) return
  const token = getToken()
  if (!token) return
  loadingMore.value = true
  try {
    const nextPage = currentPage.value + 1
    const res = await fetch(`/api/profile/stories?page=${nextPage}&limit=${PAGE_SIZE}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (res.ok && json.data) {
      const items = json.data.items ?? json.data ?? []
      stories.value = [...stories.value, ...items]
      currentPage.value = json.data.page ?? nextPage
      hasMore.value = (json.data.page ?? nextPage) < (json.data.totalPages ?? 1)
      // 统计数据由 /api/profile/stats 提供，这里不再客户端累加
    }
  } catch (e) { console.error('加载故事页失败:', e) }
  finally { loadingMore.value = false }
}

async function startEditSig() {
  sigDraft.value = user.value?.signature || ''
  editingSig.value = true
  await nextTick()
  sigInputRef.value?.focus()
}

async function saveSig() {
  editingSig.value = false
  const v = sigDraft.value.trim()
  if (!v || v === user.value?.signature) return
  const token = getToken()
  if (!token) return
  try {
    const r = await fetch('/api/auth/signature', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ signature: v }),
    })
    const j = await r.json()
    if (r.ok && user.value) {
      user.value.signature = j.data.signature
      showFlash('✦ 签名已更新 · 织进了月面 ✦', 'success')
    }
  } catch {}
}

function openStory(s: any) { activeStory.value = s }
function goBack() { router.push('/sky') }

// 获取故事关联的星名列表
function getStoryStarIds(story: any): number[] {
  if (story.catalogStarIds?.length) return story.catalogStarIds
  if (story.catalogStarId) return [story.catalogStarId]
  return []
}
function getStoryStarNames(story: any): string[] {
  return getStoryStarIds(story).map(id => getStarName(id))
}

// ─── 删除故事 ───
const showDeleteConfirm = ref(false)
const activeStoryId = ref<number | null>(null)
const deletingStory = ref(false)

async function confirmDelete() {
  if (activeStoryId.value == null) return
  const token = getToken()
  if (!token) return
  deletingStory.value = true
  try {
    const res = await fetch(`/api/stories/${activeStoryId.value}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      stories.value = stories.value.filter(x => x.id !== activeStoryId.value)
      const removedCount = activeStory.value?.resonanceCount || 0
      stats.value.storyCount = Math.max(0, stats.value.storyCount - 1)
      stats.value.totalResonance = Math.max(0, stats.value.totalResonance - removedCount)
      activeStory.value = null
      showDeleteConfirm.value = false
      showFlash('✦ 故事已摘取，回到了星海 ✦', 'info')
    } else {
      const json = await res.json()
      alert(json.message || '删除失败')
    }
  } catch {
    alert('网络错误，请重试')
  } finally {
    deletingStory.value = false
  }
}

// 每次进入页面时重新加载所有数据
async function loadProfileData() {
  // 重置所有状态，确保数据是全新的
  loaded.value = false
  user.value = null
  stories.value = []
  favorites.value = []
  stats.value = { storyCount: 0, totalResonance: 0, resonanceGivenCount: 0, favoriteCount: 0 }
  currentPage.value = 0
  hasMore.value = true
  loadingMore.value = false
  activeStory.value = null
  kernelLinesRaw.value = []
  visibleCount.value = VISIBLE_STEP

  const token = getToken()
  if (!token) { router.push('/'); return }
  try {
    const [meRes, firstPageRes, favRes, linesRes, statsRes] = await Promise.all([
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/profile/stories?page=1&limit=${PAGE_SIZE}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/profile/favorites', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/profile/kernel-lines', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/profile/stats', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    const meJson = await meRes.json()
    if (meRes.ok) user.value = meJson.data
    const firstJson = await firstPageRes.json()
    if (firstPageRes.ok && firstJson.data) {
      const items = firstJson.data.items ?? firstJson.data ?? []
      stories.value = items
      currentPage.value = firstJson.data.page ?? 1
      hasMore.value = (firstJson.data.page ?? 1) < (firstJson.data.totalPages ?? 1)
    }
    try {
      const lj = await linesRes.json()
      if (linesRes.ok && lj.data?.length) kernelLinesRaw.value = lj.data
    } catch { /* 静默 */ }
    const favJson = await favRes.json()
    if (favRes.ok) { favorites.value = favJson.data }
    // 使用后端聚合统计（准确计数，不受分页影响）
    const statsJson = await statsRes.json()
    if (statsRes.ok && statsJson.data) {
      stats.value.storyCount = statsJson.data.storyCount ?? 0
      stats.value.totalResonance = statsJson.data.totalResonance ?? 0
      stats.value.resonanceGivenCount = statsJson.data.resonanceGivenCount ?? 0
      stats.value.favoriteCount = statsJson.data.favoriteCount ?? favJson.data?.length ?? 0
    } else if (favJson.data) {
      stats.value.favoriteCount = favJson.data.length
    }
  } catch (e) { console.error('加载失败', e) }
  loaded.value = true
}

onMounted(() => {
  loadProfileData()
})

onBeforeUnmount(() => {
  if (flashTimer) clearTimeout(flashTimer)
})
</script>

<style scoped>
.profile-page {
  --pd-bg-0: #05060f;
  --pd-bg-1: rgba(16, 18, 40, 0.6);
  --pd-bg-2: rgba(26, 28, 54, 0.8);
  --pd-gold: #ffd98a;
  --pd-gold-soft: rgba(255, 217, 138, 0.45);
  --pd-gold-line: rgba(255, 217, 138, 0.18);
  --pd-text-pri: #e8e4ff;
  --pd-text-sec: #a9a3c7;
  --pd-text-dim: rgba(255, 217, 138, 0.5);
  --pd-border: rgba(255, 217, 138, 0.18);
  --pd-border-hot: rgba(255, 217, 138, 0.5);
  --pd-font-deco: Cinzel, Noto Serif SC, Songti SC, Microsoft YaHei, serif;
  --pd-font-serif: Noto Serif SC, Songti SC, Cinzel, Microsoft YaHei, serif;
}

.profile-page {
  width: 100vw;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  font-family: var(--pd-font-serif);
  color: var(--pd-text-pri);
  padding-bottom: 160px;
  background: var(--pd-bg-0);
}

.profile-page::before,
.profile-page::after {
  content: "";
  position: fixed;
  top: -50%;
  left: -50%;
  right: -50%;
  bottom: -50%;
  width: 200%;
  height: 200%;
  z-index: 0;
  pointer-events: none;
  background-repeat: repeat;
}

.profile-page::before {
  background-image:
    radial-gradient(1px 1px at 20px 30px, rgba(255, 255, 255, 0.4), transparent),
    radial-gradient(1px 1px at 80px 120px, rgba(255, 255, 255, 0.3), transparent),
    radial-gradient(1px 1px at 160px 60px, rgba(255, 255, 255, 0.35), transparent),
    radial-gradient(1.5px 1.5px at 240px 200px, rgba(255, 217, 138, 0.3), transparent),
    radial-gradient(1px 1px at 300px 90px, rgba(255, 255, 255, 0.25), transparent),
    radial-gradient(1px 1px at 360px 280px, rgba(255, 255, 255, 0.3), transparent);
  background-size: 400px 400px;
  opacity: 0.7;
  animation: pd-sky-drift-1 120s linear infinite;
}

.profile-page::after {
  background-image:
    radial-gradient(1px 1px at 50px 80px, rgba(255, 255, 255, 0.5), transparent),
    radial-gradient(1.5px 1.5px at 130px 40px, rgba(255, 255, 255, 0.45), transparent),
    radial-gradient(1px 1px at 200px 170px, rgba(255, 217, 138, 0.4), transparent),
    radial-gradient(1px 1px at 270px 100px, rgba(255, 255, 255, 0.4), transparent),
    radial-gradient(1.5px 1.5px at 10px 230px, rgba(255, 255, 255, 0.35), transparent),
    radial-gradient(1px 1px at 90px 290px, rgba(255, 255, 255, 0.45), transparent),
    radial-gradient(1px 1px at 170px 20px, rgba(255, 217, 138, 0.35), transparent),
    radial-gradient(1.5px 1.5px at 250px 260px, rgba(255, 255, 255, 0.4), transparent);
  background-size: 300px 300px;
  opacity: 0.7;
  animation: pd-sky-drift-2 80s linear infinite;
}

@keyframes pd-sky-drift-1 {
  0% { transform: translate(0, 0); }
  100% { transform: translate(400px, 400px); }
}

@keyframes pd-sky-drift-2 {
  0% { transform: translate(0, 0); }
  100% { transform: translate(-300px, 300px); }
}

.sky-bg.pd-sky-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
  opacity: 0.6;
}

.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  font-size: 1.2rem;
  color: var(--pd-text-sec);
}

@keyframes pd-node-pulse {
  0%, 100% { transform: scale(0.92); opacity: 0.7; }
  50% { transform: scale(1.08); opacity: 1; }
}

@keyframes pd-line-breath {
  0%, 100% { stroke-opacity: 0.2; }
  50% { stroke-opacity: 0.6; }
}

@keyframes pd-fade-up {
  0% { transform: translateY(24px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes pd-scroll-hint {
  0% { transform: translateY(-6px); opacity: 0; }
  30% { opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translateY(12px); opacity: 0; }
}

@keyframes pd-moon-glow {
  0%, 100% { box-shadow: 0 0 40px 8px rgba(255, 217, 138, 0.2), 0 0 80px 16px rgba(255, 217, 138, 0.08); }
  50% { box-shadow: 0 0 60px 14px rgba(255, 217, 138, 0.32), 0 0 120px 28px rgba(255, 217, 138, 0.14); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
}

.profile-page > * {
  z-index: 1;
  position: relative;
}

/* ===== (a) Topbar ===== */
.pd-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  padding: 14px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(5, 6, 15, 0.92) 0%, rgba(5, 6, 15, 0.6) 70%, rgba(5, 6, 15, 0) 100%);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.pd-btn-back,
.pd-btn-ghost {
  border: 1px solid var(--pd-gold);
  border-radius: 2px;
  padding: 7px 14px;
  background: transparent;
  color: var(--pd-gold);
  font-family: var(--pd-font-serif);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.25s ease, color 0.25s ease;
}

.pd-btn-back:hover,
.pd-btn-ghost:hover {
  background: var(--pd-gold);
  color: #130d00;
}

.pd-brand {
  font-family: var(--pd-font-deco);
  letter-spacing: 0.3em;
  color: var(--pd-gold);
  font-size: 0.78rem;
}

.pd-actions {
  display: flex;
  gap: 10px;
}

/* ===== (b) Hero 100vh ===== */
.pd-hero {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pd-hero-moon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.pd-moon-disk {
  position: relative;
  width: 480px;
  height: 480px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 42%, #fff8e1 0%, #e9dcbf 35%, #b8ae95 68%, #7d725e 100%);
  box-shadow:
    inset -20px -30px 60px rgba(80, 68, 48, 0.35),
    inset 15px 20px 40px rgba(255, 248, 225, 0.4),
    0 0 40px 8px rgba(255, 217, 138, 0.2),
    0 0 80px 16px rgba(255, 217, 138, 0.08);
  animation: pd-moon-glow 6s ease-in-out infinite;
}

.moon-mare {
  position: absolute;
  border-radius: 50%;
  filter: blur(14px);
  background: rgba(135, 120, 95, 0.28);
}

.moon-mare-a {
  top: 20%;
  left: 28%;
  width: 130px;
  height: 92px;
}

.moon-mare-b {
  top: 55%;
  left: 55%;
  width: 80px;
  height: 60px;
}

.moon-mare-c {
  top: 70%;
  left: 25%;
  width: 100px;
  height: 50px;
}

.pd-hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 0 24px;
  max-width: 900px;
}

.hero-tag {
  font-family: var(--pd-font-deco);
  letter-spacing: 0.4em;
  color: var(--pd-gold);
  font-size: 0.78rem;
  margin-bottom: 28px;
  opacity: 0.85;
}

.hero-name {
  font-family: var(--pd-font-deco);
  font-size: clamp(28px, 5vw, 54px);
  color: #fff9ea;
  margin: 0 0 32px 0;
  font-weight: 700;
  text-shadow:
    0 0 20px rgba(255, 217, 138, 0.4),
    0 2px 12px rgba(0, 0, 0, 0.6);
}

.hero-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin-bottom: 36px;
}

.hero-line {
  display: inline-block;
  width: 70px;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--pd-gold) 50%, transparent 100%);
}

.banner-text {
  font-family: var(--pd-font-serif);
  font-style: italic;
  color: var(--pd-gold);
  font-size: 1.05rem;
  max-width: 480px;
  text-shadow: 0 0 10px rgba(255, 217, 138, 0.3);
}

.hero-joined {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--pd-text-sec);
  font-size: 0.85rem;
  letter-spacing: 0.05em;
}

.pd-gold-sep {
  color: var(--pd-gold);
  opacity: 0.75;
}

.scroll-hint {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--pd-gold);
  opacity: 0.7;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
}

.pd-scroll-line {
  display: block;
  width: 1px;
  height: 36px;
  background: linear-gradient(180deg, var(--pd-gold) 0%, transparent 100%);
  animation: pd-scroll-hint 2.4s ease-in-out infinite;
}

/* ===== (c) Section 通用 ===== */
.pd-section {
  max-width: 1120px;
  margin: 0 auto;
  padding: 140px 24px 60px;
  position: relative;
}

.pd-section-head {
  font-family: var(--pd-font-deco);
  font-size: 22px;
  line-height: 32px;
  color: var(--pd-gold);
  letter-spacing: 0.2em;
  text-align: center;
  margin: 0 0 16px 0;
}

.pd-section-sub {
  font-style: italic;
  color: #a9a3c7;
  font-size: 0.88rem;
  text-align: center;
  margin: 0 0 48px 0;
}

/* ===== (d) Stats 胶囊 ===== */
.pd-stats-pills {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 16px;
  margin-bottom: 72px;
}

.pd-stats-pill {
  border: 1px solid var(--pd-gold);
  border-radius: 999px;
  padding: 6px 16px;
  color: var(--pd-gold);
  font-size: 0.76rem;
  opacity: 0.85;
  letter-spacing: 0.05em;
  background: rgba(255, 217, 138, 0.04);
}

/* ===== (e) Bottom 提示 + 展开按钮 ===== */
.pd-bottom-hint {
  text-align: center;
  color: var(--pd-gold);
  letter-spacing: 0.2em;
  font-size: 0.72rem;
  padding: 24px 0;
  opacity: 0.7;
}

.pd-expand-wrap {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.pd-btn-expand {
  padding: 12px 28px;
  border: 1px solid var(--pd-gold);
  border-radius: 2px;
  background: transparent;
  color: var(--pd-gold);
  font-family: var(--pd-font-serif);
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: background 0.25s ease, color 0.25s ease;
}

.pd-btn-expand:hover {
  background: var(--pd-gold);
  color: #130d00;
}

/* Timeline */
.pd-timeline {
  position: relative;
  padding: 24px 0 48px;
}

.pd-t-axis {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, transparent 0%, var(--pd-gold) 12%, var(--pd-gold) 88%, transparent 100%);
  opacity: 0.55;
}

.pd-t-items {
  display: flex;
  flex-direction: column;
  gap: 96px;
}

.pd-t-item {
  position: relative;
  width: 44%;
  animation: pd-fade-up 0.6s ease-out both;
}

.pd-t-item.left {
  align-self: flex-start;
  padding-right: 48px;
}

.pd-t-item.right {
  align-self: flex-end;
  padding-left: 48px;
}

/* Timeline node */
.pd-t-node {
  position: absolute;
  top: 22px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.pd-t-item.left .pd-t-node {
  right: -18px;
}

.pd-t-item.right .pd-t-node {
  left: -18px;
}

.pd-t-node::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 217, 138, 0.45) 0%, rgba(255, 217, 138, 0) 70%);
  animation: pd-node-pulse 3.5s ease-in-out infinite;
}

.pd-t-dot {
  position: relative;
  font-size: 1.1rem;
  color: var(--pd-gold);
  text-shadow: 0 0 12px var(--pd-gold-soft);
}

/* Timeline date */
.pd-t-date {
  position: absolute;
  top: -24px;
  font-family: var(--pd-font-deco);
  font-size: 0.68rem;
  letter-spacing: 0.2em;
  color: var(--pd-text-dim);
}

.pd-t-date.left {
  right: 48px;
}

.pd-t-date.right {
  left: 48px;
}

/* Timeline card */
.pd-t-card {
  display: block;
  width: 100%;
  padding: 22px 26px;
  background: var(--pd-bg-1);
  border: 1px solid var(--pd-border);
  border-radius: 3px;
  color: var(--pd-text-pri);
  cursor: pointer;
  text-align: left;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition: transform 0.35s ease, background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  font-family: inherit;
}

.pd-t-card:hover {
  transform: translateY(-6px);
  background: var(--pd-bg-2);
  border-color: var(--pd-border-hot);
  box-shadow: 0 12px 40px -12px rgba(255, 217, 138, 0.25);
}

/* Card head */
.pd-tc-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.pd-tc-title {
  font-family: var(--pd-font-serif);
  font-size: 1.05rem;
  font-weight: 500;
  margin: 0;
  color: var(--pd-text-pri);
  transition: color 0.25s ease;
}

.pd-t-card:hover .pd-tc-title {
  color: var(--pd-gold);
}

.pd-tc-star {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 10px;
  border: 1px solid var(--pd-gold);
  border-radius: 999px;
  font-size: 0.68rem;
  color: var(--pd-gold);
  cursor: pointer;
  transition: background 0.25s ease, color 0.25s ease;
  outline: none;
}

.pd-tc-star:focus-visible { outline: 2px solid var(--pd-gold); outline-offset: 3px; }

.pd-tc-star:hover {
  background: var(--pd-gold);
  color: #130d00;
}

.pd-tc-star em {
  font-style: normal;
  font-size: 0.85em;
  opacity: 0.8;
}

.pd-tc-star strong {
  font-weight: 600;
  font-size: 0.9em;
}

/* Card excerpt */
.pd-tc-excerpt {
  font-family: var(--pd-font-serif);
  font-size: 0.86rem;
  font-style: italic;
  line-height: 1.9;
  color: var(--pd-text-sec);
  margin: 0 0 18px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}

/* Card foot */
.pd-tc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px dashed var(--pd-gold-line);
}

.pd-tc-res {
  font-size: 0.78rem;
  color: var(--pd-text-dim);
  letter-spacing: 0.05em;
}

/* Emotion tags */
.tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
}

.tag-思念 {
  background: rgba(255, 158, 184, 0.15);
  color: #ff9eb8;
  border: 1px solid rgba(255, 158, 184, 0.3);
}

.tag-愿望 {
  background: rgba(255, 217, 138, 0.15);
  color: var(--pd-gold);
  border: 1px solid rgba(255, 217, 138, 0.3);
}

.tag-孤独 {
  background: rgba(128, 222, 170, 0.15);
  color: #80deaa;
  border: 1px solid rgba(128, 222, 170, 0.3);
}

.tag-离别 {
  background: rgba(196, 158, 255, 0.15);
  color: #c49eff;
  border: 1px solid rgba(196, 158, 255, 0.3);
}

.tag-等待 {
  background: rgba(128, 191, 255, 0.15);
  color: #80bfff;
  border: 1px solid rgba(128, 191, 255, 0.3);
}

/* Empty state */
.pd-empty {
  text-align: center;
  padding: 80px 40px;
  max-width: 420px;
  margin: 0 auto;
  border: 1px dashed var(--pd-gold-line);
  border-radius: 4px;
  background: var(--pd-bg-1);
}

.pd-empty-orb {
  font-size: 3rem;
  color: var(--pd-gold);
  text-shadow: 0 0 24px var(--pd-gold-soft);
  margin-bottom: 24px;
  animation: pd-node-pulse 3.5s ease-in-out infinite;
}

.pd-empty-title {
  font-family: var(--pd-font-serif);
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--pd-text-pri);
  margin: 0 0 8px;
}

.pd-empty-sub {
  font-style: italic;
  color: var(--pd-text-sec);
  font-size: 0.88rem;
  margin: 0 0 28px;
}

/* Constellation Section */
.pd-constellation {
  padding-top: 120px;
}

.pd-const-wrap {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 56px;
  justify-content: center;
  align-items: flex-start;
}

/* SVG chart */
.pd-const-chart {
  width: min(520px, 90vw);
  height: 380px;
  aspect-ratio: 500 / 360;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px dashed var(--pd-gold);
  border-radius: 4px;
  padding: 40px;
  background: var(--pd-bg-1);
}

.pd-const-svg {
  width: 100%;
  height: 100%;
}

.pd-const-guide {
  fill: none;
  stroke: var(--pd-gold);
  opacity: 0.07;
  stroke-dasharray: 3 6;
}

/* kernel lines — dashed breath */
.pd-const-line {
  stroke: var(--pd-gold);
  opacity: 0.42;
  stroke-dasharray: 4 6;
  stroke-width: 1;
  animation: pd-line-breath 4s ease-in-out infinite;
}

/* Nodes */
.pd-const-node {
  cursor: pointer;
}

.pd-const-node-shape {
  fill: rgba(255, 217, 138, 0.15);
  stroke: rgba(255, 217, 138, 0.55);
  stroke-width: 1.5;
  transition: fill 0.25s ease;
}

.pd-const-node-halo {
  fill: none;
  stroke: var(--pd-gold);
  stroke-width: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease, stroke-width 0.3s ease;
}

.pd-const-node:hover .pd-const-node-shape {
  fill: var(--pd-gold);
}

.pd-const-node:hover .pd-const-node-idx {
  fill: #130d00;
}

.pd-const-node:focus-visible .pd-const-node-halo {
  opacity: 0.5;
  stroke-width: 1;
}

.pd-const-node-idx {
  font-family: var(--pd-font-deco);
  font-size: 0.6rem;
  fill: var(--pd-gold);
  letter-spacing: 0.05em;
  text-anchor: middle;
  alignment-baseline: middle;
  dominant-baseline: middle;
  transition: fill 0.25s ease;
}

/* Legend */
.pd-const-legend {
  flex: 1;
  max-width: 420px;
  padding: 28px;
  border: 1px dashed var(--pd-gold);
  border-radius: 4px;
  background: var(--pd-bg-1);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.pd-const-legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px dashed rgba(255, 217, 138, 0.15);
}

.pd-const-legend-item:last-child {
  border-bottom: none;
}

.pd-const-legend-idx {
  font-family: var(--pd-font-deco);
  font-size: 0.65rem;
  color: var(--pd-gold);
  border: 1px solid var(--pd-gold);
  border-radius: 999px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pd-const-legend-name {
  display: block;
  flex: 1;
  color: var(--pd-text-pri);
  font-size: 0.88rem;
  text-decoration: none;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.25s ease, text-shadow 0.25s ease;
}

.pd-const-legend-name:hover {
  color: var(--pd-gold);
  text-shadow: 0 0 8px var(--pd-gold-soft);
}

.pd-const-legend-name em {
  display: block;
  font-style: normal;
  font-size: 0.72rem;
  opacity: 0.6;
  margin-top: 2px;
  color: var(--pd-gold);
}

/* Gold flash for scrollToStory */
@keyframes pd-story-flash-kf {
  0% {
    outline: 2px solid transparent;
    box-shadow: none;
    border-left-color: var(--pd-border);
  }
  15% {
    outline: 2px solid var(--pd-gold);
    box-shadow: 0 0 20px -4px var(--pd-gold-soft), 0 0 40px -8px var(--pd-gold-soft);
    border-left-color: var(--pd-gold);
  }
  100% {
    outline: 2px solid transparent;
    box-shadow: none;
    border-left-color: var(--pd-border);
  }
}

.pd-story-flash {
  animation: pd-story-flash-kf 1.4s ease-out forwards;
  border-left-color: var(--pd-gold);
}

/* Favorites Section */
.pd-favorites {
  padding-top: 120px;
}

.pd-fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 40px 36px;
  max-width: 1080px;
  margin: 0 auto;
}

/* Card stacking shifts 0 1 2 3 index % 4 transforms */
.pd-fav-card.shift-0 { transform: translateX(-6px) translateY(0) rotate(-0.6deg); }
.pd-fav-card.shift-1 { transform: translateX(5px) translateY(-10px) rotate(0.4deg); }
.pd-fav-card.shift-2 { transform: translateX(-3px) translateY(5px) rotate(0.8deg); }
.pd-fav-card.shift-3 { transform: translateX(4px) translateY(-7px) rotate(-0.5deg); }

/* pd-fav-card main */
.pd-fav-card {
  position: relative;
  padding: 22px 22px 16px;
  background: var(--pd-bg-1);
  border: 1px dashed var(--pd-gold);
  border-radius: 4px;
  min-height: 260px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  outline: none;
  transition: transform 0.4s cubic-bezier(.2,.7,.2,1), box-shadow 0.4s;
}

.pd-fav-card:hover,
.pd-fav-card:focus-visible {
  transform: translateY(-4px) rotate(0deg);
  border-style: solid;
  border-color: var(--pd-gold);
  box-shadow: 0 16px 48px -12px rgba(255, 217, 138, 0.3);
}

.pd-fav-card:hover .pd-fav-card-bg,
.pd-fav-card:focus-visible .pd-fav-card-bg {
  opacity: 0.55;
}

/* card-bg radial gradient */
.pd-fav-card-bg {
  position: absolute;
  inset: 0;
  opacity: 0.35;
  pointer-events: none;
  border-radius: 4px;
  background:
    radial-gradient(140px 140px at 20% 20%, rgba(255, 217, 138, 0.22), transparent 60%),
    radial-gradient(90px 90px at 80% 15%, rgba(255, 217, 138, 0.18), transparent 65%),
    radial-gradient(110px 110px at 60% 80%, rgba(255, 217, 138, 0.2), transparent 60%),
    radial-gradient(90px 90px at 90% 90%, rgba(255, 217, 138, 0.16), transparent 65%);
}

/* close button */
.pd-fav-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--pd-text-dim);
  border-radius: 2px;
  background: transparent;
  color: var(--pd-text-dim);
  font-size: 1rem;
  line-height: 1;
  opacity: 0.5;
  cursor: pointer;
  padding: 0;
  transition: opacity 0.2s, color 0.2s, border-color 0.2s;
}

.pd-fav-close:hover {
  opacity: 1;
  color: #ff6b8a;
  border-color: #ff6b8a;
}

.pd-fav-close:focus-visible {
  outline: 2px solid var(--pd-gold);
  outline-offset: 2px;
  opacity: 1;
}

/* card head */
.pd-fav-head {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
  position: relative;
  z-index: 1;
}

.pd-fav-cat {
  font-family: var(--pd-font-deco);
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  color: var(--pd-gold);
  border: 1px solid var(--pd-gold);
  border-radius: 999px;
  padding: 2px 8px;
}

.pd-fav-con {
  font-size: 0.7rem;
  color: var(--pd-gold);
  opacity: 0.6;
}

/* card body */
.pd-fav-body {
  flex: 1;
  position: relative;
  z-index: 1;
}

.pd-fav-title {
  font-family: var(--pd-font-serif);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--pd-text-pri);
  line-height: 1.25;
  margin: 0 0 10px;
}

.pd-fav-excerpt {
  font-family: var(--pd-font-serif);
  font-size: 0.78rem;
  font-style: italic;
  line-height: 1.8;
  color: var(--pd-text-sec);
  margin: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.pd-fav-no-story {
  opacity: 0.5;
  letter-spacing: 0.05em;
}

/* card foot */
.pd-fav-foot {
  padding-top: 12px;
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed var(--pd-gold-line);
  position: relative;
  z-index: 1;
}

.pd-fav-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}

.pd-fav-res {
  color: var(--pd-gold);
  font-size: 0.75rem;
  border: 1px solid var(--pd-gold);
  border-radius: 999px;
  padding: 2px 8px;
}

.pd-fav-date {
  font-family: var(--pd-font-deco);
  font-size: 0.65rem;
  color: var(--pd-text-dim);
  letter-spacing: 0.05em;
}

.pd-fav-cta {
  font-family: var(--pd-font-deco);
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  color: var(--pd-gold);
  opacity: 0.5;
  transition: opacity 0.25s;
}

.pd-fav-card:hover .pd-fav-cta,
.pd-fav-card:focus-visible .pd-fav-cta {
  opacity: 1;
}

/* ===== Task6: Modal Base ===== */
.pd-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(5, 6, 15, 0.72);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pd-modal-fade-in 300ms ease-out both;
}

@keyframes pd-modal-fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

/* ===== Task6: Modal Panel ===== */
.pd-modal-panel {
  width: min(560px, 92vw);
  max-height: 86vh;
  overflow: auto;
  padding: 32px 28px;
  border: 1px solid var(--pd-gold);
  border-radius: 3px;
  background: var(--pd-bg-1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 24px 80px -20px rgba(255, 217, 138, 0.25);
}

.pd-modal-panel.pd-story-panel {
  width: min(680px, 92vw);
}

/* ===== Task6: Modal Head (× close) ===== */
.pd-modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.pd-modal-head h3 {
  font-family: var(--pd-font-deco);
  font-size: 18px;
  line-height: 28px;
  color: var(--pd-gold);
  letter-spacing: 0.15em;
  margin: 0;
  font-weight: 600;
}

.pd-story-head-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.pd-modal-close {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--pd-gold);
  border-radius: 2px;
  background: transparent;
  color: var(--pd-text-dim);
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.55;
  transition: all 220ms ease;
  padding: 0;
}

.pd-modal-close:hover {
  color: #ff6b8a;
  border-color: #ff6b8a;
  opacity: 1;
}

.pd-modal-close:focus-visible {
  outline: 2px solid var(--pd-gold);
  outline-offset: 3px;
  opacity: 1;
}

/* ===== Task6: Modal Body / Foot ===== */
.pd-modal-body {
  padding: 8px 0 12px;
}

.pd-modal-form-row {
  margin-bottom: 16px;
}

.pd-story-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.pd-modal-divider {
  border-top: 1px dashed var(--pd-gold-line);
  border-bottom: 1px dashed var(--pd-gold-line);
  height: 0;
  margin: 20px 0;
  opacity: 0.7;
}

.pd-story-content {
  font-family: var(--pd-font-serif);
  font-style: italic;
  font-size: 1rem;
  line-height: 1.9;
  color: var(--pd-text-pri);
  white-space: pre-wrap;
}

.pd-story-image {
  display: block;
  max-width: 100%;
  border-radius: 3px;
  margin: 0 0 20px;
  border: 1px solid var(--pd-gold-line);
}

.pd-delete-text {
  font-family: var(--pd-font-serif);
  color: var(--pd-text-pri);
  font-size: 0.95rem;
  line-height: 1.8;
  margin: 0;
  text-align: center;
  padding: 10px 0;
}

.pd-modal-foot {
  border-top: 1px dashed var(--pd-gold-line);
  padding-top: 20px;
  margin-top: 24px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

/* ===== Task6: Modal inputs + buttons ===== */
.pd-modal-input {
  width: 100%;
  border: 1px solid var(--pd-gold);
  padding: 10px 14px;
  border-radius: 2px;
  background: transparent;
  color: var(--pd-text-pri);
  font-family: var(--pd-font-serif);
  font-size: 0.92rem;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
  box-sizing: border-box;
}

.pd-modal-input:focus {
  outline: none;
  border-color: var(--pd-gold);
  box-shadow: 0 0 0 2px var(--pd-gold-soft);
}

.pd-modal-input::placeholder {
  color: var(--pd-text-dim);
  opacity: 0.6;
}

.pd-modal-label {
  display: block;
  font-family: var(--pd-font-deco);
  font-size: 0.65em;
  letter-spacing: 0.2em;
  color: var(--pd-gold);
  margin-bottom: 6px;
  opacity: 0.85;
}

.pwd-error {
  color: #ff6b8a;
  font-size: 0.82rem;
  margin: 8px 0 0;
  font-style: italic;
}

/* ===== Task6: Primary/Ghost/Danger buttons (reusable) ===== */
.pd-btn-primary,
.pd-btn-ghost,
.pd-btn-danger {
  border-radius: 2px;
  padding: 9px 20px;
  font-family: var(--pd-font-deco);
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 220ms ease;
  border: 1px solid;
}

.pd-btn-primary {
  background: var(--pd-gold);
  color: #130d00;
  border-color: var(--pd-gold);
  font-weight: 600;
}

.pd-btn-primary:hover:not(:disabled) {
  background: #e8c374;
  border-color: #e8c374;
  box-shadow: 0 8px 24px -8px rgba(255, 217, 138, 0.5);
}

.pd-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pd-btn-ghost {
  background: transparent;
  color: var(--pd-gold);
  border-color: var(--pd-gold);
}

.pd-btn-ghost:hover:not(:disabled) {
  background: var(--pd-gold);
  color: #130d00;
}

.pd-btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pd-btn-danger {
  background: rgba(255, 107, 138, 0.08);
  color: #ff6b8a;
  border-color: rgba(255, 107, 138, 0.5);
}

.pd-btn-danger:hover:not(:disabled) {
  background: #ff6b8a;
  color: #130d00;
  border-color: #ff6b8a;
  box-shadow: 0 8px 24px -8px rgba(255, 107, 138, 0.5);
}

.pd-btn-danger:focus-visible {
  outline: 2px solid #ff6b8a;
  outline-offset: 3px;
}

.pd-btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== Task6: Signature inline editor ===== */
.pd-sign-inline {
  position: fixed;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  padding: 10px 14px;
  border: 1px solid var(--pd-gold);
  border-radius: 2px;
  background: var(--pd-bg-1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  gap: 10px;
  align-items: center;
  box-shadow: 0 12px 40px -12px rgba(255, 217, 138, 0.3);
}

.pd-sign-label {
  font-family: var(--pd-font-deco);
  color: var(--pd-gold);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  white-space: nowrap;
}

.pd-sign-input {
  flex: 1;
  min-width: 220px;
  background: transparent;
  border: 1px solid var(--pd-gold);
  border-radius: 2px;
  padding: 8px 12px;
  color: var(--pd-text-pri);
  font-family: var(--pd-font-serif);
  font-size: 0.9rem;
}

.pd-sign-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--pd-gold-soft);
}

.pd-sign-input::placeholder {
  color: var(--pd-text-dim);
  opacity: 0.6;
}

/* ===== Task6: Story meta pills ===== */
.pd-story-meta-star {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid var(--pd-gold);
  border-radius: 999px;
  background: rgba(255, 217, 138, 0.06);
  color: var(--pd-gold);
  font-size: 0.72rem;
  font-family: var(--pd-font-deco);
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 220ms ease;
}

.pd-story-meta-star:hover {
  background: var(--pd-gold);
  color: #130d00;
}

.pd-story-meta-res {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 107, 138, 0.1);
  color: #ff9eb8;
  border: 1px solid rgba(255, 107, 138, 0.3);
  font-size: 0.75rem;
}

.pd-story-meta-date {
  font-family: var(--pd-font-deco);
  font-size: 0.68em;
  letter-spacing: 0.15em;
  color: var(--pd-text-dim);
}

.pd-story-meta-loc {
  font-size: 0.75rem;
  color: var(--pd-text-sec);
  opacity: 0.75;
}

/* ===== Task6: Flash banner top center ===== */
.pd-flash-banner {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  padding: 14px 28px;
  border: 1px solid var(--pd-gold);
  border-radius: 999px;
  background: var(--pd-bg-1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-family: var(--pd-font-deco);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  color: var(--pd-gold);
  box-shadow: 0 12px 40px -8px rgba(255, 217, 138, 0.35);
}

.pd-flash-banner.success {
  border-color: var(--pd-gold);
  background: linear-gradient(90deg, rgba(255, 217, 138, 0.12) 0%, rgba(255, 217, 138, 0.04) 50%, rgba(255, 217, 138, 0.12) 100%);
}

.pd-flash-banner.error {
  border-color: #ff6b8a;
  color: #ff9eb8;
  background: linear-gradient(90deg, rgba(255, 107, 138, 0.12) 0%, rgba(255, 107, 138, 0.04) 50%, rgba(255, 107, 138, 0.12) 100%);
  box-shadow: 0 12px 40px -8px rgba(255, 107, 138, 0.3);
}

.pd-flash-banner.info {
  border-color: #c49eff;
  color: #d9bfff;
  background: linear-gradient(90deg, rgba(196, 158, 255, 0.12) 0%, rgba(128, 191, 255, 0.04) 50%, rgba(196, 158, 255, 0.12) 100%);
  box-shadow: 0 12px 40px -8px rgba(196, 158, 255, 0.3);
}

/* ===== Task6: pd-flash transition ===== */
.pd-flash-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.pd-flash-enter-active {
  transition: opacity 240ms ease-out, transform 240ms ease-out;
}

.pd-flash-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

.pd-flash-leave-active {
  transition: opacity 240ms ease-in, transform 240ms ease-in;
}
</style>
