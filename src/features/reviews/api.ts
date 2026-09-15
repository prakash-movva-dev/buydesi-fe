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
  if (q.rating !== undefined) params.set('rating', String(q.rating));
  if (q.handled !== undefined) params.set('handled', String(q.handled));
  if (q.q) params.set('q', q.q);
  if (q.sort) params.set('sort', q.sort);
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

/**
 * Marks a low-rated review as dealt with, or puts it back in the queue —
 * distinct from moderation, which decides whether buyers see it at all.
 */
export const useSetReviewHandled = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      handled: boolean;
      notes?: string;
      ticketId?: string;
    }) => api.put<Review>(`/reviews/${id}/handled`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all }),
  });
};
