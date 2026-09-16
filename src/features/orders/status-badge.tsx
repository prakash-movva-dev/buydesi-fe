import { Label } from '@/components/label';

import type { EscrowStatus, OrderStatus, PaymentStatus } from './types';

// ----------------------------------------------------------------------

export const ORDER_COLOR: Record<
  OrderStatus,
  'info' | 'warning' | 'success' | 'error' | 'default'
> = {
  PLACED: 'info',
  PACKED: 'warning',
  DISPATCHED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'error',
  RETURNED: 'error',
};

/** The same mapping in TimelineDot's palette, which has no "default". */
export const ORDER_DOT_COLOR: Record<
  OrderStatus,
  'info' | 'warning' | 'success' | 'error' | 'grey'
> = {
  PLACED: 'info',
  PACKED: 'warning',
  DISPATCHED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'error',
  RETURNED: 'error',
};

export const ORDER_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  PACKED: 'Packed',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};

/** Each stage gets its own glyph, so a column of orders scans by shape. */
export const ORDER_ICON: Record<OrderStatus, string> = {
  PLACED: 'solar:bag-4-bold',
  PACKED: 'solar:box-bold',
  DISPATCHED: 'solar:delivery-bold',
  DELIVERED: 'solar:check-circle-bold',
  CANCELLED: 'solar:close-circle-bold',
  RETURNED: 'solar:restart-bold',
};

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <Label variant="soft" color={ORDER_COLOR[status] ?? 'default'}>
    {ORDER_LABEL[status] ?? status}
  </Label>
);

// ----------------------------------------------------------------------

export const PAYMENT_COLOR: Record<
  PaymentStatus,
  'warning' | 'info' | 'success' | 'error' | 'default'
> = {
  PENDING: 'warning',
  AUTHORIZED: 'info',
  CAPTURED: 'success',
  REFUNDED: 'default',
  FAILED: 'error',
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Not paid',
  AUTHORIZED: 'Authorised',
  CAPTURED: 'Paid',
  REFUNDED: 'Refunded',
  FAILED: 'Failed',
};

export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => (
  <Label variant="soft" color={PAYMENT_COLOR[status] ?? 'default'}>
    {PAYMENT_LABEL[status] ?? status}
  </Label>
);

// ----------------------------------------------------------------------

export const ESCROW_COLOR: Record<
  EscrowStatus,
  'warning' | 'success' | 'default' | 'error'
> = {
  NONE: 'default',
  HELD: 'warning',
  RELEASED: 'success',
  REFUNDED: 'error',
};

/** Said in terms of the seller's money, which is what escrow actually decides. */
export const ESCROW_LABEL: Record<EscrowStatus, string> = {
  NONE: 'Nothing held',
  HELD: 'Held for the seller',
  RELEASED: 'Released to the seller',
  REFUNDED: 'Refunded to the buyer',
};

export const EscrowStatusBadge = ({ status }: { status: EscrowStatus }) => (
  <Label variant="soft" color={ESCROW_COLOR[status] ?? 'default'}>
    {ESCROW_LABEL[status] ?? status}
  </Label>
);
