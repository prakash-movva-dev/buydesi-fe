import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type {
  OrdersListMeta,
  OrdersListQuery,
  SafeOrder,
} from './types';

export const orderKeys = {
  all: ['orders'] as const,
  list: (q: OrdersListQuery) => ['orders', 'list', q] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
};

interface OrdersListResult {
  items: SafeOrder[];
  meta: OrdersListMeta;
}

const fetchOrdersList = async (q: OrdersListQuery): Promise<OrdersListResult> => {
  const params = new URLSearchParams();
  if (q.status) params.set('status', q.status);
  if (q.clusterId) params.set('clusterId', q.clusterId);
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<SafeOrder[]>(`/orders?${params.toString()}`);
  return {
    items: data,
    meta: (meta as OrdersListMeta | undefined) ?? {
      total: data.length,
      page: q.page,
      limit: q.limit,
    },
  };
};

export const useOrdersList = (q: OrdersListQuery) =>
  useQuery({ queryKey: orderKeys.list(q), queryFn: () => fetchOrdersList(q) });

export const useOrder = (id: string | undefined) =>
  useQuery({
    queryKey: id ? orderKeys.detail(id) : ['orders', 'detail', 'none'],
    queryFn: () => api.get<SafeOrder>(`/orders/${id}`),
    enabled: Boolean(id),
  });

// ─── Mutations ────────────────────────────────────────────────────────────

interface CancelVars {
  id: string;
  reason: string;
}

interface RefundVars {
  orderId: string;
  amountInr?: number;
  reason?: string;
}

export const useCancelOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: CancelVars) =>
      api.post<SafeOrder>(`/orders/${id}/cancel`, { reason }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: orderKeys.all });
      qc.invalidateQueries({ queryKey: orderKeys.detail(vars.id) });
    },
  });
};

export const useRefundOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, amountInr, reason }: RefundVars) =>
      api.post<{ orderId: string }>('/payments/refund', {
        orderId,
        amountInr,
        reason,
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: orderKeys.all });
      qc.invalidateQueries({ queryKey: orderKeys.detail(vars.orderId) });
    },
  });
};
