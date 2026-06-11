import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatInr } from '@/lib/format';
import { useCluster, useClusterPerformance, useClusterStats } from './api';
import type { ClusterStatus } from './types';

const statusVariant: Record<ClusterStatus, 'success' | 'warning' | 'muted'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'muted',
};

// Default to the last 30 days for the single-cluster performance card.
const last30 = (): { from: string; to: string } => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: `${from.toISOString().slice(0, 10)}T00:00:00.000Z`,
    to: `${to.toISOString().slice(0, 10)}T23:59:59.999Z`,
  };
};

export const ClusterDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  const cluster = useCluster(id);
  const stats = useClusterStats(id);

  const range = useMemo(last30, []);
  const performance = useClusterPerformance(
    { from: range.from, to: range.to, clusterId: id ?? '' },
    Boolean(id),
  );

  const perfRow = performance.data?.rows.find((r) => r.clusterId === id) ?? performance.data?.rows[0];

  const c = cluster.data;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/clusters"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clusters
      </Link>

      {cluster.isLoading && <Skeleton className="h-24 w-full" />}
      {cluster.isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {cluster.error instanceof Error ? cluster.error.message : 'Failed to load cluster'}
        </div>
      )}

      {c && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
                <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
              </div>
              <p className="text-muted-foreground">
                {c.state} · {c.district}
                {c.zone ? ` · ${c.zone}` : ''} · default transport{' '}
                <span className="font-medium">{c.defaultTradeTransport}</span>
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cluster stats</CardTitle>
              <CardDescription>Current sellers, pin codes and active categories.</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.isLoading && <Skeleton className="h-20 w-full" />}
              {stats.isError && (
                <p className="text-sm text-destructive">
                  {stats.error instanceof Error ? stats.error.message : 'Failed to load stats'}
                </p>
              )}
              {stats.data && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Stat label="Sellers" value={String(stats.data.sellerCount)} />
                  <Stat label="Pin codes served" value={String(stats.data.pinCodeCount)} />
                  <Stat label="Active categories" value={String(stats.data.activeCategoryCount)} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance (last 30 days)</CardTitle>
              <CardDescription>
                {range.from.slice(0, 10)} → {range.to.slice(0, 10)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {performance.isLoading && <Skeleton className="h-20 w-full" />}
              {performance.isError && (
                <p className="text-sm text-destructive">
                  {performance.error instanceof Error
                    ? performance.error.message
                    : 'Failed to load performance'}
                </p>
              )}
              {performance.data && !perfRow && (
                <p className="text-sm text-muted-foreground">
                  No performance data for this cluster in the selected range.
                </p>
              )}
              {perfRow && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Stat label="Orders" value={String(perfRow.orders)} />
                  <Stat label="Revenue (₹)" value={formatInr(perfRow.revenueInr)} />
                  <Stat label="Live listings" value={String(perfRow.liveListings)} />
                  <Stat label="Open tickets" value={String(perfRow.openTickets)} />
                  <Stat
                    label="Avg delivery"
                    value={
                      perfRow.avgDeliveryHours
                        ? `${perfRow.avgDeliveryHours.toFixed(1)} h`
                        : '—'
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-muted/30 p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="mt-1 text-2xl font-semibold">{value}</div>
  </div>
);
