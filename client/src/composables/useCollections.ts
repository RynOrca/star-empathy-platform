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
  /** 合辑内故事总共鸣数（列表接口已计算，详情也可从 stories 自行汇总） */
  resonanceTotal?: number | null
  /** 系统级默认合集（true 时不可删除、不可改可见性、不可改名称、不可改排序） */
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface CollectionStory {
  id: number
  type?: 'history' | 'user'
  catalogStarId?: number | null
  catalogStarIds?: number[]
  collectionId?: number | null
  collectionName?: string | null
  collectionCoverColor?: string | null
  collectionVisibility?: string | null
  title: string | null
  content: string
  /** 图片 URL（暂未存储，统一 null） */
  imageUrl: string | null
  tags?: string[]
  /** 单标签旧兼容字段（= tags[0] 或 null） */
  tag: string | null
  origin: string | null
  location?: string | null
  locationLat: number | null
  locationLng: number | null
  isAnonymous?: boolean | number
  authorHidden?: boolean
  userId: number | null
  username: string | null
  resonanceCount: number
  viewCount: number
  createdAt: string
  updatedAt: string
  [k: string]: any
}

export interface CollectionDetail extends Collection {
  stories: CollectionStory[]
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

/** 前端兜底归一化：后端已做 snake→camel 双写，但再做一层，避免新接口遗漏 */
function normalizeStory(s: any): CollectionStory {
  if (!s) return s as any
  const tagsRaw = s.tags ?? s.story_tags ?? s.storyTags
  const tagsArr: string[] = Array.isArray(tagsRaw) ? tagsRaw.filter((t: any) => !!t && typeof t === 'string') : []
  const firstTag: string | null = tagsArr.length > 0 ? tagsArr[0] : null
  const titleRaw = s.title ?? s.story_title
  const usernameRaw = s.username ?? s.user_name
  return {
    ...s,
    type: s.type === 'history' ? 'history' : (s.type === 'user' ? 'user' : (s.origin && s.origin !== '星友' ? 'history' : 'user')),
    catalogStarId: s.catalog_star_id ?? s.catalogStarId ?? null,
    catalogStarIds: s.catalog_star_ids ?? s.catalogStarIds ?? (s.catalog_star_id != null ? [s.catalog_star_id] : (s.catalogStarId != null ? [s.catalogStarId] : undefined)),
    collectionId: s.collection_id ?? s.collectionId ?? null,
    collectionName: s.collection_name ?? s.collectionName ?? null,
    collectionCoverColor: s.collection_cover_color ?? s.collectionCoverColor ?? null,
    collectionVisibility: s.collection_visibility ?? s.collectionVisibility ?? null,
    // 必填强制字段（StoryDetail/StoryList 要求 non-undefined）
    title: titleRaw != null ? String(titleRaw) : null,
    imageUrl: s.imageUrl ?? s.image_url ?? null,
    tag: s.tag ?? firstTag ?? null,
    tags: tagsArr.length > 0 ? tagsArr : undefined,
    origin: (s.origin != null ? String(s.origin) : null),
    // location: 经纬度强制 number | null（不能是 undefined，formatDistance 不接受 undefined）
    locationLat:
      s.location_lat != null && !isNaN(Number(s.location_lat)) ? Number(s.location_lat)
      : s.locationLat != null && !isNaN(Number(s.locationLat)) ? Number(s.locationLat)
      : null,
    locationLng:
      s.location_lng != null && !isNaN(Number(s.location_lng)) ? Number(s.location_lng)
      : s.locationLng != null && !isNaN(Number(s.locationLng)) ? Number(s.locationLng)
      : null,
    location: s.location ?? null,
    isAnonymous: s.is_anonymous ?? s.isAnonymous,
    authorHidden: s.author_hidden ?? s.authorHidden,
    storyTags: s.story_tags ?? s.storyTags ?? tagsArr,
    // 必填强制字段
    userId: s.user_id != null ? Number(s.user_id) : (s.userId != null ? Number(s.userId) : null),
    username: usernameRaw != null ? String(usernameRaw) : (usernameRaw ?? null),
    resonanceCount: Number(s.resonance_count ?? s.resonanceCount ?? 0) || 0,
    viewCount: Number(s.view_count ?? s.viewCount ?? 0) || 0,
    createdAt: s.created_at ?? s.createdAt ?? new Date(0).toISOString(),
    updatedAt: s.updated_at ?? s.updatedAt ?? new Date(0).toISOString(),
  }
}
export function normalizeCollection(row: any, opts?: { withStories?: boolean }): Collection {
  if (!row) return row as any
  const withStories = opts?.withStories ?? true
  const storiesRaw = row.stories ?? row.story_list
  const stories = withStories && Array.isArray(storiesRaw) ? storiesRaw.map(normalizeStory) : undefined
  const storyCount = Number(row.story_count ?? row.storyCount ?? (stories ? stories.length : 0)) || 0
  return {
    ...row,
    userId: Number(row.user_id ?? row.userId) || 0,
    coverColor: row.cover_color ?? row.coverColor ?? null,
    sortOrder: Number(row.sort_order ?? row.sortOrder) || 0,
    /** is_default=1 (DB INTEGER) / row.isDefault → boolean，接口缺时兜底 false */
    isDefault: !!(row.is_default ?? row.isDefault ?? false),
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    storyCount,
    favoriteCount: Number(row.favorite_count ?? row.favoriteCount ?? 0) || 0,
    resonanceTotal:
      row.resonanceTotal != null ? Number(row.resonanceTotal)
      : row.resonance_total != null ? Number(row.resonance_total)
      : (stories ? stories.reduce((sum: number, s: any) => sum + (s.resonanceCount ?? 0), 0) : null),
    ...(stories ? { stories } : {}),
  } as any
}

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
      const raw = Array.isArray(json.data) ? json.data : []
      list.value = raw.map((r: any) => normalizeCollection(r, { withStories: false }))
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
      const created = normalizeCollection(json.data, { withStories: false })
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
      const updated = normalizeCollection(json.data, { withStories: false })
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
      return normalizeCollection(json.data, { withStories: true }) as unknown as CollectionDetail
    } catch (e: any) {
      console.error('useCollections: fetchDetail failed', e)
      return null
    }
  }

  return { list, loading, error, fetchList, create, update, remove, fetchDetail, normalizeCollection }
}
