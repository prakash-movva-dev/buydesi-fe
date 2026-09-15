import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import TableBody from '@mui/material/TableBody';

import { varAlpha } from '@/theme/styles';

import { Label } from '@/components/label';
import { Scrollbar } from '@/components/scrollbar';
import { EmptyContent } from '@/components/empty-content';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  useTable,
  emptyRows,
  TableSkeleton,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from '@/components/table';

import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import { useReviewsList, useSetReviewHandled } from '@/features/reviews/api';
import type { Review, ReviewsListQuery, ReviewsSort } from '@/features/reviews/types';

import { ReviewTableRow } from './review-table-row';
import { QualityTicketDialog } from './QualityTicketDialog';
import { ReviewTableToolbar, type ReviewFilters } from './review-table-toolbar';
import { ReviewTableFiltersResult } from './review-table-filters-result';

// ----------------------------------------------------------------------

/**
 * 'flagged' is the queue this page is for — one and two stars together. The
 * single-star tabs are there for when someone wants to look wider, and 'all'
 * for the whole review stream.
 */
type RatingTab = 'flagged' | '1' | '2' | '3' | '4' | '5' | 'all';

const RATING_TABS: Array<{ value: RatingTab; label: string }> = [
  { value: 'flagged', label: 'Flagged' },
  { value: '1', label: '1 star' },
  { value: '2', label: '2 stars' },
  { value: '3', label: '3 stars' },
  { value: '4', label: '4 stars' },
  { value: '5', label: '5 stars' },
  { value: 'all', label: 'All' },
];

const TABLE_HEAD = [
  { id: 'target', label: 'Review of' },
  { id: 'rating', label: 'Rating', width: 140 },
  { id: 'comment', label: 'What the buyer wrote' },
  { id: 'order', label: 'Order', width: 140 },
  { id: 'created', label: 'Left', width: 140 },
  { id: 'triage', label: 'Triage', width: 130 },
  { id: '', width: 108 },
];

/** Only these columns can be ordered by the API. */
const SORTABLE = new Set(['rating', 'created']);

const toSortParam = (orderBy: string, order: 'asc' | 'desc'): ReviewsSort => {
  if (orderBy === 'rating') return order === 'asc' ? 'rating_asc' : 'rating_desc';
  return order === 'asc' ? 'oldest' : 'newest';
};

const fromSortParam = (sort: string | null): { orderBy: string; order: 'asc' | 'desc' } => {
  if (sort === 'oldest') return { orderBy: 'created', order: 'asc' };
  if (sort === 'rating_asc') return { orderBy: 'rating', order: 'asc' };
  if (sort === 'rating_desc') return { orderBy: 'rating', order: 'desc' };
  return { orderBy: 'created', order: 'desc' };
};

/** Turns a tab into the rating part of the API query. */
const ratingQuery = (tab: RatingTab): Pick<ReviewsListQuery, 'rating' | 'maxRating'> => {
  if (tab === 'flagged') return { maxRating: 2 };
  if (tab === 'all') return {};
  return { rating: Number(tab) };
};

/** The tab's own number, read off the per-star counts the API returns. */
const tabCount = (tab: RatingTab, counts?: Record<string, number>): string => {
  if (!counts) return '-';
  if (tab === 'all') return String(counts.all ?? 0);
  if (tab === 'flagged') return String((counts['1'] ?? 0) + (counts['2'] ?? 0));
  return String(counts[tab] ?? 0);
};

const DEFAULT_LIMIT = 10;

// ----------------------------------------------------------------------

/**
 * The quality queue: low-rated reviews, and what was done about them.
 *
 * A bad review is a complaint nobody has answered yet, so the page defaults to
 * one and two stars that are still open. Raising a ticket — or marking a review
 * as dealt with — takes it out of the queue, which is what keeps the list
 * meaningful instead of an ever-growing wall of old grievances.
 *
 * Every filter, the sort and the page live in the URL and are answered by the
 * API; nothing is narrowed or ordered in the browser.
 */
