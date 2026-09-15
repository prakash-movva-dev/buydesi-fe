import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';

import { useBoolean } from '@/hooks/use-boolean';

import { varAlpha } from '@/theme/styles';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableSkeleton,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from '@/components/table';

import { useCategoriesList } from '@/features/categories/api';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import { useProductsList, useSetProductStatus } from './api';
import { BulkUploadDialog } from './BulkUploadDialog';
import { ProductTableRow } from './product-table-row';
import { StatusReviewDialog, type StatusAction } from './StatusReviewDialog';
import { AdminProductTableToolbar, type AdminProductFilters } from './product-table-toolbar';
import { AdminProductTableFiltersResult } from './product-table-filters-result';
import type {
  ProductKind,
  ProductStatus,
  ProductsListQuery,
  ProductsSort,
} from './types';

// ----------------------------------------------------------------------

const STATUS_OPTIONS: Array<{ value: '' | ProductStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'LIVE', label: 'Live' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REJECTED', label: 'Rejected' },
];

const TABLE_HEAD = [
  { id: 'name', label: 'Product' },
  { id: 'category', label: 'Category', width: 160 },
  { id: 'stock', label: 'Stock', width: 110, align: 'right' as const },
  { id: 'price', label: 'Price', width: 150, align: 'right' as const },
  { id: 'updated', label: 'Last updated', width: 150 },
  { id: 'status', label: 'Status', width: 120 },
  { id: '', width: 100 },
];

/** Only these columns can be ordered by the API. */
const SORTABLE = new Set(['name', 'stock', 'price', 'status', 'updated']);

const toSortParam = (orderBy: string, order: 'asc' | 'desc'): ProductsSort => {
  if (orderBy === 'updated') return order === 'asc' ? 'updated_asc' : 'updated_desc';
  return `${orderBy}_${order}` as ProductsSort;
};

const fromSortParam = (sort: string | null): { orderBy: string; order: 'asc' | 'desc' } => {
  if (!sort || sort === 'newest') return { orderBy: 'updated', order: 'desc' };
  const [column, direction] = sort.split('_');
  return { orderBy: column, order: direction === 'asc' ? 'asc' : 'desc' };
};

const DEFAULT_LIMIT = 10;

// ----------------------------------------------------------------------

/**
 * The whole catalogue, across every seller. Filters, sort and page live in the
 * URL and are answered by the API, so the table stays correct at any size.
 */
