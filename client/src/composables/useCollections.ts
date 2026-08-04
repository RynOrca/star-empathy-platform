import { ref, watch, type ComputedRef, type Ref } from 'vue';

export interface Collection {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  coverColor: string;
  isDefault: boolean;
  isPublic: boolean;
  status: string;
  rejectReason: string | null;
  sortOrder: number;
  storyCount: number;
  totalResonance: number;
  totalViews: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionStats {
  id: number; name: string; description: string | null; coverColor: string;
  isDefault: boolean; isPublic: boolean;
  storyCount: number; totalResonance: number; totalViews: number;
  createdAt: string; updatedAt: string;
  topTags: { tag: string; count: number }[];
  catalogs: { catalogStarId: number | null; name: string | null; color: string | null; count: number }[];
}

export interface CollectionStory {
  id: number;
  title: string | null;
  content: string;
  resonanceCount: number;
  viewCount: number;
  catalogStarName: string | null;
  catalogStarColor: string;
  catalogStarId: number | null;
  tags: string[];
  username: string | null;
  createdAt: string;
  userId: number | null;
}

export interface PagedResult {
  items: CollectionStory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function req<T = unknown>(path: string, opts: RequestInit = {}): Promise<{ code: number; message: string; data: T }> {
  const r = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers || {}) },
    ...opts,
  });
  return r.json();
}

export function useCollections(userId: Ref<number | null> | ComputedRef<number | null>) {
  const loading = ref(false);
  const listError = ref('');
  const list = ref<Collection[]>([]);

  async function fetchList(): Promise<void> {
    // ⚠️ 注意：后端 /api/collections/mine 通过 JWT 鉴权从 token 里解析 user.id，
    // 不需要前端在 URL/body/query 里传 userId！
    // 之前的 if (!userId.value) return 是多此一举的双重判断：
    // 当 auth.fetchMe() 还没回来或偶发失败时 userId.value 仍为 null，
    // 但 localStorage.token 是存在的（authHeaders 会带 Bearer）→ 后端鉴权实际能过。
    // 那道前置 return 会直接把 fetchList 挡死 = 创建成功后 list 不刷新 = 用户"看不到合集"
    // → 移除该判断，请求成不成功交给后端响应 code / HTTP status
    const tokenOk = !!localStorage.getItem('token');
    if (!tokenOk) {
      list.value = [];
      listError.value = '';
      return;
    }
    loading.value = true;
    listError.value = '';
    try {
      const j = await req<{ list: Collection[] }>('/api/collections/mine');
      if (j.code === 200 && Array.isArray(j.data?.list)) {
        list.value = j.data.list;
      } else {
        listError.value = j.message || '加载合集失败';
        list.value = [];
      }
    } catch (e) {
      listError.value = '网络错误';
      list.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function createCollection(payload: { name: string; description?: string; coverColor?: string }): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
    try {
      const j = await req<{ id: number }>('/api/collections', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (j.code !== 200) return { ok: false, error: j.message };
      await fetchList();
      return { ok: true, id: j.data.id };
    } catch (e) {
      return { ok: false, error: '网络错误' };
    }
  }

  async function patchCollection(id: number, patch: Partial<{ name: string; description: string; coverColor: string; sortOrder: number; isPublic: boolean | 1 | 0 }>): Promise<{ ok: true; collection: Collection } | { ok: false; error: string }> {
    try {
      const j = await req<{ collection: Collection }>(`/api/collections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (j.code !== 200) return { ok: false, error: j.message };
      await fetchList();
      return { ok: true, collection: j.data.collection };
    } catch (e) {
      return { ok: false, error: '网络错误' };
    }
  }

  async function deleteCollection(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const j = await req(`/api/collections/${id}`, { method: 'DELETE' });
      if (j.code !== 200) return { ok: false, error: j.message };
      await fetchList();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: '网络错误' };
    }
  }

  async function moveStory(storyId: number, newCollectionId: number | null): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const j = await req('/api/collections/move-story', {
        method: 'POST',
        body: JSON.stringify({ storyId, collectionId: newCollectionId }),
      });
      if (j.code !== 200) return { ok: false, error: j.message };
      await fetchList();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: '网络错误' };
    }
  }

  async function getStats(id: number): Promise<{ ok: true; data: CollectionStats } | { ok: false; error: string }> {
    try {
      const j = await req<CollectionStats>(`/api/collections/${id}/stats`);
      if (j.code !== 200) return { ok: false, error: j.message };
      return { ok: true, data: j.data };
    } catch (e) {
      return { ok: false, error: '网络错误' };
    }
  }

  async function getStoriesPaged(id: number, page = 1, limit = 20): Promise<{ ok: true; data: PagedResult } | { ok: false; error: string }> {
    try {
      const j = await req<PagedResult>(`/api/collections/${id}/stories?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`);
      if (j.code !== 200) return { ok: false, error: j.message };
      return { ok: true, data: j.data };
    } catch (e) {
      return { ok: false, error: '网络错误' };
    }
  }

  /**
   * 当前选中的默认合集 ID（list 中 isDefault=true 的第一个）。
   * 写故事提交默认选中它。
   */
  const defaultCollectionId = (): number | null => {
    const d = list.value.find((c) => c.isDefault);
    return d ? d.id : null;
  };

  watch(
    () => userId.value,
    (uid) => {
      // 有 token 就尝试发请求（/mine 后端靠 JWT 鉴权从 token 解析 uid，不需要前端传）
      // 之前的逻辑只有 uid 非 null 才请求，导致 auth.fetchMe 慢或失败时，
      // 即使 localStorage.token 存在（能拿到正确列表），也被挡死不发请求。
      const tokenOk = !!localStorage.getItem('token');
      if (tokenOk) {
        void fetchList();
      } else if (!uid) {
        list.value = [];
      }
      // uid 有值时确保再触发一次（fetchMe 回来后最新），fetchList 内部会去重 loading
    },
    { immediate: true, flush: 'post' },
  );

  return {
    loading,
    listError,
    list,
    fetchList,
    createCollection,
    patchCollection,
    deleteCollection,
    moveStory,
    getStats,
    getStoriesPaged,
    defaultCollectionId,
  };
}
