import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Unstable_Grid2';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import { useTheme } from '@mui/material/styles';

import { useTabs } from '@/hooks/use-tabs';

import { varAlpha } from '@/theme/styles';
import { formatInr } from '@/lib/format';
import { fDate } from '@/utils/format-time';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { DateField } from '@/components/ui/DateField';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingScreen } from '@/components/loading-screen';
import { Chart, useChart } from '@/components/chart';
import { TableHeadCustom, TableNoData } from '@/components/table';

import { AnalyticsWidget } from '@/features/dashboard/AnalyticsWidget';
import { useSellerAnalytics, type Granularity } from '@/features/seller/profile/api';

// ----------------------------------------------------------------------

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

const TABS = [
  { value: 'sales', label: 'Sales', icon: <Iconify icon="solar:chart-2-bold" width={24} /> },
  { value: 'earnings', label: 'Earnings', icon: <Iconify icon="solar:wallet-money-bold" width={24} /> },
  { value: 'inventory', label: 'Inventory', icon: <Iconify icon="solar:box-bold" width={24} /> },
  { value: 'customers', label: 'Customers', icon: <Iconify icon="solar:users-group-rounded-bold" width={24} /> },
];

const STATUS_COLOR: Record<string, 'info' | 'warning' | 'success' | 'error' | 'default'> = {
  PLACED: 'info',
  PACKED: 'info',
  DISPATCHED: 'warning',
  DELIVERED: 'success',
  RETURNED: 'error',
  CANCELLED: 'default',
};

// ----------------------------------------------------------------------

/** One label/value line, the unit of every panel below. */
const Figure = ({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) => (
  <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2}>
    <Stack spacing={0.25}>
      <Box component="span" sx={{ typography: 'body2', color: 'text.secondary' }}>
        {label}
      </Box>
      {hint && (
        <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
          {hint}
        </Box>
      )}
    </Stack>
    <Box component="span" sx={{ typography: strong ? 'h6' : 'subtitle1', whiteSpace: 'nowrap' }}>
      {value}
    </Box>
  </Stack>
);

// ----------------------------------------------------------------------

