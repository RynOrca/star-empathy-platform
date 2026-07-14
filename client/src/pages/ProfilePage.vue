<template>
  <div class="profile-page">
    <div class="profile-container">
      <button class="btn-back" @click="$router.push('/sky')">← 返回星空</button>
      <div class="card user-card">
        <div class="avatar">👤</div>
        <h1 v-if="user">{{ user.username }}</h1>
        <p class="join-date" v-if="user">加入星空 {{ daysAgo }} 天</p>
      </div>
      <div class="card stats-row">
        <div class="stat"><strong>{{ stats.storyCount }}</strong><span>我的故事</span></div>
        <div class="stat"><strong>{{ stats.totalResonance }}</strong><span>获得共鸣</span></div>
        <div class="stat"><strong>{{ stats.favoriteCount }}</strong><span>收藏星星</span></div>
      </div>
      <div class="card">
        <h3>📖 我的故事</h3>
        <div v-if="stories.length === 0" class="empty">还没有故事，去星空投递吧</div>
        <div v-for="s in stories" :key="s.id" class="story-item">
          <div class="story-content"><p>{{ s.content }}</p>
            <div class="story-meta">
              <span v-if="s.tag" class="tag" :class="'tag-' + s.tag">{{ s.tag }}</span>
              <span>{{ formatDate(s.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <h3>⭐ 收藏的星星</h3>
        <div v-if="favorites.length === 0" class="empty">还没有收藏</div>
        <div class="fav-list">
          <span v-for="fid in favorites" :key="fid" class="fav-badge">{{ getStarName(fid) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import catalogData from '../data/stars.json'

const router = useRouter()
const user = ref<{ id: number; username: string; created_at: string } | null>(null)
const stories = ref<any[]>([])
const favorites = ref<number[]>([])
const stats = ref({ storyCount: 0, totalResonance: 0, favoriteCount: 0 })
const daysAgo = computed(() => {
  if (!user.value) return 0
  return Math.floor((Date.now() - new Date(user.value.created_at).getTime()) / 86400000)
})
function formatDate(d: string) { if (!d) return ''; return d.slice(0, 16).replace('T', ' ') }
const starLookup = new Map<number, string>()
for (const s of catalogData.stars) starLookup.set(s.id, s.name || `${s.con || ''} #${s.id}`)
function getStarName(id: number) { return starLookup.get(id) || `星星 #${id}` }
onMounted(async () => {
  const token = localStorage.getItem('token')
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
  } catch (e) { console.error('加载失败', e) }
})
</script>

<style scoped>
.profile-page { width: 100vw; min-height: 100vh; padding: 2rem 1rem; background: #070816; color: #f6f1ff; font-family: var(--font,"Microsoft YaHei",sans-serif); display: flex; justify-content: center; }
.profile-container { max-width: 600px; width: 100%; display: flex; flex-direction: column; gap: 1.25rem; }
.btn-back { align-self: flex-start; padding: 0.5rem 1.2rem; border-radius: 12px; border: 1px solid #303757; background: rgba(255,255,255,0.06); color: #b9b4d6; cursor: pointer; font-size: 0.85rem; }
.card { background: rgba(16,20,43,0.85); border: 1px solid rgba(48,55,87,0.5); border-radius: 20px; padding: 1.5rem; }
.user-card { text-align: center; } .user-card .avatar { font-size: 3rem; margin-bottom: 0.5rem; } .user-card h1 { font-size: 1.4rem; margin: 0; }
.join-date { color: #5a5580; font-size: 0.82rem; margin-top: 0.25rem; }
.stats-row { display: flex; justify-content: space-around; text-align: center; }
.stat strong { display: block; color: #ffd98a; font-size: 1.3rem; } .stat span { color: #7a759c; font-size: 0.8rem; }
.card h3 { color: #ffd98a; font-size: 1rem; margin-bottom: 1rem; }
.empty { color: #5a5580; font-size: 0.9rem; text-align: center; padding: 1rem; }
.story-item { padding: 0.75rem 0; border-bottom: 1px solid rgba(48,55,87,0.3); } .story-item:last-child { border-bottom: none; }
.story-content p { font-size: 0.9rem; color: #b9b4d6; line-height: 1.5; }
.story-meta { display: flex; gap: 0.75rem; margin-top: 0.4rem; font-size: 0.75rem; color: #5a5580; }
.tag { padding: 1px 8px; border-radius: 8px; font-size: 0.7rem; background: rgba(255,255,255,0.06); }
.tag-思念 { color: #ff8b7d; } .tag-等待 { color: #86a8ff; } .tag-离别 { color: #caa7ff; } .tag-愿望 { color: #ffd98a; } .tag-孤独 { color: #95f0c0; }
.fav-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.fav-badge { padding: 4px 12px; border-radius: 14px; font-size: 0.82rem; background: rgba(255,217,138,0.1); border: 1px solid rgba(255,217,138,0.2); color: #ffd98a; }
</style>
