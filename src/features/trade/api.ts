import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type {
  SetTradeConfigInput,
  TradeConfig,
  TradeListing,
  TradeListingsListMeta,
  TradeListingsListQuery,
} from './types';

export const tradeKeys = {
  config: ['trade', 'config'] as const,
  listings: (q: TradeListingsListQuery) => ['trade', 'listings', q] as const,
};

export const useTradeConfig = () =>
  useQuery({
    queryKey: tradeKeys.config,
    queryFn: () => api.get<TradeConfig>('/admin/trade/config'),
  });

export const useSetTradeConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SetTradeConfigInput) => api.put<TradeConfig>('/admin/trade/config', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: tradeKeys.config }),
  });
};

interface TradeListingsResult {
  items: TradeListing[];
  meta: TradeListingsListMeta;
}

const fetchListings = async (q: TradeListingsListQuery): Promise<TradeListingsResult> => {
  const params = new URLSearchParams();
  if (q.status) params.set('status', q.status);
  if (q.categoryId) params.set('categoryId', q.categoryId);
  if (q.clusterId) params.set('clusterId', q.clusterId);
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<TradeListing[]>(
    `/admin/trade/listings?${params.toString()}`,
  );
  return {
    items: data,
    meta:
      (meta as TradeListingsListMeta | undefined) ?? {
        total: data.length,
        page: q.page,
        limit: q.limit,
      },
  };
};

export const useTradeListings = (q: TradeListingsListQuery) =>
  useQuery({ queryKey: tradeKeys.listings(q), queryFn: () => fetchListings(q) });

const invalidateListings = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['trade', 'listings'] });
};

export const useApproveTradeListing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.put<{ id: string }>(`/admin/trade/listings/${id}/approve`, { notes }),
    onSuccess: () => invalidateListings(qc),
  });
};

export const useRejectTradeListing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.put<{ id: string }>(`/admin/trade/listings/${id}/reject`, { notes }),
    onSuccess: () => invalidateListings(qc),
  });
};
