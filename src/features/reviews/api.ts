import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type { Review, ReviewsListMeta, ReviewsListQuery, ReviewStatus } from './types';

export const reviewKeys = {
  all: ['reviews'] as const,
  list: (q: ReviewsListQuery) => ['reviews', 'list', q] as const,
};

interface ListResult {
  items: Review[];
  meta: ReviewsListMeta;
}

const fetchList = async (q: ReviewsListQuery): Promise<ListResult> => {
  const params = new URLSearchParams();
  if (q.status) params.set('status', q.status);
  if (q.targetType) params.set('targetType', q.targetType);
  if (q.targetId) params.set('targetId', q.targetId);
  if (q.categoryId) params.set('categoryId', q.categoryId);
  if (q.minRating !== undefined) params.set('minRating', String(q.minRating));
  if (q.maxRating !== undefined) params.set('maxRating', String(q.maxRating));
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<Review[]>(`/reviews?${params.toString()}`);
  return {
    items: data,
    meta:
      (meta as ReviewsListMeta | undefined) ?? {
        total: data.length,
        page: q.page,
        limit: q.limit,
      },
  };
};

export const useReviewsList = (q: ReviewsListQuery) =>
  useQuery({ queryKey: reviewKeys.list(q), queryFn: () => fetchList(q) });

export const useModerateReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: Exclude<ReviewStatus, 'pending'>;
      notes?: string;
    }) => api.put<Review>(`/reviews/${id}/moderate`, { status, notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all }),
  });
};

export const useDeleteReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: true }>(`/reviews/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all }),
  });
};
