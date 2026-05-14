import { useState, type FormEvent } from 'react';
import { Calendar, Download, Play } from 'lucide-react';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { Button } from '@/components/ui/Button';
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
import { useAuth } from '@/lib/auth';
import { formatInr } from '@/lib/format';
import { ApiError, UserRole } from '@/types/api';
import { downloadReportCsv, useRunReport } from './api';

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

  const result = run.data;
  const runError =
    run.error instanceof ApiError
      ? run.error.message
      : run.isError
        ? 'Report generation failed'
        : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Aggregated totals across orders, payouts and support volume for a chosen date range.
          Cluster admins are auto-scoped to their cluster; super admin can pin to a specific
          cluster or leave blank for platform-wide.
        </p>
      </div>

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
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {result && (
        <>
          <div className="text-sm text-muted-foreground">
            {result.range.from.slice(0, 10)} → {result.range.to.slice(0, 10)}
            {result.scope.clusterId && (
              <>
                {' '}· cluster <span className="font-mono">{result.scope.clusterId.slice(-10)}</span>
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Orders placed"
              value={String(result.orders.count)}
              secondary={`${result.orders.cancelledCount} cancelled`}
            />
            <MetricCard label="GMV (₹)" value={formatInr(result.orders.gmvInr)} />
            <MetricCard
              label="Payouts paid"
              value={String(result.payouts.count)}
              secondary={`Net ${formatInr(result.payouts.paidNetInr)}`}
            />
            <MetricCard
              label="Support tickets opened"
              value={String(result.support.ticketsOpened)}
            />
            <MetricCard
              label="Support tickets resolved"
              value={String(result.support.ticketsResolved)}
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
          </div>
        </>
      )}

      {!run.isPending && !result && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Pick a date range and click "Run report".
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription>{label}</CardDescription>
      <CardTitle className="text-3xl">{value}</CardTitle>
      {secondary && <p className="text-xs text-muted-foreground">{secondary}</p>}
    </CardHeader>
  </Card>
);
