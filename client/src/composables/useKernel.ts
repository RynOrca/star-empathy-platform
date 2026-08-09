import { ref } from 'vue'

export interface AggregatedTags {
  emotionalTags: { tag: string; count: number }[]
  themes: { tag: string; count: number }[]
  essences: string[]
}

export interface StoryKernel {
  id: number
  storyId: number
  emotionalTags: string[]
  essence: string
  themes: string[]
  generatedAt: string
}

/** 同星聚合标签缓存（TTL 5 分钟）：StarDetail 反复挂载时避免对同一颗星重复请求，减轻全局限流压力 */
const tagsCache = new Map<number, { data: AggregatedTags; at: number }>()
const TAGS_CACHE_TTL = 5 * 60 * 1000

export function useKernel() {
  const aggregatedTags = ref<AggregatedTags | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAggregatedTags(catalogStarId: number): Promise<void> {
    // 命中缓存：直接使用，不发请求
    const hit = tagsCache.get(catalogStarId)
    if (hit && Date.now() - hit.at < TAGS_CACHE_TTL) {
      aggregatedTags.value = hit.data
      return
    }
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/catalog/stars/${catalogStarId}/tags`)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.message || `HTTP ${res.status}`)
      }
      aggregatedTags.value = json.data as AggregatedTags
      tagsCache.set(catalogStarId, { data: json.data as AggregatedTags, at: Date.now() })
    } catch (e: any) {
      error.value = e.message || '加载标签失败'
    } finally {
      loading.value = false
    }
  }

  function reset() {
    aggregatedTags.value = null
    loading.value = false
    error.value = null
  }

  return { aggregatedTags, loading, error, fetchAggregatedTags, reset }
}

/** 获取单个故事的内核 */
export async function fetchStoryKernel(storyId: number): Promise<StoryKernel | null> {
  try {
    const res = await fetch(`/api/stories/${storyId}/kernel`, { method: 'POST' })
    const json = await res.json()
    if (!res.ok) return null
    // 内核被用户修改 → 聚合标签缓存作废（编辑场景少，直接全清）
    tagsCache.clear()
    return json.data as StoryKernel
  } catch {
    return null
  }
}

/** 修改故事内核 */
export async function updateStoryKernel(
  storyId: number,
  updates: { emotionalTags?: string[]; essence?: string; themes?: string[] },
): Promise<StoryKernel | null> {
  try {
    const res = await fetch(`/api/stories/${storyId}/kernel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const json = await res.json()
    if (!res.ok) return null
    // 内核被用户修改 → 聚合标签缓存作废（编辑场景少，直接全清）
    tagsCache.clear()
    return json.data as StoryKernel
  } catch {
    return null
  }
}