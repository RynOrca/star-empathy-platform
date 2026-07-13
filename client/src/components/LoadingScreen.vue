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
  gap: 1.5rem;
  z-index: 100;
}
.star-loader {
  width: 36px;
  height: 36px;
  animation: spin 2s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading-text {
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0.03em;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>
