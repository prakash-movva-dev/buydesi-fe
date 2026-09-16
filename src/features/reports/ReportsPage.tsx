import { useMemo, useState, type FormEvent } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';

import { useAuth } from '@/lib/auth';
import { ApiError, UserRole } from '@/types/api';
import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { DateField } from '@/components/ui/DateField';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyContent } from '@/components/empty-content';
import { TableHeadCustom, TableSkeleton } from '@/components/table';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';

import { fCurrency, fNumber } from '@/utils/format-number';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import {
  downloadClusterPerformanceCsv,
  downloadReportCsv,
  useClusterPerformanceReport,
  useRunReport,
} from './api';

// ----------------------------------------------------------------------

const PRODUCT_HEAD = [
  { id: 'rank', label: '#', width: 56 },
  { id: 'product', label: 'Product' },
  { id: 'units', label: 'Units sold', align: 'right' as const, width: 130 },
  { id: 'revenue', label: 'Revenue', align: 'right' as const, width: 150 },
];

const CLUSTER_HEAD = [
  { id: 'cluster', label: 'Cluster' },
  { id: 'sellers', label: 'Sellers', align: 'right' as const, width: 100 },
  { id: 'listings', label: 'Live listings', align: 'right' as const, width: 130 },
  { id: 'orders', label: 'Orders', align: 'right' as const, width: 100 },
  { id: 'revenue', label: 'Revenue', align: 'right' as const, width: 150 },
  { id: 'tickets', label: 'Open tickets', align: 'right' as const, width: 130 },
];

/** Thirty days back, which is the window most of these questions are about. */
const defaultFrom = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

const defaultTo = (): string => new Date().toISOString().slice(0, 10);

// ----------------------------------------------------------------------

/**
 * Trading numbers for a window you pick.
 *
 * Nothing is computed until you ask, because these are aggregate scans rather
 * than a live feed — the run button is honest about that rather than pretending
 * the page is a dashboard.
 */
