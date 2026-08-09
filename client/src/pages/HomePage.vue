<template>
  <div class="home-page">
    <!-- 月亮背景（月入怀主题） -->
    <div class="moon-wrap">
      <div class="moon-ring-3"></div>
      <div class="moon-ring-2"></div>
      <div class="moon">
        <span class="mare m-a"></span>
        <span class="mare m-b"></span>
        <span class="mare m-c"></span>
        <span class="mare m-d"></span>
      </div>
    </div>

    <!-- Three.js 粒子星空背景 -->
    <canvas ref="canvasRef" class="sky-bg" />

    <div class="wrap">
      <div class="card">
        <div class="brand">
          <p class="role">· STARS · EMPATHY ·</p>
          <h1>星语穹庭</h1>
          <div class="gold-sep">◆ 月入怀 ◆</div>
          <p class="sub">在这里，每颗星星都藏着一个秘密</p>
        </div>

        <!-- 登录 / 注册 Tab -->
        <div class="tabs" v-if="mode !== 'forgot'">
          <div class="tab" :class="{ active: mode === 'login' }" @click="switchMode('login')">
            <span class="roman">Ⅰ</span>
            <span class="zh">登录</span>
          </div>
          <div class="tab" :class="{ active: mode === 'register' }" @click="switchMode('register')">
            <span class="roman">Ⅱ</span>
            <span class="zh">注册</span>
          </div>
        </div>

        <!-- 登录 -->
        <form v-if="mode === 'login'" class="auth-form" @submit.prevent="handleSubmit" autocomplete="off">
          <div class="field">
            <label for="username">观测者账号</label>
            <div class="input-wrap">
              <input
                id="username"
                v-model="username"
                type="text"
                class="form-input"
                required
                placeholder="请输入账号或邮箱"
                maxlength="20"
                autocomplete="username"
              />
            </div>
          </div>

          <div class="field">
            <label for="password">引力密钥</label>
            <div class="input-wrap">
              <input
                id="password"
                v-model="password"
                type="password"
                class="form-input"
                required
                placeholder="请输入密码"
                maxlength="50"
                autocomplete="current-password"
              />
            </div>
          </div>

          <p v-if="error" class="msg-line error">{{ error }}</p>

          <div class="row">
            <label class="remember">
              <input type="checkbox" v-model="rememberMe" />
              <span>记住我，永不坠落</span>
            </label>
            <span class="forgot" @click="switchMode('forgot')">忘记引力密钥？</span>
          </div>

          <button type="submit" class="submit" :disabled="loading">
            {{ loading ? '请稍候...' : '登 录' }}
          </button>

          <div class="divider">· OR ·</div>

          <button type="button" class="guest" :disabled="guestLoading" @click="handleGuestAccess">
            {{ guestLoading ? '正在校准...' : '匿名快捷体验' }}
          </button>
        </form>

        <!-- 注册 -->
        <form v-else-if="mode === 'register'" class="auth-form" @submit.prevent="handleSubmit" autocomplete="off">
          <div class="field">
            <label for="username">观测者账号</label>
            <div class="input-wrap">
              <input
                id="username"
                v-model="username"
                type="text"
                class="form-input"
                required
                placeholder="设置观测者账号"
                maxlength="20"
                autocomplete="username"
              />
            </div>
          </div>

          <div class="field">
            <label for="email">联络邮箱 <span class="opt">选填</span></label>
            <div class="input-wrap">
              <input
                id="email"
                v-model="email"
                type="email"
                class="form-input"
                placeholder="your@email.com（用于找回密码）"
                autocomplete="email"
              />
            </div>
          </div>

          <div class="field">
            <label for="password">引力密钥</label>
            <div class="input-wrap">
              <input
                id="password"
                v-model="password"
                type="password"
                class="form-input"
                required
                placeholder="设置引力密钥（6-50位）"
                maxlength="50"
                autocomplete="new-password"
              />
            </div>
          </div>

          <div class="field">
            <label for="confirmPassword">确认密钥</label>
            <div class="input-wrap">
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
          </div>

          <p v-if="error" class="msg-line error">{{ error }}</p>

          <button type="submit" class="submit" :disabled="loading">
            {{ loading ? '请稍候...' : '注 册' }}
          </button>

          <div class="divider">· OR ·</div>

          <button type="button" class="guest" :disabled="guestLoading" @click="handleGuestAccess">
            {{ guestLoading ? '正在校准...' : '匿名快捷体验' }}
          </button>
        </form>

        <!-- 找回密码 -->
        <div v-else class="forgot-box">
          <div class="forgot-head">
            <h2 class="forgot-title">找回引力密钥</h2>
            <div class="gold-sep">◆ 重铸 ◆</div>
          </div>
          <form class="auth-form" @submit.prevent="handleForgotSubmit" autocomplete="off">
            <div class="field">
              <label for="forgotEmail">注册邮箱</label>
              <div class="input-wrap">
                <input
                  id="forgotEmail"
                  v-model="forgotEmail"
                  type="email"
                  class="form-input"
                  required
                  placeholder="输入注册时使用的邮箱"
                  autocomplete="email"
                />
              </div>
            </div>

            <template v-if="forgotStep === 'code'">
              <div class="field">
                <label for="resetCode">验证码</label>
                <div class="input-wrap">
                  <input
                    id="resetCode"
                    v-model="resetCode"
                    type="text"
                    class="form-input"
                    required
                    placeholder="输入 6 位验证码"
                    maxlength="6"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                  />
                </div>
              </div>
              <div class="field">
                <label for="newPassword">新引力密钥</label>
                <div class="input-wrap">
                  <input
                    id="newPassword"
                    v-model="newPassword"
                    type="password"
                    class="form-input"
                    required
                    placeholder="设置新密码（6~50 字符）"
                    maxlength="50"
                    autocomplete="new-password"
                  />
                </div>
              </div>
            </template>

            <p v-if="forgotMsg" class="msg-line" :class="{ error: forgotError, success: !forgotError }">{{ forgotMsg }}</p>

            <button type="submit" class="submit" :disabled="forgotLoading">
              {{ forgotLoading ? '请稍候...' : (forgotStep === 'send' ? '发送验证码' : '重置密码') }}
            </button>

            <button type="button" class="back-link" @click="switchMode('login')">← 返回登录</button>
          </form>
        </div>

        <!-- 底部统计 -->
        <p v-if="stats" class="stats">· <b>{{ fmt(stats.starCount) }}</b> 颗星 · <b>{{ fmt(stats.totalResonance) }}</b> 次共鸣 ·</p>
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

