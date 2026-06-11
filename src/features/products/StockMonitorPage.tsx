import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
    user?.role === UserRole.REGIONAL_ADMIN;

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
  const pageCount = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock monitor</h1>
          <p className="text-muted-foreground">
            Track low and out-of-stock products and nudge sellers to restock. Category Admins see
            only their assigned branch.
          </p>
        </div>
        <Button onClick={sendBatchAlert} disabled={batchAlertMut.isPending}>
          <Bell className="h-4 w-4" />
          {batchAlertMut.isPending ? 'Sending…' : 'Batch alert all low stock'}
        </Button>
      </div>

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

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={stockState}
          onChange={(e) => setParam({ stockState: e.target.value })}
          className="w-48"
        >
          {STOCK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <div className="w-72">
          <CategoryPicker
            value={category || null}
            onChange={(id) => setParam({ category: id })}
            placeholder="All categories"
            activeOnly={false}
          />
        </div>
        {canScopeCluster && (
          <div className="w-72">
            <ClusterPicker
              value={cluster || null}
              onChange={(id) => setParam({ cluster: id })}
              placeholder="All clusters"
            />
          </div>
        )}
      </div>

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
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-px" />
                <TableHead>Product</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock / threshold</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((product) => {
                const isOut = product.stock.quantity <= 0;
                const isLow = !isOut && product.stock.quantity <= product.stock.threshold;
                const price = lowestPrice(product);
                return (
                  <TableRow
                    key={product.id}
                    className={cn(
                      isOut && 'bg-destructive/5 hover:bg-destructive/10',
                      isLow && 'bg-amber-50 hover:bg-amber-100/70',
                    )}
                  >
                    <TableCell>
                      {product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-10 w-10 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
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
                    <TableCell className="text-right">
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
              {(data?.items.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                      No products match the current filters.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data?.items.length ?? 0} of {total} · page {page} / {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParam({ page: String(Math.max(1, page - 1)) })}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParam({ page: String(Math.min(pageCount, page + 1)) })}
                disabled={page >= pageCount}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
