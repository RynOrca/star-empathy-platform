import {
  Scene, PerspectiveCamera, WebGLRenderer,
  Points, BufferGeometry, BufferAttribute, PointsMaterial, CanvasTexture,
  Line, LineBasicMaterial, LineDashedMaterial, LineSegments,
  AdditiveBlending, Color, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  SphereGeometry, RingGeometry, BackSide,
  Raycaster, Vector2, Sprite, SpriteMaterial, Vector3, Group, AmbientLight,
} from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { SPHERE_RADIUS, DEFAULT_FOV, FOV_MIN, FOV_MAX } from '../utils/constants'

// ─── 星表 ───
interface CatStar { id: number; name: string | null; ra: number; dec: number; mag: number; color: string; con: string; x: number; y: number; z: number }
interface CatData { stars: CatStar[]; lines: [number, number][] }
import rawCatalog from '../data/stars.json'
import constellationLabels from '../data/constellation_labels.json'
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

function bloomTex(color: string, sz: number): CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = sz
  const ctx = c.getContext('2d')!, h = sz/2
  const g = ctx.createRadialGradient(h,h,0, h,h,h)
  g.addColorStop(0, color)
  g.addColorStop(0.15, color)
  g.addColorStop(0.4, 'rgba(255,225,160,0.3)')
  g.addColorStop(0.7, 'rgba(255,225,160,0.08)')
  g.addColorStop(1, 'transparent')
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
export interface SkyAPI {
  camera: PerspectiveCamera
  zoomIn: () => void
  zoomOut: () => void
  dispose: () => void
  setStarStatsCache: (cache: Map<number, { stories: number; resonance: number; views: number; favorites: number }>) => void
}