const mode = ref<'login' | 'register' | 'forgot'>('login')
const username = ref('')
const email = ref('')
const password = ref('')
const password2 = ref('')
const rememberMe = ref(false)
const loading = ref(false)
const guestLoading = ref(false)
const error = ref('')
const stats = ref<{ starCount: number; totalResonance: number } | null>(null)

/** 统计数字千分位格式化（如 2384 → 2,384） */
function fmt(n: number): string {
  return Number(n).toLocaleString('en-US')
}

// ─── 找回密码 ───
const forgotStep = ref<'send' | 'code'>('send')
const forgotEmail = ref('')
const resetCode = ref('')
const newPassword = ref('')
const forgotLoading = ref(false)
const forgotMsg = ref('')
const forgotError = ref(false)

function switchMode(m: 'login' | 'register' | 'forgot') {
  mode.value = m
  error.value = ''
  forgotMsg.value = ''
  forgotError.value = false
  forgotStep.value = 'send'
  forgotEmail.value = ''
  resetCode.value = ''
  newPassword.value = ''
}

async function handleForgotSubmit() {
  forgotMsg.value = ''
  forgotError.value = false
  if (!forgotEmail.value.trim()) return

  if (forgotStep.value === 'send') {
    // 发送验证码
    forgotLoading.value = true
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.value.trim() }),
      })
      const json = await res.json()
      if (res.ok) {
        forgotMsg.value = json.message || '验证码已发送'
        forgotError.value = false
        forgotStep.value = 'code'
      } else {
        forgotMsg.value = json.message || '发送失败'
        forgotError.value = true
      }
    } catch {
      forgotMsg.value = '网络错误，请重试'
      forgotError.value = true
    } finally {
      forgotLoading.value = false
    }
  } else {
    // 重置密码
    if (!resetCode.value.trim() || resetCode.value.trim().length !== 6) {
      forgotMsg.value = '请输入 6 位验证码'
      forgotError.value = true
      return
    }
    if (!newPassword.value || newPassword.value.length < 6) {
      forgotMsg.value = '新密码需 6~50 个字符'
      forgotError.value = true
      return
    }
    forgotLoading.value = true
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.value.trim(),
          code: resetCode.value.trim(),
          newPassword: newPassword.value,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        forgotMsg.value = '密码重置成功，请登录'
        forgotError.value = false
        setTimeout(() => switchMode('login'), 2000)
      } else {
        forgotMsg.value = json.message || '重置失败'
        forgotError.value = true
      }
    } catch {
      forgotMsg.value = '网络错误，请重试'
      forgotError.value = true
    } finally {
      forgotLoading.value = false
    }
  }
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
    await login(username.value.trim(), password.value, rememberMe.value)
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
    await register(u, password.value, email.value.trim() || undefined)
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
    if (!res.ok) throw new Error(json.message || '请求失败')
    localStorage.setItem('token', json.data.token)
    localStorage.setItem('username', '星穹访客')
    localStorage.setItem('userId', String(json.data.user.id))
    router.push('/sky')
  } catch (e: any) {
    error.value = e.message || '访客登录失败'
  } finally {
    guestLoading.value = false
  }
}

