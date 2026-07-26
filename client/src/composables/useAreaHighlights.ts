import { ref, watch } from 'vue'

export interface AreaHighlight {
  catalogStarId: number
  essences: string[]
  sharedEmotions: string[]
  score: number
  storyCount: number
}

export function useAreaHighlights(catalogStarId: () => number) {
  const highlights = ref<AreaHighlight[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchHighlights(): Promise<void> {
    const id = catalogStarId()
    if (!id) return

    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/catalog/stars/${id}/area-highlights`)
      const json = await res.json()
      if (res.ok) {
        highlights.value = json.data as AreaHighlight[]
      } else {
        error.value = json.message || '加载失败'
      }
    } catch (e: any) {
      error.value = e.message || '加载天区故事精选失败'
    } finally {
      loading.value = false
    }
  }

  watch(catalogStarId, fetchHighlights, { immediate: true })

  return { highlights, loading, error, fetchHighlights }
}