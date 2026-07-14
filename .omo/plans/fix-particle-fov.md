# Fix: Three.js 粒子星空只显示左上角

## 根因
`useParticleSky.ts` 中 FOV=50 视野太窄。
相机在 z=350，视野半径约 163，而星星球壳半径 170-350，绝大部分在视野外。

## 修改
**文件**: `client/src/composables/useParticleSky.ts`  
**位置**: 第 24-25 行

```diff
-    cam = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.5, 900)
-    cam.position.set(0, 0, 350)
+    cam = new THREE.PerspectiveCamera(80, el.clientWidth / el.clientHeight, 0.5, 1200)
+    cam.position.set(0, -30, 320)
+    cam.lookAt(0, 0, 0)
```

FOV 从 50 → 80，视野扩大约 3 倍，覆盖整个星壳。Y 偏移 -30 让银河带可见。
