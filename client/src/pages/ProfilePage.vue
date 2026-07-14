<template>
  <div class="profile-page">
    <div class="container">
      <h2>个人主页</h2>
      <p v-if="user">你好，{{ user.username }}</p>
      <button @click="goBack" class="btn-back">← 返回星空</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'

const router = useRouter()
const { user, fetchMe } = useAuth()
onMounted(() => fetchMe())

function goBack() { router.push('/sky') }
</script>

<style scoped>
.profile-page {
  width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center;
  background: #070816; color: #f6f1ff; font-family: var(--font, sans-serif);
}
.container { text-align: center; }
.btn-back { margin-top: 1rem; padding: 0.5rem 1.5rem; border-radius: 12px; border: 1px solid #303757; background: rgba(255,255,255,0.06); color: #b9b4d6; cursor: pointer; }
</style>
