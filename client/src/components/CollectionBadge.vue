<template>
  <span
    v-if="collectionName"
    class="cb-badge"
    :class="{ clickable }"
    :title="`合集：${collectionName}${isPrivate ? '（私有）' : ''}`"
    @click.stop="clickable && emit('click')"
  >
    <span class="cb-dot" :style="{ background: dotColor }"></span>
    <Library :size="11" class="cb-icon" />
    <span class="cb-name">{{ collectionName }}</span>
    <Lock v-if="isPrivate" :size="9" class="cb-lock" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Library, Lock } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  collectionName: string | null
  coverColor?: string | null
  collectionVisibility?: string | null
  clickable?: boolean
}>(), {
  coverColor: null,
  collectionVisibility: null,
  clickable: false,
})

const emit = defineEmits<{ click: [] }>()

const isPrivate = computed(() => props.collectionVisibility === 'private')
// 主题色：有 coverColor 用之，否则取金色默认（与 ProfilePage Style D 一致）
const dotColor = computed(() => props.coverColor || '#E8B86D')
</script>

<style scoped>
.cb-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px 3px 8px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.035);
  border: 0.5px solid rgba(255, 255, 255, 0.07);
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.72);
  letter-spacing: 0.01em;
  line-height: 1;
  white-space: nowrap;
  vertical-align: middle;
}
.cb-badge.clickable {
  cursor: pointer;
  transition: background .15s ease, transform .15s ease;
}
.cb-badge.clickable:hover {
  background: rgba(255, 255, 255, 0.07);
  transform: translateY(-0.5px);
}
.cb-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 5px currentColor;
  opacity: 0.9;
}
.cb-icon {
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}
.cb-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cb-lock {
  color: rgba(255, 255, 255, 0.34);
  flex-shrink: 0;
}
</style>
