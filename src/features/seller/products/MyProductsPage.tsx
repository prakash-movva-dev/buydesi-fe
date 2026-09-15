import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';

import { useBoolean } from '@/hooks/use-boolean';

import { varAlpha } from '@/theme/styles';

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
  TableSkeleton,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from '@/components/table';

import { useCategoriesList } from '@/features/categories/api';
import { BulkUploadDialog } from '@/features/products/BulkUploadDialog';
import type {
  ProductStatus,
  ProductsListQuery,
  ProductKind,
  ProductsSort,
  SafeProduct,
  StockState,
} from '@/features/products/types';

import { useDeleteProduct, useMyProducts } from './api';
import { ProductTableRow } from './product-table-row';
import { StockAdjustDialog } from './StockAdjustDialog';
import { ProductTableToolbar, type ProductFilters } from './product-table-toolbar';
import { ProductTableFiltersResult } from './product-table-filters-result';

// ----------------------------------------------------------------------

const STATUS_OPTIONS: Array<{ value: '' | ProductStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'LIVE', label: 'Live' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REJECTED', label: 'Rejected' },
];

const TABLE_HEAD = [
  { id: 'name', label: 'Product' },
  { id: 'category', label: 'Category', width: 180 },
  { id: 'stock', label: 'Stock', width: 120, align: 'right' as const },
  { id: 'price', label: 'Price', width: 160, align: 'right' as const },
  { id: 'status', label: 'Status', width: 120 },
  { id: 'updated', label: 'Last updated', width: 160 },
  { id: '', width: 88 },
];

/** Only these columns can be ordered by the API. */
const SORTABLE = new Set(['name', 'stock', 'price', 'status', 'updated']);

/** Column + direction ⇄ the API's `sort` value. */
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
 * The seller's catalogue. Every filter, the sort and the page live in the URL
 * and are answered by the API — nothing is narrowed or ordered in the browser,
 * so the table is correct however many products the seller has listed.
 */
export const MyProductsPage = () => {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

  const table = useTable({ defaultRowsPerPage: DEFAULT_LIMIT });

  const confirm = useBoolean();

  const bulkUpload = useBoolean();

  // The product whose stock is being adjusted, or null when the dialog is shut.
  const [stockFor, setStockFor] = useState<SafeProduct | null>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  const status = (searchParams.get('status') as ProductStatus | null) ?? '';
  const filters: ProductFilters = {
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    kind: (searchParams.get('kind') as ProductKind | null) ?? '',
    stockState: (searchParams.get('stockState') as StockState | null) ?? '',
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

  const query = useMemo<ProductsListQuery>(
    () => ({
      status: status || undefined,
      category: filters.category || undefined,
      kind: filters.kind || undefined,
      stockState: filters.stockState || undefined,
      q: filters.q || undefined,
      sort: toSortParam(orderBy, order),
      page,
      limit,
    }),
    [
      status,
      filters.category,
      filters.kind,
      filters.stockState,
      filters.q,
      orderBy,
      order,
      page,
      limit,
    ],
  );

  const { data, isLoading, isFetching } = useMyProducts(query);
  const { data: categories } = useCategoriesList({ status: 'active' });

  const remove = useDeleteProduct();

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const counts = data?.meta.counts;

  const categoryName = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c.name])),
    [categories],
  );

  const canReset = !!filters.q || !!filters.category || !!filters.kind || !!filters.stockState;
  const notFound = !isLoading && rows.length === 0;

  const handleFilters = useCallback(
    (patch: Partial<ProductFilters>) => {
      setParams(patch as Record<string, string | null>);
    },
    [setParams],
  );

  const handleResetFilters = useCallback(() => {
    setParams({ q: null, category: null, kind: null, stockState: null });
  }, [setParams]);

  const handleFilterStatus = useCallback(
    (_event: React.SyntheticEvent, newValue: string) => {
      setParams({ status: newValue });
    },
    [setParams],
  );

  const handleSort = useCallback(
    (id: string) => {
      if (!SORTABLE.has(id)) return;
      const nextOrder = orderBy === id && order === 'desc' ? 'asc' : 'desc';
      setParams({ sort: toSortParam(id, nextOrder) });
    },
    [order, orderBy, setParams],
  );

  const handleDeleteRow = useCallback(
    async (id: string) => {
      setDeletingIds((ids) => [...ids, id]);
      try {
        await remove.mutateAsync(id);
        toast.success('Product deleted');
        table.setSelected((ids) => ids.filter((selectedId) => selectedId !== id));
      } catch {
        toast.error('Could not delete that product');
      } finally {
        setDeletingIds((ids) => ids.filter((pending) => pending !== id));
      }
    },
    [remove, table],
  );

  const handleDeleteRows = useCallback(async () => {
    const ids = table.selected;
    setDeletingIds(ids);
    // No bulk endpoint — delete one at a time and report what actually went.
    const results = await Promise.allSettled(ids.map((id) => remove.mutateAsync(id)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed) toast.error(`${ids.length - failed} deleted · ${failed} could not be deleted`);
    else toast.success(`${ids.length} product${ids.length === 1 ? '' : 's'} deleted`);
    setDeletingIds([]);
    table.setSelected([]);
  }, [remove, table]);

  return (
    <>
      <PageHeader
        title="My products"
        description="Manage your catalogue. New products start in PENDING and go LIVE after a Category Admin approves them."
        action={
          <>
            <Button
              variant="outlined"
              onClick={bulkUpload.onTrue}
              startIcon={<Iconify icon="eva:cloud-upload-fill" />}
            >
              Bulk upload
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/seller/products/new')}
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New product
            </Button>
          </>
        }
      />

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={status}
          onChange={handleFilterStatus}
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
                  variant={(tab.value === status && 'filled') || 'soft'}
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

        <ProductTableToolbar
          filters={filters}
          categories={categories ?? []}
          onFilters={handleFilters}
        />

        {canReset && (
          <ProductTableFiltersResult
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
              <Tooltip title="Delete">
                <IconButton color="primary" onClick={confirm.onTrue}>
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              </Tooltip>
            }
          />

          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
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
                        deleting={deletingIds.includes(row.id)}
                        onSelectRow={() => table.onSelectRow(row.id)}
                        onViewRow={() => navigate(`/seller/products/${row.id}`)}
                        onEditRow={() => navigate(`/seller/products/${row.id}/edit`)}
                        onDeleteRow={() => handleDeleteRow(row.id)}
                        onAdjustStock={() => setStockFor(row)}
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
          onPageChange={(_event, newPage) => setParams({ page: String(newPage + 1) })}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={(event) =>
            setParams({ limit: event.target.value, page: null })
          }
        />

        {/* A refetch keeps the current rows on screen — say so rather than blanking them. */}
        {isFetching && !isLoading && (
          <Box
            sx={{
              top: 0,
              right: 16,
              position: 'absolute',
              typography: 'caption',
              color: 'text.disabled',
              lineHeight: '48px',
            }}
          >
            Updating…
          </Box>
        )}
      </Card>

      <BulkUploadDialog open={bulkUpload.value} onClose={bulkUpload.onFalse} forSelf />

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content={
          <>
            Delete <strong>{table.selected.length}</strong> product
            {table.selected.length === 1 ? '' : 's'}? This cannot be undone.
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              void handleDeleteRows();
              confirm.onFalse();
            }}
          >
            Delete
          </Button>
        }
      />

      <StockAdjustDialog
        open={Boolean(stockFor)}
        onClose={() => setStockFor(null)}
        product={stockFor}
      />
    </>
  );
};