export const ReportsPage = () => {
  const { user } = useAuth();
  const isSuper =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [clusterId, setClusterId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);
  const [clusterDownloading, setClusterDownloading] = useState(false);
  const [clusterDownloadError, setClusterDownloadError] = useState<string | null>(null);

  const run = useRunReport();

  const isoFrom = `${from}T00:00:00.000Z`;
  const isoTo = `${to}T23:59:59.999Z`;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setDownloadError(null);
    run.mutate({
      from: isoFrom,
      to: isoTo,
      clusterId: isSuper ? (clusterId ?? undefined) : undefined,
    });
  };

  const onDownload = async () => {
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadReportCsv({
        from: isoFrom,
        to: isoTo,
        clusterId: isSuper ? (clusterId ?? undefined) : undefined,
      });
    } catch (err) {
      setDownloadError((err as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  const clusterPerf = useClusterPerformanceReport({ from: isoFrom, to: isoTo }, isSuper);

  const sortedRows = useMemo(() => {
    const rows = clusterPerf.data?.rows ?? [];
    return [...rows].sort((a, b) =>
      sortDesc ? b.revenueInr - a.revenueInr : a.revenueInr - b.revenueInr,
    );
  }, [clusterPerf.data, sortDesc]);

  const onClusterDownload = async () => {
    setClusterDownloadError(null);
    setClusterDownloading(true);
    try {
      await downloadClusterPerformanceCsv({ from: isoFrom, to: isoTo });
    } catch (err) {
      setClusterDownloadError((err as Error).message);
    } finally {
      setClusterDownloading(false);
    }
  };

  const result = run.data;
  const runError =
    run.error instanceof ApiError
      ? run.error.message
      : run.isError
        ? 'Could not build the report'
        : null;
  const clusterPerfError =
    clusterPerf.error instanceof ApiError
      ? clusterPerf.error.message
      : clusterPerf.isError
        ? 'Could not load cluster performance'
        : null;

  const HEADLINES = result
    ? [
        {
          label: 'Orders',
          value: fNumber(result.orders.count),
          hint: `${fNumber(result.orders.cancelledCount)} cancelled`,
          icon: 'solar:bag-check-bold',
        },
        {
          label: 'Gross sales',
          value: fCurrency(result.orders.gmvInr),
          hint:
            result.orders.count > 0
              ? `${fCurrency(result.orders.gmvInr / result.orders.count)} per order`
              : 'no orders',
          icon: 'solar:wallet-money-bold',
        },
        {
          label: 'Paid to sellers',
          value: fCurrency(result.payouts.paidNetInr),
          hint: `${fNumber(result.payouts.count)} payout${result.payouts.count === 1 ? '' : 's'}`,
          icon: 'solar:hand-money-bold',
        },
        {
          label: 'Sellers',
          value: fNumber(result.sellers),
          hint: `${fNumber(result.listings)} live listings`,
          icon: 'solar:users-group-rounded-bold',
        },
        {
          label: 'Support',
          value: fNumber(result.support.ticketsOpened),
          hint: `${fNumber(result.support.ticketsResolved)} resolved`,
          icon: 'solar:chat-round-dots-bold',
        },
        {
          label: 'Average delivery',
          value: result.avgDeliveryHours != null ? `${result.avgDeliveryHours} h` : '—',
          hint: 'order to doorstep',
          icon: 'solar:delivery-bold',
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Trading numbers for a window you choose. Nothing is calculated until you run it."
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      <Card sx={{ mt: 3, p: 3 }}>
        <Stack
          component="form"
          onSubmit={submit}
          spacing={2}
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ md: 'flex-start' }}
        >
          <DateField
            label="From"
            value={from}
            onChange={setFrom}
            sx={{ width: { xs: 1, md: 180 } }}
          />
          <DateField label="To" value={to} onChange={setTo} sx={{ width: { xs: 1, md: 180 } }} />

          {isSuper && (
            <Box sx={{ width: { xs: 1, md: 260 } }}>
              <ClusterPicker
                label="Cluster"
                value={clusterId}
                onChange={setClusterId}
                placeholder="Every cluster"
              />
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" spacing={1.5} sx={{ mt: { md: 0.5 } }}>
            <LoadingButton
              type="submit"
              variant="contained"
              loading={run.isPending}
              startIcon={<Iconify icon="solar:play-bold" />}
            >
              Run report
            </LoadingButton>
            <LoadingButton
              variant="outlined"
              loading={downloading}
              onClick={onDownload}
              startIcon={<Iconify icon="solar:download-bold" />}
            >
              CSV
            </LoadingButton>
          </Stack>
        </Stack>

        {(runError || downloadError) && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {runError ?? downloadError}
          </Alert>
        )}

        {result?.scope.clusterName && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Scoped to
            </Typography>
            <Label variant="soft">{result.scope.clusterName}</Label>
          </Stack>
        )}
      </Card>

      {run.isPending && (
        <Grid container spacing={2.5} sx={{ mt: 1 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} xs={12} sm={6} md={4}>
              <Card sx={{ p: 3, height: 104 }} />
            </Grid>
          ))}
        </Grid>
      )}

      {!result && !run.isPending && (
        <Card sx={{ mt: 3 }}>
          <EmptyContent
            filled
            sx={{ py: 10 }}
            title="No report yet"
            description="Pick a window and run it — orders, sales, payouts, sellers and support for those dates."
          />
        </Card>
      )}

      {result && (
        <>
          <Grid container spacing={2.5} sx={{ mt: 1 }}>
            {HEADLINES.map((item) => (
              <Grid key={item.label} xs={12} sm={6} md={4}>
                <Card sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Iconify icon={item.icon} width={32} sx={{ color: 'text.disabled' }} />
                    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                      <Typography variant="h5">{item.value}</Typography>
                      <Typography variant="subtitle2">{item.label}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {item.hint}
                      </Typography>
                    </Stack>
                  </Stack>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Card sx={{ mt: 3 }}>
            <CardHeader
              title="What sold most"
              subheader="By revenue in the window you ran"
            />
            <Scrollbar>
              {result.topProducts.length === 0 ? (
                <EmptyContent filled sx={{ m: 3, py: 6 }} title="Nothing sold in this window" />
              ) : (
                <Table sx={{ minWidth: 640 }}>
                  <TableHeadCustom headLabel={PRODUCT_HEAD} />
                  <TableBody>
                    {result.topProducts.map((product, index) => (
                      <TableRow key={product.productId} hover>
                        <TableCell sx={{ color: 'text.disabled' }}>{index + 1}</TableCell>
                        <TableCell sx={{ typography: 'subtitle2' }}>{product.name}</TableCell>
                        <TableCell align="right">{fNumber(product.units)}</TableCell>
                        <TableCell align="right" sx={{ typography: 'subtitle2' }}>
                          {fCurrency(product.revenueInr)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Scrollbar>
          </Card>
        </>
      )}

      {isSuper && (
        <Card sx={{ mt: 3 }}>
          <CardHeader
            title="Cluster against cluster"
            subheader="The same window, split by operating area"
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => setSortDesc((v) => !v)}
                  startIcon={<Iconify icon="solar:sort-vertical-bold" />}
                >
                  {sortDesc ? 'Best first' : 'Worst first'}
                </Button>
                <LoadingButton
                  size="small"
                  loading={clusterDownloading}
                  onClick={onClusterDownload}
                  startIcon={<Iconify icon="solar:download-bold" />}
                >
                  CSV
                </LoadingButton>
              </Stack>
            }
          />

          {clusterPerfError && (
            <Alert severity="error" sx={{ mx: 3, mb: 2 }}>
              {clusterPerfError}
            </Alert>
          )}
          {clusterDownloadError && (
            <Alert severity="error" sx={{ mx: 3, mb: 2 }}>
              {clusterDownloadError}
            </Alert>
          )}

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Scrollbar>
            <Table sx={{ minWidth: 820 }}>
              <TableHeadCustom headLabel={CLUSTER_HEAD} />
              <TableBody>
                {clusterPerf.isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <TableSkeleton key={i} />)
                ) : sortedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={CLUSTER_HEAD.length}>
                      <EmptyContent filled sx={{ py: 6 }} title="No cluster traded in this window" />
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRows.map((row) => (
                    <TableRow key={row.clusterId} hover>
                      <TableCell>
                        <Typography variant="subtitle2">{row.clusterName}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          {row.state}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{fNumber(row.sellers)}</TableCell>
                      <TableCell align="right">{fNumber(row.liveListings)}</TableCell>
                      <TableCell align="right">{fNumber(row.orders)}</TableCell>
                      <TableCell align="right" sx={{ typography: 'subtitle2' }}>
                        {fCurrency(row.revenueInr)}
                      </TableCell>
                      <TableCell align="right">
                        {row.openTickets > 0 ? (
                          <Label variant="soft" color="warning">
                            {fNumber(row.openTickets)}
                          </Label>
                        ) : (
                          fNumber(0)
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Scrollbar>
        </Card>
      )}
    </>
  );
};