export const QualityMonitorPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const table = useTable({ defaultRowsPerPage: DEFAULT_LIMIT });

  const [ticketFor, setTicketFor] = useState<Review | null>(null);

  const ratingTab = (searchParams.get('rating') as RatingTab | null) ?? 'flagged';
  const filters: ReviewFilters = {
    q: searchParams.get('q') ?? '',
    targetType: (searchParams.get('targetType') as ReviewFilters['targetType'] | null) ?? '',
    triage: (searchParams.get('triage') as ReviewFilters['triage'] | null) ?? 'open',
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
    },
    [searchParams, setSearchParams],
  );

  const query = useMemo<ReviewsListQuery>(
    () => ({
      ...ratingQuery(ratingTab),
      targetType: filters.targetType || undefined,
      handled: filters.triage === 'any' ? undefined : filters.triage === 'handled',
      q: filters.q || undefined,
      sort: toSortParam(orderBy, order),
      page,
      limit,
    }),
    [ratingTab, filters.targetType, filters.triage, filters.q, orderBy, order, page, limit],
  );

  const { data, isLoading, isError, error } = useReviewsList(query);
  const setHandled = useSetReviewHandled();

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  // Per-star totals for the whole filter, so every tab carries its number
  // rather than only the one being viewed.
  const counts = data?.meta.counts;

  const handleFilters = useCallback(
    (patch: Partial<ReviewFilters>) => {
      setParams(
        Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, value ?? null])),
      );
    },
    [setParams],
  );

  const handleResetFilters = useCallback(() => {
    setParams({ q: null, targetType: null, triage: null });
  }, [setParams]);

  const handleSort = useCallback(
    (id: string) => {
      if (!SORTABLE.has(id)) return;
      const next = orderBy === id && order === 'desc' ? 'asc' : 'desc';
      setParams({ sort: toSortParam(id, next) });
    },
    [order, orderBy, setParams],
  );

  const toggleHandled = useCallback(
    (row: Review) => {
      setHandled.mutate({ id: row.id ?? row._id, handled: !row.handledAt });
    },
    [setHandled],
  );

  const canReset = !!filters.q || !!filters.targetType || filters.triage !== 'open';
  const notFound = !isLoading && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Quality Monitor"
        description="Low-rated reviews on products and sellers, newest first. Raise a product-quality ticket from a review, or mark it as dealt with once it has been answered."
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Could not load reviews'}
        </Alert>
      )}

      {setHandled.isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {setHandled.error instanceof Error
            ? setHandled.error.message
            : 'Could not update the review'}
        </Alert>
      )}

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={ratingTab}
          onChange={(_e, value) => setParams({ rating: value })}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            px: 2.5,
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          {RATING_TABS.map((tab) => (
            <Tab
              key={tab.value}
              iconPosition="end"
              value={tab.value}
              label={tab.label}
              icon={
                <Label
                  variant={tab.value === ratingTab ? 'filled' : 'soft'}
                  color={
                    (tab.value === 'flagged' && 'error') ||
                    (tab.value === '1' && 'error') ||
                    (tab.value === '2' && 'warning') ||
                    (tab.value === '3' && 'info') ||
                    ((tab.value === '4' || tab.value === '5') && 'success') ||
                    'default'
                  }
                >
                  {tabCount(tab.value, counts)}
                </Label>
              }
            />
          ))}
        </Tabs>

        <ReviewTableToolbar filters={filters} onFilters={handleFilters} />

        {canReset && (
          <ReviewTableFiltersResult
            filters={filters}
            totalResults={total}
            onFilters={handleFilters}
            onReset={handleResetFilters}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1080 }}>
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
                  : rows.map((row) => {
                      const id = row.id ?? row._id;
                      return (
                        <ReviewTableRow
                          key={id}
                          row={row}
                          busy={setHandled.isPending && setHandled.variables?.id === id}
                          onRaiseTicket={() => setTicketFor(row)}
                          onToggleHandled={() => toggleHandled(row)}
                        />
                      );
                    })}

                <TableEmptyRows
                  height={table.dense ? 56 : 76}
                  emptyRows={emptyRows(page - 1, limit, total)}
                />

                {/* An empty queue is the goal, so it reads as good news rather
                    than as a missing list. */}
                {notFound && (
                  <TableRow>
                    <TableCell colSpan={TABLE_HEAD.length}>
                      <EmptyContent
                        filled
                        sx={{ py: 10 }}
                        title={canReset ? 'Nothing matches' : 'Nothing waiting'}
                        description={
                          canReset
                            ? 'Try another rating tab, or clear the filters.'
                            : 'No low-rated review is sitting unanswered right now.'
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

      <QualityTicketDialog review={ticketFor} onClose={() => setTicketFor(null)} />
    </>
  );
};
