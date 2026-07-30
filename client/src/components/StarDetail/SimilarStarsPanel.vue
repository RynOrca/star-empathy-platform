<template>
  <div class="similar-panel">
    <div class="panel-header">
      <SparklesIcon :size="13" class="panel-icon" />
      <span class="panel-title">内核相似的星星</span>
    </div>
    <div v-if="similarStars.length > 0" class="panel-body">
      <div
        v-for="s in similarStars.slice(0, 5)"
        :key="s.catalogStarId"
        class="similar-item"
        @click="onSimilarStarClick(s.catalogStarId)"
      >
        <div class="similar-info">
          <span class="similar-name">{{ getStarName(s.catalogStarId) }}</span>
          <span class="similar-score">{{ Math.round(s.score * 100) }}%</span>
        </div>
        <div class="similar-tags">
          <span v-for="tag in s.sharedEmotions.slice(0, 3)" :key="tag" class="similar-tag-emotion">{{ tag }}</span>
        </div>
      </div>
    </div>
    <div v-else class="panel-empty">
      <SparklesIcon :size="14" class="empty-icon" />
      <span>暂无相似星星</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'

const SparklesIcon = Sparkles

defineProps<{
  similarStars: Array<{ catalogStarId: number; score: number; sharedEmotions: string[] }>
  getStarName: (id: number) => string
  onSimilarStarClick: (id: number) => void
}>()
</script>

<style scoped>
.similar-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.015);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--rule);
  flex-shrink: 0;
  background: rgba(255, 217, 138, 0.03);
}
.panel-icon { color: var(--accent); flex-shrink: 0; }
.panel-title {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--muted);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.panel-body::-webkit-scrollbar { width: 5px; }
.panel-body::-webkit-scrollbar-track { background: transparent; }
.panel-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.similar-item {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.similar-item:hover {
  border-color: var(--accent-border);
  background: rgba(255, 217, 138, 0.04);
}
.similar-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.similar-name {
  font-size: 0.8rem;
  color: var(--ink);
  font-weight: 500;
}
.similar-score {
  font-size: 0.72rem;
  color: var(--accent);
  font-weight: 600;
}
.similar-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.similar-tag-emotion {
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(255, 139, 125, 0.1);
  color: #ff8b7d;
  border: 1px solid rgba(255, 139, 125, 0.15);
}

.panel-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px 10px;
  color: var(--muted-light);
  font-size: 0.75rem;
  font-style: italic;
  opacity: 0.5;
}
.empty-icon { opacity: 0.3; }
</style>
