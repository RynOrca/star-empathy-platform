<template>
  <div class="profile-page">
    <!-- 保留 canvas 不删除 -->
    <canvas ref="canvasRef" class="sky-bg pd-sky-canvas"></canvas>
    <div v-if="!loaded" class="loading">...</div>
    <template v-else>
      <!-- 1. Topbar 固定导航 -->
      <header class="pd-topbar">
        <button class="pd-back-btn" @click="goBack">← BACK TO SKY</button>
        <div class="pd-brand">STARRY · DOME</div>
        <div class="pd-actions">
          <button class="pd-back-btn" @click="startEditSig">✎ 编辑签名</button>
          <button class="pd-back-btn" @click="clearAndClosePwdModal(); showPwdModal = true">⚙ 修改密码</button>
        </div>
      </header>

      <!-- 2. Hero 区 100vh -->
      <section class="pd-hero">
        <div class="pd-moon">
          <div class="pd-moon-disk">
            <div class="moon-mare moon-mare-a"></div>
            <div class="moon-mare moon-mare-b"></div>
            <div class="moon-mare moon-mare-c"></div>
          </div>
        </div>
        <div class="pd-hero-text">
          <p class="pd-hero-role">✦ WEAVER OF NIGHT STORIES ✦</p>
          <h1 class="pd-hero-name">{{ user?.username }}</h1>
          <div class="pd-hero-band">{{ sigText || 'Starry Dome · 星穹纺织者 · 夜语记录人' }}</div>
          <div class="pd-hero-joined">
            <span class="pd-gold-sep">◆</span>
            <span>星穹纺织者</span>
            <span class="pd-gold-sep">◆</span>
            <span>加入星空 {{ daysAgo }} 天</span>
            <span class="pd-gold-sep">◆</span>
          </div>
        </div>
        <div class="pd-scroll-hint">
          <span>Scroll · 向下滚动开启回忆</span>
          <span class="pd-scroll-line"></span>
        </div>
      </section>

      <!-- 3. Timeline Section -->
      <section class="pd-timeline-section" id="pd-timeline">
        <div class="pd-section-head">
          <h2>我的回忆 · TIMELINE</h2>
          <p>—— 挂在星上的，慢慢读 ——</p>
        </div>

        <div class="pd-stats-pills">
          <span class="pd-stats-pill">✦ {{ stats.storyCount }} 故事</span>
          <span class="pd-stats-pill">❁ {{ stats.totalResonance }} 收到共鸣</span>
          <span class="pd-stats-pill">☾ {{ stats.resonanceGivenCount }} 发出共鸣</span>
          <span class="pd-stats-pill">♡ {{ stats.favoriteCount }} 收藏</span>
        </div>

        <nav class="pd-timeline" aria-label="个人故事时间轴" v-if="stories.length > 0">
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
              <div class="pd-t-node" aria-hidden="true"><div class="pd-t-star"></div></div>
              <div class="pd-t-date" :class="i % 2 === 0 ? 'left' : 'right'">{{ formatMD(s.createdAt) }}</div>
              <button class="pd-t-card" type="button" @click="openStory(s)">
                <div class="pd-t-head">
                  <h3 class="pd-t-title">{{ s.title || '未命名故事' }}</h3>
                  <span v-if="getStoryPrimaryStar(s)" class="pd-t-star-tag" @click.stop="goToStar(getStoryPrimaryStar(s)!.id)">
                    {{ getStoryPrimaryStar(s)!.name }}<em v-if="getStoryPrimaryStar(s)!.con"> · {{ getStoryPrimaryStar(s)!.con }}</em><strong v-if="getStoryPrimaryStar(s)!.extraCount > 0"> +{{ getStoryPrimaryStar(s)!.extraCount }}</strong>
                  </span>
                </div>
                <p class="pd-t-body">{{ s.content }}</p>
                <div class="pd-t-foot">
                  <span v-if="s.tag" class="pd-t-tag" :class="'tag-' + s.tag">{{ s.tag }}</span>
                  <span class="pd-t-res">{{ s.resonanceCount || 0 }} 共鸣</span>
                </div>
              </button>
            </article>
          </div>
        </nav>
        <div v-else class="pd-empty">
          <div class="pd-empty-orb" aria-hidden="true">✧</div>
          <h4 class="pd-empty-title">还没有故事，</h4>
          <p class="pd-empty-sub">去星空投递一颗属于你的星 →</p>
          <button class="pd-back-btn" @click="router.push('/sky')">前往星空</button>
        </div>

        <div v-if="loadingMore" class="pd-bottom-hint">加载中...</div>
        <div v-else-if="!hasMore && stories.length>0 && visibleCount>=stories.length" class="pd-bottom-hint">✦ ✦ ✦ 已经到底了</div>

        <div class="pd-expand-wrap">
          <button v-if="visibleCount < stories.length" class="pd-btn-expand" @click="expandStories">展开更多故事</button>
          <button v-else-if="hasMore" class="pd-btn-expand" @click="loadAndExpandNext5">加载并展开下一组</button>
        </div>
      </section>

      <section id="pd-constellation" class="pd-constellation-section" aria-label="我的私人星座">
        <div class="pd-const-wrap">
          <p class="pd-const-title">· MY · PERSONAL · CONSTELLATION ·</p>
          <h3 class="pd-const-name">纺织者之线 Weaver's Thread</h3>
          <p class="pd-const-sub">— 由 {{ Math.min(stories.length, 12) }} 则心事编织的私人星座，独属于你 —</p>
          <template v-if="stories.length === 0">
            <div class="pd-empty">
              <div class="pd-empty-orb" aria-hidden="true">✧</div>
              <h4 class="pd-empty-title">还没有编织出星座，</h4>
              <p class="pd-empty-sub">先去时间轴投递一些故事，再来看看它们的连接。</p>
            </div>
          </template>
          <template v-else>
            <svg class="pd-constellation-svg" viewBox="0 0 500 360" preserveAspectRatio="xMidYMid meet" role="img" :aria-label="`私人星座图，包含 ${Math.min(stories.length, 12)} 颗恒星，${constellationLines().length} 条内核连线`">
              <defs>
                <radialGradient id="pd-const-bg" cx="50%" cy="50%">
                  <stop offset="0%" stop-color="rgba(255,217,138,0.05)"/>
                  <stop offset="100%" stop-color="transparent"/>
                </radialGradient>
              </defs>
              <rect width="500" height="360" fill="url(#pd-const-bg)"/>
              <!-- 椭圆轨道 guides -->
              <ellipse class="pd-const-guide" cx="250" cy="180" rx="180" ry="130" />
              <ellipse class="pd-const-guide" cx="250" cy="180" rx="220" ry="160" />
              <ellipse class="pd-const-guide" cx="250" cy="180" rx="140" ry="100" />
              <!-- 内核连线 -->
              <g class="pd-const-lines">
                <line
                  v-for="(l, i) in constellationLines()"
                  :key="'cl-' + i"
                  class="pd-const-line"
                  :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
                />
              </g>
              <!-- 装饰小星 -->
              <circle cx="60" cy="200" r="1" fill="rgba(255,255,255,0.5)"/>
              <circle cx="460" cy="50" r="0.8" fill="rgba(255,255,255,0.5)"/>
              <circle cx="80" cy="330" r="1.2" fill="rgba(255,217,138,0.4)"/>
              <circle cx="450" cy="230" r="0.8" fill="rgba(255,255,255,0.4)"/>
              <!-- 故事节点（圆点） -->
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
                  <circle class="pd-const-node-shape" :cx="n.x" :cy="n.y" :r="i === 1 || i === 3 ? 6 : 5" :style="{ animationDelay: (i * 0.4) + 's' }" />
                  <text class="pd-const-node-idx" :x="n.x" :y="n.y - 14">{{ String(n.index + 1).padStart(2, '0') }}</text>
                </g>
              </g>
            </svg>
            <!-- Legend（产品增强：保留作为辅助导航） -->
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

      <section id="pd-favorites" class="pd-favorites-section" aria-label="我的收藏星空">
        <h3 class="pd-favorites-title">FAVORITES · GALLERY · 私人星展</h3>
        <template v-if="favorites.length === 0">
          <div class="pd-empty">
            <div class="pd-empty-orb" aria-hidden="true">♡</div>
            <h4 class="pd-empty-title">还没有收藏的恒星，</h4>
            <p class="pd-empty-sub">在时间轴上点 ❤ 收藏一颗星，它会出现在这里。</p>
          </div>
        </template>
        <template v-else>
          <div class="pd-gallery" role="list">
            <article
              v-for="(f, i) in favorites"
              :key="f.id"
              class="pd-gal-card"
              :class="'gal-' + ((i % 4) + 1)"
              role="listitem"
              tabindex="0"
              :aria-label="`恒星收藏卡：${f.title || '未命名收藏'}，恒星 ${f.starName || ''}，共鸣 ${f.resonanceCount || 0}，按 Enter 详情，按 Delete 取消收藏`"
              @click="goToStarWithCheck(f.starCatalogId, f.id)"
              @keyup.enter="goToStarWithCheck(f.starCatalogId, f.id)"
              @keyup.delete.prevent="unfavorite(f.id)"
            >
              <button
                type="button"
                class="pd-gal-close"
                aria-label="取消收藏"
                @click.stop="unfavorite(f.id)"
                @keyup.enter.stop.prevent="unfavorite(f.id)"
              >×</button>
              <div class="pd-gal-img" aria-hidden="true">{{ galaxyIcon(f.starName) }}</div>
              <div class="pd-gal-name">{{ f.title || f.starName || '无名星' }}</div>
              <div class="pd-gal-sub">
                {{ f.starConstellation || '未知星座' }} · {{ f.starName || '' }}<br>
                <template v-if="f.content">{{ f.content.slice(0, 22) }}{{ f.content.length > 22 ? '…' : '' }}</template>
                <template v-else>♡ {{ f.resonanceCount || 0 }} 共鸣 · {{ formatMD(f.createdAt || '') }}</template>
              </div>
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
        <button type="button" class="pd-btn-primary" @click="saveSig">保存</button>
        <button type="button" class="pd-back-btn" @click="editingSig = false">取消</button>
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
            <button type="button" class="pd-back-btn" @click="clearAndClosePwdModal">取消</button>
            <button type="button" class="pd-btn-primary" @click="updatePassword" :disabled="pwdLoading">
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
              <span v-if="activeStory.tag" class="pd-t-tag" :class="'tag-' + activeStory.tag">{{ activeStory.tag }}</span>
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
            <button type="button" class="pd-back-btn" @click="resonateStory">共鸣 +1</button>
            <button type="button" class="pd-btn-danger" @click="activeStoryId = activeStory?.id ?? null; showDeleteConfirm = true">删除此故事</button>
          </footer>
        </div>
      </div>

      <!-- 删除确认弹窗 -->
      <div v-if="showDeleteConfirm" class="pd-modal-mask" @click.self="showDeleteConfirm = false">
        <div class="pd-modal-panel" style="width: 400px;">
          <header class="pd-modal-head">
            <h3>· 摘取故事 · REMOVE ·</h3>
            <button type="button" class="pd-modal-close" aria-label="关闭" @click="showDeleteConfirm = false">×</button>
          </header>
          <main class="pd-modal-body">
            <p class="pd-delete-text">要把「{{ activeStory?.title || '这则故事' }}」送回星穹吗？此操作不可撤销。</p>
          </main>
          <footer class="pd-modal-foot">
            <button type="button" class="pd-back-btn" @click="showDeleteConfirm = false" :disabled="deletingStory">取消</button>
            <button type="button" class="pd-btn-danger" @click="confirmDelete" :disabled="deletingStory">
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
const activeStory = ref<any>(null)

