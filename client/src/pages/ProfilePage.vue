<template>
  <div class="profile-page">
    <!-- 保留 canvas 不删除 -->
    <canvas ref="canvasRef" class="sky-bg pd-sky-canvas"></canvas>
    <div v-if="!loaded" class="loading">...</div>
    <template v-else>
      <button class="btn-back" @click="goBack">← 星空</button>

      <!-- 星云签名 -->
      <div class="signature-area">
        <div class="signature-wrap" @click="startEditSig">
          <div v-if="editingSig" class="sig-edit">
            <input ref="sigInputRef" v-model="sigDraft" maxlength="30"
              @blur="saveSig" @keydown.enter="saveSig" @keydown.escape="editingSig = false"
              class="sig-input" placeholder="写一行签名..." />
          </div>
          <div v-else class="sig-display">
            <p class="sig-text">{{ sigText }}</p>
            <span class="sig-hint">点击编辑签名</span>
          </div>
        </div>
        <h2 class="username">{{ user?.username }}</h2>
        <p class="join-days" v-if="user">加入星空 {{ daysAgo }} 天</p>
      </div>

      <!-- 统计 -->
      <div class="stats-row">
        <div class="stat"><strong>{{ stats.storyCount }}</strong><span>故事</span></div>
        <div class="stat"><strong>{{ stats.totalResonance }}</strong><span>收到共鸣</span></div>
        <div class="stat"><strong>{{ stats.resonanceGivenCount }}</strong><span>发出共鸣</span></div>
        <div class="stat"><strong>{{ stats.favoriteCount }}</strong><span>收藏</span></div>
      </div>

      <!-- 账号操作 -->
      <div class="account-actions">
        <button class="btn-change-pwd" @click="showPwdModal = true">修改密码</button>
      </div>

      <!-- 修改密码弹窗 -->
      <div v-if="showPwdModal" class="modal-overlay" @click.self="showPwdModal = false">
        <div class="modal-card pwd-modal">
          <h3>修改密码</h3>
          <form @submit.prevent="doChangePassword">
            <div class="form-group">
              <label>旧密码</label>
              <input v-model="pwdForm.oldPassword" type="password" class="form-input" required placeholder="输入旧密码" />
            </div>
            <div class="form-group">
              <label>新密码</label>
              <input v-model="pwdForm.newPassword" type="password" class="form-input" required placeholder="6~50 个字符" minlength="6" maxlength="50" />
            </div>
            <div class="form-group">
              <label>确认新密码</label>
              <input v-model="pwdForm.confirmPassword" type="password" class="form-input" required placeholder="再次输入新密码" />
            </div>
            <p v-if="pwdError" class="error">{{ pwdError }}</p>
            <p v-if="pwdSuccess" class="success">{{ pwdSuccess }}</p>
            <div class="pwd-modal-actions">
              <button type="button" class="modal-close" @click="showPwdModal = false">取消</button>
              <button type="submit" class="modal-save" :disabled="pwdLoading">
                {{ pwdLoading ? '修改中...' : '确认修改' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- 故事星节点 -->
      <div class="story-field" v-if="stories.length > 0">
        <svg class="kernel-lines-svg" v-if="kernelLines.length > 0">
          <line v-for="(l, i) in kernelLines" :key="i"
            :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
            class="kernel-line" />
        </svg>
        <div v-for="(s, i) in stories" :key="s.id"
          class="story-star" :style="starStyle(i)"
          @click="openStory(s)"
          @mouseenter="hoverIdx = i" @mouseleave="hoverIdx = -1">
          <span class="star-glow"></span>
          <span v-if="hoverIdx === i" class="star-title">{{ s.title || '未命名' }}</span>
        </div>
      </div>
      <div v-else class="empty-hint">还没有故事<br>去星空投递一颗吧</div>

      <!-- 收藏的星星 -->
      <div class="fav-section" v-if="favorites.length > 0">
        <div class="fav-title">收藏的星星 ({{ favorites.length }})</div>
        <div class="fav-list">
          <div v-for="fid in favorites" :key="fid" class="fav-card">
            <div class="fav-card-main" @click="goToStar(fid)">
              <span class="fav-star" :style="{ color: getStarColor(fid) }"><Star :size="16" :fill="getStarColor(fid)" /></span>
              <div class="fav-info">
                <div class="fav-name">{{ getStarName(fid) }}</div>
                <div class="fav-meta">
                  <span v-if="getStarCon(fid)">{{ getStarCon(fid) }}</span>
                  <span v-if="getStarMag(fid) != null">{{ getStarMag(fid)!.toFixed(1) }} mag</span>
                </div>
              </div>
            </div>
            <button class="fav-remove" title="取消收藏" @click="removeFavorite(fid)">×</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-hint">还没有收藏的星星<br>去星空点亮一颗吧</div>

      <!-- 故事详情弹窗 -->
      <div v-if="activeStory" class="modal-overlay" @click.self="activeStory = null">
        <div class="modal-card">
          <h3>{{ activeStory.title || '未命名故事' }}</h3>
          <img v-if="activeStory.imageUrl" :src="activeStory.imageUrl" class="modal-image" alt="故事图片" />
          <p class="modal-content">{{ activeStory.content }}</p>
          <div class="modal-meta">
            <span v-if="activeStory.tag" class="tag" :class="'tag-' + activeStory.tag">{{ activeStory.tag }}</span>
            <span>{{ formatDate(activeStory.createdAt) }}</span>
            <span>共鸣 {{ activeStory.resonanceCount || 0 }}</span>
          </div>
          <!-- 关联的星星 -->
          <div v-if="getStoryStarNames(activeStory).length" class="modal-stars">
            <span class="modal-stars-label">挂在</span>
            <button v-for="cid in getStoryStarIds(activeStory)" :key="cid" class="modal-star-link" @click="goToStar(cid)">
              {{ getStarName(cid) }}
            </button>
          </div>
          <div class="modal-actions">
            <button class="modal-close" @click="activeStory = null">关闭</button>
            <button class="modal-delete" @click="confirmDeleteStory(activeStory)">删除</button>
          </div>
        </div>
      </div>

      <!-- 删除确认弹窗 -->
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="modal-card delete-modal">
          <h3>确认删除</h3>
          <p>删除后不可恢复，确定要删除这个故事吗？</p>
          <div class="modal-actions">
            <button class="modal-close" @click="showDeleteConfirm = false" :disabled="deletingStory">取消</button>
            <button class="modal-delete confirm" @click="doDeleteStory" :disabled="deletingStory">
              {{ deletingStory ? '删除中...' : '确认删除' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, onBeforeUnmount, computed, nextTick, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Star } from 'lucide-vue-next'
import { useParticleSky } from '../composables/useParticleSky'
import catalogData from '../data/stars.json'
import { constellationNames } from '../data/starInfo'

const PAGE_SIZE = 20

const router = useRouter()
const canvasRef = ref<HTMLCanvasElement | null>(null)
useParticleSky(canvasRef)

const loaded = ref(false)
const user = ref<{ id: number; username: string; signature: string; createdAt: string } | null>(null)
const stories = ref<any[]>([])
const favorites = ref<number[]>([])
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
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

async function doChangePassword() {
  pwdError.value = ''
  pwdSuccess.value = ''
  if (!pwdForm.oldPassword || !pwdForm.newPassword || !pwdForm.confirmPassword) {
    pwdError.value = '请填写所有字段'
    return
  }
  if (pwdForm.newPassword !== pwdForm.confirmPassword) {
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
      body: JSON.stringify({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword }),
    })
    const json = await res.json()
    if (res.ok) {
      pwdSuccess.value = '密码修改成功'
      pwdForm.oldPassword = ''
      pwdForm.newPassword = ''
      pwdForm.confirmPassword = ''
      setTimeout(() => { showPwdModal.value = false; pwdSuccess.value = '' }, 1500)
    } else {
      pwdError.value = json.message || '修改失败'
    }
  } catch {
    pwdError.value = '网络错误，请重试'
  } finally {
    pwdLoading.value = false
  }
}

const currentPage = ref(0)
const hasMore = ref(true)
const loadingMore = ref(false)
const kernelLines = ref<{ x1: string; y1: string; x2: string; y2: string }[]>([])

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

async function removeFavorite(starId: number) {
  const token = getToken()
  if (!token) return
  try {
    const res = await fetch(`/api/catalog/stars/${starId}/favorite`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      favorites.value = favorites.value.filter(fid => fid !== starId)
      stats.value.favoriteCount = favorites.value.length
    }
  } catch {}
}

const precomputedPositions = ref<{ x: number; y: number; delay: number; size: number }[]>([])
function starStyle(i: number) {
  if (i >= precomputedPositions.value.length) return {}
  const p = precomputedPositions.value[i]
  return {
    left: p.x + '%',
    top: p.y + '%',
    animationDelay: p.delay + 's',
    width: p.size + 'px',
    height: p.size + 'px',
  }
}

function appendPositions(count: number) {
  for (let i = 0; i < count; i++) {
    precomputedPositions.value.push({
      x: 15 + Math.random() * 70,
      y: 38 + Math.random() * 52,
      delay: Math.random() * 2,
      size: 4 + Math.random() * 8,
    })
  }
}

// 根据内核连线 API 结果计算 SVG 坐标
async function computeKernelLines(linesRes: Response, stories: any[]) {
  try {
    const linesJson = await linesRes.json()
    if (!linesRes.ok || !linesJson.data?.length) return
    const apiLines = linesJson.data as {
      from: { catalogStarId: number }
      to: { catalogStarId: number }
    }[]

    // 构建 catalog_star_id → 第一个故事节点索引的映射
    const starToIndex = new Map<number, number>()
    for (let i = 0; i < stories.length; i++) {
      const cid = stories[i].catalogStarId
      if (cid != null && !starToIndex.has(cid)) {
        starToIndex.set(cid, i)
      }
    }

    // 计算连线坐标
    const lines: { x1: string; y1: string; x2: string; y2: string }[] = []
    for (const l of apiLines) {
      const fromIdx = starToIndex.get(l.from.catalogStarId)
      const toIdx = starToIndex.get(l.to.catalogStarId)
      if (fromIdx == null || toIdx == null) continue
      const fromPos = precomputedPositions.value[fromIdx]
      const toPos = precomputedPositions.value[toIdx]
      if (!fromPos || !toPos) continue
      lines.push({
        x1: fromPos.x + '%',
        y1: fromPos.y + '%',
        x2: toPos.x + '%',
        y2: toPos.y + '%',
      })
    }
    kernelLines.value = lines
  } catch { /* 静默失败 */ }
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
      appendPositions(items.length)
      // 统计数据由 /api/profile/stats 提供，这里不再客户端累加
    }
  } catch (e) { console.error('加载故事页失败:', e) }
  finally { loadingMore.value = false }
}

