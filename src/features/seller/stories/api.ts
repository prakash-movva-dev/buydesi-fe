import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type {
  CreateStoryInput,
  FarmerStory,
  StoriesListMeta,
  StoriesListQuery,
  UpdateStoryInput,
} from './types';

export const storyKeys = {
  all: ['farmer-stories'] as const,
  mine: (q: StoriesListQuery) => ['farmer-stories', 'mine', q] as const,
};

interface ListResult {
  items: FarmerStory[];
  meta: StoriesListMeta;
}

/** A seller's own shelf — hidden posts included, which the public feed omits. */
export const useMyStories = (q: StoriesListQuery) =>
  useQuery({
    queryKey: storyKeys.mine(q),
    queryFn: async (): Promise<ListResult> => {
      const params = new URLSearchParams();
      params.set('page', String(q.page));
      params.set('limit', String(q.limit));
      if (q.q) params.set('q', q.q);
      if (q.status) params.set('status', q.status);
      const { data, meta } = await fetchEnvelope<FarmerStory[]>(
        `/farmer-stories/mine?${params.toString()}`,
      );
      return {
        items: data,
        meta:
          (meta as StoriesListMeta | undefined) ?? {
            total: data.length,
            page: q.page,
            limit: q.limit,
          },
      };
    },
  });

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: storyKeys.all });
};

export const useCreateStory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStoryInput) =>
      api.post<FarmerStory>('/farmer-stories', input),
    onSuccess: () => invalidate(qc),
  });
};

export const useUpdateStory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateStoryInput }) =>
      api.put<FarmerStory>(`/farmer-stories/${id}`, patch),
    onSuccess: () => invalidate(qc),
  });
};

export const useDeleteStory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/farmer-stories/${id}`),
    onSuccess: () => invalidate(qc),
  });
};
