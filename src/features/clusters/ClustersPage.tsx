import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';

import { varAlpha } from '@/theme/styles';

import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/api';
import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyContent } from '@/components/empty-content';
import {
  useTable,
  emptyRows,
  TableSkeleton,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from '@/components/table';

import { useUsersList } from '@/features/users/api';
import { useRegionsList } from '@/features/regions/api';

import { useClustersList } from './api';
import { ClusterTableRow } from './cluster-table-row';
import { ClusterFormDialog } from './ClusterFormDialog';
import { ClusterTableToolbar, type ClusterFilters } from './cluster-table-toolbar';
import { ClusterTableFiltersResult } from './cluster-table-filters-result';
import type { ClusterStatus, ClustersListQuery, SafeCluster } from './types';

// ----------------------------------------------------------------------

const STATUS_TABS: Array<{ value: '' | ClusterStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
];

const TABLE_HEAD = [
  { id: 'name', label: 'Cluster' },
  { id: 'region', label: 'Region', width: 150 },
  { id: 'admin', label: 'Cluster admin', width: 180 },
  { id: 'support', label: 'Support admin', width: 180 },
  { id: 'pincodes', label: 'PIN codes', align: 'right' as const, width: 110 },
  { id: 'cod', label: 'Cash', width: 110 },
  { id: 'status', label: 'Status', width: 110 },
  { id: '', width: 60 },
];

const DEFAULT_LIMIT = 10;

// ----------------------------------------------------------------------

/**
 * Every operating area on the platform.
 *
 * A cluster is run by exactly one cluster admin and served by exactly one
 * support admin, so both slots are columns here: a vacant one is an operational
 * gap, not a detail to go hunting for.
 */
export const ClustersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const table = useTable({ defaultRowsPerPage: DEFAULT_LIMIT });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SafeCluster | null>(null);

  const isSuper =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const status = (searchParams.get('status') as ClusterStatus | null) ?? '';
  const filters: ClusterFilters = {
    q: searchParams.get('q') ?? '',
    state: searchParams.get('state') ?? '',
  };
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT));

  const setParams = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      if (!('page' in next)) params.delete('page');
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const query = useMemo<ClustersListQuery>(
    () => ({
      status: status || undefined,
      state: filters.state || undefined,
      q: filters.q || undefined,
      page,
      limit,
    }),
    [status, filters.state, filters.q, page, limit],
  );

  const { data, isLoading, isError, error } = useClustersList(query);
  const { data: regions } = useRegionsList();
  // Both staffing roles, resolved once so the rows can name who holds each slot.
  const { data: clusterAdmins } = useUsersList({
    role: UserRole.CLUSTER_ADMIN,
    page: 1,
    limit: 100,
  });
  const { data: supportAdmins } = useUsersList({
    role: UserRole.SUPPORT_ADMIN,
    page: 1,
    limit: 100,
  });

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const counts = data?.meta.counts;

  const regionName = useMemo(
    () => new Map((regions ?? []).map((r) => [r.id, r.name])),
    [regions],
  );
  const adminByCluster = useMemo(
    () =>
      new Map(
        (clusterAdmins?.items ?? [])
          .filter((u) => u.clusterId)
          .map((u) => [u.clusterId as string, u.name]),
      ),
    [clusterAdmins],
  );
  const supportByCluster = useMemo(
    () =>
      new Map(
        (supportAdmins?.items ?? [])
          .filter((u) => u.clusterId)
          .map((u) => [u.clusterId as string, u.name]),
      ),
    [supportAdmins],
  );

  const states = useMemo(
    () => Array.from(new Set(rows.map((c) => c.state))).sort(),
    [rows],
  );

  const handleFilters = useCallback(
    (patch: Partial<ClusterFilters>) => {
      setParams(
        Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, value ?? null])),
      );
    },
    [setParams],
  );

  const canReset = !!filters.q || !!filters.state;
  const notFound = !isLoading && rows.length === 0;
  const vacancies = rows.filter(
    (c) => !adminByCluster.get(c.id) || !supportByCluster.get(c.id),
  ).length;

  return (
    <>
      <PageHeader
        title="Clusters"
        description="The operating areas the platform runs in. Each one has a single cluster admin and a single support admin."
        action={
          isSuper ? (
            <Button
              variant="contained"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New cluster
            </Button>
          ) : undefined
        }
      />

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Could not load clusters'}
        </Alert>
      )}

      {!isLoading && vacancies > 0 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          {vacancies} cluster{vacancies === 1 ? '' : 's'} on this page {vacancies === 1 ? 'is' : 'are'} missing
          a cluster admin or a support admin — sellers there have nobody answering for them.
        </Alert>
      )}

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={status}
          onChange={(_e, value) => setParams({ status: value })}
          sx={{
            px: 2.5,
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          {STATUS_TABS.map((tab) => (
            <Tab
              key={tab.value || 'all'}
              iconPosition="end"
              value={tab.value}
              label={tab.label}
              icon={
                <Label
                  variant={tab.value === status ? 'filled' : 'soft'}
                  color={
                    (tab.value === 'active' && 'success') ||
                    (tab.value === 'pending' && 'warning') ||
                    'default'
                  }
                >
                  {counts ? (counts[tab.value || 'all'] ?? 0) : '-'}
                </Label>
              }
            />
          ))}
        </Tabs>

        <ClusterTableToolbar filters={filters} states={states} onFilters={handleFilters} />

        {canReset && (
          <ClusterTableFiltersResult
            filters={filters}
            totalResults={total}
            onFilters={handleFilters}
            onReset={() => setParams({ q: null, state: null })}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1100 }}>
              <TableHeadCustom headLabel={TABLE_HEAD} />

              <TableBody>
                {isLoading
                  ? Array.from({ length: Math.min(limit, 5) }).map((_, index) => (
                      <TableSkeleton key={index} sx={{ height: table.dense ? 56 : 76 }} />
                    ))
                  : rows.map((row) => (
                      <ClusterTableRow
                        key={row.id}
                        row={row}
                        regionName={row.regionId ? regionName.get(row.regionId) : undefined}
                        adminName={adminByCluster.get(row.id)}
                        supportName={supportByCluster.get(row.id)}
                        onViewRow={() => navigate(`/admin/clusters/${row.id}`)}
                      />
                    ))}

                <TableEmptyRows
                  height={table.dense ? 56 : 76}
                  emptyRows={emptyRows(page - 1, limit, total)}
                />

                {notFound && (
                  <TableRow>
                    <TableCell colSpan={TABLE_HEAD.length}>
                      <EmptyContent
                        filled
                        sx={{ py: 10 }}
                        title={canReset || status ? 'Nothing matches' : 'No clusters yet'}
                        description={
                          canReset || status
                            ? 'Try another tab, or clear the filters.'
                            : 'A cluster is an area you operate in — create one to start onboarding sellers there.'
                        }
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        <TablePaginationCustom
          page={page - 1}
          dense={table.dense}
          count={total}
          rowsPerPage={limit}
          rowsPerPageOptions={[5, 10, 25, 50]}
          onPageChange={(_e, next) => setParams({ page: String(next + 1) })}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={(e) => setParams({ limit: e.target.value, page: '1' })}
        />
      </Card>

      <ClusterFormDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
};
