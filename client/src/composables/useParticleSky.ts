import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'

export function useParticleSky(canvasRef: { value: HTMLCanvasElement | null }) {
  const loaded = ref(false)
  let animId = 0
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: THREE.WebGLRenderer

  function init() {
    const canvas = canvasRef.value
    if (!canvas) return

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 1, 1000)
    camera.position.z = 300

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // 2000 粒子
    const count = 2000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const r = 250 + Math.random() * 150
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      const colorChoice = Math.random()
      if (colorChoice < 0.5) {
        colors[i * 3] = 1; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 0.54 // gold
      } else if (colorChoice < 0.8) {
        colors[i * 3] = 0.55; colors[i * 3 + 1] = 0.66; colors[i * 3 + 2] = 1 // blue
      } else {
        colors[i * 3] = 0.78; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 0.8 // green
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.8,
    })
    const stars = new THREE.Points(geo, mat)
    scene.add(stars)

    // 流星（偶发）
    let meteorTime = 0
    let meteorLine: THREE.Line | null = null

    function spawnMeteor() {
      if (meteorLine) scene.remove(meteorLine)
      const startAngle = Math.random() * Math.PI * 2
      const len = 20 + Math.random() * 30
      const points = []
      const dx = Math.cos(startAngle) * len
      const dy = Math.sin(startAngle) * len
      points.push(new THREE.Vector3(-dx, -dy, 0))
      points.push(new THREE.Vector3(0, 0, 0))
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      meteorLine = new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
      }))
      const r = 200 + Math.random() * 100
      meteorLine.position.set(
        Math.cos(startAngle) * r,
        Math.sin(startAngle) * r * 0.6,
        0,
      )
      meteorLine.rotation.z = startAngle - Math.PI
      scene.add(meteorLine)
      meteorTime = performance.now()
    }

    function animate() {
      animId = requestAnimationFrame(animate)
      stars.rotation.y += 0.0005
      stars.rotation.x += 0.0002

      // 粒子呼吸
      const breath = Math.sin(performance.now() * 0.001) * 0.15 + 0.8
      mat.opacity = breath

      // 流星
      const now = performance.now()
      if (meteorLine) {
        const age = now - meteorTime
        if (age > 800) {
          scene.remove(meteorLine)
          meteorLine = null
        } else {
          (meteorLine.material as THREE.LineBasicMaterial).opacity = 0.6 * (1 - age / 800)
          meteorLine.position.x -= 3
          meteorLine.position.y -= 2
        }
      } else if (Math.random() < 0.003) {
        spawnMeteor()
      }

      renderer.render(scene, camera)
    }

    animate()

    window.addEventListener('resize', () => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    })

    loaded.value = true
  }

  onMounted(() => init())
  onBeforeUnmount(() => {
    cancelAnimationFrame(animId)
    renderer?.dispose()
  })

  return { loaded }
}
