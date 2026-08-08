import { ref, watch } from 'vue'
import { useAuth, authHeaders } from '../stores/auth'

/** localStorage Key：未登录时的共鸣记录（弱防刷，登录后以服务端为准） */
const ANONYMOUS_RES_KEY = 'se.anony_resonated.v1'

function readAnonymousResonated(): Set<number> {
  try {
    const raw = localStorage.getItem(ANONYMOUS_RES_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr.filter((n: unknown) => typeof n === 'number') : [])
  } catch {
    return new Set()
  }
}
function writeAnonymousResonated(set: Set<number>): void {
  try {
    localStorage.setItem(ANONYMOUS_RES_KEY, JSON.stringify([...set]))
  } catch { /* 忽略存储异常（无痕模式等） */ }
}

/**
 * useResonate
 * 共鸣逻辑：
 *  · 登录态：带 Bearer Token 请求服务端 /api/stories/:id/resonate（authRequired）
 *           后端 resonance_log UNIQUE(story_id, user_id) 保证同一账号对同一故事只能共鸣一次
 *           前端 resonatedIds 同步记录，UI 显示「已共鸣」且按钮禁用
 *  · 未登录态：走 localStorage ANONYMOUS_RES_KEY 记录（仅本浏览器有效），
 *              POST /stories/:id/resonate 一定会 401，但本地仍把该 story 标为已共鸣
 *              （引导用户登录后才能真的加服务端计数）
 */
export function useResonate() {
  const { isLoggedIn } = useAuth()

  /** 正在共鸣中的 storyId（用于 loading / 禁用按钮） */
  const resonatingId = ref<number | null>(null)
  /** 最近一次错误提示 */
  const lastError = ref<string | null>(null)
  /** 已共鸣的 storyId 集合（前端用于控制按钮「已共鸣」状态） */
  const resonatedIds = ref<Set<number>>(isLoggedIn.value ? new Set() : readAnonymousResonated())

  /** 登出/登录切换时重置并从 localStorage 同步 */
  watch(isLoggedIn, (logged) => {
    resonatedIds.value = logged ? new Set() : readAnonymousResonated()
  })

  /** 是否已共鸣（便捷式判断） */
  function isResonated(storyId: number): boolean {
    return resonatedIds.value.has(storyId)
  }

  /**
   * 一次性预置多个已共鸣的 storyId
   * 用于后端在列表/详情响应里带上 resonated 字段时，同步前端状态
   */
  function setResonatedIds(ids: number[]): void {
    resonatedIds.value = new Set(ids)
  }
  function addResonatedIds(ids: number[]): void {
    const next = new Set(resonatedIds.value)
    for (const id of ids) next.add(id)
    resonatedIds.value = next
  }
  /**
   * 从后端列表/详情响应里的 `resonated: boolean` 字段批量同步：
   *   resonated=true 的条目 id 追加到 resonatedIds；
   *   resonated=false 不主动剔除（避免清空未登录 localStorage 记录）
   * 建议在首次拉取列表后调用一次。
   */
  function syncFromServerRows(rows: (number | { id: number; resonated?: boolean })[]): void {
    const ids: number[] = []
    for (const r of rows) {
      if (typeof r === 'number') continue
      if (r?.resonated && typeof r.id === 'number') ids.push(r.id)
    }
    if (ids.length) addResonatedIds(ids)
  }

  type ResonateResult =
    | { ok: true; status: 'new' | 'already'; resonanceCount: number }
    | { ok: false; status: 'unauthorized' | 'notfound' | 'error'; message: string | null }

  async function resonate(storyId: number): Promise<ResonateResult> {
    resonatingId.value = storyId
    lastError.value = null
    try {
      // 前端去重快路径：已记录直接返回 already，不再发请求
      if (resonatedIds.value.has(storyId)) {
        return { ok: true, status: 'already', resonanceCount: -1 }
      }

      const res = await fetch(`/api/stories/${storyId}/resonate`, {
        method: 'POST',
        headers: authHeaders(true), // 带 Authorization（未登录也带 JSON header，无 token）
      })
      const json = await res.json().catch(() => ({}))

      // 401：未登录 → 仅本地 localStorage 记录（共鸣按钮显示"已共鸣"，但服务端计数不会加）
      if (res.status === 401) {
        const next = new Set(resonatedIds.value)
        next.add(storyId)
        resonatedIds.value = next
        writeAnonymousResonated(next)
        lastError.value = '登录后共鸣才会被记录喔'
        return { ok: false, status: 'unauthorized', message: lastError.value }
      }

      if (res.status === 404) {
        return { ok: false, status: 'notfound', message: json.message || '故事不存在' }
      }
      if (!res.ok) {
        lastError.value = json.message || '共鸣失败'
        return { ok: false, status: 'error', message: lastError.value }
      }

      const already: boolean = !!json.data?.already
      const resonanceCount: number = Number(json.data?.resonance_count ?? -1)
      // 写入前端集合
      const next = new Set(resonatedIds.value)
      next.add(storyId)
      resonatedIds.value = next
      // 登录态：无需写 localStorage（服务端是数据源）；未登录不会走到 200
      return {
        ok: true,
        status: already ? 'already' : 'new',
        resonanceCount,
      }
    } catch (e: any) {
      lastError.value = e?.message || '网络错误'
      return { ok: false, status: 'error', message: lastError.value }
    } finally {
      resonatingId.value = null
    }
  }

  return {
    resonate,
    resonatingId,
    lastError,
    resonatedIds,
    isResonated,
    setResonatedIds,
    addResonatedIds,
    syncFromServerRows,
  }
}
