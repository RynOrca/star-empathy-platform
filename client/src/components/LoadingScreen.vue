<template>
  <div class="loading-screen">
    <div class="loader">
      <svg class="star-loader" viewBox="0 0 40 40">
        <polygon
          points="20,2 25,15 38,15 28,23 31,36 20,28 9,36 12,23 2,15 15,15"
          fill="var(--accent)"
          opacity="0.9"
        />
      </svg>
    </div>
    <p class="loading-text">正在连接星空...</p>
  </div>
</template>

<style scoped>
.loading-screen {
  position: fixed;
  inset: 0;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.2rem;
  z-index: 100;
}
.star-loader {
  width: 48px;
  height: 48px;
  animation: spin 2s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading-text {
  color: var(--muted);
  font-size: 0.95rem;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
</style>
