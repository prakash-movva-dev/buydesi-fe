import { useQuery } from '@tanstack/react-query';
import { fetchEnvelope } from '@/lib/api';
import { tokenStore } from '@/lib/token-store';
import type { ActivityListMeta, ActivityListQuery, ActivityLogEntry } from './types';

const BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1').replace(
  /\/+$/,
  '',
);

export const activityKeys = {
  all: ['activity'] as const,
  list: (q: ActivityListQuery) => ['activity', 'list', q] as const,
};

interface ListResult {
  items: ActivityLogEntry[];
  meta: ActivityListMeta;
}

/** Shared filter params for both the JSON list and the CSV export. */
const buildActivityParams = (q: ActivityListQuery): URLSearchParams => {
  const params = new URLSearchParams();
  if (q.actorId) params.set('actorId', q.actorId);
  if (q.actorRole) params.set('actorRole', q.actorRole);
  if (q.action) params.set('action', q.action);
  if (q.entityType) params.set('entityType', q.entityType);
  if (q.entityId) params.set('entityId', q.entityId);
  if (q.from) params.set('from', q.from);
  if (q.to) params.set('to', q.to);
  return params;
};

const fetchList = async (q: ActivityListQuery): Promise<ListResult> => {
  const params = buildActivityParams(q);
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

/**
 * Downloads the activity log as CSV via a direct fetch (the api client unwraps
 * JSON envelopes, which would corrupt a CSV body). Reuses the active filter set;
 * pagination is intentionally omitted so the export covers the whole filtered range.
 */
export const downloadActivityCsv = async (
  filters: Omit<ActivityListQuery, 'page' | 'limit'>,
): Promise<void> => {
  const params = buildActivityParams({ ...filters, page: 1, limit: 0 });
  params.set('format', 'csv');
  const res = await fetch(`${BASE}/admin/activity-log?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${tokenStore.access ?? ''}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Activity log download failed (${res.status}): ${text}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `buy-desi-activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
