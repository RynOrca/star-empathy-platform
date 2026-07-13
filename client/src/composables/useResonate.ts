import { ref } from 'vue'

export function useResonate() {
  const resonatingId = ref<number | null>(null)
  const lastError = ref<string | null>(null)

  async function resonate(id: number): Promise<boolean> {
    resonatingId.value = id
    lastError.value = null
    try {
      const res = await fetch(`/api/stars/${id}/resonate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.code !== 200) throw new Error(json.message || '共鸣失败')
      return true
    } catch (e: any) {
      lastError.value = e.message || '网络错误'
      console.error('useResonate:', e)
      return false
    } finally {
      resonatingId.value = null
    }
  }

  return { resonate, resonatingId, lastError }
}