function onScroll() {
  const scrollBottom = window.innerHeight + window.scrollY
  const pageHeight = document.documentElement.scrollHeight
  if (scrollBottom >= pageHeight - 200) loadNextPage()
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
    if (r.ok && user.value) user.value.signature = j.data.signature
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
const pendingDeleteStory = ref<any>(null)
const deletingStory = ref(false)

function confirmDeleteStory(story: any) {
  pendingDeleteStory.value = story
  showDeleteConfirm.value = true
}

async function doDeleteStory() {
  if (!pendingDeleteStory.value) return
  const token = getToken()
  if (!token) return
  deletingStory.value = true
  try {
    const res = await fetch(`/api/stories/${pendingDeleteStory.value.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      // 从本地列表中移除
      stories.value = stories.value.filter(s => s.id !== pendingDeleteStory.value.id)
      stats.value.storyCount = Math.max(0, stats.value.storyCount - 1)
      stats.value.totalResonance = Math.max(0, stats.value.totalResonance - (pendingDeleteStory.value.resonanceCount || 0))
      showDeleteConfirm.value = false
      activeStory.value = null
      pendingDeleteStory.value = null
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
  precomputedPositions.value = []
  activeStory.value = null
  kernelLines.value = []

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
      appendPositions(items.length)
      // 计算内核连线坐标
      computeKernelLines(linesRes, items)
    }
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
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
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
</style>
