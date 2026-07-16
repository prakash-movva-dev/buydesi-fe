import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Calendar, Download } from 'lucide-react';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData } from '@/components/table';
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

const HEAD = [
  { id: 'farm', label: 'Farm name' },
  { id: 'orders', label: 'Orders', align: 'right' as const },
  { id: 'fulfilled', label: 'Fulfilled', align: 'right' as const },
  { id: 'returned', label: 'Returned', align: 'right' as const },
  { id: 'rating', label: 'Avg rating', align: 'right' as const },
  { id: 'complaints', label: 'Complaints', align: 'right' as const },
  { id: 'revenue', label: 'Revenue', align: 'right' as const },
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
    <Stack spacing={3}>
      <PageHeader
        title="Seller performance"
        description="Per-seller orders, fulfilment, returns, ratings, complaints and revenue for a chosen date range. Cluster admins are auto-scoped to their cluster; super admin can pin to a specific cluster or leave blank for platform-wide."
      />

      <Card sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <Calendar className="h-4 w-4" />
          <Typography variant="subtitle1">Filters</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Defaults to the last 30 days.
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="flex-end">
          <DateField
            label="From"
            value={from}
            onChange={setFrom}
            sx={{ width: 180 }}
          />
          <DateField
            label="To"
            value={to}
            onChange={setTo}
            sx={{ width: 180 }}
          />
          <TextField
            select
            id="sp-sort"
            label="Sort by"
            value={sort}
            onChange={(e) => setSort(e.target.value as SellerPerformanceSort)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 180 }}
          >
            {sortOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          {isSuper && (
            <Box sx={{ width: 288 }}>
              <Typography
                variant="caption"
                sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}
              >
                Cluster (optional)
              </Typography>
              <ClusterPicker
                value={clusterId || null}
                onChange={(id) => setClusterId(id ?? '')}
                placeholder="Blank = all clusters"
              />
            </Box>
          )}
          <Button type="button" variant="outline" onClick={onDownload} disabled={downloading}>
            <Download className="h-4 w-4" />
            {downloading ? 'Downloading…' : 'Download CSV'}
          </Button>
        </Stack>
        {runError && (
          <Typography variant="body2" sx={{ mt: 1.5, color: 'error.main' }}>
            {runError}
          </Typography>
        )}
        {downloadError && (
          <Typography variant="body2" sx={{ mt: 1.5, color: 'error.main' }}>
            {downloadError}
          </Typography>
        )}
      </Card>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <Scrollbar>
            <Table sx={{ minWidth: 800 }}>
              <TableHeadCustom headLabel={HEAD} />
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.sellerId} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{row.farmName}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.orders}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.fulfilled}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.returned}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.avgRating != null ? row.avgRating.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.complaints}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatInr(row.revenueInr)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableNoData notFound={!isLoading && rows.length === 0} />
              </TableBody>
            </Table>
          </Scrollbar>
        </Card>
      )}
    </Stack>
  );
};
