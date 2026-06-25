import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { tokenStore } from '@/lib/token-store';
import type {
  CreateRegionInput,
  RegionPerformanceRange,
  RegionPerformanceReport,
  SafeRegion,
  UpdateRegionInput,
} from './types';

export const regionKeys = {
  all: ['regions'] as const,
  list: () => ['regions', 'list'] as const,
  performance: (id: string, range: RegionPerformanceRange) =>
    ['regions', 'performance', id, range] as const,
};

const BASE = (
  import.meta.env.VITE_API_BASE_URL ?? 'https://api.buydesionline.com/api/v1'
).replace(/\/+$/, '');

export const useRegionsList = () =>
  useQuery({
    queryKey: regionKeys.list(),
    queryFn: () => api.get<SafeRegion[]>('/admin/regions'),
  });

export const useCreateRegion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRegionInput) =>
      api.post<SafeRegion>('/admin/regions', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: regionKeys.all }),
  });
};

export const useUpdateRegion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateRegionInput }) =>
      api.put<SafeRegion>(`/admin/regions/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: regionKeys.all }),
  });
};

export const useDeleteRegion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/admin/regions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: regionKeys.all }),
  });
};

const buildPerfParams = (
  range: RegionPerformanceRange & { format?: 'json' | 'csv' },
): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('from', range.from);
  params.set('to', range.to);
  if (range.format) params.set('format', range.format);
  return params;
};

export const useRegionPerformance = (
  regionId: string | undefined,
  range: RegionPerformanceRange,
  enabled = true,
) =>
  useQuery({
    queryKey: regionId
      ? regionKeys.performance(regionId, range)
      : ['regions', 'performance', 'none', range],
    queryFn: () =>
      api.get<RegionPerformanceReport>(
        `/admin/regions/${regionId}/performance?${buildPerfParams({
          ...range,
          format: 'json',
        }).toString()}`,
      ),
    enabled: enabled && Boolean(regionId),
  });

/**
 * Downloads the region-performance CSV via a direct fetch (the api client unwraps
 * JSON envelopes, which would corrupt a CSV body). Sends the bearer token manually,
 * mirroring downloadClusterPerformanceCsv in src/features/reports/api.ts.
 */
export const downloadRegionPerformanceCsv = async (
  regionId: string,
  range: RegionPerformanceRange,
): Promise<void> => {
  const res = await fetch(
    `${BASE}/admin/regions/${regionId}/performance?${buildPerfParams({
      ...range,
      format: 'csv',
    }).toString()}`,
    {
      headers: {
        Authorization: `Bearer ${tokenStore.access ?? ''}`,
      },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Region performance download failed (${res.status}): ${text}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `buy-desi-region-performance-${range.from.slice(0, 10)}_${range.to.slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
