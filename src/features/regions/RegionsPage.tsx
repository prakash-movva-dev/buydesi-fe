import { useMemo, useState } from 'react';
import { Download, Map, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
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
import { UserRole } from '@/types/api';
import {
  downloadRegionPerformanceCsv,
  useDeleteRegion,
  useRegionPerformance,
  useRegionsList,
} from './api';
import { RegionFormDialog } from './RegionFormDialog';
import type { SafeRegion } from './types';

const defaultFrom = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

const defaultTo = (): string => new Date().toISOString().slice(0, 10);

interface TotalCardProps {
  label: string;
  value: string;
}

const TotalCard = ({ label, value }: TotalCardProps) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </CardContent>
  </Card>
);

export const RegionsPage = () => {
  const { user } = useAuth();
  // Regions are a Super / Sub-Super Admin grouping + analytics concern.
  const canManage =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const { data: regions, isLoading, isError, error } = useRegionsList();
  const deleteMut = useDeleteRegion();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SafeRegion | null>(null);

  // ─── Region performance section ───────────────────────────────────────────
  const [perfRegionId, setPerfRegionId] = useState('');
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isoRange = useMemo(
    () => ({ from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z` }),
    [from, to],
  );

  const perf = useRegionPerformance(perfRegionId || undefined, isoRange, Boolean(perfRegionId));

  const download = async () => {
    if (!perfRegionId) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadRegionPerformanceCsv(perfRegionId, isoRange);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = (region: SafeRegion) => {
    if (!window.confirm(`Delete region "${region.name}"? This cannot be undone.`)) return;
    deleteMut.mutate(region.id);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Regions</h1>
          <p className="text-muted-foreground">
            A region groups multiple clusters for oversight and aggregated performance
            reporting. Grouping clusters here does not change each cluster's operational
            scoping.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New region
          </Button>
        )}
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}
      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load regions'}
        </div>
      )}

      {!isLoading && !isError && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Clusters</TableHead>
              {canManage && <TableHead className="w-px" />}
              {canManage && <TableHead className="w-px" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(regions ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.state ?? '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="muted">{r.clusterIds.length}</Badge>
                </TableCell>
                {canManage && (
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(r);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                )}
                {canManage && (
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(r)}
                      disabled={deleteMut.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {(regions?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 5 : 3}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No regions yet. Create one to group clusters together.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* ─── Region performance ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Region performance
          </CardTitle>
          <CardDescription>
            Aggregated performance across all clusters in a region for the selected window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="perf-region">Region</Label>
              <Select
                id="perf-region"
                value={perfRegionId}
                onChange={(e) => setPerfRegionId(e.target.value)}
                className="w-56"
              >
                <option value="">Select a region…</option>
                {(regions ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="perf-from">From</Label>
              <Input
                id="perf-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="perf-to">To</Label>
              <Input
                id="perf-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button
              variant="outline"
              onClick={download}
              disabled={!perfRegionId || downloading}
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Preparing…' : 'Download CSV'}
            </Button>
          </div>

          {downloadError && <p className="text-sm text-destructive">{downloadError}</p>}

          {!perfRegionId && (
            <p className="text-sm text-muted-foreground">
              Pick a region above to see aggregated performance.
            </p>
          )}

          {perfRegionId && perf.isLoading && <Skeleton className="h-40 w-full" />}
          {perfRegionId && perf.isError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {perf.error instanceof Error ? perf.error.message : 'Failed to load performance'}
            </div>
          )}

          {perfRegionId && perf.data && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <TotalCard label="Sellers" value={String(perf.data.totals.sellers)} />
                <TotalCard
                  label="Live listings"
                  value={String(perf.data.totals.liveListings)}
                />
                <TotalCard label="Orders" value={String(perf.data.totals.orders)} />
                <TotalCard label="Revenue" value={formatInr(perf.data.totals.revenueInr)} />
                <TotalCard
                  label="Open tickets"
                  value={String(perf.data.totals.openTickets)}
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cluster</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="text-right">Sellers</TableHead>
                    <TableHead className="text-right">Live listings</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Open tickets</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perf.data.rows.map((row) => (
                    <TableRow key={row.clusterId}>
                      <TableCell className="font-medium">{row.clusterName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.state}
                      </TableCell>
                      <TableCell className="text-right">{row.sellers}</TableCell>
                      <TableCell className="text-right">{row.liveListings}</TableCell>
                      <TableCell className="text-right">{row.orders}</TableCell>
                      <TableCell className="text-right">{formatInr(row.revenueInr)}</TableCell>
                      <TableCell className="text-right">{row.openTickets}</TableCell>
                    </TableRow>
                  ))}
                  {perf.data.rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        This region has no clusters assigned.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <RegionFormDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
};
