<template>
  <div class="home-page">
    <canvas ref="canvasRef" class="particle-bg" />
    <div class="overlay">
      <div class="hero">
        <h1 class="brand">星语穹庭</h1>
        <p class="tagline">有多久没有抬头看星星了？</p>
        <p class="desc">把你的故事挂上星空，让心事化作星光</p>
      </div>

      <div class="form-card">
        <div class="tabs">
          <button :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</button>
          <button :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</button>
        </div>
        <form @submit.prevent="mode === 'login' ? handleLogin() : handleRegister()">
          <div class="fields">
            <input v-model="username" type="text" placeholder="用户名" maxlength="20" required autocomplete="username" />
            <input v-model="password" type="password" placeholder="密码" maxlength="50" required autocomplete="current-password" />
            <input v-if="mode === 'register'" v-model="password2" type="password" placeholder="确认密码" maxlength="50" required autocomplete="new-password" />
          </div>
          <p v-if="error" class="error">{{ error }}</p>
          <button type="submit" class="btn-submit" :disabled="loading">
            {{ loading ? '请稍候...' : (mode === 'login' ? '进入星空' : '创建账号') }}
          </button>
        </form>
      </div>

      <div class="divider"><span>或者</span></div>
      <button class="btn-anon" @click="enterAnonymously">匿名进入 · 不登录</button>

      <p class="footer" v-if="stats">已有 {{ stats.starCount }} 颗历史星 · {{ stats.totalResonance }} 次共鸣</p>
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
useParticleSky(canvasRef as { value: HTMLCanvasElement | null })
const { login, register } = useAuth()

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const password2 = ref('')
const loading = ref(false)
const error = ref('')
const stats = ref<{ starCount: number; totalResonance: number } | null>(null)

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
.home-page { width: 100vw; height: 100dvh; position: relative; overflow: hidden; background: #070816; font-family: "Microsoft YaHei","PingFang SC",sans-serif; }
.particle-bg { position: absolute; inset: 0; z-index: 0; }
.overlay { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem 1.5rem; pointer-events: none; }
.overlay > * { pointer-events: auto; }

.hero { text-align: center; margin-bottom: 2.5rem; }
.brand {
  font-size: clamp(3.5rem, 8vw, 7rem); font-weight: 800; letter-spacing: 0.04em;
  background: linear-gradient(180deg, #fff 20%, #ffd98a 60%, #bb8844 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  line-height: 1.05; margin: 0;
  animation: titlePulse 4s ease-in-out infinite alternate;
}
@keyframes titlePulse {
  from { filter: drop-shadow(0 0 12px rgba(255,217,138,0.25)); }
  to   { filter: drop-shadow(0 0 28px rgba(255,217,138,0.45)); }
}
.tagline {
  font-size: clamp(1.1rem, 2vw, 1.5rem); color: #c4bfe0; margin: 0.8rem 0 0.3rem;
  font-weight: 300; letter-spacing: 0.03em; opacity: 0.85;
}
.desc {
  font-size: 0.9rem; color: #6b678a; margin: 0; font-weight: 300;
}

.form-card {
  background: rgba(12,16,36,0.78); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px; padding: 1.8rem 2rem; width: 360px; max-width: 100%;
  backdrop-filter: blur(20px);
}
.tabs { display: flex; gap: 0; margin-bottom: 1.5rem; border-radius: 10px; background: rgba(255,255,255,0.04); padding: 3px; }
.tabs button {
  flex: 1; padding: 0.5rem; border: none; background: transparent; color: #6b678a;
  font-size: 0.9rem; cursor: pointer; border-radius: 8px; transition: all 0.2s;
}
.tabs button.active { background: rgba(255,217,138,0.12); color: #ffd98a; }
.tabs button:hover:not(.active) { color: #a09bbf; }

.fields input {
  width: 100%; padding: 0.75rem 0.9rem; margin-bottom: 0.7rem;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px; color: #e8e4ff; font-size: 0.9rem; outline: none;
  transition: border-color 0.2s;
}
.fields input:focus { border-color: #ffd98a; background: rgba(255,255,255,0.06); }
.fields input::placeholder { color: #4a4568; }

.error { color: #ff7b6d; font-size: 0.78rem; margin: 0 0 0.5rem; }

.btn-submit {
  width: 100%; padding: 0.75rem; border: none; border-radius: 10px;
  background: #ffd98a; color: #1a1528; font-size: 0.92rem; font-weight: 700;
  cursor: pointer; transition: all 0.2s; margin-top: 0.3rem;
}
.btn-submit:hover { background: #ffe4a8; }
.btn-submit:active { transform: scale(0.98); }
.btn-submit:disabled { opacity: 0.35; cursor: not-allowed; }

.divider {
  display: flex; align-items: center; gap: 0.8rem; margin: 1.5rem 0 0.8rem;
  color: #4a4568; font-size: 0.8rem; width: 360px; max-width: 100%;
}
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.06); }

.btn-anon {
  background: transparent; border: 1px solid rgba(255,255,255,0.06); color: #5b5790;
  padding: 0.45rem 2rem; border-radius: 20px; font-size: 0.82rem; cursor: pointer;
  transition: all 0.2s;
}
.btn-anon:hover { border-color: rgba(255,255,255,0.14); color: #8b85c0; }

.footer {
  position: absolute; bottom: 1.2rem; color: #3d3860; font-size: 0.72rem;
  margin: 0; letter-spacing: 0.03em;
}
@media (max-width: 480px) {
  .form-card { width: 100%; padding: 1.4rem 1.2rem; }
  .divider { width: 100%; }
}
</style>