onMounted(async () => {
  try {
    const r = await fetch('/api/stats')
    const j = await r.json()
    if (r.ok) stats.value = j.data
  } catch {}
})
</script>

<style scoped>
/* ═══ 页面基底：深空渐变（与 welcome 同源） ═══ */
.home-page {
  width: 100%;
  min-height: 100dvh;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 30%, var(--bg-overlay) 0%, #0a0c1d 60%, #02040a 100%);
  color: var(--text-primary);
  font-family: 'Noto Serif SC', serif;
  -webkit-font-smoothing: antialiased;
}

/* ═══ Three.js 粒子星空背景（与 welcome 同款，全屏底层） ═══ */
.sky-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
}

/* ═══ 月亮背景层（月入怀主题） ═══ */
.moon-wrap {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  pointer-events: none;
}
.moon {
  width: min(62vmin, 520px);
  height: min(62vmin, 520px);
  max-width: 520px;
  max-height: 520px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #f5e6c5 0%, #d8c19a 35%, #8a7a5a 70%, #3a3325 100%);
  box-shadow:
    0 0 120px rgba(255, 217, 138, 0.18),
    0 0 240px rgba(255, 217, 138, 0.08),
    inset -40px -40px 120px rgba(0, 0, 0, 0.4);
  position: relative;
  animation: moonBreathe 8s ease-in-out infinite;
  opacity: 0.85;
}
@keyframes moonBreathe {
  0%, 100% {
    box-shadow:
      0 0 120px rgba(255, 217, 138, 0.18),
      0 0 240px rgba(255, 217, 138, 0.08),
      inset -40px -40px 120px rgba(0, 0, 0, 0.4);
  }
  50% {
    box-shadow:
      0 0 160px rgba(255, 217, 138, 0.25),
      0 0 320px rgba(255, 217, 138, 0.12),
      inset -40px -40px 120px rgba(0, 0, 0, 0.4);
  }
}
.moon .mare {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(80, 65, 45, 0.55), rgba(80, 65, 45, 0.1));
  filter: blur(1px);
}
.moon .m-a { width: 27%; height: 18%; top: 22%; left: 18%; transform: rotate(-15deg); }
.moon .m-b { width: 19%; height: 14%; top: 52%; left: 14%; transform: rotate(10deg); }
.moon .m-c { width: 23%; height: 15%; top: 58%; left: 48%; transform: rotate(-8deg); }
.moon .m-d { width: 12%; height: 9%; top: 30%; left: 60%; }
.moon-ring-2 {
  position: absolute;
  width: min(82vmin, 680px);
  height: min(82vmin, 680px);
  max-width: 680px;
  max-height: 680px;
  border-radius: 50%;
  border: 1px dashed rgba(202, 167, 255, 0.15);
  animation: slowRot 80s linear infinite;
}
.moon-ring-3 {
  position: absolute;
  width: min(98vmin, 820px);
  height: min(98vmin, 820px);
  max-width: 820px;
  max-height: 820px;
  border-radius: 50%;
  border: 1px solid rgba(255, 217, 138, 0.06);
}
@keyframes slowRot {
  to { transform: rotate(360deg); }
}

