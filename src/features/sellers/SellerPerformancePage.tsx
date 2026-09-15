import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Unstable_Grid2';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import LoadingButton from '@mui/lab/LoadingButton';

import { useDebounce } from '@/hooks/use-debounce';

import { varAlpha } from '@/theme/styles';
import { useAuth } from '@/lib/auth';
import { formatInr } from '@/lib/format';
import { ApiError, UserRole } from '@/types/api';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { DateField } from '@/components/ui/DateField';
import { PageHeader } from '@/components/ui/PageHeader';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';
import Chip from '@mui/material/Chip';
import {
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from '@/components/table';

import { AnalyticsWidget } from '@/features/dashboard/AnalyticsWidget';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import { downloadSellerPerformanceCsv, useSellerPerformance } from './api';
import { PerformanceTableRow } from './performance-table-row';
import type { PerformanceBand, SellerPerformanceSort } from './types';

// ----------------------------------------------------------------------

/** The windows anyone actually asks for, so nobody types two dates by hand. */
const PRESETS: Array<{ value: string; label: string; days: number | 'month' }> = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: 'month', label: 'This month', days: 'month' },
];

const iso = (d: Date): string => d.toISOString().slice(0, 10);

const rangeFor = (preset: string): { from: string; to: string } => {
  const today = new Date();
  if (preset === 'month') {
    return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
  }
  const days = PRESETS.find((p) => p.value === preset)?.days;
  const from = new Date();
  from.setDate(from.getDate() - (typeof days === 'number' ? days : 30));
  return { from: iso(from), to: iso(today) };
};

const TAB_OPTIONS: Array<{
  value: '' | PerformanceBand;
  label: string;
  color: 'info' | 'error' | 'success' | 'default';
}> = [
  { value: '', label: 'All sellers', color: 'info' },
  { value: 'attention', label: 'Needs attention', color: 'error' },
  { value: 'strong', label: 'Strong', color: 'success' },
  { value: 'quiet', label: 'No orders', color: 'default' },
];

const TABLE_HEAD = [
  { id: 'name', label: 'Seller' },
  { id: 'orders', label: 'Orders', width: 120, align: 'right' as const },
  { id: 'fulfilment', label: 'Fulfilled', width: 150 },
  { id: 'returns', label: 'Returned', width: 150 },
  { id: 'rating', label: 'Rating', width: 170 },
  { id: 'complaints', label: 'Complaints', width: 120, align: 'right' as const },
  { id: 'revenue', label: 'Revenue', width: 160, align: 'right' as const },
  { id: 'band', label: 'Verdict', width: 150 },
  { id: '', width: 110 },
];

const SORTABLE = new Set<SellerPerformanceSort>([
  'name',
  'orders',
  'fulfilment',
  'returns',
  'rating',
  'complaints',
  'revenue',
]);

const DEFAULT_LIMIT = 25;

// ----------------------------------------------------------------------

