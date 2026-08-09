<template>
  <Transition name="moon-panel-fade">
    <div v-if="visible" class="moon-panel-backdrop" @click.self="$emit('close')">
      <div class="moon-panel" role="dialog" aria-modal="true" aria-label="月相预览">
        <!-- 顶部标题栏（左标题 + 右关闭按钮，避免与内容重叠） -->
        <div class="moon-panel-header">
          <div class="mph-title">
            <svg class="mph-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            <span>今月镜鉴</span>
          </div>
          <button class="mph-close-btn" @click="$emit('close')" aria-label="关闭页">
            <X :size="14" />
            <span>关闭页</span>
          </button>
        </div>

        <!-- 加载中 -->
        <div v-if="loading && !data" class="moon-panel-loading">
          <div class="loading-spinner"></div>
          <p>正在计算月相...</p>
        </div>

        <!-- 错误 -->
        <div v-else-if="error" class="moon-panel-error">
          <p>{{ error }}</p>
        </div>

        <!-- 主内容（可滚动区域，自定义滚动条） -->
        <div v-else-if="data" class="moon-panel-content moon-scrollable">
          <!-- 顶部引导条：仿 StarDetail tab-intro 风格（小板块 + icon + 标题 + 小字说明） -->
          <div class="moon-hero-strip">
            <div class="mhs-left">
              <!-- 弯月 SVG icon（和引导框色统一，暖金） -->
              <svg class="mhs-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              <span class="mhs-label">今月镜鉴</span>
              <span class="mhs-sub">· 实时计算今夜月相、观星窗口与农历时令，漫步夜色看阴晴圆缺</span>
            </div>
          </div>

          <!-- 月相预览图（Three.js 3D 球体） -->
          <div class="moon-preview-section">
            <div
              ref="moonCanvasRef"
              class="moon-preview-canvas"
              :class="{ 'is-css-fallback': !webglSupported || webglFailed }"
              :style="cssFallbackStyle"
            ></div>
            <div class="moon-preview-info">
              <div class="moon-phase-title">{{ data.phaseLabel }}</div>
              <div class="moon-phase-meta">
                照明 {{ Math.round(data.illumination * 100) }}% · 月龄 {{ data.moonAge.toFixed(1) }} 日
              </div>
            </div>
          </div>

          <!-- 标签页切换 -->
          <div class="moon-tabs">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="moon-tab"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- 标签页内容 -->
          <div class="moon-tab-content">
            <!-- 今夜 -->
          <div v-if="activeTab === 'tonight'" class="moon-tonight">
            <!-- 观测时间 -->
            <div class="moon-data-section">
              <div class="mss-head mss-time">
                <svg class="mss-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span class="mss-label">观测时间</span>
              </div>
              <div class="moon-data-grid">
                <div class="moon-data-item">
                  <span class="moon-data-label">时刻</span>
                  <span class="moon-data-value">{{ formatDateTime(data.observer.time) }}</span>
                </div>
                <div class="moon-data-item">
                  <span class="moon-data-label">时区</span>
                  <span class="moon-data-value">{{ data.observer.timezone }}</span>
                </div>
                <div class="moon-data-item">
                  <span class="moon-data-label">农历</span>
                  <span class="moon-data-value">
                    {{ data.lunar.yearGanZhi }}年 {{ data.lunar.monthChinese }}{{ data.lunar.dayChinese }}
                    <span v-if="data.lunar.festival" class="moon-festival">{{ data.lunar.festival }}</span>
                  </span>
                </div>
                <div class="moon-data-item" v-if="data.lunar.jieQi">
                  <span class="moon-data-label">节气</span>
                  <span class="moon-data-value">{{ data.lunar.jieQi }}</span>
                </div>
              </div>
            </div>

            <!-- 观测位置 -->
            <div class="moon-data-section">
              <div class="mss-head mss-loc">
                <svg class="mss-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span class="mss-label">观测位置</span>
              </div>
              <div class="moon-data-grid">
                <div class="moon-data-item">
                  <span class="moon-data-label">纬度</span>
                  <span class="moon-data-value">{{ data.observer.lat.toFixed(2) }}°</span>
                </div>
                <div class="moon-data-item">
                  <span class="moon-data-label">经度</span>
                  <span class="moon-data-value">{{ data.observer.lon.toFixed(2) }}°</span>
                </div>
              </div>
            </div>

            <!-- 月球位置 -->
            <div class="moon-data-section">
              <div class="mss-head mss-moon">
                <svg class="mss-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                <span class="mss-label">月球位置</span>
              </div>
              <div class="moon-data-grid">
                <div class="moon-data-item">
                  <span class="moon-data-label">高度</span>
                  <span class="moon-data-value" :class="{ visible: data.position.aboveHorizon }">
                    {{ data.position.altitude.toFixed(1) }}°
                    <span class="moon-vis-badge">{{ data.position.aboveHorizon ? '可见' : '地平线下' }}</span>
                  </span>
                </div>
                <div class="moon-data-item">
                  <span class="moon-data-label">方位</span>
                  <span class="moon-data-value">{{ azimuthToDirection(data.position.azimuth) }} {{ data.position.azimuth.toFixed(0) }}°</span>
                </div>
                <div class="moon-data-item">
                  <span class="moon-data-label">所在</span>
                  <span class="moon-data-value">{{ data.position.constellation }}</span>
                </div>
              </div>
            </div>

            <!-- 升落时刻 -->
            <div class="moon-data-section">
              <div class="mss-head mss-event">
                <svg class="mss-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>
                <span class="mss-label">升落时刻</span>
              </div>
              <div class="moon-data-grid">
                <div class="moon-data-item">
                  <span class="moon-data-label">月升</span>
                  <span class="moon-data-value">{{ data.events.rise ? formatClockTime(data.events.rise) : '—' }}</span>
                </div>
                <div class="moon-data-item">
                  <span class="moon-data-label">中天</span>
                  <span class="moon-data-value">
                    {{ data.events.transit ? formatClockTime(data.events.transit) : '—' }}
                    <span v-if="data.events.transit" class="moon-sub">最高 {{ data.events.transitAltitude.toFixed(0) }}°</span>
                  </span>
                </div>
                <div class="moon-data-item">
                  <span class="moon-data-label">月落</span>
                  <span class="moon-data-value">{{ data.events.set ? formatClockTime(data.events.set) : '—' }}</span>
                </div>
              </div>
            </div>

            <!-- 倒计时 -->
            <div class="moon-data-section">
              <div class="mss-head mss-count">
                <svg class="mss-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="12 6 12 12 16 14"/><path d="M6 7h-3v-3"/><path d="M18 7h3v-3"/><path d="M18 18a9 9 0 0 1-18 0"/></svg>
                <span class="mss-label">月相倒计时</span>
              </div>
              <div class="moon-data-grid">
                <div class="moon-data-item">
                  <span class="moon-data-label">距满月</span>
                  <span class="moon-data-value">{{ data.countdown.daysToFullMoon != null ? data.countdown.daysToFullMoon + ' 天' : '—' }}</span>
                </div>
                <div class="moon-data-item">
                  <span class="moon-data-label">距新月</span>
                  <span class="moon-data-value">{{ data.countdown.daysToNewMoon != null ? data.countdown.daysToNewMoon + ' 天' : '—' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 日程 -->
          <div v-else-if="activeTab === 'schedule'" class="moon-schedule">
            <div class="mss-head mss-sched mss-head-solo">
              <svg class="mss-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span class="mss-label">未来 7 日月相</span>
            </div>
            <div class="moon-schedule-grid">
                <button
                  v-for="(item, idx) in data.schedule"
                  :key="idx"
                  class="moon-schedule-item"
                  :class="{ today: idx === 0 }"
                  @click="selectedScheduleIdx = idx"
                >
                  <!-- SVG 月相小图标 -->
                  <div
                    class="moon-schedule-icon"
                    v-html="getScheduleSvg(item.phaseAngle)"
                  ></div>
                  <div class="moon-schedule-date">{{ formatScheduleDate(item.date, idx) }}</div>
                  <div class="moon-schedule-phase">{{ item.phaseLabel }}</div>
                  <div class="moon-schedule-illum">{{ Math.round(item.illumination * 100) }}%</div>
                </button>
              </div>
              <div class="moon-schedule-hint">点击日期查看详情</div>
            </div>

            <!-- 诗词 -->
            <div v-else-if="activeTab === 'poem'" class="moon-poem">
              <!-- 诗句区（不显示来源标签） -->
              <div v-if="insight" class="moon-poem-section">
                <div class="moon-poem-section-header">
                  <div class="mss-head mss-poem mss-head-inline">
                    <svg class="mss-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    <span class="mss-label">AI 月诗</span>
                  </div>
                  <button
                    v-if="!insightLoading"
                    class="moon-poem-regen"
                    @click="$emit('regen-insight')"
                    title="换一首"
                  >
                    <RefreshCw :size="13" />
                    <span>换一首</span>
                  </button>
                </div>
                <div class="moon-poem-content">
                  <div class="moon-poem-verse">{{ insight.poem }}</div>
                  <div class="moon-poem-note">{{ insight.note }}</div>
                </div>
              </div>

              <!-- 诗词区（始终显示） -->
              <div v-if="data.poem" class="moon-poem-section">
                <div class="moon-poem-section-header">
                  <div class="mss-head mss-poem-anc mss-head-inline">
                    <svg class="mss-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                    <span class="mss-label">古籍月诗</span>
                  </div>
                  <button class="moon-poem-rotate" @click="$emit('rotate-poem')" title="换一首">
                    <Shuffle :size="13" />
                    <span>换一首</span>
                  </button>
                </div>
                <div class="moon-poem-content">
                  <div class="moon-poem-verse">{{ data.poem.verse }}</div>
                  <div class="moon-poem-author">—— {{ data.poem.author }}《{{ data.poem.source.replace(/《|》/g, '') }}》</div>
                  <div class="moon-poem-note">{{ data.poem.note }}</div>
                </div>
              </div>

              <!-- 加载中（仅在 insightLoading 且无 insight 时显示） -->
              <div v-if="insightLoading && !insight" class="moon-poem-loading">
                <div class="loading-spinner small"></div>
                <span>正在为你写诗...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { X, RefreshCw, Shuffle } from 'lucide-vue-next'
import * as THREE from 'three'
import type { MoonPanelData, MoonInsight } from '../composables/useMoon'
import { moonSvg } from '../utils/moonSvg'

const props = defineProps<{
  visible: boolean
  data: MoonPanelData | null
  loading: boolean
  error: string | null
  insight: MoonInsight | null
  insightLoading: boolean
}>()

defineEmits<{
  close: []
  'regen-insight': []
  'rotate-poem': []
}>()

const tabs = [
  { key: 'tonight', label: '今夜观月' },
  { key: 'schedule', label: '月历七日' },
  { key: 'poem', label: '月色诗笺' },
] as const

const activeTab = ref<typeof tabs[number]['key']>('tonight')
const selectedScheduleIdx = ref(0)

// ─── WebGL 支持检测 ────────────────────────────────────────────────

const webglSupported = checkWebGLSupport()
// 运行时 WebGL 渲染器创建失败时置为 true，强制降级到 CSS 月相
const webglFailed = ref(false)

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
  } catch {
    return false
  }
}

