import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type {
  SupportResolutionAction,
  SupportTicket,
  TicketDetailResponse,
  TicketsListMeta,
  TicketsListQuery,
} from './types';

export const ticketKeys = {
  all: ['tickets'] as const,
  list: (q: TicketsListQuery) => ['tickets', 'list', q] as const,
  detail: (id: string) => ['tickets', 'detail', id] as const,
};

interface TicketsListResult {
  items: SupportTicket[];
  meta: TicketsListMeta;
}

const fetchTicketsList = async (q: TicketsListQuery): Promise<TicketsListResult> => {
  const params = new URLSearchParams();
  if (q.status) params.set('status', q.status);
  if (q.category) params.set('category', q.category);
  if (q.escalationLevel) params.set('escalationLevel', q.escalationLevel);
  if (q.clusterId) params.set('clusterId', q.clusterId);
  if (q.assignedTo) params.set('assignedTo', q.assignedTo);
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<SupportTicket[]>(
    `/support/tickets?${params.toString()}`,
  );
  return {
    items: data,
    meta: (meta as TicketsListMeta | undefined) ?? {
      total: data.length,
      page: q.page,
      limit: q.limit,
    },
  };
};

export const useTicketsList = (q: TicketsListQuery) =>
  useQuery({ queryKey: ticketKeys.list(q), queryFn: () => fetchTicketsList(q) });

export const useTicket = (id: string | undefined) =>
  useQuery({
    queryKey: id ? ticketKeys.detail(id) : ['tickets', 'detail', 'none'],
    queryFn: () => api.get<TicketDetailResponse>(`/support/tickets/${id}`),
    enabled: Boolean(id),
  });

// ─── Mutations ────────────────────────────────────────────────────────────

const invalidate = (qc: ReturnType<typeof useQueryClient>, id: string) => {
  qc.invalidateQueries({ queryKey: ticketKeys.all });
  qc.invalidateQueries({ queryKey: ticketKeys.detail(id) });
};

export const useClaimTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.put<SupportTicket>(`/support/tickets/${id}/claim`, { notes }),
    onSuccess: (_, v) => invalidate(qc, v.id),
  });
};

export const useResolveTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      notes,
    }: {
      id: string;
      action: SupportResolutionAction;
      notes?: string;
    }) => api.put<SupportTicket>(`/support/tickets/${id}/resolve`, { action, notes }),
    onSuccess: (_, v) => invalidate(qc, v.id),
  });
};

export const useEscalateTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api.put<SupportTicket>(`/support/tickets/${id}/escalate`, { notes }),
    onSuccess: (_, v) => invalidate(qc, v.id),
  });
};

export const useForceRefundTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      amountInr,
      notes,
    }: {
      id: string;
      amountInr?: number;
      notes?: string;
    }) => api.put<SupportTicket>(`/support/tickets/${id}/refund`, { amountInr, notes }),
    onSuccess: (_, v) => invalidate(qc, v.id),
  });
};

export const useScheduleReversePickup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.post<SupportTicket>(`/support/tickets/${id}/reverse-pickup`),
    onSuccess: (_, v) => invalidate(qc, v.id),
  });
};

export const usePostTicketMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
      internal,
    }: {
      id: string;
      body: string;
      internal: boolean;
    }) =>
      api.post<SupportTicket>(`/support/tickets/${id}/messages`, { body, internal }),
    onSuccess: (_, v) => invalidate(qc, v.id),
  });
};
