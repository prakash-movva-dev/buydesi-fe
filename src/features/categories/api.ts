import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type {
  CreateCategoryInput,
  SafeCategory,
  UpdateCategoryInput,
} from './types';

export type CategoriesSort =
  | 'display'
  | 'name_asc'
  | 'name_desc'
  | 'commission_asc'
  | 'commission_desc'
  | 'newest';

export interface CategoriesListQuery {
  status?: 'active' | 'inactive';
  q?: string;
}

/** Paged variant — the admin list is the only caller that wants a page. */
export interface CategoriesPageQuery extends CategoriesListQuery {
  page: number;
  limit: number;
  sort?: CategoriesSort;
}

export interface CategoriesListMeta {
  total: number;
  page: number | null;
  limit: number | null;
}

export const categoryKeys = {
  all: ['categories'] as const,
  list: (q: CategoriesListQuery) => ['categories', 'list', q] as const,
  page: (q: CategoriesPageQuery) => ['categories', 'page', q] as const,
};

/**
 * Accepts either a `status` string (legacy single-arg form) or a full query
 * object so existing callers don't break while pickers can pass `q`.
 */
export const useCategoriesList = (input?: CategoriesListQuery | 'active' | 'inactive') => {
  const query: CategoriesListQuery =
    typeof input === 'string' ? { status: input } : (input ?? {});
  return useQuery({
    queryKey: categoryKeys.list(query),
    queryFn: () => {
      const params = new URLSearchParams();
      if (query.status) params.set('status', query.status);
      if (query.q) params.set('q', query.q);
      const qs = params.toString();
      return api.get<SafeCategory[]>(`/categories${qs ? `?${qs}` : ''}`);
    },
  });
};

/**
 * One page of the taxonomy, ordered and filtered by the server. Kept separate
 * from {@link useCategoriesList} so the pickers and the reorder maths keep
 * getting the whole list.
 */
export const useCategoriesPage = (q: CategoriesPageQuery) =>
  useQuery({
    queryKey: categoryKeys.page(q),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q.status) params.set('status', q.status);
      if (q.q) params.set('q', q.q);
      if (q.sort) params.set('sort', q.sort);
      params.set('page', String(q.page));
      params.set('limit', String(q.limit));
      const { data, meta } = await fetchEnvelope<SafeCategory[]>(
        `/categories?${params.toString()}`,
      );
      return {
        items: data,
        meta: (meta as CategoriesListMeta | undefined) ?? {
          total: data.length,
          page: q.page,
          limit: q.limit,
        },
      };
    },
  });

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => api.post<SafeCategory>('/categories', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateCategoryInput }) =>
      api.put<SafeCategory>(`/categories/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  });
};

/** Bulk reorder siblings — sends [{id, displayOrder}] in one atomic call. */
export const useReorderCategories = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ id: string; displayOrder: number }>) =>
      api.put<{ matched: number; modified: number }>('/categories/reorder', { items }),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  });
};