// ─── Three.js 月相渲染 ─────────────────────────────────────────────

const moonCanvasRef = ref<HTMLDivElement | null>(null)
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let moonMesh: THREE.Mesh | null = null
let sunLight: THREE.DirectionalLight | null = null
let animationFrameId: number | null = null
let textureLoader: THREE.TextureLoader | null = null

/**
 * 根据 phaseAngle 计算太阳光方向（Three.js 坐标系）
 *
 * phaseAngle 语义（astronomy-engine MoonPhase）：
 *   0=新月, 90=上弦, 180=满月, 270=下弦
 *
 * 月球面向相机（+Z 方向），太阳光从月球轨道平面照射：
 * - phaseAngle=0（新月）：太阳在月球后方（+Z），全暗
 * - phaseAngle=90（上弦）：太阳在右侧（+X），右半亮
 * - phaseAngle=180（满月）：太阳在月球前方（-Z），全亮
 * - phaseAngle=270（下弦）：太阳在左侧（-X），左半亮
 */
function computeSunPosition(phaseAngle: number): THREE.Vector3 {
  const rad = phaseAngle * Math.PI / 180
  return new THREE.Vector3(
    Math.sin(rad),      // X：左右
    0,                  // Y：固定在赤道面
    -Math.cos(rad)      // Z：前后（满月时光源在相机后方，照亮月球正面）
  )
}

