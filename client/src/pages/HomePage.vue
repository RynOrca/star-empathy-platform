<template>
  <div class="home-page">
    <!-- Three.js 粒子星空背景 -->
    <canvas ref="canvasRef" class="sky-bg" />

    <div class="split-container">
      <!-- 左栏：品牌意境区（透明，透出底层星空） -->
      <div class="left-panel">
        <h1 class="brand-title">星语穹庭</h1>
        <p class="brand-subtitle">在这里，每颗星星都藏着一个秘密。</p>
      </div>

      <!-- 右栏：功能交互区 -->
      <div class="right-panel">
        <div class="form-container">
          <div class="form-header">
            <h2 class="form-title" id="formTitle">{{ mode === 'login' ? '欢迎降临星系' : '开启新星籍' }}</h2>
          </div>

          <!-- 标签页切换 -->
          <div class="tab-menu">
            <div
              class="tab-item"
              :class="{ active: mode === 'login' }"
              @click="switchMode('login')"
            >登录</div>
            <div
              class="tab-item"
              :class="{ active: mode === 'register' }"
              @click="switchMode('register')"
            >注册</div>
          </div>

          <!-- 表单 -->
          <form class="auth-form" @submit.prevent="handleSubmit" autocomplete="off">
            <div class="form-group">
              <label for="username">观测者账号</label>
              <input
                id="username"
                v-model="username"
                type="text"
                class="form-input"
                required
                :placeholder="mode === 'register' ? '设置观测者账号' : '请输入账号或邮箱'"
                maxlength="20"
                autocomplete="username"
              />
            </div>

            <div class="form-group">
              <label for="password">引力密钥</label>
              <input
                id="password"
                v-model="password"
                type="password"
                class="form-input"
                required
                :placeholder="mode === 'register' ? '设置引力密钥' : '请输入密码'"
                maxlength="50"
                autocomplete="current-password"
              />
            </div>

            <div v-if="mode === 'register'" class="form-group">
              <label for="confirmPassword">确认密钥</label>
              <input
                id="confirmPassword"
                v-model="password2"
                type="password"
                class="form-input"
                required
                placeholder="请再次输入引力密钥"
                maxlength="50"
                autocomplete="new-password"
              />
            </div>

            <p v-if="error" class="error">{{ error }}</p>

            <button type="submit" class="submit-btn" :disabled="loading">
              <span v-if="loading">请稍候...</span>
              <span v-else>{{ mode === 'login' ? '校准并进入星系' : '铸造星籍并启航' }}</span>
            </button>
          </form>

          <!-- 分割线 -->
          <div class="divider">或</div>

          <!-- 匿名快捷体验 -->
          <button class="guest-btn" :disabled="guestLoading" @click="handleGuestAccess">
            <span v-if="guestLoading">正在校准...</span>
            <span v-else>匿名快捷体验</span>
          </button>

          <!-- 底部统计 -->
          <p v-if="stats" class="stats">{{ stats.starCount }} 颗星 · {{ stats.totalResonance }} 次共鸣</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useParticleSky } from '../composables/useParticleSky'
import { useAuth } from '../stores/auth'

const router = useRouter()
const canvasRef = ref<HTMLCanvasElement | null>(null)
useParticleSky(canvasRef as { value: HTMLCanvasElement | null })
const { login, register } = useAuth()

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const password2 = ref('')
const loading = ref(false)
const guestLoading = ref(false)
const error = ref('')
const stats = ref<{ starCount: number; totalResonance: number } | null>(null)

function switchMode(m: 'login' | 'register') {
  mode.value = m
  error.value = ''
}

async function handleSubmit() {
  if (mode.value === 'login') await handleLogin()
  else await handleRegister()
}

async function handleLogin() {
  error.value = ''
  if (!username.value.trim() || !password.value) return
  loading.value = true
  try {
    await login(username.value.trim(), password.value)
    router.push('/sky')
  } catch (e: any) {
    error.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  error.value = ''
  const u = username.value.trim()
  if (u.length < 2 || u.length > 20) { error.value = '观测者账号需 2~20 个字符'; return }
  if (password.value.length < 6 || password.value.length > 50) { error.value = '引力密钥需 6~50 个字符'; return }
  if (password.value !== password2.value) { error.value = '两次引力密钥不一致'; return }
  loading.value = true
  try {
    await register(u, password.value)
    router.push('/sky')
  } catch (e: any) {
    error.value = e.message || '注册失败'
  } finally {
    loading.value = false
  }
}

async function handleGuestAccess() {
  guestLoading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/auth/guest', { method: 'POST' })
    const json = await res.json()
    if (json.code !== 200) throw new Error(json.message)
    localStorage.setItem('token', json.data.token)
    router.push('/sky')
  } catch (e: any) {
    error.value = e.message || '访客登录失败'
  } finally {
    guestLoading.value = false
  }
}

