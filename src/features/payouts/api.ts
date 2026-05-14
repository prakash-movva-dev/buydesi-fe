import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEnvelope, api } from '@/lib/api';
import type { Payout, PayoutsListMeta, PayoutsListQuery } from './types';

export const payoutKeys = {
  all: ['payouts'] as const,
  list: (q: PayoutsListQuery) => ['payouts', 'list', q] as const,
};

interface ListResult {
  items: Payout[];
  meta: PayoutsListMeta;
}

const fetchList = async (q: PayoutsListQuery): Promise<ListResult> => {
  const params = new URLSearchParams();
  if (q.status) params.set('status', q.status);
  if (q.schedule) params.set('schedule', q.schedule);
  if (q.sellerId) params.set('sellerId', q.sellerId);
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<Payout[]>(`/admin/payouts?${params.toString()}`);
  return {
    items: data,
    meta:
      (meta as PayoutsListMeta | undefined) ?? {
        total: data.length,
        page: q.page,
        limit: q.limit,
      },
  };
};

export const usePayoutsList = (q: PayoutsListQuery) =>
  useQuery({ queryKey: payoutKeys.list(q), queryFn: () => fetchList(q) });

interface RunBatchResult {
  schedule: 'daily' | 'weekly';
  asOf: string;
  payoutCount: number;
  totalNetInr: number;
}

export const useRunPayoutBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ schedule, asOf }: { schedule: 'daily' | 'weekly'; asOf?: string }) =>
      api.post<RunBatchResult>('/admin/payouts/run-batch', { schedule, asOf }),
    onSuccess: () => qc.invalidateQueries({ queryKey: payoutKeys.all }),
  });
};
