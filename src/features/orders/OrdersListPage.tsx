import { useCallback, useMemo } from 'react';
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

import { useClustersList } from '@/features/clusters/api';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import { useOrdersList } from './api';
import { ORDER_LABEL } from './status-badge';
import { OrderTableRow } from './order-table-row';
import { OrderTableToolbar, type OrderFilters } from './order-table-toolbar';
import { OrderTableFiltersResult } from './order-table-filters-result';
import type { OrderStatus, OrdersListQuery } from './types';

// ----------------------------------------------------------------------

const STATUS_TABS: Array<{ value: '' | OrderStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'PLACED', label: ORDER_LABEL.PLACED },
  { value: 'PACKED', label: ORDER_LABEL.PACKED },
  { value: 'DISPATCHED', label: ORDER_LABEL.DISPATCHED },
  { value: 'DELIVERED', label: ORDER_LABEL.DELIVERED },
  { value: 'CANCELLED', label: ORDER_LABEL.CANCELLED },
  { value: 'RETURNED', label: ORDER_LABEL.RETURNED },
];

const TABLE_HEAD = [
  { id: 'order', label: 'Order' },
  { id: 'status', label: 'Status', width: 150 },
  { id: 'payment', label: 'Payment', width: 140 },
  { id: 'total', label: 'Total', align: 'right' as const, width: 140 },
  { id: 'items', label: 'Items', align: 'right' as const, width: 100 },
  { id: 'where', label: 'Going to', width: 140 },
  { id: 'placed', label: 'Placed', width: 140 },
  { id: '', width: 60 },
];

const DEFAULT_LIMIT = 10;

// ----------------------------------------------------------------------

/**
 * Every order in the viewer's scope.
 *
 * "Needs attention" is a first-class view rather than a filter buried in a
 * dropdown: cancelled, returned, or carrying an open ticket is the set someone
 * actually has to work, and it does not line up with any single status.
 */
export const OrdersListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const table = useTable({ defaultRowsPerPage: DEFAULT_LIMIT });

  const canScopeCluster =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const status = (searchParams.get('status') as OrderStatus | null) ?? '';
  const problem = searchParams.get('problem') === 'true';
  const filters: OrderFilters = {
    q: searchParams.get('q') ?? '',
    cluster: searchParams.get('cluster') ?? '',
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

  const query = useMemo<OrdersListQuery>(
    () => ({
      // The problem view rewrites status server-side, so sending both would be
      // a contradiction — the narrower ask wins.
      status: problem ? undefined : status || undefined,
      problem: problem ? true : undefined,
      clusterId: filters.cluster || undefined,
      q: filters.q || undefined,
      page,
      limit,
    }),
    [status, problem, filters.cluster, filters.q, page, limit],
  );

  const { data, isLoading, isError, error } = useOrdersList(query);
  const { data: clusters } = useClustersList({ page: 1, limit: 100 });

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const counts = data?.meta.counts;

  const clusterName = useMemo(
    () => new Map((clusters?.items ?? []).map((c) => [c.id, c.name])),
    [clusters],
  );

  const handleFilters = useCallback(
    (patch: Partial<OrderFilters>) => {
      setParams(
        Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, value ?? null])),
      );
    },
    [setParams],
  );

  const canReset = !!filters.q || !!filters.cluster;
  const notFound = !isLoading && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Orders"
        description="Everything bought on the platform, newest first."
        action={
          <Button
            variant={problem ? 'contained' : 'outlined'}
            color={problem ? 'warning' : 'inherit'}
            onClick={() =>
              setParams({ problem: problem ? null : 'true', status: null })
            }
            startIcon={<Iconify icon="solar:danger-triangle-bold" />}
          >
            Needs attention
          </Button>
        }
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Could not load orders'}
        </Alert>
      )}

      {problem && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          Showing orders that were cancelled or returned, or that have an open support ticket —
          the status tabs do not apply to this view.
        </Alert>
      )}

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={problem ? '' : status}
          onChange={(_e, value) => setParams({ status: value, problem: null })}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
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
                  variant={!problem && tab.value === status ? 'filled' : 'soft'}
                  color={
                    (tab.value === 'PLACED' && 'info') ||
                    (tab.value === 'PACKED' && 'warning') ||
                    (tab.value === 'DISPATCHED' && 'warning') ||
                    (tab.value === 'DELIVERED' && 'success') ||
                    ((tab.value === 'CANCELLED' || tab.value === 'RETURNED') && 'error') ||
                    'default'
                  }
                >
                  {counts ? (counts[tab.value || 'all'] ?? 0) : '-'}
                </Label>
              }
            />
          ))}
        </Tabs>

        <OrderTableToolbar
          filters={filters}
          clusters={clusters?.items ?? []}
          showClusterFilter={canScopeCluster}
          onFilters={handleFilters}
        />

        {canReset && (
          <OrderTableFiltersResult
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
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1100 }}>
              <TableHeadCustom headLabel={TABLE_HEAD} />

              <TableBody>
                {isLoading
                  ? Array.from({ length: Math.min(limit, 5) }).map((_, index) => (
                      <TableSkeleton key={index} sx={{ height: table.dense ? 56 : 76 }} />
                    ))
                  : rows.map((row) => (
                      <OrderTableRow
                        key={row.id}
                        row={row}
                        onViewRow={() => navigate(`/admin/orders/${row.id}`)}
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
                        title={
                          problem
                            ? 'Nothing needs attention'
                            : canReset || status
                              ? 'Nothing matches'
                              : 'No orders yet'
                        }
                        description={
                          problem
                            ? 'No order is cancelled, returned, or sitting on an open ticket.'
                            : canReset || status
                              ? 'Try another tab, or clear the filters.'
                              : 'Orders appear here as buyers place them.'
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
    </>
  );
};
