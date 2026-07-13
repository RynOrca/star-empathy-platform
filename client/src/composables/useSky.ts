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
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { randomSpherePoint } from '../utils/sphereMapping'
import {
  BACKGROUND_STAR_COUNT,
  SPHERE_RADIUS,
  DEFAULT_FOV,
  FOV_MIN,
  FOV_MAX,
  FOV_ZOOM_STEP,
  BREATHING_AMPLITUDE,
  BREATHING_PERIOD,
  RAYCASTER_THRESHOLD,
} from '../utils/constants'

/**
 * 用 Canvas 生成径向渐变圆形贴图
 */
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

export interface SkyAPI {
  scene: Scene
  camera: PerspectiveCamera
  renderer: WebGLRenderer
  canvas: HTMLCanvasElement
  addDataStars: (positions: Float32Array, colors: Float32Array, sizes: Float32Array) => Points
  updateDataStars: (points: Points, positions: Float32Array, colors: Float32Array, sizes: Float32Array) => void
  removeDataStars: (points: Points) => void
  getHoveredIndex: (event: MouseEvent, dataPoints: Points) => number
  getScreenPos: (worldPos: Vector3) => { x: number; y: number }
  highlightPosition: (worldPos: Vector3) => void
  clearHighlight: () => void
  pauseBreathing: () => void
  resumeBreathing: () => void
  dispose: () => void
}

