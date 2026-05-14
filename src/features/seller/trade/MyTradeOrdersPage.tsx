import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
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
import { useAuth } from '@/lib/auth';
import { formatDate, formatInr } from '@/lib/format';
import { useMyTradeOrders } from './api';
import type { TradeOrderStatus } from './types';

const ROLE_OPTIONS: Array<{ value: 'either' | 'buyer' | 'seller'; label: string }> = [
  { value: 'either', label: 'All my trades' },
  { value: 'buyer', label: 'As buyer' },
  { value: 'seller', label: 'As seller' },
];

const statusVariant: Record<TradeOrderStatus, 'info' | 'warning' | 'success' | 'destructive' | 'muted'> = {
  PLACED: 'info',
  SELLER_CONFIRMED: 'info',
  DISPATCHED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
};

export const MyTradeOrdersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = (searchParams.get('role') as 'buyer' | 'seller' | 'either' | null) ?? 'either';

  const { data, isLoading } = useMyTradeOrders({ role, page: 1, limit: 50 });

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My trade orders</h1>
        <p className="text-muted-foreground">
          B2B inter-cluster orders. Buyer and seller views are combined here — filter to one
          role for a focused list.
        </p>
      </div>

      <Select
        value={role}
        onChange={(e) => setParam({ role: e.target.value })}
        className="w-56"
      >
        {ROLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>My role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Placed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.items ?? []).map((o) => {
              const id = o.id ?? o._id;
              const myRole = o.sellerId === user?.id ? 'seller' : 'buyer';
              return (
                <TableRow
                  key={id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/seller/trade/orders/${id}`)}
                >
                  <TableCell className="font-medium">
                    {o.productName}
                    <div className="text-xs text-muted-foreground">id {id.slice(-8)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="muted">{myRole}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[o.status]}>{o.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="muted">{o.paymentMode}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{o.units}</TableCell>
                  <TableCell className="text-right font-medium">{formatInr(o.totalInr)}</TableCell>
                  <TableCell className="text-xs">{formatDate(o.createdAt)}</TableCell>
                </TableRow>
              );
            })}
            {(data?.items.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No trade orders yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