export function useSky(
  canvas: HTMLCanvasElement,
  options?: { onStarClick?: (starId: number) => void; onStarHover?: (starId: number | null) => void; onPlanetClick?: (name: string, nameCN: string) => void; observerLat?: number; observerLng?: number }
): SkyAPI {
  const scene = new Scene()

  // ═══ 天球组（用于地平旋转） ═══
  const skyGroup = new Group()
  scene.add(skyGroup)

  scene.add(new AmbientLight(0xffffff, 0.5))

  const planetMeshes: Mesh[] = []

  const camera = new PerspectiveCamera(DEFAULT_FOV, canvas.clientWidth/canvas.clientHeight, 0.5, SPHERE_RADIUS*3)
  camera.position.set(0,0,0)

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(new Color('#070816'))

  // ═══ CSS2D 标签渲染器 ═══
  const labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight)
  const lrEl = labelRenderer.domElement
  lrEl.style.position = 'absolute'
  lrEl.style.top = '0'
  lrEl.style.left = '0'
  lrEl.style.pointerEvents = 'none'
  lrEl.style.zIndex = '10'
  canvas.parentElement?.appendChild(lrEl)

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
  const tierStarIds: number[][] = tiers.map(() => [])
  for (let i = 0; i < n; i++) {
    const s = stars[i]; const [r,g,b] = hexRGB(s.color)
    for (let t = 0; t < tiers.length; t++) {
      if (s.mag <= tiers[t].maxMag) { bins[t].pos.push(s.x,s.y,s.z); bins[t].col.push(r,g,b); tierStarIds[t].push(s.id); break }
    }
  }
  const texCache = new Map<number, CanvasTexture>()
  const starPointsRefs: Points[] = []
  for (let t = 0; t < tiers.length; t++) {
    const b = bins[t]; if (b.pos.length === 0) continue
    const sz = tiers[t].size
    if (!texCache.has(sz)) texCache.set(sz, glowTex('white', sz <= 3 ? 32 : 48))
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(b.pos), 3))
    g.setAttribute('color', new BufferAttribute(new Float32Array(b.col), 3))
    const pts = new Points(g, new PointsMaterial({
      size: sz, map: texCache.get(sz)!, blending: AdditiveBlending,
      depthWrite: false, depthTest: true, transparent: true, vertexColors: true, sizeAttenuation: true,
    }))
    pts.userData.tierIndex = t
    starPointsRefs.push(pts)
    skyGroup.add(pts)
  }

  // ═══ 悬浮辉光精灵 ═══
  const hoverGlow = new Sprite(new SpriteMaterial({
    map: bloomTex('#ffe5a0', 128),
    blending: AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0,
  }))
  hoverGlow.scale.set(10, 10, 1)
  hoverGlow.renderOrder = 100
  hoverGlow.visible = false
  skyGroup.add(hoverGlow)

  // ═══ 星座连线 ═══
  if (CAT.lines?.length) {
    const v: number[] = []
    for (const [a,b] of CAT.lines) { if (a<n&&b<n) { const sa=stars[a],sb=stars[b]; v.push(sa.x,sa.y,sa.z,sb.x,sb.y,sb.z) } }
    const lg = new BufferGeometry(); lg.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
    skyGroup.add(new LineSegments(lg, new LineBasicMaterial({ color:0x6677aa, transparent:true, opacity:0.35, depthTest:true, depthWrite:false })))
  }

  // ═══ 星座标签 ═══
  for (const lb of constellationLabels as { con: string; label: string; x: number; y: number; z: number }[]) {
    const el = document.createElement('div')
    el.textContent = lb.label
    el.style.cssText = `font-family:Inter,"Microsoft YaHei",sans-serif;font-size:10px;color:rgba(130,160,200,0.55);letter-spacing:0.08em;white-space:nowrap;pointer-events:none;text-shadow:0 0 6px rgba(80,120,180,0.3);`
    const label = new CSS2DObject(el)
    label.position.set(lb.x, lb.y, lb.z)
    skyGroup.add(label)
  }



  // ═══ 天赤道 (Dec=0°) ═══
  {
    const v: number[] = []
    for (let i = 0; i <= 360; i++) {
      const p = raDecXYZ(i / 360 * 24, 0, SPHERE_RADIUS)
      v.push(p.x, p.y, p.z)
    }
    const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
    skyGroup.add(new Line(g, new LineBasicMaterial({ color: 0x335577, transparent: true, opacity: 0.25, depthTest: true, depthWrite: false })))
  }

  // ═══ 黄道 (虚线) ═══
  {
    import('../data/planets').then(async ({ getEclipticToEquatorTransform }) => {
      const eclToEq = await getEclipticToEquatorTransform()
      const v: number[] = []
      for (let i = 0; i <= 360; i++) {
        const { ra, dec } = eclToEq(i)
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
      skyGroup.add(line)
    })
  }

  // ═══ 地平圈 ═══
  {
    const lat = options?.observerLat ?? 0
    if (lat !== 0 || options?.observerLng != null) {
      // 计算本地恒星时（度）
      const jd = Date.now() / 86400000 + 2440587.5
      const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
      const lng = options?.observerLng ?? 0
      const lst = ((gmst + lng) % 360 + 360) % 360

      const latR = lat * D2R
      const v: number[] = []
      for (let i = 0; i <= 360; i++) {
        // 地平圈在赤道坐标系中的位置
        // 对于每个方位角 H（度），计算对应的 Dec
        const H = i * D2R
        const dec = Math.atan2(-Math.cos(H) * Math.cos(latR), Math.sin(latR))
        const raH = ((lst - i / 15) % 24 + 24) % 24
        const p = raDecXYZ(raH, dec / D2R, SPHERE_RADIUS)
        v.push(p.x, p.y, p.z)
      }
      const g = new BufferGeometry()
      g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
      const hLine = new Line(g, new LineDashedMaterial({
        color: 0x446688,
        dashSize: 4,
        gapSize: 2,
        transparent: true,
        opacity: 0.35,
        depthTest: true,
        depthWrite: false,
      }))
      hLine.computeLineDistances()
      skyGroup.add(hLine)
    }
  }

  // ═══ 银河 ═══
  {
    const { verts, indices } = milkyWayRibbon(SPHERE_RADIUS, 22, 360)
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    skyGroup.add(new Mesh(g, new MeshBasicMaterial({
      color: 0xaaccff, transparent: true, opacity: 0.12,
      blending: AdditiveBlending, depthWrite: false, depthTest: true, side: 2, // DoubleSide
    })))
  }

  // ═══ 地平面以下暖色滤镜 ═══
  {
    const maskGeo = new SphereGeometry(SPHERE_RADIUS * 1.001, 64, 32, 0, Math.PI*2, Math.PI/2, Math.PI/2)
    const maskMat = new MeshBasicMaterial({
      color: 0xb07890,
      transparent: true,
      opacity: 0.28,
      side: BackSide,
      depthWrite: false,
      depthTest: false,
    })
    const mask = new Mesh(maskGeo, maskMat)
    mask.renderOrder = 9999
    scene.add(mask)
  }

  // ═══ 东南西北标注 ═══
  {
    const cardinals = [
      { text: 'N', sub: '北', x: 0, z: -1 },
      { text: 'S', sub: '南', x: 0, z: 1 },
      { text: 'E', sub: '东', x: 1, z: 0 },
      { text: 'W', sub: '西', x: -1, z: 0 },
    ]
    for (const c of cardinals) {
      const el = document.createElement('div')
      el.textContent = `${c.text} ${c.sub}`
      el.style.cssText = [
        'color:#dd8844',
        'font-family:"Inter","Helvetica Neue",system-ui,sans-serif',
        'font-size:13px',
        'font-weight:400',
        'letter-spacing:0.08em',
        'text-shadow:0 0 12px rgba(221,136,68,0.35), 0 0 30px rgba(7,8,22,0.9)',
        'background:rgba(7,8,22,0.45)',
        'padding:2px 10px',
        'border-radius:12px',
        'border:1px solid rgba(221,136,68,0.18)',
        'backdrop-filter:blur(6px)',
        'white-space:nowrap',
      ].join(';')
      const label = new CSS2DObject(el)
      label.position.set(c.x * SPHERE_RADIUS, 3, c.z * SPHERE_RADIUS)
      scene.add(label)
    }
  }

  // ═══ 悬浮 Tooltip ═══
  const statsCache = new Map<number, { stories: number; resonance: number; views: number; favorites: number }>()
  const tooltipEl = document.createElement('div')
  tooltipEl.style.cssText = 'font-family:Inter,"Microsoft YaHei",sans-serif;font-size:11px;color:#b0aacc;background:rgba(10,10,26,0.94);padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);backdrop-filter:blur(10px);white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.15s;line-height:1;margin-top:1rem;box-shadow:0 4px 20px rgba(0,0,0,0.5);'
  tooltipEl.innerHTML = `
    <div class="tt-name" style="font-size:13px;font-weight:600;color:#ffd98a;letter-spacing:0.02em;margin-bottom:8px;text-align:center;"></div>
    <div class="tt-row" style="display:flex;gap:14px;margin-bottom:4px;justify-content:center;">
      <span class="tt-stat" style="display:flex;align-items:center;gap:4px;color:#8a849e;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        <em class="tt-val" style="font-style:normal;font-weight:500;color:#c8c2d8;min-width:14px;">0</em>
      </span>
      <span class="tt-stat" style="display:flex;align-items:center;gap:4px;color:#8a849e;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
        <em class="tt-val" style="font-style:normal;font-weight:500;color:#c8c2d8;min-width:14px;">0</em>
      </span>
    </div>
    <div class="tt-row" style="display:flex;gap:14px;justify-content:center;">
      <span class="tt-stat" style="display:flex;align-items:center;gap:4px;color:#8a849e;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
        <em class="tt-val" style="font-style:normal;font-weight:500;color:#c8c2d8;min-width:14px;">0</em>
      </span>
      <span class="tt-stat" style="display:flex;align-items:center;gap:4px;color:#8a849e;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <em class="tt-val" style="font-style:normal;font-weight:500;color:#c8c2d8;min-width:14px;">0</em>
      </span>
    </div>
  `
  const tooltipLabel = new CSS2DObject(tooltipEl)
  tooltipLabel.position.set(0, 0, 0)
  scene.add(tooltipLabel)

  // ═══ 点击 + 悬停检测 ═══
  {
    const raycaster = new Raycaster()
    const mouse = new Vector2()
    const _v = new Vector3()
    const _w = new Vector3()
    const DRAG_THRESHOLD = 5
    let clickDrag = false
    let hoveredStarId = -1
    let hoverCheckTimer = 0

    // 预计算所有星的归一化屏幕投影方向
    const starScreenNorms: { id: number; nx: number; ny: number; nz: number }[] = []
    const starNormMap = new Map<number, { nx: number; ny: number; nz: number }>()
    for (const s of stars) {
      const len = Math.sqrt(s.x*s.x + s.y*s.y + s.z*s.z)
      if (len > 0) {
        const norm = { id: s.id, nx: s.x/len, ny: s.y/len, nz: s.z/len }
        starScreenNorms.push(norm)
        starNormMap.set(s.id, norm)
      }
    }

    function hideTooltip() {
      tooltipEl.style.opacity = '0'
      hoverGlow.visible = false
      hoveredStarId = -1
      options?.onStarHover?.(null)
    }

    function showTooltip(starId: number) {
      const star = stars[starId]
      if (!star) return hideTooltip()
      const nameEl = tooltipEl.querySelector('.tt-name') as HTMLElement
      const vals = tooltipEl.querySelectorAll('.tt-val') as NodeListOf<HTMLElement>
      if (star.name) {
        nameEl.textContent = star.name
      } else {
        const rh = Math.floor(star.ra), rm = Math.floor((star.ra - rh) * 60)
        const ds = star.dec >= 0 ? '+' : '-'
        const dd = Math.floor(Math.abs(star.dec)), dm = Math.floor((Math.abs(star.dec) - dd) * 60)
        nameEl.textContent = `${rh}h${String(rm).padStart(2,'0')}m ${ds}${dd}°${String(dm).padStart(2,'0')}′`
      }
      const stats = statsCache.get(star.id)
      vals[0].textContent = stats ? String(stats.stories) : '0'
      vals[1].textContent = stats ? String(stats.resonance) : '0'
      vals[2].textContent = stats ? String(stats.views) : '0'
      vals[3].textContent = stats ? String(stats.favorites) : '0'
      _w.set(star.x, star.y, star.z).applyMatrix4(skyGroup.matrixWorld)
      tooltipLabel.position.set(_w.x, _w.y - 50, _w.z)
      hoverGlow.position.set(_w.x, _w.y, _w.z)
      tooltipEl.style.opacity = '1'
      hoverGlow.visible = true
      ;(hoverGlow.material as SpriteMaterial).opacity = 0.95
      hoveredStarId = starId
      options?.onStarHover?.(starId)
    }

    canvas.addEventListener('pointerdown', () => { clickDrag = false })
    canvas.addEventListener('pointermove', (e) => {
      if (dragging) {
        const dx = e.clientX - px, dy = e.clientY - py
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) clickDrag = true
        hideTooltip(); return
      }
      const now = performance.now()
      if (now - hoverCheckTimer < 80) return
      hoverCheckTimer = now
      const rect = canvas.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      // 屏幕空间投影（考虑 skyGroup 旋转）
      skyGroup.updateMatrixWorld()
      camera.updateMatrixWorld()
      let bestDist = Infinity, bestId = -1
      for (const sn of starScreenNorms) {
        _v.set(sn.nx * SPHERE_RADIUS, sn.ny * SPHERE_RADIUS, sn.nz * SPHERE_RADIUS)
        _v.applyMatrix4(skyGroup.matrixWorld)
        _v.project(camera)
        if (_v.z > 1) continue
        const dx = _v.x - mouse.x, dy = _v.y - mouse.y
        const d = dx*dx + dy*dy
        if (d < bestDist) { bestDist = d; bestId = sn.id }
      }
      if (bestDist < 0.0008 && bestId !== -1) {
        if (bestId !== hoveredStarId) showTooltip(bestId)
      } else {
        hideTooltip()
      }
    })
    canvas.addEventListener('pointerleave', hideTooltip)
    canvas.addEventListener('pointerup', (e) => {
      if (clickDrag) return
      const rect = canvas.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      raycaster.params.Points!.threshold = 8
      const hits = raycaster.intersectObjects(starPointsRefs)
      if (hits.length) {
        const hit = hits[0]
        const tierIdx = hit.object.userData.tierIndex as number
        const starId = tierStarIds[tierIdx][hit.index!]
        options?.onStarClick?.(starId)
      }
      // 检测行星点击
      if (!hits.length && planetMeshes.length) {
        const planetHits = raycaster.intersectObjects(planetMeshes)
        if (planetHits.length) {
          const pm = planetHits[0].object as Mesh
          const pd = pm.userData as { planetName: string; planetNameCN: string }
          if (pd.planetName) {
            options?.onPlanetClick?.(pd.planetName, pd.planetNameCN)
          }
        }
      }
    })
  }

  // ═══ 地平旋转：赤道坐标系 → 地平坐标系 ═══
  {
    const lat = options?.observerLat ?? 0
    const lng = options?.observerLng ?? 0
    if (lat !== 0 || lng !== 0) {
      // 计算本地恒星时
      const jd = Date.now() / 86400000 + 2440587.5
      const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
      const lst = ((gmst + lng) % 360 + 360) % 360
      const lstRad = lst * D2R
      const latRad = lat * D2R

      // 旋转天球组：
      // 1. 绕 Y 轴旋转，将本地子午圈对准相机前方（-Z 方向）
      //    本地子午圈的 RA = LST，在 raDecXYZ 中角度 = LST*15°
      //    -Z 方向对应 RA=6h = 90°，所以旋转角 = 90° - LST*15°
      //    但 raDecXYZ 中 RA 转弧度是 raH/24*2π = raH * π/12
      //    LST 是度，转弧度：lstRad = lst * π/180
      //    旋转角 = π/2 - lstRad
      //
      // 2. 绕 X 轴旋转，将天北极倾斜到正确仰角
      //    天北极从 +Y（天顶）倾斜到仰角 = 纬度
      //    旋转角 = 90° - lat
      skyGroup.rotation.order = 'YXZ'
      skyGroup.rotation.y = Math.PI / 2 - lstRad
      skyGroup.rotation.x = Math.PI / 2 - latRad
    }
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
    labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight)
  })


  // ═══ 太阳系行星 ═══
  import('../data/planets').then(async ({ planets, getBodyPosition }) => {
    // 程序纹理生成
    function createPlanetTexture(name: string, color: number): CanvasTexture {
      const size = 128
      const c = document.createElement('canvas')
      c.width = c.height = size
      const ctx = c.getContext('2d')!
      const r = (color >> 16) & 0xff
      const g = (color >> 8) & 0xff
      const b = color & 0xff

      // 基础填充
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(0, 0, size, size)

      if (name === 'Sun') {
        // 太阳：渐变发光
        const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
        grad.addColorStop(0, '#fff8e0')
        grad.addColorStop(0.4, '#ffdd88')
        grad.addColorStop(0.8, '#ff9944')
        grad.addColorStop(1, '#cc6600')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, size, size)
      } else if (name === 'Moon') {
        // 月球：灰色+陨石坑
        ctx.fillStyle = '#b0b0b0'
        ctx.fillRect(0, 0, size, size)
        for (let i = 0; i < 30; i++) {
          const cx = Math.random() * size
          const cy = Math.random() * size
          const cr = 2 + Math.random() * 6
          ctx.beginPath()
          ctx.arc(cx, cy, cr, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(80,80,80,${0.2 + Math.random() * 0.3})`
          ctx.fill()
        }
      } else if (name === 'Venus') {
        // 金星：旋涡云层
        for (let y = 0; y < size; y += 2) {
          const offset = Math.sin(y * 0.08) * 10
          ctx.fillStyle = `rgba(${r + offset},${g + offset},${b},0.5)`
          ctx.fillRect(0, y, size, 2)
        }
      } else if (name === 'Mars') {
        // 火星：红色+暗色区域+极冠
        for (let i = 0; i < 15; i++) {
          const cx = Math.random() * size
          const cy = Math.random() * size
          const cr = 5 + Math.random() * 15
          ctx.beginPath()
          ctx.arc(cx, cy, cr, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(140,50,20,${0.15 + Math.random() * 0.2})`
          ctx.fill()
        }
        // 北极冠
        ctx.fillStyle = 'rgba(220,220,230,0.4)'
        ctx.fillRect(0, 0, size, size * 0.08)
      } else if (name === 'Jupiter') {
        // 木星：条纹+大红斑
        const bands = ['#cc9966','#b8865c','#ddbb88','#aa7744','#ccaa77','#bb9966','#ddcc99','#cc8855']
        const bandH = size / bands.length
        bands.forEach((col, i) => {
          ctx.fillStyle = col
          ctx.fillRect(0, i * bandH, size, bandH + 1)
        })
        // 大红斑
        ctx.beginPath()
        ctx.ellipse(size * 0.65, size * 0.55, 12, 8, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#cc6644'
        ctx.fill()
      } else if (name === 'Saturn') {
        // 土星：淡黄色条纹
        for (let y = 0; y < size; y += 3) {
          const shade = 180 + Math.sin(y * 0.1) * 20
          ctx.fillStyle = `rgb(${shade+20},${shade+10},${shade-20})`
          ctx.fillRect(0, y, size, 3)
        }
      }

      const tex = new CanvasTexture(c)
      tex.colorSpace = 'srgb'
      return tex
    }

    const lat = options?.observerLat ?? 0
    const lng = options?.observerLng ?? 0
    const R = SPHERE_RADIUS * 0.98

    for (const planet of planets) {
      const pos = await getBodyPosition(planet.name, lat, lng)
      if (!pos) continue
      const { ra, dec } = pos
      const { x, y, z } = raDecXYZ(ra, dec, R)
      // 行星球体
      const geo = new SphereGeometry(planet.size, 16, 12)
      const mat = new MeshLambertMaterial({ map: createPlanetTexture(planet.name, planet.color) })
      const mesh = new Mesh(geo, mat)
      mesh.position.set(x, y, z)
      skyGroup.add(mesh)
      mesh.userData = { planetName: planet.name, planetNameCN: planet.nameCN }
      planetMeshes.push(mesh)
      // 太阳发���光晕
      if (planet.name === 'Sun') {
        const glowGeo = new SphereGeometry(planet.size * 2.5, 16, 12)
        const glowMat = new MeshBasicMaterial({
          color: 0xffcc66, transparent: true, opacity: 0.2,
          blending: AdditiveBlending, depthWrite: false,
        })
        const glow = new Mesh(glowGeo, glowMat)
        glow.position.copy(mesh.position)
        skyGroup.add(glow)
      }
      // 土星环
      if (planet.ringColor) {
        const ringGeo = new RingGeometry(planet.ringSize! - 1, planet.ringSize! + 1, 32)
        const ringMat = new MeshBasicMaterial({
          color: planet.ringColor, side: 2, transparent: true, opacity: 0.6,
          depthWrite: false,
        })
        const ring = new Mesh(ringGeo, ringMat)
        ring.position.copy(mesh.position)
        ring.rotation.x = Math.PI * 0.45
        skyGroup.add(ring)
      }
      // 标签
      const el = document.createElement('div')
      el.textContent = planet.nameCN
      el.style.cssText = 'color:#ffd98a;font-size:11px;background:rgba(7,8,22,0.6);padding:1px 6px;border-radius:8px;border:1px solid rgba(255,217,138,0.2);backdrop-filter:blur(4px);white-space:nowrap'
      const label = new CSS2DObject(el)
      const len = Math.sqrt(x*x + y*y + z*z)
      label.position.set(x * (1 + 6/len), y * (1 + 6/len), z * (1 + 6/len))
      skyGroup.add(label)
    }
  })

  // ═══ 渲染 ═══
  let af = 0
  function animate() {
    af = requestAnimationFrame(animate)
    camera.fov = userFov
    camera.updateProjectionMatrix()
    labelRenderer.render(scene, camera)
    renderer.render(scene, camera)
  }
  animate()
  camera.rotation.set(rotX, rotY, 0, 'YXZ')

  return {
    camera,
    zoomIn()  { userFov = Math.max(FOV_MIN, userFov - 5); },
    zoomOut() { userFov = Math.min(FOV_MAX, userFov + 5); },
    setStarStatsCache(cache: Map<number, { stories: number; resonance: number; views: number; favorites: number }>) { cache.forEach((v,k) => statsCache.set(k,v)) },
    dispose() {
      cancelAnimationFrame(af)
      lrEl.remove()
      renderer.dispose()
      scene.clear()
    },
  }
}
