<template>
  <Transition name="moon-panel-fade">
    <div v-if="visible" class="moon-panel-backdrop" @click.self="$emit('close')">
      <div class="moon-panel" role="dialog" aria-modal="true" aria-label="月相预览">
        <!-- 关闭按钮 -->
        <button class="moon-panel-close" @click="$emit('close')" aria-label="关闭">
          <X :size="18" />
        </button>

        <!-- 加载中 -->
        <div v-if="loading && !data" class="moon-panel-loading">
          <div class="loading-spinner"></div>
          <p>正在计算月相...</p>
        </div>

        <!-- 错误 -->
        <div v-else-if="error" class="moon-panel-error">
          <p>{{ error }}</p>
        </div>

        <!-- 主内容 -->
        <div v-else-if="data" class="moon-panel-content">
          <!-- 月相预览图（Three.js 3D 球体） -->
          <div class="moon-preview-section">
            <div
              ref="moonCanvasRef"
              class="moon-preview-canvas"
              :class="{ 'is-css-fallback': !webglSupported }"
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
                <div class="moon-section-title">观测时间</div>
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
                <div class="moon-section-title">观测位置</div>
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
                <div class="moon-section-title">月球位置</div>
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
                <div class="moon-section-title">升落时刻</div>
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
                <div class="moon-section-title">倒计时</div>
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
              <div class="moon-schedule-title">未来 7 日月相</div>
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
  { key: 'tonight', label: '今夜' },
  { key: 'schedule', label: '日程' },
  { key: 'poem', label: '诗词' },
] as const

const activeTab = ref<typeof tabs[number]['key']>('tonight')
const selectedScheduleIdx = ref(0)

// ─── WebGL 支持检测 ────────────────────────────────────────────────

const webglSupported = checkWebGLSupport()

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
  if (!moonCanvasRef.value || !webglSupported) return

  // 清理旧场景
  disposeThreeScene()

  const container = moonCanvasRef.value
  const size = 180

  // 场景
  scene = new THREE.Scene()

  // 相机
  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, 0, 3)

  // 渲染器
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: false,
  })
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

  // 太阳光（DirectionalLight）
  sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2)
  scene.add(sunLight)

  // 地球反照（AmbientLight）—— 暗面微弱蓝光
  const earthshine = new THREE.AmbientLight(0x1a2a4a, 0.12)
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
  if (!props.data || webglSupported) return {}
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
/* ─── 背景遮罩 ─── */
.moon-panel-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

/* ─── 主面板 ─── */
.moon-panel {
  position: relative;
  width: 480px;
  max-width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  background: linear-gradient(160deg, #0d1230 0%, #0a0e26 50%, #070a1f 100%);
  border: 1px solid rgba(180, 180, 220, 0.18);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04);
  font-family: 'Noto Serif SC', 'Songti SC', 'STSong', serif;
  color: #e8e8f0;
  padding: 24px 28px 28px;
}

.moon-panel-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #c8c8d8;
  cursor: pointer;
  transition: all 0.2s;
}

.moon-panel-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

/* ─── 月相预览图 ─── */
.moon-preview-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0 20px;
}

.moon-preview-canvas {
  width: 180px;
  height: 180px;
  position: relative;
}

/* WebGL Canvas 居中 */
.moon-preview-canvas :deep(canvas) {
  display: block;
  border-radius: 50%;
  box-shadow:
    0 0 60px rgba(240, 230, 200, 0.25),
    0 0 120px rgba(240, 230, 200, 0.1);
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
    0 0 60px rgba(240, 230, 200, 0.25),
    0 0 120px rgba(240, 230, 200, 0.1);
  animation: moon-glow 5s ease-in-out infinite;
}

@keyframes moon-glow {
  0%, 100% {
    filter: drop-shadow(0 0 24px rgba(240, 230, 200, 0.15));
  }
  50% {
    filter: drop-shadow(0 0 40px rgba(240, 230, 200, 0.28));
  }
}

@media (prefers-reduced-motion: reduce) {
  .moon-preview-canvas,
  .moon-preview-canvas :deep(canvas),
  .moon-preview-canvas.is-css-fallback { animation: none; }
}

.moon-preview-info {
  margin-top: 18px;
  text-align: center;
}

.moon-phase-title {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: #f0f0f8;
  margin-bottom: 6px;
}

.moon-phase-meta {
  font-size: 13px;
  color: #a8a8c0;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  letter-spacing: 0.05em;
}

/* ─── 标签页 ─── */
.moon-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid rgba(180, 180, 220, 0.12);
  margin-bottom: 18px;
}

.moon-tab {
  flex: 1;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #a8a8c0;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.2s;
}

.moon-tab:hover {
  color: #e8e8f0;
}

