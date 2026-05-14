import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type {
  SafeSellerProfile,
  SellersListMeta,
  SellersListQuery,
} from './types';

// ─── Keys ─────────────────────────────────────────────────────────────────

export const sellerKeys = {
  all: ['sellers'] as const,
  list: (q: SellersListQuery) => ['sellers', 'list', q] as const,
  detail: (id: string) => ['sellers', 'detail', id] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────

interface SellersListResult {
  items: SafeSellerProfile[];
  meta: SellersListMeta;
}

const fetchSellersList = async (q: SellersListQuery): Promise<SellersListResult> => {
  const params = new URLSearchParams();
  if (q.status) params.set('status', q.status);
  if (q.clusterId) params.set('clusterId', q.clusterId);
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<SafeSellerProfile[]>(
    `/admin/sellers?${params.toString()}`,
  );
  return {
    items: data,
    meta: (meta as SellersListMeta | undefined) ?? {
      total: data.length,
      page: q.page,
      limit: q.limit,
    },
  };
};

export const useSellersList = (q: SellersListQuery) =>
  useQuery({ queryKey: sellerKeys.list(q), queryFn: () => fetchSellersList(q) });

export const useSeller = (id: string | undefined) =>
  useQuery({
    queryKey: id ? sellerKeys.detail(id) : ['sellers', 'detail', 'none'],
    queryFn: () => api.get<SafeSellerProfile>(`/admin/sellers/${id}`),
    enabled: Boolean(id),
  });

// ─── Mutations ────────────────────────────────────────────────────────────

interface ReviewVars {
  id: string;
  notes?: string;
}

interface VerifiedBadgeVars {
  id: string;
  verifiedBadge: boolean;
  notes?: string;
}

const invalidateSellers = (qc: ReturnType<typeof useQueryClient>, id?: string) => {
  qc.invalidateQueries({ queryKey: sellerKeys.all });
  if (id) qc.invalidateQueries({ queryKey: sellerKeys.detail(id) });
};

export const useApproveSeller = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: ReviewVars) =>
      api.put<SafeSellerProfile>(`/admin/sellers/${id}/approve`, { notes }),
    onSuccess: (_, vars) => invalidateSellers(qc, vars.id),
  });
};

export const useRejectSeller = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: ReviewVars) =>
      api.put<SafeSellerProfile>(`/admin/sellers/${id}/reject`, { notes }),
    onSuccess: (_, vars) => invalidateSellers(qc, vars.id),
  });
};

export const useRequestSellerInfo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: ReviewVars) =>
      api.put<SafeSellerProfile>(`/admin/sellers/${id}/request-info`, { notes }),
    onSuccess: (_, vars) => invalidateSellers(qc, vars.id),
  });
};

export const useToggleVerifiedBadge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, verifiedBadge, notes }: VerifiedBadgeVars) =>
      api.put<SafeSellerProfile>(`/admin/sellers/${id}/verified-badge`, {
        verifiedBadge,
        notes,
      }),
    onSuccess: (_, vars) => invalidateSellers(qc, vars.id),
  });
};
