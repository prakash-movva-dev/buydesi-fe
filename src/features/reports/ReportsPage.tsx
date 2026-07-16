import { useMemo, useState, type FormEvent } from 'react';
import { ArrowUpDown, Calendar, Download, Play } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Skeleton } from '@/components/ui/Skeleton';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData } from '@/components/table';
import { useAuth } from '@/lib/auth';
import { formatInr } from '@/lib/format';
import { ApiError, UserRole } from '@/types/api';
import {
  downloadClusterPerformanceCsv,
  downloadReportCsv,
  useClusterPerformanceReport,
  useRunReport,
} from './api';

// Default to the last 30 days.
const defaultFrom = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

const defaultTo = (): string => new Date().toISOString().slice(0, 10);

export const ReportsPage = () => {
  const { user } = useAuth();
  const isSuper =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [clusterId, setClusterId] = useState('');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const run = useRunReport();

  const isoFrom = `${from}T00:00:00.000Z`;
  const isoTo = `${to}T23:59:59.999Z`;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setDownloadError(null);
    run.mutate({
      from: isoFrom,
      to: isoTo,
      clusterId: isSuper ? clusterId.trim() || undefined : undefined,
    });
  };

  const onDownload = async () => {
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadReportCsv({
        from: isoFrom,
        to: isoTo,
        clusterId: isSuper ? clusterId.trim() || undefined : undefined,
      });
    } catch (err) {
      setDownloadError((err as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  // Cluster performance section (super / sub-super only).
  const [sortDesc, setSortDesc] = useState(true);
  const [clusterDownloadError, setClusterDownloadError] = useState<string | null>(null);
  const [clusterDownloading, setClusterDownloading] = useState(false);

  const clusterPerf = useClusterPerformanceReport(
    { from: isoFrom, to: isoTo },
    isSuper,
  );

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

  const clusterPerfError =
    clusterPerf.error instanceof ApiError
      ? clusterPerf.error.message
      : clusterPerf.isError
        ? 'Cluster performance failed to load'
        : null;

  const result = run.data;
  const runError =
    run.error instanceof ApiError
      ? run.error.message
      : run.isError
        ? 'Report generation failed'
        : null;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Reports"
        description="Aggregated totals across orders, payouts and support volume for a chosen date range. Cluster admins are auto-scoped to their cluster; super admin can pin to a specific cluster or leave blank for platform-wide."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Range
          </CardTitle>
          <CardDescription>Defaults to the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-from">From</Label>
              <Input
                id="r-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-to">To</Label>
              <Input
                id="r-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
            </div>
            {isSuper && (
              <div className="space-y-1.5">
                <Label>Cluster (optional)</Label>
                <div className="w-72">
                  <ClusterPicker
                    value={clusterId || null}
                    onChange={(id) => setClusterId(id ?? '')}
                    placeholder="Blank = all clusters"
                  />
                </div>
              </div>
            )}
            <Button type="submit" disabled={run.isPending}>
              <Play className="h-4 w-4" />
              {run.isPending ? 'Running…' : 'Run report'}
            </Button>
            <Button type="button" variant="outline" onClick={onDownload} disabled={downloading}>
              <Download className="h-4 w-4" />
              {downloading ? 'Downloading…' : 'Download CSV'}
            </Button>
          </form>
          {runError && <p className="mt-3 text-sm text-destructive">{runError}</p>}
          {downloadError && (
            <p className="mt-3 text-sm text-destructive">{downloadError}</p>
          )}
        </CardContent>
      </Card>

      {run.isPending && (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' } }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </Box>
      )}

      {result && (
        <>
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            alignItems="center"
            sx={{ color: 'text.secondary', fontSize: 14 }}
          >
            <span>
              {result.range.from.slice(0, 10)} → {result.range.to.slice(0, 10)}
            </span>
            <span>·</span>
            {result.scope.clusterName ? (
              <Typography component="span" variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Cluster: {result.scope.clusterName}
              </Typography>
            ) : (
              <span>All clusters (platform-wide)</span>
            )}
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' },
            }}
          >
            <StatCard
              label="Orders placed"
              value={String(result.orders.count)}
              secondary={`${result.orders.cancelledCount} cancelled`}
            />
            <StatCard label="GMV (₹)" value={formatInr(result.orders.gmvInr)} />
            <StatCard
              label="Payouts paid"
              value={String(result.payouts.count)}
              secondary={`Net ${formatInr(result.payouts.paidNetInr)}`}
            />
            <StatCard
              label="Support tickets opened"
              value={String(result.support.ticketsOpened)}
            />
            <StatCard
              label="Support tickets resolved"
              value={String(result.support.ticketsResolved)}
            />
            <StatCard label="Sellers" value={String(result.sellers)} />
            <StatCard label="Live listings" value={String(result.listings)} />
            <StatCard
              label="Avg delivery time"
              value={result.avgDeliveryHours != null ? `${result.avgDeliveryHours} hrs` : '—'}
            />
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Net payout per order (avg)</CardDescription>
                <CardTitle className="text-2xl">
                  {result.payouts.count > 0
                    ? formatInr(result.payouts.paidNetInr / result.payouts.count)
                    : '—'}
                </CardTitle>
              </CardHeader>
            </Card>
          </Box>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top products sold</CardTitle>
              <CardDescription>
                Best-selling products in this window — what actually moved, not just order count.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sales in this period.</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {result.topProducts.map((p, i) => (
                    <li key={p.productId} className="flex items-center justify-between py-2">
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">{i + 1}.</span>
                        {p.name}
                      </span>
                      <span className="text-muted-foreground">
                        {p.units} units · {formatInr(p.revenueInr)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!run.isPending && !result && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Pick a date range and click "Run report".
          </CardContent>
        </Card>
      )}

      {isSuper && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base">Cluster performance</CardTitle>
              <CardDescription>
                Per-cluster sellers, listings, orders, revenue, open tickets and average
                delivery time for {from} → {to}.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onClusterDownload}
              disabled={clusterDownloading}
            >
              <Download className="h-4 w-4" />
              {clusterDownloading ? 'Downloading…' : 'Download CSV'}
            </Button>
          </CardHeader>
          <CardContent>
            {clusterPerf.isLoading && <Skeleton className="h-40 w-full" />}
            {clusterPerfError && <p className="text-sm text-destructive">{clusterPerfError}</p>}
            {clusterDownloadError && (
              <p className="mb-3 text-sm text-destructive">{clusterDownloadError}</p>
            )}
            {!clusterPerf.isLoading && !clusterPerfError && (
              <Scrollbar>
                <Table sx={{ minWidth: 900 }}>
                  <TableHeadCustom
                    headLabel={[
                      { id: 'cluster', label: 'Cluster' },
                      { id: 'state', label: 'State' },
                      { id: 'sellers', label: 'Sellers', align: 'right' },
                      { id: 'listings', label: 'Live listings', align: 'right' },
                      { id: 'orders', label: 'Orders', align: 'right' },
                      {
                        id: 'revenue',
                        align: 'right',
                        label: (
                          <Box
                            component="button"
                            type="button"
                            onClick={() => setSortDesc((d) => !d)}
                            sx={{
                              ml: 'auto',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              border: 0,
                              bgcolor: 'transparent',
                              cursor: 'pointer',
                              font: 'inherit',
                              color: 'inherit',
                            }}
                          >
                            Revenue
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </Box>
                        ),
                      },
                      { id: 'tickets', label: 'Open tickets', align: 'right' },
                      { id: 'delivery', label: 'Avg delivery', align: 'right' },
                    ]}
                  />
                  <TableBody>
                    {sortedRows.map((r) => (
                      <TableRow key={r.clusterId} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{r.clusterName}</TableCell>
                        <TableCell>{r.state}</TableCell>
                        <TableCell align="right">{r.sellers}</TableCell>
                        <TableCell align="right">{r.liveListings}</TableCell>
                        <TableCell align="right">{r.orders}</TableCell>
                        <TableCell align="right">{formatInr(r.revenueInr)}</TableCell>
                        <TableCell align="right">{r.openTickets}</TableCell>
                        <TableCell align="right">
                          {r.avgDeliveryHours ? `${r.avgDeliveryHours.toFixed(1)} h` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableNoData notFound={sortedRows.length === 0} />
                  </TableBody>
                </Table>
              </Scrollbar>
            )}
          </CardContent>
        </Card>
      )}
    </Stack>
  );
};