/* ═══ 布局：居中卡片 ═══ */
.wrap {
  position: relative;
  z-index: 5;
  width: 100%;
  min-height: 100dvh;
  display: flex;
  padding: 40px 16px;
}
.card {
  margin: auto;
  width: 100%;
  max-width: 460px;
  background: var(--bg-overlay);
  background: color-mix(in srgb, var(--bg-overlay) 78%, transparent);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 40px 40px 34px;
  position: relative;
  box-shadow: var(--shadow-lg), 0 0 60px var(--accent-glow);
  animation: cardIn 0.9s cubic-bezier(0.2, 0.9, 0.3, 1) both;
}
.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(90deg, var(--accent) 0%, var(--star-purple) 50%, var(--accent) 100%);
  background-size: 200% 100%;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  animation: goldflow 5s linear infinite;
}
@keyframes goldflow {
  to { background-position: 200% 0; }
}
@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* ═══ 品牌区（与 welcome 开场呼应） ═══ */
.brand {
  text-align: center;
  margin-bottom: 26px;
}
.brand .role {
  font-family: var(--font-display);
  font-size: 0.7rem;
  letter-spacing: 0.35em;
  color: var(--accent);
  opacity: 0.7;
  margin-bottom: 12px;
}
.brand h1 {
  font-family: 'Cinzel', 'Noto Serif SC', serif;
  font-weight: 600;
  font-size: 2rem;
  letter-spacing: 0.35em;
  background: linear-gradient(180deg, #ffe9bd 0%, var(--accent) 38%, #c0a678 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 10px;
  padding-left: 0.35em;
  filter: drop-shadow(0 0 18px rgba(255, 217, 138, 0.2));
}
.brand .sub {
  color: var(--text-muted);
  font-size: 0.82rem;
  letter-spacing: 0.18em;
  line-height: 1.9;
}
.gold-sep {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 16px 0 12px;
  color: var(--accent);
  opacity: 0.45;
  font-family: var(--font-display);
  font-size: 0.7rem;
  letter-spacing: 0.2em;
}
.gold-sep::before,
.gold-sep::after {
  content: '';
  height: 1px;
  width: 60px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 0.35;
}

/* ═══ 登录 / 注册 Tab（罗马数字） ═══ */
.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--border-subtle);
}
.tab {
  padding: 12px 8px 14px;
  text-align: center;
  cursor: pointer;
  color: var(--text-disabled);
  transition: color 0.35s;
  font-family: var(--font-display);
  font-size: 0.82rem;
  letter-spacing: 0.25em;
  position: relative;
  user-select: none;
}
.tab .roman {
  display: block;
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 4px;
  color: inherit;
}
.tab .zh {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.82rem;
  letter-spacing: 0.3em;
}
.tab.active {
  color: var(--accent);
}
.tab.active .roman {
  color: var(--accent);
}
.tab.active::after {
  content: '';
  position: absolute;
  left: 20%;
  right: 20%;
  bottom: -1px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  box-shadow: 0 0 12px var(--accent-glow);
}

/* ═══ 表单 ═══ */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.field label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.field label .opt {
  font-family: var(--font-display);
  font-size: 0.68rem;
  color: var(--text-disabled);
  letter-spacing: 0.15em;
  font-weight: 400;
}
.input-wrap {
  position: relative;
}
.input-wrap::before {
  content: '';
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.5;
  box-shadow: 0 0 8px var(--accent-glow);
}
.form-input {
  width: 100%;
  padding: 13px 16px 13px 32px;
  background: var(--overlay-02);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.92rem;
  font-family: inherit;
  outline: none;
  transition: all 0.35s;
  letter-spacing: 0.03em;
}
.form-input:focus {
  border-color: var(--rule-focus);
  background: var(--accent-subtle);
  box-shadow: 0 0 0 3px var(--accent-glow), inset 0 0 20px var(--accent-glow);
}
.form-input::placeholder {
  color: var(--text-disabled);
  opacity: 0.65;
  letter-spacing: 0.05em;
}

