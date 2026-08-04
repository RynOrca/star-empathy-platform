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
    if (!userId.value) { list.value = []; return; }
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
      if (uid) fetchList();
      else list.value = [];
    },
    { immediate: true },
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
