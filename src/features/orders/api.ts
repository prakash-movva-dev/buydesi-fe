import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type {
  EscrowAuditEntry,
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
  // The API parses this as a literal 'true' / 'false', never a truthy string.
  if (q.problem !== undefined) params.set('problem', q.problem ? 'true' : 'false');
  if (q.q) params.set('q', q.q);
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

/** True when `v` looks like a Mongo ObjectId (24 hex chars). */
export const isObjectId = (v: string): boolean => /^[a-f0-9]{24}$/i.test(v.trim());

/**
 * Resolve an order from a value pasted into the Quick Lookup box. Accepts either
 * a Mongo ObjectId (returned as-is) or a human order number like
 * `BD-MP6NN7XL-00CA7F`, which is looked up server-side. Returns the real order
 * `id` so the caller can navigate to `/admin/orders/:id`.
 */
export const resolveOrderId = async (value: string): Promise<string> => {
  const v = value.trim();
  if (isObjectId(v)) return v;
  const order = await api.get<SafeOrder>(`/orders/lookup?number=${encodeURIComponent(v)}`);
  return order.id;
};

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

/**
 * The escrow trail for one order — who held the money and when it moved.
 * Staff-only, so the caller passes `undefined` for roles that cannot read it.
 */
export const useEscrowAudit = (orderId: string | undefined) =>
  useQuery({
    queryKey: ['orders', 'escrow-audit', orderId],
    queryFn: () => api.get<EscrowAuditEntry[]>(`/admin/escrow/orders/${orderId}/audit`),
    enabled: Boolean(orderId),
  });