export const MyAnalyticsPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const tabs = useTabs('sales');
  const [searchParams, setSearchParams] = useSearchParams();

  const preset = searchParams.get('preset') ?? '30d';
  const defaults = rangeFor(preset);
  const from = searchParams.get('from') ?? defaults.from;
  const to = searchParams.get('to') ?? defaults.to;
  const granularity = (searchParams.get('granularity') as Granularity | null) ?? 'daily';

  const setParams = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    setSearchParams(params, { replace: true });
  };

  const query = useMemo(
    () => ({
      from: `${from}T00:00:00.000Z`,
      to: `${to}T23:59:59.999Z`,
      granularity,
    }),
    [from, to, granularity],
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useSellerAnalytics(query);

  const series = data?.sales.timeseries ?? [];
  const chartOptions = useChart({
    colors: [theme.palette.primary.dark],
    xaxis: { categories: series.map((b) => fDate(b.bucket) ?? b.bucket) },
    stroke: { width: 3 },
    tooltip: {
      y: { formatter: (value: number) => formatInr(value), title: { formatter: () => '' } },
    },
  });

  if (isLoading) return <LoadingScreen sx={{ py: 20 }} />;

  const filters = (
    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
      <TextField
        select
        size="small"
        label="Period"
        value={preset}
        onChange={(e) => {
          const next = e.target.value;
          const r = rangeFor(next);
          setParams({ preset: next, from: r.from, to: r.to });
        }}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 150 }}
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
          <DateField label="From" value={from} onChange={(v) => setParams({ from: v })} sx={{ width: 160 }} />
          <DateField label="To" value={to} onChange={(v) => setParams({ to: v })} sx={{ width: 160 }} />
        </>
      )}

      <TextField
        select
        size="small"
        label="Grouped by"
        value={granularity}
        onChange={(e) => setParams({ granularity: e.target.value })}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 130 }}
      >
        <MenuItem value="daily">Day</MenuItem>
        <MenuItem value="weekly">Week</MenuItem>
        <MenuItem value="monthly">Month</MenuItem>
      </TextField>

      <Button
        variant="outlined"
        onClick={() => refetch()}
        disabled={isFetching}
        startIcon={<Iconify icon="solar:refresh-bold" />}
      >
        Refresh
      </Button>
    </Stack>
  );

  if (isError || !data) {
    return (
      <>
        <PageHeader title="My analytics" action={filters} />
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Could not load your analytics'}
        </Alert>
      </>
    );
  }

  const { sales, earnings, inventory, customers, orderStatus, productPerformance, wallet } = data;

  // Numbers the API gives the ingredients for but never states outright.
  const statusTotal = Object.values(orderStatus).reduce((sum, n) => sum + n, 0);
  const fulfilmentRate = statusTotal > 0 ? Math.round((orderStatus.DELIVERED / statusTotal) * 100) : null;
  const repeatRate =
    customers.uniqueBuyers > 0
      ? Math.round((customers.repeatBuyers / customers.uniqueBuyers) * 100)
      : null;
  const takeRate =
    earnings.grossInr > 0
      ? Math.round(((earnings.commissionInr + earnings.platformFeesInr) / earnings.grossInr) * 100)
      : null;

  return (
    <>
      <PageHeader
        title="My analytics"
        description="What you sold, what you earned, and what is running out — for whatever window you pick."
        action={filters}
      />

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Revenue"
            total={sales.totalRevenueInr}
            displayTotal={formatInr(sales.totalRevenueInr)}
            color="success"
            icon={<Iconify width={48} icon="solar:wallet-money-bold-duotone" />}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Orders"
            total={sales.totalOrders}
            color="info"
            icon={<Iconify width={48} icon="solar:cart-large-4-bold-duotone" />}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Average order"
            total={sales.averageOrderValueInr}
            displayTotal={formatInr(sales.averageOrderValueInr)}
            color="primary"
            icon={<Iconify width={48} icon="solar:tag-price-bold-duotone" />}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Paid out"
            total={earnings.netPaidInr}
            displayTotal={formatInr(earnings.netPaidInr)}
            color="warning"
            icon={<Iconify width={48} icon="solar:card-transfer-bold-duotone" />}
          />
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={tabs.value}
          onChange={tabs.onChange}
          sx={{
            px: 2.5,
            boxShadow: (t) => `inset 0 -2px 0 0 ${varAlpha(t.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          {TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} icon={tab.icon} />
          ))}
        </Tabs>

        {/* ── Sales ── */}
        {tabs.value === 'sales' && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid xs={12} md={8}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Revenue over time
                </Typography>
                {series.length > 0 ? (
                  <Chart
                    type="area"
                    series={[{ name: 'Revenue', data: series.map((b) => b.revenueInr) }]}
                    options={chartOptions}
                    height={300}
                  />
                ) : (
                  <Typography variant="body2" sx={{ py: 8, textAlign: 'center', color: 'text.disabled' }}>
                    No sales in this window.
                  </Typography>
                )}
              </Grid>

              <Grid xs={12} md={4}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Where your orders are
                </Typography>
                <Stack spacing={1.5}>
                  {Object.entries(orderStatus).map(([status, count]) => (
                    <Stack
                      key={status}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Label variant="soft" color={STATUS_COLOR[status] ?? 'default'}>
                        {status}
                      </Label>
                      <Box component="span" sx={{ typography: 'subtitle2' }}>
                        {count}
                      </Box>
                    </Stack>
                  ))}

                  {fulfilmentRate !== null && (
                    <>
                      <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
                      <Figure label="Delivered" value={`${fulfilmentRate}%`} strong />
                      <LinearProgress
                        variant="determinate"
                        value={fulfilmentRate}
                        color={fulfilmentRate >= 80 ? 'success' : 'warning'}
                        sx={{ height: 6, borderRadius: 1 }}
                      />
                    </>
                  )}
                </Stack>
              </Grid>

              <Grid xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Your best sellers
                </Typography>
                <Scrollbar>
                  <Table sx={{ minWidth: 600 }}>
                    <TableHeadCustom
                      headLabel={[
                        { id: 'name', label: 'Product' },
                        { id: 'units', label: 'Units sold', align: 'right' as const, width: 140 },
                        { id: 'revenue', label: 'Revenue', align: 'right' as const, width: 160 },
                      ]}
                    />
                    <TableBody>
                      {productPerformance.map((p) => (
                        <TableRow
                          key={p.productId}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/seller/products/${p.productId}`)}
                        >
                          <TableCell sx={{ typography: 'subtitle2' }}>{p.name}</TableCell>
                          <TableCell align="right">{p.unitsSold}</TableCell>
                          <TableCell align="right">{formatInr(p.revenueInr)}</TableCell>
                        </TableRow>
                      ))}
                      <TableNoData notFound={productPerformance.length === 0} />
                    </TableBody>
                  </Table>
                </Scrollbar>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── Earnings ── */}
        {tabs.value === 'earnings' && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid xs={12} md={6}>
                <Card variant="outlined" sx={{ height: 1 }}>
                  <CardHeader
                    title="From sale to payout"
                    subheader="What was taken out of your gross, and what reached you."
                  />
                  <CardContent>
                    <Stack spacing={2}>
                      <Figure label="Gross sales" value={formatInr(earnings.grossInr)} />
                      <Figure
                        label="Commission"
                        value={`− ${formatInr(earnings.commissionInr)}`}
                        hint="Buy Desi's share of each sale"
                      />
                      <Figure
                        label="Platform fees"
                        value={`− ${formatInr(earnings.platformFeesInr)}`}
                        hint="Payment and handling charges"
                      />
                      <Divider sx={{ borderStyle: 'dashed' }} />
                      <Figure label="Paid out" value={formatInr(earnings.netPaidInr)} strong />
                      <Figure
                        label="Still to come"
                        value={formatInr(earnings.pendingInr)}
                        hint="Earned, not yet settled"
                      />
                      {takeRate !== null && (
                        <>
                          <Divider sx={{ borderStyle: 'dashed' }} />
                          <Figure
                            label="Total deductions"
                            value={`${takeRate}%`}
                            hint="Commission and fees as a share of gross"
                          />
                        </>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid xs={12} md={6}>
                <Card variant="outlined" sx={{ height: 1 }}>
                  <CardHeader title="Your wallet" subheader="Where that money sits right now." />
                  <CardContent>
                    <Stack spacing={2}>
                      <Figure label="Balance" value={formatInr(wallet.balanceInr)} strong />
                      <Figure label="Clearing" value={formatInr(wallet.pendingCreditInr)} />
                      <Figure label="On hold" value={formatInr(wallet.pendingDebitInr)} />
                      <Divider sx={{ borderStyle: 'dashed' }} />
                      <Figure label="Credited all time" value={formatInr(wallet.totalCreditedInr)} />
                      <Figure label="Withdrawn all time" value={formatInr(wallet.totalDebitedInr)} />
                    </Stack>

                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => navigate('/seller/wallet')}
                      endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
                      sx={{ mt: 3 }}
                    >
                      Open wallet
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── Inventory ── */}
        {tabs.value === 'inventory' && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid xs={12} sm={6} md={3}>
                <AnalyticsWidget
                  title="Live products"
                  total={inventory.liveProducts}
                  color="success"
                  icon={<Iconify width={48} icon="solar:box-bold-duotone" />}
                />
              </Grid>
              <Grid xs={12} sm={6} md={3}>
                <AnalyticsWidget
                  title="Running low"
                  total={inventory.lowStockProducts}
                  color={inventory.lowStockProducts > 0 ? 'warning' : 'info'}
                  icon={<Iconify width={48} icon="solar:graph-down-bold-duotone" />}
                />
              </Grid>
              <Grid xs={12} sm={6} md={3}>
                <AnalyticsWidget
                  title="Out of stock"
                  total={inventory.outOfStockProducts}
                  color={inventory.outOfStockProducts > 0 ? 'error' : 'info'}
                  icon={<Iconify width={48} icon="solar:box-minimalistic-bold-duotone" />}
                />
              </Grid>
              <Grid xs={12} sm={6} md={3}>
                <AnalyticsWidget
                  title="Units on hand"
                  total={inventory.totalUnitsInStock}
                  color="primary"
                  icon={<Iconify width={48} icon="solar:layers-bold-duotone" />}
                />
              </Grid>

              {(inventory.lowStockProducts > 0 || inventory.outOfStockProducts > 0) && (
                <Grid xs={12}>
                  <Alert
                    severity={inventory.outOfStockProducts > 0 ? 'error' : 'warning'}
                    action={
                      <Button color="inherit" size="small" onClick={() => navigate('/seller/products')}>
                        Restock
                      </Button>
                    }
                  >
                    {inventory.outOfStockProducts > 0
                      ? `${inventory.outOfStockProducts} product${
                          inventory.outOfStockProducts === 1 ? '' : 's'
                        } sold out — buyers cannot order ${
                          inventory.outOfStockProducts === 1 ? 'it' : 'them'
                        } until you restock.`
                      : `${inventory.lowStockProducts} product${
                          inventory.lowStockProducts === 1 ? '' : 's'
                        } running low.`}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* ── Customers ── */}
        {tabs.value === 'customers' && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid xs={12} md={6}>
                <Card variant="outlined" sx={{ height: 1 }}>
                  <CardHeader
                    title="Who bought from you"
                    subheader="Repeat buyers are the ones worth keeping."
                  />
                  <CardContent>
                    <Stack spacing={2}>
                      <Figure label="Unique buyers" value={String(customers.uniqueBuyers)} strong />
                      <Figure label="Came back" value={String(customers.repeatBuyers)} />
                      {repeatRate !== null && (
                        <>
                          <Figure label="Repeat rate" value={`${repeatRate}%`} />
                          <LinearProgress
                            variant="determinate"
                            value={repeatRate}
                            color={repeatRate >= 25 ? 'success' : 'warning'}
                            sx={{ height: 6, borderRadius: 1 }}
                          />
                        </>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid xs={12} md={6}>
                <Card variant="outlined" sx={{ height: 1 }}>
                  <CardHeader title="What they said" subheader="Ratings across your listings." />
                  <CardContent>
                    <Stack spacing={2}>
                      <Figure
                        label="Average rating"
                        value={
                          customers.totalReviews > 0 ? customers.averageRating.toFixed(1) : 'No reviews'
                        }
                        strong
                      />
                      <Figure label="Reviews" value={String(customers.totalReviews)} />
                    </Stack>

                    {customers.totalReviews === 0 && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        Nobody has reviewed you yet. Ratings build as orders are delivered.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Card>
    </>
  );
};
