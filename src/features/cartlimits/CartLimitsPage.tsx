import { useState } from 'react';
import { Pencil, Plus, ShoppingCart } from 'lucide-react';
import Stack from '@mui/material/Stack';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { formatInr } from '@/lib/format';
import { useCartLimitsList } from './api';
import { CartLimitFormDialog } from './CartLimitFormDialog';
import type { CartLimit, CartLimitScope } from './types';

const scopeVariant: Record<CartLimitScope, 'muted' | 'info' | 'warning' | 'success'> = {
  default: 'muted',
  cluster: 'info',
  category: 'warning',
  cluster_category: 'success',
};

export const CartLimitsPage = () => {
  const { data, isLoading, isError, error } = useCartLimitsList();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CartLimit | null>(null);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Cart limits"
        description="Maximum quantities, value, weight and COD ceiling per cart. The cart validator picks the most-specific applicable rule at checkout (cluster_category > category > cluster > default)."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New rule
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4" />
            Resolution priority
          </CardTitle>
          <CardDescription>
            cluster_category &gt; category &gt; cluster &gt; default. Each field resolves
            independently — you can have a high default but a lower per-category cap.
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading && <Skeleton className="h-40 w-full" />}
      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load cart limits'}
        </div>
      )}

      {!isLoading && !isError && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scope</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Cluster</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Max qty / product</TableHead>
              <TableHead className="text-right">Max distinct items</TableHead>
              <TableHead className="text-right">Max cart value</TableHead>
              <TableHead className="text-right">Max weight (g)</TableHead>
              <TableHead className="text-right">Max COD</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((row) => (
              <TableRow key={row.id ?? row._id}>
                <TableCell>
                  <Badge variant={scopeVariant[row.scope]}>{row.scope}</Badge>
                </TableCell>
                <TableCell className="capitalize">{row.kind}</TableCell>
                <TableCell className="font-mono text-xs">
                  {row.clusterId ? row.clusterId.slice(-10) : '—'}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {row.categoryId ? row.categoryId.slice(-10) : '—'}
                </TableCell>
                <TableCell className="text-right">{row.maxQtyPerProduct}</TableCell>
                <TableCell className="text-right">{row.maxDistinctItems}</TableCell>
                <TableCell className="text-right">{formatInr(row.maxCartValueInr)}</TableCell>
                <TableCell className="text-right">{row.maxTotalWeightGrams}</TableCell>
                <TableCell className="text-right">
                  {row.kind === 'bulk' ? '—' : formatInr(row.maxCodValueInr)}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(row);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                  No cart limits configured. Create a "default" rule first.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <CartLimitFormDialog open={open} editing={editing} onClose={() => setOpen(false)} />
    </Stack>
  );
};