export function useSky(canvasRef: { value: HTMLCanvasElement | null }): SkyAPI {
  if (!canvasRef.value) {
    throw new Error('Canvas ref is null — ensure onMounted has fired.')
  }

  const canvas = canvasRef.value

  // ─── 场景 / 相机 / 渲染器 ──────────────────
  const scene = new Scene()
  const camera = new PerspectiveCamera(DEFAULT_FOV, canvas.clientWidth / canvas.clientHeight, 1, SPHERE_RADIUS * 2)
  camera.position.set(0, 0, 0) // 球心

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // ─── 背景星空粒子 ─────────────────────────
  const bgGeometry = new BufferGeometry()
  const bgPositions = new Float32Array(BACKGROUND_STAR_COUNT * 3)
  const bgOpacities = new Float32Array(BACKGROUND_STAR_COUNT)

  for (let i = 0; i < BACKGROUND_STAR_COUNT; i++) {
    const p = randomSpherePoint(SPHERE_RADIUS * 0.98) // 略内缩
    bgPositions[i * 3] = p.x
    bgPositions[i * 3 + 1] = p.y
    bgPositions[i * 3 + 2] = p.z
    bgOpacities[i] = 0.35 + Math.random() * 0.55 // 0.35 ~ 0.9
  }

  bgGeometry.setAttribute('position', new BufferAttribute(bgPositions, 3))
  bgGeometry.setAttribute('opacity', new BufferAttribute(bgOpacities, 1))

  const bgTexture = createGlowTexture('rgba(246,241,255,1)', 32)
  const bgMaterial = new PointsMaterial({
    size: 1.8,
    map: bgTexture,
    blending: 2, // NormalBlending
    depthWrite: false,
    transparent: true,
    opacity: 0.72,
    vertexColors: false,
  })
  // 为背景粒子添加颜色随机性（用 vertexColors + 随机色）
  const bgColors = new Float32Array(BACKGROUND_STAR_COUNT * 3)
  for (let i = 0; i < BACKGROUND_STAR_COUNT; i++) {
    // 大部分白色，少数偏金/偏蓝
    const rand = Math.random()
    if (rand < 0.08) {
      bgColors[i * 3] = 1.0; bgColors[i * 3 + 1] = 0.85; bgColors[i * 3 + 2] = 0.54 // 暖金
    } else if (rand < 0.15) {
      bgColors[i * 3] = 0.53; bgColors[i * 3 + 1] = 0.66; bgColors[i * 3 + 2] = 1.0 // 星蓝
    } else {
      bgColors[i * 3] = 0.96; bgColors[i * 3 + 1] = 0.94; bgColors[i * 3 + 2] = 1.0 // 近白
    }
  }
  bgGeometry.setAttribute('color', new BufferAttribute(bgColors, 3))
  bgMaterial.vertexColors = true

  const bgPoints = new Points(bgGeometry, bgMaterial)
  scene.add(bgPoints)

  // ─── 轨道控制 ──────────────────────────────
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enablePan = false
  controls.enableZoom = false // 我们自己处理 FOV 缩放
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minPolarAngle = Math.PI / 6
  controls.maxPolarAngle = (Math.PI * 5) / 6
  controls.rotateSpeed = 0.4
  controls.target.set(0, 0, SPHERE_RADIUS) // 看向前方球面

  // ─── FOV 缩放 ──────────────────────────────
  let userInteracting = false
  let interactionTimer = 0
  const interactionTimeout = 3.0 // 3 秒无操作恢复呼吸

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    userInteracting = true
    interactionTimer = 0
    const delta = e.deltaY > 0 ? FOV_ZOOM_STEP : -FOV_ZOOM_STEP
    camera.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, camera.fov + delta))
    camera.updateProjectionMatrix()
  }, { passive: false })

  // 拖拽/旋转也视为交互
  canvas.addEventListener('pointerdown', () => {
    userInteracting = true
    interactionTimer = 0
  })

  // ─── Raycaster ────────────────────────────
  const raycaster = new Raycaster()
  raycaster.params.Points!.threshold = RAYCASTER_THRESHOLD

  function getHoveredIndex(event: MouseEvent, dataPoints: Points): number {
    const rect = canvas.getBoundingClientRect()
    const mouse = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObject(dataPoints)
    if (intersects.length > 0) {
      return intersects[0].index!
    }
    return -1
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

  function clearHighlight() {
    halo.visible = false
  }

  // ─── 数据星管理 ───────────────────────────
  function addDataStars(positions: Float32Array, colors: Float32Array, sizes: Float32Array): Points {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('color', new BufferAttribute(colors, 3))
    geometry.setAttribute('size', new BufferAttribute(sizes, 1))

    // 使用带大小和颜色的 ShaderMaterial（PointsMaterial 不支持逐点大小）
    const spriteTexture = createGlowTexture('white', 32)
    const material = new PointsMaterial({
      size: 3.5,
      map: spriteTexture,
      blending: 2,
      depthWrite: false,
      depthTest: true,
      transparent: true,
      vertexColors: true,
      sizeAttenuation: true,
    })

    const points = new Points(geometry, material)
    scene.add(points)
    return points
  }

  function updateDataStars(points: Points, positions: Float32Array, colors: Float32Array, sizes: Float32Array) {
    points.geometry.setAttribute('position', new BufferAttribute(positions, 3))
    points.geometry.setAttribute('color', new BufferAttribute(colors, 3))
    points.geometry.setAttribute('size', new BufferAttribute(sizes, 1))
    points.geometry.attributes.position.needsUpdate = true
    points.geometry.attributes.color.needsUpdate = true
  }

  function removeDataStars(points: Points) {
    scene.remove(points)
    points.geometry.dispose()
    ;(points.material as PointsMaterial).dispose()
  }

  // ─── 响应式 resize ────────────────────────
  function onResize() {
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  }
  window.addEventListener('resize', onResize)

  // ─── 渲染循环 ─────────────────────────────
  const clock = new Clock()
  let animId = 0
  const defaultFov = DEFAULT_FOV
  let pausedBreathing = false

  function animate() {
    animId = requestAnimationFrame(animate)

    const dt = Math.min(clock.getDelta(), 0.1)

    // 呼吸动画
    if (!pausedBreathing) {
      if (userInteracting) {
        interactionTimer += dt
        if (interactionTimer >= interactionTimeout) {
          userInteracting = false
          // 平滑回到默认 FOV 附近
          // 简化为直接恢复呼吸
        }
      }
      if (!userInteracting) {
        const elapsed = performance.now() * 0.001
        camera.fov = defaultFov + Math.sin(elapsed * (Math.PI * 2 / BREATHING_PERIOD)) * BREATHING_AMPLITUDE
        camera.updateProjectionMatrix()
      }
    }

    controls.update()
    renderer.render(scene, camera)

    // 自动旋转（慢速）
    if (!userInteracting) {
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.15
    } else {
      controls.autoRotate = false
    }
  }

  function pauseBreathing() { pausedBreathing = true }
  function resumeBreathing() { pausedBreathing = false }

  function dispose() {
    cancelAnimationFrame(animId)
    window.removeEventListener('resize', onResize)
    renderer.dispose()
    scene.clear()
  }

  // 启动渲染
  animate()

  return {
    scene,
    camera,
    renderer,
    canvas,
    addDataStars,
    updateDataStars,
    removeDataStars,
    getHoveredIndex,
    getScreenPos,
    highlightPosition,
    clearHighlight,
    pauseBreathing,
    resumeBreathing,
    dispose,
  }
}
