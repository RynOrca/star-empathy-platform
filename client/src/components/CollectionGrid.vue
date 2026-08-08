<template>
  <!-- 向后兼容包装层：Profile 个人主页「我的星笺」网格。
       实现已下沉到 FolioGrid.vue，本文件仅作入口，保留原有 props/emits 名字，避免修改其他调用点。 -->
  <FolioGrid
    :collections="collections"
    :loading="loading"
    :error="error"
    :editable="true"
    :show-action-bar="true"
    :show-owner="false"
    density="cozy"
    @create="$emit('create')"
    @open="$emit('open', $event as any)"
    @edit="$emit('edit', $event as any)"
    @delete="$emit('delete', $event as any)"
  />
</template>

<script setup lang="ts">
import FolioGrid from './FolioGrid.vue'
import type { Collection } from '../composables/useCollections'

defineProps<{
  collections: Collection[]
  loading?: boolean
  error?: string | null
}>()

defineEmits<{
  create: []
  open: [collection: Collection]
  edit: [collection: Collection]
  delete: [collection: Collection]
}>()
</script>
