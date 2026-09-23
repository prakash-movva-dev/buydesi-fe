import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import TableBody from '@mui/material/TableBody';

import { varAlpha } from '@/theme/styles';

import { UserRole } from '@/types/api';
import { useAuth } from '@/lib/auth';
import { Label } from '@/components/label';
import { Scrollbar } from '@/components/scrollbar';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableSkeleton,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from '@/components/table';

import { useClustersList } from '@/features/clusters/api';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import { useSellersList } from './api';
import { SellerTableRow } from './seller-table-row';
import { SellerTableToolbar, type SellerFilters } from './seller-table-toolbar';
import { SellerTableFiltersResult } from './seller-table-filters-result';
import type { SellersListQuery, SellersSort, SellerStatus } from './types';

// ----------------------------------------------------------------------

const STATUS_OPTIONS: Array<{ value: '' | SellerStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'INFO_REQUESTED', label: 'Info requested' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

const TABLE_HEAD = [
  { id: 'name', label: 'Seller' },
  { id: 'cluster', label: 'Cluster', width: 180 },
  { id: 'pincode', label: 'Pincode', width: 120 },
  { id: 'created', label: 'Registered', width: 160 },
  { id: 'status', label: 'Status', width: 140 },
  { id: '', width: 100 },
];

/** Only these columns can be ordered by the API. */
const SORTABLE = new Set(['name', 'status', 'created']);

const toSortParam = (orderBy: string, order: 'asc' | 'desc'): SellersSort => {
  if (orderBy === 'created') return order === 'asc' ? 'oldest' : 'newest';
  return `${orderBy}_${order}` as SellersSort;
};

const fromSortParam = (sort: string | null): { orderBy: string; order: 'asc' | 'desc' } => {
  if (!sort || sort === 'newest') return { orderBy: 'created', order: 'desc' };
  if (sort === 'oldest') return { orderBy: 'created', order: 'asc' };
  const [column, direction] = sort.split('_');
  return { orderBy: column, order: direction === 'asc' ? 'asc' : 'desc' };
};

const DEFAULT_LIMIT = 10;

// ----------------------------------------------------------------------

/**
 * Every seller on the platform. The filters, the sort and the page all live in
 * the URL and are answered by the API — nothing is narrowed or ordered in the
 * browser, so the table stays correct at any catalogue size.
 */
export const SellersListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const table = useTable({ defaultRowsPerPage: DEFAULT_LIMIT });

  // A cluster-scoped admin only ever sees their own, so the filter is noise.
  const canScopeCluster =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const status = (searchParams.get('status') as SellerStatus | null) ?? '';
  const filters: SellerFilters = {
    q: searchParams.get('q') ?? '',
    cluster: searchParams.get('cluster') ?? '',
    verified: (searchParams.get('verified') as SellerFilters['verified'] | null) ?? '',
  };
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT));
  const { orderBy, order } = fromSortParam(searchParams.get('sort'));

  /** Writes params, resetting to page 1 for anything that changes the result set. */
  const setParams = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      if (!('page' in next)) params.delete('page');
      setSearchParams(params, { replace: true });
      table.setSelected([]);
    },
    [searchParams, setSearchParams, table],
  );

  const query = useMemo<SellersListQuery>(
    () => ({
      status: status || undefined,
      clusterId: filters.cluster || undefined,
      q: filters.q || undefined,
      verified: filters.verified ? filters.verified === 'yes' : undefined,
      sort: toSortParam(orderBy, order),
      page,
      limit,
    }),
    [status, filters.cluster, filters.verified, filters.q, orderBy, order, page, limit],
  );

  const { data, isLoading, isError, error } = useSellersList(query);
  const { data: clusters } = useClustersList({ page: 1, limit: 100 });

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  // Per-status totals for the whole filter, so every tab carries its number
  // rather than only the one being viewed.
  const counts = data?.meta.counts;

  const clusterName = useMemo(
    () => new Map((clusters?.items ?? []).map((c) => [c.id, c.name])),
    [clusters],
  );

  const handleFilters = useCallback(
    (patch: Partial<SellerFilters>) => {
      setParams(
        Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, value ?? null])),
      );
    },
    [setParams],
  );

  const handleResetFilters = useCallback(() => {
    setParams({ q: null, cluster: null, verified: null });
  }, [setParams]);

  const handleSort = useCallback(
    (id: string) => {
      if (!SORTABLE.has(id)) return;
      const next = orderBy === id && order === 'desc' ? 'asc' : 'desc';
      setParams({ sort: toSortParam(id, next) });
    },
    [order, orderBy, setParams],
  );

  const canReset = !!filters.q || !!filters.cluster || !!filters.verified;
  const notFound = !isLoading && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Sellers"
        description="Everyone selling on the platform — review registrations, check KYC and open a storefront."
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Could not load sellers'}
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
          {STATUS_OPTIONS.map((tab) => (
            <Tab
              key={tab.value || 'all'}
              iconPosition="end"
              value={tab.value}
              label={tab.label}
              icon={
                <Label
                  variant={tab.value === status ? 'filled' : 'soft'}
                  color={
                    (tab.value === 'APPROVED' && 'success') ||
                    (tab.value === 'PENDING' && 'warning') ||
                    (tab.value === 'REJECTED' && 'error') ||
                    (tab.value === 'INFO_REQUESTED' && 'info') ||
                    (tab.value === 'SUSPENDED' && 'default') ||
                    'default'
                  }
                >
                  {counts ? (counts[tab.value || 'all'] ?? 0) : '-'}
                </Label>
              }
            />
          ))}
        </Tabs>

        <SellerTableToolbar
          filters={filters}
          clusters={clusters?.items ?? []}
          showClusterFilter={canScopeCluster}
          onFilters={handleFilters}
        />

        {canReset && (
          <SellerTableFiltersResult
            filters={filters}
            clusterName={clusterName.get(filters.cluster)}
            totalResults={total}
            onFilters={handleFilters}
            onReset={handleResetFilters}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
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
                      <SellerTableRow
                        key={row.id}
                        row={row}
                        clusterName={row.clusterId ? clusterName.get(row.clusterId) : undefined}
                        onViewRow={() => navigate(`/admin/sellers/${row.id}`)}
                        onApprove={() => navigate(`/admin/sellers/${row.id}`)}
                      />
                    ))}

                <TableEmptyRows
                  height={table.dense ? 56 : 76}
                  emptyRows={emptyRows(page - 1, limit, total)}
                />

                <TableNoData notFound={notFound} />
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
    </>
  );
};
