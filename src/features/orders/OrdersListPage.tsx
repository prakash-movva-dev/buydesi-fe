import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { formatDate, formatInr } from '@/lib/format';
import { useOrdersList } from './api';
import { OrderStatusBadge, PaymentStatusBadge } from './status-badge';
import type { OrderStatus, OrdersListQuery, PaymentMode } from './types';

const STATUS_OPTIONS: Array<{ value: '' | OrderStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
];

const PAGE_SIZE = 20;

export const OrdersListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = (searchParams.get('status') as OrderStatus | null) ?? '';
  const problem = searchParams.get('problem') === '1';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<OrdersListQuery>(
    () => ({
      status: problem ? undefined : status || undefined,
      problem: problem || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [status, problem, page],
  );

  const { data, isLoading, isError, error } = useOrdersList(query);
  const total = data?.meta.total ?? 0;
  const pageCount = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  // Page-local scrubber — backend doesn't support order-number search yet.
  const [scrub, setScrub] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'' | PaymentMode>('');
  const [kindFilter, setKindFilter] = useState<'' | 'regular' | 'bulk'>('');

  const visible = useMemo(() => {
    if (!data) return [];
    const s = scrub.trim().toLowerCase();
    return data.items.filter((o) => {
      if (s && !(o.orderNumber.toLowerCase().includes(s) || o.id.includes(s) || o.buyerId.includes(s)))
        return false;
      if (paymentFilter && o.payment.mode !== paymentFilter) return false;
      if (kindFilter && o.kind !== kindFilter) return false;
      return true;
    });
  }, [data, scrub, paymentFilter, kindFilter]);

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in next)) params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          Every order on the platform. Cluster admins see their cluster's sellers' orders only.
        </p>
      </div>

      <ScopedAdminBanner />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={problem ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setParam({ problem: problem ? null : '1', status: null })}
          title="Cancelled / returned orders, or orders with an open support ticket"
        >
          {problem ? 'Problem orders ✓' : 'Problem orders'}
        </Button>
        <Select
          value={status}
          onChange={(e) => setParam({ status: e.target.value })}
          className="w-48"
          disabled={problem}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as '' | PaymentMode)}
          className="w-40"
        >
          <option value="">Any payment</option>
          <option value="PREPAID">Prepaid</option>
          <option value="COD">Cash on delivery</option>
        </Select>
        <Select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as '' | 'regular' | 'bulk')}
          className="w-32"
        >
          <option value="">Any kind</option>
          <option value="regular">Regular</option>
          <option value="bulk">Bulk</option>
        </Select>
        <div className="relative w-80">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={scrub}
            onChange={(e) => setScrub(e.target.value)}
            placeholder="Order number / id / buyer"
            className="pl-9"
          />
        </div>
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
          {error instanceof Error ? error.message : 'Failed to load orders'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((o) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/admin/orders/${o.id}`)}
                >
                  <TableCell className="font-medium">
                    <div>{o.orderNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      buyer {o.buyerId.slice(-6)} · {o.kind}
                    </div>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={o.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="muted">{o.payment.mode}</Badge>
                      <PaymentStatusBadge status={o.payment.status} />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{formatInr(o.totalInr)}</TableCell>
                  <TableCell>{o.items.length}</TableCell>
                  <TableCell>{formatDate(o.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/orders/${o.id}`);
                      }}
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    No orders match the current filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {visible.length} of {total} · page {page} / {pageCount}
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
