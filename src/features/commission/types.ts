// Mirrors backend `src/modules/commission/commission.types.ts`.

export type CommissionScope = 'category' | 'product' | 'seller';
export type ResolvedSource = CommissionScope | 'category_default';

export interface CommissionRate {
  id: string;
  scope: CommissionScope;
  categoryId: string | null;
  productId: string | null;
  sellerId: string | null;
  ratePercent: number;
  active: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** Scope label, e.g. "Category", "Product", "Seller". */
  targetType: string;
  /** Resolved human name for the target entity (never an ObjectId). */
  targetName: string;
}

export interface ResolvedCommission {
  ratePercent: number;
  source: ResolvedSource;
  rateId: string | null;
}

export interface CommissionListQuery {
  scope?: CommissionScope;
  categoryId?: string;
  productId?: string;
  sellerId?: string;
  active?: boolean;
}

export interface CreateCommissionRateInput {
  scope: CommissionScope;
  categoryId?: string;
  productId?: string;
  sellerId?: string;
  ratePercent: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
}

export interface UpdateCommissionRateInput {
  ratePercent?: number;
  active?: boolean;
  effectiveTo?: string | null;
  notes?: string;
}
