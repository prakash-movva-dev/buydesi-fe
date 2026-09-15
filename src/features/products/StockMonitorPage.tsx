import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Unstable_Grid2';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';

import { useBoolean } from '@/hooks/use-boolean';

import { varAlpha } from '@/theme/styles';
import { useAuth } from '@/lib/auth';
import { ApiError, UserRole } from '@/types/api';

import { Label } from '@/components/label';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/custom-dialog';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from '@/components/table';

import { useCategoriesList } from '@/features/categories/api';
import { AnalyticsWidget } from '@/features/dashboard/AnalyticsWidget';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import { useBatchRestockAlert, useProductsList, useSendRestockAlert } from './api';
import { StockTableRow } from './stock-table-row';
import { StockTableToolbar, type StockFilters } from './stock-table-toolbar';
import { StockTableFiltersResult } from './stock-table-filters-result';
import type { ProductsListQuery, StockState } from './types';

// ----------------------------------------------------------------------

const TAB_OPTIONS: Array<{ value: '' | StockState; label: string; color: 'info' | 'warning' | 'error' }> = [
  { value: '', label: 'All live stock', color: 'info' },
  { value: 'low', label: 'Running low', color: 'warning' },
  { value: 'out', label: 'Out of stock', color: 'error' },
];

const TABLE_HEAD = [
  { id: 'name', label: 'Product' },
  { id: 'seller', label: 'Seller', width: 200 },
  { id: 'stock', label: 'On hand', width: 180 },
  { id: 'price', label: 'Price', width: 120, align: 'right' as const },
  { id: 'updated', label: 'Last updated', width: 150 },
  { id: 'level', label: 'Level', width: 130 },
  { id: '', width: 110 },
];

const SORTABLE = new Set(['stock', 'price', 'name']);

const DEFAULT_LIMIT = 20;

const toSortParam = (orderBy: string, order: 'asc' | 'desc') => {
  if (orderBy === 'price') return order === 'asc' ? 'price_asc' : 'price_desc';
  if (orderBy === 'name') return order === 'asc' ? 'name_asc' : 'name_desc';
  return order === 'asc' ? 'stock_asc' : 'stock_desc';
};

const fromSortParam = (value: string | null): { orderBy: string; order: 'asc' | 'desc' } => {
  switch (value) {
    case 'price_asc':
      return { orderBy: 'price', order: 'asc' };
    case 'price_desc':
      return { orderBy: 'price', order: 'desc' };
    case 'name_asc':
      return { orderBy: 'name', order: 'asc' };
    case 'name_desc':
      return { orderBy: 'name', order: 'desc' };
    case 'stock_desc':
      return { orderBy: 'stock', order: 'desc' };
    default:
      // Emptiest first is the whole point of the page.
      return { orderBy: 'stock', order: 'asc' };
  }
};

// ----------------------------------------------------------------------

