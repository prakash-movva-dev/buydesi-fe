import { useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/api';
import { useClustersList } from './api';
import { ClusterFormDialog } from './ClusterFormDialog';
import type { ClusterStatus, ClustersListQuery, SafeCluster } from './types';

const STATUS_OPTIONS: Array<{ value: '' | ClusterStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
];

const statusVariant: Record<ClusterStatus, 'success' | 'warning' | 'muted'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'muted',
};

const DEFAULT_LIMIT = 25;

export const ClustersPage = () => {
  const { user } = useAuth();
  const isSuper =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get('status') as ClusterStatus | null) ?? '';
  const stateFilter = searchParams.get('state') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.max(5, Number(searchParams.get('limit') ?? DEFAULT_LIMIT));

  const query = useMemo<ClustersListQuery>(
    () => ({
      status: status || undefined,
      state: stateFilter || undefined,
      page,
      limit,
    }),
    [status, stateFilter, page, limit],
  );

  const { data, isLoading, isError, error } = useClustersList(query);
  const total = data?.meta.total ?? 0;
  const items = data?.items ?? [];

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in next)) params.set('page', '1');
    setSearchParams(params);
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SafeCluster | null>(null);

  const head = [
    { id: 'name', label: 'Name' },
    { id: 'location', label: 'State / District' },
    { id: 'status', label: 'Status' },
    { id: 'pins', label: 'Pin codes', align: 'right' as const },
    { id: 'cats', label: 'Active categories', align: 'right' as const },
    { id: 'transport', label: 'Transport default' },
    { id: 'admin', label: 'Cluster admin' },
    { id: 'view', label: '' },
    ...(isSuper ? [{ id: 'edit', label: '' }] : []),
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Clusters"
        description="Geographic operating units. Each cluster has its own Cluster Admin, pin codes served, and default trade-transport mode."
        action={
          isSuper ? (
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New cluster
            </Button>
          ) : undefined
        }
      />

      <Card>
        <Stack
          direction="row"
          spacing={2}
          flexWrap="wrap"
          alignItems="center"
          sx={{ p: 2.5 }}
        >
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setParam({ status: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 200 }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="State"
            value={stateFilter}
            onChange={(e) => setParam({ state: e.target.value })}
            placeholder="Filter by state"
            InputLabelProps={{ shrink: true }}
            sx={{ width: 240 }}
          />
        </Stack>

        {isError && (
          <Box sx={{ px: 2.5, pb: 2, color: 'error.main', typography: 'body2' }}>
            {error instanceof Error ? error.message : 'Failed to load clusters'}
          </Box>
        )}

        <Scrollbar>
          <Table sx={{ minWidth: 960 }}>
            <TableHeadCustom headLabel={head} />
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    <Link component={RouterLink} to={`/admin/clusters/${c.id}`} color="inherit">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Box>{c.state}</Box>
                    <Box sx={{ color: 'text.secondary', typography: 'caption' }}>{c.district}</Box>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
                  </TableCell>
                  <TableCell align="right">{c.pinCodes.length}</TableCell>
                  <TableCell align="right">{c.activeCategories.length}</TableCell>
                  <TableCell>
                    <Badge variant="muted">{c.defaultTradeTransport}</Badge>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', typography: 'caption' }}>
                    {c.adminId ? c.adminId.slice(-10) : '— unassigned'}
                  </TableCell>
                  <TableCell>
                    <Link
                      component={RouterLink}
                      to={`/admin/clusters/${c.id}`}
                      variant="subtitle2"
                    >
                      View
                    </Link>
                  </TableCell>
                  {isSuper && (
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditing(c);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              <TableNoData notFound={!isLoading && items.length === 0} />
            </TableBody>
          </Table>
        </Scrollbar>

        <TablePaginationCustom
          count={total}
          page={page - 1}
          rowsPerPage={limit}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_e, newPage) => setParam({ page: String(newPage + 1) })}
          onRowsPerPageChange={(e) => setParam({ limit: e.target.value, page: '1' })}
        />
      </Card>

      <ClusterFormDialog open={dialogOpen} editing={editing} onClose={() => setDialogOpen(false)} />
    </Stack>
  );
};
