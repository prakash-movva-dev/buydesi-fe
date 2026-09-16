// Mirrors backend `src/modules/affiliates/affiliates.types.ts`.

export type AffiliateStatus = 'pending' | 'active' | 'suspended';
export type AffiliateLinkTargetType = 'store' | 'product' | 'category' | 'seller';
export type AffiliateConversionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REVERSED';
export type AffiliateAttributionVia = 'link' | 'coupon';

/** What an admin sees in the list — the numbers an affiliate is judged on. */
export interface Affiliate {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  clusterId: string | null;
  status: AffiliateStatus;
  /** Null means "the platform default applies". */
  commissionRatePercent: number | null;
  effectiveCommissionPercent: number;
  linkCount: number;
  clicks: number;
  orders: number;
  earnedInr: number;
  pendingInr: number;
  couponCount: number;
  suspendedReason: string | null;
  createdAt: string;
}

export interface AffiliateLink {
  _id: string;
  affiliateId: string;
  code: string;
  targetType: AffiliateLinkTargetType;
  targetId: string | null;
  label: string | null;
  active: boolean;
  clickCount: number;
  conversionCount: number;
  createdAt: string;
}

export interface AffiliateCoupon {
  _id: string;
  code: string;
  affiliateId: string | null;
  discountType: 'percent' | 'flat';
  discountValue: number;
  maxDiscountInr: number | null;
  minSubtotalInr: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface AffiliateConversion {
  id: string;
  affiliateName: string;
  affiliateId: string;
  /** Human BD-… number; never an internal id. */
  orderNumber: string | null;
  code: string | null;
  via: AffiliateAttributionVia;
  orderSubtotalInr: number;
  commissionRatePercent: number;
  commissionInr: number;
  status: AffiliateConversionStatus;
  approvedAt: string | null;
  paidAt: string | null;
  reversedAt: string | null;
  reversedReason: string | null;
  createdAt: string;
}

/** The affiliate's own view of their funnel. */
export interface AffiliateDashboard {
  affiliateId: string;
  name: string;
  status: AffiliateStatus;
  commissionRatePercent: number;
  linkCount: number;
  clicks: number;
  orders: number;
  conversionRatePercent: number;
  grossAttributedInr: number;
  earnedInr: number;
  pendingInr: number;
  paidInr: number;
  buyersReferred: number;
  sellersReferred: number;
  since: string;
}

export type AffiliatesSort = 'newest' | 'oldest' | 'name_asc' | 'name_desc';

export interface AffiliatesListQuery {
  status?: AffiliateStatus;
  clusterId?: string;
  q?: string;
  sort?: AffiliatesSort;
  page: number;
  limit: number;
}

export interface ListMeta {
  total: number;
  page: number;
  limit: number;
  counts?: Record<string, number>;
}

export interface ConversionsListQuery {
  status?: AffiliateConversionStatus;
  affiliateId?: string;
  page: number;
  limit: number;
}

export interface CreateAffiliateInput {
  userId: string;
  name?: string;
  clusterId?: string;
  commissionRatePercent?: number;
  status?: AffiliateStatus;
}

export interface UpdateAffiliateInput {
  name?: string;
  status?: AffiliateStatus;
  commissionRatePercent?: number | null;
  suspendedReason?: string;
}

export interface GrantCouponInput {
  code?: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  maxDiscountInr?: number;
  minSubtotalInr?: number;
  expiresAt?: string;
}

export interface CommissionBatchResult {
  asOf: string;
  approved: number;
  paid: number;
  totalPaidInr: number;
  skipped: number;
}
