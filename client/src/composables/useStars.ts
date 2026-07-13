import { ref, reactive, computed, onMounted } from 'vue'

interface StarData {
  id: number
  type: 'history' | 'user'
  title: string | null
  content: string
  resonanceCount: number
  posX: number
  posY: number
  posZ: number
  createdAt: string
}

interface RawStar {
  id: number
  type: string
  title: string | null
  content: string
  resonance_count: number
  pos_x: number
  pos_y: number
  pos_z: number
  created_at: string
}

function normalize(star: RawStar): StarData {
  return {
    id: star.id,
    type: star.type as 'history' | 'user',
    title: star.title,
    content: star.content,
    resonanceCount: star.resonance_count,
    posX: star.pos_x,
    posY: star.pos_y,
    posZ: star.pos_z,
    createdAt: star.created_at,
  }
}

export interface StarFilters {
  history: boolean
  user: boolean
  highlightResonance: boolean
}

export function useStars() {
  const stars = ref<StarData[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  const filters = reactive<StarFilters>({
    history: true,
    user: true,
    highlightResonance: false,
  })

  const filteredStars = computed<StarData[]>(() => {
    return stars.value.filter((s) => {
      if (!filters.history && s.type === 'history') return false
      if (!filters.user && s.type === 'user') return false
      return true
    })
  })

  async function fetchStars() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/stars')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.code !== 200) throw new Error(json.message || 'API error')
      stars.value = (json.data as RawStar[]).map(normalize)
    } catch (e: any) {
      error.value = e.message || '加载星空数据失败'
      console.error('useStars: fetch failed', e)
    } finally {
      loading.value = false
    }
  }

  // 投递新星后更新本地列表
  function addLocalStar(star: StarData) {
    stars.value.unshift(star)
  }

  // 本地更新共鸣计数
  function updateResonanceLocally(id: number) {
    const star = stars.value.find((s) => s.id === id)
    if (star) star.resonanceCount++
  }

  onMounted(() => {
    fetchStars()
  })

  return {
    stars,
    loading,
    error,
    filters,
    filteredStars,
    fetchStars,
    addLocalStar,
    updateResonanceLocally,
  }
}
