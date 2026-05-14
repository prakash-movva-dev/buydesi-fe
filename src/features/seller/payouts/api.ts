import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type { Payout, PayoutsListMeta, PayoutsListQuery } from '@/features/payouts/types';

export const sellerPayoutKeys = {
  list: (q: PayoutsListQuery) => ['seller-payouts', 'list', q] as const,
};

export const useMyPayouts = (q: PayoutsListQuery) =>
  useQuery({
    queryKey: sellerPayoutKeys.list(q),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q.status) params.set('status', q.status);
      if (q.schedule) params.set('schedule', q.schedule);
      params.set('page', String(q.page));
      params.set('limit', String(q.limit));
      const { data, meta } = await fetchEnvelope<Payout[]>(`/payouts?${params.toString()}`);
      return {
        items: data,
        meta:
          (meta as PayoutsListMeta | undefined) ?? {
            total: data.length,
            page: q.page,
            limit: q.limit,
          },
      };
    },
  });

export const useRequestOnDemandPayout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Payout>('/payouts/request'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-payouts'] }),
  });
};
