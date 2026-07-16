import { useState } from 'react';
import { Pencil, Plus, ShoppingCart } from 'lucide-react';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData } from '@/components/table';
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

const HEAD = [
  { id: 'scope', label: 'Scope' },
  { id: 'kind', label: 'Kind' },
  { id: 'cluster', label: 'Cluster' },
  { id: 'category', label: 'Category' },
  { id: 'maxQty', label: 'Max qty / product', align: 'right' as const },
  { id: 'maxDistinct', label: 'Max distinct items', align: 'right' as const },
  { id: 'maxValue', label: 'Max cart value', align: 'right' as const },
  { id: 'maxWeight', label: 'Max weight (g)', align: 'right' as const },
  { id: 'maxCod', label: 'Max COD', align: 'right' as const },
  { id: 'edit', label: '' },
];

export const CartLimitsPage = () => {
  const { data, isLoading, isError, error } = useCartLimitsList();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CartLimit | null>(null);

  const items = data ?? [];

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
        <Card>
          <Scrollbar>
            <Table sx={{ minWidth: 800 }}>
              <TableHeadCustom headLabel={HEAD} />
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id ?? row._id} hover>
                    <TableCell>
                      <Badge variant={scopeVariant[row.scope]}>{row.scope}</Badge>
                    </TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{row.kind}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', typography: 'caption' }}>
                      {row.clusterId ? row.clusterId.slice(-10) : '—'}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', typography: 'caption' }}>
                      {row.categoryId ? row.categoryId.slice(-10) : '—'}
                    </TableCell>
                    <TableCell align="right">{row.maxQtyPerProduct}</TableCell>
                    <TableCell align="right">{row.maxDistinctItems}</TableCell>
                    <TableCell align="right">{formatInr(row.maxCartValueInr)}</TableCell>
                    <TableCell align="right">{row.maxTotalWeightGrams}</TableCell>
                    <TableCell align="right">
                      {row.kind === 'bulk' ? '—' : formatInr(row.maxCodValueInr)}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditing(row);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                <TableNoData notFound={!isLoading && items.length === 0} />
              </TableBody>
            </Table>
          </Scrollbar>
        </Card>
      )}

      <CartLimitFormDialog open={open} editing={editing} onClose={() => setOpen(false)} />
    </Stack>
  );
};