export const SellerPerformancePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSuper =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const preset = searchParams.get('preset') ?? '30d';
  const defaults = rangeFor(preset);
  const from = searchParams.get('from') ?? defaults.from;
  const to = searchParams.get('to') ?? defaults.to;
  const band = (searchParams.get('band') as PerformanceBand | null) ?? '';
  const clusterId = isSuper ? (searchParams.get('clusterId') ?? '') : '';
  const q = searchParams.get('q') ?? '';
  const sort = (searchParams.get('sort') as SellerPerformanceSort | null) ?? 'revenue';
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

  // Search runs on the pause, not on every keystroke.
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

  const query = useMemo(
    () => ({
      from: `${from}T00:00:00.000Z`,
      to: `${to}T23:59:59.999Z`,
      sort,
      clusterId: clusterId || undefined,
      q: q || undefined,
      band: (band || undefined) as PerformanceBand | undefined,
      page,
      limit,
    }),
    [from, to, sort, clusterId, q, band, page, limit],
  );

  const { data, isLoading, isFetching, isError, error } = useSellerPerformance(query);

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const onDownload = async () => {
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadSellerPerformanceCsv(query);
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  const rows = data?.rows ?? [];
  const totals = data?.totals;
  const total = data?.total ?? 0;
  const canReset = Boolean(q || clusterId);

  const countFor = (value: '' | PerformanceBand) => {
    if (!totals) return 0;
    if (value === '') return totals.sellers;
    return totals[value];
  };

  return (
    <>
      <PageHeader
        title="Seller performance"
        description="How every seller is doing over a window — what they sold, what they delivered, and what came back. Cluster admins see only their own cluster."
        action={
          <LoadingButton
            variant="outlined"
            loading={downloading}
            onClick={onDownload}
            startIcon={<Iconify icon="solar:download-bold" />}
          >
            Export CSV
          </LoadingButton>
        }
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Failed to load seller performance'}
        </Alert>
      )}

      {downloadError && (
        <Alert severity="error" sx={{ mt: 3 }} onClose={() => setDownloadError(null)}>
          {downloadError}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Revenue"
            total={totals?.revenueInr ?? null}
            displayTotal={totals ? formatInr(totals.revenueInr) : undefined}
            color="success"
            icon={<Iconify width={48} icon="solar:wallet-money-bold-duotone" />}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Orders"
            total={totals?.orders ?? null}
            color="info"
            icon={<Iconify width={48} icon="solar:cart-large-4-bold-duotone" />}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Fulfilment rate"
            total={totals?.fulfilmentRate ?? null}
            displayTotal={
              totals ? (totals.fulfilmentRate !== null ? `${totals.fulfilmentRate}%` : '—') : undefined
            }
            color={
              totals?.fulfilmentRate !== null && (totals?.fulfilmentRate ?? 100) < 80
                ? 'error'
                : 'primary'
            }
            icon={<Iconify width={48} icon="solar:check-circle-bold-duotone" />}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Average rating"
            total={totals?.avgRating ?? null}
            displayTotal={totals ? (totals.avgRating !== null ? totals.avgRating.toFixed(1) : '—') : undefined}
            color="warning"
            icon={<Iconify width={48} icon="solar:star-bold-duotone" />}
          />
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={band}
          onChange={(_e, value) => setParams({ band: value })}
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
                <Label variant={tab.value === band ? 'filled' : 'soft'} color={tab.color}>
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
            label="Period"
            value={preset}
            onChange={(e) => {
              const next = e.target.value;
              const r = rangeFor(next);
              setParams({ preset: next, from: r.from, to: r.to });
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: 1, md: 170 } }}
          >
            {PRESETS.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                {p.label}
              </MenuItem>
            ))}
            <MenuItem value="custom">Custom</MenuItem>
          </TextField>

          {preset === 'custom' && (
            <>
              <DateField
                label="From"
                value={from}
                onChange={(v) => setParams({ from: v })}
                sx={{ width: { xs: 1, md: 170 } }}
              />
              <DateField
                label="To"
                value={to}
                onChange={(v) => setParams({ to: v })}
                sx={{ width: { xs: 1, md: 170 } }}
              />
            </>
          )}

          {isSuper && (
            <Box sx={{ width: { xs: 1, md: 240 } }}>
              <ClusterPicker
                label="Cluster"
                value={clusterId || null}
                onChange={(id) => setParams({ clusterId: id ?? '' })}
                placeholder="All clusters"
              />
            </Box>
          )}

          <TextField
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search farm name or seller code..."
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
            onReset={() => setParams({ q: null, clusterId: null })}
            sx={{ p: 2.5, pt: 0 }}
          >
            <FiltersBlock label="Cluster:" isShow={!!clusterId}>
              <Chip
                {...chipProps}
                label="Selected cluster"
                onDelete={() => setParams({ clusterId: null })}
              />
            </FiltersBlock>

            <FiltersBlock label="Keyword:" isShow={!!q}>
              <Chip {...chipProps} label={q} onDelete={() => setParams({ q: null })} />
            </FiltersBlock>
          </FiltersResult>
        )}

        <Box sx={{ position: 'relative' }}>
          {isFetching && !isLoading && (
            <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9 }} />
          )}

          <Scrollbar>
            <Table sx={{ minWidth: 1200 }}>
              <TableHeadCustom
                order="desc"
                orderBy={sort}
                headLabel={TABLE_HEAD}
                onSort={(id) => {
                  if (!SORTABLE.has(id as SellerPerformanceSort)) return;
                  setParams({ sort: id });
                }}
              />

              <TableBody>
                {rows.map((row) => (
                  <PerformanceTableRow
                    key={row.sellerId}
                    row={row}
                    onViewSeller={() => navigate(`/admin/sellers?q=${row.farmName}`)}
                    onViewOrders={() => navigate(`/admin/orders?sellerId=${row.sellerId}`)}
                  />
                ))}

                <TableEmptyRows height={76} emptyRows={emptyRows(page - 1, limit, total)} />

                <TableNoData notFound={!isLoading && rows.length === 0} />
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        <TablePaginationCustom
          page={page - 1}
          count={total}
          rowsPerPage={limit}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_e, next) => setParams({ page: String(next + 1) })}
          onRowsPerPageChange={(e) => setParams({ limit: e.target.value, page: '1' })}
        />
      </Card>
    </>
  );
};
