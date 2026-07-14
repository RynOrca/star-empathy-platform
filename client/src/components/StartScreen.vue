<template>
  <div class="start-screen">
    <div class="bg-stars"></div>

    <div class="center">
      <p class="eyebrow">star empathy</p>
      <h1 class="title">星语穹庭</h1>

      <p class="subtitle">
        有多久没有抬头看看星星了？从古至今，人们把思念、守望、离别和愿望寄托在星空里。<br />
        星星在故事里闪烁，而今天，你我的心事也可以成为其中一束光。
      </p>

      <!-- 加载中 -->
      <div v-if="status === 'loading'" class="loader-row">
        <svg class="star-spin" viewBox="0 0 40 40" width="38" height="38">
          <polygon
            points="20,2 25,15 38,15 28,23 31,36 20,28 9,36 12,23 2,15 15,15"
            fill="var(--accent)"
            opacity="0.95"
          />
        </svg>
        <span class="loader-text">正在连接星空…</span>
      </div>

      <!-- 主按钮 -->
      <button
        v-else-if="status === 'idle' || status === 'denied'"
        class="enter-btn"
        @click="requestGeo"
      >
        <span class="btn-dot"></span>
        进入星空 · 获取你的位置
      </button>

      <!-- 手动兜底 -->
      <div v-else-if="status === 'manual'" class="manual-card">
        <p class="manual-h">浏览器没有拿到位置，手动输入你的坐标</p>
        <div class="manual-grid">
          <label>
            <span>纬度</span>
            <input v-model.number="form.lat" type="number" step="0.01" min="-90" max="90" placeholder="39.90" />
          </label>
          <label>
            <span>经度</span>
            <input v-model.number="form.lon" type="number" step="0.01" min="-180" max="180" placeholder="116.40" />
          </label>
        </div>
        <div class="manual-actions">
          <button class="enter-btn small" @click="confirmManual">确认</button>
          <button class="ghost-btn" @click="useDefault">使用默认 · 北京</button>
        </div>
      </div>

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <p class="hint-foot">仅用于在你头顶显示此刻的真实星空 · 不会被上传</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'

export interface LocationResult { lat: number; lon: number }

const emit = defineEmits<{ ready: [loc: LocationResult] }>()

type Status = 'idle' | 'loading' | 'denied' | 'manual'
const status = ref<Status>('idle')
const errorMsg = ref('')
const form = reactive<{ lat: number | null; lon: number | null }>({ lat: null, lon: null })

function requestGeo() {
  errorMsg.value = ''
  if (!('geolocation' in navigator)) {
    status.value = 'manual'
    return
  }
  status.value = 'loading'
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      emit('ready', { lat: pos.coords.latitude, lon: pos.coords.longitude })
    },
    (err) => {
      console.warn('[StartScreen] geolocation:', err?.message ?? err)
      status.value = 'manual'
    },
    { timeout: 8000, enableHighAccuracy: false },
  )
}

function confirmManual() {
  const lat = form.lat, lon = form.lon
  if (lat == null || lon == null) {
    errorMsg.value = '请填完纬度和经度'
    return
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    errorMsg.value = '坐标超出范围'
    return
  }
  emit('ready', { lat, lon })
}

function useDefault() {
  // 北京
  emit('ready', { lat: 39.9042, lon: 116.4074 })
}
</script>

<style scoped>
.start-screen {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 50% 38%, #151a34 0, #070816 72%);
  overflow: hidden;
}

.bg-stars {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle, #f6f1ff 0 1px, transparent 1px),
    radial-gradient(circle, #ffd98a 0 1px, transparent 1px),
    radial-gradient(circle, #8bb9ff 0 1px, transparent 1px),
    radial-gradient(circle, #ffffff 0 1.2px, transparent 1.6px);
  background-size: 76px 76px, 119px 119px, 173px 173px, 240px 240px;
  background-position: 0 0, 32px 48px, 60px 10px, 120px 80px;
  opacity: 0.22;
  animation: drift 90s linear infinite;
}
@keyframes drift {
  to { background-position: 76px 0, 151px 48px, 233px 10px, 360px 80px; }
}

.center {
  position: relative;
  width: min(680px, 90vw);
  text-align: center;
  padding: 2.4rem 1.6rem 2rem;
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg2) 58%, transparent);
  border: 1px solid var(--rule);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45), inset 0 0 60px rgba(255, 217, 138, 0.05);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.eyebrow {
  display: inline-block;
  font-size: 0.84rem;
  color: var(--accent);
  letter-spacing: 0.28em;
  text-transform: uppercase;
  margin-bottom: 1.15rem;
  font-weight: 500;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(2.6rem, 9vw, 4.8rem);
  line-height: 0.96;
  letter-spacing: -0.04em;
  color: var(--ink);
  margin: 0 0 1.25rem;
  background: linear-gradient(180deg, #fff 0%, #ffd98a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: var(--muted);
  font-size: clamp(0.96rem, 1.8vw, 1.12rem);
  line-height: 1.72;
  margin: 0 auto 2.1rem;
  max-width: 42rem;
}

.enter-btn {
  position: relative;
  border: none;
  border-radius: var(--radius-lg);
  padding: 0.95rem 2.2rem;
  font-family: var(--font);
  font-size: 1.02rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #1a1228;
  background: linear-gradient(180deg, #ffe19e 0%, #ffc94d 100%);
  box-shadow: 0 10px 28px rgba(255, 201, 77, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), filter var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}
.enter-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 14px 36px rgba(255, 201, 77, 0.4);
}
.enter-btn:active { transform: translateY(1px) scale(0.98); }
.enter-btn.small { padding: 0.65rem 1.4rem; font-size: 0.92rem; }

.btn-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #1a1228;
  opacity: 0.55;
}

.loader-row {
  display: inline-flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1.6rem;
}
.star-spin { animation: spin 2s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loader-text { color: var(--muted); font-weight: 500; }

.manual-card {
  margin: 0 auto;
  max-width: 380px;
  text-align: left;
  padding: 1.2rem 1.4rem;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--surface-ground) 75%, transparent);
  border: 1px solid var(--rule);
}
.manual-h { color: var(--ink-secondary); font-size: 0.92rem; margin: 0 0 0.9rem; }
.manual-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;
  margin-bottom: 1rem;
}
.manual-grid label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  color: var(--muted-light);
  font-size: 0.8rem;
}
.manual-grid input {
  background: var(--bg2);
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  color: var(--ink);
  padding: 0.5rem 0.6rem;
  font-size: 0.92rem;
  font-family: var(--font);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.manual-grid input:focus {
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}
.manual-actions {
  display: flex;
  gap: 0.55rem;
  justify-content: flex-start;
  align-items: center;
  flex-wrap: wrap;
}
.ghost-btn {
  background: transparent;
  border: 1px solid var(--rule);
  color: var(--muted);
  padding: 0.6rem 1.1rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.86rem;
  transition: all var(--transition-fast);
}
.ghost-btn:hover {
  border-color: var(--accent-border);
  color: var(--ink);
}

.error-msg {
  color: var(--star-red);
  font-size: 0.85rem;
  margin: 0.8rem 0 0;
}

.hint-foot {
  color: var(--muted-light);
  font-size: 0.74rem;
  margin: 1.5rem 0 0;
  opacity: 0.7;
  letter-spacing: 0.02em;
}

@media (max-width: 520px) {
  .manual-grid { grid-template-columns: 1fr; }
}
</style>
