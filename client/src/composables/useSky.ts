import {
  Scene, PerspectiveCamera, WebGLRenderer,
  Points, BufferGeometry, BufferAttribute, PointsMaterial, CanvasTexture,
  Line, LineBasicMaterial, LineDashedMaterial, LineSegments,
  AdditiveBlending, Color, Mesh, MeshBasicMaterial,
} from 'three'
import { SPHERE_RADIUS, DEFAULT_FOV, FOV_MIN, FOV_MAX } from '../utils/constants'

// ─── 星表 ───
interface CatStar { id: number; name: string | null; ra: number; dec: number; mag: number; color: string; con: string; x: number; y: number; z: number }
interface CatData { stars: CatStar[]; lines: [number, number][] }
import rawCatalog from '../data/stars.json'
const CAT = rawCatalog as unknown as CatData

const hexRGB = (h: string): [number, number, number] =>
  [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255]

function glowTex(inner: string, sz: number): CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = sz
  const ctx = c.getContext('2d')!, h = sz/2
  const g = ctx.createRadialGradient(h,h,h*0.02, h,h,h)
  g.addColorStop(0, inner); g.addColorStop(0.2, inner); g.addColorStop(1, 'transparent')
  ctx.fillStyle = g; ctx.fillRect(0, 0, sz, sz)
  return new CanvasTexture(c)
}

// RA(时)/Dec(°) → 天球 3D
const D2R = Math.PI / 180
function raDecXYZ(raH: number, decD: number, R: number) {
  const ra = raH / 24 * Math.PI * 2, dec = decD * D2R, cd = Math.cos(dec)
  return { x: R * cd * Math.cos(ra), y: R * Math.sin(dec), z: -R * cd * Math.sin(ra) }
}

