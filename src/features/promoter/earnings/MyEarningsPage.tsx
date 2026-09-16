import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';

import { varAlpha } from '@/theme/styles';

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

import { fDate } from '@/utils/format-time';
import { fCurrency } from '@/utils/format-number';

import { useMyAffiliateDashboard, useMyEarnings } from '@/features/affiliates/api';
import {
  ConversionStatusBadge,
  CONVERSION_LABEL,
  VIA_ICON,
  VIA_LABEL,
} from '@/features/affiliates/status-badge';
import type { AffiliateConversionStatus } from '@/features/affiliates/types';

// ----------------------------------------------------------------------

const STATUS_TABS: Array<{ value: '' | AffiliateConversionStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: CONVERSION_LABEL.PENDING },
  { value: 'APPROVED', label: CONVERSION_LABEL.APPROVED },
  { value: 'PAID', label: CONVERSION_LABEL.PAID },
  { value: 'REVERSED', label: CONVERSION_LABEL.REVERSED },
];

const TABLE_HEAD = [
  { id: 'order', label: 'Order' },
  { id: 'via', label: 'How it reached you', width: 180 },
  { id: 'value', label: 'Order value', align: 'right' as const, width: 130 },
  { id: 'rate', label: 'Your rate', align: 'right' as const, width: 110 },
  { id: 'commission', label: 'You earn', align: 'right' as const, width: 130 },
  { id: 'when', label: 'Placed', width: 130 },
  { id: 'status', label: 'Status', width: 140 },
];

const DEFAULT_LIMIT = 10;

// ----------------------------------------------------------------------

/**
 * What the affiliate has earned, order by order.
 *
 * The one thing this page has to be honest about is *when* money arrives: a
 * commission is not owed until the buyer's return window has closed, so
 * "not owed yet" is spelled out rather than looking like an unpaid bill.
 */
export const MyEarningsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const table = useTable({ defaultRowsPerPage: DEFAULT_LIMIT });

  const status = (searchParams.get('status') as AffiliateConversionStatus | null) ?? '';
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

  const query = useMemo(
    () => ({ status: status || undefined, page, limit }),
    [status, page, limit],
  );

  const { data, isLoading, isError, error } = useMyEarnings(query);
  const { data: dash } = useMyAffiliateDashboard();

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const counts = data?.meta.counts;
  const notFound = !isLoading && rows.length === 0;

  const SUMMARY = [
    {
      label: 'Paid into your wallet',
      value: fCurrency(dash?.paidInr ?? 0),
      icon: 'solar:wallet-money-bold',
      color: 'success.main',
    },
    {
      label: 'On the way',
      value: fCurrency(dash?.pendingInr ?? 0),
      icon: 'solar:clock-circle-bold',
      color: 'warning.main',
    },
    {
      label: 'Orders you brought',
      value: String(dash?.orders ?? 0),
      icon: 'solar:bag-check-bold',
      color: 'info.main',
    },
  ];

  return (
    <>
      <PageHeader
        title="Earnings"
        description="Your share of every order that came through your links or codes. It reaches your wallet once the buyer's return window closes, and you withdraw from there."
      />

      <Grid container spacing={2.5} sx={{ mt: 1 }}>
        {SUMMARY.map((item) => (
          <Grid key={item.label} xs={12} sm={4}>
            <Card sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Iconify icon={item.icon} width={32} sx={{ color: item.color }} />
                <Stack spacing={0.25}>
                  <Typography variant="h5">{item.value}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {item.label}
                  </Typography>
                </Stack>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Could not load your earnings'}
        </Alert>
      )}

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={status}
          onChange={(_e, value) => setParams({ status: value })}
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
                  variant={tab.value === status ? 'filled' : 'soft'}
                  color={
                    (tab.value === 'PENDING' && 'warning') ||
                    (tab.value === 'APPROVED' && 'info') ||
                    (tab.value === 'PAID' && 'success') ||
                    'default'
                  }
                >
                  {counts ? (counts[tab.value || 'all'] ?? 0) : '-'}
                </Label>
              }
            />
          ))}
        </Tabs>

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 900 }}>
              <TableHeadCustom headLabel={TABLE_HEAD} />

              <TableBody>
                {isLoading
                  ? Array.from({ length: Math.min(limit, 5) }).map((_, index) => (
                      <TableSkeleton key={index} sx={{ height: table.dense ? 56 : 76 }} />
                    ))
                  : rows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', typography: 'caption' }}>
                          {row.orderNumber ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Iconify
                              icon={VIA_ICON[row.via]}
                              width={16}
                              sx={{ color: 'text.disabled' }}
                            />
                            <Box component="span" sx={{ typography: 'body2' }}>
                              {row.code ?? VIA_LABEL[row.via]}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{fCurrency(row.orderSubtotalInr)}</TableCell>
                        <TableCell align="right">{row.commissionRatePercent}%</TableCell>
                        <TableCell align="right" sx={{ typography: 'subtitle2' }}>
                          {fCurrency(row.commissionInr)}
                        </TableCell>
                        <TableCell sx={{ typography: 'caption' }}>
                          {fDate(row.createdAt)}
                        </TableCell>
                        <TableCell>
                          <ConversionStatusBadge status={row.status} />
                        </TableCell>
                      </TableRow>
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
                        title={status ? 'Nothing here' : 'No earnings yet'}
                        description={
                          status
                            ? 'Try another tab.'
                            : 'Share a link — when someone buys through it, the order shows up here.'
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
