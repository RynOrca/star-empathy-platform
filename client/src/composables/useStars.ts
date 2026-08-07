import { ref, reactive, computed, onMounted } from 'vue'
import { HOT_THRESHOLD } from '../utils/constants'

export interface StarData {
  id: number
  type: 'history' | 'user'
  title: string | null
  content: string
  resonanceCount: number
  posX: number
  posY: number
  posZ: number
  createdAt: string
  catalogStarId: number | null
  catalogStarIds?: number[]
  viewCount: number
  origin: string | null
  username: string | null
  tag: string | null
  tags?: string[]
  locationLat: number | null
  locationLng: number | null
  collectionId?: number | null
  collectionName?: string | null
  collectionCoverColor?: string | null
  collectionVisibility?: string | null
  collectionStoryCount?: number | null

  // ═══ 天镜览星派生字段（运行时计算，不入库） ═══
  /** 24h 内发布 */
  isNew?: boolean
  /** resonanceCount >= HOT_THRESHOLD */
  isHot?: boolean
  /** type === 'history'，古人故事 */
  isAncient?: boolean
  /** 距用户位置近（地平线可见，需用户已定位） */
  isNear?: boolean
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
      const res = await fetch('/api/stories')
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || '请求失败')
      stars.value = (json.data as StarData[]).map((s) => ({
        ...s,
        isNew: Date.now() - new Date(s.createdAt).getTime() < 24 * 60 * 60 * 1000,
        isHot: s.resonanceCount >= HOT_THRESHOLD,
        isAncient: s.type === 'history',
        isNear: false, // 默认 false，由 useCameraMode 根据用户位置更新
      }))
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
