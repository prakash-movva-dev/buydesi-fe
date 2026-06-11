import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type { AdminNotification, NotificationsListQuery, NotificationsMeta } from './types';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (q: NotificationsListQuery) => ['notifications', 'list', q] as const,
};

interface NotificationsResult {
  items: AdminNotification[];
  meta: NotificationsMeta;
}

const fetchNotifications = async (q: NotificationsListQuery): Promise<NotificationsResult> => {
  const params = new URLSearchParams();
  if (q.unreadOnly) params.set('unreadOnly', 'true');
  params.set('page', String(q.page ?? 1));
  params.set('limit', String(q.limit ?? 20));
  const { data, meta } = await fetchEnvelope<AdminNotification[]>(
    `/notifications?${params.toString()}`,
  );
  const m = (meta as Partial<NotificationsMeta> | undefined) ?? {};
  return {
    items: data,
    meta: {
      total: m.total ?? data.length,
      page: m.page ?? q.page ?? 1,
      limit: m.limit ?? q.limit ?? 20,
      unread: m.unread ?? 0,
    },
  };
};

/**
 * Recent notifications for the signed-in user. Polls every 60s so the bell's
 * unread badge stays fresh without a manual refresh.
 */
export const useNotifications = (q: NotificationsListQuery = {}) =>
  useQuery({
    queryKey: notificationKeys.list(q),
    queryFn: () => fetchNotifications(q),
    refetchInterval: 60_000,
  });

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put<AdminNotification>(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
};

export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.put<{ success: boolean }>('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
};
