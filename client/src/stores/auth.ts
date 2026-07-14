import { ref, computed } from 'vue'

interface User {
  id: number
  username: string
  created_at: string
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
    if (json.code === 200) user.value = json.data
  } catch { /* 静默 */ }
}

async function login(username: string, password: string): Promise<string> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const json = await res.json()
  if (json.code !== 200) throw new Error(json.message)
  localStorage.setItem('token', json.data.token)
  user.value = json.data.user
  return json.data.token
}

async function register(username: string, password: string): Promise<string> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const json = await res.json()
  if (json.code !== 200) throw new Error(json.message)
  localStorage.setItem('token', json.data.token)
  user.value = json.data.user
  return json.data.token
}

function logout() {
  localStorage.removeItem('token')
  user.value = null
}

export function useAuth() {
  return { user, loading, isLoggedIn, fetchMe, login, register, logout }
}
