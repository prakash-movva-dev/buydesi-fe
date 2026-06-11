import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type {
  DuplicateCandidate,
  ProductStatus,
  ProductsListMeta,
  ProductsListQuery,
  SafeProduct,
} from './types';

export const productKeys = {
  all: ['products'] as const,
  list: (q: ProductsListQuery) => ['products', 'list', q] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
  duplicates: (id: string) => ['products', 'duplicates', id] as const,
};

interface ProductsListResult {
  items: SafeProduct[];
  meta: ProductsListMeta;
}

const fetchProductsList = async (q: ProductsListQuery): Promise<ProductsListResult> => {
  const params = new URLSearchParams();
  if (q.status) params.set('status', q.status);
  if (q.category) params.set('category', q.category);
  if (q.cluster) params.set('cluster', q.cluster);
  if (q.sellerId) params.set('sellerId', q.sellerId);
  if (q.q) params.set('q', q.q);
  if (q.minPrice !== undefined) params.set('minPrice', String(q.minPrice));
  if (q.maxPrice !== undefined) params.set('maxPrice', String(q.maxPrice));
  if (q.stockState) params.set('stockState', q.stockState);
  if (q.sort) params.set('sort', q.sort);
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<SafeProduct[]>(
    `/products/admin/all?${params.toString()}`,
  );
  return {
    items: data,
    meta: (meta as ProductsListMeta | undefined) ?? {
      total: data.length,
      page: q.page,
      limit: q.limit,
    },
  };
};

export const useProductsList = (q: ProductsListQuery) =>
  useQuery({ queryKey: productKeys.list(q), queryFn: () => fetchProductsList(q) });

export const useProduct = (id: string | undefined) =>
  useQuery({
    queryKey: id ? productKeys.detail(id) : ['products', 'detail', 'none'],
    queryFn: () => api.get<SafeProduct>(`/products/${id}`),
    enabled: Boolean(id),
  });

export const useProductDuplicates = (id: string | undefined) =>
  useQuery({
    queryKey: id ? productKeys.duplicates(id) : ['products', 'duplicates', 'none'],
    queryFn: () => api.get<DuplicateCandidate[]>(`/products/${id}/duplicates`),
    enabled: Boolean(id),
  });

// ─── Mutations ────────────────────────────────────────────────────────────

interface SetStatusVars {
  id: string;
  status: ProductStatus;
  notes?: string;
  /** When rejecting as a duplicate, the id of the original product. */
  duplicateOfId?: string;
}

export const useSetProductStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes, duplicateOfId }: SetStatusVars) =>
      api.put<SafeProduct>(`/products/${id}/status`, { status, notes, duplicateOfId }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      qc.invalidateQueries({ queryKey: productKeys.detail(vars.id) });
    },
  });
};

export const useSendRestockAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ productId: string }>(`/products/${id}/restock-alert`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};

interface BatchRestockVars {
  categoryId?: string;
  clusterId?: string;
}

export const useBatchRestockAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, clusterId }: BatchRestockVars) => {
      const params = new URLSearchParams();
      if (categoryId) params.set('categoryId', categoryId);
      if (clusterId) params.set('clusterId', clusterId);
      const qs = params.toString();
      return api.post<{ notified: number }>(
        `/products/restock-alert/batch${qs ? `?${qs}` : ''}`,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};
