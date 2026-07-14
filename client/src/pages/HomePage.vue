<template>
  <div class="home-page">
    <canvas ref="canvasRef" class="particle-bg" />
    <div class="overlay">
      <div class="card">
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
            <span v-else>{{ mode === 'login' ? '进 入 星 空' : '创 建 账 号' }}</span>
          </button>
        </form>

        <div class="footer">
          <button class="btn-anon" @click="enterAnonymously">
            <span class="anon-label">等</span>
          </button>
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

function switchMode(m: 'login' | 'register') {
  mode.value = m; error.value = ''
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

onMounted(async () => {
  try { const res = await fetch('/api/stats'); const json = await res.json(); if (json.code === 200) stats.value = json.data } catch {}
})
</script>

<style scoped>
.home-page {
  width: 100vw; height: 100dvh; position: relative; overflow: hidden;
  background: linear-gradient(to bottom, #070816, #10142b);
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
  -webkit-font-smoothing: antialiased;
}
.particle-bg { position: absolute; inset: 0; z-index: 0; }

.overlay {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: center;
  height: 100%; padding: 2rem 1.5rem;
}

.card {
  width: 400px; max-width: 100%;
  background: rgba(16, 20, 43, 0.45);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 217, 138, 0.15);
  border-radius: 24px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  padding: 2.2rem 2rem 1.8rem;
}

/* ── 标签页 ── */
.tabs {
  display: flex; gap: 0; margin-bottom: 1.8rem;
  border-radius: 20px; background: rgba(255, 255, 255, 0.03);
  padding: 3px;
}
.tabs button {
  flex: 1; padding: 0.42rem 0; border: none; background: transparent;
  color: rgba(246, 241, 255, 0.38); font-size: 0.88rem; cursor: pointer;
  border-radius: 18px; transition: all 0.35s ease;
}
.tabs button.active {
  background: rgba(255, 217, 138, 0.10); color: #ffd98a;
  box-shadow: 0 0 8px rgba(255, 217, 138, 0.12);
}
.tabs button:hover:not(.active) { color: rgba(246, 241, 255, 0.6); }

/* ── 标题 ── */
.title {
  text-align: center; font-size: 2.2rem; font-weight: 700;
  letter-spacing: 0.15em; color: #f6f1ff; margin: 0 0 0.35rem;
}
.slogan {
  text-align: center; font-size: 0.82rem; color: #b9b4d6;
  letter-spacing: 0.06em; margin: 0 0 1.8rem;
  font-weight: 300; line-height: 1.6;
}

/* ── 输入框 —— 极简底边线 ── */
.fields { margin-bottom: 0.5rem; }
.input-line { margin-bottom: 0.65rem; position: relative; }
.input-line::after {
  content: ''; position: absolute; bottom: 0; left: 50%; translate: -50% 0;
  width: 0; height: 1px;
  background: #ffd98a; transition: width 0.4s ease;
  box-shadow: 0 0 6px rgba(255, 217, 138, 0.6);
}
.input-line:focus-within::after { width: 100%; }

.input-line input {
  width: 100%; padding: 0.65rem 0.1rem 0.65rem 0;
  background: transparent; border: none; border-bottom: 1px solid rgba(246, 241, 255, 0.12);
  color: #f6f1ff; font-size: 0.92rem; outline: none;
  transition: border-color 0.4s ease;
}
.input-line input:focus { border-bottom-color: transparent; }
.input-line input::placeholder { color: rgba(185, 180, 214, 0.4); }

/* ── 按钮 ── */
.btn-submit {
  width: 100%; padding: 0.7rem 0; border: none; border-radius: 50px;
  background: linear-gradient(135deg, rgba(139, 185, 255, 0.25), rgba(255, 217, 138, 0.18));
  color: #ffd98a; font-size: 0.95rem; font-weight: 600;
  letter-spacing: 0.1em; cursor: pointer;
  transition: all 0.4s ease; margin-top: 1.2rem;
  border: 1px solid rgba(255, 217, 138, 0.18);
}
.btn-submit:hover:not(:disabled) {
  box-shadow: 0 0 15px rgba(255, 217, 138, 0.5), 0 0 30px rgba(139, 185, 255, 0.15);
}
.btn-submit:active:not(:disabled) { transform: scale(0.98); }
.btn-submit:disabled { opacity: 0.3; cursor: not-allowed; }

/* ── 错误 ── */
.error { color: #ff8b7d; font-size: 0.78rem; margin: 0.5rem 0 0; text-align: center; }

/* ── 底部 ── */
.footer { display: flex; align-items: center; justify-content: space-between; margin-top: 1.2rem; }
.btn-anon {
  width: 38px; height: 38px; border-radius: 50%;
  border: 1px solid rgba(255, 217, 138, 0.12);
  background: rgba(255, 217, 138, 0.04);
  color: #b9b4d6; font-size: 0.85rem; cursor: pointer;
  transition: all 0.35s ease;
  display: flex; align-items: center; justify-content: center;
}
.btn-anon:hover {
  border-color: rgba(255, 217, 138, 0.35);
  color: #ffd98a; box-shadow: 0 0 12px rgba(255, 217, 138, 0.2);
}
.stats { color: rgba(185, 180, 214, 0.35); font-size: 0.7rem; margin: 0; letter-spacing: 0.04em; }

@media (max-width: 480px) {
  .card { padding: 1.6rem 1.3rem 1.4rem; }
  .title { font-size: 1.8rem; }
}
</style>
