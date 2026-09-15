import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

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
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import { usePayoutsList } from './api';
import { SCHEDULE_LABEL } from './status-badge';
import { RunBatchDialog } from './RunBatchDialog';
import { PayoutTableRow } from './payout-table-row';
import { PayoutTableToolbar, type PayoutFilters } from './payout-table-toolbar';
import { PayoutTableFiltersResult } from './payout-table-filters-result';
import type { PayoutSchedule, PayoutsListQuery, PayoutsSort, PayoutStatus } from './types';

// ----------------------------------------------------------------------

/**
 * Schedule, not status, is the dimension worth tabbing: a batch settles the
 * moment it is created, so every payout is PAID and status tabs would all show
 * the same rows.
 */
const SCHEDULE_TABS: Array<{ value: '' | PayoutSchedule; label: string }> = [
  { value: '', label: 'All' },
  { value: 'daily', label: SCHEDULE_LABEL.daily },
  { value: 'weekly', label: SCHEDULE_LABEL.weekly },
  { value: 'on_demand', label: SCHEDULE_LABEL.on_demand },
];

const TABLE_HEAD = [
  { id: 'expand', label: '', width: 56 },
  { id: 'seller', label: 'Seller' },
  { id: 'schedule', label: 'Schedule', width: 130 },
  { id: 'gross', label: 'Gross', align: 'right' as const, width: 120 },
  { id: 'commission', label: 'Commission', align: 'right' as const, width: 130 },
  { id: 'fees', label: 'Platform fee', align: 'right' as const, width: 130 },
  { id: 'net', label: 'Net paid', align: 'right' as const, width: 130 },
  { id: 'orders', label: 'Orders', align: 'right' as const, width: 100 },
  { id: 'settled', label: 'Settled', width: 150 },
  { id: 'status', label: 'Status', width: 110 },
];

/** Only these columns can be ordered by the API. */
const SORTABLE = new Set(['net', 'settled']);

const toSortParam = (orderBy: string, order: 'asc' | 'desc'): PayoutsSort => {
  if (orderBy === 'net') return order === 'asc' ? 'net_asc' : 'net_desc';
  return order === 'asc' ? 'oldest' : 'newest';
};

const fromSortParam = (sort: string | null): { orderBy: string; order: 'asc' | 'desc' } => {
  if (sort === 'oldest') return { orderBy: 'settled', order: 'asc' };
  if (sort === 'net_asc') return { orderBy: 'net', order: 'asc' };
  if (sort === 'net_desc') return { orderBy: 'net', order: 'desc' };
  return { orderBy: 'settled', order: 'desc' };
};

const DEFAULT_LIMIT = 10;

// ----------------------------------------------------------------------

/**
 * Seller settlements: what the platform paid out, and how each figure was
 * reached.
 *
 * A payout credits the seller's wallet — the bank transfer happens later, when
 * they withdraw — so this page answers "what has this seller earned", not "what
 * has left our account". Filters, sort and page live in the URL and are answered
 * by the API.
 */
export const PayoutsPage = () => {
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const table = useTable({ defaultRowsPerPage: DEFAULT_LIMIT });

  const [batchOpen, setBatchOpen] = useState(false);

  const schedule = (searchParams.get('schedule') as PayoutSchedule | null) ?? '';
  const filters: PayoutFilters = {
    status: (searchParams.get('status') as PayoutStatus | null) ?? '',
    sellerId: searchParams.get('sellerId') ?? '',
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

  const query = useMemo<PayoutsListQuery>(
    () => ({
      schedule: schedule || undefined,
      status: filters.status || undefined,
      sellerId: filters.sellerId || undefined,
      sort: toSortParam(orderBy, order),
      page,
      limit,
    }),
    [schedule, filters.status, filters.sellerId, orderBy, order, page, limit],
  );

  const { data, isLoading, isError, error } = usePayoutsList(query);

  // Names the seller chip, so a filtered view never shows a raw id.
  const { data: sellers } = useUsersList({ role: UserRole.SELLER, page: 1, limit: 100 });
  const sellerName = useMemo(
    () => new Map((sellers?.items ?? []).map((s) => [s.id, s.name])),
    [sellers],
  );

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  // Per-schedule totals for the whole filter, so every tab carries its number
  // rather than only the one being viewed.
  const counts = data?.meta.counts;

  const handleFilters = useCallback(
    (patch: Partial<PayoutFilters>) => {
      setParams(
        Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, value ?? null])),
      );
    },
    [setParams],
  );

  const handleResetFilters = useCallback(() => {
    setParams({ status: null, sellerId: null });
  }, [setParams]);

  const handleSort = useCallback(
    (id: string) => {
      if (!SORTABLE.has(id)) return;
      const next = orderBy === id && order === 'desc' ? 'asc' : 'desc';
      setParams({ sort: toSortParam(id, next) });
    },
    [order, orderBy, setParams],
  );

  const canRunBatch = user?.role === UserRole.SUPER_ADMIN;
  const canReset = !!filters.status || !!filters.sellerId;
  const notFound = !isLoading && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Payouts"
        description="What each seller has earned on delivered orders, after commission and fees. The nightly and weekly batches settle automatically; the money reaches a bank account when the seller withdraws it."
        action={
          canRunBatch ? (
            <Button
              variant="contained"
              onClick={() => setBatchOpen(true)}
              startIcon={<Iconify icon="solar:play-bold" />}
            >
              Run batch
            </Button>
          ) : undefined
        }
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Could not load payouts'}
        </Alert>
      )}

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={schedule}
          onChange={(_e, value) => setParams({ schedule: value })}
          sx={{
            px: 2.5,
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          {SCHEDULE_TABS.map((tab) => (
            <Tab
              key={tab.value || 'all'}
              iconPosition="end"
              value={tab.value}
              label={tab.label}
              icon={
                <Label
                  variant={tab.value === schedule ? 'filled' : 'soft'}
                  color={
                    (tab.value === 'daily' && 'info') ||
                    (tab.value === 'weekly' && 'warning') ||
                    (tab.value === 'on_demand' && 'success') ||
                    'default'
                  }
                >
                  {counts ? (counts[tab.value || 'all'] ?? 0) : '-'}
                </Label>
              }
            />
          ))}
        </Tabs>

        <PayoutTableToolbar
          filters={filters}
          statusCounts={data?.meta.statusCounts}
          onFilters={handleFilters}
        />

        {canReset && (
          <PayoutTableFiltersResult
            filters={filters}
            sellerName={sellerName.get(filters.sellerId)}
            totalResults={total}
            onFilters={handleFilters}
            onReset={handleResetFilters}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1200 }}>
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
                  : rows.map((row) => <PayoutTableRow key={row.id} row={row} />)}

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
                        title={canReset || schedule ? 'Nothing matches' : 'No payouts yet'}
                        description={
                          canReset || schedule
                            ? 'Try another schedule tab, or clear the filters.'
                            : 'Settlements appear once a delivered order passes its return window.'
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

      <RunBatchDialog open={batchOpen} onClose={() => setBatchOpen(false)} />
    </>
  );
};
