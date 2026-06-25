import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import { tokenStore } from '@/lib/token-store';
import type {
  SafeSellerProfile,
  SellerPerformanceQuery,
  SellerPerformanceReport,
  SellersListMeta,
  SellersListQuery,
} from './types';

const BASE = (import.meta.env.VITE_API_BASE_URL ?? 'https://api.buydesionline.com/api/v1').replace(
  /\/+$/,
  '',
);

// ─── Keys ─────────────────────────────────────────────────────────────────

export const sellerKeys = {
  all: ['sellers'] as const,
  list: (q: SellersListQuery) => ['sellers', 'list', q] as const,
  detail: (id: string) => ['sellers', 'detail', id] as const,
  performance: (q: SellerPerformanceQuery) => ['sellers', 'performance', q] as const,
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

// ─── CA-1: Seller performance ───────────────────────────────────────────────

const buildPerformanceParams = (
  q: SellerPerformanceQuery & { format?: 'json' | 'csv' },
): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('from', q.from);
  params.set('to', q.to);
  params.set('sort', q.sort);
  if (q.clusterId) params.set('clusterId', q.clusterId);
  if (q.format) params.set('format', q.format);
  return params;
};

export const useSellerPerformance = (q: SellerPerformanceQuery) =>
  useQuery({
    queryKey: sellerKeys.performance(q),
    queryFn: () =>
      api.get<SellerPerformanceReport>(
        `/admin/sellers/performance?${buildPerformanceParams({ ...q, format: 'json' }).toString()}`,
      ),
  });

/**
 * Downloads the CSV via a direct fetch (the api client unwraps JSON envelopes,
 * which would corrupt a CSV body). Sends the bearer token manually.
 */
export const downloadSellerPerformanceCsv = async (
  q: SellerPerformanceQuery,
): Promise<void> => {
  const res = await fetch(
    `${BASE}/admin/sellers/performance?${buildPerformanceParams({ ...q, format: 'csv' }).toString()}`,
    {
      headers: {
        Authorization: `Bearer ${tokenStore.access ?? ''}`,
      },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Performance download failed (${res.status}): ${text}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `buy-desi-seller-performance-${q.from.slice(0, 10)}_${q.to.slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

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

// ─── CA-2: Disciplinary actions ─────────────────────────────────────────────

interface DisciplinaryVars {
  id: string;
  reason: string;
}

export const useWarnSeller = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: DisciplinaryVars) =>
      api.put<SafeSellerProfile>(`/admin/sellers/${id}/warn`, { reason }),
    onSuccess: (_, vars) => invalidateSellers(qc, vars.id),
  });
};

export const useSuspendSeller = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: DisciplinaryVars) =>
      api.put<SafeSellerProfile>(`/admin/sellers/${id}/suspend`, { reason }),
    onSuccess: (_, vars) => invalidateSellers(qc, vars.id),
  });
};

export const useReactivateSeller = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: DisciplinaryVars) =>
      api.put<SafeSellerProfile>(`/admin/sellers/${id}/reactivate`, { reason }),
    onSuccess: (_, vars) => invalidateSellers(qc, vars.id),
  });
};

// Story 3.1 — admin directly registers an active seller (no OTP/approval queue).
export interface AdminRegisterSellerInput {
  name: string;
  email?: string;
  mobile?: string;
  password: string;
  farmName: string;
  address: { line1: string; line2?: string; city: string; state: string; pincode: string };
  categoryIds: string[];
  clusterId?: string;
}

export const useAdminRegisterSeller = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminRegisterSellerInput) =>
      api.post<SafeSellerProfile>('/admin/sellers/register', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: sellerKeys.all }),
  });
};
