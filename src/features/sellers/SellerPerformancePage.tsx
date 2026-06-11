import { useState } from 'react';
import { Calendar, Download } from 'lucide-react';
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
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { useAuth } from '@/lib/auth';
import { formatInr } from '@/lib/format';
import { ApiError, UserRole } from '@/types/api';
import { downloadSellerPerformanceCsv, useSellerPerformance } from './api';
import type { SellerPerformanceSort } from './types';

// Default to the last 30 days.
const defaultFrom = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

const defaultTo = (): string => new Date().toISOString().slice(0, 10);

const sortOptions: { value: SellerPerformanceSort; label: string }[] = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'orders', label: 'Orders' },
  { value: 'rating', label: 'Avg rating' },
];

export const SellerPerformancePage = () => {
  const { user } = useAuth();
  const isSuper =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [clusterId, setClusterId] = useState('');
  const [sort, setSort] = useState<SellerPerformanceSort>('revenue');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const isoFrom = `${from}T00:00:00.000Z`;
  const isoTo = `${to}T23:59:59.999Z`;

  const query = {
    from: isoFrom,
    to: isoTo,
    sort,
    clusterId: isSuper ? clusterId.trim() || undefined : undefined,
  };

  const { data, isLoading, isError, error } = useSellerPerformance(query);

  const onDownload = async () => {
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadSellerPerformanceCsv(query);
    } catch (err) {
      setDownloadError((err as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  const runError =
    error instanceof ApiError
      ? error.message
      : isError
        ? 'Failed to load seller performance'
        : null;

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Seller performance</h1>
        <p className="text-muted-foreground">
          Per-seller orders, fulfilment, returns, ratings, complaints and revenue for a chosen
          date range. Cluster admins are auto-scoped to their cluster; super admin can pin to a
          specific cluster or leave blank for platform-wide.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Defaults to the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sp-from">From</Label>
              <Input
                id="sp-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-to">To</Label>
              <Input id="sp-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-sort">Sort by</Label>
              <Select
                id="sp-sort"
                className="w-40"
                value={sort}
                onChange={(e) => setSort(e.target.value as SellerPerformanceSort)}
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
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
            <Button type="button" variant="outline" onClick={onDownload} disabled={downloading}>
              <Download className="h-4 w-4" />
              {downloading ? 'Downloading…' : 'Download CSV'}
            </Button>
          </div>
          {runError && <p className="mt-3 text-sm text-destructive">{runError}</p>}
          {downloadError && <p className="mt-3 text-sm text-destructive">{downloadError}</p>}
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Farm name</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Fulfilled</TableHead>
              <TableHead className="text-right">Returned</TableHead>
              <TableHead className="text-right">Avg rating</TableHead>
              <TableHead className="text-right">Complaints</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No seller activity in this range.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.sellerId}>
                  <TableCell className="font-medium">{row.farmName}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.orders}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.fulfilled}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.returned}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.avgRating != null ? row.avgRating.toFixed(2) : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.complaints}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInr(row.revenueInr)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
