<template>
  <div class="profile-page">
    <canvas ref="canvasRef" class="sky-bg"></canvas>
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
        <div class="stat"><strong>{{ stats.totalResonance }}</strong><span>共鸣</span></div>
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
              <span class="fav-star" :style="{ color: getStarColor(fid) }">★</span>
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
          <p class="modal-content">{{ activeStory.content }}</p>
          <div class="modal-meta">
            <span v-if="activeStory.tag" class="tag" :class="'tag-' + activeStory.tag">{{ activeStory.tag }}</span>
            <span>{{ formatDate(activeStory.createdAt) }}</span>
            <span>共鸣 {{ activeStory.resonanceCount || 0 }}</span>
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
import { ref, onMounted, onUnmounted, onActivated, computed, nextTick, reactive } from 'vue'
import { useRouter } from 'vue-router'
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
const stats = ref({ storyCount: 0, totalResonance: 0, favoriteCount: 0 })
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
    if (!linesJson.ok || !linesJson.data?.length) return
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
      // 用 total 更新 storyCount（首次）
      if (json.data.total != null && stats.value.storyCount === 0) {
        stats.value.storyCount = json.data.total
      }
      stats.value.totalResonance = stories.value.reduce((s: number, x: any) => s + (x.resonanceCount || 0), 0)
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
      stats.value.totalResonance = stories.value.reduce((s: number, x: any) => s + (x.resonanceCount || 0), 0)
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
  stats.value = { storyCount: 0, totalResonance: 0, favoriteCount: 0 }
  currentPage.value = 0
  hasMore.value = true
  loadingMore.value = false
  precomputedPositions.value = []
  activeStory.value = null
  kernelLines.value = []

  const token = getToken()
  if (!token) { router.push('/'); return }
  try {
    const [meRes, firstPageRes, favRes, linesRes] = await Promise.all([
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/profile/stories?page=1&limit=${PAGE_SIZE}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/profile/favorites', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/profile/kernel-lines', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    const meJson = await meRes.json()
    if (meRes.ok) user.value = meJson.data
    const firstJson = await firstPageRes.json()
    if (firstJson.ok && firstJson.data) {
      const items = firstJson.data.items ?? firstJson.data ?? []
      stories.value = items
      currentPage.value = firstJson.data.page ?? 1
      hasMore.value = (firstJson.data.page ?? 1) < (firstJson.data.totalPages ?? 1)
      stats.value.storyCount = firstJson.data.total ?? items.length
      stats.value.totalResonance = items.reduce((s: number, x: any) => s + (x.resonanceCount || 0), 0)
      appendPositions(items.length)
      // 计算内核连线坐标
      computeKernelLines(linesRes, items)
    }
    const favJson = await favRes.json()
    if (favRes.ok) { favorites.value = favJson.data; stats.value.favoriteCount = favJson.data.length }
  } catch (e) { console.error('加载失败', e) }
  loaded.value = true
}

onMounted(() => {
  loadProfileData()
  window.addEventListener('scroll', onScroll, { passive: true })
})

// 兼容 keep-alive 场景：组件被缓存后再次激活时重新加载
onActivated(() => {
  loadProfileData()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.profile-page { width: 100vw; min-height: 100vh; position: relative; overflow-x: hidden; font-family: var(--font,"Microsoft YaHei",sans-serif); color: #f6f1ff; padding-bottom: 120px; }
.sky-bg { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; }
.loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #7a759c; z-index: 10; }

.btn-back { position: fixed; top: 1rem; left: 1rem; z-index: 20; padding: 0.35rem 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: rgba(10,10,30,0.5); color: #7a759c; cursor: pointer; font-size: 0.8rem; backdrop-filter: blur(6px); transition: color 0.3s; }
.btn-back:hover { color: #ffd98a; }

/* ═══ 星云签名 ═══ */
.signature-area { position: relative; z-index: 10; text-align: center; padding-top: 6vh; }
.signature-wrap { display: inline-block; cursor: pointer; }
.sig-display { position: relative; }
.sig-text {
  font-size: 1.15rem; font-style: italic; color: #d4caff;
  text-shadow: 0 0 20px rgba(180,160,255,0.5), 0 0 40px rgba(140,120,220,0.25);
  margin: 0; line-height: 1.6;
}
.sig-hint { font-size: 0.65rem; color: rgba(255,255,255,0.15); display: block; margin-top: 2px; transition: color 0.3s; }
.signature-wrap:hover .sig-hint { color: rgba(255,255,255,0.35); }
.sig-edit { display: flex; justify-content: center; }
.sig-input {
  background: rgba(16,20,43,0.7); border: 1px solid rgba(255,217,138,0.3); border-radius: 10px;
  color: #ffd98a; font-size: 1.05rem; font-style: italic; padding: 0.3rem 0.8rem; outline: none;
  text-align: center; width: 220px; backdrop-filter: blur(8px);
}
.sig-input::placeholder { color: rgba(255,217,138,0.2); }
.username { font-size: 1.6rem; font-weight: 600; margin: 0.5rem 0 0; color: #ffd98a; }
.join-days { font-size: 0.75rem; color: #5a5580; margin-top: 0.2rem; }

/* ═══ 统计 ═══ */
.stats-row { position: relative; z-index: 10; display: flex; justify-content: center; gap: 2.5rem; margin-top: 2rem; }
.stat { text-align: center; }
.stat strong { display: block; font-size: 1.4rem; color: #ffd98a; text-shadow: 0 0 12px rgba(255,217,138,0.3); }
.stat span { font-size: 0.7rem; color: #5a5580; }

/* ═══ 故事星节点 ═══ */
.story-field { position: fixed; inset: 0; z-index: 5; pointer-events: none; }
.kernel-lines-svg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  pointer-events: none; z-index: 4;
}
.kernel-line {
  stroke: rgba(255, 217, 138, 0.15);
  stroke-width: 1;
  stroke-dasharray: 4 6;
  animation: lineGlow 4s ease-in-out infinite;
}
@keyframes lineGlow {
  0%, 100% { stroke: rgba(255, 217, 138, 0.1); }
  50% { stroke: rgba(255, 217, 138, 0.3); }
}
.story-star {
  position: absolute; border-radius: 50%; cursor: pointer; pointer-events: auto;
  background: radial-gradient(circle, rgba(255,217,138,0.9) 0%, rgba(255,217,138,0) 70%);
  box-shadow: 0 0 6px rgba(255,217,138,0.6), 0 0 14px rgba(255,180,100,0.3);
  animation: starPulse 3s ease-in-out infinite;
  transition: transform 0.3s, box-shadow 0.3s;
}
.story-star:hover { transform: scale(1.8); box-shadow: 0 0 12px rgba(255,217,138,0.9), 0 0 24px rgba(255,180,100,0.5); z-index: 15; }
.star-title {
  position: absolute; top: -1.6rem; left: 50%; transform: translateX(-50%);
  font-size: 0.7rem; color: #ffd98a; white-space: nowrap;
  text-shadow: 0 0 8px rgba(255,217,138,0.5);
  pointer-events: none;
}
@keyframes starPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.empty-hint { position: relative; z-index: 10; text-align: center; margin-top: 4rem; font-size: 0.85rem; color: #5a5580; line-height: 1.8; }

/* ═══ 收藏 ═══ */
.fav-section { position: relative; z-index: 10; text-align: center; margin-top: 3rem; padding-bottom: 3rem; }
.fav-title { font-size: 0.75rem; color: #5a5580; margin-bottom: 0.75rem; }
.fav-list { display: flex; flex-direction: column; gap: 0.5rem; max-width: 400px; margin: 0 auto; }
.fav-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border-radius: 10px;
  background: rgba(255,217,138,0.04); border: 1px solid rgba(255,217,138,0.12);
  backdrop-filter: blur(4px); text-align: left;
}
.fav-card-main { display: flex; align-items: center; gap: 12px; flex: 1; cursor: pointer; }
.fav-star { font-size: 1.2rem; }
.fav-info { flex: 1; }
.fav-name { color: #f6f1ff; font-size: 0.9rem; }
.fav-meta { color: #8a84a0; font-size: 0.7rem; display: flex; gap: 8px; margin-top: 2px; }
.fav-remove {
  background: none; border: none; color: #8a84a0; font-size: 1.2rem;
  cursor: pointer; padding: 2px 8px; border-radius: 6px;
}
.fav-remove:hover { color: #ff6b8a; background: rgba(255,107,138,0.08); }

/* ═══ 弹窗 ═══ */
.modal-overlay {
  position: fixed; inset: 0; z-index: 30;
  background: rgba(4,4,18,0.7); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
}
.modal-card {
  background: rgba(16,20,43,0.92); border: 1px solid rgba(48,55,87,0.5); border-radius: 20px;
  padding: 2rem; max-width: 440px; width: 90%; max-height: 70vh; overflow-y: auto;
}
.modal-card h3 { color: #ffd98a; font-size: 1.1rem; margin: 0 0 1rem; }
.modal-content { font-size: 0.9rem; color: #b9b4d6; line-height: 1.7; white-space: pre-wrap; }
.modal-meta { display: flex; gap: 1rem; margin-top: 1rem; font-size: 0.75rem; color: #5a5580; align-items: center; }
.tag { padding: 1px 8px; border-radius: 8px; font-size: 0.7rem; background: rgba(255,255,255,0.06); }
.tag-思念 { color: #ff8b7d; } .tag-等待 { color: #86a8ff; } .tag-离别 { color: #caa7ff; } .tag-愿望 { color: #ffd98a; } .tag-孤独 { color: #95f0c0; }
.modal-close { margin-top: 1rem; padding: 0.4rem 1.2rem; border-radius: 10px; border: 1px solid rgba(48,55,87,0.5); background: rgba(255,255,255,0.05); color: #7a759c; cursor: pointer; font-size: 0.8rem; }
.modal-close:hover { color: #ffd98a; border-color: rgba(255,217,138,0.3); }
.modal-close:disabled { opacity: 0.5; cursor: wait; }

.modal-actions { display: flex; gap: 0.8rem; margin-top: 1rem; justify-content: flex-end; }
.modal-delete {
  padding: 0.4rem 1.2rem; border-radius: 10px;
  border: 1px solid rgba(255,107,138,0.25); background: transparent;
  color: #ff6b8a; font-family: var(--font,"Microsoft YaHei",sans-serif); font-size: 0.8rem;
  cursor: pointer; transition: all 0.15s;
}
.modal-delete:hover { background: rgba(255,107,138,0.08); border-color: rgba(255,107,138,0.4); }
.modal-delete:disabled { opacity: 0.5; cursor: wait; }
.modal-delete.confirm {
  border: none; background: #ff6b8a; color: #1a1438; font-weight: 600;
}
.modal-delete.confirm:hover:not(:disabled) { background: #ff8a9e; }

.delete-modal h3 { color: #ff6b8a; }
.delete-modal p { color: #b9b4d6; font-size: 0.85rem; margin: 0 0 0.5rem; line-height: 1.6; }

/* ═══ 修改密码 ═══ */
.account-actions { position: relative; z-index: 10; text-align: center; margin-top: 1.5rem; }
.btn-change-pwd {
  padding: 0.4rem 1.5rem; border-radius: 10px;
  border: 1px solid rgba(255,217,138,0.2); background: rgba(255,217,138,0.06);
  color: #c8a86b; font-family: var(--font,"Microsoft YaHei",sans-serif); font-size: 0.78rem;
  cursor: pointer; transition: all 0.3s;
}
.btn-change-pwd:hover { border-color: rgba(255,217,138,0.4); color: #ffd98a; background: rgba(255,217,138,0.1); }

.pwd-modal { max-width: 380px; }
.pwd-modal h3 { color: #ffd98a; font-size: 1.1rem; margin: 0 0 1.2rem; text-align: center; }
.pwd-modal .form-group { margin-bottom: 1rem; }
.pwd-modal .form-group label { display: block; font-size: 0.75rem; color: #7a759c; margin-bottom: 0.3rem; }
.pwd-modal .form-input {
  width: 100%; padding: 0.5rem 0.8rem; border-radius: 8px;
  border: 1px solid rgba(48,55,87,0.5); background: rgba(16,20,43,0.6);
  color: #f6f1ff; font-family: var(--font,"Microsoft YaHei",sans-serif); font-size: 0.85rem;
  outline: none; box-sizing: border-box;
}
.pwd-modal .form-input:focus { border-color: rgba(255,217,138,0.4); }
.pwd-modal .form-input::placeholder { color: #5a5580; }
.pwd-modal .error { color: #ff6b8a; font-size: 0.78rem; margin: 0.5rem 0; }
.pwd-modal .success { color: #95f0c0; font-size: 0.78rem; margin: 0.5rem 0; }
.pwd-modal-actions { display: flex; gap: 0.8rem; margin-top: 1.2rem; justify-content: flex-end; }
.modal-save {
  padding: 0.5rem 1.5rem; border-radius: 10px; border: none;
  background: #ffd98a; color: #1a1438; font-family: var(--font,"Microsoft YaHei",sans-serif);
  font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: background 0.3s;
}
.modal-save:hover:not(:disabled) { background: #ffe0a8; }
.modal-save:disabled { opacity: 0.5; cursor: wait; }
</style>