/* ═══ 记住我 / 忘记密码 ═══ */
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.78rem;
  margin-top: -4px;
}
.remember {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
}
.remember input {
  accent-color: var(--accent);
  width: 14px;
  height: 14px;
  cursor: pointer;
}
.forgot {
  color: var(--star-purple);
  letter-spacing: 0.1em;
  cursor: pointer;
  user-select: none;
}
.forgot:hover {
  color: var(--accent);
}

/* ═══ 提交按钮（金色渐变 + 扫光） ═══ */
.submit {
  margin-top: 6px;
  padding: 14px;
  border: none;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #c99a3c 0%, var(--accent) 45%, #e8c570 100%);
  color: var(--bg-overlay);
  font-family: var(--font-display), 'Noto Serif SC', serif;
  font-weight: 600;
  letter-spacing: 0.3em;
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: 0 8px 28px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: all 0.35s;
  position: relative;
  overflow: hidden;
}
.submit::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  transform: translateX(-120%);
  transition: transform 0.8s;
}
.submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 14px 40px var(--accent-glow);
}
.submit:hover:not(:disabled)::before {
  transform: translateX(120%);
}
.submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ═══ 分隔线 / 访客按钮 ═══ */
.divider {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--text-disabled);
  font-family: var(--font-display);
  font-size: 0.72rem;
  letter-spacing: 0.3em;
  margin: 22px 0 16px;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border-default), transparent);
}
.guest {
  padding: 13px;
  background: transparent;
  border: 1px solid rgba(202, 167, 255, 0.3);
  color: var(--star-purple);
  border-radius: var(--radius-md);
  font-family: 'Noto Serif SC', serif;
  font-size: 0.85rem;
  letter-spacing: 0.25em;
  cursor: pointer;
  transition: all 0.35s;
  text-align: center;
  width: 100%;
}
.guest:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--star-purple) 6%, transparent);
  color: #e2d4ff;
  border-color: rgba(202, 167, 255, 0.6);
  box-shadow: 0 0 15px rgba(202, 167, 255, 0.15) inset;
}
.guest:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ═══ 提示 / 返回 / 统计 ═══ */
.msg-line {
  font-size: 0.8rem;
  text-align: center;
  letter-spacing: 0.05em;
}
.msg-line.error { color: var(--error); }
.msg-line.success { color: var(--success); }
.back-link {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0;
  margin-top: 4px;
  transition: color 0.2s;
  text-align: center;
  width: 100%;
  letter-spacing: 0.05em;
  font-family: 'Noto Serif SC', serif;
}
.back-link:hover { color: var(--accent); }
.stats {
  margin-top: 24px;
  text-align: center;
  color: var(--text-muted);
  opacity: 0.5;
  font-family: var(--font-display);
  font-size: 0.7rem;
  letter-spacing: 0.2em;
}
.stats b {
  color: var(--accent);
  opacity: 0.6;
  font-weight: 500;
}

/* ═══ 找回密码 ═══ */
.forgot-head {
  text-align: center;
  margin-bottom: 20px;
}
.forgot-title {
  font-family: 'Cinzel', 'Noto Serif SC', serif;
  font-size: 1.4rem;
  letter-spacing: 0.25em;
  font-weight: 600;
  color: var(--text-primary);
}
.forgot-head .gold-sep {
  margin: 12px 0 0;
}

/* ═══ 响应式 ═══ */
@media (max-width: 520px) {
  .card {
    padding: 32px 24px 28px;
  }
}
@media (max-width: 768px) {
  .home-page {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .wrap {
    padding: 24px 16px;
  }
  .form-input {
    padding: 14px 16px 14px 32px;
    font-size: 1rem;
  }
}

/* ═══ 尊重用户的减少动画偏好 ═══ */
@media (prefers-reduced-motion: reduce) {
  .card,
  .moon,
  .moon-ring-2 {
    animation: none;
  }
  .card::before {
    animation: none;
  }
  .tab,
  .form-input,
  .submit,
  .guest,
  .forgot,
  .back-link {
    transition: none;
  }
}
</style>
