import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell,
  Image as ImageIcon,
} from 'lucide-react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { useCategoriesList } from '@/features/categories/api';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { ApiError, UserRole } from '@/types/api';
import { formatInr } from '@/lib/format';
import {
  useBatchRestockAlert,
  useProductsList,
  useSendRestockAlert,
} from './api';
import { ProductStatusBadge } from './status-badge';
import type { ProductsListQuery, SafeProduct, StockState } from './types';

/**
 * Product thumbnail with a graceful fallback. Some legacy images are stored as
 * bare keys that don't resolve to a URL; rather than render the browser's
 * broken-image glyph, we fall back to a neutral placeholder box.
 */
const ProductThumb = ({ src, alt }: { src?: string; alt: string }) => {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
        <ImageIcon className="h-4 w-4" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className="h-10 w-10 rounded-md border border-border object-cover"
    />
  );
};

const STOCK_OPTIONS: Array<{ value: '' | StockState; label: string }> = [
  { value: '', label: 'All stock levels' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
];

const PAGE_SIZE = 20;

const lowestPrice = (p: SafeProduct) => {
  const prices = [p.pricing.standard, p.pricing.organic, p.pricing.premium].filter(
    (x): x is number => typeof x === 'number',
  );
  return prices.length ? Math.min(...prices) : null;
};

export const StockMonitorPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canScopeCluster =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.SUB_SUPER_ADMIN ||
    user?.role === UserRole.CLUSTER_ADMIN;

  const [searchParams, setSearchParams] = useSearchParams();
  const stockState = (searchParams.get('stockState') as StockState | null) ?? '';
  const category = searchParams.get('category') ?? '';
  const cluster = searchParams.get('cluster') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<ProductsListQuery>(
    () => ({
      stockState: stockState || undefined,
      category: category || undefined,
      cluster: canScopeCluster ? cluster || undefined : undefined,
      sort: 'stock_asc',
      page,
      limit: PAGE_SIZE,
    }),
    [stockState, category, cluster, canScopeCluster, page],
  );

  const { data, isLoading, isError, error } = useProductsList(query);
  const { data: categories } = useCategoriesList();
  const total = data?.meta.total ?? 0;

  const categoryName = useMemo(() => {
    const map = new Map<string, string>();
    (categories ?? []).forEach((c) => map.set(c.id, c.name));
    return (id: string) => map.get(id) ?? id;
  }, [categories]);

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in next)) params.set('page', '1');
    setSearchParams(params);
  };

  // ─── Restock alerts ──────────────────────────────────────────────────────
  const sendAlertMut = useSendRestockAlert();
  const batchAlertMut = useBatchRestockAlert();
  const [alerted, setAlerted] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const sendAlert = async (product: SafeProduct) => {
    setBanner(null);
    try {
      await sendAlertMut.mutateAsync(product.id);
      setAlerted((prev) => new Set(prev).add(product.id));
      setBanner({ kind: 'success', text: `Restock alert sent for “${product.name}”.` });
    } catch (e) {
      setBanner({
        kind: 'error',
        text: e instanceof ApiError ? e.message : 'Failed to send restock alert.',
      });
    }
  };

  const sendBatchAlert = async () => {
    setBanner(null);
    try {
      const out = await batchAlertMut.mutateAsync({
        categoryId: category || undefined,
        clusterId: canScopeCluster ? cluster || undefined : undefined,
      });
      setBanner({
        kind: 'success',
        text: `Restock alert sent to ${out.notified} seller(s) with low/out-of-stock products.`,
      });
    } catch (e) {
      setBanner({
        kind: 'error',
        text: e instanceof ApiError ? e.message : 'Failed to send batch restock alert.',
      });
    }
  };

  const head = [
    { id: 'thumb', label: '' },
    { id: 'product', label: 'Product' },
    { id: 'seller', label: 'Seller' },
    { id: 'category', label: 'Category' },
    { id: 'stock', label: 'Stock / threshold', align: 'right' as const },
    { id: 'status', label: 'Status' },
    { id: 'actions', label: '' },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Stock monitor"
        description="Track low and out-of-stock products and nudge sellers to restock. Category Admins see only their assigned branch."
        action={
          <Button onClick={sendBatchAlert} disabled={batchAlertMut.isPending}>
            <Bell className="h-4 w-4" />
            {batchAlertMut.isPending ? 'Sending…' : 'Batch alert all low stock'}
          </Button>
        }
      />

      <ScopedAdminBanner />

      {banner && (
        <div
          className={cn(
            'rounded-md border px-4 py-3 text-sm',
            banner.kind === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-destructive/40 bg-destructive/5 text-destructive',
          )}
        >
          {banner.text}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load products'}
        </div>
      )}

      {!isLoading && !isError && (
        <Card>
          <Stack
            direction="row"
            spacing={2}
            flexWrap="wrap"
            alignItems="center"
            sx={{ p: 2.5 }}
          >
            <TextField
              select
              label="Stock level"
              value={stockState}
              onChange={(e) => setParam({ stockState: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            >
              {STOCK_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ width: 288 }}>
              <CategoryPicker
                value={category || null}
                onChange={(id) => setParam({ category: id })}
                placeholder="All categories"
                activeOnly={false}
              />
            </Box>
            {canScopeCluster && (
              <Box sx={{ width: 288 }}>
                <ClusterPicker
                  value={cluster || null}
                  onChange={(id) => setParam({ cluster: id })}
                  placeholder="All clusters"
                />
              </Box>
            )}
          </Stack>

          <Scrollbar>
            <Table sx={{ minWidth: 800 }}>
              <TableHeadCustom headLabel={head} />
              <TableBody>
                {(data?.items ?? []).map((product) => {
                  const isOut = product.stock.quantity <= 0;
                  const isLow = !isOut && product.stock.quantity <= product.stock.threshold;
                  const price = lowestPrice(product);
                  return (
                    <TableRow
                      key={product.id}
                      hover
                      className={cn(
                        isOut && 'bg-destructive/5 hover:bg-destructive/10',
                        isLow && 'bg-amber-50 hover:bg-amber-100/70',
                      )}
                    >
                      <TableCell>
                        <ProductThumb src={product.images[0]} alt={product.name} />
                      </TableCell>
                      <TableCell
                        className="cursor-pointer font-medium"
                        onClick={() => navigate(`/admin/products/${product.id}`)}
                      >
                        <div>{product.name}</div>
                        {price !== null && (
                          <div className="text-xs text-muted-foreground">
                            {formatInr(price)} / {product.unit}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">
                          {product.sellerId.slice(-6)}
                        </span>
                      </TableCell>
                      <TableCell>{categoryName(product.categoryId)}</TableCell>
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-medium tabular-nums">
                            {product.stock.quantity}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            / {product.stock.threshold}
                          </span>
                          {isOut ? (
                            <Badge variant="destructive">Out</Badge>
                          ) : isLow ? (
                            <Badge variant="warning">Low</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ProductStatusBadge status={product.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendAlert(product)}
                          disabled={sendAlertMut.isPending || alerted.has(product.id)}
                        >
                          <Bell className="h-3.5 w-3.5" />
                          {alerted.has(product.id) ? 'Alert sent' : 'Send restock alert'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableNoData notFound={!isLoading && (data?.items.length ?? 0) === 0} />
              </TableBody>
            </Table>
          </Scrollbar>

          <TablePaginationCustom
            count={total}
            page={page - 1}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[10, 25, 50]}
            onPageChange={(_e, newPage) => setParam({ page: String(newPage + 1) })}
            onRowsPerPageChange={(e) => setParam({ limit: e.target.value, page: '1' })}
          />
        </Card>
      )}
    </Stack>
  );
};
