import { ref, watch } from 'vue'

export interface SimilarStar {
  catalogStarId: number
  score: number
  sharedEmotions: string[]
  sharedThemes: string[]
  storyCount: number
}

export function useSimilarStars(catalogStarId: () => number) {
  const similarStars = ref<SimilarStar[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSimilar(): Promise<void> {
    const id = catalogStarId()
    if (!id) return

    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/catalog/stars/${id}/similar`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`)
      similarStars.value = (json.data as SimilarStar[]) || []
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
    if (id) {
      reset()
      fetchSimilar()
    }
  }, { immediate: true })

  return { similarStars, loading, error, fetchSimilar, reset }
}