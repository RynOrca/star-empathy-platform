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

export function useKernel() {
  const aggregatedTags = ref<AggregatedTags | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAggregatedTags(catalogStarId: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/catalog/stars/${catalogStarId}/tags`)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.message || `HTTP ${res.status}`)
      }
      aggregatedTags.value = json.data as AggregatedTags
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
    return json.data as StoryKernel
  } catch {
    return null
  }
}