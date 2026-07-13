import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Points,
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  LineSegments,
  LineBasicMaterial,
  AdditiveBlending,
  Color,
} from 'three'
import { SPHERE_RADIUS, DEFAULT_FOV, FOV_MIN, FOV_MAX } from '../utils/constants'

// ═══════════════════════════════════════════════
// 自定义着色器：逐点大小 + 软光晕
// ═══════════════════════════════════════════════
const STAR_VERTEX = /* glsl */ `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (400.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
    vColor = color;
  }
`

const STAR_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
    float alpha = 1.0 - smoothstep(0.0, 1.0, d);
    alpha = pow(alpha, 2.5);
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`

// ═══════════════════════════════════════════════
// 星表数据结构
// ═══════════════════════════════════════════════
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

interface CatalogData {
  stars: CatalogStar[]
  lines: [number, number][]  // 星座连线 [starIdA, starIdB]
}

import rawCatalog from '../data/stars.json'
const CATALOG = rawCatalog as unknown as CatalogData

// ═══════════════════════════════════════════════
// 工具
// ═══════════════════════════════════════════════
function hexToRGB(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ]
}

// mag → GL点大小（一等星 ~8, 六等星 ~1.5）
function magToSize(mag: number): number {
  // Sirius (-1.46)→12px, 一等星→8px, 三等星→5px, 六等星→2.5px
  return Math.max(2.0, 10.0 - mag * 1.35)
}

// ═══════════════════════════════════════════════
// 主入口
// ═══════════════════════════════════════════════
export interface SkyAPI {
  camera: PerspectiveCamera
  dispose: () => void
}

export function useSky(canvas: HTMLCanvasElement): SkyAPI {
  // ── 场景 ──
  const scene = new Scene()

  // ── 相机（定在球心）──
  const camera = new PerspectiveCamera(DEFAULT_FOV, canvas.clientWidth / canvas.clientHeight, 0.5, SPHERE_RADIUS * 3)
  camera.position.set(0, 0, 0)
  camera.rotation.set(0, 0, 0)

  // ── 渲染器 ──
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(new Color('#070816'))

  // ═════════════════════════════════════════
  // 星星渲染（ShaderMaterial 逐点大小）
  // ═════════════════════════════════════════
  const stars = CATALOG.stars
  const n = stars.length
  const positions = new Float32Array(n * 3)
  const colors = new Float32Array(n * 3)
  const sizes = new Float32Array(n)

  for (let i = 0; i < n; i++) {
    const s = stars[i]
    positions[i * 3]     = s.x
    positions[i * 3 + 1] = s.y
    positions[i * 3 + 2] = s.z
    const [r, g, b] = hexToRGB(s.color)
    colors[i * 3]     = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b
    sizes[i] = magToSize(s.mag)
  }

  const starGeo = new BufferGeometry()
  starGeo.setAttribute('position', new BufferAttribute(positions, 3))
  starGeo.setAttribute('color',    new BufferAttribute(colors, 3))
  starGeo.setAttribute('size',     new BufferAttribute(sizes, 1))

  const starMat = new ShaderMaterial({
    vertexShader: STAR_VERTEX,
    fragmentShader: STAR_FRAGMENT,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    transparent: true,
    vertexColors: true,
  })

  const starPoints = new Points(starGeo, starMat)
  scene.add(starPoints)
  console.log(`🌟 ${n} stars added to scene, first:`, stars[0].name, 'mag', stars[0].mag, 'size', sizes[0])

  // ═════════════════════════════════════════
  // 星座连线
  // ═════════════════════════════════════════
  if (CATALOG.lines && CATALOG.lines.length > 0) {
    const lineVerts: number[] = []
    for (const [a, b] of CATALOG.lines) {
      if (a >= n || b >= n) continue
      const sa = stars[a], sb = stars[b]
      lineVerts.push(sa.x, sa.y, sa.z, sb.x, sb.y, sb.z)
    }
    const lineGeo = new BufferGeometry()
    lineGeo.setAttribute('position', new BufferAttribute(new Float32Array(lineVerts), 3))
    const lineMat = new LineBasicMaterial({
      color: 0x445588,
      transparent: true,
      opacity: 0.28,
      depthTest: true,
      depthWrite: false,
    })
    const lineSegs = new LineSegments(lineGeo, lineMat)
    scene.add(lineSegs)
  }

  // ═════════════════════════════════════════
  // 球心相机旋转（手写）
  // ═════════════════════════════════════════
  let isDragging = false
  let prevX = 0, prevY = 0
  let rotY = 0    // 水平旋转（绕 Y 轴）
  let rotX = 0.3  // 垂直旋转（略抬头的初始视角）

  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true
    prevX = e.clientX
    prevY = e.clientY
    canvas.setPointerCapture(e.pointerId)
  })

  canvas.addEventListener('pointermove', (e) => {
    if (!isDragging) return
    const dx = e.clientX - prevX
    const dy = e.clientY - prevY
    rotY -= dx * 0.004  // 水平拖拽 → 左右看
    rotX -= dy * 0.004  // 垂直拖拽 → 上下看
    rotX = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, rotX)) // 不限死但不翻过头
    camera.rotation.set(rotX, rotY, 0, 'YXZ')
    prevX = e.clientX
    prevY = e.clientY
  })

  canvas.addEventListener('pointerup', (e) => {
    isDragging = false
    canvas.releasePointerCapture(e.pointerId)
  })

  // FOV 缩放
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    camera.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, camera.fov + e.deltaY * 0.05))
    camera.updateProjectionMatrix()
  }, { passive: false })

  // 响应式
  window.addEventListener('resize', () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  })

  // ═════════════════════════════════════════
  // 呼吸动画
  // ═════════════════════════════════════════
  let af = 0
  function animate() {
    af = requestAnimationFrame(animate)
    // 轻微呼吸
    const breath = Math.sin(performance.now() * 0.0008) * 1.5
    camera.fov = DEFAULT_FOV + breath
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)
  }
  animate()

  function dispose() {
    cancelAnimationFrame(af)
    renderer.dispose()
    scene.clear()
  }

  // 设置初始朝向
  camera.rotation.set(rotX, rotY, 0, 'YXZ')

  return { camera, dispose }
}
