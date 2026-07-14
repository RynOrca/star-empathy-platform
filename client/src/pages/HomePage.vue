<template>
  <div class="home-page">
    <canvas ref="canvasRef" class="particle-bg" />
    
    <div class="overlay">
      <!-- 文案区 -->
      <div class="hero-text">
        <h1 class="title">星语穹庭</h1>
        <p class="subtitle">有多久没有抬头看星星了？</p>
        <p class="desc">把你的故事挂上星空，让心事化作星光</p>
      </div>

      <!-- 登录/注册卡片 -->
      <div class="auth-cards">
        <!-- 登录 -->
        <div class="auth-card">
          <h3>进入星空</h3>
          <form @submit.prevent="handleLogin">
            <input v-model="loginForm.username" type="text" placeholder="用户名" maxlength="20" required />
            <input v-model="loginForm.password" type="password" placeholder="密码" maxlength="50" required />
            <p v-if="loginError" class="error">{{ loginError }}</p>
            <button type="submit" class="btn primary" :disabled="loginLoading">
              {{ loginLoading ? '...' : '进入星空' }}
            </button>
          </form>
        </div>

        <!-- 注册 -->
        <div class="auth-card">
          <h3>创建账号</h3>
          <form @submit.prevent="handleRegister">
            <input v-model="regForm.username" type="text" placeholder="用户名 (2~20字)" maxlength="20" required />
            <input v-model="regForm.password" type="password" placeholder="密码 (6~50字)" maxlength="50" required />
            <input v-model="regForm.password2" type="password" placeholder="确认密码" maxlength="50" required />
            <p v-if="regError" class="error">{{ regError }}</p>
            <button type="submit" class="btn secondary" :disabled="regLoading">
              {{ regLoading ? '...' : '注册账号' }}
            </button>
          </form>
        </div>
      </div>

      <!-- 匿名入口 -->
      <div class="anonymous-entry">
        <div class="divider"><span>或者</span></div>
        <button class="btn ghost" @click="enterAnonymously">匿名进入 · 不登录</button>
      </div>

      <!-- 底部统计 -->
      <div class="footer-stats">
        <p v-if="stats">已有 {{ stats.starCount }} 颗历史星 · {{ stats.totalResonance }} 次共鸣</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useParticleSky } from '../composables/useParticleSky'
import { useAuth } from '../stores/auth'

const router = useRouter()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const { loaded } = useParticleSky(canvasRef as { value: HTMLCanvasElement | null })
const { login, register } = useAuth()

const loginForm = reactive({ username: '', password: '' })
const regForm = reactive({ username: '', password: '', password2: '' })
const loginLoading = ref(false)
const regLoading = ref(false)
const loginError = ref('')
const regError = ref('')
const stats = ref<{ starCount: number; totalResonance: number } | null>(null)

async function handleLogin() {
  loginError.value = ''
  if (!loginForm.username.trim() || !loginForm.password) return
  loginLoading.value = true
  try {
    await login(loginForm.username.trim(), loginForm.password)
    router.push('/sky')
  } catch (e: any) {
    loginError.value = e.message || '登录失败'
  } finally {
    loginLoading.value = false
  }
}

async function handleRegister() {
  regError.value = ''
  const u = regForm.username.trim()
  if (u.length < 2 || u.length > 20) { regError.value = '用户名需 2~20 个字符'; return }
  if (regForm.password.length < 6 || regForm.password.length > 50) { regError.value = '密码需 6~50 个字符'; return }
  if (regForm.password !== regForm.password2) { regError.value = '两次密码不一致'; return }
  regLoading.value = true
  try {
    await register(u, regForm.password)
    router.push('/sky')
  } catch (e: any) {
    regError.value = e.message || '注册失败'
  } finally {
    regLoading.value = false
  }
}

function enterAnonymously() {
  router.push('/sky')
}

onMounted(async () => {
  try {
    const res = await fetch('/api/stats')
    const json = await res.json()
    if (json.code === 200) stats.value = json.data
  } catch { /* 静默 */ }
})
</script>

<style scoped>
.home-page {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: #070816;
  font-family: var(--font, "Microsoft YaHei", sans-serif);
}

.particle-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.overlay {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem 1rem;
  pointer-events: none;
}

.overlay > * {
  pointer-events: auto;
}

.hero-text {
  text-align: center;
  margin-bottom: 2.5rem;
}

.title {
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 700;
  background: linear-gradient(135deg, #ffd98a, #f6f1ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.1;
  animation: glow 3s ease-in-out infinite alternate;
}

@keyframes glow {
  from { filter: drop-shadow(0 0 8px rgba(255,217,138,0.3)); }
  to { filter: drop-shadow(0 0 20px rgba(255,217,138,0.6)); }
}

.subtitle {
  font-size: clamp(1.2rem, 2.5vw, 1.8rem);
  color: #b9b4d6;
  margin-top: 0.5rem;
}

.desc {
  font-size: 0.95rem;
  color: #7a759c;
  margin-top: 0.5rem;
}

.auth-cards {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.auth-card {
  background: rgba(16, 20, 43, 0.85);
  border: 1px solid rgba(48, 55, 87, 0.6);
  border-radius: 24px;
  padding: 1.75rem 2rem;
  width: 320px;
  backdrop-filter: blur(16px);
}

.auth-card h3 {
  color: #ffd98a;
  font-size: 1.1rem;
  margin-bottom: 1.25rem;
  text-align: center;
}

.auth-card input {
  width: 100%;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(48,55,87,0.5);
  border-radius: 12px;
  color: #f6f1ff;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.auth-card input:focus {
  outline: none;
  border-color: #ffd98a;
}

.auth-card input::placeholder {
  color: #5a5580;
}

.error {
  color: #ff8b7d;
  font-size: 0.82rem;
  margin-bottom: 0.5rem;
}

.btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn.primary {
  background: linear-gradient(135deg, #996633, #cc8844);
  color: #fff;
}

.btn.primary:hover {
  background: linear-gradient(135deg, #aa7744, #ddaa55);
}

.btn.secondary {
  background: rgba(255,255,255,0.08);
  color: #b9b4d6;
}

.btn.secondary:hover {
  background: rgba(255,255,255,0.14);
}

.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.anonymous-entry {
  text-align: center;
  margin-top: 1.5rem;
}

.divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #5a5580;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(48,55,87,0.4);
}

.btn.ghost {
  width: auto;
  background: transparent;
  color: #7a759c;
  padding: 0.5rem 2rem;
  font-weight: 400;
  font-size: 0.9rem;
  border: 1px solid rgba(48,55,87,0.3);
  border-radius: 20px;
}

.btn.ghost:hover {
  color: #b9b4d6;
  border-color: rgba(48,55,87,0.6);
}

.footer-stats {
  position: absolute;
  bottom: 1.5rem;
  color: #5a5580;
  font-size: 0.78rem;
}

@media (max-width: 720px) {
  .auth-cards { flex-direction: column; align-items: center; }
  .auth-card { width: 100%; max-width: 320px; }
}
</style>
