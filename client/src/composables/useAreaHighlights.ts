import { ref, watch } from 'vue'

export interface AreaHighlight {
  catalogStarId: number
  essences: string[]
  sharedEmotions: string[]
  score: number
  storyCount: number
}

/** 同星缓存：StarDetail 反复挂载（相机模式进出详情）时避免对同一颗星重复请求，减轻全局限流压力 */
const cache = new Map<number, { data: AreaHighlight[]; at: number }>()
const CACHE_TTL = 5 * 60 * 1000

/** 429 限流探测：返回 null 表示被限流，调用方应静默停止（无轮询，故只需不重试） */

export function useAreaHighlights(catalogStarId: () => number) {
  const highlights = ref<AreaHighlight[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchHighlights(): Promise<void> {
    const id = catalogStarId()
    if (!id) return

    // 命中缓存：直接使用，不发请求
    const hit = cache.get(id)
    if (hit && Date.now() - hit.at < CACHE_TTL) {
      highlights.value = hit.data
      return
    }

    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/catalog/stars/${id}/area-highlights`)
      const json = await res.json()
      if (res.status === 429) {
        error.value = json?.message || '请求过于频繁，请稍后再试'
      } else if (res.ok) {
        const data = json.data as AreaHighlight[]
        highlights.value = data
        cache.set(id, { data, at: Date.now() })
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