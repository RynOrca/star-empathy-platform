import { ref } from 'vue'
import type { Collection } from './useCollections'

export function usePublicCollections() {
  const list = ref<Collection[]>([])
  const loading = ref(false)
  const total = ref(0)
  const page = ref(1)
  const totalPages = ref(0)

  async function fetchPublic(userId?: number, p = 1, limit = 20) {
    loading.value = true
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) })
      if (userId) params.set('userId', String(userId))
      const res = await fetch(`/api/collections/public?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || '请求失败')
      list.value = json.data.items as Collection[]
      total.value = json.data.total
      page.value = json.data.page
      totalPages.value = json.data.totalPages
    } catch (e) {
      console.error('usePublicCollections: fetch failed', e)
    } finally {
      loading.value = false
    }
  }

  return { list, loading, total, page, totalPages, fetchPublic }
}
