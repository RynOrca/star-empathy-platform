<template>
  <div class="home-page">
    <canvas ref="canvasRef" class="particle-bg" />
    <div class="glow-orb" />
    <div class="overlay">
      <div class="double-outer" :class="{ entered: entered }">
        <div class="double-inner">
          <div class="tabs">
            <button :class="{ active: mode === 'login' }" @click="switchMode('login')">登录</button>
            <button :class="{ active: mode === 'register' }" @click="switchMode('register')">注册</button>
          </div>

          <h1 class="title">星语穹庭</h1>
          <p class="slogan">有多久没有抬头看星星了？</p>

          <form @submit.prevent="handleSubmit" autocomplete="off">
            <div class="fields">
              <div class="input-line">
                <input v-model="username" type="text" required :placeholder="mode === 'register' ? '设置用户名' : '请输入用户名'" maxlength="20" autocomplete="username" />
              </div>
              <div class="input-line">
                <input v-model="password" type="password" required :placeholder="mode === 'register' ? '设置密码' : '请输入密码'" maxlength="50" autocomplete="current-password" />
              </div>
              <div v-if="mode === 'register'" class="input-line">
                <input v-model="password2" type="password" required placeholder="再次输入密码" maxlength="50" autocomplete="new-password" />
              </div>
            </div>
            <p v-if="error" class="error">{{ error }}</p>
            <button type="submit" class="btn-submit" :disabled="loading">
              <span v-if="loading">请稍候...</span>
              <span v-else>{{ mode === 'login' ? '进入星空' : '创建账号' }}</span>
            </button>
          </form>

          <div class="bottom-text" @click="enterAnonymously">
            匿 名 浏 览 —— 不 需 登 录
          </div>
          <p class="stats" v-if="stats">{{ stats.starCount }} 颗星 · {{ stats.totalResonance }} 次共鸣</p>
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
const error = ref('')
const stats = ref<{ starCount: number; totalResonance: number } | null>(null)
const entered = ref(false)

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
  try { await login(username.value.trim(), password.value); router.push('/sky') }
  catch (e: any) { error.value = e.message || '登录失败' }
  finally { loading.value = false }
}

async function handleRegister() {
  error.value = ''
  const u = username.value.trim()
  if (u.length < 2 || u.length > 20) { error.value = '用户名需 2~20 个字符'; return }
  if (password.value.length < 6 || password.value.length > 50) { error.value = '密码需 6~50 个字符'; return }
  if (password.value !== password2.value) { error.value = '两次密码不一致'; return }
  loading.value = true
  try { await register(u, password.value); router.push('/sky') }
  catch (e: any) { error.value = e.message || '注册失败' }
  finally { loading.value = false }
}

function enterAnonymously() { router.push('/sky') }

onMounted(() => {
  requestAnimationFrame(() => { entered.value = true })
  fetch('/api/stats')
    .then(r => r.json())
    .then(j => { if (j.code === 200) stats.value = j.data })
    .catch(() => {})
})
</script>

<style scoped>
.home-page {
  width: 100vw;
  height: 100dvh;
  position: relative;
  overflow: hidden;
  background: #050508;
  font-family: "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
  color: #f6f1ff;
}
.particle-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.glow-orb {
  position: absolute;
  width: 80vh;
  height: 80vh;
  top: 18%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(255, 217, 138, 0.06) 0%, transparent 70%);
  z-index: 0;
  pointer-events: none;
}
.overlay {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem 1.5rem;
}
.double-outer {
  width: 400px;
  max-width: 100%;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 217, 138, 0.08);
  border-radius: 28px;
  padding: 2px;
  opacity: 0;
  transform: translateY(14px);
  filter: blur(4px);
  transition: opacity 900ms cubic-bezier(0.32, 0.72, 0, 1),
              transform 900ms cubic-bezier(0.32, 0.72, 0, 1),
              filter 900ms cubic-bezier(0.32, 0.72, 0, 1);
}
.double-outer.entered {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}
.double-inner {
  background: rgba(8, 11, 30, 0.6);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 26px;
  padding: 2rem 2rem 1.6rem;
}
.tabs {
  display: flex;
  gap: 0;
  margin-bottom: 1.8rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.03);
  padding: 3px;
}
.tabs button {
  flex: 1;
  padding: 0.42rem 0;
  border: none;
  background: transparent;
  color: rgba(246, 241, 255, 0.35);
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 18px;
  letter-spacing: 0.06em;
  transition: all 400ms cubic-bezier(0.32, 0.72, 0, 1);
}
.tabs button.active {
  background: rgba(255, 217, 138, 0.1);
  color: #ffd98a;
  box-shadow: 0 0 8px rgba(255, 217, 138, 0.08);
}
.tabs button:hover:not(.active) {
  color: rgba(246, 241, 255, 0.6);
}
.title {
  text-align: center;
  font-size: 2.2rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  margin: 0 0 0.4rem;
  background: linear-gradient(180deg, #fff 0%, #ffd98a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.slogan {
  text-align: center;
  font-size: 0.82rem;
  color: #b9b4d6;
  letter-spacing: 0.08em;
  margin: 0 0 1.8rem;
  font-weight: 300;
  line-height: 1.8;
}
.fields {
  margin-bottom: 0.6rem;
}
.input-line {
  margin-bottom: 0.7rem;
}
.input-line input {
  width: 100%;
  padding: 0.65rem 0.1rem;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(246, 241, 255, 0.08);
  color: #f6f1ff;
  font-size: 0.92rem;
  outline: none;
  transition: all 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}
.input-line input::placeholder {
  color: rgba(185, 180, 214, 0.35);
}
.input-line input:focus {
  border-bottom: 1px solid #ffd98a;
  box-shadow: 0 4px 14px rgba(255, 217, 138, 0.07);
}
.btn-submit {
  width: 100%;
  padding: 0.7rem 0;
  border: none;
  border-radius: 50px;
  background: rgba(255, 217, 138, 0.08);
  border: 1px solid rgba(255, 217, 138, 0.18);
  color: #ffd98a;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.45s cubic-bezier(0.32, 0.72, 0, 1);
  margin-top: 1.2rem;
}
.btn-submit:hover:not(:disabled) {
  background: rgba(255, 217, 138, 0.14);
  box-shadow: 0 0 20px rgba(255, 217, 138, 0.18),
              inset 0 0 20px rgba(255, 217, 138, 0.04);
  color: #ffe6b3;
  transform: translateY(-1px);
}
.btn-submit:active:not(:disabled) {
  transform: scale(0.985);
}
.btn-submit:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.error {
  color: #ff8b7d;
  font-size: 0.76rem;
  margin: 0.5rem 0 0;
  text-align: center;
}
.bottom-text {
  text-align: center;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: rgba(255, 217, 138, 0.3);
  margin-top: 1.2rem;
  cursor: pointer;
  transition: color 0.4s cubic-bezier(0.32, 0.72, 0, 1);
}
.bottom-text:hover {
  color: rgba(255, 217, 138, 0.6);
}
.stats {
  color: rgba(246, 241, 255, 0.2);
  font-size: 0.68rem;
  margin: 0.5rem 0 0;
  text-align: center;
}
@media (max-width: 480px) {
  .double-inner {
    padding: 1.5rem 1.3rem 1.3rem;
  }
  .title {
    font-size: 1.8rem;
    letter-spacing: 0.12em;
  }
}
</style>