const editingSig = ref(false)
const sigDraft = ref('')
const sigInputRef = ref<HTMLInputElement | null>(null)

// ─── 修改密码 ───
const showPwdModal = ref(false)
const pwdLoading = ref(false)
const pwdError = ref('')
const oldPwd = ref('')
const newPwd = ref('')
const confirmPwd = ref('')

async function updatePassword() {
  pwdError.value = ''
  if (!oldPwd.value || !newPwd.value || !confirmPwd.value) {
    pwdError.value = '请填写所有字段'
    return
  }
  if (newPwd.value !== confirmPwd.value) {
    pwdError.value = '两次输入的新密码不一致'
    return
  }
  if (newPwd.value.length < 6) { pwdError.value = '新密码至少 6 个字符'; return }
  if (newPwd.value.length > 50) { pwdError.value = '新密码不能超过 50 个字符'; return }
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
  oldPwd.value = ''
  newPwd.value = ''
  confirmPwd.value = ''
  pwdError.value = ''
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
  const id = activeStory.value?.id
  if (id == null) return
  try {
    const res = await fetch(`/api/stars/${id}/resonate`, { method: 'POST' })
    if (res.ok) {
      activeStory.value = { ...activeStory.value!, resonanceCount: (activeStory.value!.resonanceCount || 0) + 1 }
      const idx = stories.value.findIndex(s => s.id === id)
      if (idx >= 0) stories.value[idx].resonanceCount = (stories.value[idx].resonanceCount || 0) + 1
      showFlash('✦ 共鸣已传向那颗星 ✦', 'success')
    }
  } catch { showFlash('共鸣失败', 'error') }
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

// ─── Favorites gal-img icon helper ───
const galaxyIcons = ['♁','☾','✧','❋','✦','★','☆','◈','◊','☉']
function galaxyIcon(name?: string) {
  if (!name) return '✧'
  // 按名字 hash 一个稳定的图标
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return galaxyIcons[h % galaxyIcons.length]
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
  const v = sigDraft.value.trim()
  if (!v || v === user.value?.signature) return
  const token = getToken()
  if (!token) return
  try {
    const r = await fetch('/api/auth/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ signature: v }),
    })
    const j = await r.json()
    if (r.ok && user.value) {
      user.value.signature = j.data.signature
      showFlash('✦ 签名已更新 · 织进了月面 ✦', 'success')
      editingSig.value = false
      sigDraft.value = sigText.value
    } else {
      showFlash('签名更新失败', 'error')
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
      showFlash(json.message || '删除失败', 'error')
    }
  } catch {
    showFlash('网络错误，请重试', 'error')
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
/* ════════════════════════════════════════════════════════════════
   Style D · 叙事沉浸式 — 严格对齐 designs/prototypes/style-d.html
   保留 canvas 背景（用户要求不删除）
   ════════════════════════════════════════════════════════════════ */

.profile-page {
  /* 与 style-d.html 完全一致的设计 token */
  --pd-gold: #ffd98a;
  --pd-gold-soft: rgba(255, 217, 138, 0.45);
  --pd-gold-line: rgba(255, 217, 138, 0.18);
  --pd-text-pri: #e8e4ff;
  --pd-text-sec: #a9a3c7;
  --pd-text-dim: rgba(255, 217, 138, 0.5);
  --pd-border: rgba(255, 217, 138, 0.18);
  --pd-border-hot: rgba(255, 217, 138, 0.5);
  --pd-bg-card: rgba(16, 18, 40, 0.6);
  --pd-bg-card-hot: rgba(26, 28, 54, 0.8);
  --pd-bg-0: #05060f;
  --pd-font-deco: "Cinzel", "Noto Serif SC", "Songti SC", "Microsoft YaHei", serif;
  --pd-font-serif: "Noto Serif SC", "Songti SC", "Cinzel", "Microsoft YaHei", serif;
}

.profile-page {
  width: 100%;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  font-family: var(--pd-font-serif);
  font-weight: 300;
  color: var(--pd-text-pri);
  background: var(--pd-bg-0);
}

/* 保留 canvas 背景 */
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

/* 顶层视差星层（CSS 层叠，叠加在 canvas 之上但不抢戏） */
.profile-page::before,
.profile-page::after {
  content: "";
  position: fixed;
  top: -20%;
  left: -20%;
  right: -20%;
  bottom: -20%;
  width: 140%;
  height: 140%;
  z-index: 0;
  pointer-events: none;
  opacity: 0.5;
}

.profile-page::before {
  background-image:
    radial-gradient(0.6px 0.6px at 12% 18%, rgba(255,255,255,0.7), transparent 60%),
    radial-gradient(0.6px 0.6px at 35% 55%, rgba(255,255,255,0.55), transparent 60%),
    radial-gradient(0.6px 0.6px at 65% 28%, rgba(255,255,255,0.6), transparent 60%),
    radial-gradient(0.6px 0.6px at 82% 70%, rgba(255,255,255,0.5), transparent 60%),
    radial-gradient(0.6px 0.6px at 22% 85%, rgba(255,255,255,0.5), transparent 60%),
    radial-gradient(0.6px 0.6px at 48% 10%, rgba(255,255,255,0.45), transparent 60%),
    radial-gradient(0.6px 0.6px at 92% 42%, rgba(255,255,255,0.45), transparent 60%),
    radial-gradient(0.6px 0.6px at 8% 42%, rgba(255,255,255,0.4), transparent 60%);
  animation: pd-parallax-slow 120s linear infinite;
}

.profile-page::after {
  background-image:
    radial-gradient(1px 1px at 18% 30%, rgba(255,217,138,0.55), transparent 60%),
    radial-gradient(1px 1px at 72% 50%, rgba(255,255,255,0.55), transparent 60%),
    radial-gradient(1px 1px at 40% 75%, rgba(202,167,255,0.5), transparent 60%),
    radial-gradient(1px 1px at 88% 18%, rgba(255,255,255,0.45), transparent 60%),
    radial-gradient(1px 1px at 10% 68%, rgba(255,255,255,0.4), transparent 60%);
  animation: pd-parallax-medium 80s linear infinite;
}

@keyframes pd-parallax-slow { from{transform:translateY(0);} to{transform:translateY(-300px);} }
@keyframes pd-parallax-medium { from{transform:translateY(0);} to{transform:translateY(-500px);} }

@keyframes pd-node-glow {
  0%,100% { transform: scale(0.9); opacity:0.7; }
  50% { transform: scale(1.2); opacity:1; }
}

@keyframes pd-edge-glow {
  0%,100% { stroke: rgba(255,217,138,0.25); }
  50% { stroke: rgba(255,217,138,0.55); }
}

@keyframes pd-scroll-line {
  0%,100% { opacity:0.3; transform: scaleY(0.6); transform-origin: top; }
  50% { opacity:1; transform: scaleY(1); }
}

@keyframes pd-fade-up {
  0% { transform: translateY(24px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes pd-moon-glow {
  0%, 100% {
    box-shadow:
      inset -30px -20px 80px rgba(0,0,0,0.35),
      0 0 120px rgba(255,240,200,0.35),
      0 0 240px rgba(255,220,160,0.2);
  }
  50% {
    box-shadow:
      inset -30px -20px 80px rgba(0,0,0,0.35),
      0 0 160px rgba(255,240,200,0.45),
      0 0 300px rgba(255,220,160,0.28);
  }
}

@keyframes pd-story-flash-kf {
  0% { outline: 2px solid transparent; box-shadow: none; }
  15% { outline: 2px solid var(--pd-gold); box-shadow: 0 0 20px -4px var(--pd-gold-soft), 0 0 40px -8px var(--pd-gold-soft); }
  100% { outline: 2px solid transparent; box-shadow: none; }
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

/* ═══ (a) Topbar ═══ */
.pd-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 48px;
  background: linear-gradient(180deg, rgba(5,6,15,0.7) 0%, transparent 100%);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.pd-back-btn {
  font-family: var(--pd-font-serif);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,217,138,0.2);
  color: #b9b4d6;
  padding: 10px 20px;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.3s;
}

.pd-back-btn:hover {
  border-color: rgba(255,217,138,0.5);
  color: var(--pd-gold);
  background: rgba(255,217,138,0.05);
}

.pd-brand {
  font-family: var(--pd-font-deco);
  font-size: 0.85rem;
  letter-spacing: 0.3em;
  color: rgba(255,217,138,0.6);
}

.pd-actions {
  display: flex;
  gap: 10px;
}

/* ═══ (b) Hero 100vh ═══ */
.pd-hero {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  overflow: hidden;
}

.pd-moon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 480px;
  height: 480px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 35%,
    rgba(255,255,255,0.95) 0%,
    rgba(230,224,210,0.85) 20%,
    rgba(200,195,180,0.7) 40%,
    rgba(160,155,145,0.55) 65%,
    rgba(120,115,110,0.35) 85%,
    transparent 100%);
  box-shadow:
    inset -30px -20px 80px rgba(0,0,0,0.35),
    0 0 120px rgba(255,240,200,0.35),
    0 0 240px rgba(255,220,160,0.2);
  opacity: 0.95;
  animation: pd-moon-glow 6s ease-in-out infinite;
}

/* 月坑（用 ::before/::after + 一个 div 模拟 style-d.html 的双月坑） */
.pd-moon-disk { display: none; }
.pd-moon::before, .pd-moon::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  background: rgba(150,140,130,0.25);
}
.pd-moon::before { width: 70px; height: 60px; top: 25%; left: 30%; filter: blur(6px); }
.pd-moon::after { width: 50px; height: 45px; top: 55%; left: 55%; filter: blur(5px); }

/* 保留 moon-mare 类（虽然 disk 隐藏了，避免引用未定义类警告） */
.moon-mare { display: none; }
.moon-mare-a, .moon-mare-b, .moon-mare-c { display: none; }

.pd-hero-text {
  position: relative;
  z-index: 3;
  text-align: center;
  padding: 0 24px;
  max-width: 900px;
}

.pd-hero-role {
  font-family: var(--pd-font-deco);
  font-size: 0.75rem;
  letter-spacing: 0.5em;
  color: rgba(255,217,138,0.7);
  margin-bottom: 20px;
}

.pd-hero-name {
  font-family: var(--pd-font-deco);
  font-size: 4.2rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: #fff;
  text-shadow: 0 0 40px rgba(5,6,15,0.9), 0 0 80px rgba(0,0,0,0.7);
  margin: 0 0 20px 0;
}

.pd-hero-band {
  display: inline-block;
  padding: 12px 36px;
  border-top: 1px solid rgba(255,217,138,0.5);
  border-bottom: 1px solid rgba(255,217,138,0.5);
  font-style: italic;
  font-size: 0.92rem;
  color: rgba(255,244,220,0.85);
  letter-spacing: 0.15em;
  text-shadow: 0 0 20px rgba(0,0,0,0.8);
}

.pd-hero-joined {
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255,217,138,0.6);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
}

.pd-gold-sep {
  color: var(--pd-gold);
  opacity: 0.75;
}

.pd-scroll-hint {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  letter-spacing: 0.3em;
  color: rgba(255,217,138,0.5);
  text-transform: uppercase;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.pd-scroll-line {
  display: block;
  width: 1px;
  height: 40px;
  background: linear-gradient(180deg, rgba(255,217,138,0.5) 0%, transparent 100%);
  animation: pd-scroll-line 2.4s ease-in-out infinite;
}

/* ═══ (c) Timeline Section ═══ */
.pd-timeline-section {
  position: relative;
  z-index: 2;
  max-width: 1120px;
  margin: 0 auto;
  padding: 80px 48px 120px;
}

.pd-section-head {
  text-align: center;
  margin-bottom: 100px;
  position: relative;
}

.pd-section-head h2 {
  font-family: var(--pd-font-deco);
  font-size: 1.8rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  color: var(--pd-gold);
  margin: 0 0 14px 0;
}

.pd-section-head h2::before, .pd-section-head h2::after {
  content: "—— ";
  color: rgba(255,217,138,0.3);
  font-weight: 300;
}
.pd-section-head h2::after { content: " ——"; }

.pd-section-head p {
  font-style: italic;
  color: rgba(255,217,138,0.5);
  letter-spacing: 0.1em;
  font-size: 0.85rem;
  margin: 0;
}

/* Stats 胶囊（产品增强，保留） */
.pd-stats-pills {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 16px;
  margin-bottom: 72px;
}

.pd-stats-pill {
  border: 1px solid rgba(255,217,138,0.3);
  border-radius: 999px;
  padding: 6px 16px;
  color: var(--pd-gold);
  font-size: 0.76rem;
  opacity: 0.85;
  letter-spacing: 0.05em;
  background: rgba(255,217,138,0.04);
}

/* Timeline */
.pd-timeline {
  position: relative;
}

.pd-timeline::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(255,217,138,0.15) 8%,
    rgba(255,217,138,0.55) 50%,
    rgba(255,217,138,0.15) 92%,
    transparent 100%);
  transform: translateX(-0.5px);
}

