import { Badge } from '@/components/ui/Badge';
import type { EscrowStatus, OrderStatus, PaymentStatus } from './types';

const orderVariant: Record<OrderStatus, 'info' | 'warning' | 'success' | 'destructive' | 'muted'> = {
  PLACED: 'info',
  PACKED: 'warning',
  DISPATCHED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
  RETURNED: 'destructive',
};

const orderLabel: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  PACKED: 'Packed',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <Badge variant={orderVariant[status]}>{orderLabel[status]}</Badge>
);

const paymentVariant: Record<PaymentStatus, 'warning' | 'info' | 'success' | 'destructive' | 'muted'> = {
  PENDING: 'warning',
  AUTHORIZED: 'info',
  CAPTURED: 'success',
  REFUNDED: 'muted',
  FAILED: 'destructive',
};

export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => (
  <Badge variant={paymentVariant[status]}>{status}</Badge>
);

const escrowVariant: Record<EscrowStatus, 'warning' | 'success' | 'muted' | 'info'> = {
  HELD: 'warning',
  RELEASED: 'success',
  REFUNDED: 'muted',
  NONE: 'info',
};

export const EscrowStatusBadge = ({ status }: { status: EscrowStatus }) => (
  <Badge variant={escrowVariant[status]}>Escrow {status}</Badge>
);
