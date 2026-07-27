import { ref } from 'vue'

interface NarrativeData {
  content: string
  cached: boolean
}

export function useNarrative() {
  const content = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const cached = ref(false)

  async function fetchNarrative(catalogStarId: number, lat?: number, lng?: number): Promise<void> {
    loading.value = true
    error.value = null
    content.value = null
    cached.value = false

    try {
      const params = new URLSearchParams()
      if (lat !== undefined && lng !== undefined) {
        params.set('lat', String(lat))
        params.set('lng', String(lng))
      }
      const qs = params.toString()
      const res = await fetch(`/api/catalog/stars/${catalogStarId}/narrative${qs ? '?' + qs : ''}`)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.message || `HTTP ${res.status}`)
      }
      const data = json.data as NarrativeData
      content.value = data.content
      cached.value = data.cached
    } catch (e: any) {
      error.value = e.message || '加载叙事失败'
    } finally {
      loading.value = false
    }
  }

  function reset() {
    content.value = null
    loading.value = false
    error.value = null
    cached.value = false
  }

  return { content, loading, error, cached, fetchNarrative, reset }
}