.pd-t-items {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pd-t-item {
  position: relative;
  margin-bottom: 90px;
  display: flex;
  align-items: flex-start;
  animation: pd-fade-up 0.6s ease-out both;
}

.pd-t-item:last-child { margin-bottom: 0; }

.pd-t-item.left { justify-content: flex-start; }
.pd-t-item.right { justify-content: flex-end; }

/* Timeline node */
.pd-t-node {
  position: absolute;
  top: 26px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
}

.pd-t-star {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.pd-t-star::before {
  content: "";
  position: absolute;
  inset: -12px;
  background: radial-gradient(circle, rgba(255,217,138,0.4), transparent 70%);
  animation: pd-node-glow 3.5s ease-in-out infinite;
}

.pd-t-star::after {
  content: "✦";
  color: var(--pd-gold);
  font-size: 1.4rem;
  text-shadow: 0 0 20px rgba(255,217,138,0.8), 0 0 40px rgba(255,217,138,0.5);
  position: relative;
  z-index: 2;
}

/* Timeline date */
.pd-t-date {
  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--pd-font-deco);
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  color: rgba(255,217,138,0.7);
  white-space: nowrap;
  z-index: 3;
}

.pd-t-date.left, .pd-t-date.right {
  /* 与 style-d 一致：都在中线 */
  left: 50%;
  transform: translateX(-50%);
}

/* Timeline card */
.pd-t-card {
  width: 44%;
  position: relative;
  padding: 32px 32px 28px;
  background: var(--pd-bg-card);
  border: 1px solid var(--pd-border);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all 0.5s cubic-bezier(.2,.9,.3,1);
  font-family: inherit;
  text-align: left;
  color: inherit;
  display: block;
}

.pd-t-item.left .pd-t-card {
  margin-right: auto;
  border-radius: 2px 18px 18px 18px;
}

.pd-t-item.right .pd-t-card {
  margin-left: auto;
  border-radius: 18px 2px 18px 18px;
}

.pd-t-card:hover {
  border-color: rgba(255,217,138,0.5);
  background: var(--pd-bg-card-hot);
  transform: translateY(-6px);
  box-shadow:
    0 20px 60px rgba(0,0,0,0.4),
    0 0 40px rgba(255,217,138,0.1);
}

/* Card head */
.pd-t-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.pd-t-title {
  font-family: var(--pd-font-serif);
  font-size: 1.12rem;
  font-weight: 500;
  color: #f6f1ff;
  line-height: 1.6;
  margin: 0;
  transition: color 0.3s;
}

.pd-t-card:hover .pd-t-title { color: var(--pd-gold); }

.pd-t-star-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: var(--pd-gold);
  padding: 4px 10px;
  border: 1px solid rgba(255,217,138,0.25);
  background: rgba(255,217,138,0.04);
  white-space: nowrap;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.3s;
}

