import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
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

import { useClustersList } from '@/features/clusters/api';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import { useAffiliatesList } from './api';
import { AddAffiliateDialog } from './AddAffiliateDialog';
import { AffiliateTableRow } from './affiliate-table-row';
import { AFFILIATE_STATUS_LABEL } from './status-badge';
import { AffiliateTableToolbar, type AffiliateFilters } from './affiliate-table-toolbar';
import { AffiliateTableFiltersResult } from './affiliate-table-filters-result';
import type { AffiliatesListQuery, AffiliatesSort, AffiliateStatus } from './types';

// ----------------------------------------------------------------------

const STATUS_TABS: Array<{ value: '' | AffiliateStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'active', label: AFFILIATE_STATUS_LABEL.active },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: AFFILIATE_STATUS_LABEL.suspended },
];

const TABLE_HEAD = [
  { id: 'name', label: 'Affiliate' },
  { id: 'cluster', label: 'Cluster', width: 160 },
  { id: 'rate', label: 'Rate', align: 'right' as const, width: 90 },
  { id: 'links', label: 'Links', align: 'right' as const, width: 80 },
  { id: 'funnel', label: 'Clicks → orders', width: 180 },
  { id: 'earned', label: 'Earned', align: 'right' as const, width: 140 },
  { id: 'joined', label: 'Joined', width: 120 },
  { id: 'status', label: 'Status', width: 150 },
  { id: '', width: 60 },
];

/** Only these columns can be ordered by the API. */
const SORTABLE = new Set(['name', 'joined']);

const toSortParam = (orderBy: string, order: 'asc' | 'desc'): AffiliatesSort => {
  if (orderBy === 'name') return order === 'asc' ? 'name_asc' : 'name_desc';
  return order === 'asc' ? 'oldest' : 'newest';
};

const fromSortParam = (sort: string | null): { orderBy: string; order: 'asc' | 'desc' } => {
  if (sort === 'oldest') return { orderBy: 'joined', order: 'asc' };
  if (sort === 'name_asc') return { orderBy: 'name', order: 'asc' };
  if (sort === 'name_desc') return { orderBy: 'name', order: 'desc' };
  return { orderBy: 'joined', order: 'desc' };
};

const DEFAULT_LIMIT = 10;

// ----------------------------------------------------------------------

/**
 * Everyone selling on our behalf without holding stock.
 *
 * An affiliate is judged on one thing — whether the people they send actually
 * buy — so the list leads with clicks against orders rather than with how many
 * links they have made.
 */
export const AffiliatesListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const table = useTable({ defaultRowsPerPage: DEFAULT_LIMIT });
  const [addOpen, setAddOpen] = useState(false);

  const canScopeCluster =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const status = (searchParams.get('status') as AffiliateStatus | null) ?? '';
  const filters: AffiliateFilters = {
    q: searchParams.get('q') ?? '',
    cluster: searchParams.get('cluster') ?? '',
  };
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT));
  const { orderBy, order } = fromSortParam(searchParams.get('sort'));

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

  const query = useMemo<AffiliatesListQuery>(
    () => ({
      status: status || undefined,
      clusterId: filters.cluster || undefined,
      q: filters.q || undefined,
      sort: toSortParam(orderBy, order),
      page,
      limit,
    }),
    [status, filters.cluster, filters.q, orderBy, order, page, limit],
  );

  const { data, isLoading, isError, error } = useAffiliatesList(query);
  const { data: clusters } = useClustersList({ page: 1, limit: 100 });

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const counts = data?.meta.counts;

  const clusterName = useMemo(
    () => new Map((clusters?.items ?? []).map((c) => [c.id, c.name])),
    [clusters],
  );

  const handleFilters = useCallback(
    (patch: Partial<AffiliateFilters>) => {
      setParams(
        Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, value ?? null])),
      );
    },
    [setParams],
  );

  const handleSort = useCallback(
    (id: string) => {
      if (!SORTABLE.has(id)) return;
      const next = orderBy === id && order === 'desc' ? 'asc' : 'desc';
      setParams({ sort: toSortParam(id, next) });
    },
    [order, orderBy, setParams],
  );

  const canReset = !!filters.q || !!filters.cluster;
  const notFound = !isLoading && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Affiliates"
        description="People who bring buyers in with a link of their own. They earn a share of every order they send, paid once the buyer's return window closes."
        action={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              onClick={() => navigate('/admin/affiliates/conversions')}
              startIcon={<Iconify icon="solar:hand-money-bold" />}
            >
              Attributed sales
            </Button>
            <Button
              variant="contained"
              onClick={() => setAddOpen(true)}
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              Add affiliate
            </Button>
          </Stack>
        }
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Could not load affiliates'}
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
                    (tab.value === 'suspended' && 'error') ||
                    'default'
                  }
                >
                  {counts ? (counts[tab.value || 'all'] ?? 0) : '-'}
                </Label>
              }
            />
          ))}
        </Tabs>

        <AffiliateTableToolbar
          filters={filters}
          clusters={clusters?.items ?? []}
          showClusterFilter={canScopeCluster}
          onFilters={handleFilters}
        />

        {canReset && (
          <AffiliateTableFiltersResult
            filters={filters}
            clusterName={clusterName.get(filters.cluster)}
            totalResults={total}
            onFilters={handleFilters}
            onReset={() => setParams({ q: null, cluster: null })}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1180 }}>
              <TableHeadCustom
                order={order}
                orderBy={orderBy}
                headLabel={TABLE_HEAD}
                rowCount={rows.length}
                onSort={handleSort}
              />

              <TableBody>
                {isLoading
                  ? Array.from({ length: Math.min(limit, 5) }).map((_, index) => (
                      <TableSkeleton key={index} sx={{ height: table.dense ? 56 : 76 }} />
                    ))
                  : rows.map((row) => (
                      <AffiliateTableRow
                        key={row.id}
                        row={row}
                        clusterName={row.clusterId ? clusterName.get(row.clusterId) : undefined}
                        onViewRow={() => navigate(`/admin/affiliates/${row.id}`)}
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
                        title={canReset || status ? 'Nothing matches' : 'No affiliates yet'}
                        description={
                          canReset || status
                            ? 'Try another tab, or clear the filters.'
                            : 'Add someone with an affiliate account and they can start sharing links.'
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

      <AddAffiliateDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        lockedClusterId={canScopeCluster ? null : (user?.clusterId ?? null)}
      />
    </>
  );
};
