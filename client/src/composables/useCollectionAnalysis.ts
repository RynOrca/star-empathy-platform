import { ref, watch, Ref, onBeforeUnmount } from 'vue'
import { authFetch, authHeaders } from '../stores/auth'
import type { PersonaPayload, EmotionPayload } from './useStarAnalysis'

// ───────────────────── Nightscape（合集独有：夜色流转+心事轨迹+五大气象+天窗片段+Hero统计） ──────────────────────
export type NightscapePayload = {
  nightSky: {
    name: string
    season: string
    timeSpan: string
    phase: string
    moonAge: string
    moonIllum: string
    term: string
    ecliptic: string
    termDeg: number
    meteo: Array<{ k: string; v: string; color?: string }>
    hourDots: Array<{ pos: number; size: number; color: string }>
  }
  fiveMeteo: Array<{ k: string; en: string; color: string }>
  heroStars: Array<{
    x: number; y: number; r: number; fill: string
    gid: 'Gold' | 'Purple' | 'Blue' | 'Green'
    label?: string
  }>
  heroStats: Array<{ k: string; v: number | string; sub: string; color: string }>
  storyQuotes: Array<{
    rank: string; text: string; tags: string[]; author: string; date: string
    illus: 'moon' | 'house' | 'plant'; starName: string; color: string
    reason?: string
  }>
  hourly: number[]
  peakHour: number
  lowHour: number
  emotionNarrative: {
    dominant: string; dominantPct: string
    summary: string; contrast: string; flow: string
  }
  emotionInsights: Array<{
    title: string; pct: string; color: string; desc: string
  }>
  tone: 'modern' | 'ancient'
}

export type CollectionAnalysis = {
  persona: PersonaPayload | null
  emotion: EmotionPayload | null
  nightscape: NightscapePayload | null
  ready: boolean
  generatedAt: number | null
  /** 后端返回：故事数 < 3 → true，前端直接显示空态不轮询 */
  tooFewStories?: boolean
  /** 后端返回：实际故事数，前端可用来提示用户还差几条才生成 */
  storyCount?: number
  /** 合集语气：modern 现代陪伴 / ancient 古籍诗话（根据历史故事占比自动） */
  tone?: 'modern' | 'ancient'
  /** 前端内部：已达最大轮询次数仍未 ready → 强制显示已有内容（避免永久骨架） */
  _stale?: boolean
}

/**
 * 拉取合集的 AI 预生成分析。
 * - 首次请求若后端 tooFewStories=true：前端立即显示空态（BookDashed "星笺故事不足"），不轮询
 * - 首次请求 ready=false 但 tooFewStories=false：后台正在异步生成，启动轮询每 POLL_INTERVAL_MS 再拉一次
 * - ready=true：停止轮询，响应式更新驱动 CollectionAnalysis 所有卡片重渲染
 *
 * 与 useStarAnalysis 完全对齐的三态模式：loading / tooFewStories / 真实数据
 */
export function useCollectionAnalysis(collectionId: Ref<number | null>, options?: {
  pollIntervalMs?: number
  maxPolls?: number
}) {
  // 默认 800ms 轮询（之前 3s 太慢），最多 12 次 → 9.6s 超时（Phase 1 通常首次就 ready=true，不轮询）
  const POLL_INTERVAL = options?.pollIntervalMs ?? 800
  const MAX_POLLS = options?.maxPolls ?? 12

  const analysis = ref<CollectionAnalysis | null>(null)
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
    const id = collectionId.value
    if (!id) return
    const mySeq = ++inflightSeq
    if (pollCount === 0) {
      loading.value = true
    }
    error.value = null
    try {
      const res = await authFetch(`/api/collections/${id}/analysis`, { headers: authHeaders() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`)
      if (destroyed || mySeq !== inflightSeq) return
      const next = (json.data as CollectionAnalysis) || null
      analysis.value = next
      loading.value = false

      // tooFewStories=true：明确表示不生成，直接停止
      if (next?.tooFewStories) {
        clearPollTimer()
        return
      }
      // ready=true：停止轮询
      if (next?.ready) {
        clearPollTimer()
        return
      }
      // 已达上限：给 analysis 打 _stale 标记让 hasReal 降级显示，避免永久骨架
      if (pollCount >= MAX_POLLS) {
        clearPollTimer()
        if (analysis.value) analysis.value = { ...analysis.value, _stale: true }
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
      error.value = e.message || '加载分析失败'
      if (pollCount === 0) {
        analysis.value = null
      }
      loading.value = false
      if (pollCount >= MAX_POLLS) {
        clearPollTimer()
        if (analysis.value) analysis.value = { ...analysis.value, _stale: true }
        return
      }
      pollCount += 1
      clearPollTimer()
      pollTimer = setTimeout(() => {
        pollTimer = null
        fetchAnalysis()
      }, POLL_INTERVAL)
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
    collectionId,
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
