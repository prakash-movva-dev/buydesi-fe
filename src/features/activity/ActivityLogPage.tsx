import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { formatDateTime } from '@/lib/format';
import { downloadActivityCsv, useActivityList } from './api';
import type { ActivityListQuery } from './types';

const ROLE_OPTIONS = [
  { value: '', label: 'Any actor role' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'SUB_SUPER_ADMIN', label: 'Sub-Super Admin' },
  { value: 'REGIONAL_ADMIN', label: 'Regional Admin' },
  { value: 'CLUSTER_ADMIN', label: 'Cluster Admin' },
  { value: 'CATEGORY_ADMIN', label: 'Category Admin' },
  { value: 'SUPPORT_ADMIN', label: 'Support Admin' },
];

const PAGE_SIZE = 50;

const statusVariant = (status: number | null): 'success' | 'warning' | 'destructive' | 'muted' => {
  if (status === null) return 'muted';
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'muted';
  if (status >= 400 && status < 500) return 'warning';
  return 'destructive';
};

export const ActivityLogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const actorId = searchParams.get('actorId') ?? '';
  const actorRole = searchParams.get('actorRole') ?? '';
  const action = searchParams.get('action') ?? '';
  const entityType = searchParams.get('entityType') ?? '';
  const entityId = searchParams.get('entityId') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<ActivityListQuery>(
    () => ({
      actorId: actorId || undefined,
      actorRole: actorRole || undefined,
      action: action || undefined,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      from: from ? `${from}T00:00:00.000Z` : undefined,
      to: to ? `${to}T23:59:59.999Z` : undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [actorId, actorRole, action, entityType, entityId, from, to, page],
  );

  const { data, isLoading, isError, error } = useActivityList(query);
  const total = data?.meta.total ?? 0;
  const pageCount = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const downloadCsv = async () => {
    setDownloadError(null);
    setDownloading(true);
    try {
      // Export the full filtered set (page/limit are list-only concerns).
      const { page: _p, limit: _l, ...filters } = query;
      void _p;
      void _l;
      await downloadActivityCsv(filters);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in next)) params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity log</h1>
        <p className="text-muted-foreground">
          Every admin mutation is captured here (auto by the activity middleware, plus
          domain-specific entries written by service code). Super and Sub-Super only.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={actorId}
          onChange={(e) => setParam({ actorId: e.target.value })}
          placeholder="Actor id"
        />
        <Select value={actorRole} onChange={(e) => setParam({ actorRole: e.target.value })}>
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Input
          value={action}
          onChange={(e) => setParam({ action: e.target.value })}
          placeholder="Action (e.g. http.PUT)"
        />
        <Input
          value={entityType}
          onChange={(e) => setParam({ entityType: e.target.value })}
          placeholder="Entity type"
        />
        <Input
          value={entityId}
          onChange={(e) => setParam({ entityId: e.target.value })}
          placeholder="Entity id"
        />
        <Input
          type="date"
          value={from}
          onChange={(e) => setParam({ from: e.target.value })}
          aria-label="From date"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setParam({ to: e.target.value })}
          aria-label="To date"
        />
        <Button variant="outline" onClick={() => setSearchParams(new URLSearchParams())}>
          Clear filters
        </Button>
        <Button variant="outline" onClick={downloadCsv} disabled={downloading}>
          <Download className="h-4 w-4" />
          {downloading ? 'Exporting…' : 'Download CSV'}
        </Button>
      </div>

      {downloadError && (
        <p className="text-sm text-destructive">{downloadError}</p>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load activity'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Path / metadata</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((e) => {
                const path =
                  typeof e.metadata?.path === 'string' ? (e.metadata.path as string) : null;
                return (
                  <TableRow key={e.id ?? e._id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(e.at)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {e.actorRole && <Badge variant="muted">{e.actorRole}</Badge>}
                      {e.actorId && (
                        <div className="mt-0.5 font-mono">{e.actorId.slice(-10)}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.action}</TableCell>
                    <TableCell className="text-xs">
                      {e.entityType ? (
                        <>
                          <Badge variant="info">{e.entityType}</Badge>
                          {e.entityId && (
                            <div className="mt-0.5 font-mono">{e.entityId.slice(-10)}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md truncate font-mono text-xs" title={path ?? ''}>
                      {path ?? (Object.keys(e.metadata).length ? JSON.stringify(e.metadata) : '—')}
                    </TableCell>
                    <TableCell>
                      {e.status !== null ? (
                        <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.ip ?? '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(data?.items.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    No matching activity.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data?.items.length ?? 0} of {total} · page {page} / {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParam({ page: String(Math.max(1, page - 1)) })}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParam({ page: String(Math.min(pageCount, page + 1)) })}
                disabled={page >= pageCount}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Entries auto-expire after 180 days via Mongo TTL — snapshot to cold storage if you
            need longer retention.
          </p>
        </>
      )}
    </div>
  );
};