export const ProductsListPage = () => {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

  const table = useTable({ defaultRowsPerPage: DEFAULT_LIMIT });

  const bulkUpload = useBoolean();

  const setStatusMut = useSetProductStatus();

  const [bulkAction, setBulkAction] = useState<StatusAction | null>(null);
  const [singleAction, setSingleAction] = useState<{ id: string; action: StatusAction } | null>(
    null,
  );

  const status = (searchParams.get('status') as ProductStatus | null) ?? '';
  const filters: AdminProductFilters = {
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    kind: (searchParams.get('kind') as ProductKind | null) ?? '',
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
      status: status || undefined,
      category: filters.category || undefined,
      kind: filters.kind || undefined,
      q: filters.q || undefined,
      sort: toSortParam(orderBy, order),
      page,
      limit,
    }),
    [status, filters.category, filters.kind, filters.q, orderBy, order, page, limit],
  );

  const { data, isLoading, isError, error } = useProductsList(query);
  const { data: categories } = useCategoriesList();

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  // Per-status totals for the whole filter, so every tab carries its number
  // rather than only the one being viewed.
  const counts = data?.meta.counts;

  const categoryName = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c.name])),
    [categories],
  );

  const handleFilters = useCallback(
    (patch: Partial<AdminProductFilters>) => {
      setParams(
        Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, value ?? null])),
      );
    },
    [setParams],
  );

  const handleResetFilters = useCallback(() => {
    setParams({ q: null, category: null, kind: null });
  }, [setParams]);

  const handleSort = useCallback(
    (id: string) => {
      if (!SORTABLE.has(id)) return;
      const next = orderBy === id && order === 'desc' ? 'asc' : 'desc';
      setParams({ sort: toSortParam(id, next) });
    },
    [order, orderBy, setParams],
  );

  const targetStatus = (action: StatusAction): ProductStatus =>
    action === 'approve' ? 'LIVE' : action === 'reject' ? 'REJECTED' : 'SUSPENDED';

  const submitBulk = async (notes: string | undefined) => {
    if (!bulkAction) return;
    // Run sequentially — there is no bulk-status endpoint, and parallel writes
    // against the same indexes can deadlock under load.
    for (const id of table.selected) {
      await setStatusMut.mutateAsync({ id, status: targetStatus(bulkAction), notes });
    }
    table.setSelected([]);
  };

  const submitSingle = async (notes: string | undefined) => {
    if (!singleAction) return;
    await setStatusMut.mutateAsync({
      id: singleAction.id,
      status: targetStatus(singleAction.action),
      notes,
    });
  };

  const canReset = !!filters.q || !!filters.category || !!filters.kind;
  const notFound = !isLoading && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Products"
        description="Every listing across all sellers — review what is waiting and act on it."
        action={
          <Button
            variant="outlined"
            onClick={bulkUpload.onTrue}
            startIcon={<Iconify icon="solar:upload-bold" />}
          >
            Bulk upload
          </Button>
        }
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Could not load products'}
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
                    (tab.value === 'LIVE' && 'success') ||
                    (tab.value === 'PENDING' && 'warning') ||
                    (tab.value === 'REJECTED' && 'error') ||
                    'default'
                  }
                >
                  {counts ? (counts[tab.value || 'all'] ?? 0) : '-'}
                </Label>
              }
            />
          ))}
        </Tabs>

        <AdminProductTableToolbar
          filters={filters}
          categories={categories ?? []}
          onFilters={handleFilters}
        />

        {canReset && (
          <AdminProductTableFiltersResult
            filters={filters}
            categoryName={categoryName.get(filters.category)}
            totalResults={total}
            onFilters={handleFilters}
            onReset={handleResetFilters}
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
              <>
                <Tooltip title="Approve">
                  <IconButton color="success" onClick={() => setBulkAction('approve')}>
                    <Iconify icon="solar:check-circle-bold" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Suspend">
                  <IconButton color="warning" onClick={() => setBulkAction('suspend')}>
                    <Iconify icon="solar:pause-circle-bold" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reject">
                  <IconButton color="error" onClick={() => setBulkAction('reject')}>
                    <Iconify icon="solar:close-circle-bold" />
                  </IconButton>
                </Tooltip>
              </>
            }
          />

          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1080 }}>
              <TableHeadCustom
                order={order}
                orderBy={orderBy}
                headLabel={TABLE_HEAD}
                rowCount={rows.length}
                numSelected={table.selected.length}
                onSort={handleSort}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(
                    checked,
                    rows.map((row) => row.id),
                  )
                }
              />

              <TableBody>
                {isLoading
                  ? Array.from({ length: Math.min(limit, 5) }).map((_, index) => (
                      <TableSkeleton key={index} sx={{ height: table.dense ? 56 : 76 }} />
                    ))
                  : rows.map((row) => (
                      <ProductTableRow
                        key={row.id}
                        row={row}
                        categoryName={categoryName.get(row.categoryId)}
                        selected={table.selected.includes(row.id)}
                        onSelectRow={() => table.onSelectRow(row.id)}
                        onViewRow={() => navigate(`/admin/products/${row.id}`)}
                        onApprove={() => setSingleAction({ id: row.id, action: 'approve' })}
                        onReject={() => setSingleAction({ id: row.id, action: 'reject' })}
                        onSuspend={() => setSingleAction({ id: row.id, action: 'suspend' })}
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

      <StatusReviewDialog
        open={bulkAction !== null}
        action={bulkAction}
        count={table.selected.length}
        onClose={() => setBulkAction(null)}
        onSubmit={submitBulk}
      />

      <StatusReviewDialog
        open={singleAction !== null}
        action={singleAction?.action ?? null}
        count={1}
        onClose={() => setSingleAction(null)}
        onSubmit={submitSingle}
      />

      <BulkUploadDialog open={bulkUpload.value} onClose={bulkUpload.onFalse} />
    </>
  );
};