function initThreeScene(): void {
  if (!moonCanvasRef.value || !webglSupported || webglFailed.value) return

  // 清理旧场景
  disposeThreeScene()

  const container = moonCanvasRef.value
  const size = 180

  // 场景
  scene = new THREE.Scene()

  // 相机
  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, 0, 3)

  // 渲染器（部分设备 WebGL 上下文受限/不可用，创建失败时降级为 CSS 月相）
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: false,
    })
  } catch (e) {
    console.error('[MoonPanel] WebGL 渲染器创建失败，降级为 CSS 月相', e)
    webglFailed.value = true
    disposeThreeScene()
    return
  }
  renderer.setSize(size, size)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  // 月球球体（复用 2k_moon.jpg）
  const geometry = new THREE.SphereGeometry(1, 64, 32)
  const material = new THREE.MeshPhongMaterial({
    color: 0xcccccc,
    shininess: 2,
    specular: 0x111111,
  })

  // 异步加载纹理
  textureLoader = new THREE.TextureLoader()
  textureLoader.load(
    '/textures/planets/2k_moon.jpg',
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      material.map = texture
      material.bumpMap = texture
      material.bumpScale = 0.02
      material.needsUpdate = true
    },
    undefined,
    () => {
      // 纹理加载失败，保持纯色材质
    }
  )

  moonMesh = new THREE.Mesh(geometry, material)
  scene.add(moonMesh)

  // 太阳光（DirectionalLight）—— 高强度，确保低照明相位（残月/新月）的细月牙清晰明亮
  sunLight = new THREE.DirectionalLight(0xfff5e6, 3.0)
  scene.add(sunLight)

  // 地球反照（AmbientLight）—— 低强度暗部反照，让未照面隐约可见又不掩盖月牙相位
  const earthshine = new THREE.AmbientLight(0x8890a8, 0.22)
  scene.add(earthshine)

  // 应用初始相位
  if (props.data) {
    updateMoonPhase(props.data.phaseAngle)
  }

  // 启动动画
  animate()
}

