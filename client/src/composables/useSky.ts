import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Points,
  BufferGeometry,
  BufferAttribute,
  PointsMaterial,
  CanvasTexture,
  LineSegments,
  LineBasicMaterial,
  AdditiveBlending,
  Color,
} from 'three'
import { SPHERE_RADIUS, DEFAULT_FOV, FOV_MIN, FOV_MAX } from '../utils/constants'

// ─── 星表数据 ───
interface CatalogStar { id: number; name: string | null; ra: number; dec: number; mag: number; color: string; con: string; x: number; y: number; z: number }
interface CatalogData { stars: CatalogStar[]; lines: [number, number][] }
import rawCatalog from '../data/stars.json'
const CATALOG = rawCatalog as unknown as CatalogData

function hexToRGB(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1,3),16)/255, parseInt(hex.slice(3,5),16)/255, parseInt(hex.slice(5,7),16)/255]
}

function glowTex(inner: string, sz: number): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = sz
  const ctx = c.getContext('2d')!
  const h = sz/2
  const g = ctx.createRadialGradient(h,h,h*0.02, h,h,h)
  g.addColorStop(0, inner); g.addColorStop(0.2, inner); g.addColorStop(1, 'transparent')
  ctx.fillStyle = g; ctx.fillRect(0, 0, sz, sz)
  return new CanvasTexture(c)
}

export interface SkyAPI { camera: PerspectiveCamera; dispose: () => void }

export function useSky(canvas: HTMLCanvasElement): SkyAPI {
  const scene = new Scene()
  const camera = new PerspectiveCamera(DEFAULT_FOV, canvas.clientWidth/canvas.clientHeight, 0.5, SPHERE_RADIUS*3)
  camera.position.set(0, 0, 0)

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(new Color('#070816'))

  const stars = CATALOG.stars
  const n = stars.length

  // ═════════════════════════════════
  // 星星按星等分成 5 层，逐层不同大小
  // ═════════════════════════════════
  const tiers: { maxMag: number; size: number; label: string }[] = [
    { maxMag: -0.5,  size: 11, label: '超亮' },   // Sirius, Canopus
    { maxMag:  0.5,  size: 8,  label: '一等' },   // Vega, Arcturus, Rigel...
    { maxMag:  1.8,  size: 6,  label: '二等' },   // Polaris, Castor, Bellatrix...
    { maxMag:  3.0,  size: 4,  label: '三等' },
    { maxMag:  4.5,  size: 2.8, label: '四等' },
    { maxMag: 99,     size: 1.8, label: '暗星' },
  ]

  const tierBins: { positions: number[]; colors: number[] }[] = tiers.map(() => ({ positions: [], colors: [] }))

  for (let i = 0; i < n; i++) {
    const s = stars[i]
    const [r, g, b] = hexToRGB(s.color)
    for (let t = 0; t < tiers.length; t++) {
      if (s.mag <= tiers[t].maxMag) {
        tierBins[t].positions.push(s.x, s.y, s.z)
        tierBins[t].colors.push(r, g, b)
        break
      }
    }
  }

  const texMap = new Map<number, CanvasTexture>()
  function getTex(size: number) {
    if (!texMap.has(size)) texMap.set(size, glowTex('white', size <= 3 ? 32 : 48))
    return texMap.get(size)!
  }

  for (let t = 0; t < tiers.length; t++) {
    const bin = tierBins[t]
    if (bin.positions.length === 0) continue
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(bin.positions), 3))
    geo.setAttribute('color',    new BufferAttribute(new Float32Array(bin.colors), 3))
    const mat = new PointsMaterial({
      size: tiers[t].size,
      map: getTex(tiers[t].size),
      blending: AdditiveBlending,
      depthWrite: false, depthTest: true, transparent: true,
      vertexColors: true, sizeAttenuation: true,
    })
    scene.add(new Points(geo, mat))
    console.log(`  ${tiers[t].label}: ${bin.positions.length/3} 颗, size=${tiers[t].size}`)
  }

  // ═════════════════════════════════
  // 星座连线 (提高亮度)
  // ═════════════════════════════════
  if (CATALOG.lines && CATALOG.lines.length > 0) {
    const verts: number[] = []
    for (const [a, b] of CATALOG.lines) {
      if (a >= n || b >= n) continue
      const sa = stars[a], sb = stars[b]
      verts.push(sa.x, sa.y, sa.z, sb.x, sb.y, sb.z)
    }
    const lg = new BufferGeometry()
    lg.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3))
    const lm = new LineBasicMaterial({
      color: 0x6677aa,
      transparent: true, opacity: 0.35,
      depthTest: true, depthWrite: false,
    })
    scene.add(new LineSegments(lg, lm))
  }

  // ═════════════════════════════════
  // 球心相机旋转
  // ═════════════════════════════════
  let dragging = false
  let px = 0, py = 0
  let rotY = 0, rotX = 0.3  // 初始略抬头，看向猎户座/天狼星天区

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; px = e.clientX; py = e.clientY
    canvas.setPointerCapture(e.pointerId)
  })
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return
    const dx = e.clientX - px
    const dy = e.clientY - py
    // 修复方向：向右拖→天球向右转→相机向左转(Y增加)
    rotY += dx * 0.004
    rotX += dy * 0.004
    rotX = Math.max(-Math.PI*0.48, Math.min(Math.PI*0.48, rotX))
    camera.rotation.set(rotX, rotY, 0, 'YXZ')
    px = e.clientX; py = e.clientY
  })
  canvas.addEventListener('pointerup', (e) => {
    dragging = false; canvas.releasePointerCapture(e.pointerId)
  })

  // FOV 缩放
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    camera.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, camera.fov + e.deltaY*0.05))
    camera.updateProjectionMatrix()
  }, { passive: false })

  window.addEventListener('resize', () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  })

  // 呼吸 + 渲染
  let af = 0
  function animate() {
    af = requestAnimationFrame(animate)
    const breath = Math.sin(performance.now()*0.0008) * 1.5
    camera.fov = DEFAULT_FOV + breath
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)
  }
  animate()

  camera.rotation.set(rotX, rotY, 0, 'YXZ')

  return { camera, dispose() { cancelAnimationFrame(af); renderer.dispose(); scene.clear() } }
}