onMounted(() => {
  fetch('/api/stats')
    .then(r => r.json())
    .then(j => { if (j.code === 200) stats.value = j.data })
    .catch(() => {})
})
</script>

<style scoped>
/* ================= 基础样式复位 ================= */
.home-page {
  width: 100vw;
  height: 100dvh;
  position: relative;
  overflow: hidden;
  background-color: #02040A;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Three.js 星空背景 — 全屏底层 */
.sky-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
}

/* ================= 布局容器 ================= */
.split-container {
  display: flex;
  width: 100%;
  height: 100vh;
  position: relative;
  z-index: 1;
}

/* 左栏：品牌意境区（完全透明，透出底层星空） */
.left-panel {
  flex: 6;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-left: 10%;
  padding-right: 5%;
  z-index: 2;
  background: transparent;
}

.brand-title {
  font-size: 4.5rem;
  font-weight: 700;
  letter-spacing: 0.6rem;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #ffffff 0%, #818cf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-subtitle {
  font-size: 1.25rem;
  color: #64748b;
  letter-spacing: 0.2rem;
  line-height: 1.8;
  font-weight: 300;
}

/* 右栏：功能交互区 */
.right-panel {
  flex: 4;
  background-color: rgba(6, 9, 18, 0.98);
  border-left: 1px solid rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 5%;
  z-index: 3;
  box-shadow: -15px 0 40px rgba(0, 0, 0, 0.8);
}

.form-container {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.form-header {
  margin-bottom: 2.5rem;
}

.form-title {
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: 0.1rem;
  margin-bottom: 0.5rem;
  color: #f1f5f9;
}

/* ================= 标签页切换 ================= */
.tab-menu {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 0.5rem;
}

.tab-item {
  font-size: 1rem;
  color: #475569;
  cursor: pointer;
  transition: all 0.3s ease;
  padding-bottom: 0.5rem;
  position: relative;
  user-select: none;
}

.tab-item:hover {
  color: #94a3b8;
}

.tab-item.active {
  color: #ffffff;
  font-weight: 500;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #4f46e5;
  box-shadow: 0 0 10px rgba(79, 70, 229, 0.5);
}

/* ================= 表单内部元素 ================= */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.form-group label {
  font-size: 0.85rem;
  color: #94a3b8;
  letter-spacing: 0.05rem;
}

.form-input {
  width: 100%;
  background-color: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 0.85rem 1rem;
  color: #ffffff;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  outline: none;
}

.form-input:focus {
  border-color: #4f46e5;
  background-color: rgba(79, 70, 229, 0.05);
  box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.2) inset;
}

.form-input::placeholder {
  color: #334155;
}

/* ================= 按钮组 ================= */
.submit-btn {
  width: 100%;
  background: linear-gradient(135deg, #3730a3 0%, #4f46e5 100%);
  border: none;
  color: #ffffff;
  padding: 0.9rem;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.5rem;
  box-shadow: 0 4px 15px rgba(55, 48, 163, 0.3);
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.5);
}

.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 错误提示 */
.error {
  color: #ff8b7d;
  font-size: 0.8rem;
  margin: -0.5rem 0 0;
  text-align: center;
}

/* 分割线 */
.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: #334155;
  font-size: 0.85rem;
  margin: 1.8rem 0;
  letter-spacing: 0.1rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.divider::before {
  margin-right: 1em;
}

.divider::after {
  margin-left: 1em;
}

/* 匿名快捷体验按钮 */
.guest-btn {
  width: 100%;
  background-color: transparent;
  border: 1px solid rgba(79, 70, 229, 0.3);
  color: #818cf8;
  padding: 0.9rem;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: 0.05rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  display: block;
}

.guest-btn:hover:not(:disabled) {
  background-color: rgba(79, 70, 229, 0.08);
  color: #c7d2fe;
  border-color: rgba(99, 102, 241, 0.6);
  box-shadow: 0 0 15px rgba(79, 70, 229, 0.15) inset;
}

.guest-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 底部统计 */
.stats {
  color: rgba(148, 163, 184, 0.35);
  font-size: 0.72rem;
  margin: 1rem 0 0;
  text-align: center;
  letter-spacing: 0.05rem;
}

/* ================= 响应式 ================= */
@media (max-width: 768px) {
  .split-container {
    flex-direction: column;
  }
  .left-panel {
    flex: 3;
    padding: 2rem;
    justify-content: flex-end;
  }
  .right-panel {
    flex: 7;
    padding: 2rem;
  }
  .brand-title {
    font-size: 2.5rem;
  }
}
</style>
