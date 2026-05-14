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
  grossInr: number;
  commissionRatePercent: number;
  commissionInr: number;
  commissionSource: CommissionSource;
  netInr: number;
}

export interface Payout {
  id: string;
  sellerId: string;
  schedule: PayoutSchedule;
  status: PayoutStatus;
  lineItems: PayoutLineItem[];
  totalGrossInr: number;
  totalCommissionInr: number;
  totalPlatformFeesInr: number;
  netInr: number;
  orderCount: number;
  itemCount: number;
  triggeredBy: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutsListQuery {
  status?: PayoutStatus;
  schedule?: PayoutSchedule;
  sellerId?: string;
  page: number;
  limit: number;
}

export interface PayoutsListMeta {
  total: number;
  page: number;
  limit: number;
}
