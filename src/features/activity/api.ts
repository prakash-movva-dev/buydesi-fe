import { useQuery } from '@tanstack/react-query';
import { fetchEnvelope } from '@/lib/api';
import type { ActivityListMeta, ActivityListQuery, ActivityLogEntry } from './types';

export const activityKeys = {
  all: ['activity'] as const,
  list: (q: ActivityListQuery) => ['activity', 'list', q] as const,
};

interface ListResult {
  items: ActivityLogEntry[];
  meta: ActivityListMeta;
}

const fetchList = async (q: ActivityListQuery): Promise<ListResult> => {
  const params = new URLSearchParams();
  if (q.actorId) params.set('actorId', q.actorId);
  if (q.actorRole) params.set('actorRole', q.actorRole);
  if (q.action) params.set('action', q.action);
  if (q.entityType) params.set('entityType', q.entityType);
  if (q.entityId) params.set('entityId', q.entityId);
  if (q.from) params.set('from', q.from);
  if (q.to) params.set('to', q.to);
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<ActivityLogEntry[]>(
    `/admin/activity-log?${params.toString()}`,
  );
  return {
    items: data,
    meta:
      (meta as ActivityListMeta | undefined) ?? {
        total: data.length,
        page: q.page,
        limit: q.limit,
      },
  };
};

export const useActivityList = (q: ActivityListQuery) =>
  useQuery({ queryKey: activityKeys.list(q), queryFn: () => fetchList(q) });
