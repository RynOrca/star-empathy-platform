<template>
  <div class="star-header">
    <div class="star-color-dot" :style="{ background: starInfo?.color || '#fff6e8' }"></div>
    <div>
      <div class="star-name">{{ starInfo?.displayName }}</div>
      <div class="star-subtitle" v-if="starInfo">
        {{ starInfo.conName }}
        <span class="star-coord" v-if="starInfo.ra != null && starInfo.dec != null && hasRealName">
          {{ formatRaDec(starInfo.ra, starInfo.dec) }}
        </span>
        <span class="star-id" v-if="starInfo.id != null">#{{ starInfo.id }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  starInfo: { id: number; displayName: string; conName: string; color: string; ra: number; dec: number } | null
}>()

// 仅当星星有真实名称（非坐标字符串）时显示赤经赤纬
const hasRealName = computed(() => {
  const name = props.starInfo?.displayName
  if (!name) return false
  // 坐标字符串格式: "00h00m · +00°00′" 或 "00h00m · -00°00′"
  return !/^\d{1,2}h\d{2}m\s*·\s*[+-]\d{1,2}°\d{2}′$/.test(name)
})

function formatRaDec(ra: number, dec: number): string {
  const raH = Math.floor(ra)
  const raM = Math.floor((ra - raH) * 60)
  const decSign = dec >= 0 ? '+' : ''
  const decD = Math.floor(Math.abs(dec))
  const decM = Math.floor((Math.abs(dec) - decD) * 60)
  return `${raH.toString().padStart(2, '0')}h${raM.toString().padStart(2, '0')}m \u00B7 ${decSign}${decD}\u00B0${decM.toString().padStart(2, '0')}\u2032`
}
</script>

<style scoped>
.star-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.star-color-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.08);
}
.star-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.02em;
  line-height: 1.3;
}
.star-subtitle {
  font-size: 0.78rem;
  color: var(--muted);
  margin-top: 2px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.star-coord {
  color: var(--muted);
  opacity: 0.75;
}
.star-id {
  color: var(--muted);
  opacity: 0.6;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
}
</style>