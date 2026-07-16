import { useMemo, useState } from 'react';
import { BarChart3, Box as BoxIcon, RefreshCw, ShoppingBag, Star, Users, Wallet } from 'lucide-react';
import MuiBox from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData } from '@/components/table';
import { formatDate, formatInr } from '@/lib/format';
import { useSellerAnalytics, type Granularity } from '@/features/seller/profile/api';

const defaultFrom = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};
const defaultTo = () => new Date().toISOString().slice(0, 10);

export const MyAnalyticsPage = () => {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [granularity, setGranularity] = useState<Granularity>('daily');

  const query = useMemo(
    () => ({
      from: `${from}T00:00:00.000Z`,
      to: `${to}T23:59:59.999Z`,
      granularity,
    }),
    [from, to, granularity],
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useSellerAnalytics(query);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="My analytics"
        description="Your sales, earnings, inventory, customers, and trade activity for any date range."
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Date range</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
            <TextField
              label="From"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 180 }}
            />
            <TextField
              label="To"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 180 }}
            />
            <TextField
              select
              label="Granularity"
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as Granularity)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      {isLoading && (
        <MuiBox
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' },
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </MuiBox>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load analytics'}
        </div>
      )}

      {data && (
        <>
          <SectionTitle icon={ShoppingBag} title="Sales" />
          <MuiBox sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' } }}>
            <Metric label="Orders" value={String(data.sales.totalOrders)} />
            <Metric label="Revenue" value={formatInr(data.sales.totalRevenueInr)} />
            <Metric label="Average order" value={formatInr(data.sales.averageOrderValueInr)} />
          </MuiBox>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Timeseries</CardTitle>
              <CardDescription>
                Bucketed by {granularity}. We'll add a chart later — table for now.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Scrollbar>
                <Table sx={{ minWidth: 800 }}>
                  <TableHeadCustom
                    headLabel={[
                      { id: 'bucket', label: 'Bucket' },
                      { id: 'orders', label: 'Orders', align: 'right' as const },
                      { id: 'revenue', label: 'Revenue', align: 'right' as const },
                    ]}
                  />
                  <TableBody>
                    {data.sales.timeseries.map((b) => (
                      <TableRow key={b.bucket} hover>
                        <TableCell>{b.bucket}</TableCell>
                        <TableCell align="right">{b.orders}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatInr(b.revenueInr)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableNoData notFound={data.sales.timeseries.length === 0} />
                  </TableBody>
                </Table>
              </Scrollbar>
            </CardContent>
          </Card>

          <SectionTitle icon={Wallet} title="Earnings" />
          <MuiBox sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(5,1fr)' } }}>
            <Metric label="Gross" value={formatInr(data.earnings.grossInr)} />
            <Metric
              label="Commission"
              value={`− ${formatInr(data.earnings.commissionInr)}`}
              muted
            />
            <Metric
              label="Platform fees"
              value={`− ${formatInr(data.earnings.platformFeesInr)}`}
              muted
            />
            <Metric label="Net paid" value={formatInr(data.earnings.netPaidInr)} highlight />
            <Metric label="Pending" value={formatInr(data.earnings.pendingInr)} />
          </MuiBox>

          <SectionTitle icon={BoxIcon} title="Inventory" />
          <MuiBox sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(4,1fr)' } }}>
            <Metric label="Live products" value={String(data.inventory.liveProducts)} />
            <Metric
              label="Low stock"
              value={String(data.inventory.lowStockProducts)}
              warning={data.inventory.lowStockProducts > 0}
            />
            <Metric
              label="Out of stock"
              value={String(data.inventory.outOfStockProducts)}
              warning={data.inventory.outOfStockProducts > 0}
            />
            <Metric label="Units on hand" value={String(data.inventory.totalUnitsInStock)} />
          </MuiBox>

          <SectionTitle icon={Users} title="Customers" />
          <MuiBox sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(4,1fr)' } }}>
            <Metric label="Unique buyers" value={String(data.customers.uniqueBuyers)} />
            <Metric label="Repeat buyers" value={String(data.customers.repeatBuyers)} />
            <Metric
              label="Average rating"
              value={data.customers.averageRating ? data.customers.averageRating.toFixed(1) : '—'}
            />
            <Metric label="Total reviews" value={String(data.customers.totalReviews)} />
          </MuiBox>

          <SectionTitle icon={BarChart3} title="Order status breakdown" />
          <MuiBox sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(6,1fr)' } }}>
            {(Object.entries(data.orderStatus) as Array<[keyof typeof data.orderStatus, number]>).map(([k, v]) => (
              <Metric key={k} label={k} value={String(v)} muted={v === 0} />
            ))}
          </MuiBox>

          <SectionTitle icon={Star} title="Top products" />
          <Card>
            <CardContent className="p-0">
              <Scrollbar>
                <Table sx={{ minWidth: 800 }}>
                  <TableHeadCustom
                    headLabel={[
                      { id: 'product', label: 'Product' },
                      { id: 'units', label: 'Units sold', align: 'right' as const },
                      { id: 'revenue', label: 'Revenue', align: 'right' as const },
                    ]}
                  />
                  <TableBody>
                    {data.productPerformance.map((r) => (
                      <TableRow key={r.productId} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                        <TableCell align="right">{r.unitsSold}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatInr(r.revenueInr)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableNoData notFound={data.productPerformance.length === 0} />
                  </TableBody>
                </Table>
              </Scrollbar>
            </CardContent>
          </Card>

          <SectionTitle icon={Wallet} title="Trade activity" />
          <MuiBox sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)', lg: 'repeat(6,1fr)' } }}>
            <Metric label="Trades placed" value={String(data.trade.tradesPlaced)} />
            <Metric label="Trades received" value={String(data.trade.tradesReceived)} />
            <Metric label="Trade revenue" value={formatInr(data.trade.tradeRevenueInr)} />
            <Metric label="Trade spend" value={formatInr(data.trade.tradeSpendInr)} />
            <Metric label="Online tx" value={String(data.trade.onlineCount)} />
            <Metric label="Cash tx" value={String(data.trade.cashCount)} />
          </MuiBox>

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Range {formatDate(data.range.from)} → {formatDate(data.range.to)}
          </Typography>
        </>
      )}
    </Stack>
  );
};

const SectionTitle = ({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) => (
  <Typography
    variant="h6"
    sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 2 }}
  >
    <Icon className="h-4 w-4 text-muted-foreground" />
    {title}
  </Typography>
);

const Metric = ({
  label,
  value,
  highlight,
  warning,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warning?: boolean;
  muted?: boolean;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription>{label}</CardDescription>
      <CardTitle
        className={`text-2xl ${
          highlight
            ? 'text-emerald-700'
            : warning
              ? 'text-amber-700'
              : muted
                ? 'text-muted-foreground'
                : ''
        }`}
      >
        {value}
      </CardTitle>
    </CardHeader>
  </Card>
);
