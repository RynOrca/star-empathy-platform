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

  let fetchSeq = 0

  async function fetchNarrative(catalogStarId: number, lat?: number, lng?: number, ra?: number, dec?: number): Promise<void> {
    const mySeq = ++fetchSeq
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
      if (ra !== undefined) params.set('ra', String(ra))
      if (dec !== undefined) params.set('dec', String(dec))
      const qs = params.toString()
      const res = await fetch(`/api/catalog/stars/${catalogStarId}/narrative${qs ? '?' + qs : ''}`)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.message || `HTTP ${res.status}`)
      }
      const data = json.data as NarrativeData
      // 过期响应丢弃：同一颗星可能有无定位/带定位两次请求，避免先发的旧响应覆盖后发的新定位结果
      if (mySeq !== fetchSeq) return
      content.value = data.content
      cached.value = data.cached
    } catch (e: any) {
      if (mySeq !== fetchSeq) return
      error.value = e.message || '加载叙事失败'
    } finally {
      if (mySeq === fetchSeq) loading.value = false
    }
  }

  function reset() {
    fetchSeq += 1 // 作废在途请求
    content.value = null
    loading.value = false
    error.value = null
    cached.value = false
  }

  return { content, loading, error, cached, fetchNarrative, reset }
}
