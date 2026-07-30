<template>
  <div class="highlights-panel">
    <div class="panel-header">
      <SparklesIcon :size="13" class="panel-icon" />
      <span class="panel-title">天区故事精选</span>
      <span v-if="loading" class="panel-loading">凝练中...</span>
    </div>
    <div v-if="highlights.length > 0" class="panel-body">
      <div
        v-for="(h, hi) in highlights"
        :key="h.catalogStarId"
        class="highlight-card"
        :class="{ 'is-target': hi === 0 && h.score === 0 }"
        @click="h.catalogStarId !== currentStarId && onSimilarStarClick(h.catalogStarId)"
      >
        <div class="highlight-head">
          <span class="highlight-star-name">
            <span class="highlight-dot" :class="{ 'dot-target': hi === 0 && h.score === 0 }"></span>
            {{ getStarName(h.catalogStarId) }}
          </span>
          <span v-if="h.score > 0" class="highlight-score">{{ Math.round(h.score * 100) }}%</span>
          <span v-else class="highlight-badge-target">当前</span>
        </div>
        <div class="highlight-emotions" v-if="h.sharedEmotions.length > 0">
          <span v-for="tag in h.sharedEmotions.slice(0, 3)" :key="tag" class="similar-tag-emotion">{{ tag }}</span>
        </div>
        <div class="highlight-essences">
          <p v-for="(essence, ei) in h.essences" :key="ei" class="highlight-essence">
            "{{ essence }}"
          </p>
        </div>
      </div>
    </div>
    <div v-else class="panel-empty">
      <SparklesIcon :size="14" class="empty-icon" />
      <span>暂无天区故事</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'

const SparklesIcon = Sparkles

defineProps<{
  highlights: Array<{ catalogStarId: number; score: number; sharedEmotions: string[]; essences: string[] }>
  loading: boolean
  currentStarId: number
  getStarName: (id: number) => string
  onSimilarStarClick: (id: number) => void
}>()
</script>

<style scoped>
.highlights-panel {
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
  background: rgba(202, 167, 255, 0.03);
}
.panel-icon { color: var(--star-purple); flex-shrink: 0; }
.panel-title {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--muted);
  flex: 1;
}
.panel-loading {
  font-size: 0.7rem;
  color: var(--accent);
  opacity: 0.7;
  font-style: italic;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 0.3; }
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.panel-body::-webkit-scrollbar { width: 5px; }
.panel-body::-webkit-scrollbar-track { background: transparent; }
.panel-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.highlight-card {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--rule);
  background: rgba(255, 255, 255, 0.015);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.highlight-card:hover {
  border-color: var(--accent-border);
  background: rgba(255, 217, 138, 0.03);
}
.highlight-card.is-target {
  border-color: rgba(255, 217, 138, 0.2);
  background: rgba(255, 217, 138, 0.04);
}
.highlight-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.highlight-star-name {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 6px;
}
.highlight-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  opacity: 0.5;
}
.highlight-dot.dot-target {
  opacity: 1;
  box-shadow: 0 0 4px var(--accent);
}
.highlight-score {
  font-size: 0.7rem;
  color: var(--accent);
  font-weight: 600;
}
.highlight-badge-target {
  font-size: 0.6rem;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(255, 217, 138, 0.12);
  color: var(--accent);
  font-weight: 500;
}
.highlight-emotions {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-bottom: 6px;
}
.similar-tag-emotion {
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(255, 139, 125, 0.1);
  color: #ff8b7d;
  border: 1px solid rgba(255, 139, 125, 0.15);
}
.highlight-essences {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.highlight-essence {
  margin: 0;
  font-size: 0.73rem;
  color: var(--ink-secondary);
  line-height: 1.6;
  font-style: italic;
  opacity: 0.75;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
