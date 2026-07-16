import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
import { formatDateTime } from '@/lib/format';
import { downloadActivityCsv, useActivityList } from './api';
import type { ActivityListQuery } from './types';

const HEAD = [
  { id: 'when', label: 'When' },
  { id: 'actor', label: 'Actor' },
  { id: 'action', label: 'Action' },
  { id: 'entity', label: 'Entity' },
  { id: 'meta', label: 'Path / metadata' },
  { id: 'status', label: 'Status' },
  { id: 'ip', label: 'IP' },
];

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
    <Stack spacing={3}>
      <PageHeader
        title="Activity log"
        description="Every admin mutation is captured here (auto by the activity middleware, plus domain-specific entries written by service code). Super and Sub-Super only."
      />

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' },
        }}
      >
        <TextField
          value={actorId}
          onChange={(e) => setParam({ actorId: e.target.value })}
          label="Actor id"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          select
          label="Actor role"
          value={actorRole}
          onChange={(e) => setParam({ actorRole: e.target.value })}
          InputLabelProps={{ shrink: true }}
        >
          {ROLE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          value={action}
          onChange={(e) => setParam({ action: e.target.value })}
          label="Action (e.g. http.PUT)"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          value={entityType}
          onChange={(e) => setParam({ entityType: e.target.value })}
          label="Entity type"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          value={entityId}
          onChange={(e) => setParam({ entityId: e.target.value })}
          label="Entity id"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="date"
          value={from}
          onChange={(e) => setParam({ from: e.target.value })}
          label="From date"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="date"
          value={to}
          onChange={(e) => setParam({ to: e.target.value })}
          label="To date"
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="outline" onClick={() => setSearchParams(new URLSearchParams())}>
          Clear filters
        </Button>
        <Button variant="outline" onClick={downloadCsv} disabled={downloading}>
          <Download className="h-4 w-4" />
          {downloading ? 'Exporting…' : 'Download CSV'}
        </Button>
      </Box>

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
          <Card>
            <Scrollbar>
              <Table sx={{ minWidth: 800 }}>
                <TableHeadCustom headLabel={HEAD} />
                <TableBody>
                  {(data?.items ?? []).map((e) => {
                    const path =
                      typeof e.metadata?.path === 'string' ? (e.metadata.path as string) : null;
                    return (
                      <TableRow key={e.id ?? e._id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap', typography: 'caption' }}>
                          {formatDateTime(e.at)}
                        </TableCell>
                        <TableCell sx={{ typography: 'caption' }}>
                          {e.actorRole && <Badge variant="muted">{e.actorRole}</Badge>}
                          {e.actorId && (
                            <Box sx={{ mt: 0.25, fontFamily: 'monospace' }}>
                              {e.actorId.slice(-10)}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', typography: 'caption' }}>
                          {e.action}
                        </TableCell>
                        <TableCell sx={{ typography: 'caption' }}>
                          {e.entityType ? (
                            <>
                              <Badge variant="info">{e.entityType}</Badge>
                              {e.entityId && (
                                <Box sx={{ mt: 0.25, fontFamily: 'monospace' }}>
                                  {e.entityId.slice(-10)}
                                </Box>
                              )}
                            </>
                          ) : (
                            <Box component="span" sx={{ color: 'text.secondary' }}>—</Box>
                          )}
                        </TableCell>
                        <TableCell
                          title={path ?? ''}
                          sx={{
                            maxWidth: 360,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: 'monospace',
                            typography: 'caption',
                          }}
                        >
                          {path ?? (Object.keys(e.metadata).length ? JSON.stringify(e.metadata) : '—')}
                        </TableCell>
                        <TableCell>
                          {e.status !== null ? (
                            <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
                          ) : (
                            <Box component="span" sx={{ color: 'text.secondary', typography: 'caption' }}>
                              —
                            </Box>
                          )}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', typography: 'caption' }}>
                          {e.ip ?? '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableNoData notFound={!isLoading && (data?.items.length ?? 0) === 0} />
                </TableBody>
              </Table>
            </Scrollbar>

            <TablePaginationCustom
              count={total}
              page={page - 1}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[10, 25, 50]}
              onPageChange={(_e, newPage) => setParam({ page: String(newPage + 1) })}
              onRowsPerPageChange={() => {}}
            />
          </Card>

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Entries auto-expire after 180 days via Mongo TTL — snapshot to cold storage if you
            need longer retention.
          </Typography>
        </>
      )}
    </Stack>
  );
};
