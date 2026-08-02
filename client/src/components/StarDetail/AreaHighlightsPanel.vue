<template>
  <div class="highlights-panel">
    <div v-if="highlights.length > 0" class="panel-body">
      <div
        v-for="(h, hi) in highlights"
        :key="h.catalogStarId"
        class="highlight-item"
        :class="{ 'is-current': hi === 0 && h.score === 0 }"
        @click="h.catalogStarId !== currentStarId && onSimilarStarClick(h.catalogStarId)"
      >
        <div class="item-main">
          <div class="item-left">
            <span
              class="star-dot"
              :style="{ background: h.catalogStarId !== currentStarId ? getStarColor(h.catalogStarId) : '#ffd98a', boxShadow: `0 0 5px ${h.catalogStarId !== currentStarId ? getStarColor(h.catalogStarId) : '#ffd98a'}` }"
            ></span>
            <span class="star-name">{{ getStarName(h.catalogStarId) }}</span>
            <span class="con-tag">{{ getConstellationName(h.catalogStarId) }}</span>
          </div>
          <span v-if="h.score > 0" class="score-num">{{ Math.round(h.score * 100) }}%</span>
          <span v-else class="current-dot">当前</span>
        </div>

        <div class="tags-row" v-if="h.sharedEmotions.length > 0">
          <span v-for="tag in h.sharedEmotions.slice(0, 3)" :key="tag" class="tag-emotion">{{ tag }}</span>
        </div>

        <div class="essences">
          <p v-for="(essence, ei) in h.essences.slice(0, 2)" :key="ei" class="essence">
            <span class="quote-mark">"</span>{{ essence }}<span class="quote-mark">"</span>
          </p>
        </div>

        <div class="item-footer" v-if="h.storyCount > 0">
          <span class="story-dot"></span>
          <span>{{ h.storyCount }} 故事</span>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="panel-empty">
      <span>天区加载中...</span>
    </div>

    <div v-else class="panel-empty">
      <span>暂无天区故事</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  highlights: Array<{ catalogStarId: number; score: number; sharedEmotions: string[]; essences: string[]; storyCount: number }>
  loading: boolean
  currentStarId: number
  getStarName: (id: number) => string
  getStarColor: (id: number) => string
  getConstellationName: (id: number) => string
  onSimilarStarClick: (id: number) => void
}>()
</script>

<style scoped>
.highlights-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 7px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
  flex: 1;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(202, 167, 255, 0.18) transparent;
}
.panel-body::-webkit-scrollbar {
  width: 3px;
}
.panel-body::-webkit-scrollbar-track {
  background: transparent;
}
.panel-body::-webkit-scrollbar-thumb {
  background: rgba(202, 167, 255, 0.18);
  border-radius: 2px;
}
.panel-body::-webkit-scrollbar-thumb:hover {
  background: rgba(202, 167, 255, 0.32);
}

.highlight-item {
  padding: 11px 13px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: background 0.18s ease;
  flex-shrink: 0;
}
.highlight-item:hover {
  background: rgba(202, 167, 255, 0.08);
}
.highlight-item.is-current {
  background: rgba(255, 217, 138, 0.06);
}

.item-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.item-left {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.star-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.star-name {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.88);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.con-tag {
  font-size: 0.63rem;
  color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.04);
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
}
.score-num {
  font-size: 0.72rem;
  color: #caa7ff;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
  flex-shrink: 0;
  margin-left: 8px;
}
.current-dot {
  font-size: 0.62rem;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(255, 217, 138, 0.15);
  color: #ffd98a;
  font-weight: 600;
  flex-shrink: 0;
  margin-left: 8px;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.tag-emotion {
  font-size: 0.62rem;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
  background: rgba(255, 139, 125, 0.1);
  color: #ff8b7d;
}

.essences {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 6px;
}
.essence {
  margin: 0;
  font-size: 0.7rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.45);
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  padding-left: 6px;
  border-left: 2px solid rgba(202, 167, 255, 0.15);
}
.quote-mark {
  color: rgba(202, 167, 255, 0.35);
  font-weight: 600;
}

.item-footer {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.64rem;
  color: rgba(255, 255, 255, 0.25);
}
.story-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

.panel-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.2);
  font-size: 0.75rem;
  padding: 20px 10px;
}
</style>
