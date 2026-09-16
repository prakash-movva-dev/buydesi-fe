import type { ProductKind } from '@/features/products/types';

// Mirrors backend `src/modules/orders/orders.types.ts`.

export type OrderStatus =
  | 'PLACED'
  | 'PACKED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type PaymentMode = 'PREPAID' | 'COD';
export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'REFUNDED' | 'FAILED';
export type EscrowStatus = 'HELD' | 'RELEASED' | 'REFUNDED' | 'NONE';
export type OrderKind = 'regular' | 'bulk';
export type PricingTier = 'standard' | 'organic' | 'premium';

export interface ShippingAddressSnapshot {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderItemView {
  id?: string;
  productId: string;
  /** Snapshot of the chosen option, when the product is sold with options. */
  variantId?: string | null;
  variantLabel?: string | null;
  variantSku?: string | null;
  sellerId: string;
  categoryId: string;
  name: string;
  unit: string;
  /** standard / organic / premium — the kind of product, not a price tier. */
  kind?: ProductKind;
  unitPriceInr: number;
  quantity: number;
  weightGrams: number;
  subtotalInr: number;
  payoutId?: string | null;
}

/** Who brought the sale, when an affiliate did. */
export interface OrderAffiliate {
  affiliateId: string;
  linkId: string | null;
  code: string | null;
  via: 'link' | 'coupon';
  attributedAt: string;
}

/** One escrow move on an order, from the audit trail. */
export interface EscrowAuditEntry {
  id: string;
  orderId: string;
  fromStatus: EscrowStatus;
  toStatus: EscrowStatus;
  trigger: string;
  actor: string;
  reason: string | null;
  createdAt: string;
}

export interface OrderCoupon {
  code: string;
  discountInr: number;
}

export interface OrderPayment {
  mode: PaymentMode;
  status: PaymentStatus;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  amountInr: number;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  at: string;
  byUserId: string | null;
  notes?: string;
}

export interface SafeOrder {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName?: string | null;
  kind: OrderKind;
  items: OrderItemView[];
  affiliate?: OrderAffiliate | null;
  subtotalInr: number;
  discountInr: number;
  deliveryFeeInr: number;
  totalInr: number;
  totalWeightGrams: number;
  coupon: OrderCoupon | null;
  payment: OrderPayment;
  escrowStatus: EscrowStatus;
  shippingAddress: ShippingAddressSnapshot;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  delhiveryShipmentId: string | null;
  trackingUrl: string | null;
  deliveryProvider: string;
  returnWindowEndsAt: string | null;
  cancellation: {
    reason: string | null;
    at: string | null;
    refundedAt: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersListQuery {
  status?: OrderStatus;
  clusterId?: string;
  /** Problem-orders view: cancelled/returned or has an open support ticket. */
  problem?: boolean;
  /** Matches the order number. */
  q?: string;
  page: number;
  limit: number;
}

export interface OrdersListMeta {
  total: number;
  page: number;
  limit: number;
  /** Orders per status for the current filter, ignoring the status filter. */
  counts?: Record<string, number>;
}
