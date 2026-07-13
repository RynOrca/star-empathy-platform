<template>
  <div class="app">
    <SkyCanvas />
    <div class="hint">
      <p>拖拽旋转 &nbsp;|&nbsp; 滚轮缩放</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import SkyCanvas from './components/SkyCanvas.vue'
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
