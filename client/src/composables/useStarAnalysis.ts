import { ref, watch, Ref } from 'vue'

// 与 server/src/types/starAnalysis.ts 对应的前端轻量类型
export type PersonaDimension = {
  left: string; right: string; percent: number; side: 'left' | 'right'
}
export type PersonaPayload = {
  constellation: string
  hanName: string
  mbti: string
  tags: string[]
  quote: string
  suggestIntro: string
  paragraphs: [string, string]
  dimensions: PersonaDimension[]
}
export type EmotionPayload = {
  emotions: Array<{ name: string; value: number; color: string }>
  insights: Array<{ title: string; pct: string; color: string; desc: string }>
  quotes: Array<{ text: string; color: string; tags: string[]; author: string; date: string; illus: string }>
}
export type ThemeHourPayload = {
  themes: Array<{ name: string; count: number; color: string }>
  hourly: number[]
  peakHour: number
  lowHour: number
  forestNote?: string
  peakText?: string
  lowText?: string
}
export type StarAnalysis = {
  persona: PersonaPayload | null
  emotion: EmotionPayload | null
  themehour: ThemeHourPayload | null
  ready: boolean
  generatedAt: number | null
}

export function useStarAnalysis(catalogStarId: Ref<number | null>) {
  const analysis = ref<StarAnalysis | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAnalysis(): Promise<void> {
    const id = catalogStarId.value
    if (!id) return
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/catalog/stars/${id}/analysis`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`)
      analysis.value = (json.data as StarAnalysis) || null
    } catch (e: any) {
      error.value = e.message || '加载分析失败'
      analysis.value = null
    } finally {
      loading.value = false
    }
  }

  function reset() {
    analysis.value = null
    loading.value = false
    error.value = null
  }

  watch(
    catalogStarId,
    (id) => {
      if (id) {
        reset()
        fetchAnalysis()
      }
    },
    { immediate: true }
  )

  return { analysis, loading, error, fetchAnalysis, reset }
}
