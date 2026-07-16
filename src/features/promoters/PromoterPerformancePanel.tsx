import { useState } from 'react';
import { Download } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData } from '@/components/table';
import { useAuth } from '@/lib/auth';
import { formatInr } from '@/lib/format';
import { UserRole } from '@/types/api';
import { downloadPromoterPerformanceCsv, usePromoterPerformance } from './api';

/**
 * CA-4 promoter performance (story 3.11). Cluster-scoped summary: super-tier
 * admins pick a cluster (or view all); regional admins are auto-scoped by the
 * backend so no picker is shown.
 */
export const PromoterPerformancePanel = () => {
  const { user } = useAuth();
  const isSuper =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const [clusterId, setClusterId] = useState<string | null>(null);
  const scope = isSuper ? clusterId ?? undefined : undefined;

  const { data, isLoading, isError, error } = usePromoterPerformance(scope);

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const onDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadPromoterPerformanceCsv(scope);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <CardTitle>Performance</CardTitle>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            {isSuper && (
              <ClusterPicker
                value={clusterId}
                onChange={setClusterId}
                placeholder="All clusters"
                className="w-56"
              />
            )}
            <Button variant="outline" size="sm" onClick={onDownload} disabled={downloading}>
              <Download className="h-4 w-4" />
              {downloading ? 'Preparing…' : 'Download CSV'}
            </Button>
          </Stack>
        </Box>
      </CardHeader>
      <CardContent className="space-y-4">
        {downloadError && <p className="text-sm text-destructive">{downloadError}</p>}

        {isLoading && <Skeleton className="h-40 w-full" />}
        {isError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load performance'}
          </div>
        )}

        {!isLoading && !isError && data && (
          <>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' },
              }}
            >
              <StatCard label="Total promoters" value={data.totalPromoters} />
              <StatCard label="Total coupon uses" value={data.totalUses} />
              <StatCard label="Total discount given" value={formatInr(data.totalDiscountInr)} />
            </Box>

            <div>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Top performers
              </Typography>
              <Scrollbar>
                <Table sx={{ minWidth: 480 }}>
                  <TableHeadCustom
                    headLabel={[
                      { id: 'promoter', label: 'Promoter' },
                      { id: 'uses', label: 'Uses', align: 'right' },
                      { id: 'discount', label: 'Discount given', align: 'right' },
                    ]}
                  />
                  <TableBody>
                    {data.topPerformers.map((p) => (
                      <TableRow key={p.promoterId} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                        <TableCell align="right">{p.uses}</TableCell>
                        <TableCell align="right">{formatInr(p.totalDiscountInr)}</TableCell>
                      </TableRow>
                    ))}
                    <TableNoData notFound={data.topPerformers.length === 0} />
                  </TableBody>
                </Table>
              </Scrollbar>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
