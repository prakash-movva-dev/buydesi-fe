import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useOrdersList } from '@/features/orders/api';
import { OrderStatusBadge, PaymentStatusBadge } from '@/features/orders/status-badge';
import { formatDate, formatInr } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import type { OrderStatus, OrdersListQuery } from '@/features/orders/types';

const STATUS_OPTIONS: Array<{ value: '' | OrderStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PLACED', label: 'Placed (needs packing)' },
  { value: 'PACKED', label: 'Packed (needs dispatch)' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PAGE_SIZE = 25;

export const MyOrdersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get('status') as OrderStatus | null) ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<OrdersListQuery>(
    () => ({ status: status || undefined, page, limit: PAGE_SIZE }),
    [status, page],
  );

  const { data, isLoading } = useOrdersList(query);
  const total = data?.meta.total ?? 0;
  const pageCount = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in next)) params.set('page', '1');
    setSearchParams(params);
  };

  // Local scrub for order number.
  const [scrub, setScrub] = useState('');
  const visible = useMemo(() => {
    const s = scrub.trim().toLowerCase();
    if (!s || !data) return data?.items ?? [];
    return data.items.filter((o) => o.orderNumber.toLowerCase().includes(s));
  }, [data, scrub]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Incoming orders</h1>
        <p className="text-muted-foreground">
          Buyer orders that contain your products. Move them along the pipeline:
          Placed → Packed → Dispatched → Delivered.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onChange={(e) => setParam({ status: e.target.value })}
          className="w-56"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <input
          type="search"
          placeholder="Quick filter: order number"
          value={scrub}
          onChange={(e) => setScrub(e.target.value)}
          className="h-10 w-72 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">My items</TableHead>
                <TableHead className="text-right">My total</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((o) => {
                const myItems = o.items.filter((it) => it.sellerId === user?.id);
                const myTotal = myItems.reduce((sum, it) => sum + it.subtotalInr, 0);
                return (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/seller/orders/${o.id}`)}
                  >
                    <TableCell className="font-medium">
                      {o.orderNumber}
                      <div className="text-xs text-muted-foreground">
                        {o.items.length} item{o.items.length === 1 ? '' : 's'} in order
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{o.shippingAddress.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {o.shippingAddress.phone} · {o.shippingAddress.city}
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
                    <TableCell className="text-right">{myItems.length}</TableCell>
                    <TableCell className="text-right font-medium">{formatInr(myTotal)}</TableCell>
                    <TableCell>{formatDate(o.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/seller/orders/${o.id}`);
                        }}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No orders here.
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
