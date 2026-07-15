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

      <!-- 故事星节点 -->
      <div class="story-field" v-if="stories.length > 0">
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
        <div class="fav-title">收藏的星星</div>
        <div class="fav-list">
          <span v-for="fid in favorites" :key="fid" class="fav-badge">{{ getStarName(fid) }}</span>
        </div>
      </div>

      <!-- 故事详情弹窗 -->
      <div v-if="activeStory" class="modal-overlay" @click.self="activeStory = null">
        <div class="modal-card">
          <h3>{{ activeStory.title || '未命名故事' }}</h3>
          <p class="modal-content">{{ activeStory.content }}</p>
          <div class="modal-meta">
            <span v-if="activeStory.tag" class="tag" :class="'tag-' + activeStory.tag">{{ activeStory.tag }}</span>
            <span>{{ formatDate(activeStory.created_at) }}</span>
            <span>共鸣 {{ activeStory.resonance_count || 0 }}</span>
          </div>
          <button class="modal-close" @click="activeStory = null">关闭</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useParticleSky } from '../composables/useParticleSky'
import catalogData from '../data/stars.json'

const router = useRouter()
const canvasRef = ref<HTMLCanvasElement | null>(null)
useParticleSky(canvasRef)

const loaded = ref(false)
const user = ref<{ id: number; username: string; signature: string; created_at: string } | null>(null)
const stories = ref<any[]>([])
const favorites = ref<number[]>([])
const stats = ref({ storyCount: 0, totalResonance: 0, favoriteCount: 0 })
const hoverIdx = ref(-1)
const activeStory = ref<any>(null)

const editingSig = ref(false)
const sigDraft = ref('')
const sigInputRef = ref<HTMLInputElement | null>(null)

const sigText = computed(() => user.value?.signature || '今夜星光很好')
const daysAgo = computed(() => {
  if (!user.value) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(user.value.created_at).getTime()) / 86400000))
})

function formatDate(d: string) { if (!d) return ''; return d.slice(0, 16).replace('T', ' ') }

const starLookup = new Map<number, string>()
for (const s of catalogData.stars) starLookup.set(s.id, s.name || `${s.con || ''} #${s.id}`)
function getStarName(id: number) { return starLookup.get(id) || `星星 #${id}` }

const precomputedPositions: { x: number; y: number; delay: number; size: number }[] = []
function starStyle(i: number) {
  if (i >= precomputedPositions.length) return {}
  const p = precomputedPositions[i]
  return {
    left: p.x + '%',
    top: p.y + '%',
    animationDelay: p.delay + 's',
    width: p.size + 'px',
    height: p.size + 'px',
  }
}

function getToken() { return localStorage.getItem('token') }

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
    if (j.code === 200 && user.value) user.value.signature = j.data.signature
  } catch {}
}

function openStory(s: any) { activeStory.value = s }
function goBack() { router.push('/sky') }

onMounted(async () => {
  const token = getToken()
  if (!token) { router.push('/'); return }
  try {
    const [meRes, storiesRes, favRes] = await Promise.all([
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/profile/stories', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/profile/favorites', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    const meJson = await meRes.json()
    if (meJson.code === 200) user.value = meJson.data
    const storiesJson = await storiesRes.json()
    if (storiesJson.code === 200) {
      stories.value = storiesJson.data
      stats.value.storyCount = storiesJson.data.length
      stats.value.totalResonance = storiesJson.data.reduce((s: number, x: any) => s + (x.resonance_count || 0), 0)
    }
    const favJson = await favRes.json()
    if (favJson.code === 200) { favorites.value = favJson.data; stats.value.favoriteCount = favJson.data.length }

    for (let i = 0; i < stories.value.length; i++) {
      precomputedPositions.push({
        x: 15 + Math.random() * 70,
        y: 38 + Math.random() * 52,
        delay: Math.random() * 2,
        size: 4 + Math.random() * 8,
      })
    }
  } catch (e) { console.error('加载失败', e) }
  loaded.value = true
})
</script>

<style scoped>
.profile-page { width: 100vw; min-height: 100vh; position: relative; overflow: hidden; font-family: var(--font,"Microsoft YaHei",sans-serif); color: #f6f1ff; }
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
.fav-title { font-size: 0.75rem; color: #5a5580; margin-bottom: 0.5rem; }
.fav-list { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; }
.fav-badge {
  padding: 3px 10px; border-radius: 12px; font-size: 0.75rem;
  background: rgba(255,217,138,0.06); border: 1px solid rgba(255,217,138,0.15);
  color: #ffd98a; backdrop-filter: blur(4px);
}

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
</style>
