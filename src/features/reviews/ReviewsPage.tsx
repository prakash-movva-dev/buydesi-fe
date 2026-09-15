import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Unstable_Grid2';
import Table from '@mui/material/Table';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';

import { useBoolean } from '@/hooks/use-boolean';
import { useDebounce } from '@/hooks/use-debounce';

import { varAlpha } from '@/theme/styles';
import { useAuth } from '@/lib/auth';
import { ApiError, UserRole } from '@/types/api';

import { Label } from '@/components/label';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/custom-dialog';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from '@/components/table';

import { AnalyticsWidget } from '@/features/dashboard/AnalyticsWidget';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import {
  useDeleteReview,
  useModerateReview,
  useReviewsList,
  useSetReviewHandled,
} from './api';
import { ReviewTableRow } from './review-table-row';
import type { Review, ReviewsListQuery } from './types';

// ----------------------------------------------------------------------

/**
 * The queue's views.
 *
 * "Needs reading" is the one that matters — flagged and not yet dealt with.
 * Everything else is browsing.
 */
type QueueView = 'queue' | 'pending' | 'approved' | 'hidden' | 'all';

const TAB_OPTIONS: Array<{
  value: QueueView;
  label: string;
  color: 'error' | 'warning' | 'success' | 'default' | 'info';
}> = [
  { value: 'queue', label: 'Needs reading', color: 'error' },
  { value: 'pending', label: 'Pending', color: 'warning' },
  { value: 'approved', label: 'Visible', color: 'success' },
  { value: 'hidden', label: 'Hidden', color: 'default' },
  { value: 'all', label: 'All', color: 'info' },
];

/** Each view is just a different slice of the same list query. */
const sliceFor = (view: QueueView): Partial<ReviewsListQuery> => {
  switch (view) {
    case 'queue':
      return { flagged: true, handled: false };
    case 'pending':
      return { status: 'pending' };
    case 'approved':
      return { status: 'approved' };
    case 'hidden':
      return { status: 'hidden' };
    default:
      return {};
  }
};

const TABLE_HEAD = [
  { id: 'rating', label: 'Rating', width: 160 },
  { id: 'text', label: 'What they wrote' },
  { id: 'flags', label: 'Why it is here', width: 200 },
  { id: 'created', label: 'Left', width: 130 },
  { id: 'status', label: 'Status', width: 130 },
  { id: '', width: 150 },
];

const DEFAULT_LIMIT = 20;

/** The API sends `_id`; `id` is only sometimes present. */
const idOf = (r: Review): string => r.id ?? r._id;

// ----------------------------------------------------------------------