function updateMoonPhase(phaseAngle: number): void {
  if (!sunLight) return
  const pos = computeSunPosition(phaseAngle)
  sunLight.position.copy(pos)
}

function animate(): void {
  if (!renderer || !scene || !camera || !moonMesh) return

  // 缓慢自转（增强 3D 立体感）
  moonMesh.rotation.y += 0.002

  renderer.render(scene, camera)
  animationFrameId = requestAnimationFrame(animate)
}

function disposeThreeScene(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  if (moonMesh) {
    moonMesh.geometry.dispose()
    if (Array.isArray(moonMesh.material)) {
      moonMesh.material.forEach(m => m.dispose())
    } else {
      moonMesh.material.dispose()
    }
    moonMesh = null
  }
  if (sunLight) {
    sunLight = null
  }
  if (renderer) {
    renderer.dispose()
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
    renderer = null
  }
  scene = null
  camera = null
  textureLoader = null
}

// ─── CSS 降级方案（WebGL 不支持时） ────────────────────────────────

const cssFallbackStyle = computed(() => {
  if (!props.data || (webglSupported && !webglFailed.value)) return {}
  return computeCssShadowStyle(props.data.phaseAngle)
})

function computeCssShadowStyle(phaseAngle: number): Record<string, string> {
  const angle = ((phaseAngle + 180) % 360 + 360) % 360 - 180
  if (Math.abs(angle) < 8) {
    return { '--shadow-x': '0px', '--shadow-blur': '0px', '--shadow-spread': '0px' }
  }
  if (Math.abs(angle) > 172) {
    return { '--shadow-x': '0px', '--shadow-blur': '4px', '--shadow-spread': '90px' }
  }
  const rad = angle * Math.PI / 180
  return {
    '--shadow-x': `${(-Math.sin(rad) * 55).toFixed(1)}px`,
    '--shadow-blur': '2px',
    '--shadow-spread': `${(Math.abs(Math.cos(rad)) * 45).toFixed(1)}px`,
  }
}

// ─── 7 天日程 SVG 小图标 ────────────────────────────────────────────

function getScheduleSvg(phaseAngle: number): string {
  return moonSvg(phaseAngle, 44)
}

// ─── 格式化工具 ────────────────────────────────────────────────────

