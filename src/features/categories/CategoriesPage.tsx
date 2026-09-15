import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
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
import { UserRole } from '@/types/api';

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

import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import {
  useCategoriesList,
  useCategoriesPage,
  useReorderCategories,
  useUpdateCategory,
  type CategoriesSort,
} from './api';
import { CategoryFormDialog } from './CategoryFormDialog';
import { CategoryTableRow } from './category-table-row';
import { CategoryTableToolbar, type CategoryFilters } from './category-table-toolbar';
import { CategoryTableFiltersResult } from './category-table-filters-result';
import type { CategoryStatus, SafeCategory } from './types';

// ----------------------------------------------------------------------

const STATUS_OPTIONS: Array<{ value: '' | CategoryStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const TABLE_HEAD = [
  { id: 'name', label: 'Category' },
  { id: 'commission', label: 'Default commission', width: 180, align: 'right' as const },
  { id: 'admin', label: 'Category admin', width: 160 },
  { id: 'created', label: 'Created', width: 140 },
  { id: 'status', label: 'Status', width: 120 },
  { id: '', width: 140 },
];

/** Only these columns can be ordered by the API. */
const SORTABLE = new Set(['name', 'commission', 'created']);

const DEFAULT_LIMIT = 10;

/** Table head id + direction → the API's sort token. */
const toSortParam = (orderBy: string, order: 'asc' | 'desc'): CategoriesSort => {
  if (orderBy === 'name') return order === 'asc' ? 'name_asc' : 'name_desc';
  if (orderBy === 'commission') return order === 'asc' ? 'commission_asc' : 'commission_desc';
  if (orderBy === 'created') return 'newest';
  return 'display';
};

const fromSortParam = (value: string | null): { orderBy: string; order: 'asc' | 'desc' } => {
  switch (value) {
    case 'name_asc':
      return { orderBy: 'name', order: 'asc' };
    case 'name_desc':
      return { orderBy: 'name', order: 'desc' };
    case 'commission_asc':
      return { orderBy: 'commission', order: 'asc' };
    case 'commission_desc':
      return { orderBy: 'commission', order: 'desc' };
    case 'newest':
      return { orderBy: 'created', order: 'desc' };
    default:
      return { orderBy: 'display', order: 'asc' };
  }
};

// ----------------------------------------------------------------------

export const CategoriesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const table = useTable({ defaultRowsPerPage: DEFAULT_LIMIT });
  const confirm = useBoolean();

  const status = (searchParams.get('status') as CategoryStatus | null) ?? '';
  const filters: CategoryFilters = { q: searchParams.get('q') ?? '', status };
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

  const sortParam = toSortParam(orderBy, order);

  const { data, isLoading, isFetching, isError, error } = useCategoriesPage({
    status: status || undefined,
    q: filters.q || undefined,
    sort: sortParam,
    page,
    limit,
  });

  // The whole taxonomy, for the tab counts and the reorder maths. It is the
  // same query the pickers use, so it is almost always already cached.
  const all = useCategoriesList();
  const ordered = useMemo(
    () =>
      [...(all.data ?? [])].sort(
        (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
      ),
    [all.data],
  );

  const reorderMut = useReorderCategories();
  const updateMut = useUpdateCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SafeCategory | null>(null);

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;

  const isSuper = user?.role === UserRole.SUPER_ADMIN;
  const canCreate = isSuper || user?.role === UserRole.SUB_SUPER_ADMIN;
  const canReorderRole =
    isSuper || user?.role === UserRole.SUB_SUPER_ADMIN || user?.role === UserRole.CATEGORY_ADMIN;

  // Moving a row only means anything in display order over the unfiltered
  // list — in a filtered or name-sorted view, "up" has no stable meaning.
  const canReorder = canReorderRole && sortParam === 'display' && !filters.q && !status;

  const canReset = Boolean(filters.q || status);
  const notFound = !isLoading && rows.length === 0;

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (cat: SafeCategory) => {
    setEditing(cat);
    setDialogOpen(true);
  };

  /**
   * Swaps a row with its neighbour and renumbers the whole taxonomy, so a move
   * works across a page boundary — the maths runs on the full list, not on the
   * page that happens to be visible.
   */
  const move = (category: SafeCategory, direction: -1 | 1) => {
    const index = ordered.findIndex((c) => c.id === category.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;

    const next = [...ordered];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    reorderMut.mutate(
      next.map((cat, i) => ({ id: cat.id, displayOrder: i })),
      {
        onSuccess: () => toast.success(`Moved ${category.name}`),
        onError: () => toast.error('Could not reorder'),
      },
    );
  };

  const deactivateSelected = async () => {
    const ids = [...table.selected];
    let done = 0;
    for (const id of ids) {
      try {
        await updateMut.mutateAsync({ id, patch: { status: 'inactive' } });
        done += 1;
      } catch {
        // Keep going — one failure shouldn't strand the rest.
      }
    }
    table.setSelected([]);
    if (done === ids.length) toast.success(`Deactivated ${done} categor${done === 1 ? 'y' : 'ies'}`);
    else toast.error(`Deactivated ${done} of ${ids.length} — retry the rest`);
  };

  const countFor = (value: '' | CategoryStatus) =>
    value === '' ? ordered.length : ordered.filter((c) => c.status === value).length;

  return (
    <>
      <PageHeader
        title="Categories"
        description="Catalogue taxonomy. Each category sets a default commission rate its products inherit unless overridden."
        action={
          canCreate ? (
            <Button
              variant="contained"
              onClick={openCreate}
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New category
            </Button>
          ) : undefined
        }
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Failed to load categories'}
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
              key={tab.value}
              iconPosition="end"
              value={tab.value}
              label={tab.label}
              icon={
                <Label
                  variant={tab.value === status ? 'filled' : 'soft'}
                  color={
                    (tab.value === 'active' && 'success') ||
                    (tab.value === 'inactive' && 'default') ||
                    'info'
                  }
                >
                  {countFor(tab.value)}
                </Label>
              }
            />
          ))}
        </Tabs>

        <CategoryTableToolbar
          filters={filters}
          onFilters={(patch) =>
            setParams(
              Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, (v as string) || null])),
            )
          }
        />

        {canReset && (
          <CategoryTableFiltersResult
            filters={filters}
            onFilters={(patch) =>
              setParams(
                Object.fromEntries(
                  Object.entries(patch).map(([k, v]) => [k, (v as string) || null]),
                ),
              )
            }
            onReset={() => setParams({ q: null, status: null })}
            totalResults={total}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        {canReorderRole && !canReorder && (
          <Alert severity="info" sx={{ mx: 2.5, mb: 2.5 }}>
            Reordering is available on the All tab in display order, with no search — elsewhere
            &ldquo;move up&rdquo; has no fixed meaning.
          </Alert>
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
              <Tooltip title="Deactivate">
                <IconButton color="primary" onClick={confirm.onTrue}>
                  <Iconify icon="solar:eye-closed-bold" />
                </IconButton>
              </Tooltip>
            }
          />

          {isFetching && !isLoading && (
            <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9 }} />
          )}

          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
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
                {rows.map((row) => {
                  const globalIndex = ordered.findIndex((c) => c.id === row.id);
                  return (
                    <CategoryTableRow
                      key={row.id}
                      row={row}
                      selected={table.selected.includes(row.id)}
                      canReorder={canReorder}
                      canMoveUp={globalIndex > 0}
                      canMoveDown={globalIndex >= 0 && globalIndex < ordered.length - 1}
                      reordering={reorderMut.isPending}
                      onSelectRow={() => table.onSelectRow(row.id)}
                      onEditRow={() => openEdit(row)}
                      onViewProducts={() => navigate(`/admin/products?category=${row.id}`)}
                      onMove={(direction) => move(row, direction)}
                    />
                  );
                })}

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

      <CategoryFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
      />

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Deactivate"
        content={
          <>
            Deactivate <strong>{table.selected.length}</strong> categor
            {table.selected.length === 1 ? 'y' : 'ies'}? Their products stay listed, but the
            categories stop appearing to buyers. You can reactivate them at any time.
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              void deactivateSelected();
              confirm.onFalse();
            }}
          >
            Deactivate
          </Button>
        }
      />
    </>
  );
};
