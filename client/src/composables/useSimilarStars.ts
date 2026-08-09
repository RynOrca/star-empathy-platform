import { ref, watch } from 'vue'

export interface SimilarStar {
  catalogStarId: number
  score: number
  sharedEmotions: string[]
  sharedThemes: string[]
  storyCount: number
}

/** 同星缓存（TTL 5 分钟）：StarDetail 反复挂载时避免对同一颗星重复请求，减轻全局限流压力 */
const cache = new Map<number, { data: SimilarStar[]; at: number }>()
const CACHE_TTL = 5 * 60 * 1000

export function useSimilarStars(catalogStarId: () => number) {
  const similarStars = ref<SimilarStar[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSimilar(): Promise<void> {
    const id = catalogStarId()
    // 天枢 id=0 是合法 catalog 星，不能用 truthy 判断
    if (id === null || id === undefined || Number.isNaN(id)) return

    // 命中缓存：直接使用，不发请求
    const hit = cache.get(id)
    if (hit && Date.now() - hit.at < CACHE_TTL) {
      similarStars.value = hit.data
      return
    }

    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/catalog/stars/${id}/similar`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`)
      similarStars.value = (json.data as SimilarStar[]) || []
      cache.set(id, { data: similarStars.value, at: Date.now() })
    } catch (e: any) {
      error.value = e.message || '加载相似星星失败'
    } finally {
      loading.value = false
    }
  }

  function reset() {
    similarStars.value = []
    loading.value = false
    error.value = null
  }

  watch(catalogStarId, (id) => {
    // id=0（天枢）合法
    if (id !== null && id !== undefined && !Number.isNaN(id)) {
      reset()
      fetchSimilar()
    }
  }, { immediate: true })

  return { similarStars, loading, error, fetchSimilar, reset }
}
