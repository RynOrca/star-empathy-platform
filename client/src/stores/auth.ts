import { ref, computed } from 'vue'

interface User {
  id: number
  username: string
  createdAt: string
}

const user = ref<User | null>(null)
const loading = ref(false)

const isLoggedIn = computed(() => !!localStorage.getItem('token'))

async function fetchMe() {
  const token = localStorage.getItem('token')
  if (!token) return
  try {
    const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (res.ok) user.value = json.data
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

function logout() {
  localStorage.removeItem('token')
  user.value = null
  stopRefreshTimer()
}

export function useAuth() {
  return { user, loading, isLoggedIn, fetchMe, login, register, logout, startRefreshTimer, stopRefreshTimer }
}
