import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Points,
  BufferGeometry,
  BufferAttribute,
  PointsMaterial,
  CanvasTexture,
  Raycaster,
  Vector2,
  Vector3,
  Clock,
  Sprite,
  SpriteMaterial,
  LineSegments,
  LineBasicMaterial,
  AdditiveBlending,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  SPHERE_RADIUS,
  DEFAULT_FOV,
  FOV_MIN,
  FOV_MAX,
  FOV_ZOOM_STEP,
  BREATHING_AMPLITUDE,
  BREATHING_PERIOD,
  RAYCASTER_THRESHOLD,
  STAR_COLORS,
  HIGH_RESONANCE_THRESHOLD,
  NEARBY_LINE_COUNT,
} from '../utils/constants'

// ─── 星表数据 ─────────────────────────────
interface CatalogStar {
  id: number
  name: string | null
  ra: number
  dec: number
  mag: number
  color: string
  con: string
  x: number
  y: number
  z: number
}

import catalogData from '../data/stars.json'
const CATALOG: CatalogStar[] = catalogData as CatalogStar[]

// ─── 故事星映射 ────────────────────────────
export interface StoryAttachment {
  storyId: number       // 后端 story id
  catalogStarId: number // 对应星表恒星 id
  type: 'history' | 'user'
  title: string | null
  content: string
  resonanceCount: number
}

// ─── 工具函数 ──────────────────────────────
function hexToRGB(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b]
}

function createGlowTexture(innerColor: string, size: number): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const half = size / 2
  const gradient = ctx.createRadialGradient(half, half, half * 0.05, half, half, half)
  gradient.addColorStop(0, innerColor)
  gradient.addColorStop(0.25, innerColor)
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}

// magnitude → 粒子大小 (星等越小=越亮=越大)
function magToSize(mag: number): number {
  // 一等星 ~8, 六等星 ~1.5
  return Math.max(1.5, (7.0 - mag) * 1.6)
}

export interface SkyAPI {
  scene: Scene
  camera: PerspectiveCamera
  overlayPoints: Points
  attachStories: (attachments: StoryAttachment[]) => void
  attachOneStory: (attachment: StoryAttachment) => void
  getHoveredIndex: (event: MouseEvent) => number
  getStarAt: (index: number) => { catalog: CatalogStar; attachment: StoryAttachment | null }
  getScreenPos: (worldPos: Vector3) => { x: number; y: number }
  highlightPosition: (worldPos: Vector3) => void
  clearHighlight: () => void
  showConstellationLines: (centerPos: Vector3, neighbors: Vector3[]) => void
  clearConstellationLines: () => void
  pauseBreathing: () => void
  resumeBreathing: () => void
  dispose: () => void
}

