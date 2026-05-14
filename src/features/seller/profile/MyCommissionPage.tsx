import { useQuery } from '@tanstack/react-query';
import { ReceiptText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My commission</h1>
        <p className="text-muted-foreground">
          Rates the platform deducts from each sale. Resolution order: seller-specific
          override → product-specific → category-specific → category default. The most
          specific live rule wins.
        </p>
      </div>

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
            <p className="p-4 text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load rules'}
            </p>
          )}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scope</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rates ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant="muted">{r.scope}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.categoryId ?? r.productId ?? r.sellerId ?? '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{r.ratePercent}%</TableCell>
                    <TableCell>
                      <Badge variant={r.active ? 'success' : 'muted'}>
                        {r.active ? 'active' : 'inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(r.effectiveFrom)}</TableCell>
                    <TableCell className="text-xs">
                      {r.effectiveTo ? formatDate(r.effectiveTo) : 'open-ended'}
                    </TableCell>
                  </TableRow>
                ))}
                {(data?.rates.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No overrides specific to you — the category default applies.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