export const ReviewsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const table = useTable({ defaultRowsPerPage: DEFAULT_LIMIT });
  const confirmDelete = useBoolean();
  const confirmHide = useBoolean();

  const isCategoryAdmin = user?.role === UserRole.CATEGORY_ADMIN;

  const view = (searchParams.get('view') as QueueView | null) ?? 'queue';
  const targetType = searchParams.get('targetType') ?? '';
  const rating = searchParams.get('rating') ?? '';
  const categoryId = searchParams.get('categoryId') ?? '';
  const q = searchParams.get('q') ?? '';
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
      table.setSelected([]);
    },
    [searchParams, setSearchParams, table],
  );

  const [search, setSearch] = useState(q);
  const debounced = useDebounce(search, 400);
  useEffect(() => {
    if (debounced !== q) setParams({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  useEffect(() => {
    if (q !== search) setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const common = useMemo(
    () => ({
      targetType: (targetType || undefined) as ReviewsListQuery['targetType'],
      rating: rating ? Number(rating) : undefined,
      categoryId: categoryId || undefined,
      q: q || undefined,
    }),
    [targetType, rating, categoryId, q],
  );

  const query = useMemo<ReviewsListQuery>(
    () => ({ ...common, ...sliceFor(view), page, limit }),
    [common, view, page, limit],
  );

  const { data, isLoading, isFetching, isError, error } = useReviewsList(query);

  // Tab counts, under the same filters so the numbers match the table. Each
  // hook is called directly rather than through a helper — a hook behind a
  // function call is a rule violation waiting to bite when the list changes.
  const queueCount = useReviewsList({ ...common, ...sliceFor('queue'), page: 1, limit: 1 });
  const pendingCount = useReviewsList({ ...common, ...sliceFor('pending'), page: 1, limit: 1 });
  const approvedCount = useReviewsList({ ...common, ...sliceFor('approved'), page: 1, limit: 1 });
  const hiddenCount = useReviewsList({ ...common, ...sliceFor('hidden'), page: 1, limit: 1 });
  const allCount = useReviewsList({ ...common, ...sliceFor('all'), page: 1, limit: 1 });

  const countFor = (v: QueueView) =>
    ({
      queue: queueCount,
      pending: pendingCount,
      approved: approvedCount,
      hidden: hiddenCount,
      all: allCount,
    })[v].data?.meta.total ?? 0;

  const moderate = useModerateReview();
  const remove = useDeleteReview();
  const setHandled = useSetReviewHandled();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const canReset = Boolean(targetType || rating || categoryId || q);

  const act = async (id: string, run: () => Promise<unknown>, done: string) => {
    setBusyId(id);
    try {
      await run();
      toast.success(done);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'That did not work');
    } finally {
      setBusyId(null);
    }
  };

  const hideSelected = async () => {
    const ids = [...table.selected];
    let ok = 0;
    for (const id of ids) {
      try {
        await moderate.mutateAsync({ id, status: 'hidden' });
        ok += 1;
      } catch {
        // Keep going — one failure shouldn't strand the rest.
      }
    }
    table.setSelected([]);
    if (ok === ids.length) toast.success(`Hid ${ok} review${ok === 1 ? '' : 's'}`);
    else toast.error(`Hid ${ok} of ${ids.length} — retry the rest`);
  };

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Buyer reviews on products and sellers. Reviews go live immediately and are flagged here when they need reading — a low rating, a flagged word, or a report. Flagging never hides a review; only you can do that."
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Failed to load reviews'}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid xs={12} sm={4}>
          <AnalyticsWidget
            title="Needs reading"
            total={queueCount.isLoading ? null : countFor('queue')}
            color={countFor('queue') > 0 ? 'error' : 'success'}
            icon={<Iconify width={48} icon="solar:danger-triangle-bold-duotone" />}
          />
        </Grid>
        <Grid xs={12} sm={4}>
          <AnalyticsWidget
            title="Hidden from buyers"
            total={hiddenCount.isLoading ? null : countFor('hidden')}
            color="warning"
            icon={<Iconify width={48} icon="solar:eye-closed-bold-duotone" />}
          />
        </Grid>
        <Grid xs={12} sm={4}>
          <AnalyticsWidget
            title="Live reviews"
            total={approvedCount.isLoading ? null : countFor('approved')}
            color="success"
            icon={<Iconify width={48} icon="solar:star-bold-duotone" />}
          />
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={view}
          onChange={(_e, value) => setParams({ view: value })}
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
                <Label variant={tab.value === view ? 'filled' : 'soft'} color={tab.color}>
                  {countFor(tab.value)}
                </Label>
              }
            />
          ))}
        </Tabs>

        <Stack
          spacing={2}
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{ p: 2.5 }}
        >
          <TextField
            select
            label="About"
            value={targetType}
            onChange={(e) => setParams({ targetType: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: 1, md: 160 } }}
          >
            <MenuItem value="">Anything</MenuItem>
            <MenuItem value="product">Products</MenuItem>
            <MenuItem value="seller">Sellers</MenuItem>
          </TextField>

          <TextField
            select
            label="Stars"
            value={rating}
            onChange={(e) => setParams({ rating: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: 1, md: 140 } }}
          >
            <MenuItem value="">Any rating</MenuItem>
            {[1, 2, 3, 4, 5].map((n) => (
              <MenuItem key={n} value={String(n)}>
                {n} star{n === 1 ? '' : 's'}
              </MenuItem>
            ))}
          </TextField>

          {!isCategoryAdmin && (
            <Box sx={{ width: { xs: 1, md: 220 } }}>
              <CategoryPicker
                label="Category"
                value={categoryId || null}
                onChange={(id) => setParams({ categoryId: id ?? '' })}
                placeholder="Any category"
              />
            </Box>
          )}

          <TextField
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the review text..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>

        {canReset && (
          <FiltersResult
            totalResults={total}
            onReset={() =>
              setParams({ targetType: null, rating: null, categoryId: null, q: null })
            }
            sx={{ p: 2.5, pt: 0 }}
          >
            <FiltersBlock label="About:" isShow={!!targetType}>
              <Chip
                {...chipProps}
                label={targetType === 'product' ? 'Products' : 'Sellers'}
                onDelete={() => setParams({ targetType: null })}
              />
            </FiltersBlock>

            <FiltersBlock label="Stars:" isShow={!!rating}>
              <Chip {...chipProps} label={`${rating}★`} onDelete={() => setParams({ rating: null })} />
            </FiltersBlock>

            <FiltersBlock label="Category:" isShow={!!categoryId}>
              <Chip
                {...chipProps}
                label="Selected category"
                onDelete={() => setParams({ categoryId: null })}
              />
            </FiltersBlock>

            <FiltersBlock label="Keyword:" isShow={!!q}>
              <Chip {...chipProps} label={q} onDelete={() => setParams({ q: null })} />
            </FiltersBlock>
          </FiltersResult>
        )}

        <Box sx={{ position: 'relative' }}>
          <TableSelectedAction
            dense={table.dense}
            numSelected={table.selected.length}
            rowCount={rows.length}
            onSelectAllRows={(checked) =>
              table.onSelectAllRows(
                checked,
                rows.map(idOf),
              )
            }
            action={
              <Tooltip title="Hide from buyers">
                <IconButton color="primary" onClick={confirmHide.onTrue}>
                  <Iconify icon="solar:eye-closed-bold" />
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
                headLabel={TABLE_HEAD}
                rowCount={rows.length}
                numSelected={table.selected.length}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(
                    checked,
                    rows.map(idOf),
                  )
                }
              />

              <TableBody>
                {rows.map((row) => (
                  <ReviewTableRow
                    key={idOf(row)}
                    row={row}
                    selected={table.selected.includes(idOf(row))}
                    busy={busyId === idOf(row)}
                    onSelectRow={() => table.onSelectRow(idOf(row))}
                    onApprove={() =>
                      void act(
                        idOf(row),
                        () => moderate.mutateAsync({ id: idOf(row), status: 'approved' }),
                        'Review is visible again',
                      )
                    }
                    onHide={() =>
                      void act(
                        idOf(row),
                        () => moderate.mutateAsync({ id: idOf(row), status: 'hidden' }),
                        'Review hidden from buyers',
                      )
                    }
                    onToggleHandled={() =>
                      void act(
                        idOf(row),
                        () =>
                          setHandled.mutateAsync({
                            id: idOf(row),
                            handled: !row.handledAt,
                          }),
                        row.handledAt ? 'Reopened' : 'Marked as dealt with',
                      )
                    }
                    onDelete={() => {
                      setPendingDeleteId(idOf(row));
                      confirmDelete.onTrue();
                    }}
                    onViewTarget={() =>
                      navigate(
                        row.targetType === 'product'
                          ? `/admin/products/${row.targetId}`
                          : `/admin/sellers?q=${row.targetId}`,
                      )
                    }
                  />
                ))}

                <TableEmptyRows
                  height={table.dense ? 56 : 88}
                  emptyRows={emptyRows(page - 1, limit, total)}
                />

                <TableNoData notFound={!isLoading && rows.length === 0} />
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
        open={confirmHide.value}
        onClose={confirmHide.onFalse}
        title="Hide from buyers"
        content={
          <>
            Hide <strong>{table.selected.length}</strong> review
            {table.selected.length === 1 ? '' : 's'}? They stop showing on the storefront and no
            longer count towards the seller&apos;s rating. You can put them back at any time.
          </>
        }
        action={
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              void hideSelected();
              confirmHide.onFalse();
            }}
          >
            Hide
          </Button>
        }
      />

      <ConfirmDialog
        open={confirmDelete.value}
        onClose={confirmDelete.onFalse}
        title="Delete permanently"
        content="This removes the review and its record for good. If you only want it off the storefront, hide it instead."
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (pendingDeleteId) {
                void act(
                  pendingDeleteId,
                  () => remove.mutateAsync(pendingDeleteId),
                  'Review deleted',
                );
              }
              setPendingDeleteId(null);
              confirmDelete.onFalse();
            }}
          >
            Delete
          </Button>
        }
      />
    </>
  );
};
