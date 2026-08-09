import { ref, watch, type Ref, onBeforeUnmount } from 'vue'

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

/**
 * 拉取 catalog_star 的 AI 预生成分析。
 * - 首次请求后若后端 ready=false（后台正在异步生成 persona/emotion/themehour.note），
 *   启动轮询：每 POLL_INTERVAL_MS 再拉一次，直到 ready=true 或达到 MAX_POLL 次。
 * - 轮询降频降次（5s×8，原 3s×20）：既覆盖后台生成时长，又把单颗星的请求上限从 21 降到 9，减轻全局限流压力。
 * - 生成完成后停止轮询，analysis.value 的响应式更新会直接驱动 StarDetail 所有 AI 卡片重渲染，
 *   无需退出再进入详情页。
 */
export function useStarAnalysis(catalogStarId: Ref<number | null>, options?: {
  pollIntervalMs?: number
  maxPolls?: number
}) {
  const POLL_INTERVAL = options?.pollIntervalMs ?? 5000
  const MAX_POLLS = options?.maxPolls ?? 8

  const analysis = ref<StarAnalysis | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let pollCount = 0
  let destroyed = false
  let inflightSeq = 0

  function clearPollTimer() {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  async function fetchAnalysis(): Promise<void> {
    const id = catalogStarId.value
    if (!id) return
    const mySeq = ++inflightSeq
    // 首次：开启 loading；后续轮询：保留 loading=false 不打断已展示的骨架/局部真实数据
    if (pollCount === 0) {
      loading.value = true
    }
    error.value = null
    try {
      const res = await fetch(`/api/catalog/stars/${id}/analysis`)
      const json = await res.json()
      // 429 限流：立即停止轮询，避免继续请求把限流窗口打满（此前 429 会进 catch 继续 3s 重试形成风暴）
      if (res.status === 429) {
        if (destroyed || mySeq !== inflightSeq) return
        clearPollTimer()
        error.value = json?.message || '请求过于频繁，请稍后再试'
        if (pollCount === 0) {
          analysis.value = null
          loading.value = false
        }
        return
      }
      if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`)
      if (destroyed || mySeq !== inflightSeq) return /* 过期请求丢弃 */
      const next = (json.data as StarAnalysis) || null
      analysis.value = next
      loading.value = false
      // ready 或已达上限：停止轮询
      if (next?.ready || pollCount >= MAX_POLLS) {
        clearPollTimer()
        return
      }
      // 仍未 ready → 调度下一轮
      pollCount += 1
      clearPollTimer()
      pollTimer = setTimeout(() => {
        pollTimer = null
        fetchAnalysis()
      }, POLL_INTERVAL)
    } catch (e: any) {
      if (destroyed || mySeq !== inflightSeq) return
      // 单次网络错误：按"继续轮询"策略，不直接把 loading 打到底
      error.value = e.message || '加载分析失败'
      if (pollCount === 0) {
        analysis.value = null
        loading.value = false
      }
      if (pollCount >= MAX_POLLS) {
        clearPollTimer()
        return
      }
      pollCount += 1
      clearPollTimer()
      pollTimer = setTimeout(() => {
        pollTimer = null
        fetchAnalysis()
      }, POLL_INTERVAL)
    } finally {
      if (mySeq === inflightSeq && pollCount === 0) {
        // 首轮请求兜底：已在 try 分支里设置 loading=false
      }
    }
  }

  function reset() {
    clearPollTimer()
    pollCount = 0
    analysis.value = null
    loading.value = false
    error.value = null
  }

  watch(
    catalogStarId,
    (id) => {
      reset()
      if (id) {
        fetchAnalysis()
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    destroyed = true
    clearPollTimer()
  })

  return { analysis, loading, error, fetchAnalysis, reset }
}
