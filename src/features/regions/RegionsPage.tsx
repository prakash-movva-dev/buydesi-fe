import { useMemo, useState } from 'react';
import { Download, Map, Pencil, Plus, Trash2 } from 'lucide-react';
import MuiCard from '@mui/material/Card';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Badge } from '@/components/ui/Badge';
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
import { StatCard } from '@/components/ui/StatCard';
import { DateField } from '@/components/ui/DateField';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData } from '@/components/table';
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

const REGIONS_HEAD = (canManage: boolean) => [
  { id: 'name', label: 'Name' },
  { id: 'state', label: 'State' },
  { id: 'clusters', label: 'Clusters', align: 'right' as const },
  ...(canManage ? [{ id: 'edit', label: '' }] : []),
  ...(canManage ? [{ id: 'delete', label: '' }] : []),
];

const PERF_HEAD = [
  { id: 'cluster', label: 'Cluster' },
  { id: 'state', label: 'State' },
  { id: 'sellers', label: 'Sellers', align: 'right' as const },
  { id: 'live', label: 'Live listings', align: 'right' as const },
  { id: 'orders', label: 'Orders', align: 'right' as const },
  { id: 'revenue', label: 'Revenue', align: 'right' as const },
  { id: 'tickets', label: 'Open tickets', align: 'right' as const },
];

export const RegionsPage = () => {
  const { user } = useAuth();
  // Regions are a Super / Sub-Super Admin grouping + analytics concern.
  const canManage =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const { data: regions, isLoading, isError, error } = useRegionsList();
  const deleteMut = useDeleteRegion();

  const [tab, setTab] = useState<'list' | 'performance'>('list');
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
    <Stack spacing={3}>
      <PageHeader
        title="Regions"
        description="A region groups multiple clusters for oversight and aggregated performance reporting. Grouping clusters here does not change each cluster's operational scoping."
        action={
          canManage && tab === 'list' ? (
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New region
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="list" label="List" />
        <Tab value="performance" label="Performance" />
      </Tabs>

      {tab === 'list' && isLoading && <Skeleton className="h-40 w-full" />}
      {tab === 'list' && isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load regions'}
        </div>
      )}

      {tab === 'list' && !isLoading && !isError && (
        <MuiCard>
          <Scrollbar>
            <Table sx={{ minWidth: 800 }}>
              <TableHeadCustom headLabel={REGIONS_HEAD(canManage)} />
              <TableBody>
                {(regions ?? []).map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{r.name}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', typography: 'caption' }}>
                      {r.state ?? '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Badge variant="muted">{r.clusterIds.length}</Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell align="right">
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
                      <TableCell align="right">
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
                <TableNoData notFound={!isLoading && (regions?.length ?? 0) === 0} />
              </TableBody>
            </Table>
          </Scrollbar>
        </MuiCard>
      )}

      {/* ─── Region performance ───────────────────────────────────────────── */}
      {tab === 'performance' && (
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
          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="flex-end">
            <TextField
              select
              id="perf-region"
              label="Region"
              value={perfRegionId}
              onChange={(e) => setPerfRegionId(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 224 }}
            >
              <MenuItem value="">Select a region…</MenuItem>
              {(regions ?? []).map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>
            <DateField
              label="From"
              value={from}
              onChange={setFrom}
              sx={{ width: 160 }}
            />
            <DateField
              label="To"
              value={to}
              onChange={setTo}
              sx={{ width: 160 }}
            />
            <Button
              variant="outline"
              onClick={download}
              disabled={!perfRegionId || downloading}
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Preparing…' : 'Download CSV'}
            </Button>
          </Stack>

          {downloadError && <p className="text-sm text-destructive">{downloadError}</p>}

          {!perfRegionId && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Pick a region above to see aggregated performance.
            </Typography>
          )}

          {perfRegionId && perf.isLoading && <Skeleton className="h-40 w-full" />}
          {perfRegionId && perf.isError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {perf.error instanceof Error ? perf.error.message : 'Failed to load performance'}
            </div>
          )}

          {perfRegionId && perf.data && (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    lg: 'repeat(5, 1fr)',
                  },
                }}
              >
                <StatCard label="Sellers" value={String(perf.data.totals.sellers)} />
                <StatCard
                  label="Live listings"
                  value={String(perf.data.totals.liveListings)}
                />
                <StatCard label="Orders" value={String(perf.data.totals.orders)} />
                <StatCard label="Revenue" value={formatInr(perf.data.totals.revenueInr)} />
                <StatCard
                  label="Open tickets"
                  value={String(perf.data.totals.openTickets)}
                />
              </Box>

              <Scrollbar>
                <Table sx={{ minWidth: 800 }}>
                  <TableHeadCustom headLabel={PERF_HEAD} />
                  <TableBody>
                    {perf.data.rows.map((row) => (
                      <TableRow key={row.clusterId} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{row.clusterName}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', typography: 'caption' }}>
                          {row.state}
                        </TableCell>
                        <TableCell align="right">{row.sellers}</TableCell>
                        <TableCell align="right">{row.liveListings}</TableCell>
                        <TableCell align="right">{row.orders}</TableCell>
                        <TableCell align="right">{formatInr(row.revenueInr)}</TableCell>
                        <TableCell align="right">{row.openTickets}</TableCell>
                      </TableRow>
                    ))}
                    <TableNoData notFound={perf.data.rows.length === 0} />
                  </TableBody>
                </Table>
              </Scrollbar>
            </>
          )}
        </CardContent>
      </Card>
      )}

      <RegionFormDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
      />
    </Stack>
  );
};
