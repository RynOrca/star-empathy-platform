<template>
  <div>
    <!-- 详细信息行 -->
    <div class="info-rows" v-if="starInfo">
      <div class="info-row">
        <SunIcon :size="14" class="info-icon" />
        <div class="info-row-content">
          <span class="info-row-label">视星等</span>
          <span class="info-row-value">{{ starInfo.mag.toFixed(1) }} 等</span>
        </div>
      </div>

      <div class="info-row" v-if="starInfo.distance">
        <NavigationIcon :size="14" class="info-icon" />
        <div class="info-row-content">
          <span class="info-row-label">距离</span>
          <span class="info-row-value">{{ starInfo.distance }} 光年</span>
        </div>
      </div>

      <div class="info-row">
        <ThermometerIcon :size="14" class="info-icon" />
        <div class="info-row-content">
          <span class="info-row-label">色温</span>
          <span class="info-row-value">{{ getStarTemperature(starInfo.color) }}</span>
        </div>
      </div>

      <div class="info-row">
        <SparklesIcon :size="14" class="info-icon" />
        <div class="info-row-content">
          <span class="info-row-label">亮度</span>
          <span class="info-row-value">{{ getBrightnessLabel(starInfo.mag) }}</span>
        </div>
      </div>
    </div>

    <!-- 统计行 -->
    <div class="stats-row" v-if="catalogStats">
      <div class="stat-item">
        <BookOpenIcon :size="13" class="stat-icon" />
        <span class="stat-num">{{ catalogStats.storyCount }}</span>
        <span class="stat-label">故事</span>
      </div>
      <div class="stat-item">
        <HeartIcon :size="13" class="stat-icon" />
        <span class="stat-num">{{ catalogStats.totalResonance }}</span>
        <span class="stat-label">共鸣</span>
      </div>
      <div class="stat-item">
        <EyeIcon :size="13" class="stat-icon" />
        <span class="stat-num">{{ catalogStats.starViews }}</span>
        <span class="stat-label">访问</span>
      </div>
      <div class="stat-item">
        <StarIcon :size="13" class="stat-icon" :class="{ 'is-favorited': isFavorited }" />
        <span class="stat-num">{{ catalogStats.favoriteCount }}</span>
        <span class="stat-label">收藏</span>
      </div>
    </div>

    <!-- 天文事件 widget -->
    <div class="astro-events" v-if="astroData?.star">
      <div class="astro-events-header">
        <CompassIcon :size="13" class="astro-icon" />
        <span class="astro-events-title">天文事件</span>
        <span
          class="astro-visibility-badge"
          :class="{ 'is-visible': astroData.star.currentlyAboveHorizon }"
        >
          {{ astroData.star.currentlyAboveHorizon ? '地平线以上' : '地平线以下' }}
        </span>
      </div>

      <div class="astro-events-grid">
        <div class="astro-event-item">
          <SunIcon :size="12" class="astro-event-icon" />
          <div class="astro-event-content">
            <span class="astro-event-label">当前</span>
            <span class="astro-event-value">
              {{ formatAltitude(astroData.star.currentAltitude) }} · {{ azimuthToDirection(astroData.star.currentAzimuth) }}
            </span>
          </div>
        </div>

        <div class="astro-event-item">
          <SunriseIcon :size="12" class="astro-event-icon" />
          <div class="astro-event-content">
            <span class="astro-event-label">升起</span>
            <span class="astro-event-value">{{ formatClockTime(astroData.star.rise) }}</span>
          </div>
        </div>

        <div class="astro-event-item">
          <ClockIcon :size="12" class="astro-event-icon" />
          <div class="astro-event-content">
            <span class="astro-event-label">中天</span>
            <span class="astro-event-value">
              {{ formatClockTime(astroData.star.transit) }}
              <span class="astro-event-sub">({{ formatAltitude(astroData.star.transitAltitude) }})</span>
            </span>
          </div>
        </div>

        <div class="astro-event-item">
          <SunsetIcon :size="12" class="astro-event-icon" />
          <div class="astro-event-content">
            <span class="astro-event-label">落下</span>
            <span class="astro-event-value">{{ formatClockTime(astroData.star.set) }}</span>
          </div>
        </div>
      </div>
    </div>

    

    <!-- 北极星岁差科普 -->
    <div v-if="catalogStarId === 4" class="info-section precession-lore">
      <div class="info-label">北极星不是永恒的</div>
      <p class="lore-text">
        地球自转轴像一只倾斜的陀螺，在太空中缓慢画圆，周期约 <strong>25772 年</strong>。
        因此"北极星"这个位置在不同年代由不同的恒星担任：
      </p>
      <ul class="lore-list">
        <li><span class="lore-year">公元前 3000 年</span><span class="lore-star">天龙座 右枢（Thuban）</span></li>
        <li><span class="lore-year">今天</span><span class="lore-star">小熊座 勾陈一（Polaris）</span></li>
        <li><span class="lore-year">公元 13700 年</span><span class="lore-star">天琴座 织女星（Vega）</span></li>
      </ul>
      <p class="lore-footnote">—— 这就是岁差，星空在千年的尺度上悄悄改写人间的方向。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sun, Sparkles, Navigation, Thermometer, BookOpen, Heart, Eye, Compass, Sunrise, Sunset, Clock } from 'lucide-vue-next'