export const StockMonitorPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const table = useTable({ defaultRowsPerPage: DEFAULT_LIMIT });
  const confirmBatch = useBoolean();

  const canScopeCluster =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.SUB_SUPER_ADMIN ||
    user?.role === UserRole.CLUSTER_ADMIN;

  const stockState = (searchParams.get('stockState') as StockState | null) ?? '';
  const filters: StockFilters = {
    category: searchParams.get('category') ?? '',
    cluster: canScopeCluster ? (searchParams.get('cluster') ?? '') : '',
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
      table.setSelected([]);
    },
    [searchParams, setSearchParams, table],
  );

  const query = useMemo<ProductsListQuery>(
    () => ({
      status: 'LIVE',
      stockState: stockState || undefined,
      category: filters.category || undefined,
      cluster: filters.cluster || undefined,
      sellerId: filters.sellerId || undefined,
      sort: toSortParam(orderBy, order) as ProductsListQuery['sort'],
      page,
      limit,
    }),
    [stockState, filters.category, filters.cluster, filters.sellerId, orderBy, order, page, limit],
  );

  const { data, isLoading, isFetching, isError, error } = useProductsList(query);

  // Counts for the tabs, under the same seller/category/cluster scope so the
  // numbers always describe what the table is about to show.
  const scope = {
    status: 'LIVE' as const,
    category: filters.category || undefined,
    cluster: filters.cluster || undefined,
    sellerId: filters.sellerId || undefined,
    page: 1,
    limit: 1,
  };
  const allCount = useProductsList(scope);
  const lowCount = useProductsList({ ...scope, stockState: 'low' });
  const outCount = useProductsList({ ...scope, stockState: 'out' });

  const { data: categories } = useCategoriesList();
  const categoryName = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c.name])),
    [categories],
  );

  const alertOne = useSendRestockAlert();
  const alertBatch = useBatchRestockAlert();
  const [alertingId, setAlertingId] = useState<string | null>(null);

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const notFound = !isLoading && rows.length === 0;

  const countFor = (value: '' | StockState) => {
    const q = value === 'low' ? lowCount : value === 'out' ? outCount : allCount;
    return q.data?.meta.total ?? 0;
  };

  const canReset = Boolean(filters.category || filters.cluster || filters.sellerId);

  const sendOne = async (id: string, name: string) => {
    setAlertingId(id);
    try {
      await alertOne.mutateAsync(id);
      toast.success(`Asked the seller to restock ${name}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not send the alert');
    } finally {
      setAlertingId(null);
    }
  };

  const sendBatch = async () => {
    try {
      const res = await alertBatch.mutateAsync({
        categoryId: filters.category || undefined,
        clusterId: filters.cluster || undefined,
      });
      toast.success(
        res.notified > 0
          ? `Alerted ${res.notified} seller${res.notified === 1 ? '' : 's'}`
          : 'Nothing needed an alert',
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not send the alerts');
    }
  };

  const sendSelected = async () => {
    const chosen = rows.filter((row) => table.selected.includes(row.id));
    let done = 0;
    for (const row of chosen) {
      try {
        await alertOne.mutateAsync(row.id);
        done += 1;
      } catch {
        // One failure shouldn't strand the rest of the selection.
      }
    }
    table.setSelected([]);
    if (done === chosen.length) toast.success(`Alerted ${done} seller${done === 1 ? '' : 's'}`);
    else toast.error(`Alerted ${done} of ${chosen.length} — retry the rest`);
  };

  const needsAttention = countFor('low') + countFor('out');

  return (
    <>
      <PageHeader
        title="Stock monitor"
        description="Live products running low or already sold out. Sellers are told automatically when stock hits their threshold — use this to chase what is still sitting empty."
        action={
          <Button
            variant="contained"
            onClick={confirmBatch.onTrue}
            disabled={alertBatch.isPending || needsAttention === 0}
            startIcon={<Iconify icon="solar:bell-bing-bold" />}
          >
            Alert everyone in view
          </Button>
        }
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Failed to load stock'}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid xs={12} sm={4}>
          <AnalyticsWidget
            title="Out of stock"
            total={outCount.isLoading ? null : countFor('out')}
            color="error"
            icon={<Iconify width={48} icon="solar:box-minimalistic-bold-duotone" />}
          />
        </Grid>
        <Grid xs={12} sm={4}>
          <AnalyticsWidget
            title="Running low"
            total={lowCount.isLoading ? null : countFor('low')}
            color="warning"
            icon={<Iconify width={48} icon="solar:graph-down-bold-duotone" />}
          />
        </Grid>
        <Grid xs={12} sm={4}>
          <AnalyticsWidget
            title="Live products"
            total={allCount.isLoading ? null : countFor('')}
            color="success"
            icon={<Iconify width={48} icon="solar:box-bold-duotone" />}
          />
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={stockState}
          onChange={(_e, value) => setParams({ stockState: value })}
          sx={{
            px: 2.5,
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          {TAB_OPTIONS.map((tab) => (
            <Tab
              key={tab.value}
              iconPosition="end"
              value={tab.value}
              label={tab.label}
              icon={
                <Label
                  variant={tab.value === stockState ? 'filled' : 'soft'}
                  color={tab.color}
                >
                  {countFor(tab.value)}
                </Label>
              }
            />
          ))}
        </Tabs>

        <StockTableToolbar
          filters={filters}
          canScopeCluster={canScopeCluster}
          onFilters={(patch) =>
            setParams(
              Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, (v as string) || null])),
            )
          }
        />

        {canReset && (
          <StockTableFiltersResult
            filters={filters}
            categoryName={filters.category ? categoryName.get(filters.category) : undefined}
            onFilters={(patch) =>
              setParams(
                Object.fromEntries(
                  Object.entries(patch).map(([k, v]) => [k, (v as string) || null]),
                ),
              )
            }
            onReset={() => setParams({ category: null, cluster: null, sellerId: null })}
            totalResults={total}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        <Box sx={{ position: 'relative' }}>
          <TableSelectedAction
            dense={table.dense}
            numSelected={table.selected.length}
            rowCount={rows.length}
            onSelectAllRows={(checked) =>
              table.onSelectAllRows(
                checked,
                rows.map((row) => row.id),
              )
            }
            action={
              <Tooltip title="Ask these sellers to restock">
                <IconButton color="primary" onClick={() => void sendSelected()}>
                  <Iconify icon="solar:bell-bing-bold" />
                </IconButton>
              </Tooltip>
            }
          />

          {isFetching && !isLoading && (
            <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9 }} />
          )}

          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1100 }}>
              <TableHeadCustom
                order={order}
                orderBy={orderBy}
                headLabel={TABLE_HEAD}
                rowCount={rows.length}
                numSelected={table.selected.length}
                onSort={(id) => {
                  if (!SORTABLE.has(id)) return;
                  const isAsc = orderBy === id && order === 'asc';
                  setParams({ sort: toSortParam(id, isAsc ? 'desc' : 'asc') });
                }}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(
                    checked,
                    rows.map((row) => row.id),
                  )
                }
              />

              <TableBody>
                {rows.map((row) => (
                  <StockTableRow
                    key={row.id}
                    row={row}
                    selected={table.selected.includes(row.id)}
                    categoryName={categoryName.get(row.categoryId)}
                    alerting={alertingId === row.id}
                    onSelectRow={() => table.onSelectRow(row.id)}
                    onViewRow={() => navigate(`/admin/products/${row.id}`)}
                    onAlert={() => void sendOne(row.id, row.name)}
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
          rowsPerPageOptions={[10, 20, 50]}
          onPageChange={(_e, next) => setParams({ page: String(next + 1) })}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={(e) => setParams({ limit: e.target.value, page: '1' })}
        />
      </Card>

      <ConfirmDialog
        open={confirmBatch.value}
        onClose={confirmBatch.onFalse}
        title="Alert everyone in view"
        content={
          <>
            Send a restock request to every seller with a low or empty product
            {filters.category || filters.cluster ? ' in the current filter' : ''}. That is{' '}
            <strong>{needsAttention}</strong> product
            {needsAttention === 1 ? '' : 's'} right now.
          </>
        }
        action={
          <Button
            variant="contained"
            onClick={() => {
              void sendBatch();
              confirmBatch.onFalse();
            }}
          >
            Send alerts
          </Button>
        }
      />
    </>
  );
};
