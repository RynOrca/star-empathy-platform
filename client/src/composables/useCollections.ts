import { ref } from 'vue'
import { authFetch, authHeaders } from '../stores/auth'

export type CollectionVisibility = 'public' | 'private' | 'anonymous' | 'galaxy'

export interface Collection {
  id: number
  userId: number
  name: string
  description: string | null
  coverColor: string | null
  visibility: CollectionVisibility
  sortOrder: number
  storyCount: number
  createdAt: string
  updatedAt: string
}

export interface CollectionDetail extends Collection {
  stories: Array<any>
  /** 合集故事所属 catalog star 被收藏的总次数 */
  favoriteCount: number
}

export interface CreateCollectionInput {
  name: string
  description?: string | null
  coverColor?: string | null
  visibility?: CollectionVisibility
}

export type UpdateCollectionInput = Partial<CreateCollectionInput> & { sortOrder?: number }

export function useCollections() {
  const list = ref<Collection[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchList(visibility?: CollectionVisibility) {
    loading.value = true
    error.value = null
    try {
      const qs = visibility ? `?visibility=${visibility}` : ''
      const res = await authFetch(`/api/collections${qs}`, { headers: authHeaders() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || '请求失败')
      list.value = json.data as Collection[]
    } catch (e: any) {
      error.value = e.message || '加载合集失败'
      console.error('useCollections: fetch failed', e)
    } finally {
      loading.value = false
    }
  }

  async function create(input: CreateCollectionInput): Promise<Collection | null> {
    try {
      const res = await authFetch('/api/collections', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(input),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || '创建失败')
      const created = json.data as Collection
      list.value.unshift(created)
      return created
    } catch (e: any) {
      console.error('useCollections: create failed', e)
      error.value = e.message
      return null
    }
  }

  async function update(id: number, patch: UpdateCollectionInput): Promise<boolean> {
    try {
      const res = await authFetch(`/api/collections/${id}`, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || '更新失败')
      const updated = json.data as Collection
      const idx = list.value.findIndex((c) => c.id === id)
      if (idx >= 0) list.value[idx] = updated
      return true
    } catch (e: any) {
      console.error('useCollections: update failed', e)
      error.value = e.message
      return false
    }
  }

  async function remove(id: number): Promise<boolean> {
    try {
      const res = await authFetch(`/api/collections/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || '删除失败')
      list.value = list.value.filter((c) => c.id !== id)
      return true
    } catch (e: any) {
      console.error('useCollections: remove failed', e)
      error.value = e.message
      return false
    }
  }

  async function fetchDetail(id: number): Promise<CollectionDetail | null> {
    try {
      const res = await authFetch(`/api/collections/${id}`, { headers: authHeaders() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || '请求失败')
      return json.data as CollectionDetail
    } catch (e: any) {
      console.error('useCollections: fetchDetail failed', e)
      return null
    }
  }

  return { list, loading, error, fetchList, create, update, remove, fetchDetail }
}
