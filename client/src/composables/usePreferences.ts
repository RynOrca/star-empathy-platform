/**
 * usePreferences — 用户喜好 composable
 *
 * 职责：
 *   1. 从后端拉取用户故事聚合的情绪/主题标签（GET /api/profile/preferences）
 *   2. 计算 prefsHash（用于 localStorage 缓存校验）
 *
 * 设计要点：
 *   - 未登录用户不请求，prefsHash = 'anonymous'
 *   - 已登录但无故事，prefsHash = 'empty'
 *   - 已登录有故事，prefsHash = 标签排序后的 hash
 *   - 失败时降级为 'empty'，不阻塞月相个性化流程
 */

import { ref } from 'vue'

export interface UserPreferences {
  emotionalTags: string[]
  themes: string[]
  storyCount: number
}

const cached = ref<UserPreferences | null>(null)

/**
 * 计算 prefsHash（基于情绪+主题标签排序后拼接）
 * - 未登录：'anonymous'
 * - 已登录无故事：'empty'
 * - 已登录有故事：标签排序拼接的 hash
 */
export function computePrefsHash(prefs: UserPreferences | null, isLoggedIn: boolean): string {
  if (!isLoggedIn) return 'anonymous'
  if (!prefs || prefs.emotionalTags.length === 0) return 'empty'
  const str = [...prefs.emotionalTags, ...prefs.themes].sort().join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return hash.toString(36)
}

/**
 * 拉取用户喜好（已登录才调用）
 * 失败时返回 null，不抛错
 */
async function fetchPreferences(): Promise<UserPreferences | null> {
  const token = localStorage.getItem('token')
  if (!token) return null

  try {
    const res = await fetch('/api/profile/preferences', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.code !== 200 || !json.data) return null
    return json.data as UserPreferences
  } catch {
    return null
  }
}

export function usePreferences() {
  const preferences = ref<UserPreferences | null>(null)
  const loading = ref(false)

  async function load(): Promise<UserPreferences | null> {
    const token = localStorage.getItem('token')
    if (!token) {
      preferences.value = null
      return null
    }

    // 命中内存缓存（同会话内不重复请求）
    if (cached.value) {
      preferences.value = cached.value
      return cached.value
    }

    loading.value = true
    try {
      const data = await fetchPreferences()
      preferences.value = data
      cached.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  /** 清除缓存（登出时调用） */
  function clear(): void {
    cached.value = null
    preferences.value = null
  }

  return { preferences, loading, load, clear }
}