.pd-t-star-tag:hover {
  background: rgba(255,217,138,0.1);
  border-color: rgba(255,217,138,0.5);
}

.pd-t-star-tag em {
  font-style: normal;
  font-size: 0.85em;
  opacity: 0.8;
}

.pd-t-star-tag strong {
  font-weight: 600;
  font-size: 0.9em;
}

/* Card body */
.pd-t-body {
  font-size: 0.85rem;
  line-height: 1.9;
  color: var(--pd-text-sec);
  font-style: italic;
  margin: 0 0 18px 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}

/* Card foot */
.pd-t-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid rgba(255,217,138,0.1);
  font-size: 0.72rem;
  color: rgba(255,217,138,0.6);
}

.pd-t-tag {
  padding: 3px 10px;
  border-radius: 2px;
  border: 1px solid;
  font-size: 0.7rem;
}

/* Tag 配色 — 严格对齐 style-d.html */
.tag-思念, .tag-miss { color: #ff9eb8; border-color: rgba(255,158,184,0.3); background: rgba(255,158,184,0.05); }
.tag-愿望, .tag-wish { color: var(--pd-gold); border-color: rgba(255,217,138,0.3); background: rgba(255,217,138,0.05); }
.tag-孤独, .tag-lonely { color: #95f0c0; border-color: rgba(149,240,192,0.3); background: rgba(149,240,192,0.05); }
.tag-离别, .tag-leave { color: #caa7ff; border-color: rgba(202,167,255,0.3); background: rgba(202,167,255,0.05); }
.tag-等待 { color: #86a8ff; border-color: rgba(134,168,255,0.3); background: rgba(134,168,255,0.05); }

.pd-t-res::before { content: "♡ "; }

/* Empty state */
.pd-empty {
  text-align: center;
  padding: 80px 40px;
  max-width: 480px;
  margin: 0 auto;
}

.pd-empty-orb {
  font-size: 3rem;
  color: var(--pd-gold);
  text-shadow: 0 0 24px rgba(255,217,138,0.6);
  margin-bottom: 24px;
  animation: pd-node-glow 3.5s ease-in-out infinite;
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

/* Bottom hint + Expand button */
.pd-bottom-hint {
  text-align: center;
  color: rgba(255,217,138,0.5);
  letter-spacing: 0.2em;
  font-size: 0.72rem;
  padding: 24px 0;
}

.pd-expand-wrap {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.pd-btn-expand {
  padding: 12px 28px;
  border: 1px solid rgba(255,217,138,0.3);
  border-radius: 2px;
  background: rgba(255,255,255,0.04);
  color: var(--pd-gold);
  font-family: var(--pd-font-serif);
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.3s;
}

.pd-btn-expand:hover {
  border-color: rgba(255,217,138,0.5);
  color: var(--pd-gold);
  background: rgba(255,217,138,0.08);
}

/* ═══ (d) Constellation Section ═══ */
.pd-constellation-section {
  position: relative;
  z-index: 2;
  padding: 120px 48px;
  text-align: center;
}

.pd-const-wrap {
  max-width: 700px;
  margin: 0 auto;
  position: relative;
}

.pd-const-title {
  font-family: var(--pd-font-deco);
  font-size: 1rem;
  letter-spacing: 0.35em;
  color: rgba(255,217,138,0.7);
  margin: 0 0 18px 0;
}

.pd-const-name {
  font-family: var(--pd-font-serif);
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--pd-gold);
  font-style: italic;
  margin: 0 0 14px 0;
}

.pd-const-name::before, .pd-const-name::after {
  content: "「 ";
  color: rgba(255,217,138,0.4);
  font-style: normal;
  font-weight: 300;
}
.pd-const-name::after { content: " 」"; }

.pd-const-sub {
  font-size: 0.78rem;
  color: rgba(202,167,255,0.6);
  letter-spacing: 0.15em;
  font-style: italic;
  margin: 0 0 50px 0;
}

.pd-constellation-svg {
  width: 100%;
  max-width: 560px;
  height: auto;
  margin: 0 auto;
  display: block;
}

.pd-const-guide {
  fill: none;
  stroke: rgba(255,217,138,0.07);
  stroke-dasharray: 3 6;
}

.pd-const-line {
  stroke: rgba(255,217,138,0.45);
  stroke-width: 1;
  fill: none;
  stroke-dasharray: 4 6;
  animation: pd-edge-glow 5s ease-in-out infinite;
}

.pd-const-node {
  cursor: pointer;
}

.pd-const-node-shape {
  fill: var(--pd-gold);
  filter: drop-shadow(0 0 8px rgba(255,217,138,0.85));
  animation: pd-node-glow 3s ease-in-out infinite;
  transition: r 0.3s;
}

.pd-const-node:hover .pd-const-node-shape {
  fill: #fff;
  filter: drop-shadow(0 0 14px rgba(255,255,255,0.95));
}

.pd-const-node:focus-visible {
  outline: none;
}

.pd-const-node:focus-visible .pd-const-node-shape {
  fill: #fff;
  filter: drop-shadow(0 0 14px rgba(255,255,255,0.95));
}

.pd-const-node-idx {
  font-family: var(--pd-font-deco);
  font-size: 0.55rem;
  fill: rgba(255,217,138,0.7);
  letter-spacing: 0.1em;
  text-anchor: middle;
  pointer-events: none;
}

/* Legend（产品增强：辅助导航，单列居中） */
.pd-const-legend {
  max-width: 560px;
  margin: 50px auto 0;
  padding: 24px 28px;
  border: 1px dashed var(--pd-gold-line);
  background: rgba(16,18,40,0.4);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  text-align: left;
}

.pd-const-legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--pd-gold-line);
}

.pd-const-legend-item:last-child { border-bottom: none; }

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
  transition: color 0.3s, text-shadow 0.3s;
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

.pd-story-flash {
  animation: pd-story-flash-kf 1.4s ease-out forwards;
}

/* ═══ (e) Favorites Section ═══ */
.pd-favorites-section {
  position: relative;
  z-index: 2;
  padding: 80px 48px 180px;
  text-align: center;
}

.pd-favorites-title {
  font-family: var(--pd-font-deco);
  font-size: 1.1rem;
  font-weight: 500;
  letter-spacing: 0.4em;
  color: var(--pd-gold);
  margin: 0 0 60px 0;
}

.pd-favorites-title::before { content: "✦ "; color: #95f0c0; }
.pd-favorites-title::after { content: " ✦"; color: #caa7ff; }

.pd-gallery {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  max-width: 720px;
  margin: 0 auto;
  perspective: 1200px;
}

.pd-gal-card {
  width: 170px;
  height: 240px;
  padding: 20px 18px;
  background: rgba(16,18,40,0.7);
  border: 1px solid rgba(255,217,138,0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.5s cubic-bezier(.2,.9,.3,1);
  position: relative;
  box-shadow: 0 10px 40px rgba(0,0,0,0.4);
  outline: none;
}

.pd-gal-card.gal-1 { transform: rotate(-6deg) translateY(16px); z-index: 1; }
.pd-gal-card.gal-2 { transform: rotate(3deg) translateY(-8px); z-index: 3; }
.pd-gal-card.gal-3 { transform: rotate(-2deg) translateY(10px); z-index: 2; }
.pd-gal-card.gal-4 { transform: rotate(5deg) translateY(4px); z-index: 1; }

.pd-gal-card:hover,
.pd-gal-card:focus-visible {
  transform: translateY(-24px) rotate(0deg) scale(1.08) !important;
  z-index: 10 !important;
  border-color: rgba(255,217,138,0.5);
  box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(255,217,138,0.15);
}

/* gal-img 区 */
.pd-gal-img {
  height: 120px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: var(--pd-gold);
  background: radial-gradient(circle, rgba(255,217,138,0.12), transparent 70%);
  text-shadow: 0 0 24px rgba(255,217,138,0.6);
}

.pd-gal-name {
  font-family: var(--pd-font-serif);
  font-size: 0.95rem;
  color: #f6f1ff;
  margin-bottom: 6px;
  transition: color 0.3s;
}

.pd-gal-card:hover .pd-gal-name,
.pd-gal-card:focus-visible .pd-gal-name { color: var(--pd-gold); }

.pd-gal-sub {
  font-size: 0.7rem;
  color: rgba(202,167,255,0.6);
  letter-spacing: 0.08em;
  line-height: 1.6;
}

/* gal-close button */
.pd-gal-close {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,217,138,0.3);
  border-radius: 2px;
  background: rgba(5,6,15,0.6);
  color: rgba(255,217,138,0.7);
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  opacity: 0;
  transition: all 0.3s;
}

.pd-gal-card:hover .pd-gal-close,
.pd-gal-card:focus-visible .pd-gal-close,
.pd-gal-close:focus-visible {
  opacity: 1;
}

.pd-gal-close:hover {
  color: #ff6b8a;
  border-color: #ff6b8a;
  background: rgba(255,107,138,0.1);
}

/* ═══ (f) Modal Base ═══ */
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

.pd-modal-panel {
  width: min(560px, 92vw);
  max-height: 86vh;
  overflow: auto;
  padding: 32px 28px;
  border: 1px solid var(--pd-gold);
  border-radius: 2px;
  background: rgba(16,18,40,0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 24px 80px -20px rgba(255, 217, 138, 0.25);
}

.pd-modal-panel.pd-story-panel {
  width: min(680px, 92vw);
}

.pd-modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.pd-modal-head h3 {
  font-family: var(--pd-font-deco);
  font-size: 1.05rem;
  line-height: 1.4;
  color: var(--pd-gold);
  letter-spacing: 0.15em;
  margin: 0;
  font-weight: 500;
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
  border: 1px solid rgba(255,217,138,0.3);
  border-radius: 2px;
  background: transparent;
  color: rgba(255,217,138,0.7);
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.7;
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
  border-radius: 2px;
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

.pd-modal-input {
  width: 100%;
  border: 1px solid rgba(255,217,138,0.3);
  padding: 10px 14px;
  border-radius: 2px;
  background: rgba(255,255,255,0.04);
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
  color: rgba(255,217,138,0.4);
  opacity: 0.6;
}

.pd-modal-label {
  display: block;
  font-family: var(--pd-font-deco);
  font-size: 0.7rem;
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

/* Buttons */
.pd-btn-primary,
.pd-btn-danger {
  border-radius: 2px;
  padding: 10px 20px;
  font-family: var(--pd-font-serif);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
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

/* Signature inline editor */
.pd-sign-inline {
  position: fixed;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  padding: 10px 14px;
  border: 1px solid var(--pd-gold);
  border-radius: 2px;
  background: rgba(16,18,40,0.92);
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
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,217,138,0.3);
  border-radius: 2px;
  padding: 8px 12px;
  color: var(--pd-text-pri);
  font-family: var(--pd-font-serif);
  font-size: 0.9rem;
}

.pd-sign-input:focus {
  outline: none;
  border-color: var(--pd-gold);
  box-shadow: 0 0 0 2px var(--pd-gold-soft);
}

.pd-sign-input::placeholder {
  color: rgba(255,217,138,0.4);
  opacity: 0.6;
}

/* Story meta pills (modal) */
.pd-story-meta-star {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid rgba(255,217,138,0.3);
  border-radius: 2px;
  background: rgba(255,217,138,0.04);
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
  border-radius: 2px;
  background: rgba(255, 107, 138, 0.1);
  color: #ff9eb8;
  border: 1px solid rgba(255, 107, 138, 0.3);
  font-size: 0.75rem;
}

.pd-story-meta-date {
  font-family: var(--pd-font-deco);
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  color: rgba(255,217,138,0.6);
}

.pd-story-meta-loc {
  font-size: 0.75rem;
  color: var(--pd-text-sec);
  opacity: 0.75;
}

/* Gold flash banner */
.pd-flash-banner {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  padding: 14px 28px;
  border: 1px solid var(--pd-gold);
  border-radius: 999px;
  background: rgba(16,18,40,0.92);
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
  background: linear-gradient(90deg, rgba(255, 217, 138, 0.12) 0%, rgba(16,18,40,0.92) 50%, rgba(255, 217, 138, 0.12) 100%);
}

.pd-flash-banner.error {
  border-color: #ff6b8a;
  color: #ff9eb8;
  background: linear-gradient(90deg, rgba(255, 107, 138, 0.12) 0%, rgba(16,18,40,0.92) 50%, rgba(255, 107, 138, 0.12) 100%);
  box-shadow: 0 12px 40px -8px rgba(255, 107, 138, 0.3);
}

.pd-flash-banner.info {
  border-color: #c49eff;
  color: #d9bfff;
  background: linear-gradient(90deg, rgba(196, 158, 255, 0.12) 0%, rgba(16,18,40,0.92) 50%, rgba(196, 158, 255, 0.12) 100%);
  box-shadow: 0 12px 40px -8px rgba(196, 158, 255, 0.3);
}

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

/* ════════════════════════════════════════════════════════════════
   Responsive — 严格对齐 style-d.html 的 @media (max-width: 768px)
   ════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  /* Topbar */
  .pd-topbar { padding: 16px 20px; }
  .pd-brand { font-size: 0.7rem; letter-spacing: 0.2em; }
  .pd-actions { gap: 6px; }
  .pd-back-btn { padding: 7px 12px; font-size: 0.72rem; letter-spacing: 0.05em; }

  /* Hero */
  .pd-moon { width: 320px; height: 320px; }
  .pd-hero-name { font-size: 2.4rem; }
  .pd-hero-role { font-size: 0.6rem; letter-spacing: 0.3em; margin-bottom: 14px; }
  .pd-hero-band { padding: 8px 20px; font-size: 0.78rem; }
  .pd-hero-joined { font-size: 0.66rem; gap: 8px; margin-top: 18px; }
  .pd-scroll-hint { bottom: 36px; font-size: 0.6rem; gap: 10px; }
  .pd-scroll-line { height: 30px; }

  /* Timeline section */
  .pd-timeline-section { padding: 40px 20px 80px; }
  .pd-section-head { margin-bottom: 60px; }
  .pd-section-head h2 { font-size: 1.3rem; letter-spacing: 0.12em; }
  .pd-section-head p { font-size: 0.78rem; }
  .pd-stats-pills { margin-bottom: 40px; gap: 6px 8px; }
  .pd-stats-pill { padding: 4px 10px; font-size: 0.68rem; }

  /* Timeline: switch to single column with axis on left */
  .pd-timeline::before { left: 24px; transform: none; }
  .pd-t-item {
    justify-content: flex-end !important;
    margin-bottom: 70px;
  }
  .pd-t-card {
    width: calc(100% - 60px);
    border-radius: 14px !important;
    padding: 20px 18px;
  }
  .pd-t-node, .pd-t-date { left: 24px; transform: none; }
  .pd-t-date { top: 68px; text-align: left; font-size: 0.62rem; }
  .pd-t-title { font-size: 1rem; }
  .pd-t-body { font-size: 0.8rem; line-height: 1.8; -webkit-line-clamp: 3; }
  .pd-t-foot { font-size: 0.66rem; }

  /* Constellation */
  .pd-constellation-section { padding: 80px 20px 120px; }
  .pd-const-name { font-size: 1.2rem; }
  .pd-const-title { font-size: 0.78rem; letter-spacing: 0.2em; }
  .pd-const-sub { font-size: 0.7rem; margin-bottom: 32px; }
  .pd-const-legend { padding: 18px 16px; }

  /* Favorites */
  .pd-favorites-section { padding: 60px 20px 120px; }
  .pd-favorites-title { font-size: 0.9rem; letter-spacing: 0.2em; margin-bottom: 40px; }
  .pd-gal-card { width: 140px; height: 200px; padding: 16px 12px; }
  .pd-gal-img { height: 80px; font-size: 2.2rem; margin-bottom: 10px; }
  .pd-gal-name { font-size: 0.82rem; }
  .pd-gal-sub { font-size: 0.62rem; }
  /* 移动端取消旋转排列，改为正常 flex */
  .pd-gal-card.gal-1, .pd-gal-card.gal-2, .pd-gal-card.gal-3, .pd-gal-card.gal-4 {
    transform: none;
    margin: 6px;
    z-index: 1;
  }
  .pd-gal-card:hover, .pd-gal-card:focus-visible {
    transform: translateY(-8px) scale(1.04) !important;
  }

  /* Modal */
  .pd-modal-panel { padding: 22px 18px; }
  .pd-modal-head h3 { font-size: 0.95rem; }
  .pd-btn-primary, .pd-btn-danger { padding: 8px 14px; font-size: 0.72rem; }

  /* Flash banner */
  .pd-flash-banner { left: 6vw; right: 6vw; transform: none; width: 88vw; text-align: center; }

  /* Sign inline */
  .pd-sign-inline { flex-wrap: wrap; max-width: 92vw; }
  .pd-sign-input { min-width: 160px; }
}

@media (max-width: 380px) {
  .pd-moon { width: 260px; height: 260px; }
  .pd-hero-name { font-size: 1.9rem; }
  .pd-hero-band { padding: 6px 14px; font-size: 0.7rem; }
  .pd-stats-pill { font-size: 0.62rem; padding: 3px 8px; }
  .pd-t-card { padding: 16px 14px; }
  .pd-t-head { flex-direction: column; align-items: flex-start; gap: 6px; }
  .pd-gal-card { width: 120px; height: 180px; padding: 12px 10px; }
  .pd-gal-img { height: 60px; font-size: 1.8rem; }
  .pd-gal-name { font-size: 0.72rem; }
  .pd-gal-sub { font-size: 0.55rem; }
}
</style>
