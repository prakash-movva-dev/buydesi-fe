import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import { tokenStore } from '@/lib/token-store';
import type {
  CreatePromoterInput,
  Promoter,
  PromoterDashboard,
  PromoterPerformanceReport,
  PromotersListMeta,
  PromotersListQuery,
  UpdatePromoterInput,
} from './types';

export const promoterKeys = {
  all: ['promoters'] as const,
  list: (q: PromotersListQuery) => ['promoters', 'list', q] as const,
  dashboard: ['promoters', 'me-dashboard'] as const,
  performance: (clusterId?: string) => ['promoters', 'performance', clusterId ?? 'all'] as const,
};

interface ListResult {
  items: Promoter[];
  meta: PromotersListMeta;
}

const fetchList = async (q: PromotersListQuery): Promise<ListResult> => {
  const params = new URLSearchParams();
  if (q.clusterId) params.set('clusterId', q.clusterId);
  if (q.active !== undefined) params.set('active', String(q.active));
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<Promoter[]>(
    `/admin/promoters?${params.toString()}`,
  );
  return {
    items: data,
    meta:
      (meta as PromotersListMeta | undefined) ?? {
        total: data.length,
        page: q.page,
        limit: q.limit,
      },
  };
};

export const usePromotersList = (q: PromotersListQuery) =>
  useQuery({ queryKey: promoterKeys.list(q), queryFn: () => fetchList(q) });

/** Promoter-facing dashboard (PROMOTER role required by backend). */
export const usePromoterDashboard = (enabled: boolean) =>
  useQuery({
    queryKey: promoterKeys.dashboard,
    queryFn: () => api.get<PromoterDashboard>('/promoter/dashboard'),
    enabled,
  });

export const useCreatePromoter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePromoterInput) =>
      api.post<Promoter>('/admin/promoters', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: promoterKeys.all }),
  });
};

export const useUpdatePromoter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdatePromoterInput }) =>
      api.patch<Promoter>(`/admin/promoters/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: promoterKeys.all }),
  });
};

export const useDeletePromoter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/admin/promoters/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: promoterKeys.all }),
  });
};

// ─── Performance (CA-4, story 3.11) ────────────────────────────────────────

const BASE = (import.meta.env.VITE_API_BASE_URL ?? 'https://api.buydesionline.com/api/v1').replace(
  /\/+$/,
  '',
);

const performanceParams = (clusterId?: string, format?: 'json' | 'csv'): URLSearchParams => {
  const params = new URLSearchParams();
  if (clusterId) params.set('clusterId', clusterId);
  if (format) params.set('format', format);
  return params;
};

/**
 * Cluster-scoped promoter performance. For regional admins the backend ignores
 * any clusterId and pins the scope to their own cluster; super-tier admins may
 * pass a clusterId (or omit it for all clusters).
 */
export const usePromoterPerformance = (clusterId?: string) =>
  useQuery({
    queryKey: promoterKeys.performance(clusterId),
    queryFn: () =>
      api.get<PromoterPerformanceReport>(
        `/admin/promoters/performance?${performanceParams(clusterId, 'json').toString()}`,
      ),
  });

/**
 * Downloads the performance CSV via a direct fetch (the api client unwraps JSON
 * envelopes, which would corrupt a CSV body). Sends the bearer token manually.
 */
export const downloadPromoterPerformanceCsv = async (clusterId?: string): Promise<void> => {
  const res = await fetch(
    `${BASE}/admin/promoters/performance?${performanceParams(clusterId, 'csv').toString()}`,
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
  a.download = 'buy-desi-promoter-performance.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
