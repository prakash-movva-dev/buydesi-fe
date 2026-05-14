import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type {
  CreatePromoterInput,
  Promoter,
  PromoterDashboard,
  PromotersListMeta,
  PromotersListQuery,
  UpdatePromoterInput,
} from './types';

export const promoterKeys = {
  all: ['promoters'] as const,
  list: (q: PromotersListQuery) => ['promoters', 'list', q] as const,
  dashboard: ['promoters', 'me-dashboard'] as const,
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