.moon-tab.active {
  color: #f0f0f8;
  border-bottom-color: #c8a878;
}

/* ─── 今夜标签页 ─── */
.moon-data-section {
  margin-bottom: 18px;
}

.moon-section-title {
  font-size: 12px;
  font-weight: 600;
  color: #8888a8;
  letter-spacing: 0.15em;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(180, 180, 220, 0.08);
}

.moon-data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
}

.moon-data-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.moon-data-label {
  font-size: 11px;
  color: #7878a0;
  letter-spacing: 0.1em;
}

.moon-data-value {
  font-size: 14px;
  color: #e8e8f0;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-variant-numeric: tabular-nums;
}

.moon-data-value.visible {
  color: #c8e8c8;
}

.moon-vis-badge {
  display: inline-block;
  padding: 1px 6px;
  margin-left: 4px;
  font-size: 10px;
  background: rgba(120, 200, 120, 0.18);
  color: #88c888;
  border-radius: 8px;
  vertical-align: middle;
}

.moon-festival {
  display: inline-block;
  padding: 1px 6px;
  margin-left: 4px;
  font-size: 11px;
  background: rgba(200, 168, 120, 0.2);
  color: #d8b888;
  border-radius: 8px;
  vertical-align: middle;
}

.moon-sub {
  display: inline-block;
  margin-left: 4px;
  font-size: 11px;
  color: #7878a0;
}

/* ─── 日程标签页 ─── */
.moon-schedule-title {
  font-size: 13px;
  color: #a8a8c0;
  margin-bottom: 14px;
  letter-spacing: 0.1em;
}

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
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(180, 180, 220, 0.08);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.moon-schedule-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(200, 168, 120, 0.3);
}

.moon-schedule-item.today {
  border-color: rgba(200, 168, 120, 0.5);
  background: rgba(200, 168, 120, 0.06);
}

.moon-schedule-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 0 4px rgba(240, 230, 200, 0.15));
}

.moon-schedule-icon :deep(svg) {
  display: block;
}

.moon-schedule-date {
  font-size: 11px;
  color: #c8c8d8;
  font-family: 'JetBrains Mono', monospace;
}

.moon-schedule-phase {
  font-size: 10px;
  color: #a8a8c0;
  text-align: center;
}

.moon-schedule-illum {
  font-size: 10px;
  color: #7878a0;
  font-family: 'JetBrains Mono', monospace;
}

.moon-schedule-hint {
  margin-top: 14px;
  font-size: 11px;
  color: #7878a0;
  text-align: center;
  letter-spacing: 0.1em;
}

/* ─── 诗词标签页 ─── */
.moon-poem {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.moon-poem-section {
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(180, 180, 220, 0.08);
}

.moon-poem-section-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.moon-poem-regen,
.moon-poem-rotate {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: transparent;
  border: 1px solid rgba(180, 180, 220, 0.15);
  border-radius: 12px;
  color: #a8a8c0;
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.moon-poem-regen:hover,
.moon-poem-rotate:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #e8e8f0;
}

.moon-poem-content {
  display: flex;
  flex-direction: column;
}

.moon-poem-verse {
  font-size: 16px;
  line-height: 2;
  color: #f0f0f8;
  text-align: center;
  letter-spacing: 0.12em;
  margin-bottom: 10px;
  white-space: pre-line;
}

.moon-poem-author {
  font-size: 12px;
  color: #a8a8c0;
  text-align: right;
  margin-bottom: 10px;
}

.moon-poem-note {
  font-size: 11px;
  color: #8888a8;
  line-height: 1.7;
  padding-left: 10px;
  border-left: 2px solid rgba(180, 180, 220, 0.15);
}

.moon-poem-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  color: #a8a8c0;
  font-size: 13px;
}

/* ─── 加载与错误 ─── */
.moon-panel-loading,
.moon-panel-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #a8a8c0;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 2px solid rgba(200, 168, 120, 0.2);
  border-top-color: #c8a878;
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

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ─── 过渡动画 ─── */
.moon-panel-fade-enter-active,
.moon-panel-fade-leave-active {
  transition: opacity 0.25s ease;
}

.moon-panel-fade-enter-from,
.moon-panel-fade-leave-to {
  opacity: 0;
}

.moon-panel-fade-enter-active .moon-panel {
  animation: panel-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes panel-pop {
  0% { transform: scale(0.92); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* ─── 响应式 ─── */
@media (max-width: 540px) {
  .moon-panel {
    width: 100%;
    padding: 20px 18px;
  }

  .moon-preview-canvas {
    width: 140px;
    height: 140px;
  }

  .moon-data-grid {
    grid-template-columns: 1fr;
  }

  .moon-schedule-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
}
</style>