export function useSky(canvasRef: { value: HTMLCanvasElement | null }): SkyAPI {
  if (!canvasRef.value) throw new Error('Canvas ref is null')
  const canvas = canvasRef.value

  // ─── 场景 / 相机 / 渲染器 ────────────────────
  const scene = new Scene()
  const camera = new PerspectiveCamera(DEFAULT_FOV, canvas.clientWidth / canvas.clientHeight, 0.5, SPHERE_RADIUS * 3)
  // 相机放在接近球心的位置，略偏移避免退化
  camera.position.set(0, 0.1, 0.1)

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // ─── 真实星表渲染 (统一星空) ────────────────
  const totalStars = CATALOG.length
  const positions = new Float32Array(totalStars * 3)
  const colors = new Float32Array(totalStars * 3)
  const sizes = new Float32Array(totalStars)

  for (let i = 0; i < totalStars; i++) {
    const s = CATALOG[i]
    positions[i * 3] = s.x
    positions[i * 3 + 1] = s.y
    positions[i * 3 + 2] = s.z
    // 提亮颜色（AdditiveBlending 下暗色看不见）
    const brightness = s.mag < 3 ? 1.0 : s.mag < 5 ? 0.75 : 0.5
    const [r, g, b] = hexToRGB(s.color)
    colors[i * 3] = Math.min(1, r * brightness + 0.2)
    colors[i * 3 + 1] = Math.min(1, g * brightness + 0.2)
    colors[i * 3 + 2] = Math.min(1, b * brightness + 0.2)
    sizes[i] = magToSize(s.mag)
  }
  console.log(`🌟 Loaded ${totalStars} catalog stars, sample:`, CATALOG[0])

  const starGeometry = new BufferGeometry()
  starGeometry.setAttribute('position', new BufferAttribute(positions, 3))
  starGeometry.setAttribute('color', new BufferAttribute(colors, 3))

  const starTexture = createGlowTexture('white', 32)
  const starMaterial = new PointsMaterial({
    size: 7,
    map: starTexture,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    transparent: true,
    opacity: 0.9,
    vertexColors: true,
    sizeAttenuation: true,
  })

  const starPoints = new Points(starGeometry, starMaterial)
  scene.add(starPoints)

  // ─── 故事星高亮层 (金色/蓝色/绿色 overlay) ──
  // 用于覆盖有故事的星星
  const overlayGeometry = new BufferGeometry()
  const emptyPos = new Float32Array(0)
  const emptyCol = new Float32Array(0)
  overlayGeometry.setAttribute('position', new BufferAttribute(emptyPos, 3))
  overlayGeometry.setAttribute('color', new BufferAttribute(emptyCol, 3))

  const overlayMaterial = new PointsMaterial({
    size: 10,
    map: createGlowTexture('white', 48),
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    transparent: true,
    opacity: 0.85,
    vertexColors: true,
    sizeAttenuation: true,
  })

  const overlayPoints = new Points(overlayGeometry, overlayMaterial)
  scene.add(overlayPoints)

  // ─── 故事 → 星表映射 ──────────────────────
  const storyMap = new Map<number, StoryAttachment>() // catalogStarId → StoryAttachment

  function getStoryColor(att: StoryAttachment): string {
    if (att.type === 'history') {
      return att.resonanceCount >= HIGH_RESONANCE_THRESHOLD
        ? STAR_COLORS.highResonanceHistory
        : STAR_COLORS.history
    } else {
      return att.resonanceCount >= HIGH_RESONANCE_THRESHOLD
        ? STAR_COLORS.highResonance
        : STAR_COLORS.user
    }
  }

  function rebuildOverlay() {
    const count = storyMap.size
    const posArr = new Float32Array(count * 3)
    const colArr = new Float32Array(count * 3)
    let idx = 0
    for (const [catId, att] of storyMap) {
      const star = CATALOG[catId]
      if (!star) continue
      posArr[idx * 3] = star.x
      posArr[idx * 3 + 1] = star.y
      posArr[idx * 3 + 2] = star.z
      const [r, g, b] = hexToRGB(getStoryColor(att))
      colArr[idx * 3] = r
      colArr[idx * 3 + 1] = g
      colArr[idx * 3 + 2] = b
      idx++
    }
    overlayPoints.geometry.dispose()
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(posArr, 3))
    geo.setAttribute('color', new BufferAttribute(colArr, 3))
    overlayPoints.geometry = geo
  }

  function attachStories(attachments: StoryAttachment[]) {
    storyMap.clear()
    for (const att of attachments) {
      storyMap.set(att.catalogStarId, att)
    }
    rebuildOverlay()
  }

  function attachOneStory(att: StoryAttachment) {
    storyMap.set(att.catalogStarId, att)
    rebuildOverlay()
  }

  // ─── 轨道控制 ──────────────────────────────
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enablePan = false
  controls.enableZoom = false
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minPolarAngle = Math.PI / 8
  controls.maxPolarAngle = (Math.PI * 7) / 8
  controls.rotateSpeed = 0.4
  // 初始看向天球前方（+Z方向的天区，包含猎户座等冬季亮星）
  controls.target.set(0, 0, SPHERE_RADIUS)

  // ─── FOV 缩放 ──────────────────────────────
  let userInteracting = false
  let interactionTimer = 0
  const interactionTimeout = 3.0

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    userInteracting = true
    interactionTimer = 0
    const delta = e.deltaY > 0 ? FOV_ZOOM_STEP : -FOV_ZOOM_STEP
    camera.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, camera.fov + delta))
    camera.updateProjectionMatrix()
  }, { passive: false })

  canvas.addEventListener('pointerdown', () => {
    userInteracting = true
    interactionTimer = 0
  })

  // ─── Raycaster ────────────────────────────
  const raycaster = new Raycaster()
  raycaster.params.Points!.threshold = RAYCASTER_THRESHOLD

  function getHoveredIndex(event: MouseEvent): number {
    const rect = canvas.getBoundingClientRect()
    const mouse = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(mouse, camera)
    // 先检测 overlay (故事星)，再检测主星表
    const intersects = raycaster.intersectObjects([overlayPoints, starPoints])
    if (intersects.length > 0) {
      // 如果命中 overlay，通过 position 匹配找到主星表 index
      const hitPos = intersects[0].point
      const posArr = starGeometry.attributes.position.array as Float32Array
      let closestIdx = -1
      let minDist = Infinity
      for (let i = 0; i < totalStars; i++) {
        const dx = hitPos.x - posArr[i * 3]
        const dy = hitPos.y - posArr[i * 3 + 1]
        const dz = hitPos.z - posArr[i * 3 + 2]
        const d = dx * dx + dy * dy + dz * dz
        if (d < minDist) { minDist = d; closestIdx = i }
      }
      return closestIdx
    }
    return -1
  }

  function getStarAt(index: number): { catalog: CatalogStar; attachment: StoryAttachment | null } {
    return {
      catalog: CATALOG[index],
      attachment: storyMap.get(index) ?? null,
    }
  }

  function getScreenPos(worldPos: Vector3): { x: number; y: number } {
    const vec = worldPos.clone().project(camera)
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((vec.x + 1) / 2) * rect.width + rect.left,
      y: (-(vec.y - 1) / 2) * rect.height + rect.top,
    }
  }

  // ─── Hover 高亮光环 ────────────────────────
  const haloTexture = createGlowTexture('rgba(255,217,138,1)', 64)
  const haloMaterial = new SpriteMaterial({
    map: haloTexture,
    blending: 2,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    opacity: 0.7,
  })
  const halo = new Sprite(haloMaterial)
  halo.scale.set(20, 20, 1)
  halo.visible = false
  scene.add(halo)

  function highlightPosition(worldPos: Vector3) {
    halo.position.copy(worldPos)
    halo.visible = true
  }
  function clearHighlight() { halo.visible = false }

  // ─── 邻星连线 ──────────────────────────────
  let constellationLines: LineSegments | null = null

  function showConstellationLines(centerPos: Vector3, neighborPositions: Vector3[]) {
    clearConstellationLines()
    if (neighborPositions.length === 0) return
    const vertices: number[] = []
    for (const np of neighborPositions) {
      vertices.push(centerPos.x, centerPos.y, centerPos.z)
      vertices.push(np.x, np.y, np.z)
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3))
    const mat = new LineBasicMaterial({
      color: 0xffd98a,
      transparent: true,
      opacity: 0.3,
      depthTest: true,
      depthWrite: false,
    })
    constellationLines = new LineSegments(geo, mat)
    scene.add(constellationLines)
  }

  function clearConstellationLines() {
    if (constellationLines) {
      scene.remove(constellationLines)
      constellationLines.geometry.dispose()
      ;(constellationLines.material as LineBasicMaterial).dispose()
      constellationLines = null
    }
  }

  // ─── 响应式 ─────────────────────────────────
  function onResize() {
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  }
  window.addEventListener('resize', onResize)

  // ─── 渲染循环 ───────────────────────────────
  const clock = new Clock()
  let animId = 0
  let pausedBreathing = false

  function animate() {
    animId = requestAnimationFrame(animate)
    const dt = Math.min(clock.getDelta(), 0.1)

    if (!pausedBreathing) {
      if (userInteracting) {
        interactionTimer += dt
        if (interactionTimer >= interactionTimeout) {
          userInteracting = false
        }
      }
      if (!userInteracting) {
        const elapsed = performance.now() * 0.001
        camera.fov = DEFAULT_FOV + Math.sin(elapsed * (Math.PI * 2 / BREATHING_PERIOD)) * BREATHING_AMPLITUDE
        camera.updateProjectionMatrix()
        controls.autoRotate = true
        controls.autoRotateSpeed = 0.15
      } else {
        controls.autoRotate = false
      }
    }

    controls.update()
    renderer.render(scene, camera)
  }

  function pauseBreathing() { pausedBreathing = true; controls.autoRotate = false }
  function resumeBreathing() { pausedBreathing = false }

  function dispose() {
    cancelAnimationFrame(animId)
    window.removeEventListener('resize', onResize)
    renderer.dispose()
    scene.clear()
  }

  animate()

  return {
    scene,
    camera,
    overlayPoints,
    attachStories,
    attachOneStory,
    getHoveredIndex,
    getStarAt,
    getScreenPos,
    highlightPosition,
    clearHighlight,
    showConstellationLines,
    clearConstellationLines,
    pauseBreathing,
    resumeBreathing,
    dispose,
  }
}
