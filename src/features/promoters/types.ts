// Mirrors backend `src/modules/promoters/promoters.types.ts`.

export interface Promoter {
  _id?: string;
  id?: string;
  userId: string | null;
  name: string;
  clusterId: string | null;
  couponId: string;
  active: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** Set by the create endpoint on the first response only. */
  couponCode?: string;
}

export interface PromoterDashboard {
  promoterId: string;
  name: string;
  couponCode: string;
  active: boolean;
  totalUses: number;
  totalDiscountInr: number;
  totalOrderValueInr: number;
  uniqueBuyers: number;
  buyersReferred: number;
  sellersReferred: number;
  since: string;
}

export interface PromotersListQuery {
  clusterId?: string;
  active?: boolean;
  page: number;
  limit: number;
}

export interface PromotersListMeta {
  total: number;
  page: number;
  limit: number;
}

export interface CreatePromoterInput {
  name: string;
  userId?: string;
  clusterId?: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  maxDiscountInr?: number;
  minSubtotalInr?: number;
  expiresAt?: string;
}

export interface UpdatePromoterInput {
  name?: string;
  active?: boolean;
}

// Mirrors backend `getPromoterPerformance` (promoters.service.ts).
export interface PromoterPerformanceRow {
  promoterId: string;
  name: string;
  couponCode: string;
  clusterId: string | null;
  uses: number;
  totalDiscountInr: number;
}

export interface PromoterPerformanceTop {
  promoterId: string;
  name: string;
  uses: number;
  totalDiscountInr: number;
}

export interface PromoterPerformanceReport {
  totalPromoters: number;
  totalUses: number;
  totalDiscountInr: number;
  rows: PromoterPerformanceRow[];
  topPerformers: PromoterPerformanceTop[];
}
