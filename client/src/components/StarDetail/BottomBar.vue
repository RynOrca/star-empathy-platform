<template>
  <div>
    <div class="action-buttons">
      <button class="write-btn" @click="$emit('write-story')">
        <PenSquareIcon :size="14" />
        写我的故事
      </button>
      <button
        class="fav-btn"
        :class="{ favorited: isFavorited }"
        @click="$emit('toggle-favorite')"
      >
        <StarIcon :size="14" :fill="isFavorited ? 'currentColor' : 'none'" />
        <span>{{ isFavorited ? '已收藏' : '收藏' }}</span>
      </button>
    </div>
    <div class="action-buttons-secondary">
      <button class="chat-btn" @click="$emit('open-chat')">
        <MessagesSquareIcon :size="14" />
        <span>与古人共赏</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PenSquare, Star, MessagesSquare } from 'lucide-vue-next'

const PenSquareIcon = PenSquare
const StarIcon = Star
const MessagesSquareIcon = MessagesSquare

defineProps<{
  isFavorited: boolean
}>()

defineEmits<{
  'write-story': []
  'toggle-favorite': []
  'open-chat': []
}>()
</script>

<style scoped>
.action-buttons {
  margin-top: 20px;
  display: flex;
  gap: 8px;
}
.write-btn {
  flex: 1;
  padding: 10px 0;
  border-radius: var(--radius-md);
  background: var(--accent);
  border: none;
  color: rgba(0, 0, 0, 0.75);
  font-family: var(--font);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.write-btn:hover { background: var(--accent-hover); }
.write-btn:active { transform: scale(0.98); }

.fav-btn {
  padding: 10px 16px;
  border-radius: var(--radius-md);
  background: transparent;
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-family: var(--font);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.fav-btn:hover { background: var(--accent-subtle); }
.fav-btn.favorited {
  border-color: var(--accent);
  background: var(--accent-subtle);
  color: var(--accent);
}
.fav-btn:active { transform: scale(0.98); }

.action-buttons-secondary { margin-top: 10px; }
.chat-btn {
  width: 100%;
  padding: 10px 0;
  border-radius: var(--radius-md);
  background: transparent;
  border: 1px solid var(--star-purple);
  color: var(--star-purple);
  font-family: var(--font);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.chat-btn:hover { background: rgba(202, 167, 255, 0.1); }
.chat-btn:active { transform: scale(0.98); }
</style>