<template>
  <div class="welcome-page" @click="handleEnter">
    <!-- 保底背景：淡星云（永远渲染，即使 WebGL 不可用也不是纯黑） -->
    <div class="nebula" />

    <!-- Three.js 粒子星空（与 HomePage/SkyPage 同风格，加载后淡入） -->
    <canvas ref="canvasRef" class="sky-bg" :class="{ ready: skyLoaded }" />

    <!-- 上下电影遮幅：点击后 exit 收缩拉开帷幕 -->
    <OpeningLetterbox :exit="phase !== 'idle'" />

    <!-- 安全区核心文案 -->
    <div class="safe">
      <OpeningHero />
    </div>

    <!-- 切页过渡：闪光灯 + 黑幕 -->
    <OpeningTransition :trigger="phase !== 'idle'" @after="handleAfter" />

    <!-- 闪烁噪点暗角（入场 200ms 三次闪烁） -->
    <div class="vignette" :class="{ on: flickerOn }" />

    <!-- 点击反馈 toast -->
    <div v-if="toastOn" class="toast">目光穿越 120 光年，降临穹庭...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useParticleSky } from '../composables/useParticleSky'
import { useFlickerVignette } from '../composables/useFlickerVignette'
import { useScreenShake } from '../composables/useScreenShake'
import OpeningLetterbox from '../components/OpeningLetterbox.vue'
import OpeningHero from '../components/OpeningHero.vue'
import OpeningTransition from '../components/OpeningTransition.vue'

/**
 * 开场页（/welcome）
 * 只做编排：星空背景 + 子组件拼装 + 点击时序状态机，不承载视觉细节。
 *
 * 点击进入时序（与原型对齐）：
 *   0ms    phase='entering' → 遮幅收缩(880ms) + 闪光灯(0.9s) + 震动 + toast
 *   120ms  黑幕开始淡入（1.22s 到完全黑）
 *   ~1340ms 黑幕全覆盖 → OpeningTransition emit after → 记录 welcomed → router.push
 *   黑幕后切页用户看不见，新页面在 App.vue 的 page-fade 过渡下淡入
 */
const router = useRouter()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const { loaded: skyLoaded } = useParticleSky(canvasRef as { value: HTMLCanvasElement | null })
const { flickerOn, start: startFlicker } = useFlickerVignette()
const { shake } = useScreenShake()

const phase = ref<'idle' | 'entering' | 'gone'>('idle')
const toastOn = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  startFlicker()
})

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
})

function handleEnter() {
  if (phase.value !== 'idle') return
  phase.value = 'entering'

  // 震动反馈 + toast（不支持震动的浏览器走 CSS shake fallback）
  shake()
  toastOn.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastOn.value = false
    toastTimer = null
  }, 3400)
}

/** 黑幕完全覆盖后：记 welcomed，再切页（用户看不见瞬切） */
function handleAfter() {
  if (phase.value === 'gone') return
  phase.value = 'gone'
  sessionStorage.setItem('welcomed', '1')

  const token = localStorage.getItem('token')
  if (token) {
    router.push('/sky') // 已登录 → 主星空
  } else {
    router.push('/') // 未登录 → 登录页
  }
}
</script>

<style scoped>
.welcome-page {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  background: #05060f;
  color: #e8e4ff;
  overflow: hidden;
  cursor: pointer;
}

/* ═══ 保底背景第 1 层：淡星云底色 ═══ */
.nebula {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(
      ellipse 80% 60% at 50% 50%,
      rgba(134, 168, 255, 0.1) 0%,
      rgba(202, 167, 255, 0.06) 38%,
      rgba(5, 6, 15, 0) 75%
    ),
    radial-gradient(
      ellipse 55% 40% at 22% 38%,
      rgba(255, 217, 138, 0.08) 0%,
      rgba(5, 6, 15, 0) 70%
    ),
    radial-gradient(
      ellipse 50% 38% at 78% 68%,
      rgba(160, 180, 220, 0.07) 0%,
      rgba(5, 6, 15, 0) 70%
    );
}

/* ═══ Three.js 星空增强层（加载成功后淡入覆盖） ═══ */
.sky-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 1;
  opacity: 0;
  transition: opacity 1.6s ease;
}
.sky-bg.ready {
  opacity: 1;
}

/* ═══ 安全区：上下遮幅之间的核心内容区 ═══ */
.safe {
  position: absolute;
  top: 14.24vh;
  bottom: 14.24vh;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 4vw;
}

/* ═══ 入场闪烁噪点暗角（200ms 三次闪烁，加 .on 触发一次） ═══ */
.vignette {
  position: fixed;
  inset: 0;
  z-index: 14;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(
    ellipse 62% 55% at 50% 50%,
    rgba(5, 6, 15, 0) 58%,
    rgba(5, 6, 15, 0.34) 100%
  );
}
.vignette.on {
  animation: flickerGo 0.2s steps(1, end) forwards;
}
@keyframes flickerGo {
  0% {
    opacity: 0;
  }
  12% {
    opacity: 0.5;
  }
  30% {
    opacity: 0;
  }
  50% {
    opacity: 0.34;
  }
  68% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

/* ═══ 点击反馈 toast ═══ */
.toast {
  position: fixed;
  left: 50%;
  bottom: 8.5vh;
  transform: translateX(-50%);
  z-index: 25;
  font-family: 'Noto Serif SC', serif;
  font-size: 0.72rem;
  letter-spacing: 0.15em;
  color: rgba(232, 228, 255, 0.6);
  opacity: 0;
  pointer-events: none;
  white-space: nowrap;
  animation:
    toastIn 0.8s 0.4s ease forwards,
    toastOut 0.8s 2.4s ease forwards;
}
@keyframes toastIn {
  to {
    opacity: 1;
  }
}
@keyframes toastOut {
  to {
    opacity: 0;
  }
}

/* 无障碍：用户偏好减少动态效果时停用全部动画 */
@media (prefers-reduced-motion: reduce) {
  .vignette.on {
    animation: none;
  }
  .toast {
    animation: none;
    opacity: 0;
  }
}
</style>

<!-- 屏幕震动 CSS fallback（body 级类，须全局生效） -->
<style>
.screen-shake {
  animation: screenShake 0.4s ease-out;
}
@keyframes screenShake {
  0% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(-2px, 1px);
  }
  50% {
    transform: translate(2px, -1px);
  }
  75% {
    transform: translate(-1px, -1px);
  }
  100% {
    transform: translate(0, 0);
  }
}
</style>
