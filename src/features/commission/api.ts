import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CommissionListQuery,
  CommissionRate,
  CreateCommissionRateInput,
  ResolvedCommission,
  UpdateCommissionRateInput,
} from './types';

export const commissionKeys = {
  all: ['commission'] as const,
  list: (q: CommissionListQuery) => ['commission', 'list', q] as const,
  resolve: (q: { sellerId: string; productId: string; categoryId: string }) =>
    ['commission', 'resolve', q] as const,
};

export const useCommissionRates = (q: CommissionListQuery) =>
  useQuery({
    queryKey: commissionKeys.list(q),
    queryFn: () => {
      const params = new URLSearchParams();
      if (q.scope) params.set('scope', q.scope);
      if (q.categoryId) params.set('categoryId', q.categoryId);
      if (q.productId) params.set('productId', q.productId);
      if (q.sellerId) params.set('sellerId', q.sellerId);
      if (q.active !== undefined) params.set('active', String(q.active));
      const qs = params.toString();
      return api.get<CommissionRate[]>(`/commission/rates${qs ? `?${qs}` : ''}`);
    },
  });

export const useResolveCommission = (q: {
  sellerId: string;
  productId: string;
  categoryId: string;
}) =>
  useQuery({
    queryKey: commissionKeys.resolve(q),
    queryFn: () => {
      const params = new URLSearchParams({
        sellerId: q.sellerId,
        productId: q.productId,
        categoryId: q.categoryId,
      });
      return api.get<ResolvedCommission>(`/commission/resolve?${params.toString()}`);
    },
    enabled: Boolean(q.sellerId && q.productId && q.categoryId),
  });

export const useCreateCommissionRate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommissionRateInput) =>
      api.post<CommissionRate>('/commission/rates', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: commissionKeys.all }),
  });
};

export const useUpdateCommissionRate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateCommissionRateInput }) =>
      api.put<CommissionRate>(`/commission/rates/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: commissionKeys.all }),
  });
};
