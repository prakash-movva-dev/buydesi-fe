import { useQuery } from '@tanstack/react-query';
import { ReceiptText } from 'lucide-react';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData } from '@/components/table';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { CommissionRate } from '@/features/commission/types';

interface MyCommissionResponse {
  defaultRatePercent: number;
  rates: CommissionRate[];
}

export const MyCommissionPage = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['commission', 'mine'],
    queryFn: () => api.get<MyCommissionResponse>('/commission/rates/mine'),
  });

  const rates = data?.rates ?? [];

  const head = [
    { id: 'scope', label: 'Scope' },
    { id: 'target', label: 'Target' },
    { id: 'rate', label: 'Rate', align: 'right' as const },
    { id: 'active', label: 'Active' },
    { id: 'from', label: 'From' },
    { id: 'to', label: 'To' },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="My commission"
        description="Rates the platform deducts from each sale. Resolution order: seller-specific override → product-specific → category-specific → category default. The most specific live rule wins."
      />

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Default applied when no override matches</CardDescription>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <CardTitle className="text-3xl">{data?.defaultRatePercent ?? 0}%</CardTitle>
          )}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="h-4 w-4" />
            Rules that could apply to me
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <Skeleton className="m-4 h-40" />}
          {isError && (
            <Typography variant="body2" sx={{ p: 2, color: 'error.main' }}>
              {error instanceof Error ? error.message : 'Failed to load rules'}
            </Typography>
          )}
          {!isLoading && !isError && (
            <Scrollbar>
              <Table sx={{ minWidth: 800 }}>
                <TableHeadCustom headLabel={head} />
                <TableBody>
                  {rates.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        <Badge variant="muted">{r.scope}</Badge>
                      </TableCell>
                      <TableCell sx={{ typography: 'caption' }}>
                        {r.targetName ?? '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {r.ratePercent}%
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.active ? 'success' : 'muted'}>
                          {r.active ? 'active' : 'inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell sx={{ typography: 'caption' }}>{formatDate(r.effectiveFrom)}</TableCell>
                      <TableCell sx={{ typography: 'caption' }}>
                        {r.effectiveTo ? formatDate(r.effectiveTo) : 'open-ended'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableNoData notFound={!isLoading && !isError && rates.length === 0} />
                </TableBody>
              </Table>
            </Scrollbar>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};
