/**
 * useStarMatching — 新故事 → 寻找最契合星辰 的前端封装
 *
 * 流程：
 *   matchStars(title, content) 发起请求
 *   → step 按进度推进 1→2→3（配合 UI 显示）
 *   → candidates 填充 Top3 结果
 */

import { ref } from 'vue'

export interface MatchCandidate {
  catalogStarId: number
  name: string | null
  constellationCN: string
  mag: number
  distance: number | null
  jaccardScore: number
  aiScore: number
  finalScore: number
  matchReason: string
  starEssences: string[]
  isFallback: boolean
}

export function useStarMatching() {
  const matching = ref(false)
  /** 0=未开始 1=提取内核 2=夜空寻星 3=AI缘分判断 */
  const step = ref<0 | 1 | 2 | 3>(0)
  const error = ref('')
  const candidates = ref<MatchCandidate[]>([])
  const aborted = ref(false)

  let stepTimers: ReturnType<typeof setTimeout>[] = []

  function clearStepTimers() {
    stepTimers.forEach(t => clearTimeout(t))
    stepTimers = []
  }

  function advanceStepsEstimated(totalEstimatedMs: number) {
    // 把 UI 的 step 1/2/3 均分到总时长里，给用户稳定的进度反馈
    clearStepTimers()
    const t1 = Math.round(totalEstimatedMs * 0.28)
    const t2 = Math.round(totalEstimatedMs * 0.58)
    const t3 = Math.round(totalEstimatedMs * 0.82)
    stepTimers.push(setTimeout(() => { if (!aborted.value) step.value = 1 }, 300))
    stepTimers.push(setTimeout(() => { if (!aborted.value) step.value = 2 }, t1))
    stepTimers.push(setTimeout(() => { if (!aborted.value) step.value = 3 }, t2))
    void t3
  }

  async function matchStars(
    title: string | null,
    content: string,
    limit = 3,
  ): Promise<MatchCandidate[]> {
    matching.value = true
    step.value = 0
    error.value = ''
    candidates.value = []
    aborted.value = false

    // 先按 6s 估算（内核+Jaccard 快 + AI 重排慢），API 返回后 step 直接到 3
    advanceStepsEstimated(6000)

    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`

      const res = await fetch('/api/stories/match-star', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: title?.trim() || null,
          content: content.trim(),
          limit,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.message || `请求失败 (${res.status})`)
      }

      step.value = 3
      const list: MatchCandidate[] = Array.isArray(json.data?.matches) ? json.data.matches : []
      candidates.value = list
      return list
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      error.value = msg
      throw e
    } finally {
      clearStepTimers()
      matching.value = false
      if (candidates.value.length) step.value = 3
    }
  }

  function reset() {
    aborted.value = true
    clearStepTimers()
    matching.value = false
    step.value = 0
    error.value = ''
    candidates.value = []
  }

  return {
    matching,
    step,
    error,
    candidates,
    matchStars,
    reset,
  }
}