function formatDateTime(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${y}-${m}-${day} ${weekdays[d.getDay()]} ${h}:${min}`
}

function formatClockTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

function formatScheduleDate(d: Date, idx: number): string {
  const m = d.getMonth() + 1
  const day = d.getDate()
  return idx === 0 ? `今天 ${m}/${day}` : `${m}/${day}`
}

function azimuthToDirection(az: number): string {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北', '北']
  const idx = Math.round(az / 45) % 8
  return dirs[idx]
}

// ─── 生命周期：面板打开/关闭时初始化/销毁 Three.js ──────────────────

watch(() => props.visible, async (v) => {
  if (v) {
    activeTab.value = 'tonight'
    selectedScheduleIdx.value = 0
    await nextTick()
    if (webglSupported) {
      initThreeScene()
    }
  } else {
    disposeThreeScene()
  }
})

// phaseAngle 变化时更新光源
watch(() => props.data?.phaseAngle, (angle) => {
  if (angle != null && webglSupported) {
    updateMoonPhase(angle)
  }
})

onBeforeUnmount(() => {
  disposeThreeScene()
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════
   背景遮罩（与 StarDetail .overlay 风格对齐）
   ═══════════════════════════════════════════════ */
.moon-panel-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(7, 8, 22, 0.3);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

/* ═══════════════════════════════════════════════
   主面板（对齐 StarDetail .panel 风格 + 设计系统 CSS 变量）
   ═══════════════════════════════════════════════ */
.moon-panel {
  position: relative;
  width: 480px;
  max-width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;           /* 滚动交给内部 moon-scrollable 容器（自定义滚动条） */
  /* 背景：使用设计系统变量，与 StarDetail .panel 一致 */
  background: var(--surface);
  backdrop-filter: blur(18px) saturate(1.2);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  /* 边框：使用 --rule（与 StarDetail 一致），再加一层暖金边（呼应月相暖色） */
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  /* 阴影：使用 --shadow-lg（与 StarDetail 一致），再加一层暖金 glow */
  box-shadow: var(--shadow-lg), var(--shadow-glow);
  font-family: var(--font);
  color: var(--ink);
}

/* ═══ 顶部标题栏（左标题 + 右"关闭页"按钮） ═══ */
.moon-panel-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 10px;
  border-bottom: 1px solid var(--border-subtle);
  background: linear-gradient(180deg, rgba(255, 217, 138, 0.035), transparent);
}
.mph-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--accent);
}
.mph-icon {
  flex-shrink: 0;
  opacity: 0.9;
  filter: drop-shadow(0 0 5px var(--accent-glow));
}
.mph-close-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-family: var(--font);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all var(--transition-normal);
}
.mph-close-btn:hover {
  color: var(--error);
  border-color: rgba(255, 139, 125, 0.28);
  background: var(--error-subtle);
}

/* ═══ 可滚动内容区（承载自定义滚动条） ═══ */
.moon-panel-content {
  padding: 16px 20px 20px;
}
.moon-scrollable {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  /* Firefox 自定义滚动条 */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 217, 138, 0.25) transparent;
}

/* WebKit 自定义滚动条（与暖金品红 UI 融合的细滚动条） */
.moon-scrollable::-webkit-scrollbar {
  width: 6px;
  background: transparent;
}
.moon-scrollable::-webkit-scrollbar-track {
  background: transparent;
  margin: 6px 0 10px;
  border-radius: 3px;
}
.moon-scrollable::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(255, 217, 138, 0.22), rgba(202, 167, 255, 0.20));
  border-radius: 3px;
  border: 1px solid rgba(255, 217, 138, 0.10);
  transition: background var(--transition-normal);
}
.moon-scrollable::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(255, 217, 138, 0.38), rgba(202, 167, 255, 0.32));
  box-shadow: 0 0 6px var(--accent-glow);
}
/* 角落（横向×纵向相交处）透明 */
.moon-scrollable::-webkit-scrollbar-corner {
  background: transparent;
}

/* ═══════════════════════════════════════════════
   顶部引导条（完全对齐 StarDetail .tab-intro 风格）
   —— 复用 tab-intro-narrative 的金紫渐变 + 暖金 icon
   ═══════════════════════════════════════════════ */
.moon-hero-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  margin: 0 0 16px;
  border-radius: 10px;
  /* 与 StarDetail .tab-intro-narrative 完全一致的渐变与边框 */
  background: linear-gradient(135deg, rgba(255, 217, 138, 0.07), rgba(202, 167, 255, 0.035));
  border: 1px solid rgba(255, 217, 138, 0.14);
}
.mhs-left {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  flex: 1;
}
.mhs-icon {
  flex-shrink: 0;
  opacity: 0.9;
  color: var(--accent);              /* 与 .tab-intro-narrative .ti-icon 同色 */
  filter: drop-shadow(0 0 5px var(--accent-glow));
}
.mhs-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink);                 /* 与 .ti-label 同色 */
  letter-spacing: 0.02em;
  flex-shrink: 0;
}
.mhs-sub {
  font-size: 0.68rem;
  color: var(--muted);               /* 与 .ti-sub 同色 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}

/* ═══════════════════════════════════════════════
   月相预览图
   ═══════════════════════════════════════════════ */
.moon-preview-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0 16px;
}
.moon-preview-canvas {
  width: 170px;
  height: 170px;
  position: relative;
}
/* WebGL Canvas 居中 */
.moon-preview-canvas :deep(canvas) {
  display: block;
  border-radius: 50%;
  box-shadow:
    0 0 48px rgba(240, 230, 200, 0.20),
    0 0 100px rgba(240, 230, 200, 0.08);
  animation: moon-glow 5s ease-in-out infinite;
}
/* CSS 降级方案 */
.moon-preview-canvas.is-css-fallback {
  border-radius: 50%;
  background:
    radial-gradient(circle at 28% 32%, rgba(80, 75, 70, 0.4) 7px, transparent 11px),
    radial-gradient(circle at 45% 28%, rgba(80, 75, 70, 0.3) 9px, transparent 14px),
    radial-gradient(circle at 62% 58%, rgba(80, 75, 70, 0.35) 11px, transparent 17px),
    radial-gradient(circle at 35% 65%, rgba(80, 75, 70, 0.25) 8px, transparent 13px),
    radial-gradient(circle at 70% 35%, rgba(80, 75, 70, 0.2) 6px, transparent 10px),
    radial-gradient(circle at 32% 32%, #f5f0e5 0%, #e8e0d0 35%, #c8c0b0 65%, #8a8275 100%);
  box-shadow:
    inset var(--shadow-x, 0px) 0 var(--shadow-blur, 0px) var(--shadow-spread, 0px) rgba(12, 12, 22, 0.92),
    0 0 48px rgba(240, 230, 200, 0.20),
    0 0 100px rgba(240, 230, 200, 0.08);
  animation: moon-glow 5s ease-in-out infinite;
}
@keyframes moon-glow {
  0%, 100% { filter: drop-shadow(0 0 22px rgba(240, 230, 200, 0.14)); }
  50%      { filter: drop-shadow(0 0 38px rgba(240, 230, 200, 0.26)); }
}
@media (prefers-reduced-motion: reduce) {
  .moon-preview-canvas,
  .moon-preview-canvas :deep(canvas),
  .moon-preview-canvas.is-css-fallback { animation: none; }
}

.moon-preview-info {
  margin-top: 16px;
  text-align: center;
}
.moon-phase-title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--accent);          /* 金色月相名，使用设计系统 --accent */
  margin-bottom: 6px;
}
.moon-phase-meta {
  font-size: 12.5px;
  color: var(--ink-secondary);
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
  opacity: 0.9;
}

/* ═══════════════════════════════════════════════
   标签页（对齐统一的"小板块"Tab 风格 + 设计系统变量）
   —— 每个 Tab 做成"小胶囊按钮"，active 为暖金渐变描边（与引导条呼应）
   ═══════════════════════════════════════════════ */
.moon-tabs {
  display: flex;
  gap: 6px;
  padding: 5px;
  margin-bottom: 18px;
  background: var(--overlay-02);
  border: 1px solid var(--accent-border);
  border-radius: 12px;
}
.moon-tab {
  flex: 1;
  padding: 8px 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 9px;
  color: var(--muted);
  font-family: var(--font);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all var(--transition-normal);
}
.moon-tab:hover { color: var(--ink-secondary); background: var(--overlay-04); }
.moon-tab.active {
  color: var(--accent);                         /* 选中：金色 accent */
  background: linear-gradient(135deg, rgba(255, 217, 138, 0.10), rgba(202, 167, 255, 0.04));
  border-color: rgba(255, 120, 196, 0.28);
  box-shadow: 0 0 0 1px var(--accent-border) inset,
              var(--shadow-glow);
}

/* ═══════════════════════════════════════════════
   数据小节 section 小标题（Mini 引导条风格 · 对齐 StarDetail .tab-intro）
   —— 每个 section 标题都有 icon + 小板块背景，与顶部 hero-strip 呼应
   ═══════════════════════════════════════════════ */
.moon-data-section { margin-bottom: 18px; }

.mss-head {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  margin-bottom: 10px;
  /* 与 StarDetail .tab-intro 默认渐变完全一致 */
  background: linear-gradient(135deg, rgba(255, 217, 138, 0.06), rgba(202, 167, 255, 0.04));
  border: 1px solid rgba(255, 217, 138, 0.12);
}
.mss-head-solo { margin-bottom: 14px; }   /* 日程 tab：单独一行 title 多留点空 */

/* 在 poem-section-header 里用 inline 版本（需要左右两侧：左边头+右边按钮） */
.mss-head-inline { margin-bottom: 0; }

/* 每个 section icon 颜色差异化（和 StarDetail 多 Tab 引导条完全一致的色板策略） */
.mss-icon { flex-shrink: 0; opacity: 0.92; }
.mss-time  .mss-icon { color: #86a8ff; filter: drop-shadow(0 0 4px rgba(134,168,255,0.35)); }  /* 观测时间 - 蓝（故事广场色） */
.mss-loc   .mss-icon { color: #caa7ff; filter: drop-shadow(0 0 4px rgba(202,167,255,0.35)); } /* 观测位置 - 紫（星史长卷色） */
.mss-moon  .mss-icon { color: var(--accent); filter: drop-shadow(0 0 4px var(--accent-glow)); } /* 月球位置 - 金（星语AI色） */
.mss-event .mss-icon { color: #ffa3b4; filter: drop-shadow(0 0 4px rgba(255,163,180,0.35)); } /* 升落时刻 - 玫瑰（我的星语色） */
.mss-count .mss-icon { color: #c6d0e4; filter: drop-shadow(0 0 4px rgba(198,208,228,0.35)); } /* 倒计时 - 银（星辰档案色） */
.mss-sched .mss-icon { color: #7fd4e0; filter: drop-shadow(0 0 4px rgba(127,212,224,0.35)); } /* 七日 - 青 */
.mss-poem      .mss-icon { color: var(--accent); filter: drop-shadow(0 0 4px var(--accent-glow)); } /* AI 月诗 - 金 */
.mss-poem-anc  .mss-icon { color: #caa7ff; filter: drop-shadow(0 0 4px rgba(202,167,255,0.35)); } /* 古籍 - 紫 */

.mss-label {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--ink-secondary);     /* 与 StarDetail 引导条次级文字一致的金色系列 section 名 */
  letter-spacing: 0.03em;
}

/* ═══════════════════════════════════════════════
   今夜观月：数据网格（统一设计系统色）
   ═══════════════════════════════════════════════ */
.moon-data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  padding-left: 4px;
}
.moon-data-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.moon-data-label {
  font-size: 10.5px;
  color: var(--muted);
  letter-spacing: 0.1em;
}
.moon-data-value {
  font-size: 13.5px;
  color: var(--ink);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.moon-data-value.visible { color: var(--success); }
.moon-vis-badge {
  display: inline-block;
  padding: 1px 6px;
  margin-left: 4px;
  font-size: 10px;
  background: var(--success-subtle);
  color: var(--success);
  border-radius: 8px;
  vertical-align: middle;
}
.moon-festival {
  display: inline-block;
  padding: 1px 6px;
  margin-left: 4px;
  font-size: 10.5px;
  background: var(--accent-subtle);
  color: var(--accent);
  border-radius: 8px;
  vertical-align: middle;
}
.moon-sub {
  display: inline-block;
  margin-left: 4px;
  font-size: 10.5px;
  color: var(--muted);
}

/* ═══════════════════════════════════════════════
   月历七日（统一设计系统色）
   ═══════════════════════════════════════════════ */
.moon-schedule-title { display: none; }   /* 已由 mss-head-sched 取代 */
.moon-schedule-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.moon-schedule-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  background: var(--overlay-02);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  cursor: pointer;
  transition: all var(--transition-normal);
}
.moon-schedule-item:hover {
  background: linear-gradient(135deg, rgba(255, 217, 138, 0.05), rgba(202, 167, 255, 0.025));
  border-color: var(--accent-border);
  box-shadow: 0 0 0 1px var(--accent-border) inset;
}
.moon-schedule-item.today {
  border-color: rgba(255, 120, 196, 0.36);
  background: linear-gradient(135deg, rgba(255, 217, 138, 0.08), rgba(202, 167, 255, 0.04));
  box-shadow: 0 0 0 1px var(--accent-border) inset,
              var(--shadow-glow);
}
.moon-schedule-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 0 4px rgba(240, 230, 200, 0.18));
}
.moon-schedule-icon :deep(svg) { display: block; }
.moon-schedule-date {
  font-size: 10.5px;
  color: var(--ink-secondary);
  font-family: var(--font-mono);
}
.moon-schedule-phase {
  font-size: 10px;
  color: var(--muted);
  text-align: center;
}
.moon-schedule-illum {
  font-size: 10px;
  color: var(--text-disabled);
  font-family: var(--font-mono);
}
.moon-schedule-hint {
  margin-top: 14px;
  font-size: 10.5px;
  color: var(--muted);
  text-align: center;
  letter-spacing: 0.08em;
  opacity: 0.85;
}

/* ═══════════════════════════════════════════════
   月色诗笺（统一设计系统色）
   ═══════════════════════════════════════════════ */
.moon-poem {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.moon-poem-section {
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(255,217,138,0.035), rgba(202,167,255,0.02));
  border: 1px solid var(--accent-border);
}
.moon-poem-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.moon-poem-regen,
.moon-poem-rotate {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  color: var(--ink-secondary);
  font-family: var(--font);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--transition-normal);
}
.moon-poem-regen:hover,
.moon-poem-rotate:hover {
  background: var(--accent-subtle);
  color: var(--accent);
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow);
}
.moon-poem-content {
  display: flex;
  flex-direction: column;
}
.moon-poem-verse {
  /* 衬线体：典雅古典感，优先 Noto Serif SC → 宋体 → 系统衬线 */
  font-family: 'Noto Serif SC', 'Songti SC', 'STSong', 'SimSun', 'Source Han Serif SC', serif;
  font-size: 15.5px;
  line-height: 2.1;
  color: var(--ink);
  text-align: center;
  letter-spacing: 0.14em;
  margin-bottom: 10px;
  white-space: pre-line;
}
.moon-poem-author {
  /* 作者行也用衬线体，字号略小，右对齐署名感 */
  font-family: 'Noto Serif SC', 'Songti SC', 'STSong', 'SimSun', 'Source Han Serif SC', serif;
  font-size: 11.5px;
  color: var(--ink-secondary);
  text-align: right;
  margin-bottom: 10px;
  padding-right: 6px;
  letter-spacing: 0.08em;
}
.moon-poem-note {
  /* 注解保留无衬线体，与诗句主次分明 */
  font-size: 10.5px;
  color: var(--muted);
  line-height: 1.75;
  padding-left: 10px;
  border-left: 2px solid var(--accent-border);
}
.moon-poem-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  color: var(--muted);
  font-size: 12.5px;
}

/* ═══════════════════════════════════════════════
   加载与错误（统一设计系统色）
   ═══════════════════════════════════════════════ */
.moon-panel-loading,
.moon-panel-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--muted);
}
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 2px solid var(--accent-border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 14px;
}
.loading-spinner.small {
  width: 14px;
  height: 14px;
  border-width: 2px;
  margin-bottom: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ═══════════════════════════════════════════════
   过渡动画（与 StarDetail .detail-wrap slideUp 节奏对齐）
   ═══════════════════════════════════════════════ */
.moon-panel-fade-enter-active,
.moon-panel-fade-leave-active {
  transition: opacity var(--duration-slow) ease;
}
.moon-panel-fade-enter-active .moon-panel,
.moon-panel-fade-leave-active .moon-panel {
  transition: transform var(--duration-slow) var(--ease-in-out);
}
.moon-panel-fade-enter-from,
.moon-panel-fade-leave-to { opacity: 0; }
.moon-panel-fade-enter-from .moon-panel,
.moon-panel-fade-leave-to .moon-panel { transform: translateY(10px); }

/* ═══════════════════════════════════════════════
   响应式
   ═══════════════════════════════════════════════ */
@media (max-width: 540px) {
  .moon-panel {
    width: 100%;
    padding: 18px 16px 22px;
    border-radius: var(--radius-xl);
  }
  .moon-hero-strip {
    padding: 7px 11px;
    margin-bottom: 14px;
  }
  .mhs-label { font-size: 0.74rem; }
  .mhs-sub   { font-size: 0.64rem; }
  .moon-preview-canvas { width: 140px; height: 140px; }
  .moon-phase-title { font-size: 18px; letter-spacing: 0.10em; }
  .moon-phase-meta { font-size: 11.5px; }
  .moon-tabs {
    gap: 4px;
    padding: 4px;
    border-radius: 10px;
    margin-bottom: 14px;
  }
  .moon-tab { font-size: 12px; padding: 7px 8px; }
  .moon-data-grid {
    grid-template-columns: 1fr;
  }
  .moon-schedule-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .mss-label { font-size: 0.70rem; }
}
</style>
