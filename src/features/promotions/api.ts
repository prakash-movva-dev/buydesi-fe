import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type {
  Promotion,
  PromotionsListMeta,
  PromotionsListQuery,
} from './types';

export const promotionKeys = {
  all: ['promotions'] as const,
  list: (q: PromotionsListQuery) => ['promotions', 'list', q] as const,
};

interface ListResult {
  items: Promotion[];
  meta: PromotionsListMeta;
}

const fetchList = async (q: PromotionsListQuery): Promise<ListResult> => {
  const params = new URLSearchParams();
  if (q.type) params.set('type', q.type);
  if (q.scope) params.set('scope', q.scope);
  if (q.clusterId) params.set('clusterId', q.clusterId);
  if (q.categoryId) params.set('categoryId', q.categoryId);
  if (q.active !== undefined) params.set('active', String(q.active));
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<Promotion[]>(`/promotions?${params.toString()}`);
  return {
    items: data,
    meta:
      (meta as PromotionsListMeta | undefined) ?? {
        total: data.length,
        page: q.page,
        limit: q.limit,
      },
  };
};

export const usePromotionsList = (q: PromotionsListQuery) =>
  useQuery({ queryKey: promotionKeys.list(q), queryFn: () => fetchList(q) });

export const useCreatePromotion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<Promotion>('/promotions', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: promotionKeys.all }),
  });
};

export const useUpdatePromotion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: { active?: boolean; endsAt?: string; isOverride?: boolean };
    }) => api.put<Promotion>(`/promotions/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: promotionKeys.all }),
  });
};
