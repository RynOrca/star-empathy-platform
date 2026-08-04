import { ref, computed } from 'vue'
import type { Router } from 'vue-router'

interface User {
  id: number
  username: string
  email: string
  signature: string
  createdAt: string
}

const user = ref<User | null>(null)
const loading = ref(false)

const isLoggedIn = computed(() => !!localStorage.getItem('token'))
// 访客账号（体验账号）：username 固定为「星穹访客」
const isGuest = computed(() => user.value?.username === '星穹访客')

// ─── 401 兜底：token 失效时自动清状态并跳登录页 ───
let routerInstance: Router | null = null
export function setAuthRouter(r: Router) { routerInstance = r }

/**
 * 统一鉴权 fetch：遇到 401 自动清 token + 跳登录页
 * 用于需要登录的 API 调用，避免 token 失效时页面卡在空数据
 */
export async function authFetch(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init)
  if (res.status === 401) {
    localStorage.removeItem('token')
    user.value = null
    stopRefreshTimer()
    if (routerInstance) {
      const current = routerInstance.currentRoute.value
      if (current.path !== '/') routerInstance.push('/')
    }
  }
  return res
}

async function fetchMe() {
  const token = localStorage.getItem('token')
  if (!token) return
  try {
    const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (res.ok) {
      user.value = json.data
      if (json.data?.id != null) localStorage.setItem('userId', String(json.data.id))
    }
  } catch { /* 静默 */ }
}

async function login(username: string, password: string, rememberMe?: boolean): Promise<string> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, rememberMe: !!rememberMe }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || '请求失败')
  localStorage.setItem('token', json.data.token)
  if (json.data.user?.id != null) localStorage.setItem('userId', String(json.data.user.id))
  user.value = json.data.user
  startRefreshTimer()
  return json.data.token
}

async function register(username: string, password: string, email?: string): Promise<string> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || '请求失败')
  localStorage.setItem('token', json.data.token)
  if (json.data.user?.id != null) localStorage.setItem('userId', String(json.data.user.id))
  user.value = json.data.user
  startRefreshTimer()
  return json.data.token
}

// ─── Token 刷新 ───

let refreshTimer: ReturnType<typeof setInterval> | null = null

function parseTokenPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(atob(parts[1]))
  } catch {
    return null
  }
}

/**
 * 启动自动刷新定时器：
 * - 记住我 token（无 exp）：每 7 天刷新一次（保活）
 * - 普通 token（有 exp）：在过期前 1 小时刷新
 */
function startRefreshTimer() {
  stopRefreshTimer()
  const token = localStorage.getItem('token')
  if (!token) return

  const payload = parseTokenPayload(token)
  if (!payload) return

  if (payload.exp) {
    // 普通 token：在过期前 1 小时刷新
    const expiresIn = (payload.exp * 1000) - Date.now()
    const refreshAt = Math.max(expiresIn - 3600_000, 0) // 过期前 1 小时
    if (refreshAt <= 0) return
    refreshTimer = setTimeout(doRefresh, refreshAt)
  } else {
    // 记住我 token：每 7 天刷新一次
    refreshTimer = setInterval(doRefresh, 7 * 24 * 3600_000)
  }
}

async function doRefresh() {
  const token = localStorage.getItem('token')
  if (!token) return
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (res.ok && json.data?.token) {
      localStorage.setItem('token', json.data.token)
      startRefreshTimer()
    }
  } catch { /* 静默 */ }
}

function stopRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

async function logout() {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch { /* 即使 API 失败也清除本地状态 */ }
  }
  localStorage.removeItem('token')
  localStorage.removeItem('userId')
  user.value = null
  stopRefreshTimer()
}

export function useAuth() {
  return { user, loading, isLoggedIn, isGuest, fetchMe, login, register, logout, startRefreshTimer, stopRefreshTimer }
}
