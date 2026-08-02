<template>
  <div class="similar-panel">
    <div v-if="similarStars.length > 0" class="panel-body">
      <div
        v-for="s in similarStars.slice(0, 8)"
        :key="s.catalogStarId"
        class="similar-item"
        @click="onSimilarStarClick(s.catalogStarId)"
      >
        <div class="item-main">
          <div class="item-left">
            <span
              class="star-dot"
              :style="{ background: getStarColor(s.catalogStarId), boxShadow: `0 0 5px ${getStarColor(s.catalogStarId)}` }"
            ></span>
            <span class="star-name">{{ getStarName(s.catalogStarId) }}</span>
            <span class="con-tag">{{ getConstellationName(s.catalogStarId) }}</span>
          </div>
          <span class="score-num">{{ Math.round(s.score * 100) }}%</span>
        </div>
        <div class="score-bar">
          <div
            class="score-fill"
            :style="{ width: Math.round(s.score * 100) + '%' }"
          ></div>
        </div>
        <div class="tags-row" v-if="s.sharedEmotions.length > 0 || s.sharedThemes.length > 0">
          <span
            v-for="tag in [...s.sharedEmotions.slice(0, 2), ...s.sharedThemes.slice(0, 2)].slice(0, 3)"
            :key="tag"
            class="tag"
            :class="{
              'tag-emotion': s.sharedEmotions.includes(tag),
              'tag-theme': s.sharedThemes.includes(tag),
            }"
          >
            {{ tag }}
          </span>
        </div>
        <div class="item-footer" v-if="s.storyCount > 0">
          <span class="story-dot"></span>
          <span>{{ s.storyCount }} 故事</span>
        </div>
      </div>
    </div>

    <div v-else class="panel-empty">
      <span>暂无相似星星</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  similarStars: Array<{ catalogStarId: number; score: number; sharedEmotions: string[]; sharedThemes: string[]; storyCount: number }>
  getStarName: (id: number) => string
  getStarColor: (id: number) => string
  getConstellationName: (id: number) => string
  onSimilarStarClick: (id: number) => void
}>()
</script>

<style scoped>
.similar-panel {
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
  scrollbar-color: rgba(255,217,138,0.18) transparent;
}
.panel-body::-webkit-scrollbar {
  width: 3px;
}
.panel-body::-webkit-scrollbar-track {
  background: transparent;
}
.panel-body::-webkit-scrollbar-thumb {
  background: rgba(255, 217, 138, 0.18);
  border-radius: 2px;
}
.panel-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 217, 138, 0.3);
}

.similar-item {
  padding: 11px 13px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: background 0.18s ease;
  flex-shrink: 0;
}
.similar-item:hover {
  background: rgba(255, 217, 138, 0.08);
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
  color: #ffd98a;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
  flex-shrink: 0;
  margin-left: 8px;
}

.score-bar {
  height: 2px;
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  margin-bottom: 8px;
}
.score-fill {
  height: 100%;
  border-radius: 1px;
  background: linear-gradient(90deg, rgba(255, 217, 138, 0.4), #ffd98a);
  transition: width 0.5s ease;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}
.tag {
  font-size: 0.62rem;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}
.tag-emotion {
  background: rgba(255, 139, 125, 0.1);
  color: #ff8b7d;
}
.tag-theme {
  background: rgba(134, 168, 255, 0.1);
  color: #86a8ff;
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
