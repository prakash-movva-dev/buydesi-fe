import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CreateCategoryInput,
  SafeCategory,
  UpdateCategoryInput,
} from './types';

export interface CategoriesListQuery {
  status?: 'active' | 'inactive';
  q?: string;
}

export const categoryKeys = {
  all: ['categories'] as const,
  list: (q: CategoriesListQuery) => ['categories', 'list', q] as const,
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
