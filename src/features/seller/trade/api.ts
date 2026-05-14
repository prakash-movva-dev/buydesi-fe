import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type { TradeListing, TradeListingsListMeta } from '@/features/trade/types';
import type { CreateListingInput, PlaceTradeOrderInput, TradeOrder } from './types';

export const sellerTradeKeys = {
  myListings: (q: object) => ['seller-trade', 'mine', q] as const,
  catalogue: (q: object) => ['seller-trade', 'catalogue', q] as const,
  myOrders: (q: object) => ['seller-trade', 'orders', q] as const,
  detail: (id: string) => ['seller-trade', 'order', id] as const,
};

export interface ListingsQuery {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'CLOSED';
  categoryId?: string;
  clusterId?: string;
  page: number;
  limit: number;
}

const fetchListings = async (path: string, q: ListingsQuery) => {
  const params = new URLSearchParams();
  if (q.status) params.set('status', q.status);
  if (q.categoryId) params.set('categoryId', q.categoryId);
  if (q.clusterId) params.set('clusterId', q.clusterId);
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<TradeListing[]>(`${path}?${params.toString()}`);
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

export const useMyTradeListings = (q: ListingsQuery) =>
  useQuery({
    queryKey: sellerTradeKeys.myListings(q),
    queryFn: () => fetchListings('/trade/listings/mine', q),
  });

export const useTradeCatalogue = (q: ListingsQuery) =>
  useQuery({
    queryKey: sellerTradeKeys.catalogue(q),
    queryFn: () => fetchListings('/trade/listings', q),
  });

export const useCreateListing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateListingInput) => api.post<TradeListing>('/trade/listings', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-trade'] }),
  });
};

// ─── Orders ────────────────────────────────────────────────────────────────

export interface MyTradeOrdersQuery {
  role?: 'buyer' | 'seller' | 'either';
  page?: number;
  limit?: number;
}

interface OrdersResult {
  items: TradeOrder[];
  total: number;
  page: number;
  limit: number;
}

export const useMyTradeOrders = (q: MyTradeOrdersQuery) =>
  useQuery({
    queryKey: sellerTradeKeys.myOrders(q),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q.role) params.set('role', q.role);
      if (q.page !== undefined) params.set('page', String(q.page));
      if (q.limit !== undefined) params.set('limit', String(q.limit));
      const { data, meta } = await fetchEnvelope<TradeOrder[]>(
        `/trade/orders?${params.toString()}`,
      );
      const m = (meta as Partial<OrdersResult> | undefined) ?? {};
      return {
        items: data,
        total: m.total ?? data.length,
        page: m.page ?? q.page ?? 1,
        limit: m.limit ?? q.limit ?? 50,
      };
    },
  });

export const useTradeOrder = (id: string | undefined) =>
  useQuery({
    queryKey: id ? sellerTradeKeys.detail(id) : ['seller-trade', 'order', 'none'],
    queryFn: () => api.get<TradeOrder>(`/trade/orders/${id}`),
    enabled: Boolean(id),
  });

export const usePlaceTradeOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceTradeOrderInput) => api.post<TradeOrder>('/trade/orders', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-trade'] }),
  });
};

export const useAcceptTradeOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put<TradeOrder>(`/trade/orders/${id}/accept`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-trade'] }),
  });
};

export const useDeclineTradeOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.put<TradeOrder>(`/trade/orders/${id}/decline`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-trade'] }),
  });
};

export const useDispatchTradeOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      shipmentId,
      trackingUrl,
      notes,
    }: {
      id: string;
      shipmentId?: string;
      trackingUrl?: string;
      notes?: string;
    }) =>
      api.put<TradeOrder>(`/trade/orders/${id}/status`, {
        status: 'DISPATCHED',
        shipmentId,
        trackingUrl,
        notes,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-trade'] }),
  });
};

export const useMarkTradeDelivered = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put<TradeOrder>(`/trade/orders/${id}/delivered`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-trade'] }),
  });
};

export const useCancelTradeOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post<TradeOrder>(`/trade/orders/${id}/cancel`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-trade'] }),
  });
};
