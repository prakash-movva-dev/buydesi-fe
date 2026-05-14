import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type {
  ClusterStats,
  ClustersListMeta,
  ClustersListQuery,
  CreateClusterInput,
  SafeCluster,
  UpdateClusterInput,
} from './types';

export const clusterKeys = {
  all: ['clusters'] as const,
  list: (q: ClustersListQuery) => ['clusters', 'list', q] as const,
  detail: (id: string) => ['clusters', 'detail', id] as const,
  stats: (id: string) => ['clusters', 'stats', id] as const,
};

interface ListResult {
  items: SafeCluster[];
  meta: ClustersListMeta;
}

const fetchList = async (q: ClustersListQuery): Promise<ListResult> => {
  const params = new URLSearchParams();
  if (q.state) params.set('state', q.state);
  if (q.status) params.set('status', q.status);
  if (q.q) params.set('q', q.q);
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<SafeCluster[]>(`/clusters?${params.toString()}`);
  return {
    items: data,
    meta:
      (meta as ClustersListMeta | undefined) ?? {
        total: data.length,
        page: q.page,
        limit: q.limit,
      },
  };
};

export const useClustersList = (q: ClustersListQuery) =>
  useQuery({ queryKey: clusterKeys.list(q), queryFn: () => fetchList(q) });

export const useCluster = (id: string | undefined) =>
  useQuery({
    queryKey: id ? clusterKeys.detail(id) : ['clusters', 'detail', 'none'],
    queryFn: () => api.get<SafeCluster>(`/clusters/${id}`),
    enabled: Boolean(id),
  });

export const useClusterStats = (id: string | undefined) =>
  useQuery({
    queryKey: id ? clusterKeys.stats(id) : ['clusters', 'stats', 'none'],
    queryFn: () => api.get<ClusterStats>(`/clusters/${id}/stats`),
    enabled: Boolean(id),
  });

export const useCreateCluster = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClusterInput) => api.post<SafeCluster>('/clusters', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: clusterKeys.all }),
  });
};

export const useUpdateCluster = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateClusterInput }) =>
      api.put<SafeCluster>(`/clusters/${id}`, patch),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: clusterKeys.all });
      qc.invalidateQueries({ queryKey: clusterKeys.detail(vars.id) });
    },
  });
};
