import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';

import { varAlpha } from '@/theme/styles';

import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/api';
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
  TablePaginationCustom,
} from '@/components/table';

import { useUsersList } from '@/features/users/api';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import { useTicketsList } from './api';
import { TicketTableRow } from './ticket-table-row';
import { TicketTableToolbar, type TicketFilters } from './ticket-table-toolbar';
import { TicketTableFiltersResult } from './ticket-table-filters-result';
import type { SupportStatus, TicketsListQuery, TicketsSort } from './types';

// ----------------------------------------------------------------------

const STATUS_OPTIONS: Array<{ value: '' | SupportStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const TABLE_HEAD = [
  { id: 'subject', label: 'Ticket' },
  { id: 'category', label: 'Category', width: 150 },
  { id: 'assignee', label: 'Assigned to', width: 170 },
  { id: 'level', label: 'Escalation', width: 130 },
  { id: 'due', label: 'Resolution due', width: 150 },
  { id: 'created', label: 'Raised', width: 150 },
  { id: 'status', label: 'Status', width: 130 },
  { id: '', width: 72 },
];

/** Only these columns can be ordered by the API. */
const SORTABLE = new Set(['created', 'due', 'status']);

const toSortParam = (orderBy: string, order: 'asc' | 'desc'): TicketsSort => {
  if (orderBy === 'created') return order === 'asc' ? 'oldest' : 'newest';
  if (orderBy === 'due') return 'due_soon';
  return `${orderBy}_${order}` as TicketsSort;
};

const fromSortParam = (sort: string | null): { orderBy: string; order: 'asc' | 'desc' } => {
  if (!sort || sort === 'newest') return { orderBy: 'created', order: 'desc' };
  if (sort === 'oldest') return { orderBy: 'created', order: 'asc' };
  if (sort === 'due_soon') return { orderBy: 'due', order: 'asc' };
  const [column, direction] = sort.split('_');
  return { orderBy: column, order: direction === 'asc' ? 'asc' : 'desc' };
};

const DEFAULT_LIMIT = 10;

// ----------------------------------------------------------------------

/**
 * The support queue. Every filter, the sort and the page live in the URL and
 * are answered by the API — nothing is narrowed or ordered in the browser, so
 * the table stays correct however many tickets are open.
 */
export const TicketsListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const table = useTable({ defaultRowsPerPage: DEFAULT_LIMIT });

  const status = (searchParams.get('status') as SupportStatus | null) ?? '';
  const filters: TicketFilters = {
    q: searchParams.get('q') ?? '',
    category: (searchParams.get('category') as TicketFilters['category'] | null) ?? '',
    level: (searchParams.get('escalationLevel') as TicketFilters['level'] | null) ?? '',
    assignedTo: searchParams.get('assignedTo') ?? '',
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

  const query = useMemo<TicketsListQuery>(
    () => ({
      status: status || undefined,
      category: filters.category || undefined,
      escalationLevel: filters.level || undefined,
      assignedTo: filters.assignedTo || undefined,
      q: filters.q || undefined,
      sort: toSortParam(orderBy, order),
      page,
      limit,
    }),
    [status, filters.category, filters.level, filters.assignedTo, filters.q, orderBy, order, page, limit],
  );

  const { data, isLoading, isError, error } = useTicketsList(query);

  // Staff who can own a ticket — used for the filter and to name the assignee.
  const { data: staff } = useUsersList({ role: UserRole.SUPPORT_ADMIN, page: 1, limit: 100 });

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  // Per-status totals for the whole filter, so every tab carries its number
  // rather than only the one being viewed.
  const counts = data?.meta.counts;

  const staffName = useMemo(
    () => new Map((staff?.items ?? []).map((u) => [u.id, u.name])),
    [staff],
  );

  const handleFilters = useCallback(
    (patch: Partial<TicketFilters>) => {
      // `level` is the API's `escalationLevel`.
      const mapped: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(patch)) {
        mapped[key === 'level' ? 'escalationLevel' : key] = (value as string) || null;
      }
      setParams(mapped);
    },
    [setParams],
  );

  const handleResetFilters = useCallback(() => {
    setParams({ q: null, category: null, escalationLevel: null, assignedTo: null });
  }, [setParams]);

  const handleSort = useCallback(
    (id: string) => {
      if (!SORTABLE.has(id)) return;
      const next = orderBy === id && order === 'desc' ? 'asc' : 'desc';
      setParams({ sort: toSortParam(id, next) });
    },
    [order, orderBy, setParams],
  );

  const mineOnly = Boolean(user && filters.assignedTo === user.id);
  const canReset =
    !!filters.q || !!filters.category || !!filters.level || !!filters.assignedTo;
  const notFound = !isLoading && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Support tickets"
        description="Everything raised by buyers and sellers — claim what is yours and work the queue."
        action={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant={mineOnly ? 'contained' : 'outlined'}
              onClick={() => setParams({ assignedTo: mineOnly ? null : (user?.id ?? null) })}
              startIcon={<Iconify icon="solar:user-check-rounded-bold" />}
            >
              Assigned to me
            </Button>
            <Button
              variant={filters.assignedTo === 'none' ? 'contained' : 'outlined'}
              onClick={() =>
                setParams({ assignedTo: filters.assignedTo === 'none' ? null : 'none' })
              }
              startIcon={<Iconify icon="solar:inbox-line-bold" />}
            >
              Unassigned
            </Button>
          </Stack>
        }
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Could not load tickets'}
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
                    (tab.value === 'OPEN' && 'info') ||
                    (tab.value === 'IN_PROGRESS' && 'warning') ||
                    (tab.value === 'ESCALATED' && 'error') ||
                    (tab.value === 'RESOLVED' && 'success') ||
                    'default'
                  }
                >
                  {counts ? (counts[tab.value || 'all'] ?? 0) : '-'}
                </Label>
              }
            />
          ))}
        </Tabs>

        <TicketTableToolbar
          filters={filters}
          assignees={(staff?.items ?? []).map((u) => ({ id: u.id, name: u.name }))}
          onFilters={handleFilters}
        />

        {canReset && (
          <TicketTableFiltersResult
            filters={filters}
            assigneeName={staffName.get(filters.assignedTo)}
            totalResults={total}
            onFilters={handleFilters}
            onReset={handleResetFilters}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1140 }}>
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
                      <TicketTableRow
                        key={row.id}
                        row={row}
                        assigneeName={
                          row.assignedTo ? staffName.get(row.assignedTo) : undefined
                        }
                        onViewRow={() => navigate(`/admin/support/${row.id}`)}
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
