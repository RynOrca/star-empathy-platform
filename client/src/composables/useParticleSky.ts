import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'

function glowTex(size: number, color: string) {
  const c = document.createElement('canvas')
  c.width = size; c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
  g.addColorStop(0, color)
  g.addColorStop(0.08, color)
  g.addColorStop(0.35, 'rgba(0,0,0,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t
}

export function useParticleSky(canvas: { value: HTMLCanvasElement | null }) {
  const loaded = ref(false)
  let id = 0; let sc: THREE.Scene; let cam: THREE.PerspectiveCamera; let rend: THREE.WebGLRenderer
  const twinklePhases: number[] = []

  function init() {
    const el = canvas.value; if (!el) return
    sc = new THREE.Scene()
    cam = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.5, 900)
    cam.position.set(0, 0, 350)
    rend = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true })
    rend.setSize(el.clientWidth, el.clientHeight)
    rend.setPixelRatio(Math.min(devicePixelRatio, 2))

    const tg = glowTex(72, 'rgba(255,217,138,1)')
    const tb = glowTex(56, 'rgba(134,168,255,1)')
    const tw = glowTex(44, 'rgba(255,255,255,0.85)')

    // 三层星星，极缓视差漂移
    const layers = [
      { n: 500,  t: tg, s: 2.2, r0: 280, r1: 350, v: 4e-5 },
      { n: 800,  t: tb, s: 1.5, r0: 220, r1: 300, v: 7e-5 },
      { n: 1400, t: tw, s: 0.9, r0: 170, r1: 350, v: 3e-5 },
    ]

    const grps: THREE.Points[] = []
    for (const l of layers) {
      const pos = new Float32Array(l.n * 3)
      for (let i = 0; i < l.n; i++) {
        const r = l.r0 + Math.random() * (l.r1 - l.r0)
        const th = Math.random() * Math.PI * 2; const ph = Math.acos(2 * Math.random() - 1)
        pos[i * 3] = r * Math.sin(ph) * Math.cos(th)
        pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
        pos[i * 3 + 2] = r * Math.cos(ph)
        twinklePhases.push(Math.random() * Math.PI * 2)
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      const m = new THREE.PointsMaterial({
        size: l.s, map: l.t,
        blending: THREE.AdditiveBlending, depthWrite: false,
        transparent: true, opacity: 0.7,
      })
      const p = new THREE.Points(g, m); p.userData.spd = l.v; sc.add(p); grps.push(p)
    }

    // 银河带 —— 密集微光星沿对角线
    const bandCount = 3000
    const bandPos = new Float32Array(bandCount * 3)
    for (let i = 0; i < bandCount; i++) {
      // 沿对角线分布的椭球壳
      const angle = (Math.random() - 0.5) * Math.PI * 0.9 + Math.PI * 0.25
      const spread = (Math.random() - 0.5) * 0.35
      const r = 280 + Math.random() * 60
      const x = r * Math.cos(angle) * Math.cos(spread)
      const y = r * Math.sin(spread) * 0.4
      const z = r * Math.sin(angle) * Math.cos(spread)
      bandPos[i * 3] = x; bandPos[i * 3 + 1] = y; bandPos[i * 3 + 2] = z
    }
    const bandGeo = new THREE.BufferGeometry()
    bandGeo.setAttribute('position', new THREE.BufferAttribute(bandPos, 3))
    const bandTex = glowTex(32, 'rgba(160,180,220,0.6)')
    const bandMat = new THREE.PointsMaterial({
      size: 0.6, map: bandTex,
      blending: THREE.AdditiveBlending, depthWrite: false,
      transparent: true, opacity: 0.22,
    })
    const band = new THREE.Points(bandGeo, bandMat)
    band.userData.spd = 2e-5; sc.add(band); grps.push(band)

    // 流星
    let ml: THREE.Line | null = null; let mt = 0
    function mete() {
      if (ml) sc.remove(ml)
      const a = Math.random() * Math.PI * 2; const ln = 12 + Math.random() * 20
      // 渐变流星（头部亮尾淡）
      const pts = [new THREE.Vector3(-ln * 0.3, 0, 0), new THREE.Vector3(0, 0, 0)]
      ml = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xddeeff, transparent: true, opacity: 0.55 }),
      )
      const r = 250 + Math.random() * 50
      ml.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.4, -15 + Math.random() * 30)
      ml.rotation.z = a - Math.PI * 0.5; sc.add(ml); mt = performance.now()
    }

    function loop() {
      id = requestAnimationFrame(loop)
      const t = performance.now() * 0.0003
      for (let gi = 0; gi < grps.length; gi++) {
        grps[gi].rotation.y += grps[gi].userData.spd
        grps[gi].rotation.x += grps[gi].userData.spd * 0.35
        // 微颤亮度
        if (gi < 3) {
          const m = grps[gi].material as THREE.PointsMaterial
          const base = 0.7; const breath = Math.sin(t) * 0.06
          m.opacity = base + breath
        }
      }
      const n = performance.now()
      if (ml) {
        const a = n - mt
        if (a > 1000) { sc.remove(ml); ml = null }
        else { (ml.material as THREE.LineBasicMaterial).opacity = 0.55 * (1 - a / 1000); ml.position.x -= 2; ml.position.y -= 1.2 }
      } else if (Math.random() < 0.0015) mete()
      rend.render(sc, cam)
    }
    loop()
    addEventListener('resize', () => {
      cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix()
      rend.setSize(el.clientWidth, el.clientHeight)
    })
    loaded.value = true
  }
  onMounted(() => init())
  onBeforeUnmount(() => { cancelAnimationFrame(id); rend?.dispose() })
  return { loaded }
}
