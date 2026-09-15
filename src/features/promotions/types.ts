// Mirrors backend `src/modules/promotions/promotions.types.ts`.

export type PromotionType = 'banner' | 'coupon' | 'featured';
export type PromotionScope = 'platform' | 'cluster' | 'category';
export type DiscountType = 'percent' | 'flat';

export type BannerPlacement = 'hero' | 'promo';

export interface BannerPayload {
  imageUrl: string;
  targetUrl: string;
  /** `hero` = the main carousel, `promo` = the smaller cards beside it. */
  placement?: BannerPlacement;
  headline?: string | null;
  subheadline?: string | null;
  ctaLabel?: string | null;
  displayOrder?: number;
}

export interface CouponPayload {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountInr: number | null;
  minOrderInr: number;
  maxUses: number;
  currentUses: number;
  expiresAt: string | null;
}

export interface FeaturedPayload {
  productIds: string[];
  storefrontUserIds: string[];
  slotPosition: number;
}

export interface Promotion {
  _id: string;
  id?: string;
  type: PromotionType;
  name: string;
  scope: PromotionScope;
  clusterId: string | null;
  categoryId: string | null;
  startsAt: string;
  endsAt: string;
  active: boolean;
  isOverride: boolean;
  createdBy: string | null;
  banner: BannerPayload | null;
  coupon: CouponPayload | null;
  featured: FeaturedPayload | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionsListQuery {
  type?: PromotionType;
  scope?: PromotionScope;
  clusterId?: string;
  categoryId?: string;
  active?: boolean;
  page: number;
  limit: number;
}

export interface PromotionsListMeta {
  total: number;
  page: number;
  limit: number;
}