// ─── 黄道坐标 → 赤道坐标 (ε = 23.44°) ───
const OBLIQUITY = 23.44 * D2R
function eclipticToRaDec(lonDeg: number): { ra: number; dec: number } {
  const λ = lonDeg * D2R
  const ra = Math.atan2(Math.sin(λ) * Math.cos(OBLIQUITY), Math.cos(λ))
  const dec = Math.asin(Math.sin(λ) * Math.sin(OBLIQUITY))
  return { ra: (ra + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * 24, dec: dec / D2R }
}

// ─── 银河坐标 → 赤道坐标 ───
// 北银极: RA=12h51.4m, Dec=+27.13°
// 银心方向: RA=17h45.6m, Dec=-28.94°
// 银经零点在银心方向
const NGP_RA = (12 + 51.4/60) / 24 * Math.PI * 2
const NGP_DEC = 27.13 * D2R
function galacticToRaDec(lonDeg: number): { ra: number; dec: number } {
  const l = lonDeg * D2R
  // 简化：沿银道面 (银纬 b=0) 计算赤道坐标
  // 银道面法向量 = 北银极方向
  const pole = { x: Math.cos(NGP_DEC) * Math.cos(NGP_RA), y: Math.sin(NGP_DEC), z: Math.cos(NGP_DEC) * Math.sin(NGP_RA) }
  // 银心方向 (l=0)
  const gcRA = (17 + 45.6/60) / 24 * Math.PI * 2
  const gcDec = -28.94 * D2R
  const gc = { x: Math.cos(gcDec) * Math.cos(gcRA), y: Math.sin(gcDec), z: Math.cos(gcDec) * Math.sin(gcRA) }
  // 银经 0 的方向 = 银心方向投影到银道面
  // 简化：直接用球面旋转
  const cosL = Math.cos(l), sinL = Math.sin(l)
  // 垂直于银心在银道面上的向量 = pole × gc
  const perp = {
    x: pole.y * gc.z - pole.z * gc.y,
    y: pole.z * gc.x - pole.x * gc.z,
    z: pole.x * gc.y - pole.y * gc.x,
  }
  const plen = Math.sqrt(perp.x**2 + perp.y**2 + perp.z**2)
  perp.x /= plen; perp.y /= plen; perp.z /= plen
  // 银道面上银经 l 的方向
  const dir = {
    x: gc.x * cosL + perp.x * sinL,
    y: gc.y * cosL + perp.y * sinL,
    z: gc.z * cosL + perp.z * sinL,
  }
  const dlen = Math.sqrt(dir.x**2 + dir.y**2 + dir.z**2)
  const dec = Math.asin(dir.y / dlen) / D2R
  const ra = (Math.atan2(dir.z, dir.x) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * 24
  return { ra, dec }
}

// 生成带状银河 ribbon（三角形扇形）
function milkyWayRibbon(R: number, width: number, segs = 360): { verts: number[]; indices: number[] } {
  const verts: number[] = [], indices: number[] = []
  for (let i = 0; i <= segs; i++) {
    const { ra, dec } = galacticToRaDec(i / segs * 360)
    const p = raDecXYZ(ra, dec, R)
    // 法向量 = 从球心指向外
    const nlen = Math.sqrt(p.x**2 + p.y**2 + p.z**2)
    const nx = p.x / nlen, ny = p.y / nlen, nz = p.z / nlen
    // 内圈 R-width/2, 外圈 R+width/2
    verts.push(
      p.x - nx * width/2, p.y - ny * width/2, p.z - nz * width/2,  // 内
      p.x + nx * width/2, p.y + ny * width/2, p.z + nz * width/2,  // 外
    )
    if (i < segs) {
      const j = i * 2
      indices.push(j, j+1, j+2,  j+1, j+3, j+2)
    }
  }
  return { verts, indices }
}

// ═══════════════════════════════════════════
export interface SkyAPI { camera: PerspectiveCamera; zoomIn: () => void; zoomOut: () => void; dispose: () => void }

export function useSky(canvas: HTMLCanvasElement): SkyAPI {
  const scene = new Scene()
  const camera = new PerspectiveCamera(DEFAULT_FOV, canvas.clientWidth/canvas.clientHeight, 0.5, SPHERE_RADIUS*3)
  camera.position.set(0,0,0)

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(new Color('#070816'))

  const stars = CAT.stars; const n = stars.length

  // ═══ 星星分层 ═══
  const tiers = [
    { maxMag: -0.5, size: 11 },
    { maxMag:  0.5, size: 8 },
    { maxMag:  1.8, size: 6 },
    { maxMag:  3.0, size: 4 },
    { maxMag:  4.5, size: 2.8 },
    { maxMag: 99,    size: 1.8 },
  ]
  const bins = tiers.map(() => ({ pos: [] as number[], col: [] as number[] }))
  for (let i = 0; i < n; i++) {
    const s = stars[i]; const [r,g,b] = hexRGB(s.color)
    for (let t = 0; t < tiers.length; t++) {
      if (s.mag <= tiers[t].maxMag) { bins[t].pos.push(s.x,s.y,s.z); bins[t].col.push(r,g,b); break }
    }
  }
  const texCache = new Map<number, CanvasTexture>()
  for (let t = 0; t < tiers.length; t++) {
    const b = bins[t]; if (b.pos.length === 0) continue
    const sz = tiers[t].size
    if (!texCache.has(sz)) texCache.set(sz, glowTex('white', sz <= 3 ? 32 : 48))
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(b.pos), 3))
    g.setAttribute('color', new BufferAttribute(new Float32Array(b.col), 3))
    scene.add(new Points(g, new PointsMaterial({
      size: sz, map: texCache.get(sz)!, blending: AdditiveBlending,
      depthWrite: false, depthTest: true, transparent: true, vertexColors: true, sizeAttenuation: true,
    })))
  }

  // ═══ 星座连线 ═══
  if (CAT.lines?.length) {
    const v: number[] = []
    for (const [a,b] of CAT.lines) { if (a<n&&b<n) { const sa=stars[a],sb=stars[b]; v.push(sa.x,sa.y,sa.z,sb.x,sb.y,sb.z) } }
    const lg = new BufferGeometry(); lg.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
    scene.add(new LineSegments(lg, new LineBasicMaterial({ color:0x6677aa, transparent:true, opacity:0.35, depthTest:true, depthWrite:false })))
  }



  // ═══ 天赤道 (Dec=0°) ═══
  {
    const v: number[] = []
    for (let i = 0; i <= 360; i++) {
      const p = raDecXYZ(i / 360 * 24, 0, SPHERE_RADIUS)
      v.push(p.x, p.y, p.z)
    }
    const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
    scene.add(new Line(g, new LineBasicMaterial({ color: 0x335577, transparent: true, opacity: 0.25, depthTest: true, depthWrite: false })))
  }

  // ═══ 黄道 (虚线) ═══
  {
    const v: number[] = []
    for (let i = 0; i <= 360; i++) {
      const { ra, dec } = eclipticToRaDec(i)
      const p = raDecXYZ(ra, dec, SPHERE_RADIUS)
      v.push(p.x, p.y, p.z)
    }
    const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
    g.computeBoundingSphere()
    const mat = new LineDashedMaterial({
      color: 0xcc8844,
      dashSize: 2.5,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.55,
      depthTest: true,
      depthWrite: false,
    })
    const line = new Line(g, mat)
    line.computeLineDistances()
    scene.add(line)
  }

  // ═══ 银河 ═══
  {
    const { verts, indices } = milkyWayRibbon(SPHERE_RADIUS, 22, 360)
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    scene.add(new Mesh(g, new MeshBasicMaterial({
      color: 0xaaccff, transparent: true, opacity: 0.12,
      blending: AdditiveBlending, depthWrite: false, depthTest: true, side: 2, // DoubleSide
    })))
  }

  // ═══ 相机 ═══
  let dragging = false, px = 0, py = 0, rotY = 0, rotX = 0.3
  let userFov = DEFAULT_FOV

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId)
  })
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return
    rotY += (e.clientX - px) * 0.004
    rotX += (e.clientY - py) * 0.004
    rotX = Math.max(-Math.PI*0.48, Math.min(Math.PI*0.48, rotX))
    camera.rotation.set(rotX, rotY, 0, 'YXZ')
    px = e.clientX; py = e.clientY
  })
  canvas.addEventListener('pointerup', (e) => { dragging = false; canvas.releasePointerCapture(e.pointerId) })

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    userFov = Math.max(FOV_MIN, Math.min(FOV_MAX, userFov + e.deltaY * 0.05))
    camera.fov = userFov
    camera.updateProjectionMatrix()
  }, { passive: false })

  window.addEventListener('resize', () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  })

  // ═══ 渲染 ═══
  let af = 0
  function animate() {
    af = requestAnimationFrame(animate)
    const breath = Math.sin(performance.now() * 0.0008) * 1.5
    camera.fov = userFov + breath
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)
  }
  animate()
  camera.rotation.set(rotX, rotY, 0, 'YXZ')

  return {
    camera,
    zoomIn()  { userFov = Math.max(FOV_MIN, userFov - 5); },
    zoomOut() { userFov = Math.min(FOV_MAX, userFov + 5); },
    dispose() { cancelAnimationFrame(af); renderer.dispose(); scene.clear() },
  }
}
