// Mirrors backend `src/modules/payouts/payouts.types.ts`.

export type PayoutSchedule = 'daily' | 'weekly' | 'on_demand';
export type PayoutStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'FAILED' | 'CANCELLED';
export type CommissionSource = 'seller' | 'product' | 'category' | 'category_default';

export interface PayoutLineItem {
  orderId: string;
  orderItemId: string;
  productId: string;
  categoryId: string;
  productName: string;
  /** Human `BD-...` order number, or null if the order can't be resolved. */
  orderNumber: string | null;
  grossInr: number;
  commissionRatePercent: number;
  commissionInr: number;
  commissionSource: CommissionSource;
  netInr: number;
}

export interface Payout {
  id: string;
  /** Seller's business/farm name, falling back to their account name. */
  sellerName: string | null;
  sellerMobile: string | null;
  sellerEmail: string | null;
  schedule: PayoutSchedule;
  status: PayoutStatus;
  lineItems: PayoutLineItem[];
  totalGrossInr: number;
  totalCommissionInr: number;
  totalPlatformFeesInr: number;
  netInr: number;
  orderCount: number;
  itemCount: number;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PayoutsSort = 'newest' | 'oldest' | 'net_desc' | 'net_asc';

export interface PayoutsListQuery {
  status?: PayoutStatus;
  schedule?: PayoutSchedule;
  sellerId?: string;
  sort?: PayoutsSort;
  page: number;
  limit: number;
}

export interface PayoutsListMeta {
  total: number;
  page: number;
  limit: number;
  /**
   * Payouts per schedule for the current filter, ignoring the schedule filter —
   * what the tabs show. `all` is the sum.
   */
  counts?: Record<string, number>;
  /**
   * Payouts per status, ignoring the status filter. Only statuses that actually
   * occur appear here: batches settle immediately, so the approval states in the
   * enum are never written and must not be offered as filters that can only
   * return nothing.
   */
  statusCounts?: Record<string, number>;
}

export interface RunBatchResult {
  schedule: PayoutSchedule;
  asOf: string;
  payoutsCreated: number;
  totalNetInr: number;
  skippedSellers: number;
  payoutIds: string[];
}