const SunIcon = Sun
const SparklesIcon = Sparkles
const NavigationIcon = Navigation
const ThermometerIcon = Thermometer
const BookOpenIcon = BookOpen
const HeartIcon = Heart
const EyeIcon = Eye
const CompassIcon = Compass
const SunriseIcon = Sunrise
const SunsetIcon = Sunset
const ClockIcon = Clock
const StarIcon = Sparkles

defineProps<{
  starInfo: { mag: number; distance: number | null; color: string; displayName: string; conName: string } | null
  catalogStats: { storyCount: number; totalResonance: number; totalViews: number; starViews: number; favoriteCount: number } | null
  astroData: {
    star?: { currentlyAboveHorizon: boolean; currentAltitude: number; currentAzimuth: number; rise: Date | null; transit: Date; transitAltitude: number; set: Date | null } | null
    moon?: { phaseLabel: string; illumination: number; phaseBrightness: number; nextFullMoon: Date | null } | null
  } | null
  isFavorited: boolean
  catalogStarId: number
  getStarTemperature: (color: string) => string
  getBrightnessLabel: (mag: number) => string
  formatAltitude: (deg: number) => string
  azimuthToDirection: (deg: number) => string
  formatClockTime: (t: Date | null) => string
  formatDateTime: (t: Date | null) => string
}>()
</script>

<style scoped>
/* ─── Info Rows ─── */
.info-rows {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--rule);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.info-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.info-icon {
  color: var(--muted-light);
  flex-shrink: 0;
  margin-top: 1px;
}
.info-row-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.info-row-label {
  font-size: 0.72rem;
  color: var(--muted-light);
  line-height: 1;
}
.info-row-value {
  font-size: 0.82rem;
  color: var(--ink-secondary);
  line-height: 1.4;
  word-break: break-word;
}

/* ─── Stats Row ─── */
.stats-row {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--rule);
  display: flex;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--rule);
}
.stat-item {
  flex: 1;
  padding: 10px 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: rgba(255, 255, 255, 0.015);
  border-right: 1px solid var(--rule);
}
.stat-item:last-child { border-right: none; }
.stat-icon { color: var(--muted-light); }
.stat-num { font-size: 1rem; font-weight: 600; color: var(--accent); }
.stat-label { font-size: 0.7rem; color: var(--muted-light); }
.stat-icon.is-favorited { color: var(--accent); }

/* ─── 天文事件 widget ─── */
.astro-events {
  margin-top: 20px;
  padding: 14px 14px 12px;
  border: 1px solid var(--rule);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(255, 217, 138, 0.04), rgba(255, 217, 138, 0.01));
}
.astro-events-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
.astro-icon { color: var(--accent); flex-shrink: 0; }
.astro-events-title {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--muted);
  flex: 1;
}
.astro-visibility-badge {
  font-size: 0.68rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(180, 180, 180, 0.12);
  color: var(--muted-light);
}
.astro-visibility-badge.is-visible {
  background: rgba(120, 200, 120, 0.16);
  color: #8ad88a;
}
.astro-events-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
}
.astro-event-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.astro-event-icon { color: var(--muted-light); flex-shrink: 0; }
.astro-event-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.astro-event-label { font-size: 0.66rem; color: var(--muted-light); }
.astro-event-value {
  font-size: 0.82rem;
  color: var(--fg);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.astro-event-sub { font-size: 0.68rem; color: var(--muted-light); }

/* ─── Info Section ─── */
.info-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--rule);
}
.info-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--muted);
  margin-bottom: 10px;
}
.tag-loading {
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

/* ─── Precession Lore ─── */
.precession-lore .info-label {
  color: #c8b6ff;
  letter-spacing: 0.04em;
}
.precession-lore .lore-text {
  margin: 0 0 10px 0;
  font-size: 0.82rem;
  line-height: 1.65;
  color: var(--ink-secondary);
}
.precession-lore .lore-text strong {
  color: #e8dfff;
  font-weight: 600;
}
.precession-lore .lore-list {
  list-style: none;
  margin: 0 0 10px 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.precession-lore .lore-list li {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(200, 182, 255, 0.05);
  border-left: 2px solid rgba(200, 182, 255, 0.35);
}
.precession-lore .lore-year {
  flex: 0 0 auto;
  min-width: 110px;
  font-size: 0.74rem;
  color: #8a7fb8;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}
.precession-lore .lore-star {
  font-size: 0.82rem;
  color: #e8dfff;
}
.precession-lore .lore-footnote {
  margin: 0;
  font-size: 0.75rem;
  font-style: italic;
  color: var(--muted);
  line-height: 1.6;
}
</style>