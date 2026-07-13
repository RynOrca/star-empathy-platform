<template>
  <div class="app">
    <SkyCanvas ref="skyRef" />
    <div class="zoom-controls">
      <button class="zoom-btn" @click="zoomIn">+</button>
      <button class="zoom-btn" @click="zoomOut">−</button>
    </div>
    <div class="horizon-overlay" />
    <div class="hint">
      <p>拖拽旋转 &nbsp;|&nbsp; 滚轮缩放</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SkyCanvas from './components/SkyCanvas.vue'

const skyRef = ref<InstanceType<typeof SkyCanvas> | null>(null)

function zoomIn()  { skyRef.value?.sky?.zoomIn() }
function zoomOut() { skyRef.value?.sky?.zoomOut() }
</script>

<style>
@import './styles/variables.css';

.app {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: var(--bg);
  font-family: var(--font);
  color: var(--ink);
}

.horizon-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 55vh;
  background: linear-gradient(to top,
    rgba(5, 8, 18, 1) 0%,
    rgba(8, 12, 26, 0.95) 20%,
    rgba(12, 16, 36, 0.75) 40%,
    rgba(20, 24, 50, 0.35) 60%,
    rgba(15, 18, 40, 0.12) 80%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 3;
}

.zoom-controls {
  position: fixed;
  right: 1.5rem;
  bottom: 5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 10;
}
.zoom-btn {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--bg2) 80%, transparent);
  border: 1px solid var(--rule);
  color: var(--ink);
  font-size: 1.2rem;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: border-color 0.3s;
  display: flex; align-items: center; justify-content: center;
}
.zoom-btn:hover { border-color: var(--accent); }

.hint {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  color: var(--muted);
  font-size: 0.82rem;
  opacity: 0.6;
  z-index: 5;
  pointer-events: none;
}
</style>
